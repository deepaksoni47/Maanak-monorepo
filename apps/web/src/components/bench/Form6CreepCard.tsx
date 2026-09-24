"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Timer,
  CheckCircle,
  WarningCircle,
  Play,
  Pause,
  ArrowClockwise,
  FastForward,
  FloppyDisk,
  Gauge,
  Sparkle,
  Hourglass,
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface CreepTimedObservation {
  timeMinutes: number; // 0, 5, 15, 30
  label: string;
  appliedLoad: number;
  indication: number;
  deltaL: number;
  P: number;
  unit: string;
}

export interface ZeroReturnObservation {
  timeMinutes: number; // 30.5
  label: string;
  appliedLoad: number; // 0
  indication: number;
  deltaL: number;
  P: number;
  unit: string;
}

export interface Form6CreepEvaluationResult {
  totalCreep30m: number; // |P30 - P0|
  maxAllowedCreep30m: number; // 0.5e
  isTotalCreepValid: boolean;

  creep15To30m: number; // |P30 - P15|
  maxAllowedCreep15To30m: number; // 0.2e
  isCreep15To30mValid: boolean;

  zeroReturnDrift: number; // |P_ret - P0_zero|
  maxAllowedZeroReturn: number; // 0.5e
  isZeroReturnValid: boolean;

  isOverallCompliant: boolean;
}

