import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { AccuracyClass, ComplianceStatus } from "@maanak/types";
import {
  evaluateForm2TemperatureDrift,
  ERR_TEMP_DRIFT_EXCEEDED,
  ERR_ZERO_DRIFT_EXCEEDED,
  Form2TemperatureObservation,
  AnomalyDetector,
} from "@maanak/rules-engine";
import { createApp } from "../../apps/api/src/app.js";
import { Role, generateTokens } from "../../apps/api/src/auth/index.js";

describe("TASK-062: Ground Truth Verification TC-04: Temperature Drift Overrun", () => {
  // Instrument Specifications for TC-04: Class III Commercial Bench Scale
  const SCALE_SPEC = {
    manufacturer: "Essae-Teraoka Ltd.",
    model: "DS-415 Chamber Test Rig",
    serialNumber: "SN-2026-TC04-7712",
    accuracyClass: AccuracyClass.CLASS_III,
    maxCapacity: "15.000 kg",
    e: "0.005 kg", // 5 g
    d: "0.005 kg",
    unit: "kg",
  };

  const mockLabId = "11111111-2222-3333-4444-555555555555";
  const mockReviewerId = "usr-rev-004";

  const reviewerTokens = generateTokens({
    sub: mockReviewerId,
    username: "reviewer.sharma",
    email: "reviewer.sharma@rrsl.gov.in",
    role: Role.REVIEWER,
    laboratoryId: mockLabId,
    permissions: ["sessions:review"],
  });

  describe("1. Form 2 Metrological Evaluator: Temperature Rate of Change (OIML R-76 Clause A.5.3.2)", () => {
    test("TC-04 Acceptance Scenario: flags ERR_TEMP_DRIFT_EXCEEDED when temperature changes 20.0 °C -> 28.0 °C in 1 h (8.0 °C/h > 5.0 °C/h)", () => {
      // Temperature changes from 20.0 °C to 28.0 °C over 1 hour (60 min)
      // Delta T = 8.0 °C / 1 h = 8.0 °C/h > 5.0 °C/h limit
      const observations: Form2TemperatureObservation[] = [
        {
          temperatureC: "20.0",
          elapsedTimeMinutes: 0,
          indicatedValue: "0.000",
          turningPointDeltaL: "0.0025", // E0 = 0 kg
        },
        {
          temperatureC: "28.0",
          elapsedTimeMinutes: 60, // 1 hour elapsed
          indicatedValue: "0.000",
          turningPointDeltaL: "0.0020", // E0 = +0.5 g (within zero drift tolerance)
        },
      ];

      const result = evaluateForm2TemperatureDrift(observations, {
        accuracyClass: AccuracyClass.CLASS_III,
        e: SCALE_SPEC.e,
      });

      assert.strictEqual(result.pass, false);
      assert.strictEqual(result.status, ComplianceStatus.FAIL);
      assert.strictEqual(result.transitions.length, 1);

      const trans = result.transitions[0];
      assert.strictEqual(trans.tempRateCPerHour, "8.00");
      assert.strictEqual(trans.isTempRateValid, false);
      assert.strictEqual(trans.isZeroDriftValid, true);
      assert.ok(trans.errorCodes.includes(ERR_TEMP_DRIFT_EXCEEDED));
      assert.ok(result.errorCodes.includes(ERR_TEMP_DRIFT_EXCEEDED));
      assert.strictEqual(result.maxObservedTempRate.exceeded, true);
      assert.strictEqual(result.maxObservedTempRate.rateCPerHour, "8.00");
      assert.match(result.summary, /ERR_TEMP_DRIFT_EXCEEDED/);
    });

    test("Compliant Scenario: passes when temperature rate of change is within 5.0 °C/h (4.0 °C/h)", () => {
      // Temperature changes from 20.0 °C to 24.0 °C over 1 hour (60 min)
      // Delta T = 4.0 °C / 1 h = 4.0 °C/h <= 5.0 °C/h
      const observations: Form2TemperatureObservation[] = [
        {
          temperatureC: "20.0",
          elapsedTimeMinutes: 0,
          indicatedValue: "0.000",
          turningPointDeltaL: "0.0025",
        },
        {
          temperatureC: "24.0",
          elapsedTimeMinutes: 60,
          indicatedValue: "0.000",
          turningPointDeltaL: "0.0025",
        },
      ];

      const result = evaluateForm2TemperatureDrift(observations, {
        accuracyClass: AccuracyClass.CLASS_III,
        e: SCALE_SPEC.e,
      });

      assert.strictEqual(result.pass, true);
      assert.strictEqual(result.status, ComplianceStatus.PASS);
      assert.strictEqual(result.transitions[0].tempRateCPerHour, "4.00");
      assert.strictEqual(result.transitions[0].isTempRateValid, true);
      assert.strictEqual(result.errorCodes.length, 0);
      assert.strictEqual(result.maxObservedTempRate.exceeded, false);
    });
  });

  describe("2. Domain Engine: AnomalyDetector Environmental Stability Evaluation", () => {
    let detector: AnomalyDetector;

    beforeEach(() => {
      detector = new AnomalyDetector({
        e: "0.005",
        max: "15.000",
        min: "0.100",
        unit: "kg",
      });
    });

    test("checkEnvironmentalStability flags ANOMALY_TEMPERATURE_DRIFT_EXCEEDED for 8.0 °C/h overrun", () => {
      const flags = detector.checkEnvironmentalStability({
        tempStartC: 20.0,
        tempEndC: 28.0,
        durationHours: 1.0,
      });

      assert.strictEqual(flags.length, 1);
      const flag = flags[0];
      assert.strictEqual(flag.code, "ANOMALY_TEMPERATURE_DRIFT_EXCEEDED");
      assert.strictEqual(flag.severity, "CRITICAL");
      assert.match(flag.rule, /OIML R 76-1 Cl A\.5\.3\.2/);
      assert.strictEqual(flag.details?.driftRateCPerHour, "8.00");
      assert.strictEqual(flag.details?.maxPermissibleRate, "5.0");
      assert.match(flag.message, /Thermal drift rate of 8\.00 °C\/h exceeds maximum permissible limit/);
    });

    test("checkEnvironmentalStability returns no flags when thermal drift is within 5.0 °C/h (3.5 °C/h)", () => {
      const flags = detector.checkEnvironmentalStability({
        tempStartC: 20.0,
        tempEndC: 23.5,
        durationHours: 1.0,
      });

      assert.strictEqual(flags.length, 0);
    });
  });

  describe("3. REST API Gateway Audit Endpoint (/api/v1/review/sessions/:id/audit)", () => {
    let app: any;
    let mockDb: any;
    const mockSessionId = "44444444-aaaa-bbbb-cccc-555555555555";

    beforeEach(() => {
      const mockModel = {
        id: "model-tc04-bench",
        modelName: "Essae DS-415 Bench Scale",
        manufacturerName: "Essae-Teraoka",
        accuracyClassId: "class-iii-id",
        accuracyClass: { code: "III" },
        maxCapacity: "15.00000000",
        minCapacity: "0.10000000",
        verificationScaleIntervalE: "0.00500000",
        actualScaleIntervalD: "0.00500000",
        unitOfMeasure: "kg",
      };

      const mockUnit = {
        id: "unit-tc04-01",
        instrumentModelId: mockModel.id,
        serialNumber: "SN-TC04-7712",
        instrumentModel: mockModel,
      };

      const startTime = new Date("2026-09-22T10:00:00.000Z");
      const endTime = new Date("2026-09-22T11:00:00.000Z"); // Exactly 1 hour

      const mockSession = {
        id: mockSessionId,
        sessionNumber: "SES-TC04-DRIFT-001",
        laboratoryId: mockLabId,
        instrumentUnitId: mockUnit.id,
        status: "UNDER_REVIEW",
        instrumentUnit: mockUnit,
        rawObservations: [
          {
            id: "obs-1",
            sequenceNumber: 1,
            targetLoadL: "0.000",
            displayedIndicationI: "0.000",
            changeoverWeightDl: "0.0025",
          },
          {
            id: "obs-2",
            sequenceNumber: 2,
            targetLoadL: "5.000",
            displayedIndicationI: "5.000",
            changeoverWeightDl: "0.0020",
          },
        ],
        environmentalLogs: [
          {
            id: "env-1",
            temperatureC: "20.0",
            relativeHumidityPercent: "50",
            loggedAt: startTime,
          },
          {
            id: "env-2",
            temperatureC: "28.0", // 8.0 °C drift in 1 hour
            relativeHumidityPercent: "52",
            loggedAt: endTime,
          },
        ],
      };

      mockDb = {
        testSession: {
          findUnique: async ({ where }: any) => {
            if (where.id === mockSessionId) return mockSession;
            return null;
          },
          update: async ({ where, data }: any) => {
            if (where.id === mockSessionId) {
              Object.assign(mockSession, data);
              return mockSession;
            }
            throw new Error("Session not found");
          },
        },
        reviewAudit: {
          create: async ({ data }: any) => ({
            id: `audit-${Date.now()}`,
            ...data,
            reviewedAt: new Date(),
          }),
        },
        provenanceNode: {
          findFirst: async () => null,
          create: async ({ data }: any) => ({
            id: `node-${Date.now()}`,
            ...data,
          }),
        },
        $transaction: async (fn: any) => fn(mockDb),
      };

      app = createApp({ db: mockDb });
    });

    test("GET /api/v1/review/sessions/:id/audit flags ANOMALY_TEMPERATURE_DRIFT_EXCEEDED with CRITICAL severity", async () => {
      const res = await request(app)
        .get(`/api/v1/review/sessions/${mockSessionId}/audit`)
        .set("Authorization", `Bearer ${reviewerTokens.accessToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.testSessionId, mockSessionId);
      assert.strictEqual(res.body.sessionNumber, "SES-TC04-DRIFT-001");

      const audit = res.body.audit;
      assert.strictEqual(audit.hasAnomalies, true);
      assert.ok(audit.criticalCount >= 1);

      const driftFlag = audit.flags.find(
        (f: any) => f.code === "ANOMALY_TEMPERATURE_DRIFT_EXCEEDED"
      );
      assert.ok(driftFlag, "Must include ANOMALY_TEMPERATURE_DRIFT_EXCEEDED flag");
      assert.strictEqual(driftFlag.severity, "CRITICAL");
      assert.strictEqual(driftFlag.details.driftRateCPerHour, "8.00");
      assert.strictEqual(driftFlag.details.maxPermissibleRate, "5.0");
      assert.match(driftFlag.message, /Thermal drift rate of 8\.00 °C\/h exceeds maximum permissible limit/);
    });

    test("POST /api/v1/review/decision flags session for correction due to temperature drift violation", async () => {
      const res = await request(app)
        .post("/api/v1/review/decision")
        .set("Authorization", `Bearer ${reviewerTokens.accessToken}`)
        .send({
          testSessionId: mockSessionId,
          reviewStage: "SECOND_LEVEL_REVIEW",
          decision: "FLAGGED_FOR_CORRECTION",
          comments: "ERR_TEMP_DRIFT_EXCEEDED: Thermal chamber drift exceeded 5.0 °C/h (observed 8.0 °C/h). Test must be repeated.",
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.reviewAudit.decision, "FLAGGED_FOR_CORRECTION");
      assert.strictEqual(res.body.sessionStatus, "IN_PROGRESS");
      assert.strictEqual(res.body.anomaliesDetected >= 1, true);
      assert.match(res.body.reviewAudit.comments, /ERR_TEMP_DRIFT_EXCEEDED/);
    });
  });
});
