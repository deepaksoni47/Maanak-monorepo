"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle,
  Warning,
  SlidersHorizontal,
  PlusCircle,
  CalendarCheck,
  Clock,
  ArrowRight,
  Info,
  FileText,
  MagnifyingGlass,
  ArrowSquareOut,
  Sparkle,
} from "@phosphor-icons/react";
import { Shell } from "@/components/layout/Shell";
import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  evaluateNablGatekeeper,
  computeOimlTable6Mpe,
  getRecommendedWeightClass,
} from "@/lib/nabl129";
import { AccuracyClassType, MassUnit } from "@/lib/table3";

export interface StandardWeightSet {
  id: string;
  code: string;
  oimlClass: "E1" | "E2" | "F1" | "F2" | "M1" | "M2";
  range: string;
  nablCertNo: string;
  calibratingAgency: string;
  calibrationDate: string;
  expiryDate: string;
  uncertaintyFormatted: string;
  status: "valid" | "expiring_soon" | "expired";
  statusLabel: string;
}

const INVENTORY_SETS: StandardWeightSet[] = [
  {
    id: "ws-01",
    code: "RRSL-WS-E2-01",
    oimlClass: "E2",
    range: "1 mg – 500 g",
    nablCertNo: "CC-NABL-2025-9081",
    calibratingAgency: "National Physical Laboratory (NPL India)",
    calibrationDate: "2025-11-10",
    expiryDate: "2026-11-09",
    uncertaintyFormatted: "U ≤ 0.05 mg (k=2)",
    status: "valid",
    statusLabel: "VALID",
  },
  {
    id: "ws-02",
    code: "RRSL-WS-F1-02",
    oimlClass: "F1",
    range: "1 g – 10 kg",
    nablCertNo: "CC-NABL-2025-8422",
    calibratingAgency: "RRSL Bangalore Central Metrology Lab",
    calibrationDate: "2025-10-15",
    expiryDate: "2026-10-14",
    uncertaintyFormatted: "U ≤ 0.5 mg (k=2)",
    status: "valid",
    statusLabel: "VALID",
  },
  {
    id: "ws-03",
    code: "RRSL-WS-F2-04",
    oimlClass: "F2",
    range: "100 g – 20 kg",
    nablCertNo: "CC-NABL-2025-7731",
    calibratingAgency: "RRSL Faridabad Standards Lab",
    calibrationDate: "2025-12-05",
    expiryDate: "2026-12-04",
    uncertaintyFormatted: "U ≤ 2.0 mg (k=2)",
    status: "valid",
    statusLabel: "VALID",
  },
  {
    id: "ws-04",
    code: "RRSL-WS-M1-05",
    oimlClass: "M1",
    range: "1 kg – 50 kg",
    nablCertNo: "CC-NABL-2025-6119",
    calibratingAgency: "RRSL Ahmedabad Standards Div",
    calibrationDate: "2025-08-20",
    expiryDate: "2026-08-19",
    uncertaintyFormatted: "U ≤ 20.0 mg (k=2)",
    status: "valid",
    statusLabel: "VALID",
  },
  {
    id: "ws-05",
    code: "RRSL-WS-M1-08",
    oimlClass: "M1",
    range: "5 kg – 500 kg",
    nablCertNo: "CC-NABL-2024-4019",
    calibratingAgency: "Regional Reference Standards Laboratory",
    calibrationDate: "2024-10-02",
    expiryDate: "2026-10-01",
    uncertaintyFormatted: "U ≤ 50.0 mg (k=2)",
    status: "expiring_soon",
    statusLabel: "DUE IN 9 DAYS",
  },
];

