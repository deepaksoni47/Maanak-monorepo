import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateForm1Weighing, Form1ObservationInput } from "./form1_weighing.js";
import { AccuracyClass, ComplianceStatus, PartialWeighingRange } from "@maanak/types";

describe("TASK-018: Form 1 Evaluator: Weighing Performance & Hysteresis (form1_weighing.ts)", () => {
  // Ground truth dataset from TC-01 / Adobe Scan p. 2
  // Scale: Class III, Max = 15 kg, e = 5 g (0.005 kg), d = 5 g
  const tc01ZeroObservation = {
    indicatedValue: "0.000",
    turningPointDeltaL: "0.0025", // E0 = 0 + 0.0025 - 0.0025 = 0.0000 kg
  };

  const tc01AscendingSteps: Form1ObservationInput[] = [
    {
      loadMass: "2.500", // 500e
      indicatedValue: "2.500",
      turningPointDeltaL: "0.0020", // P = 2.5005 kg, Ec = +0.5 g
      direction: "ASCENDING",
    },
    {
      loadMass: "10.000", // 2000e
      indicatedValue: "10.000",
      turningPointDeltaL: "0.0015", // P = 10.0010 kg, Ec = +1.0 g
      direction: "ASCENDING",
    },
    {
      loadMass: "15.000", // Max (3000e)
      indicatedValue: "15.000",
      turningPointDeltaL: "0.0010", // P = 15.0015 kg, Ec = +1.5 g
      direction: "ASCENDING",
    },
  ];

  const tc01DescendingSteps: Form1ObservationInput[] = [
    {
      loadMass: "15.000", // Max
      indicatedValue: "15.000",
      turningPointDeltaL: "0.0010", // Ec = +1.5 g
      direction: "DESCENDING",
    },
    {
      loadMass: "10.000", // 2000e
      indicatedValue: "10.000",
      turningPointDeltaL: "0.0010", // P = 10.0015 kg, Ec = +1.5 g
      direction: "DESCENDING",
    },
    {
      loadMass: "2.500", // 500e
      indicatedValue: "2.500",
      turningPointDeltaL: "0.0015", // P = 2.5010 kg, Ec = +1.0 g
      direction: "DESCENDING",
    },
  ];

  const tc01EndZeroObservation = {
    indicatedValue: "0.000",
    turningPointDeltaL: "0.0025", // E0_end = 0.0000 kg -> drift = 0
  };

  describe("TC-01 Official Class III Weighing Performance Dataset", () => {
    it("executes complete TC-01 dataset and asserts 100% compliance matching OIML R 76-2 Form 1", () => {
      const result = evaluateForm1Weighing(
        {
          ascending: tc01AscendingSteps,
          descending: tc01DescendingSteps,
          zeroObservation: tc01ZeroObservation,
          endZeroObservation: tc01EndZeroObservation,
        },
        {
          accuracyClass: AccuracyClass.CLASS_III,
          e: "0.005 kg",
        },
      );

      // Overall status
      assert.strictEqual(result.pass, true);
      assert.strictEqual(result.status, ComplianceStatus.PASS);
      assert.strictEqual(result.zeroErrorE0, "0");
      assert.strictEqual(result.zeroErrorE0InG, "0");

      // Ascending steps verification
      assert.strictEqual(result.ascendingSteps.length, 3);
      // Step 1 (2.5 kg, 500e)
      const asc1 = result.ascendingSteps[0];
      assert.strictEqual(asc1.loadMass, "2.5");
      assert.strictEqual(asc1.indicatedP, "2.5005");
      assert.strictEqual(asc1.correctedErrorEc, "0.0005"); // +0.5 g
      assert.strictEqual(asc1.correctedErrorEcInG, "0.5");
      assert.strictEqual(asc1.mpeInMass, "0.0025"); // ±2.5 g
      assert.strictEqual(asc1.mpeInE, "0.5");
      assert.strictEqual(asc1.pass, true);
      assert.strictEqual(asc1.percentageOfMpe, "20.00%");

      // Step 2 (10 kg, 2000e)
      const asc2 = result.ascendingSteps[1];
      assert.strictEqual(asc2.loadMass, "10");
      assert.strictEqual(asc2.indicatedP, "10.001");
      assert.strictEqual(asc2.correctedErrorEc, "0.001"); // +1.0 g
      assert.strictEqual(asc2.correctedErrorEcInG, "1");
      assert.strictEqual(asc2.mpeInMass, "0.005"); // ±5.0 g
      assert.strictEqual(asc2.mpeInE, "1.0");
      assert.strictEqual(asc2.pass, true);
      assert.strictEqual(asc2.percentageOfMpe, "20.00%");

      // Step 3 (15 kg, 3000e Max)
      const asc3 = result.ascendingSteps[2];
      assert.strictEqual(asc3.loadMass, "15");
      assert.strictEqual(asc3.indicatedP, "15.0015");
      assert.strictEqual(asc3.correctedErrorEc, "0.0015"); // +1.5 g
      assert.strictEqual(asc3.correctedErrorEcInG, "1.5");
      assert.strictEqual(asc3.mpeInMass, "0.0075"); // ±7.5 g
      assert.strictEqual(asc3.mpeInE, "1.5");
      assert.strictEqual(asc3.pass, true);
      assert.strictEqual(asc3.percentageOfMpe, "20.00%");

      // Hysteresis verification:
      // At 15 kg: |1.5 g - 1.5 g| = 0.0 g <= 7.5 g -> PASS
      // At 10 kg: |1.5 g - 1.0 g| = 0.5 g <= 5.0 g -> PASS
      // At 2.5 kg: |1.0 g - 0.5 g| = 0.5 g <= 2.5 g -> PASS
      assert.strictEqual(result.hysteresisSteps.length, 3);
      const hyst10kg = result.hysteresisSteps.find((h) => h.loadMass === "10");
      assert.ok(hyst10kg);
      assert.strictEqual(hyst10kg.hysteresisError, "0.0005");
      assert.strictEqual(hyst10kg.hysteresisErrorInG, "0.5");
      assert.strictEqual(hyst10kg.mpeInMass, "0.005");
      assert.strictEqual(hyst10kg.pass, true);

      // Return to zero verification
      assert.ok(result.endZeroStep);
      assert.strictEqual(result.endZeroStep.pass, true);
      assert.strictEqual(result.endZeroStep.zeroDrift, "0");
      assert.strictEqual(result.endZeroStep.maxAllowedDrift, "0.0025"); // 0.5e = 2.5 g

      // Check worst-case metrics (40.00% at descending 2.5 kg step)
      assert.strictEqual(result.maxObservedEc.percentageOfMpe, "40.00%");
      assert.strictEqual(result.maxObservedEc.direction, "DESCENDING");
      assert.strictEqual(result.maxObservedEc.loadMass, "2.5");
      assert.strictEqual(result.totalPointsFailed, 0);
      assert.match(result.summary, /Weighing Performance \(Form 1\): PASS/);
    });

    it("evaluates flat observation input array containing ascending, descending, and zero points", () => {
      const flatList: Form1ObservationInput[] = [
        { loadMass: "0", indicatedValue: "0.000", turningPointDeltaL: "0.0025", direction: "ASCENDING" },
        ...tc01AscendingSteps,
        ...tc01DescendingSteps,
        { loadMass: "0", indicatedValue: "0.000", turningPointDeltaL: "0.0025", direction: "DESCENDING" },
      ];

      const result = evaluateForm1Weighing(flatList, {
        accuracyClass: "III",
        e: "5 g",
      });

      assert.strictEqual(result.pass, true);
      assert.strictEqual(result.ascendingSteps.length, 3);
      assert.strictEqual(result.descendingSteps.length, 3);
      assert.strictEqual(result.hysteresisSteps.length, 3);
      assert.ok(result.endZeroStep);
      assert.strictEqual(result.endZeroStep.pass, true);
    });
  });

  describe("Non-Zero Tare / Initial Zero Error Correction (E0 != 0)", () => {
    it("corrects intrinsic error for non-zero initial zero error E0", () => {
      // E0 = 0 + 0.0025 - 0.0020 = +0.0005 kg (+0.5 g)
      const nonZeroStart = {
        indicatedValue: "0.000",
        turningPointDeltaL: "0.0020",
      };

      // Raw error at 2.5 kg: P = 2.500 + 0.0025 - 0.0015 = 2.5010 kg -> E = +1.0 g
      // Ec = E - E0 = 1.0 g - 0.5 g = +0.5 g
      const steps: Form1ObservationInput[] = [
        { loadMass: "2.5", indicatedValue: "2.500", turningPointDeltaL: "0.0015", direction: "ASCENDING" },
      ];

      const result = evaluateForm1Weighing(
        {
          ascending: steps,
          descending: [],
          zeroObservation: nonZeroStart,
        },
        {
          accuracyClass: "III",
          e: "5 g",
        },
      );

      assert.strictEqual(result.zeroErrorE0, "0.0005");
      assert.strictEqual(result.zeroErrorE0InG, "0.5");
      assert.strictEqual(result.ascendingSteps[0].rawErrorE, "0.001"); // E = +1.0 g
      assert.strictEqual(result.ascendingSteps[0].correctedErrorEc, "0.0005"); // Ec = +0.5 g
      assert.strictEqual(result.pass, true);
    });
  });

  describe("Compliance Failures & Out-of-Tolerance Detection", () => {
    it("flags FAIL when a step exceeds Table 6 MPE", () => {
      // At 2.5 kg (500e), MPE is ±2.5 g.
      // Suppose deltaL = 0 -> P = 2.500 + 0.0025 - 0 = 2.5025 kg -> Ec = +2.5025 - 2.5 = +2.5 g
      // Suppose deltaL = -0.001 -> P = 2.5035 kg -> Ec = +3.5 g (> 2.5 g)
      const failingSteps: Form1ObservationInput[] = [
        { loadMass: "2.5", indicatedValue: "2.501", turningPointDeltaL: "0.0000", direction: "ASCENDING" }, // P = 2.5035 kg -> Ec = +3.5 g
      ];

      const result = evaluateForm1Weighing(
        {
          ascending: failingSteps,
          descending: [],
          zeroObservation: tc01ZeroObservation,
        },
        {
          accuracyClass: "III",
          e: "5 g",
        },
      );

      assert.strictEqual(result.pass, false);
      assert.strictEqual(result.status, ComplianceStatus.FAIL);
      assert.strictEqual(result.totalPointsFailed, 1);
      assert.strictEqual(result.ascendingSteps[0].pass, false);
      assert.strictEqual(result.ascendingSteps[0].status, ComplianceStatus.FAIL);
      assert.match(result.summary, /Weighing Performance \(Form 1\): FAIL/);
    });

    it("flags FAIL when hysteresis error exceeds MPE", () => {
      // Ascending at 10 kg: Ec = +1.0 g (MPE = ±5.0 g)
      // Descending at 10 kg: suppose Ec = -4.5 g (within MPE, but diff = 5.5 g > 5.0 g)
      // For Ec = -4.5 g: P = 9.9955 kg -> I = 10.000 kg, deltaL = 0.0070 kg (since 10.000 + 0.0025 - 0.0070 = 9.9955)
      const asc: Form1ObservationInput[] = [
        { loadMass: "10.0", indicatedValue: "10.000", turningPointDeltaL: "0.0015", direction: "ASCENDING" }, // Ec = +1.0 g
      ];
      const desc: Form1ObservationInput[] = [
        { loadMass: "10.0", indicatedValue: "10.000", turningPointDeltaL: "0.0070", direction: "DESCENDING" }, // Ec = -4.5 g
      ];

      const result = evaluateForm1Weighing(
        {
          ascending: asc,
          descending: desc,
          zeroObservation: tc01ZeroObservation,
        },
        {
          accuracyClass: "III",
          e: "5 g",
        },
      );

      assert.strictEqual(result.pass, false);
      assert.strictEqual(result.status, ComplianceStatus.FAIL);
      assert.strictEqual(result.hysteresisSteps[0].pass, false);
      assert.strictEqual(result.hysteresisSteps[0].hysteresisError, "0.0055"); // 5.5 g > 5.0 g
    });

    it("flags FAIL when return-to-zero drift exceeds 0.5e", () => {
      // 0.5e = 2.5 g. End zero has deltaL = 0.0060 -> E0_end = 0 + 0.0025 - 0.0060 = -3.5 g
      // Drift = |-3.5 g - 0| = 3.5 g > 2.5 g
      const badEndZero = {
        indicatedValue: "0.000",
        turningPointDeltaL: "0.0060",
      };

      const result = evaluateForm1Weighing(
        {
          ascending: tc01AscendingSteps,
          descending: tc01DescendingSteps,
          zeroObservation: tc01ZeroObservation,
          endZeroObservation: badEndZero,
        },
        {
          accuracyClass: "III",
          e: "5 g",
        },
      );

      assert.strictEqual(result.pass, false);
      assert.ok(result.endZeroStep);
      assert.strictEqual(result.endZeroStep.pass, false);
      assert.strictEqual(result.endZeroStep.status, ComplianceStatus.FAIL);
    });
  });

  describe("Multi-Interval Scale Support (TC-03 Dual Range)", () => {
    const dualRanges: PartialWeighingRange[] = [
      { rangeIndex: 1, maxCapacity: "3 kg", verificationIntervalE: "1 g", actualIntervalD: "1 g" },
      { rangeIndex: 2, maxCapacity: "6 kg", verificationIntervalE: "2 g", actualIntervalD: "2 g" },
    ];

    it("dynamically resolves partial range and applies active verification scale interval e_i per step", () => {
      const zeroObs = {
        indicatedValue: "0.000",
        turningPointDeltaL: "0.0005", // 0.5e1 -> E0 = 0
      };

      const multiAscending: Form1ObservationInput[] = [
        {
          loadMass: "2.000", // Range 1: e1 = 1 g (0.001 kg), MPE = ±1.0 g
          indicatedValue: "2.000",
          turningPointDeltaL: "0.0004", // P = 2.000 + 0.0005 - 0.0004 = 2.0001 kg -> Ec = +0.1 g
          direction: "ASCENDING",
        },
        {
          loadMass: "5.000", // Range 2: e2 = 2 g (0.002 kg), MPE = ±3.0 g (2500e2)
          indicatedValue: "5.000",
          turningPointDeltaL: "0.0006", // P = 5.000 + 0.0010 - 0.0006 = 5.0004 kg -> Ec = +0.4 g
          direction: "ASCENDING",
        },
      ];

      const result = evaluateForm1Weighing(
        {
          ascending: multiAscending,
          descending: [],
          zeroObservation: zeroObs,
        },
        {
          accuracyClass: "III",
          partialRanges: dualRanges,
        },
      );

      assert.strictEqual(result.pass, true);
      assert.strictEqual(result.ascendingSteps[0].activePartialRangeIndex, 1);
      assert.strictEqual(result.ascendingSteps[0].e, "1 g");
      assert.strictEqual(result.ascendingSteps[0].mpeInMass, "0.001"); // ±1.0 g

      assert.strictEqual(result.ascendingSteps[1].activePartialRangeIndex, 2);
      assert.strictEqual(result.ascendingSteps[1].e, "2 g");
      assert.strictEqual(result.ascendingSteps[1].mpeInMass, "0.003"); // ±3.0 g
    });
  });

  describe("Apportioned MPE / Modular Testing (fractionFactorPi = 0.7)", () => {
    it("scales MPE limit by fraction factor pi for load cell / module evaluation", () => {
      // Class III, 10 kg, e = 5 g. Normal MPE = ±5.0 g = 0.005 kg.
      // With pi = 0.7, apportioned MPE = 0.7 * 5.0 g = ±3.5 g = 0.0035 kg.
      // If Ec = +3.0 g, passes with pi=0.7 (3.0 <= 3.5), but if Ec = +4.0 g, it fails (4.0 > 3.5).
      const stepWith4g: Form1ObservationInput[] = [
        {
          loadMass: "10.0",
          indicatedValue: "10.000",
          turningPointDeltaL: "-0.0015", // P = 10.000 + 0.0025 - (-0.0015) = 10.0040 kg -> Ec = +4.0 g
          direction: "ASCENDING",
        },
      ];

      // Test without pi: 4.0 g <= 5.0 g -> PASS
      const resFull = evaluateForm1Weighing(
        {
          ascending: stepWith4g,
          descending: [],
          zeroObservation: tc01ZeroObservation,
        },
        {
          accuracyClass: "III",
          e: "5 g",
        },
      );
      assert.strictEqual(resFull.pass, true);

      // Test with pi = 0.7: 4.0 g > 3.5 g -> FAIL
      const resModular = evaluateForm1Weighing(
        {
          ascending: stepWith4g,
          descending: [],
          zeroObservation: tc01ZeroObservation,
        },
        {
          accuracyClass: "III",
          e: "5 g",
          fractionFactorPi: "0.7",
        },
      );
      assert.strictEqual(resModular.pass, false);
      assert.strictEqual(resModular.ascendingSteps[0].mpeInMass, "0.0035"); // 0.005 * 0.7 = 0.0035 kg
    });
  });
});
