import { test, describe } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import {
  RulePackSchema,
  validateRulePack,
  safeValidateRulePack,
  loadRulePack,
  loadDefaultRulePack,
  getDefaultRulePackPath,
} from "./loader.js";
import oimlRulePackJson from "./rules/oiml-r76-2006-v1.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("TASK-010: Rule Pack Zod Validator & Loader (loader.ts)", () => {
  test("validates bundled OIML R-76 rule pack via validateRulePack()", () => {
    const validated = validateRulePack(oimlRulePackJson);
    assert.equal(validated.id, "oiml-r76-2006-v1");
    assert.equal(validated.standard, "OIML R 76-1:2006");
    assert.equal(validated.table3Classification.III.length, 2);
    assert.equal(validated.table6MpeBrackets.initialVerification.III.length, 3);
  });

  test("safeValidateRulePack returns success: true for valid rule pack", () => {
    const result = safeValidateRulePack(oimlRulePackJson);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.id, "oiml-r76-2006-v1");
    }
  });

  test("loadRulePack() loads and validates JSON from disk path", () => {
    const defaultPath = getDefaultRulePackPath();
    const pack = loadRulePack(defaultPath);
    assert.equal(pack.id, "oiml-r76-2006-v1");
    assert.equal(pack.issuingBody, "OIML");
    assert.equal(pack.metrologicalRules.nabl129MaxUncertaintyToMpeRatio, "0.33333333");
  });

  test("loadDefaultRulePack() loads the default OIML R-76 rule pack", () => {
    const defaultPack = loadDefaultRulePack();
    assert.equal(defaultPack.id, "oiml-r76-2006-v1");
    assert.equal(defaultPack.environmentalConstraints.maxTemperatureDriftRateCPerHour, 5.0);
  });

  test("throws error when loading non-existent rule pack path", () => {
    assert.throws(
      () => loadRulePack("/non/existent/path/rule-pack.json"),
      /Rule pack file not found/,
    );
  });

  test("throws ZodError on invalid or missing schema properties", () => {
    const invalidPack = {
      id: "invalid-pack",
      standard: "OIML",
      // Missing title, version, effectiveFrom, table3Classification, etc.
    };

    assert.throws(
      () => validateRulePack(invalidPack),
      (err) => err instanceof ZodError,
    );

    const safeResult = safeValidateRulePack(invalidPack);
    assert.equal(safeResult.success, false);
  });

  test("rejects invalid Table 3 classification limits", () => {
    const corrupted = structuredClone(oimlRulePackJson) as any;
    corrupted.table3Classification.III[0].minVerificationScaleDivisionsN = -100; // negative number

    assert.throws(
      () => validateRulePack(corrupted),
      (err) => err instanceof ZodError,
    );
  });

  test("rejects invalid Table 6 MPE brackets", () => {
    const corrupted = structuredClone(oimlRulePackJson) as any;
    corrupted.table6MpeBrackets.initialVerification.I[0].minMInDivisions = -5; // negative

    assert.throws(
      () => validateRulePack(corrupted),
      (err) => err instanceof ZodError,
    );
  });
});
