import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { AccuracyClass } from "@maanak/types";
import {
  validateStandardWeightUncertainty,
  validateStandardWeightSet,
} from "./nabl129.js";
import { loadDefaultRulePack } from "./loader.js";

describe("TASK-022: NABL 129 Standard Weight Uncertainty Pre-Check (U <= 1/3 MPE)", () => {
  describe("TC-02 Acceptance Scenario: Class II Scale (Max = 1 kg, e = 0.01 g)", () => {
    test("TC-02: At L = 500 g with applicable MPE = 0.005 g, U = 0.0025 g violates 1/3 MPE constraint", () => {
      // Max allowed U = 1/3 * 0.005 g = 0.001666... g
      // Input U = 0.0025 g > 0.001666... g -> compliant: false
      const result = validateStandardWeightUncertainty(
        "0.0025 g",
        "500 g",
        "0.01 g",
        AccuracyClass.CLASS_II,
        {
          applicableMpe: "0.005 g",
          weightId: "#W-402",
        },
      );

      assert.equal(result.compliant, false);
      assert.equal(result.actualUncertainty, "0.0025");
      assert.match(result.maxAllowedUncertainty, /^0\.001666/);
      assert.equal(result.mpeApplied, "0.005");
      assert.equal(result.loadPoint, "500");
      assert.equal(result.unit, "g");
      assert.equal(result.weightId, "#W-402");
      assert.ok(result.warningMessage);
      assert.match(result.warningMessage!, /NABL 129 VIOLATION/);
      assert.match(result.warningMessage!, /#W-402/);
      assert.match(result.warningMessage!, /U=0\.0025g exceeds 1\/3 MPE limit/);
      assert.match(result.warningMessage!, /Select Class E2 standard weights/);
    });

    test("TC-02: At L = 500 g with applicable MPE = 0.005 g, compliant U = 0.0010 g passes", () => {
      const result = validateStandardWeightUncertainty(
        "0.0010 g",
        "500 g",
        "0.01 g",
        AccuracyClass.CLASS_II,
        {
          applicableMpe: "0.005 g",
        },
      );

      assert.equal(result.compliant, true);
      assert.equal(result.actualUncertainty, "0.001");
      assert.match(result.maxAllowedUncertainty, /^0\.001666/);
      assert.equal(result.warningMessage, undefined);
    });

    test("Automatic Table 6 evaluation: Class II at L = 50 g (5000e) yields MPE = 0.005 g", () => {
      // At L = 50 g, m = 50 / 0.01 = 5000e -> MPE bracket 0 <= m <= 5000 is 0.5e = 0.005 g
      // Max allowed U = 0.001666... g
      const resultFail = validateStandardWeightUncertainty(
        "0.0025 g",
        "50 g",
        "0.01 g",
        AccuracyClass.CLASS_II,
      );

      assert.equal(resultFail.compliant, false);
      assert.equal(resultFail.mpeApplied, "0.005");
      assert.match(resultFail.maxAllowedUncertainty, /^0\.001666/);
      assert.match(resultFail.warningMessage!, /NABL 129 VIOLATION/);

      const resultPass = validateStandardWeightUncertainty(
        "0.0015 g",
        "50 g",
        "0.01 g",
        AccuracyClass.CLASS_II,
      );
      assert.equal(resultPass.compliant, true);
    });

    test("Automatic Table 6 evaluation: Class I at L = 500 g, e = 0.01 g (50000e) yields MPE = 0.005 g", () => {
      // In Class I, 0 <= m <= 50000 -> MPE = 0.5e = 0.005 g
      const result = validateStandardWeightUncertainty(
        "0.0025 g",
        "500 g",
        "0.01 g",
        AccuracyClass.CLASS_I,
      );

      assert.equal(result.compliant, false);
      assert.equal(result.mpeApplied, "0.005");
      assert.match(result.maxAllowedUncertainty, /^0\.001666/);
      assert.match(result.warningMessage!, /Select Class E1 or E2 standard weights/);
    });
  });

  describe("Boundary Condition & Mathematical Exactness", () => {
    test("Exact boundary U = 1/3 * MPE passes compliance check", () => {
      // MPE = 0.003 g -> 1/3 MPE = 0.001 g
      const resultBoundary = validateStandardWeightUncertainty(
        "0.001 g",
        "100 g",
        "0.01 g",
        AccuracyClass.CLASS_II,
        { applicableMpe: "0.003 g" },
      );
      assert.equal(resultBoundary.compliant, true);
      assert.equal(resultBoundary.actualUncertainty, "0.001");
      assert.equal(resultBoundary.maxAllowedUncertainty, "0.001");

      // Slightly exceeding boundary fails
      const resultJustAbove = validateStandardWeightUncertainty(
        "0.0010001 g",
        "100 g",
        "0.01 g",
        AccuracyClass.CLASS_II,
        { applicableMpe: "0.003 g" },
      );
      assert.equal(resultJustAbove.compliant, false);
    });

    test("Handles numeric inputs and custom units (kg, mg)", () => {
      // e = 1 mg, load = 50 g (50000e, Class I -> MPE = 0.5 mg = 0.0005 g)
      // Max U = 0.5 mg / 3 = 0.1666... mg
      const resMg = validateStandardWeightUncertainty(
        "0.1 mg",
        "50 g",
        "1 mg",
        AccuracyClass.CLASS_I,
      );
      assert.equal(resMg.compliant, true);
      assert.equal(resMg.unit, "mg");
      assert.equal(resMg.actualUncertainty, "0.1");
      assert.match(resMg.maxAllowedUncertainty, /^0\.1666/);
    });

    test("Passes rulePack directly as 5th argument", () => {
      const pack = loadDefaultRulePack();
      const result = validateStandardWeightUncertainty(
        "0.001 g",
        "50 g",
        "0.01 g",
        "II",
        pack,
      );
      assert.equal(result.compliant, true);
    });

    test("Respects custom maxUncertaintyRatio (e.g. 0.2 for 1/5 MPE)", () => {
      // MPE = 0.010 g. Ratio = 0.2 -> Max U = 0.002 g.
      // If U = 0.0025 g, under 1/3 (0.0033) it would pass, but under 0.2 it fails
      const resStrict = validateStandardWeightUncertainty(
        "0.0025 g",
        "100 g",
        "0.01 g",
        AccuracyClass.CLASS_II,
        {
          applicableMpe: "0.010 g",
          maxUncertaintyRatio: "0.2",
        },
      );
      assert.equal(resStrict.compliant, false);
      assert.equal(resStrict.maxAllowedUncertainty, "0.002");
    });
  });

  describe("Input Validation & Error Conditions", () => {
    test("Throws error if uncertainty U is negative", () => {
      assert.throws(
        () =>
          validateStandardWeightUncertainty(
            "-0.001 g",
            "500 g",
            "0.01 g",
            AccuracyClass.CLASS_II,
          ),
        /Expanded uncertainty U must be non-negative/,
      );
    });

    test("Throws error if verification interval e is <= 0", () => {
      assert.throws(
        () =>
          validateStandardWeightUncertainty(
            "0.001 g",
            "500 g",
            "0 g",
            AccuracyClass.CLASS_II,
          ),
        /Verification scale interval \(e\) must be strictly positive/,
      );
    });
  });

  describe("Batch Standard Weight Set Evaluation (validateStandardWeightSet)", () => {
    test("Returns allCompliant: true when all reference standard weights pass", () => {
      const weights = [
        { loadMass: "50 g", uncertaintyU: "0.001 g", weightId: "W-50" },
        { loadMass: "100 g", uncertaintyU: "0.0015 g", weightId: "W-100" },
        { loadMass: "200 g", uncertaintyU: "0.002 g", weightId: "W-200" },
      ];

      const batchResult = validateStandardWeightSet(
        weights,
        "0.01 g",
        AccuracyClass.CLASS_II,
      );

      assert.equal(batchResult.allCompliant, true);
      assert.equal(batchResult.passingCount, 3);
      assert.equal(batchResult.failingCount, 0);
      assert.equal(batchResult.results.length, 3);
      assert.equal(batchResult.summaryWarning, undefined);
    });

    test("Returns allCompliant: false and summary warning when one weight fails", () => {
      const weights = [
        { loadMass: "50 g", uncertaintyU: "0.001 g", weightId: "W-50" }, // Pass: MPE=0.005 -> Max U=0.00166
        { loadMass: "50 g", uncertaintyU: "0.003 g", weightId: "W-50-POOR" }, // Fail: 0.003 > 0.00166
      ];

      const batchResult = validateStandardWeightSet(
        weights,
        "0.01 g",
        AccuracyClass.CLASS_II,
      );

      assert.equal(batchResult.allCompliant, false);
      assert.equal(batchResult.passingCount, 1);
      assert.equal(batchResult.failingCount, 1);
      assert.ok(batchResult.summaryWarning);
      assert.match(batchResult.summaryWarning!, /NABL 129 Pre-Check Failed: 1 of 2/);
      assert.match(batchResult.summaryWarning!, /L=50g: U=0\.003 >/);
    });
  });
});
