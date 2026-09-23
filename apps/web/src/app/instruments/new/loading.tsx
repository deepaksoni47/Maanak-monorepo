import React from "react";
import { Skeleton, FormSkeleton } from "@/components/ui/Skeleton";

/**
 * Next.js Zero-CLS loading state for the Instrument Intake & Table 3 Classification Page.
 * Strictly adheres to the zero-spinner directive by mirroring the exact geometry
 * of the intake form and live classification card.
 */
export default function InstrumentIntakeLoading() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
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

      {/* Main 2-Column Responsive Workbench Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Fields Skeleton (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-sm border border-border bg-card p-5 sm:p-6 space-y-4">
            <Skeleton className="h-6 w-52 rounded-lg" />
            <Skeleton className="h-4 w-80 rounded-md" />
            <FormSkeleton fields={4} />
          </div>

          <div className="rounded-sm border border-border bg-card p-5 sm:p-6 space-y-4">
            <Skeleton className="h-6 w-60 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded-md" />
            <FormSkeleton fields={4} />
          </div>
        </div>

        {/* Right Column: Live Table 3 Evaluation Card Skeleton (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-sm border border-border bg-card p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <Skeleton className="h-5 w-44 rounded-lg" />
              <Skeleton className="h-7 w-28 rounded-full" />
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 space-y-2">
              <Skeleton className="h-3 w-28 rounded-md" />
              <Skeleton className="h-10 w-48 rounded-xl" />
            </div>

            <div className="space-y-3">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-5/6 rounded-md" />
              <Skeleton className="h-4 w-4/6 rounded-md" />
            </div>

            <div className="pt-4 border-t border-border/60 space-y-3">
              <Skeleton className="h-11 w-full rounded-2xl" />
              <Skeleton className="h-11 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
