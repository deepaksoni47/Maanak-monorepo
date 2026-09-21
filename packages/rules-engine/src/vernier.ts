import { Decimal, toDecimal, add, sub, mul, div, toFixed, DecimalValue } from "./math.js";
import { parseMass } from "./classifier.js";
import { UnitOfMeasurement } from "@maanak/types";

export interface VernierCalculationOptions {
  unit?: UnitOfMeasurement;
  iUnit?: UnitOfMeasurement;
  deltaLUnit?: UnitOfMeasurement;
  eUnit?: UnitOfMeasurement;
  lUnit?: UnitOfMeasurement;
}

export interface VernierCalculationResult {
  indicatedI: string;
  deltaL: string;
  loadMassL: string;
  e: string;
  indicatedP: string;
  rawErrorE: string;
  rawErrorEInG: string;
  rawErrorEInDivisions: string;
}

/**
 * Calculates turning point true indication P per OIML R 76-1 Clause A.4.4.3.
 *
 * Mathematical Formula:
 * P = I + 0.5e - deltaL
 *
 * @param indicatedI - Scale displayed reading (I)
 * @param deltaL - Additional incremental weights placed before indication transitions (delta L)
 * @param e - Verification scale interval (e)
 * @returns Indication P as Decimal (in kg if units parsed)
 */
export function calculateIndicationP(
  indicatedI: DecimalValue,
  deltaL: DecimalValue,
  e: DecimalValue,
  options: VernierCalculationOptions = {},
): Decimal {
  const parsedI = parseMass(indicatedI as any, options.iUnit || options.unit || "kg");
  const parsedDeltaL = parseMass(deltaL as any, options.deltaLUnit || options.unit || "kg");
  const parsedE = parseMass(e as any, options.eUnit || options.unit || "kg");

  // halfE = 0.5 * e
  const halfE = mul("0.5", parsedE.valueInKg);

  // P = I + 0.5e - deltaL
  return sub(add(parsedI.valueInKg, halfE), parsedDeltaL.valueInKg);
}

/**
 * String-returning helper for calculateIndicationP.
 */
export function calculateIndicationPString(
  indicatedI: string,
  deltaL: string,
  e: string,
  options: VernierCalculationOptions = {},
): string {
  const pDecimal = calculateIndicationP(indicatedI, deltaL, e, options);
  return toFixed(pDecimal);
}

/**
 * Calculates raw rounding error E before zero-error correction per OIML R 76-1 Clause A.4.4.3.
 *
 * Mathematical Formula:
 * E = P - L
 *
 * @param indicatedP - Calculated indication P
 * @param loadMassL - Applied test load mass L
 * @returns Raw error E as Decimal (in kg)
 */
export function calculateRawErrorE(
  indicatedP: DecimalValue,
  loadMassL: DecimalValue,
  options: VernierCalculationOptions = {},
): Decimal {
  const parsedP = parseMass(indicatedP as any, options.iUnit || options.unit || "kg");
  const parsedL = parseMass(loadMassL as any, options.lUnit || options.unit || "kg");

  // E = P - L
  return sub(parsedP.valueInKg, parsedL.valueInKg);
}

/**
 * String-returning helper for calculateRawErrorE.
 */
export function calculateRawErrorEString(
  indicatedP: string,
  loadMassL: string,
  options: VernierCalculationOptions = {},
): string {
  const eDecimal = calculateRawErrorE(indicatedP, loadMassL, options);
  return toFixed(eDecimal);
}

/**
 * Comprehensive Vernier calculation combining P, E, and division multiples.
 */
export function calculateVernierObservation(
  indicatedI: DecimalValue,
  deltaL: DecimalValue,
  loadMassL: DecimalValue,
  e: DecimalValue,
  options: VernierCalculationOptions = {},
): VernierCalculationResult {
  const parsedI = parseMass(indicatedI as any, options.iUnit || options.unit || "kg");
  const parsedDeltaL = parseMass(deltaL as any, options.deltaLUnit || options.unit || "kg");
  const parsedL = parseMass(loadMassL as any, options.lUnit || options.unit || "kg");
  const parsedE = parseMass(e as any, options.eUnit || options.unit || "kg");

  const pDecimal = calculateIndicationP(parsedI.valueInKg, parsedDeltaL.valueInKg, parsedE.valueInKg);
  const eDecimal = calculateRawErrorE(pDecimal, parsedL.valueInKg);

  const errorInG = mul(eDecimal, "1000");
  const errorInDivisions = div(eDecimal, parsedE.valueInKg);

  return {
    indicatedI: toFixed(parsedI.valueInKg),
    deltaL: toFixed(parsedDeltaL.valueInKg),
    loadMassL: toFixed(parsedL.valueInKg),
    e: toFixed(parsedE.valueInKg),
    indicatedP: toFixed(pDecimal),
    rawErrorE: toFixed(eDecimal),
    rawErrorEInG: toFixed(errorInG),
    rawErrorEInDivisions: toFixed(errorInDivisions),
  };
}
