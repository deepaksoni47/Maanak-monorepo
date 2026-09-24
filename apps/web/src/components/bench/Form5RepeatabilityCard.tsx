"use client";

import React, { useState } from "react";
import {
  Repeat,
  CheckCircle,
  WarningCircle,
  CaretRight,
  ArrowsClockwise,
  FloppyDisk,
  Gauge,
  Sparkle,
  TrendUp,
  Table,
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getTable6MpeForLoad } from "./Form3EccentricityCard";

export interface RepeatabilityCycleRow {
  cycleIndex: number; // 1 to 10
  appliedLoad: number;
  indication: number;
  deltaL: number; // Vernier turning point load
  P: number;
  Ec: number;
  isCompliant: boolean;
}

export interface RepeatabilitySeriesData {
  seriesId: "series_half_max" | "series_full_max";
  seriesLabel: string;
  nominalLoad: number;
  unit: string;
  cycles: RepeatabilityCycleRow[];
}

export interface RepeatabilitySeriesResult {
  pMax: number;
  pMin: number;
  spreadDeltaE: number; // Pmax - Pmin
  mpeLimit: number;
  isSpreadCompliant: boolean;
  allCyclesCompliant: boolean;
  isSeriesCompliant: boolean;
  meanP: number;
  stdDev: number;
}

