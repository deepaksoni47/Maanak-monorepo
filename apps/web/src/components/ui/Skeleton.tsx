import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Base Skeleton loader primitive adhering to zero-spinner directive.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse bg-muted/60 rounded-2xl", className)}
      {...props}
    />
  );
}

/**
 * Geometry-matching loader for KPI metric stat cards (112px fixed height).
 */
export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 h-28 flex flex-col justify-between space-y-2",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded-lg" />
        <Skeleton className="h-7 w-7 rounded-xl" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-6 w-20 rounded-lg" />
        <Skeleton className="h-3 w-36 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Geometry-matching loader for tabular data rows to eliminate layout shift.
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Table Header Placeholder */}
      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl border border-border/50">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`th-${i}`} className="h-4 flex-1 rounded-lg" />
        ))}
      </div>
      {/* Table Row Placeholders */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={`tr-${r}`}
          className="flex items-center gap-3 p-3.5 bg-card/40 rounded-2xl border border-border/40"
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={`td-${r}-${c}`} className="h-4 flex-1 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Geometry-matching loader for mobile observation bench cards.
 */
export function BenchCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs",
        className
      )}
    >
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <Skeleton className="h-5 w-32 rounded-lg" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16 rounded-md" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
      </div>
      <div className="p-3 bg-muted/30 rounded-2xl space-y-2">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-3/4 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Geometry-matching loader for form input sections.
 */
export function FormSkeleton({
  fields = 3,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={`field-${i}`} className="space-y-1.5">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
      ))}
      <Skeleton className="h-11 w-32 rounded-2xl mt-4" />
    </div>
  );
}
