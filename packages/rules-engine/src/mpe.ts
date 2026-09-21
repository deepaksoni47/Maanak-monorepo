import { Decimal } from "decimal.js";
import { AccuracyClass, UnitOfMeasurement } from "@maanak/types";
import { RulePack, Table6MpeBracketItem, loadDefaultRulePack } from "./loader.js";
import { parseMass, normalizeAccuracyClass } from "./classifier.js";

export type MpeEvaluationMode = "initialVerification" | "inService";

export interface GetMpeOptions {
  loadUnit?: UnitOfMeasurement;
  eUnit?: UnitOfMeasurement;
  unit?: UnitOfMeasurement;
  mode?: MpeEvaluationMode;
  rulePack?: RulePack;
}

export interface MpeCalculationResult {
  accuracyClass: AccuracyClass;
  mInDivisions: string;
  mInDivisionsNumber: number;
  mpeFactorE: string;
  mpeInE: string;
  mpeInMass: string;
  mpeInMassNumber: number;
  mpeLower: string;
  mpeUpper: string;
  mpeLowerInE: string;
  mpeUpperInE: string;
  stepBracket: string;
  loadInKg: string;
  eInKg: string;
  mode: MpeEvaluationMode;
}

/**
 * Calculates Maximum Permissible Error (MPE) for an applied test load per OIML R 76-1 Table 6.
 *
 * Formula:
 * 1. m = Load / e (test load expressed in verification scale intervals)
 * 2. Look up m in Table 6 brackets for the given Accuracy Class and Evaluation Mode (Initial vs In-Service)
 * 3. MPE(e) in intervals = ±0.5e, ±1.0e, or ±1.5e (Initial Verification)
 * 4. MPE(mass) = MPE(e) * e
 */
export function getMpe(
  load: string | number | Decimal,
  e: string | number | Decimal,
  accuracyClass: AccuracyClass | "I" | "II" | "III" | "IIII" | "CLASS_I" | "CLASS_II" | "CLASS_III" | "CLASS_IIII",
  options: GetMpeOptions = {},
): MpeCalculationResult {
  const normClass = normalizeAccuracyClass(accuracyClass);
  const enumClass = (AccuracyClass[`CLASS_${normClass}` as keyof typeof AccuracyClass] ||
    normClass) as AccuracyClass;

  const mode: MpeEvaluationMode = options.mode || "initialVerification";
  const rulePack = options.rulePack || loadDefaultRulePack();

  const mpeBracketsSection = rulePack.table6MpeBrackets[mode] || rulePack.table6MpeBrackets.initialVerification;
  const classBrackets: Table6MpeBracketItem[] = mpeBracketsSection[normClass];

  const parsedLoad = parseMass(load, options.loadUnit || options.unit || "kg");
  const parsedE = parseMass(e, options.eUnit || options.unit || "kg");

  if (parsedE.valueInKg.lte(0)) {
    throw new Error("Verification scale interval (e) must be strictly positive (> 0)");
  }

  // Calculate m = Load / e
  const mDecimal = parsedLoad.valueInKg.div(parsedE.valueInKg);
  const mNumber = mDecimal.toNumber();
  const mStr = mDecimal.toFixed();

  // Find matching step bracket in Table 6
  let matchedBracket: Table6MpeBracketItem | undefined;

  for (let i = 0; i < classBrackets.length; i++) {
    const bracket = classBrackets[i];
    const minM = new Decimal(bracket.minMInDivisions);
    const maxM = bracket.maxMInDivisions !== null ? new Decimal(bracket.maxMInDivisions) : null;

    if (i === 0) {
      // First bracket includes lower bound 0: 0 <= m <= maxM
      if (mDecimal.lte(maxM!)) {
        matchedBracket = bracket;
        break;
      }
    } else {
      // Subsequent brackets: minM < m <= maxM
      if (mDecimal.gt(minM) && (maxM === null || mDecimal.lte(maxM))) {
        matchedBracket = bracket;
        break;
      }
    }
  }

  // Fallback to highest bracket if load exceeds table limit
  if (!matchedBracket) {
    matchedBracket = classBrackets[classBrackets.length - 1];
  }

  const factorDecimal = new Decimal(matchedBracket.mpeFactorE);
  const mpeInMassDecimal = factorDecimal.mul(parsedE.valueInKg);

  const maxMStr = matchedBracket.maxMInDivisions !== null ? `${matchedBracket.maxMInDivisions}e` : "Infinity";
  const stepBracketStr = `(${matchedBracket.minMInDivisions}e, ${maxMStr}]`;

  return {
    accuracyClass: enumClass,
    mInDivisions: mStr,
    mInDivisionsNumber: mNumber,
    mpeFactorE: matchedBracket.mpeFactorE,
    mpeInE: matchedBracket.mpeFactorE,
    mpeInMass: mpeInMassDecimal.toFixed(),
    mpeInMassNumber: mpeInMassDecimal.toNumber(),
    mpeLower: mpeInMassDecimal.neg().toFixed(),
    mpeUpper: mpeInMassDecimal.toFixed(),
    mpeLowerInE: factorDecimal.neg().toFixed(),
    mpeUpperInE: factorDecimal.toFixed(),
    stepBracket: stepBracketStr,
    loadInKg: parsedLoad.valueInKg.toFixed(),
    eInKg: parsedE.valueInKg.toFixed(),
    mode,
  };
}

/**
 * Determines whether a given observed error (E or Ec) complies with the Maximum Permissible Error (MPE).
 */
export function isWithinMpe(
  error: string | number | Decimal,
  load: string | number | Decimal,
  e: string | number | Decimal,
  accuracyClass: AccuracyClass | "I" | "II" | "III" | "IIII",
  options: GetMpeOptions & { errorUnit?: UnitOfMeasurement } = {},
): { compliant: boolean; errorInKg: string; mpeInMass: string; marginInKg: string } {
  const mpeResult = getMpe(load, e, accuracyClass, options);
  const parsedError = parseMass(error, options.errorUnit || options.eUnit || options.unit || "kg");

  const absError = parsedError.valueInKg.abs();
  const mpeDecimal = new Decimal(mpeResult.mpeInMass);
  const marginDecimal = mpeDecimal.minus(absError);

  return {
    compliant: absError.lte(mpeDecimal),
    errorInKg: parsedError.valueInKg.toFixed(),
    mpeInMass: mpeResult.mpeInMass,
    marginInKg: marginDecimal.toFixed(),
  };
}
