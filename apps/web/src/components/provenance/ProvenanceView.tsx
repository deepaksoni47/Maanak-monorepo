"use client";

import React from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LockKey, ShieldCheck, Clock, LinkSimple } from "@phosphor-icons/react";

export interface LedgerBlock {
  blockNumber: number;
  timestamp: string;
  eventType: string;
  sessionId: string;
  officer: string;
  currentHash: string;
  previousHash: string;
  status: "VERIFIED" | "SEALED";
  details: string;
}

export const LEDGER_BLOCKS: LedgerBlock[] = [
  {
    blockNumber: 104,
    timestamp: "2026-09-22 18:45:10 IST",
    eventType: "DIRECTOR_PKI_SEAL",
    sessionId: "TS-2026-0142",
    officer: "Dr. A. Sharma (Director)",
    currentHash: "0x8fa37b12d94e7732a10b8cf634720984e1b8c45e6d78a9c1e0f3b4a58b8f7",
    previousHash: "0x4a58b8f72a91283d5a84e2098d63a89047bf1b2c45e6d78a9c1e0f3b4a58b8f7",
    status: "SEALED",
    details: "X.509 RSA-4096 digital signature applied. Statutory Certificate #CERT-2026-0142 released to public registry.",
  },
  {
    blockNumber: 103,
    timestamp: "2026-09-22 18:30:22 IST",
    eventType: "REVIEWER_AUDIT_APPROVAL",
    sessionId: "TS-2026-0142",
    officer: "Er. P. K. Gupta (Senior Reviewer)",
    currentHash: "0x4a58b8f72a91283d5a84e2098d63a89047bf1b2c45e6d78a9c1e0f3b4a58b8f7",
    previousHash: "0x33e8a1d7f023ab9154ec47189028912e8fa37b12d94e7732a10b8cf6347209",
    status: "VERIFIED",
    details: "All 10 load steps verified within Table 6 limits. Vector error curve compliant with zero hysteresis drift.",
  },
  {
    blockNumber: 102,
    timestamp: "2026-09-22 17:55:04 IST",
    eventType: "OBSERVATION_BATTERY_COMPLETED",
    sessionId: "TS-2026-0142",
    officer: "Er. R. Verma (Field LMO)",
    currentHash: "0x33e8a1d7f023ab9154ec47189028912e8fa37b12d94e7732a10b8cf6347209",
    previousHash: "0x11ac55e8a1d7f023ab9154ec47189028912e8fa37b12d94e7732a10b8cf634",
    status: "VERIFIED",
    details: "10/10 test steps recorded per Clause A.4.4.1. Max error Ec = +1.0 g at 15.0 kg (MPE limit ±7.5 g).",
  },
  {
    blockNumber: 101,
    timestamp: "2026-09-22 17:15:40 IST",
    eventType: "STANDARD_WEIGHTS_GATEKEEPER_PASSED",
    sessionId: "TS-2026-0142",
    officer: "Er. R. Verma (Field LMO)",
    currentHash: "0x11ac55e8a1d7f023ab9154ec47189028912e8fa37b12d94e7732a10b8cf634",
    previousHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    status: "VERIFIED",
    details: "Set #S-M1-2026 validated against NABL 129 criterion: U(0.0008 kg) <= 1/3 * MPE(0.0025 kg). Gatekeeper cleared.",
  },
];

export function ProvenanceView() {
  return (
    <Shell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Audit & Provenance" },
      ]}
      pageTitle="WELMEC 7.2 Cryptographic Provenance Ledger"
      pageSubtitle="Immutable chronological event ledger providing legal tamper-evidence for every test observation, review endorsement, and certificate seal."
    >
      <div className="space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 rounded-3xl border border-border bg-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <LockKey size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Cryptographic Blocks</div>
              <div className="text-xl font-bold font-mono text-foreground">104 Sealed Events</div>
            </div>
          </Card>
          <Card className="p-4 rounded-3xl border border-border bg-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Chain Integrity Status</div>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                100% Tamper-Evident
              </div>
            </div>
          </Card>
          <Card className="p-4 rounded-3xl border border-border bg-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <LinkSimple size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Merkle Root Standard</div>
              <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
                SHA-256 WELMEC 7.2
              </div>
            </div>
          </Card>
        </div>

        {/* Ledger Blocks List */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-foreground">Chronological Cryptographic Event Blocks</h3>
          <div className="grid grid-cols-1 gap-4">
            {LEDGER_BLOCKS.map((block) => (
              <Card key={block.blockNumber} className="rounded-3xl border border-border overflow-hidden shadow-xs">
                <CardHeader className="p-4 sm:p-5 bg-muted/20 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20">
                      Block #{block.blockNumber}
                    </span>
                    <div>
                      <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                        {block.eventType.replace(/_/g, " ")}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                        <Clock size={13} className="text-muted-foreground" />
                        <span>{block.timestamp}</span>
                        <span>·</span>
                        <span>{block.officer}</span>
                      </div>
                    </div>
                  </div>

                  <Badge variant="pass" showIcon={false} className="py-0.5 px-2.5 text-[10px] font-mono font-bold self-start sm:self-auto">
                    {block.status}
                  </Badge>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 space-y-3">
                  <p className="text-xs sm:text-sm text-foreground/90 font-medium">
                    {block.details}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-border/60 font-mono text-[11px]">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-muted-foreground shrink-0 sm:w-28">Current Hash:</span>
                      <span className="font-semibold text-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/60 break-all">
                        {block.currentHash}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-muted-foreground shrink-0 sm:w-28">Previous Hash:</span>
                      <span className="text-muted-foreground bg-muted/30 px-2 py-0.5 rounded border border-border/40 break-all">
                        {block.previousHash}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
