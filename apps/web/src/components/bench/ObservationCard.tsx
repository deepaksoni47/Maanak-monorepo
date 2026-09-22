import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { VernierKeypad } from "./VernierKeypad";
import {
  Scales,
  CheckCircle,
  XCircle,
  Info,
  ArrowsClockwise,
} from "@phosphor-icons/react";

export interface ObservationData {
  /** Sequential step number */
  stepNumber: number;
  /** Description or label (e.g., "Step #4 (100% Max)") */
  label: string;
  /** Nominal applied test load L (in kg) */
  appliedLoad: number;
  /** Observed scale indication I (in kg) */
  indication: number;
  /** Vernier fractional changeover load ΔL (in kg) */
  deltaL: number;
  /** Scale verification scale interval e (in kg, e.g. 0.005) */
  eVal: number;
  /** Zero-load error E0 (in kg, default: 0) */
  e0?: number;
  /** Maximum Permissible Error limit for this load step (in kg) */
  mpeLimit: number;
  /** Unit of measurement (default: "kg") */
  unit?: string;
  /** Direction (ascending / descending) */
  direction?: "ASCENDING" | "DESCENDING";
}

export interface ObservationCardProps {
  /** Observation test data */
  observation: ObservationData;
  /** Callback fired whenever indication (I) or Vernier (ΔL) is modified */
  onChange?: (updated: ObservationData) => void;
  /** Callback to trigger re-test */
  onRetest?: () => void;
  /** Disables inputs */
  disabled?: boolean;
  className?: string;
}

/**
 * Mobile-first Observation Card for OIML R-76 Clause A.4.4.3 Weighing Test.
 * Computes Turning Point P, Raw Error E, and Intrinsic Error Ec in real-time.
 * Strictly designed for 360px–430px smartphone screens with zero horizontal overflow.
 */
