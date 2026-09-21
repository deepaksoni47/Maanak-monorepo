import { Decimal, toDecimal, sub, abs, div, mul, lte, gt, toFixed, DecimalValue } from "../math.js";
import { parseMass, normalizeAccuracyClass } from "../classifier.js";
import { getMpe, MpeEvaluationMode } from "../mpe.js";
import { calculateIndicationP, calculateRawErrorE } from "../vernier.js";
import { calculateCorrectedErrorEc, evaluateCompliance } from "../corrector.js";
import { getActiveRangeForLoad } from "../multi_interval.js";
import { AccuracyClass, UnitOfMeasurement, ComplianceStatus, PartialWeighingRange } from "@maanak/types";
import { RulePack, loadDefaultRulePack } from "../loader.js";

export interface Form1ObservationInput {
  id?: string;
  loadMass: DecimalValue | string | number;
  indicatedValue: DecimalValue | string | number;
  turningPointDeltaL: DecimalValue | string | number;
  direction?: "ASCENDING" | "DESCENDING" | "ascending" | "descending";
  timestamp?: string;
  unit?: UnitOfMeasurement;
}

export interface Form1ZeroInput {
  indicatedValue: DecimalValue | string | number;
  turningPointDeltaL: DecimalValue | string | number;
  unit?: UnitOfMeasurement;
}

export interface Form1EvaluatorOptions {
  accuracyClass: AccuracyClass | "I" | "II" | "III" | "IIII" | "CLASS_I" | "CLASS_II" | "CLASS_III" | "CLASS_IIII";
  e?: DecimalValue | string | number;
  partialRanges?: PartialWeighingRange[];
  zeroObservation?: Form1ZeroInput;
  endZeroObservation?: Form1ZeroInput;
  mode?: MpeEvaluationMode;
  unit?: UnitOfMeasurement;
  fractionFactorPi?: DecimalValue | string | number;
  rulePack?: RulePack;
}

export interface Form1EvaluatedStep {
  id?: string;
  direction: "ASCENDING" | "DESCENDING";
  loadMass: string;
  loadMassInKg: string;
  indicatedValue: string;
  turningPointDeltaL: string;
  e: string;
  eInKg: string;
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
  activePartialRangeIndex?: number;
}

export interface Form1HysteresisStep {
  loadMass: string;
  loadMassInKg: string;
  ascendingErrorEc: string;
  descendingErrorEc: string;
  hysteresisError: string;
  hysteresisErrorInG: string;
  mpeInMass: string;
  pass: boolean;
  status: ComplianceStatus;
  ratioToMpe: string;
  percentageOfMpe: string;
  margin: string;
}

export interface Form1ZeroReturnStep {
  indicatedValue: string;
  turningPointDeltaL: string;
  zeroErrorE0End: string;
  zeroDrift: string;
  maxAllowedDrift: string;
  pass: boolean;
  status: ComplianceStatus;
}

export interface Form1EvaluationResult {
  pass: boolean;
  status: ComplianceStatus;
  accuracyClass: AccuracyClass;
  zeroErrorE0: string;
  zeroErrorE0InG: string;
  ascendingSteps: Form1EvaluatedStep[];
  descendingSteps: Form1EvaluatedStep[];
  hysteresisSteps: Form1HysteresisStep[];
  endZeroStep?: Form1ZeroReturnStep;
  maxObservedEc: {
    loadMass: string;
    direction: "ASCENDING" | "DESCENDING";
    correctedErrorEc: string;
    mpeInMass: string;
    percentageOfMpe: string;
  };
  maxObservedHysteresis?: {
    loadMass: string;
    hysteresisError: string;
    mpeInMass: string;
    percentageOfMpe: string;
  };
  totalPointsEvaluated: number;
  totalPointsFailed: number;
  summary: string;
}

/**
 * Resolves the verification interval e for a given load step.
 */
function resolveVerificationIntervalE(
  loadKg: Decimal,
  options: Form1EvaluatorOptions,
  direction: "increasing" | "decreasing",
): { eKg: Decimal; eString: string; activeRangeIndex?: number } {
  const defaultUnit = options.unit || "kg";
  if (options.partialRanges && options.partialRanges.length > 0) {
    const activeRange = getActiveRangeForLoad(loadKg, options.partialRanges, {
      unit: "kg",
      direction,
      stickyDecreasing: true,
    });
    const parsedE = parseMass(activeRange.activeEInKg, "kg");
    return {
      eKg: parsedE.valueInKg,
      eString: activeRange.activeE,
      activeRangeIndex: activeRange.rangeIndex,
    };
  }

  if (options.e) {
    const parsedE = parseMass(options.e as any, defaultUnit);
    return {
      eKg: parsedE.valueInKg,
      eString: toFixed(parsedE.valueInKg),
    };
  }

  throw new Error("Either 'e' or 'partialRanges' must be provided for Form 1 evaluation.");
}

