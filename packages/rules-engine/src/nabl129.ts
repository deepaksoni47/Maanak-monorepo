import { Decimal } from "decimal.js";
import {
  AccuracyClass,
  UnitOfMeasurement,
  NABLPreCheckResult,
  NABLBatchPreCheckResult,
} from "@maanak/types";
import { RulePack, loadDefaultRulePack } from "./loader.js";
import { parseMass, normalizeAccuracyClass, UNIT_TO_KG_FACTORS } from "./classifier.js";
import { getMpe, GetMpeOptions } from "./mpe.js";

/**
 * Configuration options for NABL 129 / OIML R 76-1 Clause 3.7.1 uncertainty verification.
 */
export interface NABLValidateOptions extends GetMpeOptions {
  uncertaintyUnit?: UnitOfMeasurement;
  weightId?: string;
  weightClass?: string;
  maxUncertaintyRatio?: string | number | Decimal;
  applicableMpe?: string | number | Decimal;
  applicableMpeUnit?: UnitOfMeasurement;
}

/**
 * Input for single weight in batch check.
 */
export interface StandardWeightCheckInput {
  loadMass: string | number | Decimal;
  uncertaintyU: string | number | Decimal;
  weightId?: string;
  weightClass?: string;
  unit?: UnitOfMeasurement;
  applicableMpe?: string | number | Decimal;
}

/**
 * Suggests appropriate OIML R 111 weight class for a given instrument accuracy class.
 */
function getRecommendedWeightClass(normClass: "I" | "II" | "III" | "IIII"): string {
  switch (normClass) {
    case "I":
      return "Class E1 or E2";
    case "II":
      return "Class E2";
    case "III":
      return "Class F1 or F2";
    case "IIII":
      return "Class M1";
    default:
      return "higher accuracy class";
  }
}

/**
 * Validates standard test weight expanded uncertainty against OIML R 76-1 Clause 3.7.1
 * and NABL 129 guidelines.
 *
 * Rule:
 * Expanded uncertainty U (k=2) of standard weights shall not exceed 1/3 of the Maximum
 * Permissible Error (MPE) for the applied load:
 *
 *   U <= (1/3) * |MPE(L)|
 *
 * @param weightUncertaintyU - Expanded uncertainty of reference standard weight(s) (k=2)
 * @param targetLoad - Nominal load point being tested (L)
 * @param e - Verification scale interval of the instrument under test
 * @param accuracyClass - Accuracy class of the instrument under test (I, II, III, IIII)
 * @param optionsOrRulePack - Optional settings (units, rulePack, custom ratio, MPE override, etc.)
 */