export function ObservationCard({
  observation,
  onChange,
  onRetest,
  disabled = false,
  className,
}: ObservationCardProps) {
  const {
    stepNumber,
    label,
    appliedLoad,
    indication: initialIndication,
    deltaL: initialDeltaL,
    eVal,
    e0 = 0,
    mpeLimit,
    unit = "kg",
    direction = "ASCENDING",
  } = observation;

  const [indicationStr, setIndicationStr] = useState<string>(String(initialIndication));
  const [deltaLStr, setDeltaLStr] = useState<string>(String(initialDeltaL));

  // Sync internal state when navigating between different steps
  useEffect(() => {
    setIndicationStr(String(initialIndication));
    setDeltaLStr(String(initialDeltaL));
  }, [observation.stepNumber]);

  // Sync internal state only if numerical value actually changed externally (e.g. preset button or reset)
  useEffect(() => {
    const parsed = parseFloat(indicationStr);
    if (!isNaN(parsed) && parsed !== initialIndication) {
      setIndicationStr(String(initialIndication));
    }
  }, [initialIndication]);

  useEffect(() => {
    const parsed = parseFloat(deltaLStr);
    if (!isNaN(parsed) && parsed !== initialDeltaL) {
      setDeltaLStr(String(initialDeltaL));
    }
  }, [initialDeltaL]);

  const indication = parseFloat(indicationStr) || 0;
  const deltaL = parseFloat(deltaLStr) || 0;

  // Metrological Real-Time Derivation Math (Clause A.4.4.3)
  // P = I + 0.5e - ΔL
  const turningPointP = +(indication + 0.5 * eVal - deltaL).toFixed(6);
  // E = P - L
  const rawErrorE = +(turningPointP - appliedLoad).toFixed(6);
  // Ec = E - E0
  const intrinsicErrorEc = +(rawErrorE - e0).toFixed(6);

  const absError = Math.abs(intrinsicErrorEc);
  const isPass = absError <= mpeLimit;
  const marginPercent =
    mpeLimit > 0 ? Math.max(0, Math.min(100, ((mpeLimit - absError) / mpeLimit) * 100)) : 0;

  const handleIndicationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || /^-?\d*\.?\d*$/.test(raw)) {
      setIndicationStr(raw);
      const safeVal = parseFloat(raw) || 0;
      onChange?.({
        ...observation,
        indication: safeVal,
        deltaL,
      });
    }
  };

  const handleDeltaLChange = (newDeltaL: number | string) => {
    const raw = String(newDeltaL);
    if (raw === "" || /^-?\d*\.?\d*$/.test(raw)) {
      setDeltaLStr(raw);
      const safeVal = parseFloat(raw) || 0;
      onChange?.({
        ...observation,
        indication,
        deltaL: safeVal,
      });
    }
  };

  return (
    <Card
      className={cn(
        "rounded-3xl border transition-all overflow-hidden",
        isPass
          ? "border-border hover:border-emerald-500/30"
          : "border-destructive/40 bg-destructive/5 hover:border-destructive/60",
        className
      )}
    >
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Header: Step Number, Direction, Load, Status Badge */}
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 pb-3 border-b border-border/70">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-foreground">
                #{stepNumber}
              </span>
              <h4 className="font-semibold text-sm sm:text-base text-foreground leading-tight">
                {label}
              </h4>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                {direction === "ASCENDING" ? "▲ Asc" : "▼ Desc"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Scales size={14} className="text-primary shrink-0" />
              <span>Nominal Load (L):</span>
              <strong className="font-mono text-foreground">{appliedLoad.toFixed(4)} {unit}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start xs:self-auto">
            <Badge variant={isPass ? "pass" : "fail"} showIcon={true}>
              {isPass ? "PASS" : "FAIL"}
            </Badge>
            {onRetest && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetest}
                disabled={disabled}
                className="h-8 min-h-[36px] px-2 text-xs text-muted-foreground hover:text-foreground"
                aria-label="Re-test this load step"
              >
                <ArrowsClockwise size={14} weight="bold" />
                <span className="sr-only sm:not-sr-only sm:ml-1">Re-test</span>
              </Button>
            )}
          </div>
        </div>

        {/* Inputs: Indication (I) & Vernier (ΔL) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Indication (I)</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIndicationStr(String(appliedLoad));
                    onChange?.({ ...observation, indication: appliedLoad, deltaL });
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground font-mono transition-colors"
                  title="Quick fill with nominal applied load"
                >
                  Match L ({appliedLoad})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIndicationStr("0");
                    onChange?.({ ...observation, indication: 0, deltaL });
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground font-mono transition-colors"
                  title="Quick fill zero"
                >
                  Zero
                </button>
              </div>
            </div>
            <Input
              numeric
              unit={unit}
              value={indicationStr}
              onChange={handleIndicationChange}
              disabled={disabled}
              placeholder="0.0000"
              aria-label={`Scale indication I for load ${appliedLoad} ${unit}`}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Vernier (ΔL)</label>
              <span className="text-[10px] text-muted-foreground">Changeover weight</span>
            </div>
            <Input
              numeric
              unit={unit}
              value={deltaLStr}
              onChange={(e) => handleDeltaLChange(e.target.value)}
              disabled={disabled}
              placeholder="0.0000"
              aria-label={`Vernier changeover load delta L for load ${appliedLoad} ${unit}`}
            />
          </div>
        </div>

        {/* Rapid Touch Increment Keypad */}
        <VernierKeypad
          value={deltaL}
          eVal={eVal}
          unit={unit}
          onChange={handleDeltaLChange}
          disabled={disabled}
        />

        {/* Metrological Output Derivation Summary */}
        <div className="rounded-2xl bg-card border border-border/80 p-3 sm:p-3.5 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
            <div className="p-2 rounded-xl bg-background border border-border/50">
              <div className="text-[10px] font-sans text-muted-foreground uppercase">
                Turning Point (P)
              </div>
              <div className="font-bold text-foreground mt-0.5 truncate">
                {turningPointP.toFixed(4)} {unit}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-background border border-border/50">
              <div className="text-[10px] font-sans text-muted-foreground uppercase">
                Error (Ec = E - E0)
              </div>
              <div
                className={cn(
                  "font-bold mt-0.5 truncate",
                  isPass ? "text-foreground" : "text-destructive"
                )}
              >
                {intrinsicErrorEc >= 0 ? `+${intrinsicErrorEc.toFixed(4)}` : intrinsicErrorEc.toFixed(4)} {unit}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-background border border-border/50 col-span-2 sm:col-span-1">
              <div className="text-[10px] font-sans text-muted-foreground uppercase">
                Allowed MPE
              </div>
              <div className="font-bold text-foreground mt-0.5 truncate">
                ±{mpeLimit.toFixed(4)} {unit}
              </div>
            </div>
          </div>

          {/* Tolerance & Safety Margin Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Info size={13} className="text-primary shrink-0" />
                <span>MPE Accuracy Margin</span>
              </span>
              <span className="font-mono font-semibold text-foreground">
                {marginPercent.toFixed(0)}% Safe
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300 rounded-full",
                  isPass ? "bg-emerald-500" : "bg-destructive"
                )}
                style={{ width: `${Math.min(100, Math.max(5, marginPercent))}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
