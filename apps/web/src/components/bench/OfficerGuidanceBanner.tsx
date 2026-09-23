"use client";

import React from "react";
import { Info, Scales, ArrowRight, Lightbulb, HandPointing } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export interface OfficerGuidanceBannerProps {
  stepNumber: number;
  direction: "ASCENDING" | "DESCENDING";
  appliedLoad: number;
  unit: string;
  eVal: number;
  onQuickFill?: () => void;
  className?: string;
}

export function OfficerGuidanceBanner({
  stepNumber,
  direction,
  appliedLoad,
  unit,
  eVal,
  onQuickFill,
  className,
}: OfficerGuidanceBannerProps) {
  const getActionInstruction = () => {
    if (appliedLoad === 0) {
      return direction === "ASCENDING"
        ? "Ensure scale platter is completely empty and zero tare button is engaged before commencing."
        : "Unload all test weights carefully. Verify that the indicator returns cleanly to true zero (E₀).";
    }
    return `Place exactly ${appliedLoad.toFixed(4)} ${unit} of certified standard weights onto the center of the platter. Observe display indication.`;
  };

  const getVernierInstruction = () => {
    return `Add small changeover weights (ΔL in multiples of ${eVal * 1000} g) until the display value shifts up one division.`;
  };

  return (
    <div
      className={cn(
        "rounded-sm border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-3",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
          <HandPointing size={18} weight="fill" />
        </div>
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Officer Field Guidance · Step #{stepNumber}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
              {direction === "ASCENDING" ? "Increasing Load" : "Decreasing Load"}
            </span>
          </div>

          <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
            {getActionInstruction()}
          </p>

          <p className="text-xs text-muted-foreground">
            {getVernierInstruction()}
          </p>
        </div>
      </div>

      {onQuickFill && (
        <div className="flex items-center justify-between pt-2 border-t border-primary/20 text-xs">
          <span className="text-muted-foreground text-[11px]">
            Reading matches nominal load exactly?
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onQuickFill}
            className="h-8 min-h-[36px] text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
          >
            Quick Auto-Fill Indication ({appliedLoad} {unit})
          </Button>
        </div>
      )}
    </div>
  );
}