export interface Form6CreepCardProps {
  maxCapacityKg?: number;
  verificationIntervalKg?: number;
  accuracyClass?: string;
  unit?: string;
  onSaveForm6?: (
    creepSteps: CreepTimedObservation[],
    zeroReturn: ZeroReturnObservation,
    result: Form6CreepEvaluationResult
  ) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Calculates turning point P = I + 0.5e - deltaL
 */
export function computeCreepTurningPoint(
  indication: number,
  deltaL: number,
  eVal: number
): number {
  return +(indication + 0.5 * eVal - deltaL).toFixed(5);
}

/**
 * Evaluates statutory compliance per OIML R 76-1 Clauses 3.9.4.1 & 3.9.4.2
 */
export function evaluateForm6CreepCompliance(
  creepSteps: CreepTimedObservation[],
  zeroStartP: number,
  zeroReturnP: number,
  eVal: number
): Form6CreepEvaluationResult {
  const p0Step = creepSteps.find((s) => s.timeMinutes === 0);
  const p15Step = creepSteps.find((s) => s.timeMinutes === 15);
  const p30Step = creepSteps.find((s) => s.timeMinutes === 30);

  const p0 = p0Step ? p0Step.P : 0;
  const p15 = p15Step ? p15Step.P : p0;
  const p30 = p30Step ? p30Step.P : p0;

  // Clause 3.9.4.1: Total 30-min Creep <= 0.5e
  const totalCreep30m = +Math.abs(p30 - p0).toFixed(5);
  const maxAllowedCreep30m = +(0.5 * eVal).toFixed(5);
  const isTotalCreepValid = totalCreep30m <= maxAllowedCreep30m + 1e-9;

  // Clause 3.9.4.1: Creep between 15 and 30 min <= 0.2e
  const creep15To30m = +Math.abs(p30 - p15).toFixed(5);
  const maxAllowedCreep15To30m = +(0.2 * eVal).toFixed(5);
  const isCreep15To30mValid = creep15To30m <= maxAllowedCreep15To30m + 1e-9;

  // Clause 3.9.4.2: Zero Return after discharge <= 0.5e
  const zeroReturnDrift = +Math.abs(zeroReturnP - zeroStartP).toFixed(5);
  const maxAllowedZeroReturn = +(0.5 * eVal).toFixed(5);
  const isZeroReturnValid = zeroReturnDrift <= maxAllowedZeroReturn + 1e-9;

  const isOverallCompliant = isTotalCreepValid && isCreep15To30mValid && isZeroReturnValid;

  return {
    totalCreep30m,
    maxAllowedCreep30m,
    isTotalCreepValid,
    creep15To30m,
    maxAllowedCreep15To30m,
    isCreep15To30mValid,
    zeroReturnDrift,
    maxAllowedZeroReturn,
    isZeroReturnValid,
    isOverallCompliant,
  };
}

/**
 * Generates default creep observations for Max load and zero return.
 */
export function generateDefaultForm6Steps(
  maxKg: number = 15,
  eVal: number = 0.005,
  unit: string = "kg"
): {
  creepSteps: CreepTimedObservation[];
  zeroStart: { indication: number; deltaL: number; P: number };
  zeroReturn: ZeroReturnObservation;
} {
  const defaultDeltaL = +(0.5 * eVal).toFixed(5);
  const zeroStartP = computeCreepTurningPoint(0, defaultDeltaL, eVal);

  const creepSteps: CreepTimedObservation[] = [
    {
      timeMinutes: 0,
      label: "t = 0 min (Initial Load)",
      appliedLoad: maxKg,
      indication: maxKg,
      deltaL: defaultDeltaL,
      P: maxKg,
      unit,
    },
    {
      timeMinutes: 5,
      label: "t = 5 min (Settle Check)",
      appliedLoad: maxKg,
      indication: maxKg,
      deltaL: defaultDeltaL,
      P: maxKg,
      unit,
    },
    {
      timeMinutes: 15,
      label: "t = 15 min (Midpoint Creep)",
      appliedLoad: maxKg,
      indication: maxKg,
      deltaL: defaultDeltaL,
      P: maxKg,
      unit,
    },
    {
      timeMinutes: 30,
      label: "t = 30 min (Final Creep & Unload)",
      appliedLoad: maxKg,
      indication: maxKg,
      deltaL: defaultDeltaL,
      P: maxKg,
      unit,
    },
  ];

  const zeroReturn: ZeroReturnObservation = {
    timeMinutes: 30.5,
    label: "t = 30.5 min (Zero Return Recovery)",
    appliedLoad: 0,
    indication: 0,
    deltaL: defaultDeltaL,
    P: 0,
    unit,
  };

  return {
    creepSteps,
    zeroStart: { indication: 0, deltaL: defaultDeltaL, P: zeroStartP },
    zeroReturn,
  };
}

export function Form6CreepCard({
  maxCapacityKg = 15,
  verificationIntervalKg = 0.005,
  accuracyClass = "CLASS_III",
  unit = "kg",
  onSaveForm6,
  disabled = false,
  className = "",
}: Form6CreepCardProps) {
  const effectiveMax = maxCapacityKg > 0 ? maxCapacityKg : 15;
  const effectiveE = verificationIntervalKg > 0 ? verificationIntervalKg : 0.005;

  const defaults = generateDefaultForm6Steps(effectiveMax, effectiveE, unit);

  const [creepSteps, setCreepSteps] = useState<CreepTimedObservation[]>(defaults.creepSteps);
  const [zeroStart, setZeroStart] = useState(defaults.zeroStart);
  const [zeroReturn, setZeroReturn] = useState<ZeroReturnObservation>(defaults.zeroReturn);

  // Digital Timer State (seconds elapsed, max 1830s = 30m 30s)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev >= 1830) {
            setIsTimerRunning(false);
            return 1830;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleSimulateNextMilestone = () => {
    if (elapsedSeconds < 300) {
      setElapsedSeconds(300); // 5 min
    } else if (elapsedSeconds < 900) {
      setElapsedSeconds(900); // 15 min
    } else if (elapsedSeconds < 1800) {
      setElapsedSeconds(1800); // 30 min
    } else if (elapsedSeconds < 1830) {
      setElapsedSeconds(1830); // 30.5 min
      setIsTimerRunning(false);
    }
  };

  const handleUpdateCreepStep = (
    timeMinutes: number,
    field: "indication" | "deltaL",
    value: number
  ) => {
    setCreepSteps((prev) =>
      prev.map((step) => {
        if (step.timeMinutes !== timeMinutes) return step;
        const newIndication = field === "indication" ? value : step.indication;
        const newDeltaL = field === "deltaL" ? value : step.deltaL;
        const newP = computeCreepTurningPoint(newIndication, newDeltaL, effectiveE);
        return {
          ...step,
          indication: newIndication,
          deltaL: newDeltaL,
          P: newP,
        };
      })
    );
  };

  const handleUpdateZeroReturn = (field: "indication" | "deltaL", value: number) => {
    setZeroReturn((prev) => {
      const newIndication = field === "indication" ? value : prev.indication;
      const newDeltaL = field === "deltaL" ? value : prev.deltaL;
      const newP = computeCreepTurningPoint(newIndication, newDeltaL, effectiveE);
      return {
        ...prev,
        indication: newIndication,
        deltaL: newDeltaL,
        P: newP,
      };
    });
  };

  const results = evaluateForm6CreepCompliance(
    creepSteps,
    zeroStart.P,
    zeroReturn.P,
    effectiveE
  );

  const handleSave = () => {
    if (onSaveForm6) {
      onSaveForm6(creepSteps, zeroReturn, results);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Summary Banner */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Hourglass size={20} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-foreground">
                Form 6: Creep & Zero Return (30-Minute Timed Test)
              </h3>
              <Badge variant="outline" showIcon={false} className="py-0.5 px-2 text-[10px] font-mono">
                Clause A.4.11
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Statutory Limit: 30-min Creep <strong className="text-foreground font-mono">≤ 0.5e ({(0.5 * effectiveE).toFixed(4)} {unit})</strong>, 15–30 min Creep <strong className="text-foreground font-mono">≤ 0.2e ({(0.2 * effectiveE).toFixed(4)} {unit})</strong>, and Zero Return <strong className="text-foreground font-mono">≤ 0.5e</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg shrink-0">
          <span>Test Load: Max = {effectiveMax} {unit}</span>
          <span>·</span>
          <span>e: {effectiveE} {unit}</span>
        </div>
      </div>

      {/* Integrated Countdown & Milestone Stopwatch */}
      <Card className="border border-primary/20 bg-primary/5 shadow-xs">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <Timer size={32} weight="duotone" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Test Timer (30:00 Target)
              </span>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-foreground">
                {formatTimer(elapsedSeconds)}
                <span className="text-xs font-normal text-muted-foreground ml-2">/ 30:30</span>
              </div>
            </div>
          </div>

          {/* Stopwatch Controls */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button
              type="button"
              variant={isTimerRunning ? "secondary" : "default"}
              size="sm"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              disabled={disabled}
              className="gap-1.5 h-9 font-semibold text-xs"
            >
              {isTimerRunning ? <Pause size={14} weight="bold" /> : <Play size={14} weight="bold" />}
              <span>{isTimerRunning ? "Pause" : "Start Timer"}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsTimerRunning(false);
                setElapsedSeconds(0);
              }}
              disabled={disabled}
              className="gap-1.5 h-9 text-xs"
            >
              <ArrowClockwise size={14} />
              <span>Reset</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSimulateNextMilestone}
              disabled={disabled || elapsedSeconds >= 1830}
              className="gap-1.5 h-9 text-xs border-primary/30 text-primary hover:bg-primary/10"
            >
              <FastForward size={14} weight="bold" />
              <span>Simulate Next Milestone</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statutory Evaluation Criteria Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 30-Minute Creep */}
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
            <span>30-min Creep (|P30 - P0|)</span>
            <Gauge size={14} className="text-primary" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-foreground">
              {results.totalCreep30m}
            </span>
            <span className="text-xs text-muted-foreground font-mono">{unit}</span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground font-mono flex items-center justify-between">
            <span>Limit: ≤ {results.maxAllowedCreep30m}</span>
            <Badge
              variant={results.isTotalCreepValid ? "pass" : "fail"}
              showIcon={false}
              className="text-[9px] py-0 px-1 font-mono"
            >
              {results.isTotalCreepValid ? "PASS" : "FAIL"}
            </Badge>
          </div>
        </div>

