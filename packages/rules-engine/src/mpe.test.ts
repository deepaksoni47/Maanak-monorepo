import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { AccuracyClass } from "@maanak/types";
import { getMpe, isWithinMpe } from "./mpe.js";

describe("TASK-012: Table 6 Initial Verification MPE Step Bracket Engine (mpe.ts)", () => {
  describe("Class III Acceptance Criteria (e = 5 g)", () => {
    test("Load 2.5 kg (500e) -> MPE = ±0.5e = ±2.5 g (0.0025 kg)", () => {
      const result = getMpe("2.5 kg", "5 g", AccuracyClass.CLASS_III);
      assert.equal(result.mInDivisions, "500");
      assert.equal(result.mpeFactorE, "0.5");
      assert.equal(result.mpeInE, "0.5");
      assert.equal(result.mpeInMass, "0.0025");
      assert.equal(result.mpeLower, "-0.0025");
      assert.equal(result.mpeUpper, "0.0025");
    });

    test("Load 10 kg (2000e) -> MPE = ±1.0e = ±5.0 g (0.005 kg)", () => {
      const result = getMpe("10 kg", "5 g", AccuracyClass.CLASS_III);
      assert.equal(result.mInDivisions, "2000");
      assert.equal(result.mpeFactorE, "1.0");
      assert.equal(result.mpeInE, "1.0");
      assert.equal(result.mpeInMass, "0.005");
      assert.equal(result.mpeLower, "-0.005");
      assert.equal(result.mpeUpper, "0.005");
    });

    test("Load 15 kg (3000e) -> MPE = ±1.5e = ±7.5 g (0.0075 kg)", () => {
      const result = getMpe("15 kg", "5 g", AccuracyClass.CLASS_III);
      assert.equal(result.mInDivisions, "3000");
      assert.equal(result.mpeFactorE, "1.5");
      assert.equal(result.mpeInE, "1.5");
      assert.equal(result.mpeInMass, "0.0075");
      assert.equal(result.mpeLower, "-0.0075");
      assert.equal(result.mpeUpper, "0.0075");
    });
  });

  describe("Class I Step Brackets (e = 1 mg)", () => {
    test("Load 50 g (50000e) -> MPE = ±0.5e = ±0.5 mg", () => {
      const result = getMpe("50 g", "1 mg", AccuracyClass.CLASS_I);
      assert.equal(result.mInDivisions, "50000");
      assert.equal(result.mpeFactorE, "0.5");
      assert.equal(result.mpeInMass, "0.0000005"); // 0.5 mg in kg
    });

    test("Load 100 g (100000e) -> MPE = ±1.0e = ±1.0 mg", () => {
      const result = getMpe("100 g", "1 mg", AccuracyClass.CLASS_I);
      assert.equal(result.mInDivisions, "100000");
      assert.equal(result.mpeFactorE, "1.0");
      assert.equal(result.mpeInMass, "0.000001");
    });

    test("Load 250 g (250000e) -> MPE = ±1.5e = ±1.5 mg", () => {
      const result = getMpe("250 g", "1 mg", AccuracyClass.CLASS_I);
      assert.equal(result.mInDivisions, "250000");
      assert.equal(result.mpeFactorE, "1.5");
      assert.equal(result.mpeInMass, "0.0000015");
    });
  });

  describe("Class II Step Brackets (e = 10 mg)", () => {
    test("Load 50 g (5000e) -> MPE = ±0.5e = ±5 mg", () => {
      const result = getMpe("50 g", "10 mg", AccuracyClass.CLASS_II);
      assert.equal(result.mInDivisions, "5000");
      assert.equal(result.mpeFactorE, "0.5");
      assert.equal(result.mpeInMass, "0.000005");
    });

    test("Load 150 g (15000e) -> MPE = ±1.0e = ±10 mg", () => {
      const result = getMpe("150 g", "10 mg", AccuracyClass.CLASS_II);
      assert.equal(result.mInDivisions, "15000");
      assert.equal(result.mpeFactorE, "1.0");
      assert.equal(result.mpeInMass, "0.00001");
    });

    test("Load 500 g (50000e) -> MPE = ±1.5e = ±15 mg", () => {
      const result = getMpe("500 g", "10 mg", AccuracyClass.CLASS_II);
      assert.equal(result.mInDivisions, "50000");
      assert.equal(result.mpeFactorE, "1.5");
      assert.equal(result.mpeInMass, "0.000015");
    });
  });

  describe("Class IIII Step Brackets (e = 50 g)", () => {
    test("Load 2.5 kg (50e) -> MPE = ±0.5e = ±25 g", () => {
      const result = getMpe("2.5 kg", "50 g", AccuracyClass.CLASS_IIII);
      assert.equal(result.mInDivisions, "50");
      assert.equal(result.mpeFactorE, "0.5");
      assert.equal(result.mpeInMass, "0.025");
    });

    test("Load 5 kg (100e) -> MPE = ±1.0e = ±50 g", () => {
      const result = getMpe("5 kg", "50 g", AccuracyClass.CLASS_IIII);
      assert.equal(result.mInDivisions, "100");
      assert.equal(result.mpeFactorE, "1.0");
      assert.equal(result.mpeInMass, "0.05");
    });

    test("Load 25 kg (500e) -> MPE = ±1.5e = ±75 g", () => {
      const result = getMpe("25 kg", "50 g", AccuracyClass.CLASS_IIII);
      assert.equal(result.mInDivisions, "500");
      assert.equal(result.mpeFactorE, "1.5");
      assert.equal(result.mpeInMass, "0.075");
    });
  });

  describe("In-Service MPE Mode Doubling", () => {
    test("Class III 15 kg in service mode has double MPE (±3.0e = ±15 g)", () => {
      const result = getMpe("15 kg", "5 g", AccuracyClass.CLASS_III, {
        mode: "inService",
      });
      assert.equal(result.mpeFactorE, "3.0");
      assert.equal(result.mpeInMass, "0.015"); // 15 g
    });
  });

  describe("isWithinMpe compliance checker", () => {
    test("Passes when absolute error is strictly within or equal to MPE", () => {
      // For 15 kg (Class III, e = 5 g), MPE is ±7.5 g (0.0075 kg)
      const passExact = isWithinMpe("+7.5 g", "15 kg", "5 g", AccuracyClass.CLASS_III);
      assert.equal(passExact.compliant, true);
      assert.equal(passExact.marginInKg, "0");

      const passSmaller = isWithinMpe("-2.0 g", "15 kg", "5 g", AccuracyClass.CLASS_III);
      assert.equal(passSmaller.compliant, true);
      assert.equal(passSmaller.marginInKg, "0.0055");
    });

    test("Fails when absolute error exceeds MPE", () => {
      // 8.0 g > 7.5 g MPE
      const failExceeded = isWithinMpe("+8.0 g", "15 kg", "5 g", AccuracyClass.CLASS_III);
      assert.equal(failExceeded.compliant, false);
      assert.equal(failExceeded.marginInKg, "-0.0005");
    });
  });
});
