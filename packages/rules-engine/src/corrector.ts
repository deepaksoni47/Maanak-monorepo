import { Decimal, toDecimal, sub, abs, div, mul, lte, toFixed, DecimalValue } from "./math.js";
import { parseMass } from "./classifier.js";
import { getMpe } from "./mpe.js";
import { calculateVernierObservation } from "./vernier.js";
import { ComplianceStatus, AccuracyClass, UnitOfMeasurement } from "@maanak/types";

export interface CorrectorOptions {
  unit?: UnitOfMeasurement;
  eUnit?: UnitOfMeasurement;
  mpeUnit?: UnitOfMeasurement;
}

export interface ComplianceEvaluationResult {
  pass: boolean;
  status: ComplianceStatus;
  correctedErrorEc: string;
  mpeInMass: string;
  ratioToMpe: string;
  percentageOfMpe: string;
  margin: string;
}

export interface FullObservationComplianceResult {
  indicatedI: string;
  deltaL: string;
  loadMassL: string;
  e: string;
  indicatedP: string;
  rawErrorE: string;
  zeroErrorE0: string;
  correctedErrorEc: string;
  correctedErrorEcInG: string;
  correctedErrorEcInDivisions: string;
  mpeInMass: string;
  mpeInE: string;
  stepBracket: string;
  pass: boolean;
  status: ComplianceStatus;
  ratioToMpe: string;
  percentageOfMpe: string;
  margin: string;
}

/**
 * Calculates corrected error Ec per OIML R 76-1 Clause A.4.4.3.
 *
 * Mathematical Formula:
 * Ec = E - E0
 *
 * @param errorE - Raw rounding error at load L
 * @param zeroErrorE0 - Error evaluated at zero load
 * @returns Corrected error Ec as Decimal (in kg if units parsed)
 */
export function calculateCorrectedErrorEc(
  errorE: DecimalValue,
  zeroErrorE0: DecimalValue,
  options: CorrectorOptions = {},
): Decimal {
  const parsedE = parseMass(errorE as any, options.unit || "kg");
  const parsedE0 = parseMass(zeroErrorE0 as any, options.unit || "kg");

  // Ec = E - E0
  return sub(parsedE.valueInKg, parsedE0.valueInKg);
}

/**
 * String-returning helper for calculateCorrectedErrorEc.
 */
export function calculateCorrectedErrorEcString(
  errorE: string,
  zeroErrorE0: string,
  options: CorrectorOptions = {},
): string {
  const ecDecimal = calculateCorrectedErrorEc(errorE, zeroErrorE0, options);
  return toFixed(ecDecimal);
}

/**
 * Evaluates whether a corrected error Ec complies with the Maximum Permissible Error (MPE).
 *
 * Condition: |Ec| <= |MPE| -> PASS; otherwise FAIL
 */
export function evaluateCompliance(
  correctedErrorEc: DecimalValue,
  mpeInMass: DecimalValue,
  options: CorrectorOptions = {},
): ComplianceEvaluationResult {
  const parsedEc = parseMass(correctedErrorEc as any, options.unit || "kg");
  const parsedMpe = parseMass(mpeInMass as any, options.mpeUnit || options.unit || "kg");

  const absEc = abs(parsedEc.valueInKg);
  const absMpe = abs(parsedMpe.valueInKg);

  const isPass = lte(absEc, absMpe);
  const status = isPass ? ComplianceStatus.PASS : ComplianceStatus.FAIL;

  let ratioToMpe = "0";
  let percentageOfMpe = "0%";
  if (!absMpe.isZero()) {
    const ratioDecimal = div(absEc, absMpe);
    ratioToMpe = toFixed(ratioDecimal, 6);
    percentageOfMpe = `${toFixed(mul(ratioDecimal, "100"), 2)}%`;
  }

  const marginDecimal = sub(absMpe, absEc);

  return {
    pass: isPass,
    status,
    correctedErrorEc: toFixed(parsedEc.valueInKg),
    mpeInMass: toFixed(parsedMpe.valueInKg),
    ratioToMpe,
    percentageOfMpe,
    margin: toFixed(marginDecimal),
  };
}

/**
 * End-to-end observation calculator and compliance evaluator for a single load step.
 */
export function evaluateObservationCompliance(params: {
  indicatedI: DecimalValue;
  deltaL: DecimalValue;
  loadMassL: DecimalValue;
  zeroErrorE0: DecimalValue;
  e: DecimalValue;
  accuracyClass: AccuracyClass | "I" | "II" | "III" | "IIII";
  unit?: UnitOfMeasurement;
}): FullObservationComplianceResult {
  const vernier = calculateVernierObservation(
    params.indicatedI,
    params.deltaL,
    params.loadMassL,
    params.e,
    { unit: params.unit },
  );

  const ecDecimal = calculateCorrectedErrorEc(vernier.rawErrorE, params.zeroErrorE0, { unit: params.unit });
  const mpeResult = getMpe(params.loadMassL, params.e, params.accuracyClass, { unit: params.unit });

  const compliance = evaluateCompliance(ecDecimal, mpeResult.mpeInMass, { unit: params.unit });

  const ecInG = mul(ecDecimal, "1000");
  const parsedE = parseMass(params.e as any, params.unit || "kg");
  const ecInDivisions = div(ecDecimal, parsedE.valueInKg);

  return {
    indicatedI: vernier.indicatedI,
    deltaL: vernier.deltaL,
    loadMassL: vernier.loadMassL,
    e: vernier.e,
    indicatedP: vernier.indicatedP,
    rawErrorE: vernier.rawErrorE,
    zeroErrorE0: toFixed(parseMass(params.zeroErrorE0 as any, params.unit || "kg").valueInKg),
    correctedErrorEc: toFixed(ecDecimal),
    correctedErrorEcInG: toFixed(ecInG),
    correctedErrorEcInDivisions: toFixed(ecInDivisions),
    mpeInMass: mpeResult.mpeInMass,
    mpeInE: mpeResult.mpeInE,
    stepBracket: mpeResult.stepBracket,
    pass: compliance.pass,
    status: compliance.status,
    ratioToMpe: compliance.ratioToMpe,
    percentageOfMpe: compliance.percentageOfMpe,
    margin: compliance.margin,
  };
}
