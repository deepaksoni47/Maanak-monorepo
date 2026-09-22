import { AccuracyClassType, MassUnit, toGrams, fromGrams } from "./table3";

export interface MpeEvaluation {
  mpeFactorE: number; // 0.5, 1.0, 1.5
  mpeValueGrams: number;
  mpeFormatted: string;
  mInScaleDivisions: number;
}

export interface NablGatekeeperResult {
  valid: boolean;
  loadInGrams: number;
  eInGrams: number;
  uncertaintyUInGrams: number;
  mpeFactorE: number;
  mpeInGrams: number;
  mpeFormatted: string;
  maxAllowedUInGrams: number;
  maxAllowedUFormatted: string;
  ratioUtoMpe: number; // U / MPE
  percentageRatio: string; // e.g. "28.5%"
  recommendedWeightClass: string;
  status: "PASS" | "FAIL_UNCERTAINTY_EXCEEDED" | "INVALID_INPUT";
  message: string;
}

/**
 * Computes OIML R 76-1:2006 Table 6 Initial Verification MPE bracket for a given load m.
 */
export function computeOimlTable6Mpe(
  loadGrams: number,
  eGrams: number,
  accuracyClass: AccuracyClassType,
  unit: MassUnit = "kg"
): MpeEvaluation {
  if (eGrams <= 0) {
    return {
      mpeFactorE: 0,
      mpeValueGrams: 0,
      mpeFormatted: "0",
      mInScaleDivisions: 0,
    };
  }

  const mDivs = loadGrams / eGrams;
  let factor = 0.5;

  switch (accuracyClass) {
    case "I":
      if (mDivs > 200000) factor = 1.5;
      else if (mDivs > 50000) factor = 1.0;
      else factor = 0.5;
      break;

    case "II":
      if (mDivs > 20000) factor = 1.5;
      else if (mDivs > 5000) factor = 1.0;
      else factor = 0.5;
      break;

    case "III":
      if (mDivs > 2000) factor = 1.5;
      else if (mDivs > 500) factor = 1.0;
      else factor = 0.5;
      break;

    case "IIII":
      if (mDivs > 200) factor = 1.5;
      else if (mDivs > 50) factor = 1.0;
      else factor = 0.5;
      break;
  }

  const mpeValueGrams = factor * eGrams;
  const mpeInUserUnit = fromGrams(mpeValueGrams, unit);

  return {
    mpeFactorE: factor,
    mpeValueGrams,
    mpeFormatted: `±${factor}e (±${mpeInUserUnit.toLocaleString("en-US", {
      maximumFractionDigits: 6,
    })} ${unit})`,
    mInScaleDivisions: mDivs,
  };
}

/**
 * Recommends OIML R 111 weight class for an instrument accuracy class.
 */
export function getRecommendedWeightClass(accuracyClass: AccuracyClassType): string {
  switch (accuracyClass) {
    case "I":
      return "Class E1 or E2";
    case "II":
      return "Class E2";
    case "III":
      return "Class F1 or F2";
    case "IIII":
      return "Class M1";
  }
}

/**
 * Evaluates standard weight expanded uncertainty U (k=2) against OIML R 76-1 Clause 3.7.1 & NABL 129.
 * Standard requirement: U <= (1/3) * |MPE|
 */
export function evaluateNablGatekeeper(params: {
  load: number;
  loadUnit: MassUnit;
  e: number;
  eUnit: MassUnit;
  accuracyClass: AccuracyClassType;
  uncertaintyU: number;
  uncertaintyUnit: MassUnit;
}): NablGatekeeperResult {
  const { load, loadUnit, e, eUnit, accuracyClass, uncertaintyU, uncertaintyUnit } = params;

  const loadGrams = toGrams(load, loadUnit);
  const eGrams = toGrams(e, eUnit);
  const uGrams = toGrams(uncertaintyU, uncertaintyUnit);

  const recommendedWeightClass = getRecommendedWeightClass(accuracyClass);

  if (load <= 0 || e <= 0 || uncertaintyU < 0) {
    return {
      valid: false,
      loadInGrams: loadGrams,
      eInGrams: eGrams,
      uncertaintyUInGrams: uGrams,
      mpeFactorE: 0,
      mpeInGrams: 0,
      mpeFormatted: "0",
      maxAllowedUInGrams: 0,
      maxAllowedUFormatted: "0",
      ratioUtoMpe: 0,
      percentageRatio: "0%",
      recommendedWeightClass,
      status: "INVALID_INPUT",
      message: "Target load, verification interval e, and uncertainty must be positive values.",
    };
  }

  const mpeResult = computeOimlTable6Mpe(loadGrams, eGrams, accuracyClass, loadUnit);
  const mpeGrams = mpeResult.mpeValueGrams;

  // Clause 3.7.1: U_max = (1/3) * |MPE|
  const maxAllowedUGrams = mpeGrams / 3;
  const maxAllowedUInUserUnit = fromGrams(maxAllowedUGrams, uncertaintyUnit);

  const ratio = mpeGrams > 0 ? uGrams / mpeGrams : 0;
  const percentageRatio = `${(ratio * 100).toFixed(1)}%`;

  const maxAllowedUFormatted = `${maxAllowedUInUserUnit.toLocaleString("en-US", {
    maximumFractionDigits: 6,
  })} ${uncertaintyUnit}`;

  // Valid if U <= (1/3) * MPE (ratio <= 1/3)
  const isValid = uGrams <= maxAllowedUGrams + 1e-9;

  if (isValid) {
    return {
      valid: true,
      loadInGrams: loadGrams,
      eInGrams: eGrams,
      uncertaintyUInGrams: uGrams,
      mpeFactorE: mpeResult.mpeFactorE,
      mpeInGrams: mpeGrams,
      mpeFormatted: mpeResult.mpeFormatted,
      maxAllowedUInGrams: maxAllowedUGrams,
      maxAllowedUFormatted,
      ratioUtoMpe: ratio,
      percentageRatio,
      recommendedWeightClass,
      status: "PASS",
      message: `Expanded uncertainty U (${uncertaintyU} ${uncertaintyUnit}) complies with OIML R 76-1 Clause 3.7.1 (U ≤ ⅓ MPE = ${maxAllowedUFormatted}). Ratio is ${percentageRatio} (≤ 33.3%).`,
    };
  }

  return {
    valid: false,
    loadInGrams: loadGrams,
    eInGrams: eGrams,
    uncertaintyUInGrams: uGrams,
    mpeFactorE: mpeResult.mpeFactorE,
    mpeInGrams: mpeGrams,
    mpeFormatted: mpeResult.mpeFormatted,
    maxAllowedUInGrams: maxAllowedUGrams,
    maxAllowedUFormatted,
    ratioUtoMpe: ratio,
    percentageRatio,
    recommendedWeightClass,
    status: "FAIL_UNCERTAINTY_EXCEEDED",
    message: `Expanded uncertainty U (${uncertaintyU} ${uncertaintyUnit}) exceeds ⅓ MPE limit (${maxAllowedUFormatted}) per OIML R 76-1 Clause 3.7.1. Ratio is ${percentageRatio} (> 33.3%). Standard weight cannot be used for this verification load.`,
  };
}
