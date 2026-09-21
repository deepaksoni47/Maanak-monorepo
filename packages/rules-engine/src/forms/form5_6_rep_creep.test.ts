import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateForm5Repeatability,
  evaluateForm6Creep,
  Form5SeriesInput,
  Form6CreepObservation,
} from "./form5_6_rep_creep.js";
import { AccuracyClass, ComplianceStatus } from "@maanak/types";

describe("TASK-021: Form 5 & Form 6 Evaluator: Repeatability & Creep (form5_6_rep_creep.ts)", () => {
  /* ======================================================================= */
  /*                     FORM 5: REPEATABILITY TESTS                         */
  /* ======================================================================= */

  describe("Form 5: Repeatability (Clause A.4.10)", () => {
    // Scale: Class III, Max = 15 kg, e = 5 g (0.005 kg).
    // Series 1 at ~0.5 Max (7.5 kg): MPE = ±1.0e = ±5.0 g.
    // Series 2 at Max (15 kg): MPE = ±1.5e = ±7.5 g.

    const seriesHalfMax: Form5SeriesInput = {
      seriesLabel: "Series 1 (~0.5 Max, 7.5 kg)",
      nominalLoadMass: "7.500",
      zeroObservation: {
        indicatedValue: "0.000",
        turningPointDeltaL: "0.0025", // E0 = 0 kg
      },
      observations: [
        { repetitionIndex: 1, loadMass: "7.500", indicatedValue: "7.500", turningPointDeltaL: "0.0020" }, // P = 7.5005 kg
        { repetitionIndex: 2, loadMass: "7.500", indicatedValue: "7.500", turningPointDeltaL: "0.0015" }, // P = 7.5010 kg (Pmax)
        { repetitionIndex: 3, loadMass: "7.500", indicatedValue: "7.500", turningPointDeltaL: "0.0025" }, // P = 7.5000 kg
        { repetitionIndex: 4, loadMass: "7.500", indicatedValue: "7.500", turningPointDeltaL: "0.0020" }, // P = 7.5005 kg
        { repetitionIndex: 5, loadMass: "7.500", indicatedValue: "7.500", turningPointDeltaL: "0.0030" }, // P = 7.4995 kg (Pmin)
        { repetitionIndex: 6, loadMass: "7.500", indicatedValue: "7.500", turningPointDeltaL: "0.0025" }, // P = 7.5000 kg
        { repetitionIndex: 7, loadMass: "7.500", indicatedValue: "7.500", turningPointDeltaL: "0.0020" }, // P = 7.5005 kg
        { repetitionIndex: 8, loadMass: "7.500", indicatedValue: "7.500", turningPointDeltaL: "0.0015" }, // P = 7.5010 kg
        { repetitionIndex: 9, loadMass: "7.500", indicatedValue: "7.500", turningPointDeltaL: "0.0025" }, // P = 7.5000 kg
        { repetitionIndex: 10, loadMass: "7.500", indicatedValue: "7.500", turningPointDeltaL: "0.0020" }, // P = 7.5005 kg
      ],
    };

    const seriesMax: Form5SeriesInput = {
      seriesLabel: "Series 2 (Max, 15 kg)",
      nominalLoadMass: "15.000",
      zeroObservation: {
        indicatedValue: "0.000",
        turningPointDeltaL: "0.0025",
      },
      observations: [
        { repetitionIndex: 1, loadMass: "15.000", indicatedValue: "15.000", turningPointDeltaL: "0.0015" }, // P = 15.0010 kg
        { repetitionIndex: 2, loadMass: "15.000", indicatedValue: "15.000", turningPointDeltaL: "0.0010" }, // P = 15.0015 kg (Pmax)
        { repetitionIndex: 3, loadMass: "15.000", indicatedValue: "15.000", turningPointDeltaL: "0.0020" }, // P = 15.0005 kg
        { repetitionIndex: 4, loadMass: "15.000", indicatedValue: "15.000", turningPointDeltaL: "0.0035" }, // P = 14.9990 kg (Pmin)
        { repetitionIndex: 5, loadMass: "15.000", indicatedValue: "15.000", turningPointDeltaL: "0.0025" }, // P = 15.0000 kg
        { repetitionIndex: 6, loadMass: "15.000", indicatedValue: "15.000", turningPointDeltaL: "0.0015" }, // P = 15.0010 kg
        { repetitionIndex: 7, loadMass: "15.000", indicatedValue: "15.000", turningPointDeltaL: "0.0020" }, // P = 15.0005 kg
        { repetitionIndex: 8, loadMass: "15.000", indicatedValue: "15.000", turningPointDeltaL: "0.0010" }, // P = 15.0015 kg
        { repetitionIndex: 9, loadMass: "15.000", indicatedValue: "15.000", turningPointDeltaL: "0.0025" }, // P = 15.0000 kg
        { repetitionIndex: 10, loadMass: "15.000", indicatedValue: "15.000", turningPointDeltaL: "0.0015" }, // P = 15.0010 kg
      ],
    };

    it("passes repeatability when error spread Pmax - Pmin <= |MPE| across 10 repetitions", () => {
      const result = evaluateForm5Repeatability([seriesHalfMax, seriesMax], {
        accuracyClass: AccuracyClass.CLASS_III,
        e: "5 g",
      });

      assert.strictEqual(result.pass, true);
      assert.strictEqual(result.status, ComplianceStatus.PASS);
      assert.strictEqual(result.totalSeriesEvaluated, 2);
      assert.strictEqual(result.totalSeriesFailed, 0);

      // Check Series 1 (7.5 kg):
      // Pmax = 7.5010 kg, Pmin = 7.4995 kg -> Spread = 1.5 g <= 5.0 g (30.00%)
      const s1 = result.series[0];
      assert.strictEqual(s1.nominalLoadMass, "7.5");
      assert.strictEqual(s1.mpeInMass, "0.005");
      assert.strictEqual(s1.pMax, "7.501");
      assert.strictEqual(s1.pMin, "7.4995");
      assert.strictEqual(s1.errorSpreadInG, "1.5");
      assert.strictEqual(s1.percentageOfMpe, "30.00%");
      assert.strictEqual(s1.pass, true);

      // Check Series 2 (15 kg):
      // Pmax = 15.0015 kg, Pmin = 14.9990 kg -> Spread = 2.5 g <= 7.5 g (33.33%)
      const s2 = result.series[1];
      assert.strictEqual(s2.nominalLoadMass, "15");
      assert.strictEqual(s2.mpeInMass, "0.0075");
      assert.strictEqual(s2.pMax, "15.0015");
      assert.strictEqual(s2.pMin, "14.999");
      assert.strictEqual(s2.errorSpreadInG, "2.5");
      assert.strictEqual(s2.percentageOfMpe, "33.33%");
      assert.strictEqual(s2.pass, true);
      assert.match(result.summary, /Repeatability \(Form 5\): PASS/);
    });

    it("flags FAIL when error spread Pmax - Pmin exceeds MPE", () => {
      // For 7.5 kg load (MPE = 5.0 g), suppose spread = 6.0 g > 5.0 g
      const failingSeries: Form5SeriesInput = {
        nominalLoadMass: "7.500",
        observations: [
          { repetitionIndex: 1, loadMass: "7.500", indicatedValue: "7.500", turningPointDeltaL: "-0.0005" }, // P = 7.5030 kg
          { repetitionIndex: 2, loadMass: "7.500", indicatedValue: "7.500", turningPointDeltaL: "0.0055" }, // P = 7.4970 kg -> Spread = 6.0 g > 5.0 g
          { repetitionIndex: 3, loadMass: "7.500", indicatedValue: "7.500", turningPointDeltaL: "0.0025" },
        ],
      };

      const result = evaluateForm5Repeatability(failingSeries, {
        accuracyClass: "III",
        e: "5 g",
      });

      assert.strictEqual(result.pass, false);
      assert.strictEqual(result.status, ComplianceStatus.FAIL);
      assert.strictEqual(result.series[0].isSpreadValid, false);
      assert.strictEqual(result.series[0].errorSpreadInG, "6");
      assert.match(result.summary, /Repeatability \(Form 5\): FAIL/);
    });

    it("scales MPE by fraction factor pi for modular repeatability testing (pi = 0.5)", () => {
      // Nominal load 7.5 kg, MPE = 5.0 g. With pi = 0.5, apportioned MPE = 2.5 g.
      // Spread of 3.0 g passes full scale (3.0 <= 5.0), but fails modular test (3.0 > 2.5).
      const borderlineSeries: Form5SeriesInput = {
        nominalLoadMass: "7.500",
        observations: [
          { repetitionIndex: 1, loadMass: "7.500", indicatedValue: "7.500", turningPointDeltaL: "0.0010" }, // P = 7.5015 kg
          { repetitionIndex: 2, loadMass: "7.500", indicatedValue: "7.500", turningPointDeltaL: "0.0040" }, // P = 7.4985 kg -> Spread = 3.0 g
          { repetitionIndex: 3, loadMass: "7.500", indicatedValue: "7.500", turningPointDeltaL: "0.0025" },
        ],
      };

      const resFull = evaluateForm5Repeatability(borderlineSeries, { accuracyClass: "III", e: "5 g" });
      assert.strictEqual(resFull.pass, true); // 3.0 g <= 5.0 g

      const resModular = evaluateForm5Repeatability(borderlineSeries, { accuracyClass: "III", e: "5 g", fractionFactorPi: "0.5" });
      assert.strictEqual(resModular.pass, false); // 3.0 g > 2.5 g
      assert.strictEqual(resModular.series[0].mpeInMass, "0.0025");
    });
  });

  /* ======================================================================= */
  /*                    FORM 6: CREEP & ZERO RETURN TESTS                    */
  /* ======================================================================= */

  describe("Form 6: Creep & Zero Return (Clause A.4.11)", () => {
    // Scale: Class III, Max = 15 kg, e = 5 g (0.005 kg).
    // Tolerances:
    // - 30-min Creep: <= 0.5e = 2.5 g (0.0025 kg)
    // - 15m to 30m Creep: <= 0.2e = 1.0 g (0.0010 kg)
    // - Zero Return (30.5m): <= 0.5e = 2.5 g (0.0025 kg)

    const standardCreepObservations: Form6CreepObservation[] = [
      { timeMinutes: 0, indicatedValue: "15.000", turningPointDeltaL: "0.0025" }, // P(0) = 15.0000 kg
      { timeMinutes: 5, indicatedValue: "15.000", turningPointDeltaL: "0.0020" }, // P(5) = 15.0005 kg
      { timeMinutes: 15, indicatedValue: "15.000", turningPointDeltaL: "0.0015" }, // P(15) = 15.0010 kg
      { timeMinutes: 30, indicatedValue: "15.000", turningPointDeltaL: "0.0010" }, // P(30) = 15.0015 kg
    ];

    const initialZero = { indicatedValue: "0.000", turningPointDeltaL: "0.0025" }; // P_zero,start = 0.0000 kg
    const finalZero = { indicatedValue: "0.000", turningPointDeltaL: "0.0015" }; // P_zero,end = 0.0010 kg (+1.0 g)

    it("passes creep and zero return when all criteria are within OIML R-76 tolerances", () => {
      const result = evaluateForm6Creep(standardCreepObservations, {
        accuracyClass: AccuracyClass.CLASS_III,
        e: "5 g",
        loadMass: "15 kg",
        initialZeroObservation: initialZero,
        finalZeroObservation: finalZero,
      });

      assert.strictEqual(result.pass, true);
      assert.strictEqual(result.status, ComplianceStatus.PASS);
      assert.strictEqual(result.totalCriteriaEvaluated, 3);
      assert.strictEqual(result.totalCriteriaFailed, 0);

      // 1. Total 30-min creep: |15.0015 - 15.0000| = 1.5 g <= 2.5 g (0.5e)
      assert.strictEqual(result.totalCreep30MinInG, "1.5");
      assert.strictEqual(result.maxAllowedCreep30Min, "0.0025");
      assert.strictEqual(result.isTotalCreepValid, true);

      // 2. 15-to-30-min creep: |15.0015 - 15.0010| = 0.5 g <= 1.0 g (0.2e)
      assert.strictEqual(result.creep15To30MinInG, "0.5");
      assert.strictEqual(result.maxAllowedCreep15To30Min, "0.001");
      assert.strictEqual(result.isCreep15To30MinValid, true);

      // 3. Zero return drift: |0.0010 - 0.0000| = 1.0 g <= 2.5 g (0.5e)
      assert.strictEqual(result.zeroReturnDriftInG, "1");
      assert.strictEqual(result.maxAllowedZeroReturn, "0.0025");
      assert.strictEqual(result.isZeroReturnValid, true);
      assert.match(result.summary, /Creep & Zero Return \(Form 6\): PASS/);
    });

    it("flags FAIL when total 30-min creep exceeds 0.5e", () => {
      // P(30) = 15.0035 kg -> Creep = 3.5 g > 2.5 g (0.5e)
      const failing30m: Form6CreepObservation[] = [
        standardCreepObservations[0], // P(0) = 15.0000 kg
        { timeMinutes: 15, indicatedValue: "15.000", turningPointDeltaL: "0.0015" },
        { timeMinutes: 30, indicatedValue: "15.000", turningPointDeltaL: "-0.0010" }, // P(30) = 15.0035 kg
      ];

      const result = evaluateForm6Creep(failing30m, {
        accuracyClass: "III",
        e: "5 g",
        loadMass: "15 kg",
      });

      assert.strictEqual(result.pass, false);
      assert.strictEqual(result.status, ComplianceStatus.FAIL);
      assert.strictEqual(result.isTotalCreepValid, false);
      assert.strictEqual(result.totalCreep30MinInG, "3.5");
      assert.match(result.summary, /Creep & Zero Return \(Form 6\): FAIL/);
    });

    it("flags FAIL when 15-to-30-min creep exceeds 0.2e", () => {
      // P(15) = 15.0005 kg, P(30) = 15.0020 kg -> 15-to-30 creep = 1.5 g > 1.0 g (0.2e)
      // Total creep = 2.0 g <= 2.5 g (passes), but 15-30m fails!
      const failing15to30m: Form6CreepObservation[] = [
        { timeMinutes: 0, indicatedValue: "15.000", turningPointDeltaL: "0.0025" }, // P(0) = 15.0000 kg
        { timeMinutes: 15, indicatedValue: "15.000", turningPointDeltaL: "0.0020" }, // P(15) = 15.0005 kg
        { timeMinutes: 30, indicatedValue: "15.000", turningPointDeltaL: "0.0005" }, // P(30) = 15.0020 kg
      ];

      const result = evaluateForm6Creep(failing15to30m, {
        accuracyClass: "III",
        e: "5 g",
        loadMass: "15 kg",
      });

      assert.strictEqual(result.pass, false);
      assert.strictEqual(result.status, ComplianceStatus.FAIL);
      assert.strictEqual(result.isTotalCreepValid, true); // 2.0 g <= 2.5 g
      assert.strictEqual(result.isCreep15To30MinValid, false); // 1.5 g > 1.0 g
      assert.strictEqual(result.creep15To30MinInG, "1.5");
    });

    it("flags FAIL when zero return after 30-min loading exceeds 0.5e", () => {
      // Final zero drift = 3.0 g > 2.5 g
      const badFinalZero = { indicatedValue: "0.000", turningPointDeltaL: "-0.0005" }; // P_zero,end = +3.0 g

      const result = evaluateForm6Creep(standardCreepObservations, {
        accuracyClass: "III",
        e: "5 g",
        loadMass: "15 kg",
        initialZeroObservation: initialZero,
        finalZeroObservation: badFinalZero,
      });

      assert.strictEqual(result.pass, false);
      assert.strictEqual(result.isZeroReturnValid, false);
      assert.strictEqual(result.zeroReturnDriftInG, "3");
    });

    it("throws error when fewer than 2 creep observations are provided", () => {
      assert.throws(
        () => evaluateForm6Creep([{ timeMinutes: 0, indicatedValue: "15.000", turningPointDeltaL: "0.0025" }], { accuracyClass: "III", e: "5 g", loadMass: "15 kg" }),
        /requires at least t=0 and t=30/i,
      );
    });
  });
});
