import { Decimal } from "decimal.js";
import {
  AnomalyFlag,
  AnomalyAuditReport,
  AnomalyCode,
  AnomalySeverity,
  UnitOfMeasurement,
} from "@maanak/types";
import { RulePack, loadDefaultRulePack } from "./loader.js";
import { parseMass } from "./classifier.js";

export interface AnomalyDetectorOptions {
  e?: string | number | Decimal;
  eUnit?: UnitOfMeasurement;
  max?: string | number | Decimal;
  maxUnit?: UnitOfMeasurement;
  min?: string | number | Decimal;
  minUnit?: UnitOfMeasurement;
  unit?: UnitOfMeasurement;
  rulePack?: RulePack;
  maxDriftRateCPerHour?: number;
  tempMinC?: number;
  tempMaxC?: number;
  tareToleranceInDivisions?: number | string | Decimal;
}

export interface MonotonicityStep {
  load: string | number | Decimal;
  indication: string | number | Decimal;
  unit?: UnitOfMeasurement;
  stepIndex?: number;
  id?: string;
}

export interface DeltaLStep {
  deltaL: string | number | Decimal;
  e?: string | number | Decimal;
  load?: string | number | Decimal;
  unit?: UnitOfMeasurement;
  stepIndex?: number;
  id?: string;
}

export interface EnvironmentalStabilityInput {
  tempStartC: number | string | Decimal;
  tempEndC: number | string | Decimal;
  durationMinutes?: number;
  durationHours?: number;
  startTime?: string | Date;
  endTime?: string | Date;
  tempMinC?: number;
  tempMaxC?: number;
  maxDriftRateCPerHour?: number;
}

export interface TareSanityInput {
  tareLoad?: string | number | Decimal;
  netLoad: string | number | Decimal;
  netIndication: string | number | Decimal;
  e?: string | number | Decimal;
  max?: string | number | Decimal;
  unit?: UnitOfMeasurement;
  tareToleranceInDivisions?: number | string | Decimal;
}

export interface PhysicalSanityInput {
  load: string | number | Decimal;
  indication: string | number | Decimal;
  e?: string | number | Decimal;
  max?: string | number | Decimal;
  unit?: UnitOfMeasurement;
  stepIndex?: number;
  id?: string;
}

export interface SessionAuditInput {
  instrument?: {
    e?: string | number | Decimal;
    max?: string | number | Decimal;
    min?: string | number | Decimal;
    unit?: UnitOfMeasurement;
  };
  observations?: Array<{
    load: string | number | Decimal;
    indication: string | number | Decimal;
    deltaL?: string | number | Decimal;
    e?: string | number | Decimal;
    unit?: UnitOfMeasurement;
    stepIndex?: number;
    id?: string;
  }>;
  environmental?: EnvironmentalStabilityInput;
  tareRuns?: TareSanityInput[];
}

/**
 * AnomalyDetector evaluates legal metrological observations and session parameters
 * against physical sanity constraints, monotonicity, Delta L thresholds,
 * thermal stability limits, and tare zero-cancellation.
 */
export class AnomalyDetector {
  private options: AnomalyDetectorOptions;
  private rulePack: RulePack;

  constructor(options: AnomalyDetectorOptions = {}) {
    this.options = options;
    this.rulePack = options.rulePack || loadDefaultRulePack();
  }

