import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateForm2TemperatureDrift,
  ERR_TEMP_DRIFT_EXCEEDED,
  ERR_ZERO_DRIFT_EXCEEDED,
  Form2TemperatureObservation,
} from "./form2_temp_drift.js";
import { AccuracyClass, ComplianceStatus } from "@maanak/types";

describe("TASK-019: Form 2 Evaluator: Temperature Effect on No-Load & Drift Rate (form2_temp_drift.ts)", () => {
  describe("Chamber Temperature Drift Rate Compliance (TC-04 Specifications)", () => {
    it("flags error ERR_TEMP_DRIFT_EXCEEDED when temperature rate of change exceeds 5.0 °C/h (8.0 °C/h)", () => {
      // Temperature changes from 20.0 °C to 28.0 °C over 1 hour (60 min)
      // Delta T = 8.0 °C / 1 h = 8.0 °C/h > 5.0 °C/h
      const observations: Form2TemperatureObservation[] = [
        {
          temperatureC: "20.0",
          elapsedTimeMinutes: 0,
          indicatedValue: "0.000",
          turningPointDeltaL: "0.0025", // E0 = 0 kg
        },
        {
          temperatureC: "28.0",
          elapsedTimeMinutes: 60, // 1 hour
          indicatedValue: "0.000",
          turningPointDeltaL: "0.0020", // E0 = +0.5 g (within zero drift tolerance)
        },
      ];

      const result = evaluateForm2TemperatureDrift(observations, {
        accuracyClass: AccuracyClass.CLASS_III,
        e: "5 g", // 0.005 kg
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
      assert.match(result.summary, /ERR_TEMP_DRIFT_EXCEEDED/);
    });

    it("passes temperature rate check when rate is within 5.0 °C/h (4.0 °C/h)", () => {
      // Temperature changes from 20.0 °C to 40.0 °C over 5 hours (300 min)
      // Delta T = 20.0 °C / 5 h = 4.0 °C/h <= 5.0 °C/h
      const observations: Form2TemperatureObservation[] = [
        {
          temperatureC: "20.0",
          elapsedTimeMinutes: 0,
          indicatedValue: "0.000",
          turningPointDeltaL: "0.0025", // E0 = 0 kg
        },
        {
          temperatureC: "40.0",
          elapsedTimeMinutes: 300, // 5 hours
          indicatedValue: "0.000",
          turningPointDeltaL: "0.0005", // P = 0.0020 kg -> E0 = +2.0 g (0.4e)
        },
      ];

      const result = evaluateForm2TemperatureDrift(observations, {
        accuracyClass: "III",
        e: "5 g",
      });

      assert.strictEqual(result.pass, true);
      assert.strictEqual(result.status, ComplianceStatus.PASS);
      assert.strictEqual(result.transitions[0].tempRateCPerHour, "4.00");
      assert.strictEqual(result.transitions[0].isTempRateValid, true);
    });
  });

  describe("Zero-Load Indication Drift Compliance (Clause A.5.3.2)", () => {
    it("passes when zero drift is within 1.0e (0.4e drift passes per acceptance criteria)", () => {
      // Scale: e = 5 g (0.005 kg). 1.0e = 5.0 g.
      // Observation 1 (20 °C): I0 = 0.000, deltaL0 = 0.0025 -> E0 = 0.0000 kg
      // Observation 2 (40 °C): I0 = 0.000, deltaL0 = 0.0005 -> P0 = 0 + 0.0025 - 0.0005 = 0.0020 kg -> E0 = +2.0 g
      // Delta E0 = |2.0 g - 0.0 g| = 2.0 g = 0.40e <= 1.0e -> PASS
      const observations: Form2TemperatureObservation[] = [
        {
          temperatureC: "20.0",
          elapsedTimeMinutes: 0,
          indicatedValue: "0.000",
          turningPointDeltaL: "0.0025",
        },
        {
          temperatureC: "40.0",
          elapsedTimeMinutes: 300,
          indicatedValue: "0.000",
          turningPointDeltaL: "0.0005",
        },
      ];

      const result = evaluateForm2TemperatureDrift(observations, {
        accuracyClass: "III",
        e: "5 g",
      });

      assert.strictEqual(result.pass, true);
      assert.strictEqual(result.status, ComplianceStatus.PASS);
      assert.strictEqual(result.steps.length, 2);
      assert.strictEqual(result.steps[0].zeroErrorE0InG, "0");
      assert.strictEqual(result.steps[1].zeroErrorE0InG, "2");

      const trans = result.transitions[0];
      assert.strictEqual(trans.zeroDriftInG, "2");
      assert.strictEqual(trans.zeroDriftInDivisions, "0.4");
      assert.strictEqual(trans.isZeroDriftValid, true);
      assert.strictEqual(trans.pass, true);
      assert.match(result.summary, /Temperature Effect \(Form 2\): PASS/);
    });

    it("flags error ERR_ZERO_DRIFT_EXCEEDED when zero drift exceeds 1.0e (1.4e drift)", () => {
      // Scale: e = 5 g. 1.0e = 5.0 g.
      // Observation 1: E0 = 0 g
      // Observation 2: I0 = 0.005 kg, deltaL0 = 0.0005 -> P0 = 0.005 + 0.0025 - 0.0005 = 0.0070 kg -> E0 = +7.0 g
      // Delta E0 = 7.0 g = 1.4e > 1.0e -> FAIL
      const observations: Form2TemperatureObservation[] = [
        {
          temperatureC: "20.0",
          elapsedTimeMinutes: 0,
          indicatedValue: "0.000",
          turningPointDeltaL: "0.0025", // E0 = 0
        },
        {
          temperatureC: "40.0",
          elapsedTimeMinutes: 300,
          indicatedValue: "0.005",
          turningPointDeltaL: "0.0005", // E0 = +7.0 g
        },
      ];

      const result = evaluateForm2TemperatureDrift(observations, {
        accuracyClass: "III",
        e: "5 g",
      });

      assert.strictEqual(result.pass, false);
      assert.strictEqual(result.status, ComplianceStatus.FAIL);
      assert.strictEqual(result.transitions[0].zeroDriftInG, "7");
      assert.strictEqual(result.transitions[0].zeroDriftInDivisions, "1.4");
      assert.strictEqual(result.transitions[0].isZeroDriftValid, false);
      assert.ok(result.transitions[0].errorCodes.includes(ERR_ZERO_DRIFT_EXCEEDED));
      assert.ok(result.errorCodes.includes(ERR_ZERO_DRIFT_EXCEEDED));
    });
  });

  describe("Full 4-Step Thermal Chamber Cycle (20 °C -> 40 °C -> -10 °C -> 20 °C)", () => {
    it("evaluates multi-point thermal cycle with ISO timestamps", () => {
      const cycleObservations: Form2TemperatureObservation[] = [
        {
          temperatureC: "20.0",
          timestamp: "2026-09-21T08:00:00.000Z",
          indicatedValue: "0.000",
          turningPointDeltaL: "0.0025", // E0 = 0 kg
        },
        {
          temperatureC: "40.0",
          timestamp: "2026-09-21T13:00:00.000Z", // +5h -> rate = 20/5 = 4.0 °C/h
          indicatedValue: "0.000",
          turningPointDeltaL: "0.0010", // P = 0.0015 kg -> E0 = +1.5 g (0.3e)
        },
        {
          temperatureC: "-10.0",
          timestamp: "2026-09-22T00:00:00.000Z", // +11h -> rate = 50/11 = 4.55 °C/h
          indicatedValue: "0.000",
          turningPointDeltaL: "0.0035", // P = -0.0010 kg -> E0 = -1.0 g (diff from +1.5 = 2.5 g = 0.5e)
        },
        {
          temperatureC: "20.0",
          timestamp: "2026-09-22T07:00:00.000Z", // +7h -> rate = 30/7 = 4.29 °C/h
          indicatedValue: "0.000",
          turningPointDeltaL: "0.0025", // E0 = 0 kg (diff from -1.0 = 1.0 g = 0.2e)
        },
      ];

      const result = evaluateForm2TemperatureDrift(cycleObservations, {
        accuracyClass: "III",
        e: "5 g",
      });

      assert.strictEqual(result.pass, true);
      assert.strictEqual(result.steps.length, 4);
      assert.strictEqual(result.transitions.length, 3);

      // All transitions should pass
      for (const trans of result.transitions) {
        assert.strictEqual(trans.isTempRateValid, true);
        assert.strictEqual(trans.isZeroDriftValid, true);
        assert.strictEqual(trans.pass, true);
      }

      assert.strictEqual(result.maxObservedZeroDrift.driftInG, "2.5");
      assert.strictEqual(result.maxObservedZeroDrift.driftInDivisions, "0.5");
      assert.strictEqual(result.maxObservedZeroDrift.fromTempC, "40");
      assert.strictEqual(result.maxObservedZeroDrift.toTempC, "-10");
      assert.strictEqual(result.totalPointsFailed, 0);
    });
  });

  describe("Modular Testing Apportionment (fractionFactorPi = 0.5)", () => {
    it("scales zero drift tolerance by pi (0.5e for indicator module)", () => {
      // For module testing with pi = 0.5, max allowed zero drift = 0.5 * 5 g = 2.5 g (0.5e).
      // Drift of 3.0 g (0.6e):
      // - Passes complete instrument test (3.0 g <= 5.0 g)
      // - Fails module test with pi = 0.5 (3.0 g > 2.5 g)
      const observations: Form2TemperatureObservation[] = [
        {
          temperatureC: "20.0",
          elapsedTimeMinutes: 0,
          indicatedValue: "0.000",
          turningPointDeltaL: "0.0025", // E0 = 0
        },
        {
          temperatureC: "30.0",
          elapsedTimeMinutes: 180, // 3 hours
          indicatedValue: "0.000",
          turningPointDeltaL: "-0.0005", // P = 0 + 0.0025 - (-0.0005) = 0.0030 kg -> E0 = +3.0 g (0.6e)
        },
      ];

      // Full instrument (pi = 1.0)
      const resFull = evaluateForm2TemperatureDrift(observations, {
        accuracyClass: "III",
        e: "5 g",
      });
      assert.strictEqual(resFull.pass, true);

      // Module (pi = 0.5)
      const resModular = evaluateForm2TemperatureDrift(observations, {
        accuracyClass: "III",
        e: "5 g",
        fractionFactorPi: "0.5",
      });
      assert.strictEqual(resModular.pass, false);
      assert.strictEqual(resModular.transitions[0].maxAllowedZeroDrift, "0.0025");
      assert.strictEqual(resModular.transitions[0].isZeroDriftValid, false);
    });
  });

  describe("Validation & Error Handling", () => {
    it("throws error when fewer than 2 observations are provided", () => {
      assert.throws(
        () =>
          evaluateForm2TemperatureDrift(
            [
              {
                temperatureC: "20.0",
                indicatedValue: "0.000",
                turningPointDeltaL: "0.0025",
              },
            ],
            { accuracyClass: "III", e: "5 g" },
          ),
        /at least 2 temperature observations/i,
      );
    });
  });
});
