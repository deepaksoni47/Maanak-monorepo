import { Decimal, toDecimal, sub, abs, div, mul, lte, gt, toFixed, DecimalValue } from "../math.js";
import { parseMass, normalizeAccuracyClass } from "../classifier.js";
import { calculateIndicationP, calculateRawErrorE } from "../vernier.js";
import { AccuracyClass, UnitOfMeasurement, ComplianceStatus } from "@maanak/types";
import { RulePack, loadDefaultRulePack } from "../loader.js";

export const ERR_TEMP_DRIFT_EXCEEDED = "ERR_TEMP_DRIFT_EXCEEDED";
export const ERR_ZERO_DRIFT_EXCEEDED = "ERR_ZERO_DRIFT_EXCEEDED";

export interface Form2TemperatureObservation {
  id?: string;
  temperatureC: DecimalValue | string | number;
  humidityPercent?: DecimalValue | string | number;
  timestamp?: string; // ISO 8601 string or readable date
  elapsedTimeMinutes?: DecimalValue | string | number;
  indicatedValue: DecimalValue | string | number; // I0
  turningPointDeltaL: DecimalValue | string | number; // deltaL0
  unit?: UnitOfMeasurement;
}

export interface Form2EvaluatorOptions {
  accuracyClass: AccuracyClass | "I" | "II" | "III" | "IIII" | "CLASS_I" | "CLASS_II" | "CLASS_III" | "CLASS_IIII";
  e: DecimalValue | string | number;
  unit?: UnitOfMeasurement;
  fractionFactorPi?: DecimalValue | string | number; // Apportioning factor for modules, default 1.0
  maxTempDriftRateCPerHour?: DecimalValue | string | number; // Standard: 5.0 °C/h per OIML R 76-1 Cl A.5.3.1
  rulePack?: RulePack;
}

export interface Form2EvaluatedStep {
  id?: string;
  stepIndex: number;
  temperatureC: string;
  humidityPercent?: string;
  timestamp?: string;
  elapsedTimeMinutes?: string;
  indicatedValue: string;
  turningPointDeltaL: string;
  indicatedP0: string;
  zeroErrorE0: string;
  zeroErrorE0InG: string;
  zeroErrorE0InDivisions: string;
}

export interface Form2TransitionResult {
  fromStepIndex: number;
  toStepIndex: number;
  fromTempC: string;
  toTempC: string;
  deltaTempC: string;
  elapsedHours: string;
  tempRateCPerHour: string;
  maxAllowedTempRateCPerHour: string;
  isTempRateValid: boolean;
  zeroDrift: string;
  zeroDriftInG: string;
  zeroDriftInDivisions: string;
  maxAllowedZeroDrift: string;
  maxAllowedZeroDriftInDivisions: string;
  isZeroDriftValid: boolean;
  pass: boolean;
  status: ComplianceStatus;
  errorCodes: string[];
}

export interface Form2EvaluationResult {
  pass: boolean;
  status: ComplianceStatus;
  accuracyClass: AccuracyClass;
  e: string;
  eInKg: string;
  steps: Form2EvaluatedStep[];
  transitions: Form2TransitionResult[];
  maxObservedZeroDrift: {
    fromTempC: string;
    toTempC: string;
    drift: string;
    driftInG: string;
    driftInDivisions: string;
    percentageOfTolerance: string;
  };
  maxObservedTempRate: {
    fromTempC: string;
    toTempC: string;
    rateCPerHour: string;
    maxAllowedRate: string;
    exceeded: boolean;
  };
  totalPointsEvaluated: number;
  totalPointsFailed: number;
  errorCodes: string[];
  summary: string;
}

/**
 * Calculates elapsed hours between two observations from timestamps or elapsedTimeMinutes.
 */
function calculateElapsedHours(
  prev: Form2TemperatureObservation,
  curr: Form2TemperatureObservation,
): Decimal {
  // Option A: elapsedTimeMinutes provided
  if (curr.elapsedTimeMinutes !== undefined && prev.elapsedTimeMinutes !== undefined) {
    const prevMin = toDecimal(prev.elapsedTimeMinutes);
    const currMin = toDecimal(curr.elapsedTimeMinutes);
    const diffMin = sub(currMin, prevMin);
    return div(diffMin, "60");
  }

  // Option B: ISO timestamps provided
  if (curr.timestamp && prev.timestamp) {
    const prevMs = new Date(prev.timestamp).getTime();
    const currMs = new Date(curr.timestamp).getTime();
    if (!isNaN(prevMs) && !isNaN(currMs)) {
      const diffMs = currMs - prevMs;
      return div(new Decimal(diffMs), "3600000");
    }
  }

  // Default fallback: 1 hour if unspecified
  return new Decimal("1");
}