export interface Form5RepeatabilityCardProps {
  maxCapacityKg?: number;
  verificationIntervalKg?: number;
  accuracyClass?: string;
  unit?: string;
  onSaveSeries?: (seriesData: RepeatabilitySeriesData, result: RepeatabilitySeriesResult) => void;
  onCompleteForm?: (allSeries: Record<string, { data: RepeatabilitySeriesData; result: RepeatabilitySeriesResult }>) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Evaluates turning point and error for a single cycle.
 * P = I + 0.5e - deltaL
 * Ec = P - L
 */
export function computeCycleMetrics(
  appliedLoad: number,
  indication: number,
  deltaL: number,
  eVal: number,
  mpeLimit: number
): { P: number; Ec: number; isCompliant: boolean } {
  const P = +(indication + 0.5 * eVal - deltaL).toFixed(5);
  const Ec = +(P - appliedLoad).toFixed(5);
  const isCompliant = Math.abs(Ec) <= mpeLimit + 1e-9;
  return { P, Ec, isCompliant };
}

/**
 * Evaluates entire 10-cycle series according to OIML R 76-1 Clause A.4.10:
 * Spread = Pmax - Pmin <= |MPE|
 */
export function computeRepeatabilitySeriesResult(
  cycles: RepeatabilityCycleRow[],
  mpeLimit: number
): RepeatabilitySeriesResult {
  if (cycles.length === 0) {
    return {
      pMax: 0,
      pMin: 0,
      spreadDeltaE: 0,
      mpeLimit,
      isSpreadCompliant: true,
      allCyclesCompliant: true,
      isSeriesCompliant: true,
      meanP: 0,
      stdDev: 0,
    };
  }

  const pValues = cycles.map((c) => c.P);
  const pMax = Math.max(...pValues);
  const pMin = Math.min(...pValues);
  const spreadDeltaE = +(pMax - pMin).toFixed(5);

  const isSpreadCompliant = spreadDeltaE <= mpeLimit + 1e-9;
  const allCyclesCompliant = cycles.every((c) => c.isCompliant);
  const isSeriesCompliant = isSpreadCompliant && allCyclesCompliant;

  // Mean & Standard Deviation
  const sum = pValues.reduce((acc, v) => acc + v, 0);
  const meanP = +(sum / pValues.length).toFixed(5);

  const variance =
    pValues.length > 1
      ? pValues.reduce((acc, v) => acc + Math.pow(v - meanP, 2), 0) / (pValues.length - 1)
      : 0;
  const stdDev = +Math.sqrt(variance).toFixed(5);

  return {
    pMax,
    pMin,
    spreadDeltaE,
    mpeLimit,
    isSpreadCompliant,
    allCyclesCompliant,
    isSeriesCompliant,
    meanP,
    stdDev,
  };
}

/**
 * Generates initial 10 cycles for a given nominal load.
 */
export function generateDefault10Cycles(
  appliedLoad: number,
  eVal: number,
  mpeLimit: number
): RepeatabilityCycleRow[] {
  const defaultDeltaL = +(0.5 * eVal).toFixed(5);
  return Array.from({ length: 10 }, (_, i) => {
    const cycleIndex = i + 1;
    const { P, Ec, isCompliant } = computeCycleMetrics(
      appliedLoad,
      appliedLoad,
      defaultDeltaL,
      eVal,
      mpeLimit
    );
    return {
      cycleIndex,
      appliedLoad,
      indication: appliedLoad,
      deltaL: defaultDeltaL,
      P,
      Ec,
      isCompliant,
    };
  });
}

export function Form5RepeatabilityCard({
  maxCapacityKg = 15,
  verificationIntervalKg = 0.005,
  accuracyClass = "CLASS_III",
  unit = "kg",
  onSaveSeries,
  onCompleteForm,
  disabled = false,
  className = "",
}: Form5RepeatabilityCardProps) {
  const effectiveMax = maxCapacityKg > 0 ? maxCapacityKg : 15;
  const effectiveE = verificationIntervalKg > 0 ? verificationIntervalKg : 0.005;

  const halfMaxLoad = +(effectiveMax / 2).toFixed(4);
  const fullMaxLoad = effectiveMax;

  const mpeHalfMax = getTable6MpeForLoad(halfMaxLoad, effectiveE, accuracyClass);
  const mpeFullMax = getTable6MpeForLoad(fullMaxLoad, effectiveE, accuracyClass);

  const [activeTab, setActiveTab] = useState<"series_half_max" | "series_full_max">(
    "series_half_max"
  );

  const [seriesData, setSeriesData] = useState<Record<string, RepeatabilitySeriesData>>({
    series_half_max: {
      seriesId: "series_half_max",
      seriesLabel: "Series A: 1/2 Max Load",
      nominalLoad: halfMaxLoad,
      unit,
      cycles: generateDefault10Cycles(halfMaxLoad, effectiveE, mpeHalfMax),
    },
    series_full_max: {
      seriesId: "series_full_max",
      seriesLabel: "Series B: Full Max Load",
      nominalLoad: fullMaxLoad,
      unit,
      cycles: generateDefault10Cycles(fullMaxLoad, effectiveE, mpeFullMax),
    },
  });

  const [savedSeries, setSavedSeries] = useState<Record<string, boolean>>({});

  const currentSeries = seriesData[activeTab];
  const currentMpe = activeTab === "series_half_max" ? mpeHalfMax : mpeFullMax;
  const currentResult = computeRepeatabilitySeriesResult(currentSeries.cycles, currentMpe);

  // Compute other series result for global battery completion
  const halfResult = computeRepeatabilitySeriesResult(
    seriesData.series_half_max.cycles,
    mpeHalfMax
  );
  const fullResult = computeRepeatabilitySeriesResult(
    seriesData.series_full_max.cycles,
    mpeFullMax
  );

  const handleUpdateCycle = (
    cycleIndex: number,
    field: "indication" | "deltaL",
    value: number
  ) => {
    setSeriesData((prev) => {
      const s = prev[activeTab];
      const updatedCycles = s.cycles.map((c) => {
        if (c.cycleIndex !== cycleIndex) return c;
        const newIndication = field === "indication" ? value : c.indication;
        const newDeltaL = field === "deltaL" ? value : c.deltaL;
        const metrics = computeCycleMetrics(
          c.appliedLoad,
          newIndication,
          newDeltaL,
          effectiveE,
          currentMpe
        );
        return {
          ...c,
          indication: newIndication,
          deltaL: newDeltaL,
          ...metrics,
        };
      });

      return {
        ...prev,
        [activeTab]: {
          ...s,
          cycles: updatedCycles,
        },
      };
    });
  };

  const handleQuickPrefill = () => {
    setSeriesData((prev) => {
      const s = prev[activeTab];
      const freshCycles = generateDefault10Cycles(s.nominalLoad, effectiveE, currentMpe);
      return {
        ...prev,
        [activeTab]: {
          ...s,
          cycles: freshCycles,
        },
      };
    });
  };

  const handleSaveActiveSeries = () => {
    setSavedSeries((prev) => ({ ...prev, [activeTab]: true }));
    if (onSaveSeries) {
      onSaveSeries(currentSeries, currentResult);
    }
  };

  const handleCompleteForm5 = () => {
    setSavedSeries({
      series_half_max: true,
      series_full_max: true,
    });
    if (onCompleteForm) {
      onCompleteForm({
        series_half_max: {
          data: seriesData.series_half_max,
          result: halfResult,
        },
        series_full_max: {
          data: seriesData.series_full_max,
          result: fullResult,
        },
      });
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Summary Banner */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Repeat size={20} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-foreground">
                Form 5: Repeatability (10-Cycle Series)
              </h3>
              <Badge variant="outline" showIcon={false} className="py-0.5 px-2 text-[10px] font-mono">
                Clause A.4.10
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Statutory Spread Requirement: Maximum spread <strong className="text-foreground font-mono">ΔE = P_max - P_min ≤ |MPE|</strong> for 10 weighings at 1/2 Max and Max.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg shrink-0">
          <span>Accuracy: {accuracyClass}</span>
          <span>·</span>
          <span>e: {effectiveE} {unit}</span>
        </div>
      </div>

      {/* Series Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("series_half_max")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "series_half_max"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          <span>Series A: 1/2 Max ({halfMaxLoad} {unit})</span>
          {savedSeries.series_half_max && (
            <CheckCircle size={14} weight="fill" className="text-primary-foreground" />
          )}
          <Badge
            variant={halfResult.isSeriesCompliant ? "pass" : "fail"}
            showIcon={false}
            className="text-[9px] py-0 px-1 font-mono"
          >
            ΔE: {halfResult.spreadDeltaE}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("series_full_max")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "series_full_max"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          <span>Series B: Full Max ({fullMaxLoad} {unit})</span>
          {savedSeries.series_full_max && (
            <CheckCircle size={14} weight="fill" className="text-primary-foreground" />
          )}
          <Badge
            variant={fullResult.isSeriesCompliant ? "pass" : "fail"}
            showIcon={false}
            className="text-[9px] py-0 px-1 font-mono"
          >
            ΔE: {fullResult.spreadDeltaE}
          </Badge>
        </button>
      </div>

      {/* Real-Time Statistical & Compliance Metrics Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Repeatability Spread */}
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
            <span>Repeatability Spread (ΔE)</span>
            <Gauge size={14} className="text-primary" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-foreground">
              {currentResult.spreadDeltaE}
            </span>
            <span className="text-xs text-muted-foreground font-mono">{unit}</span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground font-mono">
            P_max: {currentResult.pMax} · P_min: {currentResult.pMin}
          </div>
        </div>

        {/* Statutory Limit (MPE) */}
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">
            Statutory MPE Threshold
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-foreground">
              ±{currentMpe}
            </span>
            <span className="text-xs text-muted-foreground font-mono">{unit}</span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            Table 6 bracket for {currentSeries.nominalLoad} {unit}
          </div>
        </div>

        {/* Standard Deviation */}
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
            <span>Std Deviation (s)</span>
            <TrendUp size={14} className="text-muted-foreground" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-foreground">
              {currentResult.stdDev}
            </span>
            <span className="text-xs text-muted-foreground font-mono">{unit}</span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground font-mono">
            Mean P: {currentResult.meanP} {unit}
          </div>
        </div>

        {/* Compliance State */}
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-muted-foreground">
            Clause A.4.10 Status
          </div>
          <div className="mt-1">
            <Badge
              variant={currentResult.isSeriesCompliant ? "pass" : "fail"}
              showIcon={false}
              className="text-xs font-mono font-bold py-1 px-2.5 w-full justify-center"
            >
              {currentResult.isSeriesCompliant ? "PASS (SPREAD OK)" : "FAIL (OUT OF MPE)"}
            </Badge>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground text-center">
            {currentResult.isSpreadCompliant ? "ΔE ≤ |MPE|" : "Spread exceeds MPE"}
          </div>
        </div>
      </div>

      {/* 10-Cycle Data Sheet Table */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-primary/10 text-primary font-mono font-bold flex items-center justify-center text-xs">
                {activeTab === "series_half_max" ? "A" : "B"}
              </span>
              <CardTitle className="text-sm font-bold text-foreground">
                {currentSeries.seriesLabel} ({currentSeries.nominalLoad} {currentSeries.unit})
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              10 successive load applications and removals. Record Indication (I) and Vernier added load (ΔL) for turning point P = I + 0.5e - ΔL.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleQuickPrefill}
              disabled={disabled}
              className="text-xs gap-1.5 h-8"
            >
              <Sparkle size={13} className="text-primary" />
              <span>Reset Nominal</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSaveActiveSeries}
              disabled={disabled}
              className="text-xs gap-1.5 h-8 font-semibold"
            >
              <FloppyDisk size={13} />
              <span>Save Series</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[11px]">
                <th className="py-2.5 px-3 font-semibold text-center w-12">#</th>
                <th className="py-2.5 px-3 font-semibold">Load (L)</th>
                <th className="py-2.5 px-3 font-semibold min-w-[120px]">Indication (I)</th>
                <th className="py-2.5 px-3 font-semibold min-w-[120px]">Vernier (ΔL)</th>
                <th className="py-2.5 px-3 font-semibold">Turning Point (P)</th>
                <th className="py-2.5 px-3 font-semibold">Error (Ec)</th>
                <th className="py-2.5 px-3 font-semibold text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {currentSeries.cycles.map((row) => (
                <tr
                  key={row.cycleIndex}
                  className={`hover:bg-muted/30 transition-colors ${
                    !row.isCompliant ? "bg-destructive/5" : ""
                  }`}
                >
                  <td className="py-2 px-3 text-center text-muted-foreground font-bold">
                    {row.cycleIndex}
                  </td>
                  <td className="py-2 px-3 text-foreground font-medium">
                    {row.appliedLoad.toFixed(4)} {unit}
                  </td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      step="0.001"
                      value={row.indication}
                      disabled={disabled}
                      onChange={(e) =>
                        handleUpdateCycle(
                          row.cycleIndex,
                          "indication",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      step="0.001"
                      value={row.deltaL}
                      disabled={disabled}
                      onChange={(e) =>
                        handleUpdateCycle(
                          row.cycleIndex,
                          "deltaL",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3 font-bold text-foreground">
                    {row.P.toFixed(5)} {unit}
                  </td>
                  <td
                    className={`py-2 px-3 font-bold ${
                      row.isCompliant ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                    }`}
                  >
                    {row.Ec >= 0 ? `+${row.Ec.toFixed(5)}` : row.Ec.toFixed(5)} {unit}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <Badge
                      variant={row.isCompliant ? "pass" : "fail"}
                      showIcon={false}
                      className="text-[10px] py-0 px-2 font-mono"
                    >
                      {row.isCompliant ? "PASS" : "FAIL"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Bottom Actions Bar */}
      <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle
            size={16}
            weight="fill"
            className={
              halfResult.isSeriesCompliant && fullResult.isSeriesCompliant
                ? "text-emerald-500"
                : "text-muted-foreground"
            }
          />
          <span>
            {halfResult.isSeriesCompliant && fullResult.isSeriesCompliant
              ? "All Repeatability Series Comply with Clause A.4.10"
              : "Complete both Series A and Series B within statutory MPE limits"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "series_half_max" ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => {
                handleSaveActiveSeries();
                setActiveTab("series_full_max");
              }}
              disabled={disabled}
              className="text-xs gap-1.5 h-9 font-semibold"
            >
              <span>Next: Series B (Full Max)</span>
              <CaretRight size={14} weight="bold" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleCompleteForm5}
              disabled={disabled}
              className="text-xs gap-1.5 h-9 font-semibold"
            >
              <CheckCircle size={15} weight="bold" />
              <span>Complete Form 5 Battery</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
