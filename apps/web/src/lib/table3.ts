/**
 * OIML R 76-1:2006 Table 3 Metrological Classification Engine.
 * Browser-safe, pure TypeScript implementation with zero external dependencies.
 */

export type MassUnit = "kg" | "g" | "mg";
export type AccuracyClassType = "I" | "II" | "III" | "IIII";

export interface ClassTierLimit {
  minEInG: number;
  maxEInG: number | null;
  minN: number;
  maxN: number | null;
  minCapacityFactorE: number;
}

export const OIML_TABLE_3_TIERS: Record<AccuracyClassType, ClassTierLimit[]> = {
  I: [
    {
      minEInG: 0.001, // 1 mg
      maxEInG: null,
      minN: 50000,
      maxN: null,
      minCapacityFactorE: 100,
    },
  ],
  II: [
    {
      minEInG: 0.001, // 1 mg
      maxEInG: 0.05,  // 50 mg
      minN: 100,
      maxN: 100000,
      minCapacityFactorE: 20,
    },
    {
      minEInG: 0.1,   // 0.1 g
      maxEInG: null,
      minN: 5000,
      maxN: 100000,
      minCapacityFactorE: 20,
    },
  ],
  III: [
    {
      minEInG: 0.1,   // 0.1 g
      maxEInG: 2.0,   // 2 g
      minN: 100,
      maxN: 10000,
      minCapacityFactorE: 20,
    },
    {
      minEInG: 5.0,   // 5 g
      maxEInG: null,
      minN: 500,
      maxN: 10000,
      minCapacityFactorE: 20,
    },
  ],
  IIII: [
    {
      minEInG: 5.0,   // 5 g
      maxEInG: null,
      minN: 100,
      maxN: 1000,
      minCapacityFactorE: 10,
    },
  ],
};

/** Convert any mass value to grams for precise standardized comparison */
export function toGrams(value: number, unit: MassUnit): number {
  switch (unit) {
    case "kg":
      return value * 1000;
    case "g":
      return value;
    case "mg":
      return value / 1000;
  }
}

/** Convert grams back to the specified display unit */
export function fromGrams(grams: number, unit: MassUnit): number {
  switch (unit) {
    case "kg":
      return grams / 1000;
    case "g":
      return grams;
    case "mg":
      return grams * 1000;
  }
}

export interface ClassificationResult {
  valid: boolean;
  derivedClass: AccuracyClassType | null;
  scaleDivisionsN: number;
  nFormatted: string;
  eInGrams: number;
  maxInGrams: number;
  dInGrams: number;
  minAllowedN: number | null;
  maxAllowedN: number | null;
  minCapacityRequiredGrams: number | null;
  minCapacityRequiredFormatted: string | null;
  minCapacityFactorE: number | null;
  ratioED: number;
  isIntervalValid: boolean; // d <= e <= 10d
  errorReasons: string[];
  warnings: string[];
  eligibleClasses: AccuracyClassType[];
}

/**
 * Evaluates a Non-Automatic Weighing Instrument against OIML R 76-1 Table 3.
 */
