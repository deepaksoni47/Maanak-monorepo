import { Decimal } from "decimal.js";
import { AccuracyClass, UnitOfMeasurement, ScaleClassificationResult } from "@maanak/types";
import { RulePack, Table3ClassLimit, loadDefaultRulePack } from "./loader.js";

// Unit conversion factors to kilograms (kg)
const UNIT_TO_KG_FACTORS: Record<UnitOfMeasurement, Decimal> = {
  kg: new Decimal("1"),
  g: new Decimal("0.001"),
  mg: new Decimal("0.000001"),
  t: new Decimal("1000"),
  ct: new Decimal("0.0002"),
};

export interface MassValue {
  value: Decimal;
  unit: UnitOfMeasurement;
  valueInKg: Decimal;
}

export interface ClassifyInstrumentOptions {
  unit?: UnitOfMeasurement;
  eUnit?: UnitOfMeasurement;
  dUnit?: UnitOfMeasurement;
  minCapacity?: string | number | Decimal;
  minCapacityUnit?: UnitOfMeasurement;
  rulePack?: RulePack;
}

export interface InstrumentClassificationResult extends ScaleClassificationResult {
  n: number;
  minAllowedN: number;
  minAllowedNString: string;
  maxAllowedN: number | null;
  maxAllowedNString: string;
  minCapacityFactorE: number;
  minCapacityRequiredInKg: string;
  eInKg: string;
  maxInKg: string;
}

/**
 * Parses a mass string or number (e.g. "15 kg", "5000 g", "1.5mg", 15) into a structured Decimal mass.
 */
