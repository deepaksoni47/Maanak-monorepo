"use client";

import React, { useState } from "react";
import {
  Thermometer,
  Drop,
  Clock,
  CheckCircle,
  WarningCircle,
  CaretRight,
  ArrowsClockwise,
  FloppyDisk,
  Gauge,
  Sparkle,
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface Form2StepData {
  stepIndex: number;
  label: string;
  temperatureC: number;
  humidityPercent: number;
  elapsedMinutes: number; // ramp + soak time
  timestamp: string;
  indicationZeroI0: number; // I0
  deltaL0: number; // deltaL0
  eVal: number;
  unit: string;
}

export interface Form2StepResult {
  P0: number;
  E0: number;
  zeroErrorInDivisions: number;
  isZeroCompliant: boolean;
  maxAllowedE0: number;
  // Transition metrics from previous step (if applicable)
  deltaT?: number;
  elapsedHours?: number;
  rampRateCPerHour?: number;
  isRampRateCompliant?: boolean;
  zeroDrift?: number;
  maxAllowedDrift?: number;
  isDriftCompliant?: boolean;
  isOverallPass: boolean;
}

export interface Form2TempDriftCardProps {
  initialSteps?: Form2StepData[];
  eVal?: number;
  unit?: string;
  accuracyClass?: string;
  onSaveStep?: (step: Form2StepData, result: Form2StepResult) => void;
  onCompleteSeries?: (steps: Form2StepData[], results: Form2StepResult[]) => void;
  disabled?: boolean;
  className?: string;
}

export const DEFAULT_FORM2_STEPS: Form2StepData[] = [
  {
    stepIndex: 1,
    label: "Step 1: Reference Temperature (20°C)",
    temperatureC: 20.0,
    humidityPercent: 50,
    elapsedMinutes: 120,
    timestamp: "10:00",
    indicationZeroI0: 0.0,
    deltaL0: 0.0025,
    eVal: 0.005,
    unit: "kg",
  },
  {
    stepIndex: 2,
    label: "Step 2: High Temperature (+40°C)",
    temperatureC: 40.0,
    humidityPercent: 50,
    elapsedMinutes: 300, // 5 hours ramp+soak
    timestamp: "15:00",
    indicationZeroI0: 0.0,
    deltaL0: 0.002,
    eVal: 0.005,
    unit: "kg",
  },
  {
    stepIndex: 3,
    label: "Step 3: Low Temperature (-10°C)",
    temperatureC: -10.0,
    humidityPercent: 45,
    elapsedMinutes: 660, // 11 hours ramp+soak
    timestamp: "02:00",
    indicationZeroI0: 0.0,
    deltaL0: 0.003,
    eVal: 0.005,
    unit: "kg",
  },
  {
    stepIndex: 4,
    label: "Step 4: Final Return (20°C)",
    temperatureC: 20.0,
    humidityPercent: 50,
    elapsedMinutes: 420, // 7 hours return
    timestamp: "09:00",
    indicationZeroI0: 0.0,
    deltaL0: 0.0025,
    eVal: 0.005,
    unit: "kg",
  },
];

/**
 * Deterministic computation of Form 2 Turning Point and Thermal Drift
 * per OIML R 76-1 Clauses A.5.3.2 and 3.9.2.2
 */
export function computeForm2StepResult(
  current: Form2StepData,
  previous?: Form2StepData,
  accuracyClass: string = "CLASS_III"
): Form2StepResult {
  const e = current.eVal;
  // P0 = I0 + 0.5e - deltaL0
  const P0 = +(current.indicationZeroI0 + 0.5 * e - current.deltaL0).toFixed(6);
  // E0 = P0 - 0 = P0
  const E0 = P0;
  const zeroErrorInDivisions = +(E0 / e).toFixed(3);

  // Maximum allowed zero error at no load is +/- 0.5e under test conditions (OIML A.4.4.2)
  const maxAllowedE0 = +(0.5 * e).toFixed(6);
  const isZeroCompliant = Math.abs(E0) <= maxAllowedE0 + 1e-9;

  let deltaT: number | undefined;
  let elapsedHours: number | undefined;
  let rampRateCPerHour: number | undefined;
  let isRampRateCompliant: boolean | undefined;
  let zeroDrift: number | undefined;
  let maxAllowedDrift: number | undefined;
  let isDriftCompliant: boolean | undefined;

  if (previous) {
    deltaT = Math.abs(current.temperatureC - previous.temperatureC);
    elapsedHours = +(current.elapsedMinutes / 60).toFixed(2);
    // Ramp rate = deltaT / deltaT_hours
    rampRateCPerHour = elapsedHours > 0 ? +(deltaT / elapsedHours).toFixed(2) : 0;
    // OIML R 76-1 Clause A.5.3.1: Chamber ramp rate shall not exceed 5.0 °C/h
    isRampRateCompliant = rampRateCPerHour <= 5.0 + 1e-9;

    // Previous step's zero error
    const prevE0 = +(previous.indicationZeroI0 + 0.5 * previous.eVal - previous.deltaL0).toFixed(6);
    zeroDrift = +Math.abs(E0 - prevE0).toFixed(6);

    // Clause 3.9.2.2: Zero indication shall not vary by more than 1e per:
    // Class I: 1°C, Class II: 2°C, Class III: 5°C, Class IIII: 5°C
    const tempDivisor = accuracyClass === "CLASS_I" ? 1 : accuracyClass === "CLASS_II" ? 2 : 5;
    maxAllowedDrift = +((deltaT / tempDivisor) * e).toFixed(6);
    isDriftCompliant = zeroDrift <= maxAllowedDrift + 1e-9;
  }

  const isOverallPass =
    isZeroCompliant &&
    (isRampRateCompliant === undefined || isRampRateCompliant) &&
    (isDriftCompliant === undefined || isDriftCompliant);

  return {
    P0,
    E0,
    zeroErrorInDivisions,
    isZeroCompliant,
    maxAllowedE0,
    deltaT,
    elapsedHours,
    rampRateCPerHour,
    isRampRateCompliant,
    zeroDrift,
    maxAllowedDrift,
    isDriftCompliant,
    isOverallPass,
  };
}

export function Form2TempDriftCard({
  initialSteps = DEFAULT_FORM2_STEPS,
  eVal = 0.005,
  unit = "kg",
  accuracyClass = "CLASS_III",
  onSaveStep,
  onCompleteSeries,
  disabled = false,
  className = "",
}: Form2TempDriftCardProps) {
  const [steps, setSteps] = useState<Form2StepData[]>(() =>
    initialSteps.map((s) => ({ ...s, eVal, unit }))
  );
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [savedSteps, setSavedSteps] = useState<Record<number, boolean>>({});

  const currentStep = steps[activeStepIndex] || steps[0];
  const previousStep = activeStepIndex > 0 ? steps[activeStepIndex - 1] : undefined;

  const currentResult = computeForm2StepResult(currentStep, previousStep, accuracyClass);

  const handleUpdateCurrentStep = (fields: Partial<Form2StepData>) => {
    setSteps((prev) => {
      const updated = [...prev];
      updated[activeStepIndex] = { ...updated[activeStepIndex], ...fields };
      return updated;
    });
  };

  const handleSaveAndAdvance = () => {
    setSavedSteps((prev) => ({ ...prev, [currentStep.stepIndex]: true }));
    if (onSaveStep) {
      onSaveStep(currentStep, currentResult);
    }
    if (activeStepIndex < steps.length - 1) {
      setActiveStepIndex(activeStepIndex + 1);
    } else {
      if (onCompleteSeries) {
        const allResults = steps.map((s, idx) =>
          computeForm2StepResult(s, idx > 0 ? steps[idx - 1] : undefined, accuracyClass)
        );
        onCompleteSeries(steps, allResults);
      }
    }
  };

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Step Selector Tab Pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {steps.map((st, idx) => {
          const isSelected = idx === activeStepIndex;
          const isSaved = !!savedSteps[st.stepIndex];
          const prev = idx > 0 ? steps[idx - 1] : undefined;
          const res = computeForm2StepResult(st, prev, accuracyClass);

          return (
            <button
              key={st.stepIndex}
              type="button"
              onClick={() => setActiveStepIndex(idx)}
              className={`min-h-[48px] px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                  : isSaved
                  ? res.isOverallPass
                    ? "bg-transparent text-emerald-700 dark:text-emerald-400 border-neutral-300 dark:border-neutral-700"
                    : "bg-transparent text-destructive border-neutral-300 dark:border-neutral-700"
                  : "bg-card text-muted-foreground border-neutral-300 dark:border-neutral-700 hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[11px] font-bold ${
                  isSelected
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : isSaved
                    ? res.isOverallPass
                      ? "border border-neutral-300 dark:border-neutral-700 text-emerald-600 dark:text-emerald-300"
                      : "border border-neutral-300 dark:border-neutral-700 text-destructive"
                    : "border border-neutral-300 dark:border-neutral-700 text-foreground"
                }`}
              >
                #{st.stepIndex}
              </div>
              <div className="flex flex-col text-left">
                <span className="truncate">{st.temperatureC > 0 ? `+${st.temperatureC}` : st.temperatureC}°C Chamber</span>
                <span className="text-[10px] opacity-80 font-mono">
                  {idx === 0 ? "Initial 20°C" : idx === 3 ? "Return 20°C" : st.temperatureC > 0 ? "High Temp" : "Low Temp"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Temperature Step Observation Card */}
      <Card className="border border-neutral-300 dark:border-neutral-700 bg-card shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-neutral-300 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl text-primary flex items-center justify-center shrink-0">
                <Thermometer size={18} weight="duotone" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground">
                {currentStep.label}
              </CardTitle>
              <Badge
                variant={currentResult.isOverallPass ? "pass" : "fail"}
                showIcon={false}
                className="py-0.5 px-2 text-[10px] font-mono"
              >
                {currentResult.isOverallPass ? "PASS" : "FAIL"}
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              OIML R 76-1 Clause A.5.3.2: Record zero indication $I_0$ and changeover load $\Delta L_0$ after chamber stabilization.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-muted-foreground">
              Verification Interval e = <strong className="text-foreground">{eVal} {unit}</strong>
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Chamber Ambient Settings Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-muted/30">
            {/* Temperature Setting */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Thermometer size={13} className="text-amber-500" />
                Chamber Temperature (°C)
              </label>
              <Input
                type="number"
                step="0.5"
                value={currentStep.temperatureC}
                disabled={disabled}
                onChange={(e) => handleUpdateCurrentStep({ temperatureC: parseFloat(e.target.value) || 0 })}
                className="font-mono text-xs h-10"
              />
              {/* Quick temperature presets */}
              <div className="flex items-center gap-1 mt-1">
                {[-10, 5, 20, 40].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleUpdateCurrentStep({ temperatureC: t })}
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono transition-all ${
                      currentStep.temperatureC === t
                        ? "bg-primary text-primary-foreground font-bold"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {t > 0 ? `+${t}` : t}°C
                  </button>
                ))}
              </div>
            </div>

            {/* Humidity Setting */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Drop size={13} className="text-sky-500" />
                Relative Humidity (% RH)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={currentStep.humidityPercent}
                disabled={disabled}
                onChange={(e) => handleUpdateCurrentStep({ humidityPercent: parseFloat(e.target.value) || 50 })}
                className="font-mono text-xs h-10"
              />
              <span className="text-[10px] text-muted-foreground font-mono">
                Nominal: 50% ± 10%
              </span>
            </div>

            {/* Ramp & Soak Duration */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Clock size={13} className="text-primary" />
                Soak Duration (min)
              </label>
              <Input
                type="number"
                min="120"
                step="30"
                value={currentStep.elapsedMinutes}
                disabled={disabled}
                onChange={(e) => handleUpdateCurrentStep({ elapsedMinutes: parseInt(e.target.value, 10) || 120 })}
                className="font-mono text-xs h-10"
              />
              <span className="text-[10px] text-muted-foreground font-mono">
                Statutory min: 120 min (2 h)
              </span>
            </div>
          </div>

          {/* Observations Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: Input values for I0 and Delta L0 */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Gauge size={14} className="text-primary" />
                Zero Observation Inputs
              </h4>

              {/* No-Load Displayed Indication I0 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-foreground">
                    Observed Zero Indication ($I_0$)
                  </label>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    Nominal: 0.000 {unit}
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.001"
                  value={currentStep.indicationZeroI0}
                  disabled={disabled}
                  onChange={(e) =>
                    handleUpdateCurrentStep({ indicationZeroI0: parseFloat(e.target.value) || 0 })
                  }
                  className="font-mono text-sm h-11"
                  placeholder="0.000"
                />
              </div>

              {/* Vernier Fractional Changeover Weight Delta L0 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-foreground">
                    Vernier Added Load ($\Delta L_0$)
                  </label>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    Target: 0.5e = {(0.5 * eVal).toFixed(4)} {unit}
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.0005"
                  value={currentStep.deltaL0}
                  disabled={disabled}
                  onChange={(e) =>
                    handleUpdateCurrentStep({ deltaL0: parseFloat(e.target.value) || 0 })
                  }
                  className="font-mono text-sm h-11"
                  placeholder="0.0025"
                />

                {/* Quick Auto-Fill Vernier Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {[0.2, 0.4, 0.5, 0.6, 0.8].map((fraction) => {
                    const presetVal = +(fraction * eVal).toFixed(5);
                    return (
                      <button
                        key={fraction}
                        type="button"
                        onClick={() => handleUpdateCurrentStep({ deltaL0: presetVal })}
                        className="text-[10px] font-mono px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer border border-neutral-300 dark:border-neutral-700"
                      >
                        {fraction}e ({presetVal})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Real-time Mathematical Deterministic Evaluation */}
            <div className="space-y-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-muted/20 p-4">
              <h4 className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Calculated Zero Metrics</span>
                <span className="text-[10px] font-mono text-primary font-bold">Clause A.5.3.2</span>
              </h4>

              {/* Turning Point & Zero Error */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-card border border-neutral-300 dark:border-neutral-700">
                  <span className="text-[10px] text-muted-foreground block">Zero Turning Point ($P_0$)</span>
                  <span className="font-mono font-bold text-sm text-foreground">
                    {currentResult.P0 >= 0 ? `+${currentResult.P0.toFixed(4)}` : currentResult.P0.toFixed(4)} {unit}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-card border border-neutral-300 dark:border-neutral-700">
                  <span className="text-[10px] text-muted-foreground block">Zero Error ($E_0$)</span>
                  <span className={`font-mono font-bold text-sm ${currentResult.isZeroCompliant ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                    {currentResult.E0 >= 0 ? `+${currentResult.E0.toFixed(4)}` : currentResult.E0.toFixed(4)} {unit}
                    <span className="text-[10px] text-muted-foreground ml-1">({currentResult.zeroErrorInDivisions}e)</span>
                  </span>
                </div>
              </div>

              {/* Temperature Transition Metrics (if step > 1) */}
              {previousStep && (
                <div className="space-y-2 pt-1 border-t border-neutral-300 dark:border-neutral-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Transition from Step #{previousStep.stepIndex}:</span>
                    <span className="font-mono font-bold text-foreground">
                      {previousStep.temperatureC}°C → {currentStep.temperatureC}°C (Δ{currentResult.deltaT}°C)
                    </span>
                  </div>

                  {/* Chamber Ramp Rate Check */}
                  <div className="p-2.5 rounded-lg bg-card border border-neutral-300 dark:border-neutral-700 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Chamber Ramp Rate ($\Delta T / \Delta t$)</span>
                      <span className="font-mono font-bold text-foreground">
                        {currentResult.rampRateCPerHour} °C/h
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">Limit: ≤ 5.0 °C/h</span>
                      <Badge
                        variant={currentResult.isRampRateCompliant ? "pass" : "fail"}
                        showIcon={false}
                        className="py-0 px-1.5 text-[9px]"
                      >
                        {currentResult.isRampRateCompliant ? "PASS" : "FAIL"}
                      </Badge>
                    </div>
                  </div>

                  {/* Thermal Zero Drift Check */}
                  <div className="p-2.5 rounded-lg bg-card border border-neutral-300 dark:border-neutral-700 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Zero Drift ($\Delta E_0$)</span>
                      <span className="font-mono font-bold text-foreground">
                        {currentResult.zeroDrift} {unit}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">
                        Limit: ≤ {currentResult.maxAllowedDrift} {unit}
                      </span>
                      <Badge
                        variant={currentResult.isDriftCompliant ? "pass" : "fail"}
                        showIcon={false}
                        className="py-0 px-1.5 text-[9px]"
                      >
                        {currentResult.isDriftCompliant ? "PASS" : "FAIL"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Status summary banner */}
              <div className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                currentResult.isOverallPass
                  ? "border-neutral-300 dark:border-neutral-700 bg-card text-emerald-600 dark:text-emerald-400"
                  : "border-neutral-300 dark:border-neutral-700 bg-card text-destructive"
              }`}>
                {currentResult.isOverallPass ? <CheckCircle size={16} /> : <WarningCircle size={16} />}
                <span className="font-semibold text-[11px]">
                  {currentResult.isOverallPass
                    ? `Temperature Step #${currentStep.stepIndex} satisfies OIML R-76 thermal drift tolerances.`
                    : `Zero error or drift rate exceeds statutory limits per Clause 3.9.2.2.`}
                </span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-300 dark:border-neutral-700">
            <div className="text-xs text-muted-foreground">
              Step <strong className="text-foreground">{activeStepIndex + 1}</strong> of {steps.length}
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSaveAndAdvance}
              rightIcon={<CaretRight size={16} />}
              className="min-h-[48px] px-5 text-xs font-semibold"
            >
              {activeStepIndex < steps.length - 1 ? "Save & Advance to Next Temperature Step" : "Complete Form 2 Test Battery"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
