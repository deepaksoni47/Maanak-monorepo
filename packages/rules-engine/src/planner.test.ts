import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  AccuracyClass,
  InstrumentType,
  InstrumentModelSpecification,
  WeighingDeviceType,
} from "@maanak/types";
import { generateTestPlan } from "./planner.js";
import { loadDefaultRulePack } from "./loader.js";

describe("TASK-024: Dynamic Test Plan Generator (planner.ts)", () => {
  describe("15 kg Class III Balance Acceptance Scenario", () => {
    const class3Scale: InstrumentModelSpecification = {
      modelName: "Maanak Bench-15K",
      manufacturer: "Maanak Metrology Labs",
      accuracyClass: AccuracyClass.CLASS_III,
      instrumentType: InstrumentType.SINGLE_INTERVAL,
      weighingDeviceType: WeighingDeviceType.ELECTRONIC,
      maxCapacity: "15 kg",
      minCapacity: "0.1 kg", // 100 g = 20e
      verificationIntervalE: "0.005 kg", // 5 g
      actualIntervalD: "0.005 kg", // 5 g
      unitOfMeasure: "kg",
    };

    const plan = generateTestPlan(class3Scale);

    test("Generates valid test plan container with 6 mandatory test clauses (Forms 1–6)", () => {
      assert.equal(plan.totalTestClauses, 6);
      assert.equal(plan.items.length, 6);
      assert.equal(plan.accuracyClass, AccuracyClass.CLASS_III);
      assert.equal(plan.maxCapacity, "15");
      assert.equal(plan.minCapacity, "0.1");
      assert.equal(plan.verificationIntervalE, "0.005");
      assert.equal(plan.actualIntervalD, "0.005");
      assert.equal(plan.scaleDivisionCountN, 3000); // 15 / 0.005 = 3000 divisions

      const formNumbers = plan.items.map((it) => it.formNumber);
      assert.deepEqual(formNumbers, [
        "Form 1",
        "Form 2",
        "Form 3",
        "Form 4",
        "Form 5",
        "Form 6",
      ]);

      const clauses = plan.items.map((it) => it.clauseNumber);
      assert.deepEqual(clauses, [
        "A.4.4",
        "A.5.3.2",
        "A.4.7",
        "A.4.8",
        "A.4.10",
        "A.4.11",
      ]);
    });

    test("Form 1 (Weighing Performance): Generates sequence of 10+ standard load points including Min, 500e, 2000e, 50% Max, 100% Max", () => {
      const weighingPoints = plan.form1WeighingPoints;
      // Acceptance criteria: 10+ standard load points
      assert.ok(
        weighingPoints.length >= 10,
        `Expected >= 10 load points, got ${weighingPoints.length}`,
      );
      assert.equal(weighingPoints.length, 11); // 6 ascending + 5 descending

      const nominalLoadsAscending = weighingPoints
        .filter((p) => p.direction === "ASCENDING")
        .map((p) => p.nominalLoad);

      // Verify mandatory load points in ascending run:
      // Zero (0), Min (0.1), 500e (2.5), 50% Max (7.5), 2000e (10), 100% Max (15)
      assert.ok(nominalLoadsAscending.includes("0"), "Missing Zero load");
      assert.ok(nominalLoadsAscending.includes("0.1"), "Missing Min load (20e = 0.1 kg)");
      assert.ok(nominalLoadsAscending.includes("2.5"), "Missing 500e step point (2.5 kg)");
      assert.ok(nominalLoadsAscending.includes("7.5"), "Missing 50% Max (7.5 kg)");
      assert.ok(nominalLoadsAscending.includes("10"), "Missing 2000e step point (10 kg)");
      assert.ok(nominalLoadsAscending.includes("15"), "Missing 100% Max (15 kg)");

      // Verify MPE calculations at each load
      const minPoint = weighingPoints.find((p) => p.nominalLoad === "0.1" && p.direction === "ASCENDING");
      assert.equal(minPoint?.mpeExpected, "0.0025"); // 0.5e = 2.5 g
      assert.equal(minPoint?.mpeExpectedFactorE, "0.5");

      const point500e = weighingPoints.find((p) => p.nominalLoad === "2.5" && p.direction === "ASCENDING");
      assert.equal(point500e?.mpeExpected, "0.0025"); // 0.5e = 2.5 g
      assert.equal(point500e?.mpeExpectedFactorE, "0.5");

      const point2000e = weighingPoints.find((p) => p.nominalLoad === "10" && p.direction === "ASCENDING");
      assert.equal(point2000e?.mpeExpected, "0.005"); // 1.0e = 5.0 g
      assert.equal(point2000e?.mpeExpectedFactorE, "1.0");

      const pointMax = weighingPoints.find((p) => p.nominalLoad === "15" && p.direction === "ASCENDING");
      assert.equal(pointMax?.mpeExpected, "0.0075"); // 1.5e = 7.5 g
      assert.equal(pointMax?.mpeExpectedFactorE, "1.5");
    });

    test("Form 2 (Temperature Drift): Configures standard thermal cycle and 5.0 °C/h drift rate", () => {
      const form2Item = plan.items.find((it) => it.formNumber === "Form 2");
      assert.ok(form2Item);
      assert.equal(form2Item!.clauseNumber, "A.5.3.2");
      assert.equal(plan.form2TemperatureDrift.maxDriftRateCPerHour, 5.0);
      assert.deepEqual(plan.form2TemperatureDrift.tempPointsC, [20.0, 40.0, -10.0, 20.0]);
    });

    test("Form 3 (Eccentricity): Calculates L = Max / 3 = 5.0 kg across 5 quadrant positions", () => {
      const form3Item = plan.items.find((it) => it.formNumber === "Form 3");
      assert.ok(form3Item);
      assert.equal(form3Item!.clauseNumber, "A.4.7");
      assert.equal(plan.form3EccentricityLoad.nominalLoad, "5");
      assert.equal(plan.form3EccentricityLoad.loadType, "CORNER");

      assert.equal(form3Item!.targetLoads.length, 5);
      const positions = form3Item!.targetLoads.map((l) => l.position);
      assert.deepEqual(positions, [
        "CENTER",
        "FRONT_LEFT",
        "BACK_LEFT",
        "BACK_RIGHT",
        "FRONT_RIGHT",
      ]);
      // At L = 5 kg (1000e), MPE is 1.0e = 5 g (0.005 kg)
      assert.equal(form3Item!.targetLoads[0].mpeExpected, "0.005");
    });

    test("Form 4 (Discrimination): Generates tests at Min, 50% Max, Max with 1.4d = 7.0 g", () => {
      const form4Item = plan.items.find((it) => it.formNumber === "Form 4");
      assert.ok(form4Item);
      assert.equal(form4Item!.clauseNumber, "A.4.8");
      assert.equal(plan.form4DiscriminationLoads.length, 3);

      const loads = plan.form4DiscriminationLoads.map((p) => p.nominalLoad);
      assert.deepEqual(loads, ["0.1", "7.5", "15"]);

      // 1.4d where d = 0.005 kg -> 1.4 * 0.005 = 0.007 kg (7 g)
      for (const discPoint of plan.form4DiscriminationLoads) {
        assert.equal(discPoint.extraLoad14d, "0.007");
      }
    });

    test("Form 5 (Repeatability): Configures 10-repetition runs at 50% Max and Max", () => {
      const form5Item = plan.items.find((it) => it.formNumber === "Form 5");
      assert.ok(form5Item);
      assert.equal(form5Item!.clauseNumber, "A.4.10");
      assert.equal(plan.form5RepeatabilityLoads.length, 20); // 10 at 7.5 kg + 10 at 15 kg

      const halfMaxRuns = plan.form5RepeatabilityLoads.filter((p) => p.nominalLoad === "7.5");
      const maxRuns = plan.form5RepeatabilityLoads.filter((p) => p.nominalLoad === "15");
      assert.equal(halfMaxRuns.length, 10);
      assert.equal(maxRuns.length, 10);
    });

    test("Form 6 (Creep & Zero Return): Configures 30-min run at Max with zero return at 30.5 min", () => {
      const form6Item = plan.items.find((it) => it.formNumber === "Form 6");
      assert.ok(form6Item);
      assert.equal(form6Item!.clauseNumber, "A.4.11");
      assert.equal(plan.form6CreepLoad.nominalLoad, "15");
      assert.equal(plan.form6CreepLoad.loadType, "MAX");

      // Check observation time steps (0, 5, 10, 15, 20, 30 min + 30.5 min zero return)
      assert.equal(form6Item!.targetLoads.length, 7);
      assert.equal(form6Item!.targetLoads[0].nominalLoad, "15");
      assert.equal(form6Item!.targetLoads[6].nominalLoad, "0"); // Unloaded for zero return
      assert.equal(form6Item!.targetLoads[6].loadType, "ZERO");
    });
  });

  describe("Analytical Balance (Class I, Max = 220 g, e = 1 mg, d = 0.1 mg)", () => {
    const class1Balance: InstrumentModelSpecification = {
      modelName: "Maanak Micro-220",
      manufacturer: "Maanak Metrology Labs",
      accuracyClass: AccuracyClass.CLASS_I,
      instrumentType: InstrumentType.SINGLE_INTERVAL,
      maxCapacity: "220 g",
      minCapacity: "0.1 g", // 100 mg = 100e
      verificationIntervalE: "1 mg",
      actualIntervalD: "0.1 mg",
      unitOfMeasure: "g",
    };

    const plan = generateTestPlan(class1Balance);

    test("Computes scale division count n = 220,000 divisions", () => {
      // 220 g / 0.001 g = 220,000
      assert.equal(plan.scaleDivisionCountN, 220000);
      assert.equal(plan.accuracyClass, AccuracyClass.CLASS_I);
    });

    test("Includes Table 6 Class I step change points (50,000e = 50 g, 200,000e = 200 g)", () => {
      const ascendingLoads = plan.form1WeighingPoints
        .filter((p) => p.direction === "ASCENDING")
        .map((p) => p.nominalLoad);

      assert.ok(ascendingLoads.includes("50"), "Missing 50000e step point (50 g)");
      assert.ok(ascendingLoads.includes("200"), "Missing 200000e step point (200 g)");
      assert.ok(ascendingLoads.includes("220"), "Missing 100% Max (220 g)");
    });

    test("Form 4 discrimination extra load is 1.4d = 0.14 mg = 0.00014 g", () => {
      for (const pt of plan.form4DiscriminationLoads) {
        assert.equal(pt.extraLoad14d, "0.00014");
      }
    });
  });

  describe("Input Validation & Error Handling", () => {
    test("Throws error if verification scale interval e is <= 0", () => {
      assert.throws(
        () =>
          generateTestPlan({
            modelName: "Invalid",
            manufacturer: "Test",
            accuracyClass: AccuracyClass.CLASS_III,
            instrumentType: InstrumentType.SINGLE_INTERVAL,
            maxCapacity: "15 kg",
            minCapacity: "0.1 kg",
            verificationIntervalE: "0 kg",
            actualIntervalD: "0 kg",
          }),
        /Verification scale interval \(e\) must be strictly positive/,
      );
    });

    test("Throws error if maximum capacity Max is <= 0", () => {
      assert.throws(
        () =>
          generateTestPlan({
            modelName: "Invalid",
            manufacturer: "Test",
            accuracyClass: AccuracyClass.CLASS_III,
            instrumentType: InstrumentType.SINGLE_INTERVAL,
            maxCapacity: "0 kg",
            minCapacity: "0.1 kg",
            verificationIntervalE: "0.005 kg",
            actualIntervalD: "0.005 kg",
          }),
        /Maximum capacity \(Max\) must be strictly positive/,
      );
    });
  });
});