  /**
   * Rule 1: Monotonicity
   * Indication I must increase (or stay constant) with increasing test load L,
   * and must decrease (or stay constant) with decreasing test load L.
   */
  public checkMonotonicity(sequence: MonotonicityStep[]): AnomalyFlag[] {
    const flags: AnomalyFlag[] = [];
    if (!sequence || sequence.length < 2) {
      return flags;
    }

    const defaultUnit = this.options.unit || "kg";

    for (let i = 1; i < sequence.length; i++) {
      const prev = sequence[i - 1];
      const curr = sequence[i];

      const prevLoad = parseMass(prev.load, prev.unit || defaultUnit);
      const currLoad = parseMass(curr.load, curr.unit || defaultUnit);
      const prevInd = parseMass(prev.indication, prev.unit || defaultUnit);
      const currInd = parseMass(curr.indication, curr.unit || defaultUnit);

      // Increasing load step: currLoad > prevLoad
      if (currLoad.valueInKg.gt(prevLoad.valueInKg)) {
        if (currInd.valueInKg.lt(prevInd.valueInKg)) {
          flags.push({
            code: "ANOMALY_NON_MONOTONIC_INDICATION",
            severity: "CRITICAL",
            rule: "Monotonicity: Indication must increase with increasing load",
            message: `Non-monotonic step detected between index ${prev.stepIndex ?? i - 1} and ${curr.stepIndex ?? i}: Load increased from ${prevLoad.value} to ${currLoad.value} ${currLoad.unit}, but indication decreased from ${prevInd.value} to ${currInd.value} ${currInd.unit}.`,
            loadPoint: `${currLoad.value} ${currLoad.unit}`,
            details: {
              previousStepIndex: prev.stepIndex ?? i - 1,
              currentStepIndex: curr.stepIndex ?? i,
              previousLoad: prevLoad.value.toFixed(),
              currentLoad: currLoad.value.toFixed(),
              previousIndication: prevInd.value.toFixed(),
              currentIndication: currInd.value.toFixed(),
              unit: currLoad.unit,
            },
          });
        }
      }

      // Decreasing load step: currLoad < prevLoad
      if (currLoad.valueInKg.lt(prevLoad.valueInKg)) {
        if (currInd.valueInKg.gt(prevInd.valueInKg)) {
          flags.push({
            code: "ANOMALY_NON_MONOTONIC_INDICATION",
            severity: "CRITICAL",
            rule: "Monotonicity: Indication must decrease with decreasing load",
            message: `Non-monotonic step detected between index ${prev.stepIndex ?? i - 1} and ${curr.stepIndex ?? i}: Load decreased from ${prevLoad.value} to ${currLoad.value} ${currLoad.unit}, but indication increased from ${prevInd.value} to ${currInd.value} ${currInd.unit}.`,
            loadPoint: `${currLoad.value} ${currLoad.unit}`,
            details: {
              previousStepIndex: prev.stepIndex ?? i - 1,
              currentStepIndex: curr.stepIndex ?? i,
              previousLoad: prevLoad.value.toFixed(),
              currentLoad: currLoad.value.toFixed(),
              previousIndication: prevInd.value.toFixed(),
              currentIndication: currInd.value.toFixed(),
              unit: currLoad.unit,
            },
          });
        }
      }
    }

    return flags;
  }

  /**
   * Rule 2: Delta L Bounds
   * Fractional Vernier weight deltaL must fall within [0, e].
   */
  public checkDeltaL(
    deltaL: string | number | Decimal,
    eInput?: string | number | Decimal,
    options?: {
      unit?: UnitOfMeasurement;
      load?: string | number | Decimal;
      stepIndex?: number;
      id?: string;
    },
  ): AnomalyFlag | null {
    const defaultUnit = options?.unit || this.options.unit || "kg";
    const parsedDeltaL = parseMass(deltaL, defaultUnit);

    const effectiveE = eInput ?? this.options.e;
    if (effectiveE === undefined) {
      throw new Error("Verification scale interval (e) must be specified for deltaL check");
    }

    const parsedE = parseMass(effectiveE, this.options.eUnit || defaultUnit);
    if (parsedE.valueInKg.lte(0)) {
      throw new Error("Verification scale interval (e) must be strictly positive (> 0)");
    }

    // Check negative deltaL: deltaL < 0
    if (parsedDeltaL.valueInKg.lt(0)) {
      return {
        code: "ANOMALY_NEGATIVE_DELTA_L",
        severity: "CRITICAL",
        rule: "Delta L Bounds: Additional Vernier weight must be non-negative (deltaL >= 0)",
        message: `Negative fractional load deltaL=${parsedDeltaL.value} ${parsedDeltaL.unit} is physically invalid.`,
        loadPoint: options?.load ? `${options.load}` : undefined,
        details: {
          deltaL: parsedDeltaL.value.toFixed(),
          deltaLInKg: parsedDeltaL.valueInKg.toFixed(),
          stepIndex: options?.stepIndex,
          id: options?.id,
        },
      };
    }

    // Check excessive deltaL: deltaL > e
    if (parsedDeltaL.valueInKg.gt(parsedE.valueInKg)) {
      const ratio = parsedDeltaL.valueInKg.div(parsedE.valueInKg).toFixed(2);
      return {
        code: "ANOMALY_EXCESSIVE_DELTA_L",
        severity: "CRITICAL",
        rule: "Delta L Bounds: Additional Vernier weight must not exceed verification scale interval (deltaL <= e)",
        message: `Excessive fractional load deltaL=${parsedDeltaL.value} ${parsedDeltaL.unit} exceeds verification scale interval e=${parsedE.value} ${parsedE.unit} (${ratio}e > 1.0e).`,
        loadPoint: options?.load ? `${options.load}` : undefined,
        details: {
          deltaL: parsedDeltaL.value.toFixed(),
          e: parsedE.value.toFixed(),
          deltaLInKg: parsedDeltaL.valueInKg.toFixed(),
          eInKg: parsedE.valueInKg.toFixed(),
          ratioToE: ratio,
          stepIndex: options?.stepIndex,
          id: options?.id,
        },
      };
    }

    return null;
  }

