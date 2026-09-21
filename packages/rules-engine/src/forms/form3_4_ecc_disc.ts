import { Decimal, toDecimal, sub, abs, div, mul, lte, gte, toFixed, DecimalValue } from "../math.js";
import { parseMass, normalizeAccuracyClass } from "../classifier.js";
import { getMpe, MpeEvaluationMode } from "../mpe.js";
import { calculateIndicationP, calculateRawErrorE } from "../vernier.js";
import { calculateCorrectedErrorEc, evaluateCompliance } from "../corrector.js";
import { AccuracyClass, UnitOfMeasurement, ComplianceStatus } from "@maanak/types";
import { RulePack, loadDefaultRulePack } from "../loader.js";

// Standard labels for 5-position receptor per OIML R 76-1 Clause 3.6.2
const STANDARD_ECCENTRICITY_LABELS: Record<number, string> = {
  1: "Position 1 (Center)",
  2: "Position 2 (Top-Left / Front-Left)",
  3: "Position 3 (Top-Right / Front-Right)",
  4: "Position 4 (Bottom-Right / Rear-Right)",
  5: "Position 5 (Bottom-Left / Rear-Left)",
};

/* ========================================================================= */
/*                      FORM 3: ECCENTRICITY (CORNER LOAD)                  */
/* ========================================================================= */

export interface Form3EccentricityObservation {
  id?: string;
  positionNumber: number; // 1 to 5 (1=Center, 2..5=Corners)
  positionLabel?: string;
  loadMass: DecimalValue | string | number; // Test load L ~ 1/3 Max
  indicatedValue: DecimalValue | string | number; // Indication I
  turningPointDeltaL: DecimalValue | string | number; // Vernier delta L
  unit?: UnitOfMeasurement;
}

export interface Form3ZeroInput {
  indicatedValue: DecimalValue | string | number;
  turningPointDeltaL: DecimalValue | string | number;
  unit?: UnitOfMeasurement;
}

export interface Form3EvaluatorOptions {
  accuracyClass: AccuracyClass | "I" | "II" | "III" | "IIII" | "CLASS_I" | "CLASS_II" | "CLASS_III" | "CLASS_IIII";
  e: DecimalValue | string | number;
  unit?: UnitOfMeasurement;
  zeroObservation?: Form3ZeroInput;
  fractionFactorPi?: DecimalValue | string | number;
  mode?: MpeEvaluationMode;
  rulePack?: RulePack;
}

