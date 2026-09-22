import React from "react";
import { Skeleton, BenchCardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

/**
 * Next.js Zero-CLS loading state for the Real-Time Bench Observation Logging Workbench.
 * Strictly adheres to the zero-spinner directive by mirroring the exact geometry
 * of the session strip, step navigator, and active ObservationCard.
 */
export default function BenchLoading() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-28">
      {/* Top Breadcrumb & Page Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-48 rounded-lg" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-8 w-72 rounded-xl" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
          <Skeleton className="h-11 w-40 rounded-2xl" />
        </div>
      </div>

      {/* Session Metadata & Ambient Conditions Strip Skeleton */}
      <div className="rounded-3xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-2xl shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-3 w-64 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-28 rounded-xl" />
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>
      </div>

      {/* Step Progression Chip Bar Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-full shrink-0" />
        ))}
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Active ObservationCard Skeleton (7 cols) */}
        <div className="lg:col-span-7">
          <BenchCardSkeleton />
        </div>

        {/* Right Column: Step Observation Matrix Skeleton (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <TableSkeleton rows={5} columns={4} />
        </div>
      </div>
    </div>
  );
}
