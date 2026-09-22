import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Enables metrological numeric mode with monospace styling and decimal keypad on mobile */
  numeric?: boolean;
  /** Measurement unit suffix adornment (e.g. "kg", "g", "°C") */
  unit?: string;
  /** Leading icon or visual adornment */
  icon?: React.ReactNode;
  /** Whether the field is in an error state */
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      numeric = false,
      unit,
      icon,
      hasError = false,
      disabled,
      inputMode,
      ...props
    },
    ref
  ) => {
    const resolvedInputMode = numeric ? "decimal" : inputMode;

    return (
      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          {...props}
          inputMode={resolvedInputMode}
          className={cn(
            "w-full h-11 min-h-[48px] rounded-2xl border bg-input/50 px-4 text-sm text-foreground transition-all",
            "border-border placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            numeric ? "font-mono text-base font-semibold tabular-nums" : undefined,
            icon ? "pl-10" : undefined,
            unit ? "pr-14" : undefined,
            hasError ? "border-destructive focus:ring-destructive" : undefined,
            className
          )}
          {...props}
        />
        {unit && (
          <div className="absolute right-3.5 flex items-center pointer-events-none font-mono text-xs font-semibold text-muted-foreground">
            {unit}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
