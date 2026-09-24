"use client";

import React, { useState } from "react";
import {
  Crosshair,
  CheckCircle,
  WarningCircle,
  CaretRight,
  ArrowsClockwise,
  FloppyDisk,
  Gauge,
  Sparkle,
  Plus,
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface DiscriminationPointData {
  pointIndex: number; // 1 to 3
  label: string;
  appliedLoad: number; // Min, 1/2 Max, Max
  dVal: number; // Scale interval d
  initialIndicationI1: number;
  addedLoadDeltaL: number; // Auxiliary load 1.4d
  finalIndicationI2: number;
  unit: string;
}

export interface DiscriminationPointResult {
  deltaI: number; // I2 - I1
  requiredMinDeltaI: number; // 1.0d
  isCompliant: boolean;
  ratioToD: number;
}

export interface Form4DiscriminationCardProps {
  maxCapacityKg?: number;
  scaleIntervalD?: number;
  verificationIntervalKg?: number;
  accuracyClass?: string;
  unit?: string;
  onSavePoint?: (data: DiscriminationPointData, result: DiscriminationPointResult) => void;
  onCompleteSeries?: (points: DiscriminationPointData[], results: DiscriminationPointResult[]) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Generates the 3 mandatory statutory test points for OIML R 76-1 Clause A.4.8:
 * 1. Min (e.g. 20e, 50e, or 100e)
 * 2. 1/2 Max
 * 3. Max
 */
export function generateDefaultForm4Points(
  maxKg: number = 15,
  dKg: number = 0.005,
  accuracyClass: string = "CLASS_III",
  unit: string = "kg"
): DiscriminationPointData[] {
  const minMultiplier = accuracyClass === "CLASS_I" ? 100 : accuracyClass === "CLASS_II" ? 50 : 20;
  const minLoad = +(minMultiplier * dKg).toFixed(4);
  const halfMaxLoad = +(maxKg / 2).toFixed(4);
  const fullMaxLoad = maxKg;

  const addedLoad14d = +(1.4 * dKg).toFixed(5);

  return [
    {
      pointIndex: 1,
      label: "Point 1: Min Load",
      appliedLoad: minLoad,
      dVal: dKg,
      initialIndicationI1: minLoad,
      addedLoadDeltaL: addedLoad14d,
      finalIndicationI2: +(minLoad + dKg).toFixed(4),
      unit,
    },
    {
      pointIndex: 2,
      label: "Point 2: 1/2 Max Load",
      appliedLoad: halfMaxLoad,
      dVal: dKg,
      initialIndicationI1: halfMaxLoad,
      addedLoadDeltaL: addedLoad14d,
      finalIndicationI2: +(halfMaxLoad + dKg).toFixed(4),
      unit,
    },
    {
      pointIndex: 3,
      label: "Point 3: Max Load",
      appliedLoad: fullMaxLoad,
      dVal: dKg,
      initialIndicationI1: fullMaxLoad,
      addedLoadDeltaL: addedLoad14d,
      finalIndicationI2: +(fullMaxLoad + dKg).toFixed(4),
      unit,
    },
  ];
}

/**
 * Deterministic computation of discrimination response:
 * Clause 3.8.2.1: Adding 1.4d must cause indication to change by >= 1d
 */
export function computeDiscriminationResult(
  data: DiscriminationPointData
): DiscriminationPointResult {
  const deltaI = +(data.finalIndicationI2 - data.initialIndicationI1).toFixed(6);
  const requiredMinDeltaI = data.dVal;

  // Clause 3.8.2.1 requires an unambiguous step of at least 1d
  const isCompliant = deltaI >= requiredMinDeltaI - 1e-9;
  const ratioToD = data.dVal > 0 ? +(deltaI / data.dVal).toFixed(2) : 0;

  return {
    deltaI,
    requiredMinDeltaI,
    isCompliant,
    ratioToD,
  };
}

export function Form4DiscriminationCard({
  maxCapacityKg = 15,
  scaleIntervalD = 0.005,
  verificationIntervalKg = 0.005,
  accuracyClass = "CLASS_III",
  unit = "kg",
  onSavePoint,
  onCompleteSeries,
  disabled = false,
  className = "",
}: Form4DiscriminationCardProps) {
  const effectiveD = scaleIntervalD || verificationIntervalKg || 0.005;

  const [points, setPoints] = useState<DiscriminationPointData[]>(() =>
    generateDefaultForm4Points(maxCapacityKg, effectiveD, accuracyClass, unit)
  );

  const [activePointIndex, setActivePointIndex] = useState<number>(0);
  const [savedPoints, setSavedPoints] = useState<Record<number, boolean>>({});

  const currentPoint = points[activePointIndex] || points[0];
  const currentResult = computeDiscriminationResult(currentPoint);

  const handleUpdateCurrentPoint = (fields: Partial<DiscriminationPointData>) => {
    setPoints((prev) => {
      const updated = [...prev];
      updated[activePointIndex] = { ...updated[activePointIndex], ...fields };
      return updated;
    });
  };

  const handleSaveAndAdvance = () => {
    setSavedPoints((prev) => ({ ...prev, [currentPoint.pointIndex]: true }));
    if (onSavePoint) {
      onSavePoint(currentPoint, currentResult);
    }
    if (activePointIndex < points.length - 1) {
      setActivePointIndex(activePointIndex + 1);
    } else {
      if (onCompleteSeries) {
        const allResults = points.map((p) => computeDiscriminationResult(p));
        onCompleteSeries(points, allResults);
      }
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Summary Banner */}
      <div className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl text-primary flex items-center justify-center shrink-0">
            <Crosshair size={20} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-foreground">
                Form 4: Discrimination Test (1.4d Test)
              </h3>
              <Badge variant="outline" showIcon={false} className="py-0.5 px-2 text-[10px] font-mono">
                Clause A.4.8
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Statutory Requirement: Gently adding <strong className="text-foreground font-mono">1.4d = {(1.4 * effectiveD).toFixed(4)} {unit}</strong> must cause indication to advance by <strong className="text-foreground font-mono">≥ 1.0d (+{effectiveD} {unit})</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg shrink-0 border border-neutral-300 dark:border-neutral-700">
          <span>Scale Interval d: {effectiveD} {unit}</span>
          <span>·</span>
          <span>Auxiliary Load: {(1.4 * effectiveD).toFixed(4)} {unit}</span>
        </div>
      </div>

      {/* Point Selector Step Tabs */}
      <div className="grid grid-cols-3 gap-2">
        {points.map((pt, idx) => {
          const isSelected = idx === activePointIndex;
          const isSaved = !!savedPoints[pt.pointIndex];
          const res = computeDiscriminationResult(pt);

          return (
            <button
              key={pt.pointIndex}
              type="button"
              onClick={() => setActivePointIndex(idx)}
              className={`min-h-[48px] p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold ring-2 ring-primary/20"
                  : isSaved
                  ? res.isCompliant
                    ? "bg-transparent text-emerald-700 dark:text-emerald-400 border-neutral-300 dark:border-neutral-700"
                    : "bg-transparent text-destructive border-neutral-300 dark:border-neutral-700"
                  : "bg-card text-muted-foreground border-neutral-300 dark:border-neutral-700 hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold">#{pt.pointIndex}</span>
                <span className="text-[10px] font-mono">
                  {isSaved ? (res.isCompliant ? "PASS" : "FAIL") : "PENDING"}
                </span>
              </div>
              <div className="text-xs font-semibold truncate mt-1">
                {pt.label}
              </div>
              <div className="text-[10px] font-mono opacity-80 mt-0.5">
                Load: {pt.appliedLoad} {pt.unit}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Discrimination Observation Card */}
      <Card className="border border-neutral-300 dark:border-neutral-700 bg-card shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b border-neutral-300 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg border border-neutral-300 dark:border-neutral-700 text-primary font-mono font-bold flex items-center justify-center text-xs">
                #{currentPoint.pointIndex}
              </span>
              <CardTitle className="text-sm font-bold text-foreground">
                {currentPoint.label} ({currentPoint.appliedLoad} {currentPoint.unit})
              </CardTitle>
              <Badge
                variant={currentResult.isCompliant ? "pass" : "fail"}
                showIcon={false}
                className="py-0.5 px-2 text-[10px] font-mono"
              >
                {currentResult.isCompliant ? "PASS (1.4d DISCRIMINATED)" : "FAIL (NO STEP CHANGE)"}
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Clause 3.8.2.1: Apply base load {currentPoint.appliedLoad} {currentPoint.unit}, record initial indication $I_1$, then add 1.4d auxiliary weights and observe $I_2$.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-muted-foreground">Auxiliary 1.4d:</span>
            <strong className="text-primary font-bold">
              +{(1.4 * effectiveD).toFixed(4)} {unit}
            </strong>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Step Sequence Visualization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: Input Columns */}
            <div className="space-y-4">
              {/* Step A: Initial Indication I1 */}
              <div className="p-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full border border-neutral-300 dark:border-neutral-700 text-primary font-mono font-bold flex items-center justify-center text-[10px]">
                      A
                    </span>
                    Initial Base Indication ($I_1$)
                  </label>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    Base Load: {currentPoint.appliedLoad} {currentPoint.unit}
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.001"
                  value={currentPoint.initialIndicationI1}
                  disabled={disabled}
                  onChange={(e) =>
                    handleUpdateCurrentPoint({ initialIndicationI1: parseFloat(e.target.value) || 0 })
                  }
                  className="font-mono text-sm h-11"
                />
              </div>

              {/* Step B: Auxiliary 1.4d Load Added Gently */}
              <div className="p-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-card space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-primary flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground font-mono font-bold flex items-center justify-center text-[10px]">
                      B
                    </span>
                    Auxiliary Extra Load ($\Delta L = 1.4d$)
                  </label>
                  <span className="font-mono text-[11px] font-bold text-primary">
                    1.4d = {(1.4 * effectiveD).toFixed(4)} {unit}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Gently place exactly {(1.4 * effectiveD).toFixed(4)} {unit} of calibrated small weights onto the load receptor.
                </p>
              </div>

              {/* Step C: Final Indication I2 */}
              <div className="p-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full border border-neutral-300 dark:border-neutral-700 text-primary font-mono font-bold flex items-center justify-center text-[10px]">
                      C
                    </span>
                    Observed Final Indication ($I_2$)
                  </label>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    Target: ≥ {(currentPoint.initialIndicationI1 + effectiveD).toFixed(4)} {unit}
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.001"
                  value={currentPoint.finalIndicationI2}
                  disabled={disabled}
                  onChange={(e) =>
                    handleUpdateCurrentPoint({ finalIndicationI2: parseFloat(e.target.value) || 0 })
                  }
                  className="font-mono text-sm h-11"
                />

                {/* Quick Auto-Advance Presets */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateCurrentPoint({
                        finalIndicationI2: +(currentPoint.initialIndicationI1 + effectiveD).toFixed(4),
                      })
                    }
                    className="text-[10px] font-mono px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer border border-neutral-300 dark:border-neutral-700"
                  >
                    +1.0d Response ({(currentPoint.initialIndicationI1 + effectiveD).toFixed(4)} {unit})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateCurrentPoint({
                        finalIndicationI2: currentPoint.initialIndicationI1,
                      })
                    }
                    className="text-[10px] font-mono px-2 py-1 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all cursor-pointer border border-destructive/30"
                  >
                    0d No Response (Fail)
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Real-Time Discrimination Analysis Gauge */}
            <div className="p-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-muted/20 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-foreground border-b border-neutral-300 dark:border-neutral-700 pb-2">
                  <span>Clause 3.8.2.1 Response Analysis</span>
                  <span className="font-mono text-primary font-bold">1.4d Test</span>
                </div>

                <div className="space-y-3 pt-3">
                  {/* Step Change Metric */}
                  <div className="p-3 rounded-lg bg-card border border-neutral-300 dark:border-neutral-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        Observed Step Change ($\Delta I = I_2 - I_1$)
                      </span>
                      <span className={`font-mono font-bold text-base ${currentResult.isCompliant ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                        {currentResult.deltaI >= 0 ? `+${currentResult.deltaI.toFixed(4)}` : currentResult.deltaI.toFixed(4)} {unit}
                        <span className="text-xs text-muted-foreground ml-1 font-semibold">
                          ({currentResult.ratioToD}d)
                        </span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">
                        Required Step
                      </span>
                      <span className="font-mono font-bold text-xs text-foreground">
                        ≥ +{currentResult.requiredMinDeltaI.toFixed(4)} {unit} (+1.0d)
                      </span>
                    </div>
                  </div>

                  {/* Discrimination Progress Meter */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                      <span>Step Response Progress</span>
                      <span>{Math.round(currentResult.ratioToD * 100)}% of required 1d</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          currentResult.isCompliant ? "bg-emerald-500" : "bg-destructive"
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(0, currentResult.ratioToD * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Statutory Feedback Box */}
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                      currentResult.isCompliant
                        ? "border border-neutral-300 dark:border-neutral-700 bg-card text-emerald-600 dark:text-emerald-400"
                        : "border border-neutral-300 dark:border-neutral-700 bg-card text-destructive"
                    }`}
                  >
                    {currentResult.isCompliant ? (
                      <CheckCircle size={18} className="shrink-0 mt-0.5" />
                    ) : (
                      <WarningCircle size={18} className="shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs">
                        {currentResult.isCompliant
                          ? "Discrimination Verified: PASS"
                          : "Discrimination Failure: Indication Did Not Step by ≥ 1d"}
                      </p>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        {currentResult.isCompliant
                          ? `At ${currentPoint.appliedLoad} ${unit}, placing auxiliary 1.4d (${(1.4 * effectiveD).toFixed(4)} ${unit}) generated a clear, unambiguous indication advance of ${currentResult.deltaI} ${unit}.`
                          : `The digital indicator remained sluggish or failed to advance by at least 1 scale interval d (+${effectiveD} ${unit}).`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-neutral-300 dark:border-neutral-700">
                <div className="text-xs text-muted-foreground">
                  Point <strong className="text-foreground">{activePointIndex + 1}</strong> of {points.length}
                </div>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleSaveAndAdvance}
                  rightIcon={<CaretRight size={16} />}
                  className="min-h-[48px] px-5 text-xs font-semibold"
                >
                  {activePointIndex < points.length - 1
                    ? `Save & Advance to Point #${activePointIndex + 2}`
                    : "Complete Form 4 Discrimination Battery"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
