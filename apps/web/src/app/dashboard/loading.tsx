import React from "react";
import { Skeleton, MetricCardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

/**
 * Next.js Zero-CLS loading state for the Laboratory Executive Dashboard.
 * Strictly adheres to the zero-spinner directive by mirroring the exact geometry
 * of metric cards and data tables.
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Page Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-44 rounded-lg" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-4 w-80 rounded-lg" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-36 rounded-2xl" />
            <Skeleton className="h-11 w-40 rounded-2xl" />
          </div>
        </div>
      </div>

      {/* 4-Card KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Quick Action / Notice Banner Skeleton */}
      <Skeleton className="h-16 w-full rounded-sm" />

      {/* Recent Sessions Table Skeleton */}
      <div className="rounded-sm border border-border bg-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>
        <TableSkeleton rows={5} columns={6} />
      </div>
    </div>
  );
}
