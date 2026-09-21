import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  toDecimal,
  add,
  sub,
  mul,
  div,
  abs,
  neg,
  absDiff,
  min,
  max,
  eq,
  lt,
  lte,
  gt,
  gte,
  toFixed,
  roundToScale,
} from "./math.js";

describe("TASK-014: Arbitrary-Precision Math Wrapper (math.ts)", () => {
  describe("IEEE 754 Floating-Point Precision Elimination", () => {
    test("0.1 + 0.2 === 0.3 exactly without IEEE 754 rounding error (0.30000000000000004)", () => {
      // In native JS: 0.1 + 0.2 === 0.30000000000000004 (false for === 0.3)
      const nativeJsSum = 0.1 + 0.2;
      assert.notEqual(nativeJsSum.toString(), "0.3");

      // With Decimal math wrapper
      const decimalSum = add("0.1", "0.2");
      assert.equal(decimalSum.toString(), "0.3");
      assert.equal(toFixed(decimalSum), "0.3");
      assert.equal(eq(decimalSum, "0.3"), true);
    });

    test("1.0 - 0.9 === 0.1 exactly without floating point drift", () => {
      const result = sub("1.0", "0.9");
      assert.equal(result.toString(), "0.1");
      assert.equal(eq(result, "0.1"), true);
    });
  });

  describe("Arithmetic Operations", () => {
    test("add() sums multiple operands correctly", () => {
      const sum = add("0.1", "0.2", "0.3", "0.4");
      assert.equal(sum.toString(), "1");
    });

    test("sub() subtracts correctly", () => {
      const result = sub("15.0005", "15");
      assert.equal(result.toString(), "0.0005");
    });

    test("mul() multiplies multiple operands accurately", () => {
      const result = mul("0.005", "3000");
      assert.equal(result.toString(), "15");

      const multi = mul("2", "3", "4");
      assert.equal(multi.toString(), "24");
    });

    test("div() divides accurately", () => {
      const result = div("15", "0.005");
      assert.equal(result.toString(), "3000");
    });

    test("div() throws on division by zero", () => {
      assert.throws(() => div("15", "0"), /Division by zero/);
    });
  });

  describe("Absolute Values, Extremes & Comparisons", () => {
    test("abs() and neg() function accurately", () => {
      assert.equal(abs("-0.005").toString(), "0.005");
      assert.equal(abs("0.005").toString(), "0.005");
      assert.equal(neg("0.005").toString(), "-0.005");
      assert.equal(neg("-0.005").toString(), "0.005");
    });

    test("absDiff() computes absolute difference |a - b|", () => {
      assert.equal(absDiff("10.005", "10.002").toString(), "0.003");
      assert.equal(absDiff("10.002", "10.005").toString(), "0.003");
    });

    test("min() and max() calculate extremes among multiple values", () => {
      assert.equal(min("5.2", "2.1", "8.9", "1.4").toString(), "1.4");
      assert.equal(max("5.2", "2.1", "8.9", "1.4").toString(), "8.9");
    });

    test("comparison operators eq, lt, lte, gt, gte work reliably", () => {
      assert.equal(eq("5.00", "5"), true);
      assert.equal(lt("4.99", "5.00"), true);
      assert.equal(lt("5.00", "4.99"), false);
      assert.equal(lte("5.00", "5.00"), true);
      assert.equal(gt("5.01", "5.00"), true);
      assert.equal(gte("5.00", "5.00"), true);
    });
  });

  describe("Formatting & Scale Rounding", () => {
    test("toFixed() outputs non-scientific decimal representations", () => {
      const smallVal = toDecimal("0.0000005");
      assert.equal(toFixed(smallVal), "0.0000005");
      assert.equal(toFixed(smallVal, 8), "0.00000050");
    });

    test("roundToScale() rounds to nearest scale division multiple", () => {
      // Scale interval e = 0.005
      assert.equal(roundToScale("100.002", "0.005").toString(), "100");
      assert.equal(roundToScale("100.003", "0.005").toString(), "100.005");
      assert.equal(roundToScale("100.007", "0.005").toString(), "100.005");
      assert.equal(roundToScale("100.008", "0.005").toString(), "100.01");
    });
  });
});
