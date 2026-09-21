import { Decimal, toDecimal, sub, div, mul, lte, gt, toFixed, DecimalValue } from "./math.js";
import { parseMass, normalizeAccuracyClass, findMatchingTable3Tier } from "./classifier.js";
import { getMpe, MpeCalculationResult } from "./mpe.js";
import { calculateIndicationP, calculateRawErrorE, VernierCalculationResult } from "./vernier.js";
import { PartialWeighingRange, AccuracyClass, UnitOfMeasurement } from "@maanak/types";
import { RulePack, loadDefaultRulePack } from "./loader.js";

export interface MultiIntervalOptions {
  unit?: UnitOfMeasurement;
  loadUnit?: UnitOfMeasurement;
  direction?: "increasing" | "decreasing";
  previousRangeIndex?: number;
  stickyDecreasing?: boolean;
  strictOverflow?: boolean;
  rulePack?: RulePack;
}

export interface ActiveRangeResult {
  range: PartialWeighingRange;
  rangeIndex: number;
  activeE: string;
  activeD: string;
  activeEInKg: string;
  vernierStepIncrement: string;
  vernierStepIncrementInKg: string;
  halfIntervalE: string;
  halfIntervalEInKg: string;
  maxCapacity: string;
  maxCapacityInKg: string;
  minCapacity: string;
  minCapacityInKg: string;
  scaleDivisionCountN: number;
  lowerBoundInKg: string;
  upperBoundInKg: string;
  isOverflow: boolean;
}

export interface MultiIntervalValidationResult {
  valid: boolean;
  errors: string[];
}

export interface MultiIntervalMpeResult extends MpeCalculationResult {
  activeRange: ActiveRangeResult;
}

export interface MultiIntervalObservationResult extends VernierCalculationResult {
  activeRange: ActiveRangeResult;
  isVernierStepValid: boolean;
  expectedVernierStep: string;
}

/**
 * Validates an array of partial weighing ranges according to OIML R 76-1 Clause 3.3.
 *
 * Rules:
 * 1. At least 2 partial ranges must be defined for a multi-interval scale.
 * 2. Ranges must have strictly increasing max capacities: Max1 < Max2 < ... < Max_r.
 * 3. Ranges must have strictly increasing scale intervals: e1 < e2 < ... < e_r.
 * 4. Actual scale intervals must satisfy d_i <= e_i <= 10 * d_i for each range.
 * 5. If accuracy class is provided, each partial range's division count n_i must satisfy Table 3 limits.
 */
