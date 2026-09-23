import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Next.js Zero-CLS loading state for Public Verification QR Page (/verify/[hash]).
 * Strictly adheres to the zero-spinner directive by mirroring the exact geometry
 * of the national portal header, verdict card, instrument specifications, and provenance block.
 */
export default function VerifyLoading() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Portal Header Skeleton */}
      <div className="text-center space-y-2 flex flex-col items-center">
        <Skeleton className="h-6 w-64 rounded-full" />
        <Skeleton className="h-8 w-80 rounded-xl" />
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>

      {/* Primary Verdict Card Skeleton */}
      <div className="rounded-sm border border-border bg-card p-6 space-y-3 flex flex-col items-center">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <Skeleton className="h-6 w-52 rounded-full" />
        <Skeleton className="h-7 w-72 rounded-xl" />
        <Skeleton className="h-4 w-96 rounded-md" />
        <Skeleton className="h-6 w-44 rounded-full mt-2" />
      </div>

      {/* Instrument Details Card Skeleton */}
      <div className="rounded-sm border border-border bg-card p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <Skeleton className="h-5 w-60 rounded-md" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-32 rounded-md" />
              <Skeleton className="h-5 w-48 rounded-lg" />
            </div>
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-xl mt-2" />
      </div>

      {/* Cryptographic Provenance Block Skeleton */}
      <div className="rounded-sm border border-border bg-card p-6 space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-52 rounded-md" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-3 pt-1">
          <Skeleton className="h-8 rounded-lg" />
          <Skeleton className="h-8 rounded-lg" />
          <Skeleton className="h-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
