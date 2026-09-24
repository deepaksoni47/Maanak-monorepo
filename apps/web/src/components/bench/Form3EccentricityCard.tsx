"use client";

import React, { useState } from "react";
import {
  CornersOut,
  Crosshair,
  CheckCircle,
  WarningCircle,
  CaretRight,
  ArrowsClockwise,
  FloppyDisk,
  Gauge,
  Info,
  Scales,
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface EccentricityPositionData {
  positionNumber: number; // 1 to 5
  label: string;
  quadrantName: string;
  appliedLoad: number; // 1/3 Max
  indication: number;
  deltaL: number;
  eVal: number;
  e0: number;
  unit: string;
}

export interface EccentricityPositionResult {
  P: number;
  E: number;
  Ec: number;
  errorInDivisions: number;
  mpeLimit: number;
  isCompliant: boolean;
  spreadToCenter?: number;
  isSpreadCompliant?: boolean;
}

export interface Form3EccentricityCardProps {
  maxCapacityKg?: number;
  verificationIntervalKg?: number;
  accuracyClass?: string;
  unit?: string;
  initialZeroError?: number;
  onSavePosition?: (data: EccentricityPositionData, result: EccentricityPositionResult) => void;
  onCompleteSeries?: (positions: EccentricityPositionData[], results: EccentricityPositionResult[]) => void;
  disabled?: boolean;
  className?: string;
}

export const POSITION_DEFINITIONS = [
  { num: 1, label: "Position 1: Center", quadrant: "Center Receptor", gridClass: "col-start-2 row-start-2" },
  { num: 2, label: "Position 2: Front-Left", quadrant: "Quadrant 1 (FL)", gridClass: "col-start-1 row-start-3" },
  { num: 3, label: "Position 3: Front-Right", quadrant: "Quadrant 2 (FR)", gridClass: "col-start-3 row-start-3" },
  { num: 4, label: "Position 4: Rear-Right", quadrant: "Quadrant 3 (RR)", gridClass: "col-start-3 row-start-1" },
  { num: 5, label: "Position 5: Rear-Left", quadrant: "Quadrant 4 (RL)", gridClass: "col-start-1 row-start-1" },
];

/**
 * Calculates Table 6 MPE for 1/3 Max load in Class III
 */
export function getTable6MpeForLoad(load: number, e: number, accuracyClass: string = "CLASS_III"): number {
  const n = load / e;
  if (accuracyClass === "CLASS_II") {
    if (n <= 5000) return +(0.5 * e).toFixed(6);
    if (n <= 20000) return +(1.0 * e).toFixed(6);
    return +(1.5 * e).toFixed(6);
  }
  // Class III
  if (n <= 500) return +(0.5 * e).toFixed(6);
  if (n <= 2000) return +(1.0 * e).toFixed(6);
  return +(1.5 * e).toFixed(6);
}

/**
 * Deterministic computation of turning point P, Ec, and eccentricity spread
 */
export function computeEccentricityPositionResult(
  data: EccentricityPositionData,
  centerEc?: number,
  accuracyClass: string = "CLASS_III"
): EccentricityPositionResult {
  const e = data.eVal;
  // Turning point: P = I + 0.5e - deltaL
  const P = +(data.indication + 0.5 * e - data.deltaL).toFixed(6);
  // Raw error: E = P - L
  const E = +(P - data.appliedLoad).toFixed(6);
  // Corrected error: Ec = E - E0
  const Ec = +(E - data.e0).toFixed(6);
  const errorInDivisions = +(Ec / e).toFixed(3);

  const mpeLimit = getTable6MpeForLoad(data.appliedLoad, e, accuracyClass);
  const isCompliant = Math.abs(Ec) <= mpeLimit + 1e-9;

  let spreadToCenter: number | undefined;
  let isSpreadCompliant: boolean | undefined;

  if (centerEc !== undefined && data.positionNumber !== 1) {
    // Difference between corner error and center error
    spreadToCenter = +Math.abs(Ec - centerEc).toFixed(6);
    // Statutory rule: Corner-to-center difference should not exceed 1.0 MPE
    isSpreadCompliant = spreadToCenter <= mpeLimit + 1e-9;
  }

  return {
    P,
    E,
    Ec,
    errorInDivisions,
    mpeLimit,
    isCompliant,
    spreadToCenter,
    isSpreadCompliant,
  };
}

export function Form3EccentricityCard({
  maxCapacityKg = 15,
  verificationIntervalKg = 0.005,
  accuracyClass = "CLASS_III",
  unit = "kg",
  initialZeroError = 0.0,
  onSavePosition,
  onCompleteSeries,
  disabled = false,
  className = "",
}: Form3EccentricityCardProps) {
  // OIML Clause 3.6.2.1: Test load is 1/3 Max
  const testLoadLecc = +(maxCapacityKg / 3).toFixed(3);

  const [positions, setPositions] = useState<EccentricityPositionData[]>(() =>
    POSITION_DEFINITIONS.map((def) => ({
      positionNumber: def.num,
      label: def.label,
      quadrantName: def.quadrant,
      appliedLoad: testLoadLecc,
      indication: testLoadLecc,
      deltaL: +(0.5 * verificationIntervalKg).toFixed(6),
      eVal: verificationIntervalKg,
      e0: initialZeroError,
      unit,
    }))
  );

  const [activePosIndex, setActivePosIndex] = useState<number>(0);
  const [savedPositions, setSavedPositions] = useState<Record<number, boolean>>({});

  const currentPos = positions[activePosIndex] || positions[0];

  // Center position (position 1) result for corner-spread comparison
  const centerPos = positions[0];
  const centerResult = computeEccentricityPositionResult(centerPos, undefined, accuracyClass);

  const currentResult = computeEccentricityPositionResult(
    currentPos,
    currentPos.positionNumber !== 1 ? centerResult.Ec : undefined,
    accuracyClass
  );

  const handleUpdateCurrentPos = (fields: Partial<EccentricityPositionData>) => {
    setPositions((prev) => {
      const updated = [...prev];
      updated[activePosIndex] = { ...updated[activePosIndex], ...fields };
      return updated;
    });
  };

  const handleSaveAndAdvance = () => {
    setSavedPositions((prev) => ({ ...prev, [currentPos.positionNumber]: true }));
    if (onSavePosition) {
      onSavePosition(currentPos, currentResult);
    }
    if (activePosIndex < positions.length - 1) {
      setActivePosIndex(activePosIndex + 1);
    } else {
      if (onCompleteSeries) {
        const allResults = positions.map((p) =>
          computeEccentricityPositionResult(
            p,
            p.positionNumber !== 1 ? centerResult.Ec : undefined,
            accuracyClass
          )
        );
        onCompleteSeries(positions, allResults);
      }
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statutory Header Info Banner */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CornersOut size={20} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-foreground">
                Form 3: Eccentricity & Corner Load Test
              </h3>
              <Badge variant="outline" showIcon={false} className="py-0.5 px-2 text-[10px] font-mono">
                Clause A.4.7
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mandatory Test Load: <strong className="text-foreground font-mono">1/3 Max = {testLoadLecc} {unit}</strong> (Total 5 statutory points)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg shrink-0">
          <span>Max: {maxCapacityKg} {unit}</span>
          <span>·</span>
          <span>e: {verificationIntervalKg} {unit}</span>
          <span>·</span>
          <span>MPE: ±{(currentResult.mpeLimit * 1000).toFixed(1)} g</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive 5-Position Receptor Diagram (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Crosshair size={14} className="text-primary" />
                Receptor Load Positions
              </span>
              <span className="text-muted-foreground text-[10px] font-mono">
                Tap spot to select
              </span>
            </div>

            {/* Interactive Pan Visual Diagram */}
            <div className="relative aspect-square max-w-[320px] mx-auto rounded-2xl border-2 border-dashed border-primary/30 bg-muted/20 p-3 flex flex-col justify-between">
              {/* Corner Grid */}
              <div className="grid grid-cols-3 grid-rows-3 h-full w-full gap-2 p-1">
                {POSITION_DEFINITIONS.map((def, idx) => {
                  const isSelected = idx === activePosIndex;
                  const isSaved = !!savedPositions[def.num];
                  const posData = positions[idx];
                  const res = computeEccentricityPositionResult(
                    posData,
                    def.num !== 1 ? centerResult.Ec : undefined,
                    accuracyClass
                  );

                  return (
                    <button
                      key={def.num}
                      type="button"
                      onClick={() => setActivePosIndex(idx)}
                      className={`relative rounded-xl border flex flex-col items-center justify-center p-1.5 transition-all cursor-pointer ${def.gridClass} ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/30 scale-105 z-10"
                          : isSaved
                          ? res.isCompliant
                            ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-800 dark:text-emerald-300"
                            : "bg-destructive/15 border-destructive/50 text-destructive"
                          : "bg-card border-border hover:bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      <span className="text-[10px] font-mono font-bold">
                        #{def.num}
                      </span>
                      <span className="text-[9px] font-semibold text-center truncate max-w-full leading-tight">
                        {def.num === 1 ? "Center" : def.quadrant.replace("Quadrant ", "Q")}
                      </span>

                      {/* Status indicator pip */}
                      {isSaved && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] shadow-xs bg-card">
                          {res.isCompliant ? (
                            <CheckCircle size={14} className="text-emerald-500" weight="fill" />
                          ) : (
                            <WarningCircle size={14} className="text-destructive" weight="fill" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Pan Callout Footer */}
              <div className="text-center text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/40">
                OIML R 76-1 Figure 10: 4-Quadrant & Center Layout
              </div>
            </div>

            {/* Position Picker Quick Buttons */}
            <div className="grid grid-cols-5 gap-1 pt-1">
              {POSITION_DEFINITIONS.map((def, idx) => (
                <button
                  key={def.num}
                  type="button"
                  onClick={() => setActivePosIndex(idx)}
                  className={`min-h-[44px] py-1 px-1.5 rounded-lg text-center text-xs font-mono transition-all border ${
                    idx === activePosIndex
                      ? "bg-primary text-primary-foreground font-bold border-primary"
                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <div className="font-bold">#{def.num}</div>
                  <div className="text-[9px] opacity-80 truncate">{def.num === 1 ? "Ctr" : `Q${def.num - 1}`}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Observation Entry & Live Calculation Card (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border border-border bg-card shadow-xs">
            <CardHeader className="p-4 sm:p-5 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-mono font-bold flex items-center justify-center text-xs">
                    #{currentPos.positionNumber}
                  </span>
                  <CardTitle className="text-sm font-bold text-foreground">
                    {currentPos.label} ({currentPos.quadrantName})
                  </CardTitle>
                  <Badge
                    variant={currentResult.isCompliant ? "pass" : "fail"}
                    showIcon={false}
                    className="py-0.5 px-2 text-[10px] font-mono"
                  >
                    {currentResult.isCompliant ? "PASS" : "FAIL"}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Place {testLoadLecc} {unit} test weights on {currentPos.quadrantName.toLowerCase()} and record turning point.
                </CardDescription>
              </div>

              <span className="text-[11px] font-mono text-muted-foreground">
                Load: <strong className="text-foreground">{testLoadLecc} {unit}</strong>
              </span>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-6">
              {/* Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Scale Indication I */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-foreground">
                      Scale Indication ($I$)
                    </label>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      Nominal: {testLoadLecc} {unit}
                    </span>
                  </div>
                  <Input
                    type="number"
                    step="0.001"
                    value={currentPos.indication}
                    disabled={disabled}
                    onChange={(e) =>
                      handleUpdateCurrentPos({ indication: parseFloat(e.target.value) || 0 })
                    }
                    className="font-mono text-sm h-11"
                  />
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentPos({ indication: testLoadLecc })}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer border border-border/50"
                    >
                      Auto-Fill Nominal ({testLoadLecc} {unit})
                    </button>
                  </div>
                </div>

                {/* Vernier Delta L */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-foreground">
                      Vernier Added Load ($\Delta L$)
                    </label>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      Target: 0.5e = {(0.5 * verificationIntervalKg).toFixed(4)} {unit}
                    </span>
                  </div>
                  <Input
                    type="number"
                    step="0.0005"
                    value={currentPos.deltaL}
                    disabled={disabled}
                    onChange={(e) =>
                      handleUpdateCurrentPos({ deltaL: parseFloat(e.target.value) || 0 })
                    }
                    className="font-mono text-sm h-11"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {[0.2, 0.4, 0.5, 0.6, 0.8].map((fraction) => {
                      const presetVal = +(fraction * verificationIntervalKg).toFixed(5);
                      return (
                        <button
                          key={fraction}
                          type="button"
                          onClick={() => handleUpdateCurrentPos({ deltaL: presetVal })}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer border border-border/50"
                        >
                          {fraction}e
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Calculated Metrological Output Panel */}
              <div className="p-4 rounded-xl border border-border/90 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-foreground border-b border-border/60 pb-2">
                  <span>Clause A.4.7 Mathematical Evaluation</span>
                  <span className="font-mono text-primary">MPE: ±{(currentResult.mpeLimit * 1000).toFixed(1)} g</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-card border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Turning Point ($P$)</span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {currentResult.P.toFixed(4)} {unit}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-card border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Corrected Error ($E_c$)</span>
                    <span className={`font-mono font-bold text-sm ${currentResult.isCompliant ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                      {(currentResult.Ec * 1000).toFixed(1)} g
                      <span className="text-[10px] text-muted-foreground ml-1">({currentResult.errorInDivisions}e)</span>
                    </span>
                  </div>

                  {currentPos.positionNumber !== 1 && (
                    <div className="p-2.5 rounded-lg bg-card border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Spread vs Center</span>
                      <span className={`font-mono font-bold text-sm ${currentResult.isSpreadCompliant ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                        {currentResult.spreadToCenter !== undefined ? `${(currentResult.spreadToCenter * 1000).toFixed(1)} g` : "—"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Guidance */}
                <div className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                  currentResult.isCompliant
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                }`}>
                  {currentResult.isCompliant ? <CheckCircle size={16} /> : <WarningCircle size={16} />}
                  <span className="font-semibold text-[11px]">
                    {currentResult.isCompliant
                      ? `Position #${currentPos.positionNumber} satisfies Table 6 MPE bracket (Ec = ${(currentResult.Ec * 1000).toFixed(1)} g <= ±${(currentResult.mpeLimit * 1000).toFixed(1)} g).`
                      : `Corner load error exceeds statutory MPE tolerance limit.`}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-border/80">
                <div className="text-xs text-muted-foreground">
                  Position <strong className="text-foreground">{activePosIndex + 1}</strong> of {positions.length}
                </div>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleSaveAndAdvance}
                  rightIcon={<CaretRight size={16} />}
                  className="min-h-[48px] px-5 text-xs font-semibold"
                >
                  {activePosIndex < positions.length - 1
                    ? `Save & Advance to Position #${activePosIndex + 2}`
                    : "Complete Form 3 Eccentricity Battery"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