export function WeightsInventoryView() {
  // Gatekeeper Simulator Interactive State
  const [load, setLoad] = useState("2.5");
  const [loadUnit, setLoadUnit] = useState<MassUnit>("kg");
  const [eVal, setEVal] = useState("0.005");
  const [eUnit, setEUnit] = useState<MassUnit>("kg");
  const [accuracyClass, setAccuracyClass] = useState<AccuracyClassType>("III");
  const [uncertaintyU, setUncertaintyU] = useState("0.0005");
  const [uUnit, setUUnit] = useState<MassUnit>("kg");

  // Search Filter State
  const [searchQuery, setSearchQuery] = useState("");

  const loadNum = parseFloat(load) || 0;
  const eNum = parseFloat(eVal) || 0;
  const uNum = parseFloat(uncertaintyU) || 0;

  const gatekeeper = evaluateNablGatekeeper({
    load: loadNum,
    loadUnit,
    e: eNum,
    eUnit,
    accuracyClass,
    uncertaintyU: uNum,
    uncertaintyUnit: uUnit,
  });

  const filteredInventory = INVENTORY_SETS.filter(
    (item) =>
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.oimlClass.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nablCertNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Shell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Weights & Standards" },
      ]}
      pageTitle="Standard Weight Inventory & NABL 129 Gatekeeper"
      pageSubtitle="Reference standard weight calibration certificates, calibration traceability, and real-time uncertainty pre-checks per Clause 3.7.1."
      headerActions={
        <div className="flex items-center gap-2">
          <Link href="/bench">
            <Button
              size="sm"
              leftIcon={<PlusCircle size={18} weight="bold" />}
              className="font-semibold shadow-xs min-h-[48px]"
            >
              Start Session
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top 3 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Working Standard Sets
              </CardTitle>
              <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <ShieldCheck size={20} weight="duotone" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
                24 sets
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                  100% Valid
                </span>{" "}
                across E2, F1, F2, M1
              </p>
            </CardContent>
          </Card>

          <Card className="hover:border-emerald-500/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                NABL 129 Calibration Health
              </CardTitle>
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle size={20} weight="fill" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                0 Expired
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                  ISO/IEC 17025
                </span>{" "}
                accredited certificates
              </p>
            </CardContent>
          </Card>

          <Card className="hover:border-amber-500/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recalibration Schedule
              </CardTitle>
              <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <CalendarCheck size={20} weight="duotone" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
                42 days
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-amber-600 dark:text-amber-400 font-semibold font-mono">
                  1 set
                </span>{" "}
                recalibration due soon
              </p>
            </CardContent>
          </Card>
        </div>

        {/* NABL 129 Uncertainty Gatekeeper Live Simulator Card */}
        <Card className={gatekeeper.valid ? "border-border" : "border-amber-500/50 dark:border-amber-500/40"}>
          <CardHeader className="border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <ShieldCheck size={20} weight="duotone" className="text-primary" />
                <span>Live NABL 129 Gatekeeper Simulator (Clause 3.7.1)</span>
              </CardTitle>
              <CardDescription>
                Verify that standard weight expanded uncertainty U (k=2) satisfies U ≤ ⅓ |MPE(L)| for any verification test point.
              </CardDescription>
            </div>
            <Badge
              variant={gatekeeper.valid ? "pass" : "warning"}
              className="font-mono text-xs"
            >
              {gatekeeper.valid ? "PRE-CHECK PASSED" : "OUT OF SPECIFICATION"}
            </Badge>
          </CardHeader>

          <CardContent className="space-y-5 pt-5">
            {/* Quick Test Condition Switcher */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-semibold text-muted-foreground">Quick Test Scenarios:</span>
              <button
                type="button"
                onClick={() => {
                  setLoad("2.5");
                  setLoadUnit("kg");
                  setEVal("0.005");
                  setEUnit("kg");
                  setAccuracyClass("III");
                  setUncertaintyU("0.0005"); // 0.5g <= 1.667g (MPE = 5g)
                  setUUnit("kg");
                }}
                className="px-3 py-1.5 rounded-full border border-border bg-background hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-600 transition-all min-h-[48px] inline-flex items-center cursor-pointer font-medium"
              >
                Load In-Spec Weight (U = 0.5 g, Ratio: 10%)
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoad("2.5");
                  setLoadUnit("kg");
                  setEVal("0.005");
                  setEUnit("kg");
                  setAccuracyClass("III");
                  setUncertaintyU("0.0025"); // 2.5g > 1.667g (50% > 33.3%)
                  setUUnit("kg");
                }}
                className="px-3 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-all min-h-[48px] inline-flex items-center cursor-pointer font-medium"
              >
                Load Out-of-Spec Weight (U = 2.5 g, Ratio: 50%)
              </button>
            </div>

            {/* Input Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Applied Test Load (L)
                </label>
                <Input
                  numeric
                  unit={loadUnit}
                  value={load}
                  onChange={(e) => setLoad(e.target.value)}
                  placeholder="2.5"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Verification Interval (e)
                </label>
                <Input
                  numeric
                  unit={eUnit}
                  value={eVal}
                  onChange={(e) => setEVal(e.target.value)}
                  placeholder="0.005"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Instrument Accuracy Class
                </label>
                <select
                  value={accuracyClass}
                  onChange={(e) => setAccuracyClass(e.target.value as AccuracyClassType)}
                  className="w-full h-11 min-h-[48px] rounded-2xl border border-border bg-input/50 px-4 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background"
                >
                  <option value="I">Class I (Special)</option>
                  <option value="II">Class II (High)</option>
                  <option value="III">Class III (Medium)</option>
                  <option value="IIII">Class IIII (Ordinary)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Weight Uncertainty U (k=2)
                </label>
                <Input
                  numeric
                  unit={uUnit}
                  value={uncertaintyU}
                  hasError={!gatekeeper.valid}
                  onChange={(e) => setUncertaintyU(e.target.value)}
                  placeholder="0.0005"
                />
              </div>
            </div>

            {/* Live Metrological Computation Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-muted/30 p-4 rounded-2xl text-xs border border-border/60">
              <div>
                <span className="text-muted-foreground uppercase text-[10px] font-semibold block">Table 6 MPE</span>
                <span className="font-mono font-bold text-sm text-foreground">{gatekeeper.mpeFormatted}</span>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[10px] font-semibold block">Max Allowed U (⅓ MPE)</span>
                <span className="font-mono font-bold text-sm text-foreground">{gatekeeper.maxAllowedUFormatted}</span>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[10px] font-semibold block">Uncertainty Ratio (U / MPE)</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    gatekeeper.valid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {gatekeeper.percentageRatio} {gatekeeper.valid ? "(≤ 33.3% ✓)" : "(> 33.3% ✗)"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[10px] font-semibold block">Required Weight Tier</span>
                <span className="font-mono font-bold text-sm text-primary">{gatekeeper.recommendedWeightClass}</span>
              </div>
            </div>

            {/* Amber Warning Banner (Out of Spec) or Green Compliance Banner */}
            {!gatekeeper.valid ? (
              <div
                data-testid="amber-warning-banner"
                className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500 text-amber-900 dark:text-amber-200 space-y-2 shadow-xs"
              >
                <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
                  <Warning size={20} weight="fill" className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>NABL 129 Gatekeeper Violation: Standard Weight Uncertainty Out of Specification</span>
                </div>
                <p className="text-xs leading-relaxed text-amber-950 dark:text-amber-100">
                  {gatekeeper.message}
                </p>
                <div className="pt-2 border-t border-amber-500/30 flex items-center justify-between text-xs font-mono">
                  <span>Current U: {uncertaintyU} {uUnit}</span>
                  <span className="font-bold text-destructive">BENCH OBSERVATION SUBMISSION LOCKED</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle size={18} weight="fill" className="text-emerald-500" />
                  <span>NABL 129 Pre-Check Passed (Clause 3.7.1 Compliant)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {gatekeeper.message}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Working Standard Weight Sets Inventory Table */}
        <Card>
          <CardHeader className="border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg">Reference Standard Weight Sets Inventory</CardTitle>
              <CardDescription>
                Accredited working standards registered at RRSL facility under NABL 129 standards.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <MagnifyingGlass size={16} className="absolute left-3.5 top-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search code or class..."
                  className="w-full h-11 min-h-[48px] rounded-2xl border border-border bg-input/40 pl-10 pr-4 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </CardHeader>

          {/* Desktop Table View (>= 640px) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                <tr>
                  <th scope="col" className="py-3.5 px-5 font-semibold">Set Code</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">OIML Class</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">Nominal Range</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">NABL Certificate / Calibrator</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">Max Uncertainty U</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">Calibration Validity</th>
                  <th scope="col" className="py-3.5 px-5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredInventory.map((set) => (
                  <tr key={set.id} className="hover:bg-accent/40 transition-colors group">
                    <td className="py-4 px-5 font-mono font-bold text-foreground whitespace-nowrap">
                      {set.code}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                        Class {set.oimlClass}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-foreground whitespace-nowrap">
                      {set.range}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{set.nablCertNo}</div>
                      <div className="text-[11px] text-muted-foreground">{set.calibratingAgency}</div>
                    </td>
                    <td className="py-4 px-4 font-mono text-muted-foreground whitespace-nowrap">
                      {set.uncertaintyFormatted}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <Badge
                        variant={set.status === "valid" ? "pass" : "warning"}
                        className="font-mono text-[11px]"
                      >
                        {set.statusLabel}
                      </Badge>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        Exp: {set.expiryDate}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        rightIcon={<ArrowSquareOut size={14} />}
                        className="text-xs h-9 min-h-[48px] px-3 font-semibold"
                        onClick={() => alert(`Inspecting calibration certificate ${set.nablCertNo}`)}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Collapsible Cards (< 640px) */}
          <div className="block sm:hidden divide-y divide-border/60 p-4 space-y-3">
            {filteredInventory.map((set) => (
              <div
                key={set.id}
                className="pt-3 first:pt-0 space-y-2.5 bg-card/50 rounded-2xl p-3 border border-border/60"
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono font-bold text-xs text-foreground">
                    {set.code}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                    Class {set.oimlClass}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-xl">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-semibold">Nominal Range</div>
                    <div className="font-mono font-medium text-foreground">{set.range}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-semibold">Uncertainty U</div>
                    <div className="font-mono text-foreground">{set.uncertaintyFormatted}</div>
                  </div>
                </div>

                <div className="text-xs space-y-0.5">
                  <div className="font-semibold text-foreground">{set.nablCertNo}</div>
                  <div className="text-[11px] text-muted-foreground">{set.calibratingAgency}</div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Badge
                    variant={set.status === "valid" ? "pass" : "warning"}
                    className="font-mono text-[10px]"
                  >
                    {set.statusLabel}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs min-h-[48px] px-3 font-semibold"
                    onClick={() => alert(`Certificate ${set.nablCertNo}`)}
                  >
                    View Certificate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
}
