import React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

export interface BenchCardSkeletonProps {
  className?: string;
}

/**
 * Geometry-matching skeleton for observation bench cards.
 * Preserves the exact height and layout of the observation card
 * to eliminate Cumulative Layout Shift (CLS) on mobile and desktop screens.
 */
export function BenchCardSkeleton({ className }: BenchCardSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-sm border border-border bg-card p-5 space-y-4 shadow-xs",
        className
      )}
    >
      {/* Header Slot */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="space-y-1">
          <Skeleton className="h-5 w-36 rounded-lg" />
          <Skeleton className="h-3 w-24 rounded-md" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      {/* Input Fields Slot */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
      </div>

      {/* Keypad Placeholder */}
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-2xl" />
        ))}
      </div>

      {/* Derivation Results Slot */}
      <div className="p-3.5 bg-muted/30 rounded-2xl space-y-2 border border-border/40">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}
