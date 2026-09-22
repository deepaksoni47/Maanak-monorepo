"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  Warning,
  Clock,
  FileMagnifyingGlass,
} from "@phosphor-icons/react";

export type BadgeVariant =
  | "default"
  | "pass"
  | "fail"
  | "warning"
  | "in_progress"
  | "pending"
  | "neutral"
  | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Whether to show the automated metrological status icon */
  showIcon?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-primary/10 text-primary border-primary/25",
  pass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  fail: "bg-destructive/10 text-destructive border-destructive/30",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  in_progress: "bg-primary/10 text-primary border-primary/30",
  pending: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  neutral: "bg-muted text-muted-foreground border-border",
  outline: "border-border text-foreground bg-transparent",
};

export function Badge({
  className,
  variant = "default",
  showIcon = true,
  children,
  ...props
}: BadgeProps) {
  const renderIcon = () => {
    if (!showIcon) return null;

    switch (variant) {
      case "pass":
        return <CheckCircle size={14} weight="fill" className="shrink-0 text-emerald-500" />;
      case "fail":
        return <XCircle size={14} weight="fill" className="shrink-0 text-destructive" />;
      case "warning":
        return <Warning size={14} weight="fill" className="shrink-0 text-amber-500" />;
      case "in_progress":
        return <Clock size={14} weight="bold" className="shrink-0 text-primary" />;
      case "pending":
        return <FileMagnifyingGlass size={14} weight="bold" className="shrink-0 text-purple-500" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors select-none",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {renderIcon()}
      {children}
    </span>
  );
}
