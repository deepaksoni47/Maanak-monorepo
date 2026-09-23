import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Next.js Zero-CLS loading state for Senior Reviewer Anomaly Audit Page (/review).
 * Strictly adheres to the zero-spinner directive by mirroring the exact geometry
 * of the header, 3 KPI metric cards, search/filter bar, and audit session cards.
 */
export default function ReviewLoading() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Page Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-56 rounded-lg" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-8 w-80 rounded-xl" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
      </div>

      {/* 3 Metric KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-sm border border-border bg-card p-5 space-y-3"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-7 w-20 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Severity Filter Bar Skeleton */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <Skeleton className="h-12 w-full sm:w-96 rounded-xl" />
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-16 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Flagged Audit Queue Session Cards Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-sm border border-border bg-card p-5 sm:p-6 space-y-4"
          >
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-28 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-4 w-32 rounded-md" />
                </div>
                <Skeleton className="h-6 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-full rounded-md" />
                <div className="flex items-center gap-4 pt-2">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-4 w-48 rounded-md" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 shrink-0">
                <Skeleton className="h-10 w-36 rounded-md" />
                <Skeleton className="h-12 w-48 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