export function evaluateTable3Classification(params: {
  max: number;
  maxUnit: MassUnit;
  e: number;
  eUnit: MassUnit;
  d?: number;
  dUnit?: MassUnit;
  min?: number;
  minUnit?: MassUnit;
  requestedClass?: AccuracyClassType;
}): ClassificationResult {
  const { max, maxUnit, e, eUnit, requestedClass } = params;
  const d = params.d ?? e;
  const dUnit = params.dUnit ?? eUnit;

  const errors: string[] = [];
  const warnings: string[] = [];

  const maxG = toGrams(max, maxUnit);
  const eG = toGrams(e, eUnit);
  const dG = toGrams(d, dUnit);

  if (max <= 0) {
    errors.push("Maximum capacity (Max) must be strictly greater than 0.");
  }
  if (e <= 0) {
    errors.push("Verification scale interval (e) must be strictly greater than 0.");
  }
  if (d <= 0) {
    errors.push("Actual scale interval (d) must be strictly greater than 0.");
  }

  // Clause 3.4.2 constraint: d <= e <= 10d
  const ratioED = dG > 0 ? eG / dG : 0;
  let isIntervalValid = true;
  if (dG > eG + 1e-9) {
    isIntervalValid = false;
    errors.push("Actual scale interval (d) cannot exceed verification interval (e) [OIML R 76-1 Cl 3.4.2].");
  } else if (eG > 10 * dG + 1e-9) {
    isIntervalValid = false;
    errors.push("Verification interval (e) cannot exceed 10 times actual interval (d) [e > 10d].");
  }

  const n = eG > 0 ? Math.round((maxG / eG) * 1000000) / 1000000 : 0;
  const nFormatted = n.toLocaleString("en-US", { maximumFractionDigits: 1 });

  // Find all classes that can accept this instrument specification
  const eligibleClasses: AccuracyClassType[] = [];
  const classDetails: Partial<Record<AccuracyClassType, { tier: ClassTierLimit; minCapG: number }>> = {};

  const order: AccuracyClassType[] = ["I", "II", "III", "IIII"];
  for (const cls of order) {
    const tiers = OIML_TABLE_3_TIERS[cls];
    for (const tier of tiers) {
      const eFitsMin = eG >= tier.minEInG - 1e-9;
      const eFitsMax = tier.maxEInG === null || eG <= tier.maxEInG + 1e-9;
      if (eFitsMin && eFitsMax) {
        const nFitsMin = n >= tier.minN;
        const nFitsMax = tier.maxN === null || n <= tier.maxN;
        if (nFitsMin && nFitsMax) {
          eligibleClasses.push(cls);
          classDetails[cls] = {
            tier,
            minCapG: tier.minCapacityFactorE * eG,
          };
          break;
        }
      }
    }
  }

  // Determine target class: either user selected or best eligible match
  let targetClass: AccuracyClassType | null = null;
  if (requestedClass) {
    targetClass = requestedClass;
  } else if (eligibleClasses.length > 0) {
    targetClass = eligibleClasses[0];
  }

  let minAllowedN: number | null = null;
  let maxAllowedN: number | null = null;
  let minCapacityFactorE: number | null = null;
  let minCapacityRequiredGrams: number | null = null;

  if (targetClass) {
    const tiers = OIML_TABLE_3_TIERS[targetClass];
    // Find matching tier for e
    let matchingTier: ClassTierLimit | null = null;
    for (const tier of tiers) {
      const eFitsMin = eG >= tier.minEInG - 1e-9;
      const eFitsMax = tier.maxEInG === null || eG <= tier.maxEInG + 1e-9;
      if (eFitsMin && eFitsMax) {
        matchingTier = tier;
        break;
      }
    }

    if (matchingTier) {
      minAllowedN = matchingTier.minN;
      maxAllowedN = matchingTier.maxN;
      minCapacityFactorE = matchingTier.minCapacityFactorE;
      minCapacityRequiredGrams = matchingTier.minCapacityFactorE * eG;

      if (n < matchingTier.minN) {
        errors.push(
          `Scale division count n = ${nFormatted} is below minimum allowed (${matchingTier.minN.toLocaleString()}) for Class ${targetClass}.`
        );
      } else if (matchingTier.maxN !== null && n > matchingTier.maxN) {
        errors.push(
          `Scale division count n = ${nFormatted} exceeds maximum allowed (${matchingTier.maxN.toLocaleString()}) for Class ${targetClass}.`
        );
      }
    } else {
      errors.push(
        `Verification scale interval e (${e} ${eUnit}) is outside permissible ranges for Class ${targetClass} per Table 3.`
      );
    }
  }

  // Validate declared minimum capacity if provided
  let minCapacityRequiredFormatted: string | null = null;
  if (minCapacityRequiredGrams !== null) {
    const minReqInUserUnit = fromGrams(minCapacityRequiredGrams, maxUnit);
    minCapacityRequiredFormatted = `${minReqInUserUnit.toLocaleString("en-US", {
      maximumFractionDigits: 4,
    })} ${maxUnit}`;

    if (params.min !== undefined && params.min > 0) {
      const minG = toGrams(params.min, params.minUnit || maxUnit);
      if (minG < minCapacityRequiredGrams - 1e-9) {
        errors.push(
          `Declared Min (${params.min} ${params.minUnit || maxUnit}) is below required minimum ${minCapacityFactorE}e (${minCapacityRequiredFormatted}) for Class ${targetClass}.`
        );
      }
    }
  }

  const isValid = errors.length === 0 && targetClass !== null && isIntervalValid;

  return {
    valid: isValid,
    derivedClass: targetClass,
    scaleDivisionsN: n,
    nFormatted,
    eInGrams: eG,
    maxInGrams: maxG,
    dInGrams: dG,
    minAllowedN,
    maxAllowedN,
    minCapacityRequiredGrams,
    minCapacityRequiredFormatted,
    minCapacityFactorE,
    ratioED,
    isIntervalValid,
    errorReasons: errors,
    warnings,
    eligibleClasses,
  };
}
