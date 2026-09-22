import React from "react";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

/**
 * Next.js Zero-CLS loading state for Standard Weight Inventory & NABL 129 Gatekeeper Page.
 * Strictly adheres to the zero-spinner directive by mirroring the exact geometry
 * of the gatekeeper simulator card and standard weights inventory table.
 */
export default function WeightsLoading() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Page Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-48 rounded-lg" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-8 w-80 rounded-xl" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
          <Skeleton className="h-11 w-44 rounded-2xl" />
        </div>
      </div>

      {/* 3 Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-3xl border border-border bg-card p-5 space-y-3">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-3 w-40 rounded-md" />
          </div>
        ))}
      </div>

      {/* Gatekeeper Simulator Card Skeleton */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-64 rounded-lg" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-11 w-full rounded-2xl" />
            </div>
          ))}
        </div>
        <Skeleton className="h-20 w-full rounded-2xl mt-4" />
      </div>

      {/* Standard Weights Inventory Table Skeleton */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-xl" />
        </div>
        <TableSkeleton rows={5} columns={6} />
      </div>
    </div>
  );
}