export function validatePartialRanges(
  partialRanges: PartialWeighingRange[],
  options: { unit?: UnitOfMeasurement; accuracyClass?: AccuracyClass | "I" | "II" | "III" | "IIII"; rulePack?: RulePack } = {},
): MultiIntervalValidationResult {
  const errors: string[] = [];

  if (!partialRanges || partialRanges.length < 2) {
    errors.push("Multi-interval scale must define at least 2 partial weighing ranges per OIML R 76-1 Clause 3.3.");
    return { valid: false, errors };
  }

  const defaultUnit = options.unit || "kg";
  let prevMaxKg: Decimal | null = null;
  let prevEKg: Decimal | null = null;

  const rulePack = options.rulePack || loadDefaultRulePack();
  const normClass = options.accuracyClass ? normalizeAccuracyClass(options.accuracyClass) : null;
  const classTiers = normClass ? rulePack.table3Classification[normClass] : null;

  for (let idx = 0; idx < partialRanges.length; idx++) {
    const range = partialRanges[idx];
    const rangeNum = idx + 1;

    try {
      const maxParsed = parseMass(range.maxCapacity, defaultUnit);
      const eParsed = parseMass(range.verificationIntervalE, defaultUnit);
      const dParsed = parseMass(range.actualIntervalD, defaultUnit);

      // Max capacity must be positive
      if (maxParsed.valueInKg.lte(0)) {
        errors.push(`Range ${rangeNum}: Max capacity must be strictly greater than 0.`);
      }

      // e must be positive
      if (eParsed.valueInKg.lte(0)) {
        errors.push(`Range ${rangeNum}: Verification scale interval e must be strictly greater than 0.`);
      }

      // d must be positive
      if (dParsed.valueInKg.lte(0)) {
        errors.push(`Range ${rangeNum}: Actual scale interval d must be strictly greater than 0.`);
      }

      // Strictly increasing Max capacities
      if (prevMaxKg !== null && maxParsed.valueInKg.lte(prevMaxKg)) {
        errors.push(
          `Range ${rangeNum}: Max capacity (${maxParsed.valueInKg.toFixed()} kg) must be strictly greater than previous range Max (${prevMaxKg.toFixed()} kg).`,
        );
      }

      // Strictly increasing verification intervals: e1 < e2 < ... < e_r
      if (prevEKg !== null && eParsed.valueInKg.lte(prevEKg)) {
        errors.push(
          `Range ${rangeNum}: Verification interval e (${eParsed.valueInKg.toFixed()} kg) must be strictly greater than previous range e (${prevEKg.toFixed()} kg).`,
        );
      }

      // d <= e <= 10d
      if (dParsed.valueInKg.gt(eParsed.valueInKg)) {
        errors.push(
          `Range ${rangeNum}: Actual scale interval d (${dParsed.valueInKg.toFixed()} kg) cannot exceed verification interval e (${eParsed.valueInKg.toFixed()} kg).`,
        );
      }
      const maxAllowedE = mul(dParsed.valueInKg, "10");
      if (eParsed.valueInKg.gt(maxAllowedE)) {
        errors.push(
          `Range ${rangeNum}: Verification interval e (${eParsed.valueInKg.toFixed()} kg) exceeds 10 * d (${maxAllowedE.toFixed()} kg).`,
        );
      }

      // Check n_i within accuracy class limits if class provided
      if (classTiers && eParsed.valueInKg.gt(0)) {
        const tier = findMatchingTable3Tier(eParsed.valueInKg, classTiers);
        if (!tier) {
          errors.push(
            `Range ${rangeNum}: Verification scale interval e (${eParsed.valueInKg.toFixed()} kg) does not match any valid Table 3 tier for Class ${normClass}.`,
          );
        } else {
          const n = Math.round(div(maxParsed.valueInKg, eParsed.valueInKg).toNumber());
          const minN = tier.minVerificationScaleDivisionsN;
          const maxN = tier.maxVerificationScaleDivisionsN;
          if (n < minN) {
            errors.push(
              `Range ${rangeNum}: Scale division count n=${n} is below minimum allowed ${minN} for Class ${normClass}.`,
            );
          }
          if (maxN !== null && n > maxN) {
            errors.push(
              `Range ${rangeNum}: Scale division count n=${n} exceeds maximum allowed ${maxN} for Class ${normClass}.`,
            );
          }
        }
      }

      prevMaxKg = maxParsed.valueInKg;
      prevEKg = eParsed.valueInKg;
    } catch (err: any) {
      errors.push(`Range ${rangeNum}: Error parsing values: ${err.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Resolves the active partial weighing range W_i for a given applied test load L.
 *
 * Mathematical & Regulatory Specification (OIML R 76-1 Clause 3.3.1 / 3.3.2):
 * - Increasing load:
 *     For Range 1: 0 <= L <= Max_1
 *     For Range i: Max_{i-1} < L <= Max_i
 * - Decreasing load (sticky mode if enabled):
 *     Remains in higher range until zero or lower threshold per instrument design.
 * - Dynamic Vernier Step:
 *     Delta L steps must be multiples of 0.1 * e_i.
 *
 * @param load - Applied test load (mass string, number, or Decimal)
 * @param partialRanges - Array of partial weighing ranges
 * @param options - Multi-interval options
 * @returns Active range result including active e_i, vernier step increment, and boundary info
 */
export function getActiveRangeForLoad(
  load: DecimalValue | string | number,
  partialRanges: PartialWeighingRange[],
  options: MultiIntervalOptions = {},
): ActiveRangeResult {
  if (!partialRanges || partialRanges.length === 0) {
    throw new Error("At least one partial weighing range must be provided.");
  }

  const defaultUnit = options.unit || "kg";
  const parsedLoad = parseMass(load as any, options.loadUnit || defaultUnit);
  const loadKg = parsedLoad.valueInKg;

  // Normalize and sort ranges by maxCapacity ascending
  const sortedRanges = [...partialRanges].map((range, idx) => {
    const maxParsed = parseMass(range.maxCapacity, defaultUnit);
    const eParsed = parseMass(range.verificationIntervalE, defaultUnit);
    const dParsed = parseMass(range.actualIntervalD, defaultUnit);
    const minParsed = range.minCapacity ? parseMass(range.minCapacity, defaultUnit) : null;
    return {
      raw: range,
      originalIndex: range.rangeIndex ?? idx + 1,
      maxInKg: maxParsed.valueInKg,
      eInKg: eParsed.valueInKg,
      dInKg: dParsed.valueInKg,
      minInKg: minParsed ? minParsed.valueInKg : null,
      maxParsed,
      eParsed,
      dParsed,
    };
  }).sort((a, b) => a.maxInKg.comparedTo(b.maxInKg));

  let matchedIndex = 0;
  let isOverflow = false;

  // Check if load exceeds maximum capacity of the highest range
  const highestRange = sortedRanges[sortedRanges.length - 1];
  if (gt(loadKg, highestRange.maxInKg)) {
    if (options.strictOverflow) {
      throw new Error(
        `Load ${toFixed(loadKg)} kg exceeds maximum capacity ${toFixed(highestRange.maxInKg)} kg of the instrument.`,
      );
    }
    matchedIndex = sortedRanges.length - 1;
    isOverflow = true;
  } else {
    // Normal bracket lookup
    for (let i = 0; i < sortedRanges.length; i++) {
      const currentMax = sortedRanges[i].maxInKg;
      if (lte(loadKg, currentMax)) {
        matchedIndex = i;
        break;
      }
    }
  }

  // Handle sticky decreasing load mode (OIML R 76-1 Clause 3.3.2)
  if (
    options.direction === "decreasing" &&
    options.stickyDecreasing &&
    options.previousRangeIndex !== undefined &&
    gt(loadKg, 0)
  ) {
    const prevIdx0 = options.previousRangeIndex - 1;
    if (prevIdx0 >= 0 && prevIdx0 < sortedRanges.length && prevIdx0 > matchedIndex) {
      matchedIndex = prevIdx0;
    }
  }

  const selected = sortedRanges[matchedIndex];
  const rangeNumber = matchedIndex + 1;

  const lowerBoundKg = matchedIndex === 0 ? new Decimal(0) : sortedRanges[matchedIndex - 1].maxInKg;
  const upperBoundKg = selected.maxInKg;

  // Vernier step increment = 0.1 * e_i
  const vernierStepKg = mul("0.1", selected.eInKg);
  // Half interval = 0.5 * e_i
  const halfEKg = mul("0.5", selected.eInKg);

  // Scale division count n_i = Max_i / e_i
  const n = Math.round(div(selected.maxInKg, selected.eInKg).toNumber());

  // Minimum capacity: default to 20 * e_i (Class III default) or explicit min
  const minCapKg = selected.minInKg ?? mul("20", selected.eInKg);

  return {
    range: selected.raw,
    rangeIndex: rangeNumber,
    activeE: selected.raw.verificationIntervalE,
    activeD: selected.raw.actualIntervalD,
    activeEInKg: toFixed(selected.eInKg),
    vernierStepIncrement: toFixed(vernierStepKg),
    vernierStepIncrementInKg: toFixed(vernierStepKg),
    halfIntervalE: toFixed(halfEKg),
    halfIntervalEInKg: toFixed(halfEKg),
    maxCapacity: selected.raw.maxCapacity,
    maxCapacityInKg: toFixed(selected.maxInKg),
    minCapacity: selected.raw.minCapacity ?? toFixed(minCapKg),
    minCapacityInKg: toFixed(minCapKg),
    scaleDivisionCountN: n,
    lowerBoundInKg: toFixed(lowerBoundKg),
    upperBoundInKg: toFixed(upperBoundKg),
    isOverflow,
  };
}

/**
 * Calculates MPE for a multi-interval scale by dynamically selecting the active partial range
 * and its corresponding verification scale interval e_i.
 */
export function getMultiIntervalMpe(
  load: DecimalValue | string | number,
  partialRanges: PartialWeighingRange[],
  accuracyClass: AccuracyClass | "I" | "II" | "III" | "IIII",
  options: MultiIntervalOptions = {},
): MultiIntervalMpeResult {
  const activeRange = getActiveRangeForLoad(load, partialRanges, options);

  const mpeResult = getMpe(load as any, activeRange.activeEInKg, accuracyClass, {
    unit: "kg",
    mode: (options as any).mode || "initialVerification",
    rulePack: options.rulePack,
  });

  return {
    ...mpeResult,
    activeRange,
  };
}

/**
 * Calculates turning point true indication P, raw error E, and verifies Vernier step increment
 * for an observation on a multi-interval scale.
 */
export function calculateMultiIntervalObservation(params: {
  indicatedI: DecimalValue | string | number;
  deltaL: DecimalValue | string | number;
  loadMassL: DecimalValue | string | number;
  partialRanges: PartialWeighingRange[];
  options?: MultiIntervalOptions;
}): MultiIntervalObservationResult {
  const options = params.options || {};
  const activeRange = getActiveRangeForLoad(params.loadMassL, params.partialRanges, options);

  const parsedI = parseMass(params.indicatedI as any, options.unit || "kg");
  const parsedDeltaL = parseMass(params.deltaL as any, options.unit || "kg");
  const parsedL = parseMass(params.loadMassL as any, options.loadUnit || options.unit || "kg");
  const activeEKg = toDecimal(activeRange.activeEInKg);

  const pDecimal = calculateIndicationP(parsedI.valueInKg, parsedDeltaL.valueInKg, activeEKg, { unit: "kg" });
  const eDecimal = calculateRawErrorE(pDecimal, parsedL.valueInKg, { unit: "kg" });

  // Verify whether deltaL is an integer multiple of vernier step (0.1 * e_i) within metrological tolerance
  const vernierStepKg = toDecimal(activeRange.vernierStepIncrementInKg);
  const stepRatio = div(parsedDeltaL.valueInKg, vernierStepKg);
  const nearestStep = stepRatio.round();
  const stepDiff = sub(stepRatio, nearestStep).abs();
  const isVernierStepValid = stepDiff.lte("0.01"); // 1% tolerance for floating point representations

  return {
    indicatedI: toFixed(parsedI.valueInKg),
    deltaL: toFixed(parsedDeltaL.valueInKg),
    loadMassL: toFixed(parsedL.valueInKg),
    e: activeRange.activeEInKg,
    indicatedP: toFixed(pDecimal),
    rawErrorE: toFixed(eDecimal),
    rawErrorEInG: toFixed(mul(eDecimal, "1000")),
    rawErrorEInDivisions: toFixed(div(eDecimal, activeEKg)),
    activeRange,
    isVernierStepValid,
    expectedVernierStep: activeRange.vernierStepIncrementInKg,
  };
}
