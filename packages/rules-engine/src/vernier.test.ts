import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateIndicationP,
  calculateIndicationPString,
  calculateRawErrorE,
  calculateRawErrorEString,
  calculateVernierObservation,
} from "./vernier.js";

describe("TASK-015: Vernier Turning Point Indication Calculator (vernier.ts)", () => {
  describe("TC-01 Acceptance Criteria", () => {
    test("TC-01 Load 1 (2.5 kg, 500e): I=2.500 kg, e=0.005 kg, deltaL=0.0020 kg -> P=2.5005 kg, E=+0.0005 kg (+0.5 g)", () => {
      const p = calculateIndicationP("2.500", "0.0020", "0.005");
      assert.equal(p.toString(), "2.5005");

      const pStr = calculateIndicationPString("2.500", "0.0020", "0.005");
      assert.equal(pStr, "2.5005");

      const e = calculateRawErrorE(p, "2.5");
      assert.equal(e.toString(), "0.0005");

      const eStr = calculateRawErrorEString("2.5005", "2.500");
      assert.equal(eStr, "0.0005");
    });

    test("TC-01 Zero Load: L=0 kg, I=0 kg, deltaL=0.0025 kg -> P=0.0000 kg, E=0.0000 kg", () => {
      const obs = calculateVernierObservation("0", "0.0025", "0", "0.005");
      assert.equal(obs.indicatedP, "0");
      assert.equal(obs.rawErrorE, "0");
      assert.equal(obs.rawErrorEInG, "0");
      assert.equal(obs.rawErrorEInDivisions, "0");
    });

    test("TC-01 10 kg (2000e): L=10 kg, I=10.000, deltaL=0.0015 kg -> P=10.0010 kg, E=+0.0010 kg (+1.0 g)", () => {
      const obs = calculateVernierObservation("10.000", "0.0015", "10.000", "0.005");
      assert.equal(obs.indicatedP, "10.001");
      assert.equal(obs.rawErrorE, "0.001");
      assert.equal(obs.rawErrorEInG, "1");
      assert.equal(obs.rawErrorEInDivisions, "0.2");
    });

    test("TC-01 15 kg Max: L=15 kg, I=15.000, deltaL=0.0010 kg -> P=15.0015 kg, E=+0.0015 kg (+1.5 g)", () => {
      const obs = calculateVernierObservation("15.000", "0.0010", "15.000", "0.005");
      assert.equal(obs.indicatedP, "15.0015");
      assert.equal(obs.rawErrorE, "0.0015");
      assert.equal(obs.rawErrorEInG, "1.5");
      assert.equal(obs.rawErrorEInDivisions, "0.3");
    });
  });

  describe("Mixed Units Support", () => {
    test("handles string inputs with explicit units (kg and g)", () => {
      // I = 2.500 kg, deltaL = 2.0 g = 0.002 kg, e = 5 g = 0.005 kg
      const p = calculateIndicationP("2.500 kg", "2.0 g", "5 g");
      assert.equal(p.toString(), "2.5005");

      const e = calculateRawErrorE(p, "2500 g");
      assert.equal(e.toString(), "0.0005");
    });

    test("computes negative raw error E when deltaL exceeds 0.5e", () => {
      // I = 5.000 kg, deltaL = 0.0035 kg (> 0.0025 kg), e = 0.005 kg -> P = 5.000 + 0.0025 - 0.0035 = 4.9990 kg
      const obs = calculateVernierObservation("5.000", "0.0035", "5.000", "0.005");
      assert.equal(obs.indicatedP, "4.999");
      assert.equal(obs.rawErrorE, "-0.001");
      assert.equal(obs.rawErrorEInG, "-1");
      assert.equal(obs.rawErrorEInDivisions, "-0.2");
    });
  });
});