  /**
   * Evaluates Delta L across an array of observations.
   */
  public checkDeltaLSequence(observations: DeltaLStep[]): AnomalyFlag[] {
    const flags: AnomalyFlag[] = [];
    for (let i = 0; i < observations.length; i++) {
      const obs = observations[i];
      const flag = this.checkDeltaL(obs.deltaL, obs.e, {
        unit: obs.unit,
        load: obs.load,
        stepIndex: obs.stepIndex ?? i,
        id: obs.id,
      });
      if (flag) {
        flags.push(flag);
      }
    }
    return flags;
  }

  /**
   * Rule 3: Environmental Stability
   * Temperature drift rate must not exceed 5.0 °C/hour per OIML R 76-1 Clause A.5.3.2.
   * Ambient temperature must remain within specified limits (e.g. 10 °C to 40 °C).
   */
  public checkEnvironmentalStability(input: EnvironmentalStabilityInput): AnomalyFlag[] {
    const flags: AnomalyFlag[] = [];

    const tempStart = new Decimal(input.tempStartC);
    const tempEnd = new Decimal(input.tempEndC);

    // Calculate duration in hours
    let hours: Decimal;
    if (input.durationHours !== undefined) {
      hours = new Decimal(input.durationHours);
    } else if (input.durationMinutes !== undefined) {
      hours = new Decimal(input.durationMinutes).div(60);
    } else if (input.startTime && input.endTime) {
      const startMs = new Date(input.startTime).getTime();
      const endMs = new Date(input.endTime).getTime();
      const diffMs = endMs - startMs;
      if (diffMs <= 0) {
        throw new Error("End time must be strictly after start time");
      }
      hours = new Decimal(diffMs).div(3600000);
    } else {
      throw new Error("Duration must be specified (via durationHours, durationMinutes, or startTime/endTime)");
    }

    if (hours.lte(0)) {
      throw new Error("Duration must be strictly positive (> 0 hours)");
    }

    const tempDiff = tempEnd.minus(tempStart).abs();
    const driftRate = tempDiff.div(hours);

    const maxRate = input.maxDriftRateCPerHour !== undefined
      ? new Decimal(input.maxDriftRateCPerHour)
      : this.options.maxDriftRateCPerHour !== undefined
      ? new Decimal(this.options.maxDriftRateCPerHour)
      : new Decimal(this.rulePack.environmentalConstraints.maxTemperatureDriftRateCPerHour);

    if (driftRate.gt(maxRate)) {
      flags.push({
        code: "ANOMALY_TEMPERATURE_DRIFT_EXCEEDED",
        severity: "CRITICAL",
        rule: "Environmental Stability: Thermal drift rate must not exceed 5.0 °C/h (OIML R 76-1 Cl A.5.3.2)",
        message: `Thermal drift rate of ${driftRate.toFixed(2)} °C/h exceeds maximum permissible limit of ${maxRate.toFixed(1)} °C/h.`,
        details: {
          tempStartC: tempStart.toFixed(2),
          tempEndC: tempEnd.toFixed(2),
          durationHours: hours.toFixed(4),
          driftRateCPerHour: driftRate.toFixed(2),
          maxPermissibleRate: maxRate.toFixed(1),
        },
      });
    }

    // Operating temperature range check
    const minTemp = input.tempMinC !== undefined
      ? new Decimal(input.tempMinC)
      : this.options.tempMinC !== undefined
      ? new Decimal(this.options.tempMinC)
      : new Decimal(this.rulePack.environmentalConstraints.defaultOperatingTempMinC);

    const maxTemp = input.tempMaxC !== undefined
      ? new Decimal(input.tempMaxC)
      : this.options.tempMaxC !== undefined
      ? new Decimal(this.options.tempMaxC)
      : new Decimal(this.rulePack.environmentalConstraints.defaultOperatingTempMaxC);

    if (tempStart.lt(minTemp) || tempStart.gt(maxTemp)) {
      flags.push({
        code: "ANOMALY_TEMPERATURE_OUT_OF_RANGE",
        severity: "WARNING",
        rule: "Environmental Range: Operating temperature must remain within designated limits",
        message: `Start temperature ${tempStart.toFixed(1)} °C is outside specified operating range [${minTemp.toFixed(1)} °C, ${maxTemp.toFixed(1)} °C].`,
        details: {
          temperatureC: tempStart.toFixed(2),
          minAllowedC: minTemp.toFixed(1),
          maxAllowedC: maxTemp.toFixed(1),
        },
      });
    }

    if (tempEnd.lt(minTemp) || tempEnd.gt(maxTemp)) {
      flags.push({
        code: "ANOMALY_TEMPERATURE_OUT_OF_RANGE",
        severity: "WARNING",
        rule: "Environmental Range: Operating temperature must remain within designated limits",
        message: `End temperature ${tempEnd.toFixed(1)} °C is outside specified operating range [${minTemp.toFixed(1)} °C, ${maxTemp.toFixed(1)} °C].`,
        details: {
          temperatureC: tempEnd.toFixed(2),
          minAllowedC: minTemp.toFixed(1),
          maxAllowedC: maxTemp.toFixed(1),
        },
      });
    }

    return flags;
  }

