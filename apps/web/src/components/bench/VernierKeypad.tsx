import React from "react";
import { cn } from "@/lib/utils";
import { ArrowCounterClockwise, Plus } from "@phosphor-icons/react";

export interface VernierKeypadProps {
  /** Current Vernier changeover load ΔL (in kg or g) */
  value: number;
  /** Scale verification division value e (e.g. 0.005 kg or 5 g) */
  eVal: number;
  /** Unit of measurement for display (default: "kg") */
  unit?: string;
  /** Callback fired when ΔL is incremented or cleared */
  onChange: (newValue: number) => void;
  /** Disable interactions */
  disabled?: boolean;
  className?: string;
}

/**
 * Touch-friendly Vernier changeover weight increment keypad.
 * Provides rapid increment buttons (+0.1e, +0.2e, +0.5e, +1.0e)
 * with mandatory >= 48px touch targets for mobile smartphones and lab tablets.
 */
export function VernierKeypad({
  value,
  eVal,
  unit = "kg",
  onChange,
  disabled = false,
  className,
}: VernierKeypadProps) {
  // Pre-calculated increment options as multiples of e
  const incrementMultipliers = [0.1, 0.2, 0.5, 1.0];

  const handleIncrement = (multiplier: number) => {
    if (disabled) return;
    const deltaToAdd = +(multiplier * eVal).toFixed(6);
    const updated = +(value + deltaToAdd).toFixed(6);
    onChange(updated);
  };

  const handleClear = () => {
    if (disabled) return;
    onChange(0);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium">Quick Vernier (ΔL) Increments</span>
        <span className="font-mono">e = {eVal} {unit}</span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {incrementMultipliers.map((mult) => {
          const addAmount = +(mult * eVal).toFixed(5);
          return (
            <button
              key={mult}
              type="button"
              disabled={disabled}
              onClick={() => handleIncrement(mult)}
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl border border-border bg-card",
                "h-12 min-h-[48px] min-w-[48px] p-1 text-xs font-semibold transition-all select-none",
                "hover:border-primary/50 hover:bg-primary/5 active:scale-[0.96] active:bg-primary/10",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:pointer-events-none disabled:opacity-40"
              )}
              aria-label={`Add ${mult}e (${addAmount} ${unit})`}
            >
              <span className="inline-flex items-center text-primary font-bold text-xs">
                <Plus size={11} weight="bold" />
                <span>{mult}e</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                +{addAmount}
              </span>
            </button>
          );
        })}

        {/* Clear Button */}
        <button
          type="button"
          disabled={disabled || value === 0}
          onClick={handleClear}
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-muted/40",
            "h-12 min-h-[48px] min-w-[48px] p-1 text-xs font-medium text-muted-foreground transition-all select-none",
            "hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive active:scale-[0.96]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-30"
          )}
          aria-label="Clear Vernier changeover weight"
        >
          <ArrowCounterClockwise size={14} weight="bold" />
          <span className="text-[10px] mt-0.5 font-semibold">Reset</span>
        </button>
      </div>
    </div>
  );
}