export interface Form3EvaluatedPosition {
  id?: string;
  positionNumber: number;
  positionLabel: string;
  loadMass: string;
  loadMassInKg: string;
  indicatedValue: string;
  turningPointDeltaL: string;
  indicatedP: string;
  rawErrorE: string;
  rawErrorEInG: string;
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

export interface Form3EccentricityResult {
  pass: boolean;
  status: ComplianceStatus;
  accuracyClass: AccuracyClass;
  e: string;
  eInKg: string;
  zeroErrorE0: string;
  zeroErrorE0InG: string;
  positions: Form3EvaluatedPosition[];
  maxObservedEc: {
    positionNumber: number;
    positionLabel: string;
    correctedErrorEc: string;
    mpeInMass: string;
    percentageOfMpe: string;
  };
  maxSpreadEc: string; // Ec,max - Ec,min
  maxSpreadEcInG: string;
  totalPositionsEvaluated: number;
  totalPositionsFailed: number;
  summary: string;
}

/**
 * Evaluates Form 3: Eccentricity / Corner Loading per OIML R 76-1 Clause 3.6.2 and Annex A.4.7.
 *
 * Mathematical & Regulatory Specifications:
 * 1. Initial zero-load error E0:
 *    P0 = I0 + 0.5e - deltaL0
 *    E0 = P0 - 0
 * 2. For each position (Center + 4 corners / quadrants):
 *    P_p = I_p + 0.5e - deltaL_p
 *    E_p = P_p - L_p
 *    Ec_p = E_p - E0
 * 3. Compliance:
 *    |Ec_p| <= |MPE(L_p)| across every evaluated position.
 */
export function evaluateForm3Eccentricity(
  observations: Form3EccentricityObservation[],
  options: Form3EvaluatorOptions,
): Form3EccentricityResult {
  if (!observations || observations.length === 0) {
    throw new Error("Form 3 evaluation requires at least one eccentricity observation.");
  }

  const defaultUnit = options.unit || "kg";
  const normClass = normalizeAccuracyClass(options.accuracyClass);
  const enumClass = (AccuracyClass[`CLASS_${normClass}` as keyof typeof AccuracyClass] ||
    normClass) as AccuracyClass;
  const mode: MpeEvaluationMode = options.mode || "initialVerification";
  const rulePack = options.rulePack || loadDefaultRulePack();
  const fractionFactor = options.fractionFactorPi ? toDecimal(options.fractionFactorPi) : new Decimal(1);

  const parsedE = parseMass(options.e as any, defaultUnit);
  const eKg = parsedE.valueInKg;

  // 1. Calculate E0 from zero observation
  let zeroErrorE0Kg = new Decimal(0);
  if (options.zeroObservation) {
    const zeroI = parseMass(options.zeroObservation.indicatedValue as any, options.zeroObservation.unit || defaultUnit);
    const zeroDeltaL = parseMass(options.zeroObservation.turningPointDeltaL as any, options.zeroObservation.unit || defaultUnit);
    const pZero = calculateIndicationP(zeroI.valueInKg, zeroDeltaL.valueInKg, eKg, { unit: "kg" });
    zeroErrorE0Kg = calculateRawErrorE(pZero, new Decimal(0), { unit: "kg" });
  }

  const zeroErrorE0Str = toFixed(zeroErrorE0Kg);
  const zeroErrorE0InGStr = toFixed(mul(zeroErrorE0Kg, "1000"));

  let totalPositionsEvaluated = 0;
  let totalPositionsFailed = 0;

  // 2. Evaluate each position
  const evaluatedPositions: Form3EvaluatedPosition[] = observations.map((obs) => {
    totalPositionsEvaluated++;
    const obsUnit = obs.unit || defaultUnit;
    const parsedL = parseMass(obs.loadMass as any, obsUnit);
    const parsedI = parseMass(obs.indicatedValue as any, obsUnit);
    const parsedDeltaL = parseMass(obs.turningPointDeltaL as any, obsUnit);

    const posNumber = obs.positionNumber;
    const posLabel = obs.positionLabel || STANDARD_ECCENTRICITY_LABELS[posNumber] || `Position ${posNumber}`;

    // P = I + 0.5e - deltaL
    const pKg = calculateIndicationP(parsedI.valueInKg, parsedDeltaL.valueInKg, eKg, { unit: "kg" });
    // E = P - L
    const rawEKg = calculateRawErrorE(pKg, parsedL.valueInKg, { unit: "kg" });
    // Ec = E - E0
    const ecKg = calculateCorrectedErrorEc(rawEKg, zeroErrorE0Kg, { unit: "kg" });

    // MPE from Table 6
    const mpeRes = getMpe(parsedL.valueInKg, eKg, normClass, {
      unit: "kg",
      mode,
      rulePack,
    });

    // Apportioned MPE if module testing (pi)
    let finalMpeKg = toDecimal(mpeRes.mpeInMass);
    if (!fractionFactor.eq(1)) {
      finalMpeKg = mul(finalMpeKg, fractionFactor);
    }

    const compliance = evaluateCompliance(ecKg, finalMpeKg, { unit: "kg" });
    if (!compliance.pass) {
      totalPositionsFailed++;
    }

    return {
      id: obs.id,
      positionNumber: posNumber,
      positionLabel: posLabel,
      loadMass: toFixed(parsedL.valueInKg),
      loadMassInKg: toFixed(parsedL.valueInKg),
      indicatedValue: toFixed(parsedI.valueInKg),
      turningPointDeltaL: toFixed(parsedDeltaL.valueInKg),
      indicatedP: toFixed(pKg),
      rawErrorE: toFixed(rawEKg),
      rawErrorEInG: toFixed(mul(rawEKg, "1000")),
      zeroErrorE0: zeroErrorE0Str,
      correctedErrorEc: toFixed(ecKg),
      correctedErrorEcInG: toFixed(mul(ecKg, "1000")),
      correctedErrorEcInDivisions: toFixed(div(ecKg, eKg)),
      mpeInMass: toFixed(finalMpeKg),
      mpeInE: mpeRes.mpeInE,
      stepBracket: mpeRes.stepBracket,
      pass: compliance.pass,
      status: compliance.status,
      ratioToMpe: compliance.ratioToMpe,
      percentageOfMpe: compliance.percentageOfMpe,
      margin: compliance.margin,
    };
  });

  // Find worst position and spread
  let worstPosition: Form3EvaluatedPosition | undefined;
  let minEcKg: Decimal | undefined;
  let maxEcKg: Decimal | undefined;

  for (const pos of evaluatedPositions) {
    const ecVal = toDecimal(pos.correctedErrorEc);
    if (minEcKg === undefined || ecVal.lt(minEcKg)) minEcKg = ecVal;
    if (maxEcKg === undefined || ecVal.gt(maxEcKg)) maxEcKg = ecVal;

    if (!worstPosition || toDecimal(pos.ratioToMpe).gt(toDecimal(worstPosition.ratioToMpe))) {
      worstPosition = pos;
    }
  }

  const spreadKg = maxEcKg !== undefined && minEcKg !== undefined ? sub(maxEcKg, minEcKg) : new Decimal(0);
  const isOverallPass = totalPositionsFailed === 0 && totalPositionsEvaluated > 0;
  const overallStatus = isOverallPass ? ComplianceStatus.PASS : ComplianceStatus.FAIL;

  const defaultWorst = {
    positionNumber: 1,
    positionLabel: STANDARD_ECCENTRICITY_LABELS[1],
    correctedErrorEc: "0",
    mpeInMass: "0",
    percentageOfMpe: "0%",
  };

  const summary = isOverallPass
    ? `Eccentricity (Form 3): PASS. All ${totalPositionsEvaluated} positions within tolerance. Worst |Ec|: ${worstPosition?.correctedErrorEc ?? "0"} kg (${worstPosition?.percentageOfMpe ?? "0%"} MPE) at ${worstPosition?.positionLabel ?? "Position 1"}. Inter-corner spread: ${toFixed(mul(spreadKg, "1000"))} g.`
    : `Eccentricity (Form 3): FAIL. ${totalPositionsFailed} of ${totalPositionsEvaluated} positions exceeded tolerance. Worst |Ec|: ${worstPosition?.correctedErrorEc ?? "0"} kg (${worstPosition?.percentageOfMpe ?? "0%"} MPE) at ${worstPosition?.positionLabel ?? "Position 1"}.`;

  return {
    pass: isOverallPass,
    status: overallStatus,
    accuracyClass: enumClass,
    e: toFixed(eKg),
    eInKg: toFixed(eKg),
    zeroErrorE0: zeroErrorE0Str,
    zeroErrorE0InG: zeroErrorE0InGStr,
    positions: evaluatedPositions,
    maxObservedEc: worstPosition
      ? {
          positionNumber: worstPosition.positionNumber,
          positionLabel: worstPosition.positionLabel,
          correctedErrorEc: worstPosition.correctedErrorEc,
          mpeInMass: worstPosition.mpeInMass,
          percentageOfMpe: worstPosition.percentageOfMpe,
        }
      : defaultWorst,
    maxSpreadEc: toFixed(spreadKg),
    maxSpreadEcInG: toFixed(mul(spreadKg, "1000")),
    totalPositionsEvaluated,
    totalPositionsFailed,
    summary,
  };
}

/* ========================================================================= */
/*                      FORM 4: DISCRIMINATION (1.4d)                        */
/* ========================================================================= */

export interface Form4DiscriminationObservation {
  id?: string;
  loadPointLabel?: string; // e.g. "Min", "1/2 Max", "Max"
  appliedLoad: DecimalValue | string | number;
  initialIndicationI1: DecimalValue | string | number;
  addedLoadDeltaL: DecimalValue | string | number; // Extra load 1.4d added gently
  finalIndicationI2: DecimalValue | string | number;
  actualIntervalD?: DecimalValue | string | number; // Scale interval d
  unit?: UnitOfMeasurement;
}

export interface Form4EvaluatorOptions {
  d: DecimalValue | string | number; // actual scale interval d
  unit?: UnitOfMeasurement;
}

export interface Form4EvaluatedStep {
  id?: string;
  loadPointLabel: string;
  appliedLoad: string;
  appliedLoadInKg: string;
  actualIntervalD: string;
  actualIntervalDInKg: string;
  initialIndicationI1: string;
  addedLoadDeltaL: string;
  finalIndicationI2: string;
  indicationChangeDeltaI: string;
  expectedMinChangeDeltaI: string; // >= 1d
  expectedAddedLoad: string; // 1.4d
  pass: boolean;
  status: ComplianceStatus;
}

export interface Form4DiscriminationResult {
  pass: boolean;
  status: ComplianceStatus;
  actualIntervalD: string;
  actualIntervalDInKg: string;
  steps: Form4EvaluatedStep[];
  totalStepsEvaluated: number;
  totalStepsFailed: number;
  summary: string;
}

/**
 * Evaluates Form 4: Discrimination per OIML R 76-1 Clause 3.8 and Annex A.4.8.
 *
 * Mathematical & Regulatory Specifications:
 * 1. An additional load equal to 1.4d gently placed on the receptor at equilibrium
 *    shall increase the digital indication by at least 1d:
 *    Delta I = I2 - I1 >= d
 * 2. Evaluated at Min, 1/2 Max, and Max.
 */
export function evaluateForm4Discrimination(
  observations: Form4DiscriminationObservation[],
  options: Form4EvaluatorOptions,
): Form4DiscriminationResult {
  if (!observations || observations.length === 0) {
    throw new Error("Form 4 evaluation requires at least one discrimination observation.");
  }

  const defaultUnit = options.unit || "kg";
  const defaultParsedD = parseMass(options.d as any, defaultUnit);
  const defaultDKg = defaultParsedD.valueInKg;

  let totalStepsEvaluated = 0;
  let totalStepsFailed = 0;

  const steps: Form4EvaluatedStep[] = observations.map((obs, idx) => {
    totalStepsEvaluated++;
    const obsUnit = obs.unit || defaultUnit;

    const parsedLoad = parseMass(obs.appliedLoad as any, obsUnit);
    const parsedI1 = parseMass(obs.initialIndicationI1 as any, obsUnit);
    const parsedI2 = parseMass(obs.finalIndicationI2 as any, obsUnit);
    const parsedAddedLoad = parseMass(obs.addedLoadDeltaL as any, obsUnit);

    const stepDKg = obs.actualIntervalD ? parseMass(obs.actualIntervalD as any, obsUnit).valueInKg : defaultDKg;

    // Delta I = I2 - I1
    const deltaIKg = sub(parsedI2.valueInKg, parsedI1.valueInKg);
    // Expected minimum change = 1.0 * d
    const expectedMinChangeKg = stepDKg;
    // Expected added load = 1.4 * d
    const expectedAddedLoadKg = mul("1.4", stepDKg);

    // Pass condition: Delta I >= d (indication changed by at least +1d)
    const isPass = gte(deltaIKg, expectedMinChangeKg);
    if (!isPass) {
      totalStepsFailed++;
    }

    const label = obs.loadPointLabel || `Load Step ${idx + 1} (${toFixed(parsedLoad.valueInKg)} kg)`;

    return {
      id: obs.id,
      loadPointLabel: label,
      appliedLoad: toFixed(parsedLoad.valueInKg),
      appliedLoadInKg: toFixed(parsedLoad.valueInKg),
      actualIntervalD: toFixed(stepDKg),
      actualIntervalDInKg: toFixed(stepDKg),
      initialIndicationI1: toFixed(parsedI1.valueInKg),
      addedLoadDeltaL: toFixed(parsedAddedLoad.valueInKg),
      finalIndicationI2: toFixed(parsedI2.valueInKg),
      indicationChangeDeltaI: toFixed(deltaIKg),
      expectedMinChangeDeltaI: toFixed(expectedMinChangeKg),
      expectedAddedLoad: toFixed(expectedAddedLoadKg),
      pass: isPass,
      status: isPass ? ComplianceStatus.PASS : ComplianceStatus.FAIL,
    };
  });

  const isOverallPass = totalStepsFailed === 0 && totalStepsEvaluated > 0;
  const overallStatus = isOverallPass ? ComplianceStatus.PASS : ComplianceStatus.FAIL;

  const summary = isOverallPass
    ? `Discrimination (Form 4): PASS. All ${totalStepsEvaluated} load steps demonstrated >= 1d indication increase when 1.4d was placed.`
    : `Discrimination (Form 4): FAIL. ${totalStepsFailed} of ${totalStepsEvaluated} load steps failed to increase indication by at least 1d upon adding 1.4d.`;

  return {
    pass: isOverallPass,
    status: overallStatus,
    actualIntervalD: toFixed(defaultDKg),
    actualIntervalDInKg: toFixed(defaultDKg),
    steps,
    totalStepsEvaluated,
    totalStepsFailed,
    summary,
  };
}
