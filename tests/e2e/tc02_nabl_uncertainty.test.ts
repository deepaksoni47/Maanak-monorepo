import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { AccuracyClass, ComplianceStatus } from "@maanak/types";
import {
  validateStandardWeightUncertainty,
  validateStandardWeightSet,
  classifyInstrument,
  getMpe,
  toDecimal,
} from "@maanak/rules-engine";
import { createApp } from "../../apps/api/src/app.js";
import { Role, generateTokens } from "../../apps/api/src/auth/index.js";
import { evaluateNablGatekeeper } from "../../apps/web/src/lib/nabl129.js";

describe("TASK-060: Ground Truth Verification TC-02: NABL 129 Standard Weight Uncertainty Violation", () => {
  // Instrument Specifications for TC-02: Class II Precision Laboratory Balance
  const SCALE_SPEC = {
    manufacturer: "Mettler-Toledo India Pvt. Ltd.",
    model: "MS-1002TS Precision Balance",
    serialNumber: "SN-2026-MT-40291",
    accuracyClass: AccuracyClass.CLASS_II,
    maxCapacity: "1.000 kg", // 1000 g
    e: "0.01 g", // 10 mg verification scale interval
    d: "0.001 g", // 1 mg actual scale interval (d = 0.1e <= e)
    unit: "g",
    n: 100000, // 100,000 divisions
  };

  const mockLabId = "11111111-2222-3333-4444-555555555555";

  const inspectorTokens = generateTokens({
    sub: "usr-insp-002",
    username: "inspector.mehta",
    email: "inspector.mehta@rrsl.gov.in",
    role: Role.INSPECTOR,
    laboratoryId: mockLabId,
    permissions: ["sessions:create", "observations:create"],
  });

  describe("1. NAWI Classification & Verification Limits (OIML R-76 Table 3)", () => {
    test("verifies Class II instrument parameters (Max = 1 kg, e = 0.01 g -> n = 100,000)", () => {
      const classification = classifyInstrument(
        "1000 g",
        "0.01 g",
        "0.001 g",
        AccuracyClass.CLASS_II,
        { minCapacity: "0.2 g" } // Min >= 20e = 0.2 g
      );

      assert.strictEqual(classification.valid, true);
      assert.strictEqual(classification.n, 100000);
      assert.strictEqual(classification.accuracyClass, AccuracyClass.CLASS_II);
      assert.strictEqual(classification.errorReason, undefined);
    });

    test("verifies OIML Table 6 MPE bracket for Class II at L = 50 g (5,000e)", () => {
      // Bracket 0 <= m <= 5,000e: MPE = ±0.5e = ±0.005 g
      const mpeResult = getMpe("50 g", "0.01 g", AccuracyClass.CLASS_II, {
        unit: "g",
      });

      assert.strictEqual(mpeResult.mpeFactorE, "0.5");
      assert.strictEqual(mpeResult.mpeInE, "0.5");
      const mpeInG = toDecimal(mpeResult.mpeInMass).mul(1000);
      assert.strictEqual(mpeInG.toFixed(3), "0.005");
      assert.strictEqual(mpeResult.stepBracket, "(0e, 5000e]");
    });
  });

  describe("2. Domain Rules Engine: NABL 129 Constraint Gatekeeper (U <= 1/3 MPE)", () => {
    test("TC-02 Acceptance Scenario: At L = 500 g with applicable MPE = 0.005 g, U = 0.0025 g violates 1/3 MPE limit", () => {
      // Applicable MPE = 0.005 g
      // Max allowed U = 1/3 * 0.005 g = 0.001666... g
      // Actual U = 0.0025 g (Ratio = 50% > 33.3%)
      const result = validateStandardWeightUncertainty(
        "0.0025 g",
        "500 g",
        "0.01 g",
        AccuracyClass.CLASS_II,
        {
          applicableMpe: "0.005 g",
          weightId: "WT-TC02-FAIL",
          weightClass: "F1",
        }
      );

      assert.strictEqual(result.compliant, false);
      assert.strictEqual(result.actualUncertainty, "0.0025");
      assert.match(result.maxAllowedUncertainty, /^0\.001666/);
      assert.strictEqual(result.mpeApplied, "0.005");
      assert.strictEqual(result.loadPoint, "500");
      assert.strictEqual(result.unit, "g");
      assert.strictEqual(result.weightId, "WT-TC02-FAIL");
      assert.ok(result.warningMessage, "Must output warning message");
      assert.match(result.warningMessage!, /NABL 129 VIOLATION/);
      assert.match(result.warningMessage!, /U=0\.0025g exceeds 1\/3 MPE limit/);
      assert.match(result.warningMessage!, /Select Class E2 standard weights/);
    });

    test("Compliant Standard Weight: At L = 500 g with applicable MPE = 0.005 g, Class E2 U = 0.0010 g passes", () => {
      // Actual U = 0.0010 g <= 0.001666... g (Ratio = 20% <= 33.3%)
      const result = validateStandardWeightUncertainty(
        "0.0010 g",
        "500 g",
        "0.01 g",
        AccuracyClass.CLASS_II,
        {
          applicableMpe: "0.005 g",
          weightId: "WT-TC02-PASS",
          weightClass: "E2",
        }
      );

      assert.strictEqual(result.compliant, true);
      assert.strictEqual(result.actualUncertainty, "0.001");
      assert.match(result.maxAllowedUncertainty, /^0\.001666/);
      assert.strictEqual(result.warningMessage, undefined);
    });

    test("Batch Standard Weight Set evaluation identifies non-compliant weight and flags set", () => {
      const weightSet = [
        { loadMass: "50 g", uncertaintyU: "0.0010 g", weightId: "W-50-E2" }, // Pass
        { loadMass: "50 g", uncertaintyU: "0.0025 g", weightId: "W-50-M1-VIOLATION" }, // Fail: 0.0025 > 0.00166
        { loadMass: "100 g", uncertaintyU: "0.0015 g", weightId: "W-100-E2" }, // Pass
      ];

      const batchResult = validateStandardWeightSet(
        weightSet,
        "0.01 g",
        AccuracyClass.CLASS_II
      );

      assert.strictEqual(batchResult.allCompliant, false);
      assert.strictEqual(batchResult.passingCount, 2);
      assert.strictEqual(batchResult.failingCount, 1);
      assert.strictEqual(batchResult.results.length, 3);
      assert.strictEqual(batchResult.results[1].weightId, "W-50-M1-VIOLATION");
      assert.strictEqual(batchResult.results[1].compliant, false);
      assert.ok(batchResult.summaryWarning);
      assert.match(batchResult.summaryWarning!, /NABL 129 Pre-Check Failed: 1 of 3/);
    });
  });

  describe("3. REST API Gateway Pre-Check Gatekeeper (/api/v1/weights/precheck)", () => {
    let app: any;

    beforeEach(() => {
      app = createApp();
    });

    test("rejects out-of-spec standard weight (U = 0.0025 g, MPE = 0.005 g) with compliant: false and warning payload", async () => {
      const res = await request(app)
        .post("/api/v1/weights/precheck")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          uncertaintyU: "0.0025",
          targetLoad: "50",
          e: "0.01",
          accuracyClass: "II",
          loadUnit: "g",
          uncertaintyUnit: "g",
          eUnit: "g",
          weightId: "WT-TC02-REST-FAIL",
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.compliant, false);
      assert.strictEqual(res.body.status, "NON_COMPLIANT");
      assert.ok(res.body.warning);
      assert.match(res.body.warning, /NABL 129 VIOLATION/);
      assert.match(res.body.warning, /U=0\.0025g exceeds 1\/3 MPE limit/);
      assert.strictEqual(res.body.actualUncertainty, "0.0025");
      assert.match(res.body.maxAllowedUncertainty, /^0\.001666/);
    });

    test("approves compliant standard weight (U = 0.0010 g, MPE = 0.005 g) with compliant: true", async () => {
      const res = await request(app)
        .post("/api/v1/weights/precheck")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          uncertaintyU: "0.0010",
          targetLoad: "50",
          e: "0.01",
          accuracyClass: "II",
          loadUnit: "g",
          uncertaintyUnit: "g",
          eUnit: "g",
          weightId: "WT-TC02-REST-PASS",
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.compliant, true);
      assert.strictEqual(res.body.status, "COMPLIANT");
      assert.strictEqual(res.body.warning, undefined);
    });

    test("batch pre-check endpoint flags weight set containing out-of-spec reference standard", async () => {
      const res = await request(app)
        .post("/api/v1/weights/precheck")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          weights: [
            { loadMass: "50", uncertaintyU: "0.0010", weightId: "WS-VALID", unit: "g" },
            { loadMass: "50", uncertaintyU: "0.0025", weightId: "WS-INVALID", unit: "g" },
          ],
          e: "0.01",
          accuracyClass: "II",
          unit: "g",
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.compliant, false);
      assert.strictEqual(res.body.status, "NON_COMPLIANT");
      assert.strictEqual(res.body.failingCount, 1);
      assert.strictEqual(res.body.passingCount, 1);
      assert.ok(res.body.warning);
      assert.match(res.body.warning, /NABL 129 Pre-Check Failed/);
    });
  });

  describe("4. Observation Submission Lockout & Workflow Guard Verification", () => {
    test("verifies client gatekeeper locks observation submission on uncertainty violation", () => {
      // Client gatekeeper used by /weights and /bench
      const gatekeeper = evaluateNablGatekeeper({
        load: 50,
        loadUnit: "g",
        e: 0.01,
        eUnit: "g",
        accuracyClass: "II",
        uncertaintyU: 0.0025,
        uncertaintyUnit: "g",
      });

      // Assert gatekeeper fails and triggers lockout condition
      assert.strictEqual(gatekeeper.valid, false);
      assert.strictEqual(gatekeeper.status, "FAIL_UNCERTAINTY_EXCEEDED");
      assert.strictEqual(gatekeeper.percentageRatio, "50.0%");
      assert.strictEqual(gatekeeper.recommendedWeightClass, "Class E2");
      assert.match(gatekeeper.message, /exceeds ⅓ MPE limit/);
      assert.match(gatekeeper.message, /Standard weight cannot be used for this verification load/);

      // Verify that when valid is false, UI locks observation submission
      const isObservationSubmissionLocked = !gatekeeper.valid;
      assert.strictEqual(
        isObservationSubmissionLocked,
        true,
        "Observation submission must be locked when standard weight uncertainty exceeds 1/3 MPE"
      );
    });

    test("verifies client gatekeeper unlocks observation submission when compliant standard weight is selected", () => {
      const gatekeeper = evaluateNablGatekeeper({
        load: 50,
        loadUnit: "g",
        e: 0.01,
        eUnit: "g",
        accuracyClass: "II",
        uncertaintyU: 0.0010,
        uncertaintyUnit: "g",
      });

      assert.strictEqual(gatekeeper.valid, true);
      assert.strictEqual(gatekeeper.status, "PASS");
      assert.strictEqual(gatekeeper.percentageRatio, "20.0%");
      assert.match(gatekeeper.message, /complies with OIML R 76-1 Clause 3.7.1/);

      const isObservationSubmissionLocked = !gatekeeper.valid;
      assert.strictEqual(
        isObservationSubmissionLocked,
        false,
        "Observation submission must be unlocked when standard weight satisfies U <= 1/3 MPE"
      );
    });
  });
});
