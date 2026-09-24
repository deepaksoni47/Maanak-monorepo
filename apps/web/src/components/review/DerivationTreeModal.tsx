"use client";

import React from "react";
import {
  X,
  Scales,
  Warning,
  CheckCircle,
  XCircle,
  GitFork,
  ArrowRight,
  FileText,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface FlaggedAuditItem {
  id: string;
  sessionNumber: string;
  model: string;
  accuracyClass: string;
  inspector: string;
  stepNumber: number;
  nominalLoad: string;
  indication: string;
  deltaL: string;
  eVal: string;
  turningPointP: string;
  errorEc: string;
  mpeLimit: string;
  anomalyCode: string;
  anomalyTitle: string;
  anomalyDescription: string;
  severity: "critical" | "warning" | "info";
  ruleCitation: string;
}

export interface DerivationTreeModalProps {
  item: FlaggedAuditItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDecision?: (action: "APPROVED" | "FLAGGED_FOR_CORRECTION" | "REJECTED") => void;
}

export function DerivationTreeModal({
  item,
  isOpen,
  onClose,
  onDecision,
}: DerivationTreeModalProps) {
  if (!isOpen || !item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="derivation-tree-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-2xl bg-card border border-border text-card-foreground rounded-sm shadow-2xl p-5 sm:p-7 space-y-5 my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <GitFork size={20} weight="bold" />
              </span>
              <h2
                id="derivation-tree-title"
                className="text-lg sm:text-xl font-bold tracking-tight text-foreground"
              >
                Step Derivation Tree Audit
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Algorithmic verification comparing bench observation to OIML R 76-1 rules.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-10 h-10 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Item Metadata Banner */}
        <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-foreground">
                {item.sessionNumber}
              </span>
              <span className="text-muted-foreground">({item.model})</span>
              <span className="px-2 py-0.5 rounded-full font-mono font-bold bg-transparent text-primary border border-primary/40 text-[10px]">
                Class {item.accuracyClass}
              </span>
            </div>
            <div className="text-muted-foreground mt-0.5">
              Testing Bay Inspector: <strong className="text-foreground">{item.inspector}</strong>
            </div>
          </div>

          <Badge
            variant={item.severity === "critical" ? "fail" : item.severity === "warning" ? "warning" : "pass"}
            className="font-mono text-xs uppercase"
          >
            {item.severity} ANOMALY
          </Badge>
        </div>

        {/* Mathematical Derivation Tree Visualizer */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Scales size={16} className="text-primary" />
            <span>Mathematical Derivation Node Graph</span>
          </div>

          <div className="rounded-2xl border border-border/80 bg-background/50 p-4 font-mono text-xs space-y-3">
            {/* Tree Root */}
            <div className="flex items-center gap-2 text-foreground font-bold">
              <span className="text-primary">├── Step #{item.stepNumber}:</span>
              <span>Nominal Test Load L = {item.nominalLoad}</span>
            </div>

            {/* Branch 1: Indication */}
            <div className="pl-6 border-l-2 border-border/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">│   ├── Scale Indication (I):</span>
                <span className="text-foreground font-semibold">{item.indication}</span>
              </div>

              {/* Branch 2: Vernier Delta L */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">│   ├── Vernier Changeover (ΔL):</span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-semibold">{item.deltaL}</span>
                  {item.anomalyCode === "ANOMALY_DELTA_L_OVER_E" && (
                    <span className="text-[10px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-full font-bold">
                      ΔL &gt; e ({item.eVal}) ✗
                    </span>
                  )}
                </div>
              </div>

              {/* Branch 3: Turning Point Formula */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <div className="text-[11px] text-muted-foreground font-sans">
                  Turning Point P Formula (Clause A.4.4.3):
                </div>
                <div className="text-primary font-bold">
                  P = I + 0.5e - ΔL = {item.turningPointP}
                </div>
              </div>

              {/* Branch 4: Error Ec */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">│   ├── Corrected Intrinsic Error (Ec):</span>
                <span className="font-bold text-destructive">{item.errorEc}</span>
              </div>

              {/* Branch 5: Table 6 MPE Bracket */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">└── Permissible Limit (|MPE|):</span>
                <span className="text-foreground font-bold">{item.mpeLimit}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Violation Diagnosis & Rule Citation Box */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
            <Warning size={18} weight="fill" className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{item.anomalyTitle}</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {item.anomalyDescription}
          </p>
          <div className="pt-2 border-t border-amber-500/30 flex items-center gap-1.5 font-mono text-[11px] text-amber-800 dark:text-amber-300">
            <FileText size={14} />
            <span>Citation: {item.ruleCitation}</span>
          </div>
        </div>

        {/* Reviewer Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto text-xs font-semibold min-h-[48px]"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto text-xs font-bold min-h-[48px]"
            onClick={() => {
              onDecision?.("FLAGGED_FOR_CORRECTION");
              onClose();
            }}
          >
            Flag for Re-Test &amp; Notify Officer
          </Button>

          <Button
            type="button"
            className="w-full sm:w-auto text-xs font-bold min-h-[48px]"
            onClick={() => {
              onDecision?.("APPROVED");
              onClose();
            }}
          >
            Sign-Off &amp; Accept Deviation
          </Button>
        </div>
      </div>
    </div>
  );
}
