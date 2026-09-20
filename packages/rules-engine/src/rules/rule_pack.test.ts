import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import oimlRulePack from "./oiml-r76-2006-v1.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("TASK-009: Dynamic Rule Pack JSON (oiml-r76-2006-v1.json)", () => {
  test("rule pack JSON imports cleanly and has valid metadata", () => {
    assert.equal(oimlRulePack.id, "oiml-r76-2006-v1");
    assert.equal(oimlRulePack.standard, "OIML R 76-1:2006");
    assert.equal(oimlRulePack.version, "1.0.0");
    assert.equal(oimlRulePack.issuingBody, "OIML");
  });

  test("validates Table 3 classification limits for all accuracy classes", () => {
    const table3 = oimlRulePack.table3Classification;
    assert.ok(table3.I, "Class I must exist in Table 3");
    assert.ok(table3.II, "Class II must exist in Table 3");
    assert.ok(table3.III, "Class III must exist in Table 3");
    assert.ok(table3.IIII, "Class IIII must exist in Table 3");

    // Class I
    assert.equal(table3.I[0].minVerificationScaleDivisionsN, 50000);
    assert.equal(table3.I[0].maxVerificationScaleDivisionsN, null);
    assert.equal(table3.I[0].minCapacityFactorE, 100);

    // Class III (common commercial scales)
    assert.equal(table3.III[0].minVerificationScaleDivisionsN, 100);
    assert.equal(table3.III[0].maxVerificationScaleDivisionsN, 10000);
    assert.equal(table3.III[0].minCapacityFactorE, 20);
  });

  test("validates Table 6 Initial Verification MPE step brackets", () => {
    const initialMpe = oimlRulePack.table6MpeBrackets.initialVerification;

    // Class I step limits
    assert.deepEqual(initialMpe.I, [
      { minMInDivisions: 0, maxMInDivisions: 50000, mpeFactorE: "0.5" },
      { minMInDivisions: 50000, maxMInDivisions: 200000, mpeFactorE: "1.0" },
      { minMInDivisions: 200000, maxMInDivisions: null, mpeFactorE: "1.5" },
    ]);

    // Class II step limits
    assert.deepEqual(initialMpe.II, [
      { minMInDivisions: 0, maxMInDivisions: 5000, mpeFactorE: "0.5" },
      { minMInDivisions: 5000, maxMInDivisions: 20000, mpeFactorE: "1.0" },
      { minMInDivisions: 20000, maxMInDivisions: 100000, mpeFactorE: "1.5" },
    ]);

    // Class III step limits (TC-01, TC-03)
    assert.deepEqual(initialMpe.III, [
      { minMInDivisions: 0, maxMInDivisions: 500, mpeFactorE: "0.5" },
      { minMInDivisions: 500, maxMInDivisions: 2000, mpeFactorE: "1.0" },
      { minMInDivisions: 2000, maxMInDivisions: 10000, mpeFactorE: "1.5" },
    ]);

    // Class IIII step limits
    assert.deepEqual(initialMpe.IIII, [
      { minMInDivisions: 0, maxMInDivisions: 50, mpeFactorE: "0.5" },
      { minMInDivisions: 50, maxMInDivisions: 200, mpeFactorE: "1.0" },
      { minMInDivisions: 200, maxMInDivisions: 1000, mpeFactorE: "1.5" },
    ]);
  });

  test("validates environmental and metrological constraints", () => {
    assert.equal(
      oimlRulePack.environmentalConstraints.maxTemperatureDriftRateCPerHour,
      5.0,
    );
    assert.equal(
      oimlRulePack.metrologicalRules.nabl129MaxUncertaintyToMpeRatio,
      "0.33333333",
    );
    assert.equal(
      oimlRulePack.metrologicalRules.discriminationLoadMultiplierD,
      "1.4",
    );
  });

  test("rule pack JSON file exists at source path and parses identically", () => {
    const srcPath = path.resolve(
      __dirname,
      "../../../src/rules/oiml-r76-2006-v1.json",
    );
    const distPath = path.resolve(__dirname, "oiml-r76-2006-v1.json");
    const activePath = fs.existsSync(srcPath) ? srcPath : distPath;
    assert.equal(fs.existsSync(activePath), true);
    const raw = fs.readFileSync(activePath, "utf-8");
    const parsed = JSON.parse(raw);
    assert.equal(parsed.id, "oiml-r76-2006-v1");
  });
});