        {/* 15-to-30-Minute Creep Rate */}
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
            <span>15–30 min (|P30 - P15|)</span>
            <Gauge size={14} className="text-primary" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-foreground">
              {results.creep15To30m}
            </span>
            <span className="text-xs text-muted-foreground font-mono">{unit}</span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground font-mono flex items-center justify-between">
            <span>Limit: ≤ {results.maxAllowedCreep15To30m}</span>
            <Badge
              variant={results.isCreep15To30mValid ? "pass" : "fail"}
              showIcon={false}
              className="text-[9px] py-0 px-1 font-mono"
            >
              {results.isCreep15To30mValid ? "PASS" : "FAIL"}
            </Badge>
          </div>
        </div>

        {/* Zero Return Drift */}
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
            <span>Zero Return Drift (30.5m)</span>
            <Gauge size={14} className="text-primary" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-foreground">
              {results.zeroReturnDrift}
            </span>
            <span className="text-xs text-muted-foreground font-mono">{unit}</span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground font-mono flex items-center justify-between">
            <span>Limit: ≤ {results.maxAllowedZeroReturn}</span>
            <Badge
              variant={results.isZeroReturnValid ? "pass" : "fail"}
              showIcon={false}
              className="text-[9px] py-0 px-1 font-mono"
            >
              {results.isZeroReturnValid ? "PASS" : "FAIL"}
            </Badge>
          </div>
        </div>

