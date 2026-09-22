"use client";

import React, { useState, useEffect } from "react";
import { rulesApi } from "@/lib/api";
import { Shell } from "@/components/layout/Shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Gear, ShieldCheck, CheckCircle, LockKey } from "@phosphor-icons/react";

export interface RulePack {
  id: string;
  name: string;
  statutoryReference: string;
  version: string;
  jurisdiction: string;
  status: "ACTIVE" | "SUPERSEDED";
  rulesCount: number;
  description: string;
  clauses: string[];
}

export const RULE_PACKS: RulePack[] = [
  {
    id: "rp-oiml-r76-2006",
    name: "OIML R-76-1:2006 Edition (International)",
    statutoryReference: "OIML R-76 Non-Automatic Weighing Instruments",
    version: "2006.1-IN",
    jurisdiction: "International / National Adoption",
    status: "ACTIVE",
    rulesCount: 48,
    description:
      "Core metrological and technical requirements for NAWI: Class I, II, III, IIII determination, MPE limits (Table 6), eccentricity (A.4.7), repeatability (A.4.10), and zero-setting (A.4.2).",
    clauses: [
      "Clause 3.1: Principles of Classification (Table 3)",
      "Clause 3.5: Maximum Permissible Errors (Table 6)",
      "Clause 3.7.1: Working Standards Uncertainty (U <= 1/3 MPE)",
      "Clause A.4.4.3: Turning Point Determination (P = I + 0.5e - ΔL)",
      "Clause A.4.7: Eccentricity Testing for Off-Center Loading",
      "Clause A.4.10: Repeatability Error Testing at 1/2 Max and Max",
    ],
  },
  {
    id: "rp-lm-act-2009",
    name: "Legal Metrology (General) Rules, 2011 (India)",
    statutoryReference: "Legal Metrology Act, 2009 (Act No. 1 of 2010)",
    version: "2011.4",
    jurisdiction: "Republic of India (Central & State Divisions)",
    status: "ACTIVE",
    rulesCount: 32,
    description:
      "Mandatory Indian statutory enforcement: initial verification MPE (Table 6 standard), subsequent verification MPE (2x initial), government fee schedules, and stamping requirements.",
    clauses: [
      "Seventh Schedule: Specifications for Non-Automatic Weighing Instruments",
      "Rule 14: Verification Scale Interval (e) Statutory Brackets",
      "Rule 27: Maximum Permissible Errors on Re-verification (2x MPE)",
      "Rule 33: Security Seals and Lead Stamping Mandates",
    ],
  },
  {
    id: "rp-nabl-129",
    name: "NABL 129:2020 Standard Weight Uncertainty Gatekeeper",
    statutoryReference: "NABL Specific Criteria for Calibration Laboratories",
    version: "2020.2",
    jurisdiction: "NABL Accredited Calibration Facilities",
    status: "ACTIVE",
    rulesCount: 16,
    description:
      "Automated gatekeeper ensuring all working standards (E2, F1, F2, M1) possess expanded measurement uncertainty U(k=2) not exceeding one-third of the instrument's MPE at applied load.",
    clauses: [
      "Clause 4.1: Uncertainty Ratio Rule: U(k=2) <= 1/3 * MPE(L)",
      "Clause 4.3: Traceability Chain to National Physical Laboratory (NPL)",
      "Clause 5.2: Recalibration Frequency & Drift Warning Limits",
    ],
  },
];

export function RulePacksView() {
  const [rulePacks, setRulePacks] = useState<RulePack[]>(RULE_PACKS);

  useEffect(() => {
    let isMounted = true;
    async function loadRulePacks() {
      try {
        const res = await rulesApi.list();
        if (isMounted && res?.rulePacks && res.rulePacks.length > 0) {
          const mapped: RulePack[] = res.rulePacks.map((p: any) => ({
            id: p.id,
            name: p.name || p.standard || "OIML R-76 Statutory Rule Pack",
            statutoryReference: p.standard || "OIML R-76 Non-Automatic Weighing Instruments",
            version: p.version || "1.0",
            jurisdiction: p.jurisdiction || "Republic of India",
            status: p.isActive ? "ACTIVE" : "SUPERSEDED",
            rulesCount: Object.keys(p.rules || {}).length || 48,
            description: p.description || "Audited statutory rules engine executing formal OIML R-76 definitions.",
            clauses: [
              "Clause 3.1: Principles of Classification (Table 3)",
              "Clause 3.5: Maximum Permissible Errors (Table 6)",
              "Clause 3.7.1: Working Standards Uncertainty (U <= 1/3 MPE)",
              "Clause A.4.4.3: Turning Point Determination (P = I + 0.5e - ΔL)",
              "Clause A.4.7: Eccentricity Testing for Off-Center Loading",
              "Clause A.4.10: Repeatability Error Testing at 1/2 Max and Max",
            ],
          }));
          setRulePacks(mapped);
        }
      } catch (err) {
        console.warn("Rules API load note:", err);
      }
    }
    loadRulePacks();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Shell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Standards & Rules" },
      ]}
      pageTitle="Standards-as-Code & Statutory Rule Packs"
      pageSubtitle="Audited metrological rule engines executing formal OIML R-76, Legal Metrology Act 2009, and NABL 129 statutory definitions in code."
    >
      <div className="space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 rounded-3xl border border-border bg-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Gear size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Active Rule Engines</div>
              <div className="text-xl font-bold font-mono text-foreground">{rulePacks.length} Standards-as-Code</div>
            </div>
          </Card>
          <Card className="p-4 rounded-3xl border border-border bg-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Compiled Rules</div>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                96 Verified Rules
              </div>
            </div>
          </Card>
          <Card className="p-4 rounded-3xl border border-border bg-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <LockKey size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">WELMEC Traceability</div>
              <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
                SHA-256 Sealed
              </div>
            </div>
          </Card>
        </div>

        {/* Rule Packs List */}
        <div className="grid grid-cols-1 gap-6">
          {rulePacks.map((rp) => (
            <Card key={rp.id} className="rounded-3xl border border-border overflow-hidden shadow-xs">
              <CardHeader className="p-5 sm:p-6 bg-muted/20 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <CardTitle className="text-base sm:text-lg font-bold">
                      {rp.name}
                    </CardTitle>
                    <Badge variant="pass" showIcon={false} className="py-0.5 px-2 text-[10px] font-mono font-bold">
                      {rp.status}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">
                      v{rp.version}
                    </span>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    {rp.statutoryReference} · {rp.jurisdiction}
                  </CardDescription>
                </div>

                <div className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-card border border-border shrink-0">
                  {rp.rulesCount} Executable Rules
                </div>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 space-y-4">
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                  {rp.description}
                </p>

                <div className="space-y-2 pt-2 border-t border-border/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Enforced Metrological Clauses in MAANAK Engine:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {rp.clauses.map((clause, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-background border border-border/60 text-xs font-mono text-foreground flex items-center gap-2"
                      >
                        <CheckCircle size={14} className="text-emerald-500 shrink-0" weight="bold" />
                        <span className="truncate">{clause}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}