  /**
   * Rule 4: Tare Sanity
   * When tare is active, net indication must cancel completely to zero at zero net load
   * within zero-setting tolerance (default 0.25e).
   * Tare load must also not exceed scale maximum capacity Max.
   */
  public checkTareSanity(input: TareSanityInput): AnomalyFlag | null {
    const defaultUnit = input.unit || this.options.unit || "kg";
    const parsedNetLoad = parseMass(input.netLoad, defaultUnit);
    const parsedNetInd = parseMass(input.netIndication, defaultUnit);

    const effectiveE = input.e ?? this.options.e;
    const effectiveMax = input.max ?? this.options.max;

    // Tare capacity limit check
    if (input.tareLoad !== undefined && effectiveMax !== undefined) {
      const parsedTare = parseMass(input.tareLoad, defaultUnit);
      const parsedMax = parseMass(effectiveMax, this.options.maxUnit || defaultUnit);
      if (parsedTare.valueInKg.gt(parsedMax.valueInKg)) {
        return {
          code: "ANOMALY_OVERLOAD_EXCEEDED",
          severity: "CRITICAL",
          rule: "Tare Sanity: Applied tare load must not exceed scale maximum capacity",
          message: `Applied tare load ${parsedTare.value} ${parsedTare.unit} exceeds scale maximum capacity Max=${parsedMax.value} ${parsedMax.unit}.`,
          details: {
            tareLoad: parsedTare.value.toFixed(),
            max: parsedMax.value.toFixed(),
            unit: parsedTare.unit,
          },
        };
      }
    }

    // Zero net load cancellation check
    if (parsedNetLoad.valueInKg.isZero()) {
      let toleranceInKg: Decimal;

      if (effectiveE !== undefined) {
        const parsedE = parseMass(effectiveE, this.options.eUnit || defaultUnit);
        const factor = input.tareToleranceInDivisions !== undefined
          ? new Decimal(input.tareToleranceInDivisions)
          : this.options.tareToleranceInDivisions !== undefined
          ? new Decimal(this.options.tareToleranceInDivisions)
          : new Decimal("0.25");
        toleranceInKg = parsedE.valueInKg.mul(factor);
      } else {
        toleranceInKg = new Decimal(0);
      }

      const absIndInKg = parsedNetInd.valueInKg.abs();
      if (absIndInKg.gt(toleranceInKg)) {
        return {
          code: "ANOMALY_TARE_SANITY_FAILED",
          severity: "CRITICAL",
          rule: "Tare Sanity: Tare net indication must cancel completely to zero at zero net load",
          message: `Tare sanity failure: Non-zero net indication ${parsedNetInd.value} ${parsedNetInd.unit} observed at zero net load (exceeds zero tolerance threshold).`,
          loadPoint: `0 ${defaultUnit}`,
          details: {
            netIndication: parsedNetInd.value.toFixed(),
            toleranceInKg: toleranceInKg.toFixed(),
            unit: parsedNetInd.unit,
          },
        };
      }
    }

    return null;
  }

