import { Decimal, toDecimal, sub, abs, div, mul, lte, toFixed, DecimalValue } from "../math.js";
import { parseMass, normalizeAccuracyClass } from "../classifier.js";
import { getMpe, MpeEvaluationMode } from "../mpe.js";
import { calculateIndicationP, calculateRawErrorE } from "../vernier.js";
import { calculateCorrectedErrorEc } from "../corrector.js";
import { AccuracyClass, UnitOfMeasurement, ComplianceStatus } from "@maanak/types";
import { RulePack, loadDefaultRulePack } from "../loader.js";

/* ========================================================================= */
/*                      FORM 5: REPEATABILITY (CLAUSE A.4.10)                */
/* ========================================================================= */

export interface Form5ObservationInput {
  id?: string;
  repetitionIndex: number; // 1 to 10
  loadMass: DecimalValue | string | number; // e.g. 7.5 kg or 15 kg
  indicatedValue: DecimalValue | string | number;
  turningPointDeltaL: DecimalValue | string | number;
  zeroIndication?: DecimalValue | string | number;
  zeroDeltaL?: DecimalValue | string | number;
  unit?: UnitOfMeasurement;
}

export interface Form5ZeroObservation {
  indicatedValue: DecimalValue | string | number;
  turningPointDeltaL: DecimalValue | string | number;
  unit?: UnitOfMeasurement;
}

export interface Form5SeriesInput {
  seriesLabel?: string; // e.g. "Series 1: ~0.5 Max" or "Series 2: Max"
  nominalLoadMass: DecimalValue | string | number;
  observations: Form5ObservationInput[];
  zeroObservation?: Form5ZeroObservation;
}

export interface Form5EvaluatorOptions {
  accuracyClass: AccuracyClass | "I" | "II" | "III" | "IIII" | "CLASS_I" | "CLASS_II" | "CLASS_III" | "CLASS_IIII";
  e: DecimalValue | string | number;
  unit?: UnitOfMeasurement;
  fractionFactorPi?: DecimalValue | string | number; // default 1.0
  mode?: MpeEvaluationMode;
  rulePack?: RulePack;
}

export interface Form5EvaluatedRepetition {
  repetitionIndex: number;
  loadMass: string;
  loadMassInKg: string;
  indicatedValue: string;
  turningPointDeltaL: string;
  indicatedP: string;
  rawErrorE: string;
  zeroErrorE0: string;
  correctedErrorEc: string;
  correctedErrorEcInG: string;
  pass: boolean;
}

export interface Form5SeriesResult {
  seriesLabel: string;
  nominalLoadMass: string;
  nominalLoadMassInKg: string;
  mpeInMass: string;
  mpeInE: string;
  repetitions: Form5EvaluatedRepetition[];
  pMax: string;
  pMin: string;
  errorSpread: string; // Pmax - Pmin = Emax - Emin
  errorSpreadInG: string;
  errorSpreadInDivisions: string;
  isSpreadValid: boolean; // spread <= |MPE|
  maxCorrectedErrorEc: string;
  isMaxErrorValid: boolean; // |Ec| <= |MPE|
  pass: boolean;
  status: ComplianceStatus;
  percentageOfMpe: string;
  margin: string;
}

export interface Form5RepeatabilityResult {
  pass: boolean;
  status: ComplianceStatus;
  accuracyClass: AccuracyClass;
  e: string;
  eInKg: string;
  series: Form5SeriesResult[];
  totalSeriesEvaluated: number;
  totalSeriesFailed: number;
  summary: string;
}

/**
 * Evaluates Form 5: Repeatability per OIML R 76-1 Clause 3.6.1 and Annex A.4.10.
 *
 * Mathematical & Regulatory Specifications:
 * 1. Two test series: typically at ~0.5 Max and Max (at least 3 to 10 weighings each).
 * 2. Range of error / spread:
 *    Delta E_rep = P_max - P_min = E_max - E_min
 * 3. Compliance:
 *    Delta E_rep <= |MPE(L)|
 *    And each individual error |Ec| <= |MPE(L)|.
 */