/**
 * Evaluates Form 1 Weighing Performance & Hysteresis per OIML R 76-1 Clause A.4.4 and R 76-2 Form 1.
 *
 * Mathematical & Metrological Workflow:
 * 1. Evaluates zero-load error E0:
 *    E0 = I0 + 0.5e - deltaL0 - 0
 * 2. For each ascending and descending load point L:
 *    P = I + 0.5e - deltaL
 *    E = P - L
 *    Ec = E - E0
 *    MPE = Table 6 bracket (apportioned by pi if modular)
 *    Compliance: |Ec| <= MPE
 * 3. Hysteresis error for corresponding ascending/descending load steps:
 *    Ehyst = |E_descending - E_ascending| = |Ec_descending - Ec_ascending|
 *    Compliance: Ehyst <= |MPE(L)|
 * 4. Zero return error check at end of unloading:
 *    |E0_end - E0_start| <= 0.5e
 */
export function evaluateForm1Weighing(
  observations: {
    ascending: Form1ObservationInput[];
    descending: Form1ObservationInput[];
    zeroObservation?: Form1ZeroInput;
    endZeroObservation?: Form1ZeroInput;
  } | Form1ObservationInput[],
  options: Form1EvaluatorOptions,
): Form1EvaluationResult {
  const defaultUnit = options.unit || "kg";
  const normClass = normalizeAccuracyClass(options.accuracyClass);
  const enumClass = (AccuracyClass[`CLASS_${normClass}` as keyof typeof AccuracyClass] ||
    normClass) as AccuracyClass;
  const mode: MpeEvaluationMode = options.mode || "initialVerification";
  const rulePack = options.rulePack || loadDefaultRulePack();
  const fractionFactor = options.fractionFactorPi ? toDecimal(options.fractionFactorPi) : new Decimal(1);

  // Normalize observation arrays
  let ascInputs: Form1ObservationInput[] = [];
  let descInputs: Form1ObservationInput[] = [];
  let explicitZero: Form1ZeroInput | undefined = options.zeroObservation;
  let explicitEndZero: Form1ZeroInput | undefined = options.endZeroObservation;

  if (Array.isArray(observations)) {
    for (const obs of observations) {
      const dir = (obs.direction || "ASCENDING").toUpperCase();
      const parsedL = parseMass(obs.loadMass as any, obs.unit || defaultUnit);
      if (parsedL.valueInKg.isZero()) {
        if (!explicitZero) {
          explicitZero = {
            indicatedValue: obs.indicatedValue,
            turningPointDeltaL: obs.turningPointDeltaL,
            unit: obs.unit || defaultUnit,
          };
        } else if (dir === "DESCENDING") {
          explicitEndZero = {
            indicatedValue: obs.indicatedValue,
            turningPointDeltaL: obs.turningPointDeltaL,
            unit: obs.unit || defaultUnit,
          };
        }
      } else if (dir === "DESCENDING") {
        descInputs.push(obs);
      } else {
        ascInputs.push(obs);
      }
    }
  } else {
    ascInputs = observations.ascending || [];
    descInputs = observations.descending || [];
    if (observations.zeroObservation) explicitZero = observations.zeroObservation;
    if (observations.endZeroObservation) explicitEndZero = observations.endZeroObservation;
  }

  // 1. Calculate E0 from zero observation
  let zeroErrorE0Kg = new Decimal(0);
  if (explicitZero) {
    const zeroI = parseMass(explicitZero.indicatedValue as any, explicitZero.unit || defaultUnit);
    const zeroDeltaL = parseMass(explicitZero.turningPointDeltaL as any, explicitZero.unit || defaultUnit);
    const zeroERes = resolveVerificationIntervalE(new Decimal(0), options, "increasing");
    const pZero = calculateIndicationP(zeroI.valueInKg, zeroDeltaL.valueInKg, zeroERes.eKg, { unit: "kg" });
    zeroErrorE0Kg = calculateRawErrorE(pZero, new Decimal(0), { unit: "kg" });
  }

  const zeroErrorE0Str = toFixed(zeroErrorE0Kg);
  const zeroErrorE0InGStr = toFixed(mul(zeroErrorE0Kg, "1000"));

  let totalPointsEvaluated = 0;
  let totalPointsFailed = 0;

  // 2. Evaluate a single step
  function evaluateStep(
    obs: Form1ObservationInput,
    direction: "ASCENDING" | "DESCENDING",
  ): Form1EvaluatedStep {
    totalPointsEvaluated++;
    const obsUnit = obs.unit || defaultUnit;
    const parsedL = parseMass(obs.loadMass as any, obsUnit);
    const parsedI = parseMass(obs.indicatedValue as any, obsUnit);
    const parsedDeltaL = parseMass(obs.turningPointDeltaL as any, obsUnit);

    const dirLookup = direction === "ASCENDING" ? "increasing" : "decreasing";
    const eResolved = resolveVerificationIntervalE(parsedL.valueInKg, options, dirLookup);

    // P = I + 0.5e - deltaL
    const pKg = calculateIndicationP(parsedI.valueInKg, parsedDeltaL.valueInKg, eResolved.eKg, { unit: "kg" });
    // E = P - L
    const rawEKg = calculateRawErrorE(pKg, parsedL.valueInKg, { unit: "kg" });
    // Ec = E - E0
    const ecKg = calculateCorrectedErrorEc(rawEKg, zeroErrorE0Kg, { unit: "kg" });

    // MPE from Table 6
    const mpeRes = getMpe(parsedL.valueInKg, eResolved.eKg, normClass, {
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
      totalPointsFailed++;
    }

    return {
      id: obs.id,
      direction,
      loadMass: toFixed(parsedL.valueInKg),
      loadMassInKg: toFixed(parsedL.valueInKg),
      indicatedValue: toFixed(parsedI.valueInKg),
      turningPointDeltaL: toFixed(parsedDeltaL.valueInKg),
      e: eResolved.eString,
      eInKg: toFixed(eResolved.eKg),
      indicatedP: toFixed(pKg),
      rawErrorE: toFixed(rawEKg),
      rawErrorEInG: toFixed(mul(rawEKg, "1000")),
      zeroErrorE0: zeroErrorE0Str,
      correctedErrorEc: toFixed(ecKg),
      correctedErrorEcInG: toFixed(mul(ecKg, "1000")),
      correctedErrorEcInDivisions: toFixed(div(ecKg, eResolved.eKg)),
      mpeInMass: toFixed(finalMpeKg),
      mpeInE: mpeRes.mpeInE,
      stepBracket: mpeRes.stepBracket,
      pass: compliance.pass,
      status: compliance.status,
      ratioToMpe: compliance.ratioToMpe,
      percentageOfMpe: compliance.percentageOfMpe,
      margin: compliance.margin,
      activePartialRangeIndex: eResolved.activeRangeIndex,
    };
  }

  const ascendingSteps = ascInputs.map((obs) => evaluateStep(obs, "ASCENDING"));
  const descendingSteps = descInputs.map((obs) => evaluateStep(obs, "DESCENDING"));

  // 3. Evaluate Hysteresis (matching load points)
  const hysteresisSteps: Form1HysteresisStep[] = [];
  let worstHyst: {
    loadMass: string;
    hysteresisError: string;
    mpeInMass: string;
    percentageOfMpe: string;
    ratioVal: Decimal;
  } | null = null;

  for (const descStep of descendingSteps) {
    const descLKg = toDecimal(descStep.loadMassInKg);
    if (descLKg.isZero()) continue;

    // Find matching ascending step with same load mass
    const matchingAsc = ascendingSteps.find((asc) => toDecimal(asc.loadMassInKg).eq(descLKg));
    if (matchingAsc) {
      totalPointsEvaluated++;
      const ascEc = toDecimal(matchingAsc.correctedErrorEc);
      const descEc = toDecimal(descStep.correctedErrorEc);
      // Ehyst = |Ec_desc - Ec_asc|
      const hystDiff = abs(sub(descEc, ascEc));
      const mpeKg = toDecimal(descStep.mpeInMass);

      const passHyst = lte(hystDiff, mpeKg);
      if (!passHyst) {
        totalPointsFailed++;
      }

      let ratioToMpe = "0";
      let percentageOfMpe = "0%";
      let ratioVal = new Decimal(0);
      if (!mpeKg.isZero()) {
        ratioVal = div(hystDiff, mpeKg);
        ratioToMpe = toFixed(ratioVal, 6);
        percentageOfMpe = `${toFixed(mul(ratioVal, "100"), 2)}%`;
      }

      const marginKg = sub(mpeKg, hystDiff);

      hysteresisSteps.push({
        loadMass: descStep.loadMass,
        loadMassInKg: descStep.loadMassInKg,
        ascendingErrorEc: matchingAsc.correctedErrorEc,
        descendingErrorEc: descStep.correctedErrorEc,
        hysteresisError: toFixed(hystDiff),
        hysteresisErrorInG: toFixed(mul(hystDiff, "1000")),
        mpeInMass: descStep.mpeInMass,
        pass: passHyst,
        status: passHyst ? ComplianceStatus.PASS : ComplianceStatus.FAIL,
        ratioToMpe,
        percentageOfMpe,
        margin: toFixed(marginKg),
      });
    }
  }

  // 4. Return to zero check (Clause A.4.4.3: |E0_end - E0_start| <= 0.5e)
  let endZeroStep: Form1ZeroReturnStep | undefined;
  if (explicitEndZero) {
    totalPointsEvaluated++;
    const endI = parseMass(explicitEndZero.indicatedValue as any, explicitEndZero.unit || defaultUnit);
    const endDeltaL = parseMass(explicitEndZero.turningPointDeltaL as any, explicitEndZero.unit || defaultUnit);
    const zeroERes = resolveVerificationIntervalE(new Decimal(0), options, "decreasing");
    const pEndZero = calculateIndicationP(endI.valueInKg, endDeltaL.valueInKg, zeroERes.eKg, { unit: "kg" });
    const zeroErrorEndKg = calculateRawErrorE(pEndZero, new Decimal(0), { unit: "kg" });

    // Drift = |E0_end - E0_start|
    const driftKg = abs(sub(zeroErrorEndKg, zeroErrorE0Kg));
    const maxAllowedDriftKg = mul("0.5", zeroERes.eKg);
    const passZeroReturn = lte(driftKg, maxAllowedDriftKg);
    if (!passZeroReturn) {
      totalPointsFailed++;
    }

    endZeroStep = {
      indicatedValue: toFixed(endI.valueInKg),
      turningPointDeltaL: toFixed(endDeltaL.valueInKg),
      zeroErrorE0End: toFixed(zeroErrorEndKg),
      zeroDrift: toFixed(driftKg),
      maxAllowedDrift: toFixed(maxAllowedDriftKg),
      pass: passZeroReturn,
      status: passZeroReturn ? ComplianceStatus.PASS : ComplianceStatus.FAIL,
    };
  }

  // Find worst-case Ec and Hysteresis
  const allSteps = [...ascendingSteps, ...descendingSteps];
  let worstStep: Form1EvaluatedStep | undefined;
  for (const step of allSteps) {
    if (!worstStep || toDecimal(step.ratioToMpe).gt(toDecimal(worstStep.ratioToMpe))) {
      worstStep = step;
    }
  }

  let worstHystStep: Form1HysteresisStep | undefined;
  for (const hyst of hysteresisSteps) {
    if (!worstHystStep || toDecimal(hyst.ratioToMpe).gt(toDecimal(worstHystStep.ratioToMpe))) {
      worstHystStep = hyst;
    }
  }

  const isOverallPass = totalPointsFailed === 0 && totalPointsEvaluated > 0;
  const overallStatus = isOverallPass ? ComplianceStatus.PASS : ComplianceStatus.FAIL;

  const defaultWorstEc = {
    loadMass: "0",
    direction: "ASCENDING" as const,
    correctedErrorEc: "0",
    mpeInMass: "0",
    percentageOfMpe: "0%",
  };

  const summary = isOverallPass
    ? `Weighing Performance (Form 1): PASS. All ${totalPointsEvaluated} points within tolerance. Worst |Ec|: ${worstStep?.correctedErrorEc ?? "0"} kg (${worstStep?.percentageOfMpe ?? "0%"} MPE) at load ${worstStep?.loadMass ?? "0"} kg.`
    : `Weighing Performance (Form 1): FAIL. ${totalPointsFailed} of ${totalPointsEvaluated} points exceeded tolerance. Worst |Ec|: ${worstStep?.correctedErrorEc ?? "0"} kg (${worstStep?.percentageOfMpe ?? "0%"} MPE) at load ${worstStep?.loadMass ?? "0"} kg.`;

  return {
    pass: isOverallPass,
    status: overallStatus,
    accuracyClass: enumClass,
    zeroErrorE0: zeroErrorE0Str,
    zeroErrorE0InG: zeroErrorE0InGStr,
    ascendingSteps,
    descendingSteps,
    hysteresisSteps,
    endZeroStep,
    maxObservedEc: worstStep
      ? {
          loadMass: worstStep.loadMass,
          direction: worstStep.direction,
          correctedErrorEc: worstStep.correctedErrorEc,
          mpeInMass: worstStep.mpeInMass,
          percentageOfMpe: worstStep.percentageOfMpe,
        }
      : defaultWorstEc,
    maxObservedHysteresis: worstHystStep
      ? {
          loadMass: worstHystStep.loadMass,
          hysteresisError: worstHystStep.hysteresisError,
          mpeInMass: worstHystStep.mpeInMass,
          percentageOfMpe: worstHystStep.percentageOfMpe,
        }
      : undefined,
    totalPointsEvaluated,
    totalPointsFailed,
    summary,
  };
}