export function parseMass(
  input: string | number | Decimal,
  defaultUnit: UnitOfMeasurement = "kg",
): MassValue {
  if (input instanceof Decimal || (typeof input === "object" && input !== null && "isDecimal" in input)) {
    const dec = input instanceof Decimal ? input : new Decimal((input as any).toString());
    const factor = UNIT_TO_KG_FACTORS[defaultUnit];
    return {
      value: dec,
      unit: defaultUnit,
      valueInKg: dec.mul(factor),
    };
  }

  if (typeof input === "number") {
    const dec = new Decimal(input);
    const factor = UNIT_TO_KG_FACTORS[defaultUnit];
    return {
      value: dec,
      unit: defaultUnit,
      valueInKg: dec.mul(factor),
    };
  }

  const trimmed = input.trim();
  const match = trimmed.match(/^([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*([a-zA-Z]+)?$/);

  if (!match) {
    throw new Error(`Invalid mass format: "${input}"`);
  }

  const numPart = match[1];
  const unitPart = (match[2]?.toLowerCase() as UnitOfMeasurement) || defaultUnit;

  if (!UNIT_TO_KG_FACTORS[unitPart]) {
    throw new Error(`Unsupported unit of measurement: "${match[2]}" in "${input}"`);
  }

  const decVal = new Decimal(numPart);
  const factor = UNIT_TO_KG_FACTORS[unitPart];

  return {
    value: decVal,
    unit: unitPart,
    valueInKg: decVal.mul(factor),
  };
}

/**
 * Normalizes an accuracy class input to "I" | "II" | "III" | "IIII".
 */
export function normalizeAccuracyClass(
  accuracyClass: AccuracyClass | "I" | "II" | "III" | "IIII" | "CLASS_I" | "CLASS_II" | "CLASS_III" | "CLASS_IIII",
): "I" | "II" | "III" | "IIII" {
  switch (accuracyClass) {
    case AccuracyClass.CLASS_I:
    case "CLASS_I":
    case "I":
      return "I";
    case AccuracyClass.CLASS_II:
    case "CLASS_II":
    case "II":
      return "II";
    case AccuracyClass.CLASS_III:
    case "CLASS_III":
    case "III":
      return "III";
    case AccuracyClass.CLASS_IIII:
    case "CLASS_IIII":
    case "IIII":
      return "IIII";
    default:
      throw new Error(`Unknown accuracy class: ${accuracyClass}`);
  }
}

/**
 * Finds the matching Table 3 tier for a given verification scale interval (e) in kg.
 */
export function findMatchingTable3Tier(
  eInKg: Decimal,
  classLimits: Table3ClassLimit[],
): Table3ClassLimit | undefined {
  return classLimits.find((tier) => {
    const minE = new Decimal(tier.minVerificationScaleInterval);
    if (eInKg.lt(minE)) {
      return false;
    }
    if (tier.maxVerificationScaleInterval) {
      const maxE = new Decimal(tier.maxVerificationScaleInterval);
      if (eInKg.gt(maxE)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Classifies a Non-Automatic Weighing Instrument (NAWI) against OIML R 76-1 Table 3.
 *
 * Formula: n = Max / e
 * Validates:
 * 1. d <= e <= 10d constraint (OIML R 76-1 Cl 3.4.2)
 * 2. e is within permissible verification scale interval range for the requested class
 * 3. n falls within [n_min, n_max] for that tier
 * 4. Min capacity (if provided) satisfies Min >= minCapacityFactorE * e
 */
export function classifyInstrument(
  max: string | number | Decimal,
  e: string | number | Decimal,
  d: string | number | Decimal,
  accuracyClass: AccuracyClass | "I" | "II" | "III" | "IIII" | "CLASS_I" | "CLASS_II" | "CLASS_III" | "CLASS_IIII",
  options: ClassifyInstrumentOptions = {},
): InstrumentClassificationResult {
  const normClass = normalizeAccuracyClass(accuracyClass);
  const enumClass = (AccuracyClass[`CLASS_${normClass}` as keyof typeof AccuracyClass] ||
    normClass) as AccuracyClass;

  const rulePack = options.rulePack || loadDefaultRulePack();
  const classTiers = rulePack.table3Classification[normClass];

  const parsedMax = parseMass(max, options.unit || "kg");
  const parsedE = parseMass(e, options.eUnit || options.unit || "kg");
  const parsedD = parseMass(d, options.dUnit || options.eUnit || options.unit || "kg");

  if (parsedMax.valueInKg.lte(0)) {
    return {
      valid: false,
      accuracyClass: enumClass,
      scaleDivisionsN: "0",
      n: 0,
      minAllowedN: 0,
      minAllowedNString: "0",
      maxAllowedN: 0,
      maxAllowedNString: "0",
      minCapacityFactorE: 0,
      minCapacityRequiredInKg: "0",
      eInKg: parsedE.valueInKg.toString(),
      maxInKg: parsedMax.valueInKg.toString(),
      errorReason: "Maximum capacity (Max) must be strictly positive (> 0)",
    };
  }

  if (parsedE.valueInKg.lte(0)) {
    return {
      valid: false,
      accuracyClass: enumClass,
      scaleDivisionsN: "0",
      n: 0,
      minAllowedN: 0,
      minAllowedNString: "0",
      maxAllowedN: 0,
      maxAllowedNString: "0",
      minCapacityFactorE: 0,
      minCapacityRequiredInKg: "0",
      eInKg: "0",
      maxInKg: parsedMax.valueInKg.toString(),
      errorReason: "Verification scale interval (e) must be strictly positive (> 0)",
    };
  }

  // Check d <= e <= 10d constraint (OIML R 76-1 Cl 3.4.2)
  if (parsedD.valueInKg.gt(parsedE.valueInKg)) {
    return {
      valid: false,
      accuracyClass: enumClass,
      scaleDivisionsN: "0",
      n: 0,
      minAllowedN: 0,
      minAllowedNString: "0",
      maxAllowedN: 0,
      maxAllowedNString: "0",
      minCapacityFactorE: 0,
      minCapacityRequiredInKg: "0",
      eInKg: parsedE.valueInKg.toString(),
      maxInKg: parsedMax.valueInKg.toString(),
      errorReason: `Actual scale interval d (${parsedD.valueInKg.toString()} kg) cannot exceed verification scale interval e (${parsedE.valueInKg.toString()} kg)`,
    };
  }

  const tenD = parsedD.valueInKg.mul(10);
  if (parsedE.valueInKg.gt(tenD)) {
    return {
      valid: false,
      accuracyClass: enumClass,
      scaleDivisionsN: "0",
      n: 0,
      minAllowedN: 0,
      minAllowedNString: "0",
      maxAllowedN: 0,
      maxAllowedNString: "0",
      minCapacityFactorE: 0,
      minCapacityRequiredInKg: "0",
      eInKg: parsedE.valueInKg.toString(),
      maxInKg: parsedMax.valueInKg.toString(),
      errorReason: `Verification scale interval e (${parsedE.valueInKg.toString()} kg) exceeds maximum auxiliary limit 10d (${tenD.toString()} kg)`,
    };
  }

  // Calculate n = Max / e
  const nDecimal = parsedMax.valueInKg.div(parsedE.valueInKg);
  const nNumber = nDecimal.toNumber();
  const nStr = nDecimal.toString();

  // Find matching tier in Table 3 for e
  const matchingTier = findMatchingTable3Tier(parsedE.valueInKg, classTiers);

  if (!matchingTier) {
    return {
      valid: false,
      accuracyClass: enumClass,
      scaleDivisionsN: nStr,
      n: nNumber,
      minAllowedN: 0,
      minAllowedNString: "0",
      maxAllowedN: null,
      maxAllowedNString: "0",
      minCapacityFactorE: 0,
      minCapacityRequiredInKg: "0",
      eInKg: parsedE.valueInKg.toString(),
      maxInKg: parsedMax.valueInKg.toString(),
      errorReason: `Verification scale interval e = ${parsedE.valueInKg.toString()} kg is not permitted for Accuracy Class ${normClass} per OIML R 76-1 Table 3`,
    };
  }

  const minN = matchingTier.minVerificationScaleDivisionsN;
  const maxN = matchingTier.maxVerificationScaleDivisionsN;
  const minCapFactor = matchingTier.minCapacityFactorE;
  const minCapRequiredInKg = parsedE.valueInKg.mul(minCapFactor).toString();

  const minAllowedNStr = minN.toString();
  const maxAllowedNStr = maxN !== null ? maxN.toString() : "Infinity";

  if (nNumber < minN) {
    return {
      valid: false,
      accuracyClass: enumClass,
      scaleDivisionsN: nStr,
      n: nNumber,
      minAllowedN: minN,
      minAllowedNString: minAllowedNStr,
      maxAllowedN: maxN,
      maxAllowedNString: maxAllowedNStr,
      minCapacityFactorE: minCapFactor,
      minCapacityRequiredInKg: minCapRequiredInKg,
      eInKg: parsedE.valueInKg.toString(),
      maxInKg: parsedMax.valueInKg.toString(),
      errorReason: `Scale division count n = ${nStr} is below minimum allowed ${minN} for Accuracy Class ${normClass} per Table 3`,
    };
  }

  if (maxN !== null && nNumber > maxN) {
    return {
      valid: false,
      accuracyClass: enumClass,
      scaleDivisionsN: nStr,
      n: nNumber,
      minAllowedN: minN,
      minAllowedNString: minAllowedNStr,
      maxAllowedN: maxN,
      maxAllowedNString: maxAllowedNStr,
      minCapacityFactorE: minCapFactor,
      minCapacityRequiredInKg: minCapRequiredInKg,
      eInKg: parsedE.valueInKg.toString(),
      maxInKg: parsedMax.valueInKg.toString(),
      errorReason: `Scale division count n = ${nStr} exceeds maximum allowed ${maxN} for Accuracy Class ${normClass} per Table 3`,
    };
  }

  // Validate minimum capacity if provided
  if (options.minCapacity !== undefined && options.minCapacity !== null) {
    const parsedMin = parseMass(options.minCapacity, options.minCapacityUnit || options.unit || "kg");
    const reqMinDecimal = new Decimal(minCapRequiredInKg);

    if (parsedMin.valueInKg.lt(reqMinDecimal)) {
      return {
        valid: false,
        accuracyClass: enumClass,
        scaleDivisionsN: nStr,
        n: nNumber,
        minAllowedN: minN,
        minAllowedNString: minAllowedNStr,
        maxAllowedN: maxN,
        maxAllowedNString: maxAllowedNStr,
        minCapacityFactorE: minCapFactor,
        minCapacityRequiredInKg: minCapRequiredInKg,
        eInKg: parsedE.valueInKg.toString(),
        maxInKg: parsedMax.valueInKg.toString(),
        errorReason: `Declared minimum capacity Min (${parsedMin.valueInKg.toString()} kg) is below required ${minCapFactor}e (${minCapRequiredInKg} kg) for Accuracy Class ${normClass}`,
      };
    }
  }

  return {
    valid: true,
    accuracyClass: enumClass,
    scaleDivisionsN: nStr,
    n: nNumber,
    minAllowedN: minN,
    minAllowedNString: minAllowedNStr,
    maxAllowedN: maxN,
    maxAllowedNString: maxAllowedNStr,
    minCapacityFactorE: minCapFactor,
    minCapacityRequiredInKg: minCapRequiredInKg,
    eInKg: parsedE.valueInKg.toString(),
    maxInKg: parsedMax.valueInKg.toString(),
  };
}