  /**
   * Additional Physical Sanity:
   * Checks for negative indication under positive load, negative applied load,
   * or scale overload beyond Max + 9e.
   */
  public checkPhysicalSanity(input: PhysicalSanityInput): AnomalyFlag[] {
    const flags: AnomalyFlag[] = [];
    const defaultUnit = input.unit || this.options.unit || "kg";
    const parsedLoad = parseMass(input.load, defaultUnit);
    const parsedInd = parseMass(input.indication, defaultUnit);

    const effectiveE = input.e ?? this.options.e;
    const effectiveMax = input.max ?? this.options.max;

    // 1. Negative load check
    if (parsedLoad.valueInKg.lt(0)) {
      flags.push({
        code: "ANOMALY_NEGATIVE_LOAD",
        severity: "CRITICAL",
        rule: "Physical Sanity: Test load must be non-negative (L >= 0)",
        message: `Negative test load L=${parsedLoad.value} ${parsedLoad.unit} is physically impossible.`,
        loadPoint: `${parsedLoad.value} ${parsedLoad.unit}`,
        details: {
          load: parsedLoad.value.toFixed(),
          stepIndex: input.stepIndex,
          id: input.id,
        },
      });
    }

    // 2. Negative indication under positive load
    if (parsedLoad.valueInKg.gt(0) && parsedInd.valueInKg.lt(0)) {
      flags.push({
        code: "ANOMALY_NEGATIVE_INDICATION",
        severity: "CRITICAL",
        rule: "Physical Sanity: Indication must be non-negative under positive applied load",
        message: `Negative indication I=${parsedInd.value} ${parsedInd.unit} observed under positive test load L=${parsedLoad.value} ${parsedLoad.unit}.`,
        loadPoint: `${parsedLoad.value} ${parsedLoad.unit}`,
        details: {
          load: parsedLoad.value.toFixed(),
          indication: parsedInd.value.toFixed(),
          stepIndex: input.stepIndex,
          id: input.id,
        },
      });
    }

    // 3. Overload limit Max + 9e (OIML R 76-1 Clause 4.1.2.6)
    if (effectiveMax !== undefined && effectiveE !== undefined) {
      const parsedMax = parseMass(effectiveMax, this.options.maxUnit || defaultUnit);
      const parsedE = parseMass(effectiveE, this.options.eUnit || defaultUnit);
      const overloadLimitInKg = parsedMax.valueInKg.plus(parsedE.valueInKg.mul(9));

      if (parsedLoad.valueInKg.gt(overloadLimitInKg)) {
        flags.push({
          code: "ANOMALY_OVERLOAD_EXCEEDED",
          severity: "CRITICAL",
          rule: "Overload Limit: Applied load must not exceed Max + 9e (OIML R 76-1 Cl 4.1.2.6)",
          message: `Applied test load L=${parsedLoad.value} ${parsedLoad.unit} exceeds scale overload display limit (Max + 9e).`,
          loadPoint: `${parsedLoad.value} ${parsedLoad.unit}`,
          details: {
            load: parsedLoad.value.toFixed(),
            max: parsedMax.value.toFixed(),
            e: parsedE.value.toFixed(),
            stepIndex: input.stepIndex,
            id: input.id,
          },
        });
      }
    }

    return flags;
  }