export function evaluateForm5Repeatability(
  seriesInputs: Form5SeriesInput[] | Form5SeriesInput,
  options: Form5EvaluatorOptions,
): Form5RepeatabilityResult {
  const seriesArray = Array.isArray(seriesInputs) ? seriesInputs : [seriesInputs];
  if (seriesArray.length === 0) {
    throw new Error("Form 5 evaluation requires at least one repeatability test series.");
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

  let totalSeriesEvaluated = 0;
  let totalSeriesFailed = 0;

  const evaluatedSeries: Form5SeriesResult[] = seriesArray.map((series, sIdx) => {
    totalSeriesEvaluated++;
    const sUnit = defaultUnit;
    const nominalL = parseMass(series.nominalLoadMass as any, sUnit);

    // Initial zero for this series if provided
    let seriesZeroE0Kg = new Decimal(0);
    if (series.zeroObservation) {
      const zI = parseMass(series.zeroObservation.indicatedValue as any, series.zeroObservation.unit || sUnit);
      const zDeltaL = parseMass(series.zeroObservation.turningPointDeltaL as any, series.zeroObservation.unit || sUnit);
      const pZ = calculateIndicationP(zI.valueInKg, zDeltaL.valueInKg, eKg, { unit: "kg" });
      seriesZeroE0Kg = calculateRawErrorE(pZ, new Decimal(0), { unit: "kg" });
    }

    // Applicable MPE for this load
    const mpeRes = getMpe(nominalL.valueInKg, eKg, normClass, {
      unit: "kg",
      mode,
      rulePack,
    });

    let mpeKg = toDecimal(mpeRes.mpeInMass);
    if (!fractionFactor.eq(1)) {
      mpeKg = mul(mpeKg, fractionFactor);
    }

    if (series.observations.length === 0) {
      throw new Error(`Repeatability series ${sIdx + 1} contains no observations.`);
    }

    let pMaxKg: Decimal | undefined;
    let pMinKg: Decimal | undefined;
    let maxEcKg: Decimal = new Decimal(0);
    let allPointsPass = true;

    const evaluatedReps: Form5EvaluatedRepetition[] = series.observations.map((obs) => {
      const obsUnit = obs.unit || sUnit;
      const parsedObsL = parseMass(obs.loadMass as any, obsUnit);
      const parsedI = parseMass(obs.indicatedValue as any, obsUnit);
      const parsedDeltaL = parseMass(obs.turningPointDeltaL as any, obsUnit);

      // Repetition-specific zero if provided, else series zero
      let repZeroE0Kg = seriesZeroE0Kg;
      if (obs.zeroIndication !== undefined && obs.zeroDeltaL !== undefined) {
        const zI = parseMass(obs.zeroIndication as any, obsUnit);
        const zDeltaL = parseMass(obs.zeroDeltaL as any, obsUnit);
        const pZ = calculateIndicationP(zI.valueInKg, zDeltaL.valueInKg, eKg, { unit: "kg" });
        repZeroE0Kg = calculateRawErrorE(pZ, new Decimal(0), { unit: "kg" });
      }

      // P = I + 0.5e - deltaL
      const pKg = calculateIndicationP(parsedI.valueInKg, parsedDeltaL.valueInKg, eKg, { unit: "kg" });
      // E = P - L
      const rawEKg = calculateRawErrorE(pKg, parsedObsL.valueInKg, { unit: "kg" });
      // Ec = E - E0
      const ecKg = calculateCorrectedErrorEc(rawEKg, repZeroE0Kg, { unit: "kg" });

      if (pMaxKg === undefined || pKg.gt(pMaxKg)) pMaxKg = pKg;
      if (pMinKg === undefined || pKg.lt(pMinKg)) pMinKg = pKg;

      const absEcKg = abs(ecKg);
      if (absEcKg.gt(maxEcKg)) maxEcKg = absEcKg;

      // Individual compliance: |Ec| <= MPE
      const isPointPass = lte(absEcKg, mpeKg);
      if (!isPointPass) {
        allPointsPass = false;
      }

      return {
        repetitionIndex: obs.repetitionIndex,
        loadMass: toFixed(parsedObsL.valueInKg),
        loadMassInKg: toFixed(parsedObsL.valueInKg),
        indicatedValue: toFixed(parsedI.valueInKg),
        turningPointDeltaL: toFixed(parsedDeltaL.valueInKg),
        indicatedP: toFixed(pKg),
        rawErrorE: toFixed(rawEKg),
        zeroErrorE0: toFixed(repZeroE0Kg),
        correctedErrorEc: toFixed(ecKg),
        correctedErrorEcInG: toFixed(mul(ecKg, "1000")),
        pass: isPointPass,
      };
    });

    // Spread = Pmax - Pmin
    const spreadKg = pMaxKg !== undefined && pMinKg !== undefined ? sub(pMaxKg, pMinKg) : new Decimal(0);
    const spreadDivisions = div(spreadKg, eKg);

    // Spread condition: spread <= MPE
    const isSpreadValid = lte(spreadKg, mpeKg);
    // Point errors condition: max |Ec| <= MPE
    const isMaxErrorValid = lte(maxEcKg, mpeKg);

    const isSeriesPass = isSpreadValid && isMaxErrorValid && allPointsPass;
    if (!isSeriesPass) {
      totalSeriesFailed++;
    }

    const ratioVal = mpeKg.isZero() ? new Decimal(0) : div(spreadKg, mpeKg);
    const percentageOfMpe = `${toFixed(mul(ratioVal, "100"), 2)}%`;
    const marginKg = sub(mpeKg, spreadKg);

    return {
      seriesLabel: series.seriesLabel || `Series ${sIdx + 1} (${toFixed(nominalL.valueInKg)} kg)`,
      nominalLoadMass: toFixed(nominalL.valueInKg),
      nominalLoadMassInKg: toFixed(nominalL.valueInKg),
      mpeInMass: toFixed(mpeKg),
      mpeInE: mpeRes.mpeInE,
      repetitions: evaluatedReps,
      pMax: toFixed(pMaxKg ?? new Decimal(0)),
      pMin: toFixed(pMinKg ?? new Decimal(0)),
      errorSpread: toFixed(spreadKg),
      errorSpreadInG: toFixed(mul(spreadKg, "1000")),
      errorSpreadInDivisions: toFixed(spreadDivisions),
      isSpreadValid,
      maxCorrectedErrorEc: toFixed(maxEcKg),
      isMaxErrorValid,
      pass: isSeriesPass,
      status: isSeriesPass ? ComplianceStatus.PASS : ComplianceStatus.FAIL,
      percentageOfMpe,
      margin: toFixed(marginKg),
    };
  });

  const isOverallPass = totalSeriesFailed === 0 && totalSeriesEvaluated > 0;
  const overallStatus = isOverallPass ? ComplianceStatus.PASS : ComplianceStatus.FAIL;

  const summary = isOverallPass
    ? `Repeatability (Form 5): PASS. All ${totalSeriesEvaluated} test series within MPE spread tolerance.`
    : `Repeatability (Form 5): FAIL. ${totalSeriesFailed} of ${totalSeriesEvaluated} test series exceeded MPE spread tolerance.`;

  return {
    pass: isOverallPass,
    status: overallStatus,
    accuracyClass: enumClass,
    e: toFixed(eKg),
    eInKg: toFixed(eKg),
    series: evaluatedSeries,
    totalSeriesEvaluated,
    totalSeriesFailed,
    summary,
  };
}

/* ========================================================================= */
/*                   FORM 6: CREEP & ZERO RETURN (CLAUSE A.4.11)             */
/* ========================================================================= */

export interface Form6CreepObservation {
  timeMinutes: number; // e.g. 0, 5, 15, 30
  indicatedValue: DecimalValue | string | number;
  turningPointDeltaL: DecimalValue | string | number;
  unit?: UnitOfMeasurement;
}

export interface Form6ZeroObservation {
  indicatedValue: DecimalValue | string | number;
  turningPointDeltaL: DecimalValue | string | number;
  unit?: UnitOfMeasurement;
}

export interface Form6EvaluatorOptions {
  accuracyClass: AccuracyClass | "I" | "II" | "III" | "IIII" | "CLASS_I" | "CLASS_II" | "CLASS_III" | "CLASS_IIII";
  e: DecimalValue | string | number;
  loadMass: DecimalValue | string | number; // Max
  unit?: UnitOfMeasurement;
  fractionFactorPi?: DecimalValue | string | number;
  initialZeroObservation?: Form6ZeroObservation;
  finalZeroObservation?: Form6ZeroObservation; // Reading at ~30.5 min (0.5 min after unloading)
  rulePack?: RulePack;
}

export interface Form6CreepStep {
  timeMinutes: number;
  indicatedValue: string;
  turningPointDeltaL: string;
  indicatedP: string;
  differenceFromP0: string;
  differenceFromP0InG: string;
  differenceFromP0InDivisions: string;
}

export interface Form6CreepResult {
  pass: boolean;
  status: ComplianceStatus;
  accuracyClass: AccuracyClass;
  e: string;
  eInKg: string;
  testLoadMassInKg: string;
  p0: string;
  p15?: string;
  p30: string;
  totalCreep30Min: string;
  totalCreep30MinInG: string;
  totalCreep30MinInDivisions: string;
  maxAllowedCreep30Min: string; // 0.5e * pi
  maxAllowedCreep30MinInDivisions: string;
  isTotalCreepValid: boolean;
  creep15To30Min?: string;
  creep15To30MinInG?: string;
  creep15To30MinInDivisions?: string;
  maxAllowedCreep15To30Min: string; // 0.2e * pi
  maxAllowedCreep15To30MinInDivisions: string;
  isCreep15To30MinValid?: boolean;
  zeroReturnDrift?: string;
  zeroReturnDriftInG?: string;
  zeroReturnDriftInDivisions?: string;
  maxAllowedZeroReturn: string; // 0.5e * pi
  maxAllowedZeroReturnInDivisions: string;
  isZeroReturnValid?: boolean;
  steps: Form6CreepStep[];
  totalCriteriaEvaluated: number;
  totalCriteriaFailed: number;
  summary: string;
}

/**
 * Evaluates Form 6: Creep & Zero Return per OIML R 76-1 Clauses 3.9.4.1, 3.9.4.2 and Annex A.4.11.
 *
 * Mathematical & Regulatory Specifications:
 * 1. Constant temperature, test load L = Max applied for 30 minutes.
 * 2. Total 30-min Creep:
 *    |P(30) - P(0)| <= 0.5e * pi
 * 3. 15-min to 30-min Creep:
 *    |P(30) - P(15)| <= 0.2e * pi
 * 4. Zero return after unloading (t = 30.5 min):
 *    |P_zero,end - P_zero,start| <= 0.5e * pi
 */
export function evaluateForm6Creep(
  observations: Form6CreepObservation[],
  options: Form6EvaluatorOptions,
): Form6CreepResult {
  if (!observations || observations.length < 2) {
    throw new Error("Form 6 creep evaluation requires at least t=0 and t=30 min observations.");
  }

  const defaultUnit = options.unit || "kg";
  const normClass = normalizeAccuracyClass(options.accuracyClass);
  const enumClass = (AccuracyClass[`CLASS_${normClass}` as keyof typeof AccuracyClass] ||
    normClass) as AccuracyClass;
  const fractionFactor = options.fractionFactorPi ? toDecimal(options.fractionFactorPi) : new Decimal(1);

  const parsedE = parseMass(options.e as any, defaultUnit);
  const eKg = parsedE.valueInKg;
  const parsedLoad = parseMass(options.loadMass as any, defaultUnit);
  const loadKg = parsedLoad.valueInKg;

  // Tolerances: 0.5e for 30m, 0.2e for 15-30m, 0.5e for zero return
  const maxCreep30mKg = mul(mul("0.5", eKg), fractionFactor);
  const maxCreep15To30mKg = mul(mul("0.2", eKg), fractionFactor);
  const maxZeroReturnKg = mul(mul("0.5", eKg), fractionFactor);

  // Sort observations by timeMinutes
  const sorted = [...observations].sort((a, b) => a.timeMinutes - b.timeMinutes);

  // Map to evaluated steps with P
  const stepsWithP = sorted.map((obs) => {
    const obsUnit = obs.unit || defaultUnit;
    const parsedI = parseMass(obs.indicatedValue as any, obsUnit);
    const parsedDeltaL = parseMass(obs.turningPointDeltaL as any, obsUnit);
    const pKg = calculateIndicationP(parsedI.valueInKg, parsedDeltaL.valueInKg, eKg, { unit: "kg" });
    return {
      timeMinutes: obs.timeMinutes,
      indicatedValue: toFixed(parsedI.valueInKg),
      turningPointDeltaL: toFixed(parsedDeltaL.valueInKg),
      pKg,
    };
  });

  const step0 = stepsWithP.find((s) => s.timeMinutes === 0) || stepsWithP[0];
  const step15 = stepsWithP.find((s) => s.timeMinutes === 15);
  const step30 = stepsWithP.find((s) => s.timeMinutes === 30) || stepsWithP[stepsWithP.length - 1];

  let totalCriteriaEvaluated = 0;
  let totalCriteriaFailed = 0;

  // 1. Total Creep over 30 min: |P(30) - P(0)|
  totalCriteriaEvaluated++;
  const creep30mKg = abs(sub(step30.pKg, step0.pKg));
  const isTotalCreepValid = lte(creep30mKg, maxCreep30mKg);
  if (!isTotalCreepValid) {
    totalCriteriaFailed++;
  }

  // 2. Creep from 15 min to 30 min: |P(30) - P(15)|
  let creep15To30MinKg: Decimal | undefined;
  let isCreep15To30MinValid: boolean | undefined;
  if (step15) {
    totalCriteriaEvaluated++;
    creep15To30MinKg = abs(sub(step30.pKg, step15.pKg));
    isCreep15To30MinValid = lte(creep15To30MinKg, maxCreep15To30mKg);
    if (!isCreep15To30MinValid) {
      totalCriteriaFailed++;
    }
  }

  // 3. Zero Return check if observations provided
  let zeroReturnDriftKg: Decimal | undefined;
  let isZeroReturnValid: boolean | undefined;
  if (options.initialZeroObservation && options.finalZeroObservation) {
    totalCriteriaEvaluated++;
    const zStartI = parseMass(options.initialZeroObservation.indicatedValue as any, options.initialZeroObservation.unit || defaultUnit);
    const zStartDeltaL = parseMass(options.initialZeroObservation.turningPointDeltaL as any, options.initialZeroObservation.unit || defaultUnit);
    const pZStart = calculateIndicationP(zStartI.valueInKg, zStartDeltaL.valueInKg, eKg, { unit: "kg" });

    const zEndI = parseMass(options.finalZeroObservation.indicatedValue as any, options.finalZeroObservation.unit || defaultUnit);
    const zEndDeltaL = parseMass(options.finalZeroObservation.turningPointDeltaL as any, options.finalZeroObservation.unit || defaultUnit);
    const pZEnd = calculateIndicationP(zEndI.valueInKg, zEndDeltaL.valueInKg, eKg, { unit: "kg" });

    zeroReturnDriftKg = abs(sub(pZEnd, pZStart));
    isZeroReturnValid = lte(zeroReturnDriftKg, maxZeroReturnKg);
    if (!isZeroReturnValid) {
      totalCriteriaFailed++;
    }
  }

  const evaluatedSteps: Form6CreepStep[] = stepsWithP.map((s) => {
    const diffKg = abs(sub(s.pKg, step0.pKg));
    return {
      timeMinutes: s.timeMinutes,
      indicatedValue: s.indicatedValue,
      turningPointDeltaL: s.turningPointDeltaL,
      indicatedP: toFixed(s.pKg),
      differenceFromP0: toFixed(diffKg),
      differenceFromP0InG: toFixed(mul(diffKg, "1000")),
      differenceFromP0InDivisions: toFixed(div(diffKg, eKg)),
    };
  });

  const isOverallPass = totalCriteriaFailed === 0;
  const overallStatus = isOverallPass ? ComplianceStatus.PASS : ComplianceStatus.FAIL;

  const summary = isOverallPass
    ? `Creep & Zero Return (Form 6): PASS. All ${totalCriteriaEvaluated} criteria met. 30-min Creep: ${toFixed(mul(creep30mKg, "1000"))} g (${toFixed(div(creep30mKg, eKg))}e <= ${toFixed(mul("0.5", fractionFactor))}e).`
    : `Creep & Zero Return (Form 6): FAIL. ${totalCriteriaFailed} of ${totalCriteriaEvaluated} criteria exceeded tolerance. 30-min Creep: ${toFixed(mul(creep30mKg, "1000"))} g.`;

  return {
    pass: isOverallPass,
    status: overallStatus,
    accuracyClass: enumClass,
    e: toFixed(eKg),
    eInKg: toFixed(eKg),
    testLoadMassInKg: toFixed(loadKg),
    p0: toFixed(step0.pKg),
    p15: step15 ? toFixed(step15.pKg) : undefined,
    p30: toFixed(step30.pKg),
    totalCreep30Min: toFixed(creep30mKg),
    totalCreep30MinInG: toFixed(mul(creep30mKg, "1000")),
    totalCreep30MinInDivisions: toFixed(div(creep30mKg, eKg)),
    maxAllowedCreep30Min: toFixed(maxCreep30mKg),
    maxAllowedCreep30MinInDivisions: toFixed(mul("0.5", fractionFactor)),
    isTotalCreepValid,
    creep15To30Min: creep15To30MinKg ? toFixed(creep15To30MinKg) : undefined,
    creep15To30MinInG: creep15To30MinKg ? toFixed(mul(creep15To30MinKg, "1000")) : undefined,
    creep15To30MinInDivisions: creep15To30MinKg ? toFixed(div(creep15To30MinKg, eKg)) : undefined,
    maxAllowedCreep15To30Min: toFixed(maxCreep15To30mKg),
    maxAllowedCreep15To30MinInDivisions: toFixed(mul("0.2", fractionFactor)),
    isCreep15To30MinValid,
    zeroReturnDrift: zeroReturnDriftKg ? toFixed(zeroReturnDriftKg) : undefined,
    zeroReturnDriftInG: zeroReturnDriftKg ? toFixed(mul(zeroReturnDriftKg, "1000")) : undefined,
    zeroReturnDriftInDivisions: zeroReturnDriftKg ? toFixed(div(zeroReturnDriftKg, eKg)) : undefined,
    maxAllowedZeroReturn: toFixed(maxZeroReturnKg),
    maxAllowedZeroReturnInDivisions: toFixed(mul("0.5", fractionFactor)),
    isZeroReturnValid,
    steps: evaluatedSteps,
    totalCriteriaEvaluated,
    totalCriteriaFailed,
    summary,
  };
}
