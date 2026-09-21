import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateForm3Eccentricity,
  evaluateForm4Discrimination,
  Form3EccentricityObservation,
  Form4DiscriminationObservation,
} from "./form3_4_ecc_disc.js";
import { AccuracyClass, ComplianceStatus } from "@maanak/types";

describe("TASK-020: Form 3 & Form 4 Evaluator: Eccentricity & Discrimination (form3_4_ecc_disc.ts)", () => {
  /* ======================================================================= */
  /*                      FORM 3: ECCENTRICITY TESTS                         */
  /* ======================================================================= */

  describe("Form 3: Eccentricity / Corner Loading (Clause A.4.7)", () => {
    // Scale: Class III, Max = 15 kg, e = 5 g (0.005 kg).
    // Off-centre test load: L = 1/3 Max = 5 kg (1000e).
    // Table 6 MPE at 5 kg: ±1.0e = ±5.0 g (0.0050 kg).
    const zeroObs = {
      indicatedValue: "0.000",
      turningPointDeltaL: "0.0025", // E0 = 0 kg
    };

    const standard5Positions: Form3EccentricityObservation[] = [
      {
        positionNumber: 1, // Center
        loadMass: "5.000",
        indicatedValue: "5.000",
        turningPointDeltaL: "0.0020", // P = 5.0005 kg -> Ec = +0.5 g
      },
      {
        positionNumber: 2, // Top-Left
        loadMass: "5.000",
        indicatedValue: "5.000",
        turningPointDeltaL: "0.0015", // P = 5.0010 kg -> Ec = +1.0 g
      },
      {
        positionNumber: 3, // Top-Right
        loadMass: "5.000",
        indicatedValue: "5.000",
        turningPointDeltaL: "0.0010", // P = 5.0015 kg -> Ec = +1.5 g
      },
      {
        positionNumber: 4, // Bottom-Right
        loadMass: "5.000",
        indicatedValue: "5.000",
        turningPointDeltaL: "0.0025", // P = 5.0000 kg -> Ec = 0.0 g
      },
      {
        positionNumber: 5, // Bottom-Left
        loadMass: "5.000",
        indicatedValue: "5.000",
        turningPointDeltaL: "0.0030", // P = 4.9995 kg -> Ec = -0.5 g
      },
    ];

    it("evaluates standard 5-position receptor and passes when all positions are within Table 6 MPE", () => {
      const result = evaluateForm3Eccentricity(standard5Positions, {
        accuracyClass: AccuracyClass.CLASS_III,
        e: "5 g",
        zeroObservation: zeroObs,
      });

      assert.strictEqual(result.pass, true);
      assert.strictEqual(result.status, ComplianceStatus.PASS);
      assert.strictEqual(result.totalPositionsEvaluated, 5);
      assert.strictEqual(result.totalPositionsFailed, 0);

      // Check Center position (Pos 1)
      const center = result.positions[0];
      assert.strictEqual(center.positionNumber, 1);
      assert.strictEqual(center.positionLabel, "Position 1 (Center)");
      assert.strictEqual(center.correctedErrorEcInG, "0.5");
      assert.strictEqual(center.mpeInMass, "0.005");
      assert.strictEqual(center.pass, true);

      // Check Top-Right position (Pos 3, max error)
      const topRight = result.positions[2];
      assert.strictEqual(topRight.positionNumber, 3);
      assert.strictEqual(topRight.correctedErrorEcInG, "1.5");
      assert.strictEqual(topRight.pass, true);
      assert.strictEqual(topRight.percentageOfMpe, "30.00%");

      // Check worst-case position metrics
      assert.strictEqual(result.maxObservedEc.positionNumber, 3);
      assert.strictEqual(result.maxObservedEc.percentageOfMpe, "30.00%");

      // Spread: 1.5 g - (-0.5 g) = 2.0 g
      assert.strictEqual(result.maxSpreadEcInG, "2");
      assert.match(result.summary, /Eccentricity \(Form 3\): PASS/);
    });

    it("flags FAIL when a corner position exceeds Table 6 MPE", () => {
      // Pos 3 exceeds MPE (Ec = +6.0 g > 5.0 g)
      const failingCorner: Form3EccentricityObservation[] = [
        ...standard5Positions.slice(0, 2),
        {
          positionNumber: 3,
          loadMass: "5.000",
          indicatedValue: "5.005",
          turningPointDeltaL: "0.0015", // P = 5.005 + 0.0025 - 0.0015 = 5.0060 kg -> Ec = +6.0 g (> 5.0 g)
        },
        ...standard5Positions.slice(3),
      ];

      const result = evaluateForm3Eccentricity(failingCorner, {
        accuracyClass: "III",
        e: "5 g",
        zeroObservation: zeroObs,
      });

      assert.strictEqual(result.pass, false);
      assert.strictEqual(result.status, ComplianceStatus.FAIL);
      assert.strictEqual(result.totalPositionsFailed, 1);
      assert.strictEqual(result.positions[2].pass, false);
      assert.strictEqual(result.positions[2].status, ComplianceStatus.FAIL);
      assert.match(result.summary, /Eccentricity \(Form 3\): FAIL/);
    });

    it("corrects for non-zero initial zero tare E0", () => {
      // E0 = +0.5 g
      const nonZeroZero = {
        indicatedValue: "0.000",
        turningPointDeltaL: "0.0020", // E0 = +0.5 g
      };

      const result = evaluateForm3Eccentricity(standard5Positions, {
        accuracyClass: "III",
        e: "5 g",
        zeroObservation: nonZeroZero,
      });

      assert.strictEqual(result.zeroErrorE0InG, "0.5");
      // Pos 1: Raw E = +0.5 g -> Ec = 0.5 - 0.5 = 0.0 g
      assert.strictEqual(result.positions[0].correctedErrorEcInG, "0");
      // Pos 3: Raw E = +1.5 g -> Ec = 1.5 - 0.5 = +1.0 g
      assert.strictEqual(result.positions[2].correctedErrorEcInG, "1");
    });

    it("scales MPE by fraction factor pi for modular testing (pi = 0.7)", () => {
      // 5 kg load on Class III scale, normal MPE = ±5.0 g.
      // With pi = 0.7, apportioned MPE = ±3.5 g.
      // Corner with Ec = +4.0 g passes full test, but fails modular test.
      const modularObs: Form3EccentricityObservation[] = [
        {
          positionNumber: 2,
          loadMass: "5.000",
          indicatedValue: "5.000",
          turningPointDeltaL: "-0.0015", // P = 5.0040 kg -> Ec = +4.0 g
        },
      ];

      const resFull = evaluateForm3Eccentricity(modularObs, {
        accuracyClass: "III",
        e: "5 g",
        zeroObservation: zeroObs,
      });
      assert.strictEqual(resFull.pass, true); // 4.0 g <= 5.0 g

      const resModular = evaluateForm3Eccentricity(modularObs, {
        accuracyClass: "III",
        e: "5 g",
        fractionFactorPi: "0.7",
        zeroObservation: zeroObs,
      });
      assert.strictEqual(resModular.pass, false); // 4.0 g > 3.5 g
      assert.strictEqual(resModular.positions[0].mpeInMass, "0.0035");
    });

    it("throws error when observations array is empty", () => {
      assert.throws(() => evaluateForm3Eccentricity([], { accuracyClass: "III", e: "5 g" }), /at least one eccentricity observation/i);
    });
  });

  /* ======================================================================= */
  /*                    FORM 4: DISCRIMINATION TESTS                         */
  /* ======================================================================= */

  describe("Form 4: Discrimination Test (Clause A.4.8 / 1.4d)", () => {
    // Scale: d = 5 g (0.005 kg). 1.4d = 7 g (0.007 kg).
    // Test at Min (0.1 kg), 1/2 Max (7.5 kg), Max (15 kg).
    const standardDiscriminations: Form4DiscriminationObservation[] = [
      {
        loadPointLabel: "Min (100 g)",
        appliedLoad: "0.100",
        initialIndicationI1: "0.100",
        addedLoadDeltaL: "0.007", // 1.4d = 7 g
        finalIndicationI2: "0.105", // Flipped by +1d (5 g)
      },
      {
        loadPointLabel: "1/2 Max (7.5 kg)",
        appliedLoad: "7.500",
        initialIndicationI1: "7.500",
        addedLoadDeltaL: "0.007",
        finalIndicationI2: "7.505", // Flipped by +1d
      },
      {
        loadPointLabel: "Max (15 kg)",
        appliedLoad: "15.000",
        initialIndicationI1: "15.000",
        addedLoadDeltaL: "0.007",
        finalIndicationI2: "15.005", // Flipped by +1d
      },
    ];

    it("passes discrimination when 1.4d extra load causes indication to increase by >= 1d across all load points", () => {
      const result = evaluateForm4Discrimination(standardDiscriminations, {
        d: "5 g",
      });

      assert.strictEqual(result.pass, true);
      assert.strictEqual(result.status, ComplianceStatus.PASS);
      assert.strictEqual(result.totalStepsEvaluated, 3);
      assert.strictEqual(result.totalStepsFailed, 0);

      // Check Min step
      const minStep = result.steps[0];
      assert.strictEqual(minStep.loadPointLabel, "Min (100 g)");
      assert.strictEqual(minStep.indicationChangeDeltaI, "0.005");
      assert.strictEqual(minStep.expectedMinChangeDeltaI, "0.005");
      assert.strictEqual(minStep.expectedAddedLoad, "0.007");
      assert.strictEqual(minStep.pass, true);

      // Check Max step
      const maxStep = result.steps[2];
      assert.strictEqual(maxStep.pass, true);
      assert.match(result.summary, /Discrimination \(Form 4\): PASS/);
    });

    it("flags FAIL when indication fails to change by at least 1d upon adding 1.4d", () => {
      // At 1/2 Max, the indication stays stuck at 7.500 kg (Delta I = 0 < 1d)
      const failingStep: Form4DiscriminationObservation[] = [
        standardDiscriminations[0],
        {
          loadPointLabel: "1/2 Max (7.5 kg)",
          appliedLoad: "7.500",
          initialIndicationI1: "7.500",
          addedLoadDeltaL: "0.007",
          finalIndicationI2: "7.500", // Stuck indication! Delta I = 0
        },
        standardDiscriminations[2],
      ];

      const result = evaluateForm4Discrimination(failingStep, {
        d: "5 g",
      });

      assert.strictEqual(result.pass, false);
      assert.strictEqual(result.status, ComplianceStatus.FAIL);
      assert.strictEqual(result.totalStepsFailed, 1);
      assert.strictEqual(result.steps[1].pass, false);
      assert.strictEqual(result.steps[1].status, ComplianceStatus.FAIL);
      assert.match(result.summary, /Discrimination \(Form 4\): FAIL/);
    });

    it("evaluates discrimination for precision balance with d = 0.1 g (1.4d = 0.14 g)", () => {
      const precisionBalance: Form4DiscriminationObservation[] = [
        {
          loadPointLabel: "Max (1000 g)",
          appliedLoad: "1000.0 g",
          initialIndicationI1: "1000.0 g",
          addedLoadDeltaL: "0.14 g", // 1.4 * 0.1 g
          finalIndicationI2: "1000.1 g", // +0.1 g
          unit: "g",
        },
      ];

      const result = evaluateForm4Discrimination(precisionBalance, {
        d: "0.1 g",
        unit: "g",
      });

      assert.strictEqual(result.pass, true);
      assert.strictEqual(result.steps[0].indicationChangeDeltaI, "0.0001"); // 0.1 g in kg
      assert.strictEqual(result.steps[0].expectedAddedLoad, "0.00014"); // 0.14 g in kg
    });

    it("throws error when observations array is empty", () => {
      assert.throws(() => evaluateForm4Discrimination([], { d: "5 g" }), /at least one discrimination observation/i);
    });
  });
});
