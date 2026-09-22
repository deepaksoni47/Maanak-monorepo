"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Table, ShieldCheck, CheckCircle, XCircle, FileText } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface LedgerEntry {
  stepNumber: number;
  direction: "ASCENDING" | "DESCENDING";
  stageLabel: string;
  appliedLoad: number;
  indication: number;
  deltaL: number;
  eVal: number;
  turningPointP: number;
  rawErrorE: number;
  intrinsicErrorEc: number;
  mpeLimit: number;
  unit: string;
  isPass: boolean;
  toleranceConsumedPercent: number;
  hashSnippet: string;
  timestamp: string;
}

export interface ObservationLedgerTableProps {
  entries: LedgerEntry[];
  currentStepNumber?: number;
  onSelectStep?: (stepNumber: number) => void;
  className?: string;
}

export function ObservationLedgerTable({
  entries,
  currentStepNumber,
  onSelectStep,
  className,
}: ObservationLedgerTableProps) {
  return (
    <Card className={cn("overflow-hidden rounded-3xl border border-border shadow-xs", className)}>
      <CardHeader className="p-4 sm:p-5 border-b border-border/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/20">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Table size={16} weight="bold" />
            </div>
            <CardTitle className="text-base font-bold text-foreground">
              Official OIML R-76 Observation Ledger
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Real-time appending verification log with turning points (P), errors (E, Ec), and WELMEC 7.2 cryptographic hashes.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="pass" className="font-mono text-xs">
            {entries.filter((e) => e.isPass).length} / {entries.length} In-Tolerance
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">
            {entries.length} Steps Logged
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/70 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th scope="col" className="py-3 px-3">Step</th>
                <th scope="col" className="py-3 px-3">Test Stage</th>
                <th scope="col" className="py-3 px-3">Load (L)</th>
                <th scope="col" className="py-3 px-3">Indication (I)</th>
                <th scope="col" className="py-3 px-3">Vernier (ΔL)</th>
                <th scope="col" className="py-3 px-3">Turning (P)</th>
                <th scope="col" className="py-3 px-3">Error (Ec)</th>
                <th scope="col" className="py-3 px-3">MPE Limit</th>
                <th scope="col" className="py-3 px-3">MPE Safety</th>
                <th scope="col" className="py-3 px-3 text-center">Status</th>
                <th scope="col" className="py-3 px-3 font-mono text-[10px]">Hash (WELMEC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-muted-foreground">
                    No observations logged yet. Run test steps on the bench above to append verified entries.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isCurrent = entry.stepNumber === currentStepNumber;
                  const safePercent = Math.max(0, 100 - entry.toleranceConsumedPercent);

                  return (
                    <tr
                      key={entry.stepNumber}
                      onClick={() => onSelectStep?.(entry.stepNumber)}
                      className={cn(
                        "transition-colors cursor-pointer",
                        isCurrent
                          ? "bg-primary/10 font-semibold"
                          : "hover:bg-accent/40"
                      )}
                    >
                      <td className="py-3 px-3 whitespace-nowrap font-mono">
                        <span className="font-bold">#{entry.stepNumber}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">
                          {entry.direction === "ASCENDING" ? "▲" : "▼"}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-foreground">
                        {entry.stageLabel}
                      </td>
                      <td className="py-3 px-3 font-mono whitespace-nowrap font-semibold">
                        {entry.appliedLoad.toFixed(4)} {entry.unit}
                      </td>
                      <td className="py-3 px-3 font-mono whitespace-nowrap">
                        {entry.indication.toFixed(4)} {entry.unit}
                      </td>
                      <td className="py-3 px-3 font-mono whitespace-nowrap text-muted-foreground">
                        {entry.deltaL.toFixed(4)} {entry.unit}
                      </td>
                      <td className="py-3 px-3 font-mono whitespace-nowrap font-semibold text-foreground">
                        {entry.turningPointP.toFixed(4)} {entry.unit}
                      </td>
                      <td
                        className={cn(
                          "py-3 px-3 font-mono whitespace-nowrap font-bold",
                          entry.isPass
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        )}
                      >
                        {entry.intrinsicErrorEc >= 0
                          ? `+${(entry.intrinsicErrorEc * 1000).toFixed(1)}`
                          : (entry.intrinsicErrorEc * 1000).toFixed(1)}{" "}
                        g
                      </td>
                      <td className="py-3 px-3 font-mono whitespace-nowrap text-muted-foreground">
                        ±{(entry.mpeLimit * 1000).toFixed(1)} g
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                entry.isPass ? "bg-emerald-500" : "bg-destructive"
                              )}
                              style={{
                                width: `${Math.min(100, Math.max(5, safePercent))}%`,
                              }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {safePercent.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <Badge
                          variant={entry.isPass ? "pass" : "fail"}
                          showIcon={false}
                          className="py-0.5 px-2 text-[10px] font-mono font-bold"
                        >
                          {entry.isPass ? "PASS" : "FAIL"}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                        <span className="bg-muted px-1.5 py-0.5 rounded border border-border/50">
                          {entry.hashSnippet}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
