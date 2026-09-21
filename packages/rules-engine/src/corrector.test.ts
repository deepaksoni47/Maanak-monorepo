import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { AccuracyClass, ComplianceStatus } from "@maanak/types";
import {
  calculateCorrectedErrorEc,
  calculateCorrectedErrorEcString,
  evaluateCompliance,
  evaluateObservationCompliance,
} from "./corrector.js";

describe("TASK-016: Corrected Error & Compliance Evaluator (corrector.ts)", () => {
  describe("calculateCorrectedErrorEc (Ec = E - E0)", () => {
    test("calculates Ec accurately when E0 = 0", () => {
      const ec = calculateCorrectedErrorEc("0.0005", "0");
      assert.equal(ec.toString(), "0.0005");

      const ecStr = calculateCorrectedErrorEcString("0.0005", "0");
      assert.equal(ecStr, "0.0005");
    });

    test("corrects for non-zero tare/zero error E0", () => {
      // E = +0.0015 kg, E0 = +0.0005 kg -> Ec = +0.0010 kg
      const ec = calculateCorrectedErrorEc("0.0015", "0.0005");
      assert.equal(ec.toString(), "0.001");
    });

    test("handles negative raw errors and negative zero offsets", () => {
      // E = -0.0010 kg, E0 = -0.0005 kg -> Ec = -0.0010 - (-0.0005) = -0.0005 kg
      const ec = calculateCorrectedErrorEc("-0.0010", "-0.0005");
      assert.equal(ec.toString(), "-0.0005");
    });
  });

  describe("evaluateCompliance (|Ec| <= MPE)", () => {
    test("PASS: Ec is strictly within MPE limit", () => {
      const result = evaluateCompliance("0.0020", "0.0025");
      assert.equal(result.pass, true);
      assert.equal(result.status, ComplianceStatus.PASS);
      assert.equal(result.margin, "0.0005");
      assert.equal(result.percentageOfMpe, "80.00%");
    });

    test("PASS: Ec equals exact boundary of MPE limit", () => {
      const result = evaluateCompliance("0.0025", "0.0025");
      assert.equal(result.pass, true);
      assert.equal(result.status, ComplianceStatus.PASS);
      assert.equal(result.margin, "0");
      assert.equal(result.percentageOfMpe, "100.00%");
    });

    test("PASS: Negative Ec within MPE limit", () => {
      const result = evaluateCompliance("-0.0020", "0.0025");
      assert.equal(result.pass, true);
      assert.equal(result.status, ComplianceStatus.PASS);
      assert.equal(result.margin, "0.0005");
    });

    test("FAIL: Ec strictly exceeds MPE limit", () => {
      const result = evaluateCompliance("0.0030", "0.0025");
      assert.equal(result.pass, false);
      assert.equal(result.status, ComplianceStatus.FAIL);
      assert.equal(result.margin, "-0.0005");
      assert.equal(result.percentageOfMpe, "120.00%");
    });

    test("FAIL: Negative Ec exceeds MPE limit", () => {
      const result = evaluateCompliance("-0.0030", "0.0025");
      assert.equal(result.pass, false);
      assert.equal(result.status, ComplianceStatus.FAIL);
      assert.equal(result.margin, "-0.0005");
    });
  });

  describe("evaluateObservationCompliance (Full TC-01 Pipeline)", () => {
    test("TC-01 Zero Step: L=0, I=0, deltaL=0.0025, e=0.005 -> Ec=0 kg <= MPE -> PASS", () => {
      const res = evaluateObservationCompliance({
        loadMassL: "0",
        indicatedI: "0",
        deltaL: "0.0025",
        zeroErrorE0: "0",
        e: "0.005",
        accuracyClass: AccuracyClass.CLASS_III,
      });

      assert.equal(res.indicatedP, "0");
      assert.equal(res.rawErrorE, "0");
      assert.equal(res.correctedErrorEc, "0");
      assert.equal(res.pass, true);
      assert.equal(res.status, ComplianceStatus.PASS);
    });

    test("TC-01 500e (2.5 kg): L=2.5 kg, I=2.500, deltaL=0.0020, e=0.005 -> Ec=+0.5 g <= ±2.5 g -> PASS", () => {
      const res = evaluateObservationCompliance({
        loadMassL: "2.5",
        indicatedI: "2.500",
        deltaL: "0.0020",
        zeroErrorE0: "0",
        e: "0.005",
        accuracyClass: AccuracyClass.CLASS_III,
      });

      assert.equal(res.indicatedP, "2.5005");
      assert.equal(res.rawErrorE, "0.0005");
      assert.equal(res.correctedErrorEc, "0.0005");
      assert.equal(res.correctedErrorEcInG, "0.5");
      assert.equal(res.mpeInMass, "0.0025"); // 2.5 g
      assert.equal(res.mpeInE, "0.5");
      assert.equal(res.pass, true);
      assert.equal(res.status, ComplianceStatus.PASS);
      assert.equal(res.percentageOfMpe, "20.00%");
    });

    test("TC-01 2000e (10 kg): L=10 kg, I=10.000, deltaL=0.0015, e=0.005 -> Ec=+1.0 g <= ±5.0 g -> PASS", () => {
      const res = evaluateObservationCompliance({
        loadMassL: "10.0",
        indicatedI: "10.000",
        deltaL: "0.0015",
        zeroErrorE0: "0",
        e: "0.005",
        accuracyClass: AccuracyClass.CLASS_III,
      });

      assert.equal(res.indicatedP, "10.001");
      assert.equal(res.rawErrorE, "0.001");
      assert.equal(res.correctedErrorEc, "0.001");
      assert.equal(res.correctedErrorEcInG, "1");
      assert.equal(res.mpeInMass, "0.005"); // 5.0 g
      assert.equal(res.mpeInE, "1.0");
      assert.equal(res.pass, true);
    });

    test("TC-01 Max (15 kg): L=15 kg, I=15.000, deltaL=0.0010, e=0.005 -> Ec=+1.5 g <= ±7.5 g -> PASS", () => {
      const res = evaluateObservationCompliance({
        loadMassL: "15.0",
        indicatedI: "15.000",
        deltaL: "0.0010",
        zeroErrorE0: "0",
        e: "0.005",
        accuracyClass: AccuracyClass.CLASS_III,
      });

      assert.equal(res.indicatedP, "15.0015");
      assert.equal(res.rawErrorE, "0.0015");
      assert.equal(res.correctedErrorEc, "0.0015");
      assert.equal(res.correctedErrorEcInG, "1.5");
      assert.equal(res.mpeInMass, "0.0075"); // 7.5 g
      assert.equal(res.mpeInE, "1.5");
      assert.equal(res.pass, true);
    });
  });
});
