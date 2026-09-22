"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { ShieldCheck, Warning, CheckCircle, Info, Gauge } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface ToleranceSafetyGaugeProps {
  /** Active intrinsic error Ec in kg */
  intrinsicErrorEc: number;
  /** Statutory MPE limit for this step in kg */
  mpeLimit: number;
  /** Current step index (0-indexed) */
  currentStepIndex: number;
  /** Total steps in test schedule */
  totalSteps: number;
  /** Unit of measurement (e.g. "kg") */
  unit?: string;
  className?: string;
}

export function ToleranceSafetyGauge({
  intrinsicErrorEc,
  mpeLimit,
  currentStepIndex,
  totalSteps,
  unit = "kg",
  className,
}: ToleranceSafetyGaugeProps) {
  const absError = Math.abs(intrinsicErrorEc);
  const mpeConsumptionPercent =
    mpeLimit > 0 ? (absError / mpeLimit) * 100 : 0;
  const safeMarginPercent = Math.max(0, 100 - mpeConsumptionPercent);

  const isCompliant = absError <= mpeLimit + 1e-9;
  const isNearBoundary = mpeConsumptionPercent > 75 && isCompliant;

  // Battery progress
  const completionPercent = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;

  return (
    <Card className={cn("rounded-3xl border border-border bg-card p-4 sm:p-5 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Gauge size={18} weight="duotone" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground">
              Dynamic MPE Tolerance & Safety Monitor
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Statutory verification margin per OIML R-76 Table 6
            </p>
          </div>
        </div>

        <div className="text-right">
          <span
            className={cn(
              "text-xs sm:text-sm font-mono font-bold px-2 py-0.5 rounded-lg border",
              isCompliant
                ? isNearBoundary
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            )}
          >
            {safeMarginPercent.toFixed(1)}% SAFE MARGIN
          </span>
        </div>
      </div>

      {/* Safety Margin Progress Gauge */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-muted-foreground flex items-center gap-1">
            <span>Tolerance Consumed:</span>
            <strong className="text-foreground">{mpeConsumptionPercent.toFixed(1)}% of MPE</strong>
          </span>
          <span className="text-muted-foreground">
            Error: <strong>{(absError * 1000).toFixed(2)} g</strong> / Limit: ±{(mpeLimit * 1000).toFixed(2)} g
          </span>
        </div>

        <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden p-0.5 border border-border/50">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              !isCompliant
                ? "bg-destructive"
                : isNearBoundary
                ? "bg-amber-500"
                : "bg-emerald-500"
            )}
            style={{ width: `${Math.min(100, Math.max(3, safeMarginPercent))}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0% MPE (Zero Drift)</span>
          <span className="text-amber-600 dark:text-amber-400">75% Warning Zone</span>
          <span className="text-destructive font-semibold">100% Boundary (Limit)</span>
        </div>
      </div>

      {/* Test Battery Schedule Completion */}
      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Test Battery Progress:</span>
          <span className="font-mono font-bold text-foreground">
            {currentStepIndex + 1} of {totalSteps} Steps ({completionPercent.toFixed(0)}%)
          </span>
        </div>

        <div className="w-28 sm:w-36 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
