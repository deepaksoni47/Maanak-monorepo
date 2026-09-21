import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getActiveRangeForLoad,
  validatePartialRanges,
  getMultiIntervalMpe,
  calculateMultiIntervalObservation,
} from "./multi_interval.js";
import { PartialWeighingRange, AccuracyClass } from "@maanak/types";

describe("TASK-017: Multi-Interval Partial Range Resolver (multi_interval.ts)", () => {
  // Standard dual-range scale per TC-03:
  // W1: 0 - 3 kg, e1 = 1 g, d1 = 1 g
  // W2: 3 - 6 kg, e2 = 2 g, d2 = 2 g
  const standardDualRanges: PartialWeighingRange[] = [
    {
      rangeIndex: 1,
      maxCapacity: "3 kg",
      verificationIntervalE: "1 g",
      actualIntervalD: "1 g",
    },
    {
      rangeIndex: 2,
      maxCapacity: "6 kg",
      verificationIntervalE: "2 g",
      actualIntervalD: "2 g",
    },
  ];

  describe("TC-03 Dynamic Interval Switching Acceptance Criteria", () => {
    it("resolves Range 1 for load 2.5 kg: active e = 1 g, vernier step = 0.1 g", () => {
      const active = getActiveRangeForLoad("2.5 kg", standardDualRanges);
      assert.strictEqual(active.rangeIndex, 1);
      assert.strictEqual(active.activeE, "1 g");
      assert.strictEqual(active.activeEInKg, "0.001");
      assert.strictEqual(active.vernierStepIncrement, "0.0001");
      assert.strictEqual(active.halfIntervalE, "0.0005");
      assert.strictEqual(active.scaleDivisionCountN, 3000);
      assert.strictEqual(active.isOverflow, false);
    });

    it("resolves Range 2 for load 4.5 kg: active e = 2 g, vernier step = 0.2 g", () => {
      const active = getActiveRangeForLoad("4.5 kg", standardDualRanges);
      assert.strictEqual(active.rangeIndex, 2);
      assert.strictEqual(active.activeE, "2 g");
      assert.strictEqual(active.activeEInKg, "0.002");
      assert.strictEqual(active.vernierStepIncrement, "0.0002");
      assert.strictEqual(active.halfIntervalE, "0.001");
      assert.strictEqual(active.scaleDivisionCountN, 3000);
      assert.strictEqual(active.isOverflow, false);
    });

    it("evaluates exact boundary load 3.0 kg to Range 1 (L <= Max1)", () => {
      const active = getActiveRangeForLoad("3.0 kg", standardDualRanges);
      assert.strictEqual(active.rangeIndex, 1);
      assert.strictEqual(active.activeEInKg, "0.001");
    });

    it("evaluates load immediately above boundary (3.001 kg) to Range 2", () => {
      const active = getActiveRangeForLoad("3.001 kg", standardDualRanges);
      assert.strictEqual(active.rangeIndex, 2);
      assert.strictEqual(active.activeEInKg, "0.002");
    });

    it("evaluates zero load to Range 1", () => {
      const active = getActiveRangeForLoad("0 kg", standardDualRanges);
      assert.strictEqual(active.rangeIndex, 1);
      assert.strictEqual(active.activeEInKg, "0.001");
    });
  });

  describe("Three-Range Multi-Interval Scale (e1 < e2 < e3)", () => {
    const tripleRanges: PartialWeighingRange[] = [
      {
        rangeIndex: 1,
        maxCapacity: "1.5 kg",
        verificationIntervalE: "0.5 g",
        actualIntervalD: "0.5 g",
      },
      {
        rangeIndex: 2,
        maxCapacity: "3 kg",
        verificationIntervalE: "1 g",
        actualIntervalD: "1 g",
      },
      {
        rangeIndex: 3,
        maxCapacity: "6 kg",
        verificationIntervalE: "2 g",
        actualIntervalD: "2 g",
      },
    ];

    it("resolves Range 1 for 1.0 kg (e = 0.5 g)", () => {
      const active = getActiveRangeForLoad("1.0 kg", tripleRanges);
      assert.strictEqual(active.rangeIndex, 1);
      assert.strictEqual(active.activeEInKg, "0.0005");
      assert.strictEqual(active.vernierStepIncrement, "0.00005");
    });

    it("resolves Range 2 for 2.0 kg (e = 1 g)", () => {
      const active = getActiveRangeForLoad("2.0 kg", tripleRanges);
      assert.strictEqual(active.rangeIndex, 2);
      assert.strictEqual(active.activeEInKg, "0.001");
      assert.strictEqual(active.vernierStepIncrement, "0.0001");
    });

    it("resolves Range 3 for 5.5 kg (e = 2 g)", () => {
      const active = getActiveRangeForLoad("5.5 kg", tripleRanges);
      assert.strictEqual(active.rangeIndex, 3);
      assert.strictEqual(active.activeEInKg, "0.002");
      assert.strictEqual(active.vernierStepIncrement, "0.0002");
    });
  });

  describe("Validation of Partial Ranges (validatePartialRanges)", () => {
    it("accepts valid dual-range configuration", () => {
      const res = validatePartialRanges(standardDualRanges, { accuracyClass: AccuracyClass.CLASS_III });
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.errors.length, 0);
    });

    it("rejects configuration with fewer than 2 ranges", () => {
      const res = validatePartialRanges([standardDualRanges[0]]);
      assert.strictEqual(res.valid, false);
      assert.match(res.errors[0], /at least 2 partial weighing ranges/i);
    });

    it("rejects non-increasing maximum capacities", () => {
      const invalid = [
        { rangeIndex: 1, maxCapacity: "5 kg", verificationIntervalE: "1 g", actualIntervalD: "1 g" },
        { rangeIndex: 2, maxCapacity: "3 kg", verificationIntervalE: "2 g", actualIntervalD: "2 g" },
      ];
      const res = validatePartialRanges(invalid);
      assert.strictEqual(res.valid, false);
      assert.match(res.errors[0], /must be strictly greater than previous range Max/i);
    });

    it("rejects non-increasing verification intervals (e1 >= e2)", () => {
      const invalid = [
        { rangeIndex: 1, maxCapacity: "3 kg", verificationIntervalE: "2 g", actualIntervalD: "2 g" },
        { rangeIndex: 2, maxCapacity: "6 kg", verificationIntervalE: "1 g", actualIntervalD: "1 g" },
      ];
      const res = validatePartialRanges(invalid);
      assert.strictEqual(res.valid, false);
      assert.match(res.errors[0], /must be strictly greater than previous range e/i);
    });

    it("rejects d > e and e > 10d", () => {
      const invalid = [
        { rangeIndex: 1, maxCapacity: "3 kg", verificationIntervalE: "1 g", actualIntervalD: "2 g" }, // d > e
        { rangeIndex: 2, maxCapacity: "6 kg", verificationIntervalE: "20 g", actualIntervalD: "1 g" }, // e > 10d
      ];
      const res = validatePartialRanges(invalid);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => /cannot exceed verification interval/i.test(e)));
      assert.ok(res.errors.some((e) => /exceeds 10 \* d/i.test(e)));
    });

    it("rejects scale division count n outside Table 3 bounds for Class III", () => {
      // For Class III (0.1 g <= e <= 2 g), minN is 100. n = 50 g / 1 g = 50 < 100
      const invalid = [
        { rangeIndex: 1, maxCapacity: "0.05 kg", verificationIntervalE: "1 g", actualIntervalD: "1 g" },
        { rangeIndex: 2, maxCapacity: "6 kg", verificationIntervalE: "2 g", actualIntervalD: "2 g" },
      ];
      const res = validatePartialRanges(invalid, { accuracyClass: "III" });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => /is below minimum allowed 100/i.test(e)));
    });
  });

  describe("Dynamic Multi-Interval MPE (getMultiIntervalMpe)", () => {
    it("computes Table 6 MPE for Range 1 load (2 kg, e = 1 g -> m = 2000e -> MPE = ±1.0e = ±1.0 g)", () => {
      const mpeResult = getMultiIntervalMpe("2 kg", standardDualRanges, AccuracyClass.CLASS_III);
      assert.strictEqual(mpeResult.activeRange.rangeIndex, 1);
      assert.strictEqual(mpeResult.activeRange.activeEInKg, "0.001");
      assert.strictEqual(mpeResult.mInDivisions, "2000");
      assert.strictEqual(mpeResult.mpeInE, "1.0");
      assert.strictEqual(mpeResult.mpeInMass, "0.001"); // ±1.0 g
    });

    it("computes Table 6 MPE for Range 2 load (5 kg, e = 2 g -> m = 2500e -> MPE = ±1.5e = ±3.0 g)", () => {
      const mpeResult = getMultiIntervalMpe("5 kg", standardDualRanges, AccuracyClass.CLASS_III);
      assert.strictEqual(mpeResult.activeRange.rangeIndex, 2);
      assert.strictEqual(mpeResult.activeRange.activeEInKg, "0.002");
      assert.strictEqual(mpeResult.mInDivisions, "2500");
      assert.strictEqual(mpeResult.mpeInE, "1.5");
      assert.strictEqual(mpeResult.mpeInMass, "0.003"); // ±3.0 g
    });
  });

  describe("Multi-Interval Vernier Observation (calculateMultiIntervalObservation)", () => {
    it("calculates P, E and verifies 0.1e step for Range 1 (2 kg, I=2.000 kg, deltaL=0.4 g)", () => {
      const obs = calculateMultiIntervalObservation({
        loadMassL: "2 kg",
        indicatedI: "2.000 kg",
        deltaL: "0.0004 kg", // 4 * 0.1 g (multiple of 0.1e1)
        partialRanges: standardDualRanges,
      });

      assert.strictEqual(obs.activeRange.rangeIndex, 1);
      // P = 2.000 + 0.5 * 0.001 - 0.0004 = 2.000 + 0.0005 - 0.0004 = 2.0001 kg
      assert.strictEqual(obs.indicatedP, "2.0001");
      // E = P - L = 2.0001 - 2.000 = +0.0001 kg (+0.1 g)
      assert.strictEqual(obs.rawErrorE, "0.0001");
      assert.strictEqual(obs.isVernierStepValid, true);
    });

    it("calculates P, E and verifies 0.1e step for Range 2 (5 kg, I=5.000 kg, deltaL=0.6 g)", () => {
      const obs = calculateMultiIntervalObservation({
        loadMassL: "5 kg",
        indicatedI: "5.000 kg",
        deltaL: "0.0006 kg", // 3 * 0.2 g (multiple of 0.1e2)
        partialRanges: standardDualRanges,
      });

      assert.strictEqual(obs.activeRange.rangeIndex, 2);
      // P = 5.000 + 0.5 * 0.002 - 0.0006 = 5.000 + 0.001 - 0.0006 = 5.0004 kg
      assert.strictEqual(obs.indicatedP, "5.0004");
      // E = P - L = 5.0004 - 5.000 = +0.0004 kg (+0.4 g)
      assert.strictEqual(obs.rawErrorE, "0.0004");
      assert.strictEqual(obs.isVernierStepValid, true);
    });

    it("flags non-standard Vernier weight step not matching 0.1e", () => {
      // In Range 2, e2 = 2 g so step is 0.2 g. An increment of 0.15 g is invalid.
      const obs = calculateMultiIntervalObservation({
        loadMassL: "5 kg",
        indicatedI: "5.000 kg",
        deltaL: "0.00015 kg", // 0.15 g, not multiple of 0.2 g
        partialRanges: standardDualRanges,
      });

      assert.strictEqual(obs.activeRange.rangeIndex, 2);
      assert.strictEqual(obs.isVernierStepValid, false);
    });
  });

  describe("Directional Sticky Unloading Mode & Overflow", () => {
    it("maintains Range 2 during decreasing load if stickyDecreasing is active", () => {
      const active = getActiveRangeForLoad("2 kg", standardDualRanges, {
        direction: "decreasing",
        stickyDecreasing: true,
        previousRangeIndex: 2,
      });

      assert.strictEqual(active.rangeIndex, 2);
      assert.strictEqual(active.activeEInKg, "0.002");
    });

    it("resets to Range 1 when decreasing load reaches 0 kg even with stickyDecreasing", () => {
      const active = getActiveRangeForLoad("0 kg", standardDualRanges, {
        direction: "decreasing",
        stickyDecreasing: true,
        previousRangeIndex: 2,
      });

      assert.strictEqual(active.rangeIndex, 1);
      assert.strictEqual(active.activeEInKg, "0.001");
    });

    it("flags overflow when load exceeds highest range max capacity", () => {
      const active = getActiveRangeForLoad("7 kg", standardDualRanges);
      assert.strictEqual(active.rangeIndex, 2);
      assert.strictEqual(active.isOverflow, true);
    });

    it("throws error when strictOverflow is enabled and load exceeds max", () => {
      assert.throws(
        () => getActiveRangeForLoad("7 kg", standardDualRanges, { strictOverflow: true }),
        /exceeds maximum capacity/i,
      );
    });

    it("throws error when partialRanges array is empty", () => {
      assert.throws(() => getActiveRangeForLoad("2 kg", []), /at least one partial weighing range/i);
    });
  });
});