/**
 * Evaluates Form 2: Temperature Effect on No-Load Indication and Temperature Drift Rate
 * per OIML R 76-1 Clauses A.5.3.1, A.5.3.2 and R 76-2 Form 2.
 *
 * Mathematical & Regulatory Specifications:
 * 1. Zero error at each temperature T_k:
 *    P_0(T_k) = I_0(T_k) + 0.5e - deltaL_0(T_k)
 *    E_0(T_k) = P_0(T_k) - 0
 * 2. Zero drift between consecutive temperatures:
 *    Delta E_0 = |E_0(T_k) - E_0(T_{k-1})|
 *    Tolerance threshold: Delta E_0 <= 1.0e (scaled by fraction factor pi for modules)
 * 3. Temperature rate of change (chamber ramp stability):
 *    Rate = |T_k - T_{k-1}| / Delta t <= 5.0 °C/h
 *    Exceeding 5.0 °C/h flags ERR_TEMP_DRIFT_EXCEEDED.
 */
export function evaluateForm2TemperatureDrift(
  observations: Form2TemperatureObservation[],
  options: Form2EvaluatorOptions,
): Form2EvaluationResult {
  if (!observations || observations.length < 2) {
    throw new Error("Form 2 evaluation requires at least 2 temperature observations.");
  }

  const defaultUnit = options.unit || "kg";
  const normClass = normalizeAccuracyClass(options.accuracyClass);
  const enumClass = (AccuracyClass[`CLASS_${normClass}` as keyof typeof AccuracyClass] ||
    normClass) as AccuracyClass;
  const rulePack = options.rulePack || loadDefaultRulePack();

  const parsedE = parseMass(options.e as any, defaultUnit);
  const eKg = parsedE.valueInKg;

  const fractionFactor = options.fractionFactorPi ? toDecimal(options.fractionFactorPi) : new Decimal(1);
  const maxAllowedZeroDriftKg = mul(eKg, fractionFactor); // 1.0e * pi

  const defaultMaxRate = rulePack.environmentalConstraints.maxTemperatureDriftRateCPerHour ?? 5.0;
  const maxTempRate = options.maxTempDriftRateCPerHour
    ? toDecimal(options.maxTempDriftRateCPerHour)
    : new Decimal(defaultMaxRate);

  // 1. Evaluate individual temperature steps
  const evaluatedSteps: Form2EvaluatedStep[] = observations.map((obs, idx) => {
    const obsUnit = obs.unit || defaultUnit;
    const parsedI = parseMass(obs.indicatedValue as any, obsUnit);
    const parsedDeltaL = parseMass(obs.turningPointDeltaL as any, obsUnit);

    const pZeroKg = calculateIndicationP(parsedI.valueInKg, parsedDeltaL.valueInKg, eKg, { unit: "kg" });
    const eZeroKg = calculateRawErrorE(pZeroKg, new Decimal(0), { unit: "kg" });
    const eZeroInDivisions = div(eZeroKg, eKg);

    return {
      id: obs.id,
      stepIndex: idx + 1,
      temperatureC: toFixed(toDecimal(obs.temperatureC)),
      humidityPercent: obs.humidityPercent !== undefined ? toFixed(toDecimal(obs.humidityPercent)) : undefined,
      timestamp: obs.timestamp,
      elapsedTimeMinutes:
        obs.elapsedTimeMinutes !== undefined ? toFixed(toDecimal(obs.elapsedTimeMinutes)) : undefined,
      indicatedValue: toFixed(parsedI.valueInKg),
      turningPointDeltaL: toFixed(parsedDeltaL.valueInKg),
      indicatedP0: toFixed(pZeroKg),
      zeroErrorE0: toFixed(eZeroKg),
      zeroErrorE0InG: toFixed(mul(eZeroKg, "1000")),
      zeroErrorE0InDivisions: toFixed(eZeroInDivisions),
    };
  });

  // 2. Evaluate transitions between consecutive temperature steps
  const transitions: Form2TransitionResult[] = [];
  let totalPointsEvaluated = 0;
  let totalPointsFailed = 0;
  const allErrors: Set<string> = new Set();

  for (let i = 1; i < observations.length; i++) {
    const prevObs = observations[i - 1];
    const currObs = observations[i];
    const prevStep = evaluatedSteps[i - 1];
    const currStep = evaluatedSteps[i];

    const prevT = toDecimal(prevStep.temperatureC);
    const currT = toDecimal(currStep.temperatureC);
    const deltaT = abs(sub(currT, prevT));

    // Calculate elapsed hours
    let elapsedH = calculateElapsedHours(prevObs, currObs);
    if (elapsedH.lte(0)) {
      elapsedH = new Decimal("0.0001"); // avoid division by zero
    }

    // Temperature drift rate = |Delta T| / Delta t
    const tempRate = div(deltaT, elapsedH);
    const isTempRateValid = lte(tempRate, maxTempRate);

    // Zero drift = |E0(T_k) - E0(T_{k-1})|
    const prevE0 = toDecimal(prevStep.zeroErrorE0);
    const currE0 = toDecimal(currStep.zeroErrorE0);
    const zeroDriftKg = abs(sub(currE0, prevE0));
    const zeroDriftDivisions = div(zeroDriftKg, eKg);
    const isZeroDriftValid = lte(zeroDriftKg, maxAllowedZeroDriftKg);

    const transitionErrorCodes: string[] = [];
    totalPointsEvaluated += 2; // Rate check + zero drift check

    if (!isTempRateValid) {
      totalPointsFailed++;
      transitionErrorCodes.push(ERR_TEMP_DRIFT_EXCEEDED);
      allErrors.add(ERR_TEMP_DRIFT_EXCEEDED);
    }

    if (!isZeroDriftValid) {
      totalPointsFailed++;
      transitionErrorCodes.push(ERR_ZERO_DRIFT_EXCEEDED);
      allErrors.add(ERR_ZERO_DRIFT_EXCEEDED);
    }

    const pass = isTempRateValid && isZeroDriftValid;
    const status = pass ? ComplianceStatus.PASS : ComplianceStatus.FAIL;

    transitions.push({
      fromStepIndex: i,
      toStepIndex: i + 1,
      fromTempC: prevStep.temperatureC,
      toTempC: currStep.temperatureC,
      deltaTempC: toFixed(deltaT),
      elapsedHours: toFixed(elapsedH, 4),
      tempRateCPerHour: toFixed(tempRate, 2),
      maxAllowedTempRateCPerHour: toFixed(maxTempRate, 2),
      isTempRateValid,
      zeroDrift: toFixed(zeroDriftKg),
      zeroDriftInG: toFixed(mul(zeroDriftKg, "1000")),
      zeroDriftInDivisions: toFixed(zeroDriftDivisions),
      maxAllowedZeroDrift: toFixed(maxAllowedZeroDriftKg),
      maxAllowedZeroDriftInDivisions: toFixed(fractionFactor),
      isZeroDriftValid,
      pass,
      status,
      errorCodes: transitionErrorCodes,
    });
  }

  // Find worst-case transitions
  let worstDriftTransition: Form2TransitionResult | undefined;
  for (const t of transitions) {
    if (!worstDriftTransition || toDecimal(t.zeroDrift).gt(toDecimal(worstDriftTransition.zeroDrift))) {
      worstDriftTransition = t;
    }
  }

  let worstRateTransition: Form2TransitionResult | undefined;
  for (const t of transitions) {
    if (!worstRateTransition || toDecimal(t.tempRateCPerHour).gt(toDecimal(worstRateTransition.tempRateCPerHour))) {
      worstRateTransition = t;
    }
  }

  const isOverallPass = totalPointsFailed === 0;
  const overallStatus = isOverallPass ? ComplianceStatus.PASS : ComplianceStatus.FAIL;

  const worstDriftDiv = worstDriftTransition ? toDecimal(worstDriftTransition.zeroDriftInDivisions) : new Decimal(0);
  const maxAllowedDiv = toDecimal(maxAllowedZeroDriftKg).isZero() ? new Decimal(1) : div(maxAllowedZeroDriftKg, eKg);
  const driftPercentage = toFixed(mul(div(worstDriftDiv, maxAllowedDiv), "100"), 2);

  const summary = isOverallPass
    ? `Temperature Effect (Form 2): PASS. All ${transitions.length} temperature transitions within tolerance. Max zero drift: ${worstDriftTransition?.zeroDriftInG ?? "0"} g (${worstDriftTransition?.zeroDriftInDivisions ?? "0"}e, ${driftPercentage}% of tolerance). Max chamber ramp rate: ${worstRateTransition?.tempRateCPerHour ?? "0"} °C/h (<= ${toFixed(maxTempRate, 1)} °C/h).`
    : `Temperature Effect (Form 2): FAIL. ${totalPointsFailed} of ${totalPointsEvaluated} criteria failed. Max zero drift: ${worstDriftTransition?.zeroDriftInG ?? "0"} g (${worstDriftTransition?.zeroDriftInDivisions ?? "0"}e). Max chamber ramp rate: ${worstRateTransition?.tempRateCPerHour ?? "0"} °C/h. Errors: ${Array.from(allErrors).join(", ")}.`;

  return {
    pass: isOverallPass,
    status: overallStatus,
    accuracyClass: enumClass,
    e: toFixed(eKg),
    eInKg: toFixed(eKg),
    steps: evaluatedSteps,
    transitions,
    maxObservedZeroDrift: {
      fromTempC: worstDriftTransition?.fromTempC ?? "0",
      toTempC: worstDriftTransition?.toTempC ?? "0",
      drift: worstDriftTransition?.zeroDrift ?? "0",
      driftInG: worstDriftTransition?.zeroDriftInG ?? "0",
      driftInDivisions: worstDriftTransition?.zeroDriftInDivisions ?? "0",
      percentageOfTolerance: `${driftPercentage}%`,
    },
    maxObservedTempRate: {
      fromTempC: worstRateTransition?.fromTempC ?? "0",
      toTempC: worstRateTransition?.toTempC ?? "0",
      rateCPerHour: worstRateTransition?.tempRateCPerHour ?? "0",
      maxAllowedRate: toFixed(maxTempRate, 2),
      exceeded: worstRateTransition ? !worstRateTransition.isTempRateValid : false,
    },
    totalPointsEvaluated,
    totalPointsFailed,
    errorCodes: Array.from(allErrors),
    summary,
  };
}
