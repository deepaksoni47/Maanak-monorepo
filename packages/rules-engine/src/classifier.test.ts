import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { AccuracyClass } from "@maanak/types";
import {
  classifyInstrument,
  parseMass,
  normalizeAccuracyClass,
} from "./classifier.js";

describe("TASK-011: Table 3 NAWI Instrument Classifier (classifier.ts)", () => {
  describe("parseMass helper", () => {
    test("correctly parses masses with explicit units to kg", () => {
      assert.equal(parseMass("15 kg").valueInKg.toString(), "15");
      assert.equal(parseMass("5000 g").valueInKg.toString(), "5");
      assert.equal(parseMass("5 g").valueInKg.toString(), "0.005");
      assert.equal(parseMass("1 mg").valueInKg.toString(), "0.000001");
      assert.equal(parseMass("2 t").valueInKg.toString(), "2000");
      assert.equal(parseMass("10 ct").valueInKg.toString(), "0.002");
    });

    test("handles default unit when input is a bare numeric string or number", () => {
      assert.equal(parseMass("15", "kg").valueInKg.toString(), "15");
      assert.equal(parseMass(5, "g").valueInKg.toString(), "0.005");
    });

    test("throws on invalid mass string or unknown unit", () => {
      assert.throws(() => parseMass("abc"), /Invalid mass format/);
      assert.throws(() => parseMass("10 lbs"), /Unsupported unit of measurement/);
    });
  });

  describe("normalizeAccuracyClass", () => {
    test("maps various enum and string formats to standard accuracy class key", () => {
      assert.equal(normalizeAccuracyClass(AccuracyClass.CLASS_I), "I");
      assert.equal(normalizeAccuracyClass("CLASS_II"), "II");
      assert.equal(normalizeAccuracyClass("III"), "III");
      assert.equal(normalizeAccuracyClass(AccuracyClass.CLASS_IIII), "IIII");
    });
  });

  describe("classifyInstrument (Table 3 Acceptance Criteria)", () => {
    test("TC-01 Baseline: 15 kg / 5 g (Class III) yields n = 3000 (Valid Class III)", () => {
      const result = classifyInstrument("15 kg", "5 g", "5 g", AccuracyClass.CLASS_III);
      assert.equal(result.valid, true);
      assert.equal(result.n, 3000);
      assert.equal(result.scaleDivisionsN, "3000");
      assert.equal(result.minAllowedN, 500);
      assert.equal(result.minAllowedNString, "500");
      assert.equal(result.maxAllowedN, 10000);
      assert.equal(result.maxAllowedNString, "10000");
      assert.equal(result.minCapacityFactorE, 20);
      assert.equal(result.minCapacityRequiredInKg, "0.1"); // 20 * 0.005 kg = 0.1 kg = 100 g
    });

    test("TC-01 Negative: 15 kg / 1 mg triggers invalid class error for Class III", () => {
      const result = classifyInstrument("15 kg", "1 mg", "1 mg", AccuracyClass.CLASS_III);
      assert.equal(result.valid, false);
      assert.ok(result.errorReason);
      assert.match(result.errorReason, /not permitted for Accuracy Class III/);
    });

    test("Class I: 200 g / 1 mg, d = 0.1 mg yields n = 200000 (Valid Class I)", () => {
      const result = classifyInstrument("200 g", "1 mg", "0.1 mg", AccuracyClass.CLASS_I);
      assert.equal(result.valid, true);
      assert.equal(result.n, 200000);
      assert.equal(result.minAllowedN, 50000);
      assert.equal(result.maxAllowedN, null);
      assert.equal(result.maxAllowedNString, "Infinity");
      assert.equal(result.minCapacityFactorE, 100);
      assert.equal(result.minCapacityRequiredInKg, "0.0001"); // 100 * 0.000001 kg = 100 mg = 0.1 g
    });

    test("Class I: 40 g / 1 mg yields n = 40000 (< 50000) -> Invalid Class I", () => {
      const result = classifyInstrument("40 g", "1 mg", "1 mg", AccuracyClass.CLASS_I);
      assert.equal(result.valid, false);
      assert.equal(result.n, 40000);
      assert.match(result.errorReason!, /below minimum allowed 50000/);
    });

    test("Class II: 500 g / 10 mg, d = 10 mg yields n = 50000 (Valid Class II)", () => {
      const result = classifyInstrument("500 g", "10 mg", "10 mg", AccuracyClass.CLASS_II);
      assert.equal(result.valid, true);
      assert.equal(result.n, 50000);
      assert.equal(result.minAllowedN, 100);
      assert.equal(result.maxAllowedN, 100000);
      assert.equal(result.minCapacityFactorE, 20);
    });

    test("Class II: 6 kg / 0.01 g (n = 600000 > 100000) -> Exceeds maxAllowedN", () => {
      const result = classifyInstrument("6 kg", "0.01 g", "0.01 g", AccuracyClass.CLASS_II);
      assert.equal(result.valid, false);
      assert.equal(result.n, 600000);
      assert.match(result.errorReason!, /exceeds maximum allowed 100000/);
    });

    test("Class IIII: 50 kg / 50 g yields n = 1000 (Valid Class IIII)", () => {
      const result = classifyInstrument("50 kg", "50 g", "50 g", AccuracyClass.CLASS_IIII);
      assert.equal(result.valid, true);
      assert.equal(result.n, 1000);
      assert.equal(result.minAllowedN, 100);
      assert.equal(result.maxAllowedN, 1000);
      assert.equal(result.minCapacityFactorE, 10);
    });

    test("Rejects d > e auxiliary relationship (d = 10 g, e = 5 g)", () => {
      const result = classifyInstrument("15 kg", "5 g", "10 g", AccuracyClass.CLASS_III);
      assert.equal(result.valid, false);
      assert.match(result.errorReason!, /Actual scale interval d .* cannot exceed/);
    });

    test("Rejects e > 10d auxiliary relationship (d = 0.1 g, e = 2 g > 10 * 0.1)", () => {
      const result = classifyInstrument("15 kg", "2 g", "0.1 g", AccuracyClass.CLASS_III);
      assert.equal(result.valid, false);
      assert.match(result.errorReason!, /exceeds maximum auxiliary limit 10d/);
    });

    test("Validates minimum capacity Min >= minCapacityFactorE * e", () => {
      // 15 kg / 5 g Class III requires Min >= 20e = 100 g
      const validMinResult = classifyInstrument("15 kg", "5 g", "5 g", AccuracyClass.CLASS_III, {
        minCapacity: "100 g",
      });
      assert.equal(validMinResult.valid, true);

      const invalidMinResult = classifyInstrument("15 kg", "5 g", "5 g", AccuracyClass.CLASS_III, {
        minCapacity: "50 g",
      });
      assert.equal(invalidMinResult.valid, false);
      assert.match(invalidMinResult.errorReason!, /Declared minimum capacity Min .* is below required 20e/);
    });
  });
});