  /**
   * Audits an entire session dataset against all anomaly rules.
   */
  public auditSession(sessionData: SessionAuditInput): AnomalyAuditReport {
    const flags: AnomalyFlag[] = [];

    // Instrument settings override
    const e = sessionData.instrument?.e ?? this.options.e;
    const max = sessionData.instrument?.max ?? this.options.max;
    const defaultUnit = sessionData.instrument?.unit ?? this.options.unit ?? "kg";

    // 1. Observations: Monotonicity & Delta L & Physical Sanity
    if (sessionData.observations && sessionData.observations.length > 0) {
      // Monotonicity
      const monoFlags = this.checkMonotonicity(
        sessionData.observations.map((obs, idx) => ({
          load: obs.load,
          indication: obs.indication,
          unit: obs.unit || defaultUnit,
          stepIndex: obs.stepIndex ?? idx,
          id: obs.id,
        })),
      );
      flags.push(...monoFlags);

      // Delta L & Physical Sanity for each step
      for (let i = 0; i < sessionData.observations.length; i++) {
        const obs = sessionData.observations[i];
        const stepIndex = obs.stepIndex ?? i;

        // Delta L
        if (obs.deltaL !== undefined) {
          const deltaFlag = this.checkDeltaL(obs.deltaL, obs.e ?? e, {
            unit: obs.unit || defaultUnit,
            load: obs.load,
            stepIndex,
            id: obs.id,
          });
          if (deltaFlag) {
            flags.push(deltaFlag);
          }
        }

        // Physical sanity
        const physFlags = this.checkPhysicalSanity({
          load: obs.load,
          indication: obs.indication,
          e: obs.e ?? e,
          max,
          unit: obs.unit || defaultUnit,
          stepIndex,
          id: obs.id,
        });
        flags.push(...physFlags);
      }
    }

    // 2. Environmental Stability
    if (sessionData.environmental) {
      const envFlags = this.checkEnvironmentalStability(sessionData.environmental);
      flags.push(...envFlags);
    }

    // 3. Tare Runs
    if (sessionData.tareRuns && sessionData.tareRuns.length > 0) {
      for (const tareRun of sessionData.tareRuns) {
        const tareFlag = this.checkTareSanity({
          ...tareRun,
          e: tareRun.e ?? e,
          max: tareRun.max ?? max,
          unit: tareRun.unit || defaultUnit,
        });
        if (tareFlag) {
          flags.push(tareFlag);
        }
      }
    }

    const criticalCount = flags.filter((f) => f.severity === "CRITICAL").length;
    const warningCount = flags.filter((f) => f.severity === "WARNING").length;
    const totalAnomalies = flags.length;
    const hasAnomalies = totalAnomalies > 0;

    let summary: string;
    if (!hasAnomalies) {
      summary = "Session metrological sanity audit passed: 0 anomalies detected.";
    } else {
      const codes = Array.from(new Set(flags.map((f) => f.code))).join(", ");
      summary = `Session audit flagged ${totalAnomalies} anomaly/anomalies (${criticalCount} CRITICAL, ${warningCount} WARNING). Flagged codes: [${codes}].`;
    }

    return {
      hasAnomalies,
      totalAnomalies,
      criticalCount,
      warningCount,
      flags,
      summary,
    };
  }

  // --- Static Convenience API ---

  public static checkMonotonicity(
    sequence: MonotonicityStep[],
    options?: AnomalyDetectorOptions,
  ): AnomalyFlag[] {
    return new AnomalyDetector(options).checkMonotonicity(sequence);
  }

  public static checkDeltaL(
    deltaL: string | number | Decimal,
    e: string | number | Decimal,
    options?: {
      unit?: UnitOfMeasurement;
      load?: string | number | Decimal;
      stepIndex?: number;
      id?: string;
    },
  ): AnomalyFlag | null {
    return new AnomalyDetector().checkDeltaL(deltaL, e, options);
  }

  public static checkEnvironmentalStability(
    input: EnvironmentalStabilityInput,
    options?: AnomalyDetectorOptions,
  ): AnomalyFlag[] {
    return new AnomalyDetector(options).checkEnvironmentalStability(input);
  }

  public static checkTareSanity(
    input: TareSanityInput,
    options?: AnomalyDetectorOptions,
  ): AnomalyFlag | null {
    return new AnomalyDetector(options).checkTareSanity(input);
  }

  public static audit(
    sessionData: SessionAuditInput,
    options?: AnomalyDetectorOptions,
  ): AnomalyAuditReport {
    return new AnomalyDetector(options).auditSession(sessionData);
  }
}
