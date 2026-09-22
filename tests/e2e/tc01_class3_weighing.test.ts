import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  AccuracyClass,
  ComplianceStatus,
} from "@maanak/types";
import {
  calculateIndicationP,
  calculateRawErrorE,
  calculateCorrectedErrorEc,
  evaluateObservationCompliance,
  getMpe,
  classifyInstrument,
  evaluateForm1Weighing,
  toDecimal,
} from "@maanak/rules-engine";
import {
  generateProvenanceNode,
  GENESIS_PREV_HASH,
  verifyNodeHash,
} from "@maanak/crypto-provenance";

describe("TASK-059: Ground Truth Verification TC-01: Standard Class III Weighing Performance", () => {
  const SCALE_SPEC = {
    manufacturer: "Essae-Teraoka Ltd.",
    model: "DS-215 Commercial Platform",
    serialNumber: "SN-2026-ES-00984",
    accuracyClass: AccuracyClass.CLASS_III,
    maxCapacity: "15.000 kg",
    e: "0.005 kg", // 5 g verification interval
    d: "0.005 kg",
    unit: "kg",
  };

  describe("1. NAWI Classification (OIML R-76 Table 3)", () => {
    test("verifies Class III instrument parameters (Max = 15 kg, e = 5 g -> n = 3,000 divisions)", () => {
      const classification = classifyInstrument(
        "15 kg",
        "0.005 kg",
        "0.005 kg",
        AccuracyClass.CLASS_III,
        { minCapacity: "0.1 kg" }
      );

      assert.strictEqual(classification.valid, true);
      assert.strictEqual(classification.n, 3000);
      assert.strictEqual(classification.accuracyClass, AccuracyClass.CLASS_III);
      assert.strictEqual(classification.errorReason, undefined);
    });
  });

  describe("2. Ground Truth Dataset (Adobe Scan p. 2 / Clause A.4.4)", () => {
    // Official TC-01 Observations
    const tc01Steps = [
      {
        stepNumber: 0,
        loadMass: "0.000",
        indicatedValue: "0.000",
        deltaL: "0.0025",
        expectedP: "0.0000",
        expectedE: "0.0000",
        expectedEc: "0.0000",
        expectedMpe: "0.0025", // ±0.5e
        direction: "ASCENDING",
      },
      {
        stepNumber: 1,
        loadMass: "2.500", // 500e
        indicatedValue: "2.500",
        deltaL: "0.0020",
        expectedP: "2.5005",
        expectedE: "0.0005",
        expectedEc: "0.0005", // +0.5 g
        expectedMpe: "0.0025", // ±0.5e
        direction: "ASCENDING",
      },
      {
        stepNumber: 2,
        loadMass: "10.000", // 2000e
        indicatedValue: "10.000",
        deltaL: "0.0015",
        expectedP: "10.0010",
        expectedE: "0.0010",
        expectedEc: "0.0010", // +1.0 g
        expectedMpe: "0.0050", // ±1.0e
        direction: "ASCENDING",
      },
      {
        stepNumber: 3,
        loadMass: "15.000", // Max (3000e)
        indicatedValue: "15.000",
        deltaL: "0.0010",
        expectedP: "15.0015",
        expectedE: "0.0015",
        expectedEc: "0.0015", // +1.5 g
        expectedMpe: "0.0075", // ±1.5e
        direction: "ASCENDING",
      },
      {
        stepNumber: 4,
        loadMass: "10.000",
        indicatedValue: "10.000",
        deltaL: "0.0018",
        expectedP: "10.0007",
        expectedE: "0.0007",
        expectedEc: "0.0007", // +0.7 g
        expectedMpe: "0.0050", // ±1.0e
        direction: "DESCENDING",
      },
      {
        stepNumber: 5,
        loadMass: "2.500",
        indicatedValue: "2.500",
        deltaL: "0.0022",
        expectedP: "2.5003",
        expectedE: "0.0003",
        expectedEc: "0.0003", // +0.3 g
        expectedMpe: "0.0025", // ±0.5e
        direction: "DESCENDING",
      },
      {
        stepNumber: 6,
        loadMass: "0.000",
        indicatedValue: "0.000",
        deltaL: "0.0025",
        expectedP: "0.0000",
        expectedE: "0.0000",
        expectedEc: "0.0000", // 0.0 g zero return
        expectedMpe: "0.0025",
        direction: "DESCENDING",
      },
    ];

    test("verifies Step #0 (Zero Load): L=0, I=0, deltaL=0.0025 -> E0 = 0.0000 kg", () => {
      const step = tc01Steps[0];
      const P = calculateIndicationP(
        step.indicatedValue,
        step.deltaL,
        SCALE_SPEC.e
      );
      assert.strictEqual(P.toFixed(4), step.expectedP);

      const E = calculateRawErrorE(P, step.loadMass);
      assert.strictEqual(E.toFixed(4), step.expectedE);

      const Ec = calculateCorrectedErrorEc(E, "0");
      assert.strictEqual(Ec.toFixed(4), step.expectedEc);
    });

    test("verifies Step #1 (500e, 2.5 kg): L=2.5, I=2.500, deltaL=0.0020 -> P=2.5005, Ec=+0.5 g <= ±2.5 g (PASS)", () => {
      const step = tc01Steps[1];
      const P = calculateIndicationP(
        step.indicatedValue,
        step.deltaL,
        SCALE_SPEC.e
      );
      assert.strictEqual(P.toFixed(4), step.expectedP);

      const E = calculateRawErrorE(P, step.loadMass);
      assert.strictEqual(E.toFixed(4), step.expectedE);

      const Ec = calculateCorrectedErrorEc(E, "0");
      assert.strictEqual(Ec.toFixed(4), step.expectedEc);

      const mpe = getMpe(
        step.loadMass,
        SCALE_SPEC.e,
        AccuracyClass.CLASS_III
      );
      assert.strictEqual(mpe.mpeInMass, step.expectedMpe);

      const compliance = evaluateObservationCompliance({
        indicatedI: step.indicatedValue,
        deltaL: step.deltaL,
        loadMassL: step.loadMass,
        zeroErrorE0: "0",
        e: SCALE_SPEC.e,
        accuracyClass: AccuracyClass.CLASS_III,
        unit: "kg",
      });

      assert.strictEqual(compliance.pass, true);
      assert.strictEqual(compliance.status, ComplianceStatus.PASS);
      assert.strictEqual(toDecimal(compliance.correctedErrorEc).toFixed(4), step.expectedEc);
      assert.strictEqual(toDecimal(compliance.mpeInMass).toFixed(4), step.expectedMpe);
    });

    test("verifies Step #2 (2000e, 10.0 kg): L=10.0, I=10.000, deltaL=0.0015 -> P=10.0010, Ec=+1.0 g <= ±5.0 g (PASS)", () => {
      const step = tc01Steps[2];
      const P = calculateIndicationP(
        step.indicatedValue,
        step.deltaL,
        SCALE_SPEC.e
      );
      assert.strictEqual(P.toFixed(4), step.expectedP);

      const compliance = evaluateObservationCompliance({
        indicatedI: step.indicatedValue,
        deltaL: step.deltaL,
        loadMassL: step.loadMass,
        zeroErrorE0: "0",
        e: SCALE_SPEC.e,
        accuracyClass: AccuracyClass.CLASS_III,
        unit: "kg",
      });

      assert.strictEqual(compliance.pass, true);
      assert.strictEqual(compliance.status, ComplianceStatus.PASS);
      assert.strictEqual(toDecimal(compliance.correctedErrorEc).toFixed(4), step.expectedEc);
      assert.strictEqual(toDecimal(compliance.mpeInMass).toFixed(4), step.expectedMpe);
    });

    test("verifies Step #3 (Max, 15.0 kg): L=15.0, I=15.000, deltaL=0.0010 -> P=15.0015, Ec=+1.5 g <= ±7.5 g (PASS)", () => {
      const step = tc01Steps[3];
      const P = calculateIndicationP(
        step.indicatedValue,
        step.deltaL,
        SCALE_SPEC.e
      );
      assert.strictEqual(P.toFixed(4), step.expectedP);

      const compliance = evaluateObservationCompliance({
        indicatedI: step.indicatedValue,
        deltaL: step.deltaL,
        loadMassL: step.loadMass,
        zeroErrorE0: "0",
        e: SCALE_SPEC.e,
        accuracyClass: AccuracyClass.CLASS_III,
        unit: "kg",
      });

      assert.strictEqual(compliance.pass, true);
      assert.strictEqual(compliance.status, ComplianceStatus.PASS);
      assert.strictEqual(toDecimal(compliance.correctedErrorEc).toFixed(4), step.expectedEc);
      assert.strictEqual(toDecimal(compliance.mpeInMass).toFixed(4), step.expectedMpe);
    });
  });

  describe("3. Official OIML R 76-2 Form 1 Weighing Performance Evaluation", () => {
    test("executes complete Form 1 battery (ascending, descending, hysteresis, zero return) with 100% compliance", () => {
      const result = evaluateForm1Weighing(
        {
          ascending: [
            { loadMass: "2.500", indicatedValue: "2.500", turningPointDeltaL: "0.0020" },
            { loadMass: "10.000", indicatedValue: "10.000", turningPointDeltaL: "0.0015" },
            { loadMass: "15.000", indicatedValue: "15.000", turningPointDeltaL: "0.0010" },
          ],
          descending: [
            { loadMass: "10.000", indicatedValue: "10.000", turningPointDeltaL: "0.0018" },
            { loadMass: "2.500", indicatedValue: "2.500", turningPointDeltaL: "0.0022" },
          ],
          zeroObservation: { indicatedValue: "0.000", turningPointDeltaL: "0.0025" },
          endZeroObservation: { indicatedValue: "0.000", turningPointDeltaL: "0.0025" },
        },
        {
          accuracyClass: AccuracyClass.CLASS_III,
          e: "0.005 kg",
        }
      );

      // Overall Form 1 outcome
      assert.strictEqual(result.pass, true);
      assert.strictEqual(result.status, ComplianceStatus.PASS);
      assert.strictEqual(result.zeroErrorE0, "0");

      // Hysteresis error check (|E_asc - E_desc| <= |MPE|)
      assert.ok(result.hysteresisSteps.length >= 2);
      for (const hyst of result.hysteresisSteps) {
        assert.strictEqual(hyst.pass, true);
        assert.ok(Number(hyst.hysteresisError) <= Number(hyst.mpeInMass));
      }

      // Return to zero verification (drift <= 0.5e)
      assert.ok(result.endZeroStep);
      assert.strictEqual(result.endZeroStep.pass, true);
      assert.strictEqual(result.endZeroStep.zeroDrift, "0");
    });
  });

  describe("4. WELMEC 7.2 Cryptographic Provenance Chaining for TC-01", () => {
    test("generates unbroken SHA-256 hash chain linking all TC-01 observation steps", () => {
      const genesisNode = generateProvenanceNode({
        testSessionId: "TS-2026-TC01",
        nodeSequence: 0,
        nodeType: "SESSION_INIT",
        payload: {
          sessionId: "TS-2026-TC01",
          instrumentModel: SCALE_SPEC.model,
          inspectorId: "INSP-04-VERMA",
        },
      });

      assert.strictEqual(genesisNode.nodeSequence, 0);
      assert.strictEqual(genesisNode.previousNodeHashSha256, GENESIS_PREV_HASH);
      assert.strictEqual(genesisNode.currentNodeHashSha256.length, 64);
      assert.ok(
        verifyNodeHash(genesisNode, {
          sessionId: "TS-2026-TC01",
          instrumentModel: SCALE_SPEC.model,
          inspectorId: "INSP-04-VERMA",
        })
      );

      let prevHash = genesisNode.currentNodeHashSha256;

      // Chain 4 test steps
      const testLoads = ["2.500", "10.000", "15.000", "0.000"];
      testLoads.forEach((load, idx) => {
        const payload = {
          step: idx + 1,
          loadMass: load,
          indicatedValue: load,
          correctedErrorEc: "0.0005",
          compliance: "PASS",
        };

        const node = generateProvenanceNode({
          testSessionId: "TS-2026-TC01",
          nodeSequence: idx + 1,
          nodeType: "OBSERVATION_LOG",
          previousNodeHashSha256: prevHash,
          payload,
        });

        assert.strictEqual(node.nodeSequence, idx + 1);
        assert.strictEqual(node.previousNodeHashSha256, prevHash);
        assert.strictEqual(node.currentNodeHashSha256.length, 64);
        assert.notStrictEqual(node.currentNodeHashSha256, prevHash);
        assert.ok(verifyNodeHash(node, payload));

        prevHash = node.currentNodeHashSha256;
      });
    });
  });
});
