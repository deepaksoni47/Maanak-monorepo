import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Next.js Zero-CLS loading state for Report Detail & PKI Signing Page (/reports/[id]).
 * Strictly adheres to the zero-spinner directive by mirroring the exact geometry
 * of the institutional certificate header, specifications grid, Forms summary table,
 * vector error curve card, and digital signature action block.
 */
export default function ReportLoading() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb & Header Action Skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-52 rounded-lg" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-80 rounded-xl" />
            <Skeleton className="h-6 w-36 rounded-full" />
          </div>
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="h-12 w-64 rounded-2xl" />
      </div>

      {/* Main Certificate Card Skeleton */}
      <div className="rounded-sm border border-border bg-card p-6 sm:p-8 space-y-6">
        {/* Institutional Header Strip */}
        <div className="border-b border-border pb-6 space-y-2 text-center flex flex-col items-center">
          <Skeleton className="h-4 w-96 rounded-md" />
          <Skeleton className="h-8 w-3/4 max-w-lg rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>

        {/* Specifications Grid */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-48 rounded-md" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl border border-border bg-muted/20">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-5 w-32 rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Test Summary Table */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-60 rounded-md" />
          <div className="rounded-2xl border border-border overflow-hidden space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-4 w-44 rounded-md" />
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Vector Error Curve Skeleton */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-muted/10 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-80 rounded-md" />
              <Skeleton className="h-5 w-48 rounded-md" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>

        {/* Cryptographic Provenance Block */}
        <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-72 rounded-md" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        </div>

        {/* Director Signature Block Skeleton */}
        <div className="p-5 rounded-2xl border border-border bg-muted/20 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-64 rounded-md" />
            <Skeleton className="h-3 w-96 rounded-md" />
          </div>
          <Skeleton className="h-12 w-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