        {/* Overall Status */}
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-muted-foreground">
            Form 6 Creep Status
          </div>
          <div className="mt-1">
            <Badge
              variant={results.isOverallCompliant ? "pass" : "fail"}
              showIcon={false}
              className="text-xs font-mono font-bold py-1 px-2.5 w-full justify-center"
            >
              {results.isOverallCompliant ? "PASS (ALL CRITERIA)" : "FAIL (OUT OF TOLERANCE)"}
            </Badge>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground text-center">
            {results.isOverallCompliant
              ? "Satisfies Clause 3.9.4"
              : "Exceeds OIML R-76 Creep Limit"}
          </div>
        </div>
      </div>

      {/* Creep Timed Observations Ledger */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">
              Timed Creep Observations under Max Load ({effectiveMax} {unit})
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Keep Max load continuously applied for 30 minutes. At t = 30 min, record indication then unload for zero return check.
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSave}
            disabled={disabled}
            className="text-xs gap-1.5 h-8 font-semibold"
          >
            <FloppyDisk size={13} />
            <span>Save Form 6</span>
          </Button>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Milestone / Time</th>
                <th className="py-2.5 px-3 font-semibold">Load (L)</th>
                <th className="py-2.5 px-3 font-semibold min-w-[130px]">Indication (I)</th>
                <th className="py-2.5 px-3 font-semibold min-w-[130px]">Vernier (ΔL)</th>
                <th className="py-2.5 px-3 font-semibold">Turning Point (P)</th>
                <th className="py-2.5 px-3 font-semibold">Creep Δ from P0</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {creepSteps.map((step) => {
                const p0 = creepSteps[0]?.P || step.appliedLoad;
                const deltaFromP0 = +(step.P - p0).toFixed(5);
                return (
                  <tr key={step.timeMinutes} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-foreground">
                      {step.label}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {step.appliedLoad.toFixed(4)} {unit}
                    </td>
                    <td className="py-2.5 px-3">
                      <Input
                        type="number"
                        step="0.001"
                        value={step.indication}
                        disabled={disabled}
                        onChange={(e) =>
                          handleUpdateCreepStep(
                            step.timeMinutes,
                            "indication",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="h-8 text-xs font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <Input
                        type="number"
                        step="0.001"
                        value={step.deltaL}
                        disabled={disabled}
                        onChange={(e) =>
                          handleUpdateCreepStep(
                            step.timeMinutes,
                            "deltaL",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="h-8 text-xs font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-bold text-foreground">
                      {step.P.toFixed(5)} {unit}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-primary">
                      {deltaFromP0 >= 0 ? `+${deltaFromP0.toFixed(5)}` : deltaFromP0.toFixed(5)} {unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Zero Return Recovery Section (t = 30.5 min) */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center justify-center text-xs">
              0
            </span>
            <CardTitle className="text-sm font-bold text-foreground">
              Zero Return Recovery Evaluation (30 Seconds Post-Discharge)
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Immediately unload test weights at t = 30 min. After 30 seconds (t = 30.5 min), record zero return reading. Max allowable drift: ≤ 0.5e ({(0.5 * effectiveE).toFixed(4)} {unit}).
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Zero Return Indication (I₀,ret)
              </label>
              <Input
                type="number"
                step="0.001"
                value={zeroReturn.indication}
                disabled={disabled}
                onChange={(e) =>
                  handleUpdateZeroReturn("indication", parseFloat(e.target.value) || 0)
                }
                className="font-mono text-sm h-10"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Vernier Load (ΔL₀,ret)
              </label>
              <Input
                type="number"
                step="0.001"
                value={zeroReturn.deltaL}
                disabled={disabled}
                onChange={(e) =>
                  handleUpdateZeroReturn("deltaL", parseFloat(e.target.value) || 0)
                }
                className="font-mono text-sm h-10"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Zero Return Turning Point (P₀,ret)
              </label>
              <div className="h-10 px-3 rounded-md border border-border bg-muted/30 flex items-center justify-between font-mono text-sm font-bold text-foreground">
                <span>{zeroReturn.P.toFixed(5)} {unit}</span>
                <Badge
                  variant={results.isZeroReturnValid ? "pass" : "fail"}
                  showIcon={false}
                  className="text-[10px] py-0 px-2 font-mono"
                >
                  {results.isZeroReturnValid ? "PASS" : "FAIL"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