export function validateStandardWeightUncertainty(
  weightUncertaintyU: string | number | Decimal,
  targetLoad: string | number | Decimal,
  e: string | number | Decimal,
  accuracyClass:
    | AccuracyClass
    | "I"
    | "II"
    | "III"
    | "IIII"
    | "CLASS_I"
    | "CLASS_II"
    | "CLASS_III"
    | "CLASS_IIII",
  optionsOrRulePack?: NABLValidateOptions | RulePack,
): NABLPreCheckResult {
  // Normalize options vs rulePack
  let options: NABLValidateOptions = {};
  let rulePack: RulePack | undefined;

  if (optionsOrRulePack) {
    if ("table6MpeBrackets" in optionsOrRulePack) {
      rulePack = optionsOrRulePack as RulePack;
      options = { rulePack };
    } else {
      options = optionsOrRulePack as NABLValidateOptions;
      rulePack = options.rulePack;
    }
  }

  const normClass = normalizeAccuracyClass(accuracyClass);

  // 1. Parse e, load, and uncertainty
  const parsedE = parseMass(e, options.eUnit || options.unit || "kg");
  if (parsedE.valueInKg.lte(0)) {
    throw new Error("Verification scale interval (e) must be strictly positive (> 0)");
  }

  const parsedLoad = parseMass(
    targetLoad,
    options.loadUnit || options.unit || parsedE.unit || "kg",
  );

  const baseUnit = options.uncertaintyUnit || options.unit || parsedE.unit || "kg";
  const parsedU = parseMass(
    weightUncertaintyU,
    baseUnit,
  );

  if (parsedU.value.lt(0)) {
    throw new Error("Expanded uncertainty U must be non-negative (>= 0)");
  }

  // 2. Determine applicable MPE
  let mpeInKg: Decimal;
  let mpeDisplayVal: Decimal;

  if (options.applicableMpe !== undefined) {
    const parsedMpe = parseMass(
      options.applicableMpe,
      options.applicableMpeUnit || baseUnit,
    );
    mpeInKg = parsedMpe.valueInKg.abs();
    const targetUnitFactor = UNIT_TO_KG_FACTORS[baseUnit];
    mpeDisplayVal = mpeInKg.div(targetUnitFactor);
  } else {
    const mpeResult = getMpe(parsedLoad.valueInKg, parsedE.valueInKg, normClass, {
      loadUnit: "kg",
      eUnit: "kg",
      mode: options.mode,
      rulePack,
    });
    mpeInKg = new Decimal(mpeResult.mpeInMass).abs();
    const targetUnitFactor = UNIT_TO_KG_FACTORS[baseUnit];
    mpeDisplayVal = mpeInKg.div(targetUnitFactor);
  }

  // 3. Determine maximum allowed uncertainty ratio
  let isOneThird = false;
  let ratio: Decimal;
  if (options.maxUncertaintyRatio !== undefined) {
    const r = new Decimal(options.maxUncertaintyRatio);
    if (r.equals(new Decimal(1).div(3))) {
      isOneThird = true;
      ratio = r;
    } else {
      ratio = r;
    }
  } else if (rulePack?.metrologicalRules?.nabl129MaxUncertaintyToMpeRatio) {
    const ratioStr = rulePack.metrologicalRules.nabl129MaxUncertaintyToMpeRatio;
    if (ratioStr === "0.33333333" || ratioStr === "1/3") {
      isOneThird = true;
      ratio = new Decimal(1).div(3);
    } else {
      ratio = new Decimal(ratioStr);
    }
  } else {
    const defaultPack = loadDefaultRulePack();
    const ratioStr = defaultPack?.metrologicalRules?.nabl129MaxUncertaintyToMpeRatio;
    if (ratioStr && ratioStr !== "0.33333333" && ratioStr !== "1/3") {
      ratio = new Decimal(ratioStr);
    } else {
      isOneThird = true;
      ratio = new Decimal(1).div(3);
    }
  }

  // 4. Calculate max allowed uncertainty in kg and in baseUnit
  const maxAllowedUInKg = isOneThird ? mpeInKg.div(3) : mpeInKg.mul(ratio);
  const targetUnitFactor = UNIT_TO_KG_FACTORS[baseUnit];
  const actualUInUnit = parsedU.valueInKg.div(targetUnitFactor);
  const maxAllowedUInUnit = maxAllowedUInKg.div(targetUnitFactor);
  const loadInUnit = parsedLoad.valueInKg.div(targetUnitFactor);

  // 5. Compliance check: U <= maxAllowedU
  const compliant = parsedU.valueInKg.lte(maxAllowedUInKg);

  // 6. Ratio calculation: actual U / MPE
  const ratioToMpe = mpeInKg.isZero()
    ? new Decimal(0)
    : parsedU.valueInKg.div(mpeInKg);

  // 7. Compose formatted result strings
  const actualUStr = actualUInUnit.toFixed();
  const maxAllowedUStr = maxAllowedUInUnit.toFixed();
  const mpeAppliedStr = mpeDisplayVal.toFixed();
  const loadPointStr = loadInUnit.toFixed();
  const ratioToMpeStr = ratioToMpe.toFixed(6);

  let warningMessage: string | undefined;

  if (!compliant) {
    const weightLabel = options.weightId ? `Standard Weight Set ${options.weightId} ` : "Standard weight ";
    const unitSuffix = baseUnit ? `${baseUnit}` : "";
    const recClass = getRecommendedWeightClass(normClass);
    warningMessage = `NABL 129 VIOLATION: ${weightLabel}expanded uncertainty U=${actualUStr}${unitSuffix} exceeds 1/3 MPE limit (${maxAllowedUStr}${unitSuffix}) for load L=${loadPointStr}${unitSuffix}. Select ${recClass} standard weights.`;
  }

  return {
    compliant,
    actualUncertainty: actualUStr,
    maxAllowedUncertainty: maxAllowedUStr,
    mpeApplied: mpeAppliedStr,
    loadPoint: loadPointStr,
    ratioToMpe: ratioToMpeStr,
    weightId: options.weightId,
    unit: baseUnit,
    warningMessage,
  };
}

/**
 * Validates a batch or set of standard weights across multiple test load points.
 */
export function validateStandardWeightSet(
  weights: StandardWeightCheckInput[],
  e: string | number | Decimal,
  accuracyClass:
    | AccuracyClass
    | "I"
    | "II"
    | "III"
    | "IIII"
    | "CLASS_I"
    | "CLASS_II"
    | "CLASS_III"
    | "CLASS_IIII",
  optionsOrRulePack?: NABLValidateOptions | RulePack,
): NABLBatchPreCheckResult {
  const results: NABLPreCheckResult[] = [];
  let failingCount = 0;
  let passingCount = 0;

  for (const item of weights) {
    const itemOptions: NABLValidateOptions = {
      ...(typeof optionsOrRulePack === "object" && !("table6MpeBrackets" in optionsOrRulePack)
        ? optionsOrRulePack
        : {}),
      weightId: item.weightId,
      weightClass: item.weightClass,
      unit: item.unit,
      applicableMpe: item.applicableMpe,
    };

    if (optionsOrRulePack && "table6MpeBrackets" in optionsOrRulePack) {
      itemOptions.rulePack = optionsOrRulePack as RulePack;
    }

    const res = validateStandardWeightUncertainty(
      item.uncertaintyU,
      item.loadMass,
      e,
      accuracyClass,
      itemOptions,
    );

    results.push(res);
    if (res.compliant) {
      passingCount++;
    } else {
      failingCount++;
    }
  }

  const allCompliant = failingCount === 0;
  let summaryWarning: string | undefined;

  if (!allCompliant) {
    const failedList = results
      .filter((r) => !r.compliant)
      .map((r) => `[L=${r.loadPoint}${r.unit || ""}: U=${r.actualUncertainty} > ${r.maxAllowedUncertainty}]`)
      .join(", ");
    summaryWarning = `NABL 129 Pre-Check Failed: ${failingCount} of ${weights.length} load point(s) exceed standard weight uncertainty limit: ${failedList}`;
  }

  return {
    allCompliant,
    results,
    failingCount,
    passingCount,
    summaryWarning,
  };
}
