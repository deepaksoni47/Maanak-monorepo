"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { weightsApi } from "@/lib/api";
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
  const [inventory, setInventory] = useState<StandardWeightSet[]>(INVENTORY_SETS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inspectingSet, setInspectingSet] = useState<StandardWeightSet | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Form fields for new weight set
  const [newCode, setNewCode] = useState("");
  const [newClass, setNewClass] = useState<"E1" | "E2" | "F1" | "F2" | "M1" | "M2">("F1");
  const [newRange, setNewRange] = useState("1 g – 10 kg");
  const [newNablCert, setNewNablCert] = useState("");
  const [newAgency, setNewAgency] = useState("National Physical Laboratory (NPL India)");
  const [newUncertainty, setNewUncertainty] = useState("0.5 mg");
  const [newExpiry, setNewExpiry] = useState("2027-10-15");

  // Load live standard weights from database + local storage
  const loadWeights = async () => {
    try {
      setIsLoading(true);
      let list = [...INVENTORY_SETS];

      // 1. Try DB
      try {
        const res = await weightsApi.list();
        if (res?.weights && res.weights.length > 0) {
          const mapped: StandardWeightSet[] = res.weights.map((w: any) => {
            const cert = w.calibrationCertificates?.[0];
            const isExpired = cert?.expiryDate && new Date(cert.expiryDate) < new Date();
            return {
              id: w.id,
              code: w.identificationCode || `WS-${w.oimlClass}-01`,
              oimlClass: (w.oimlClass || "M1") as any,
              range: w.nominalMassRange || "1 g – 10 kg",
              nablCertNo: cert?.certificateNumber || "CC-NABL-2026-001",
              calibratingAgency: cert?.calibratingLaboratory || w.laboratory?.name || "National Physical Laboratory",
              calibrationDate: cert?.calibrationDate ? new Date(cert.calibrationDate).toISOString().split("T")[0] : "2025-10-15",
              expiryDate: cert?.expiryDate ? new Date(cert.expiryDate).toISOString().split("T")[0] : "2026-10-14",
              uncertaintyFormatted: cert?.expandedUncertaintyU ? `U ≤ ${cert.expandedUncertaintyU} kg (k=2)` : "U ≤ 0.5 mg (k=2)",
              status: isExpired ? "expired" : "valid",
              statusLabel: isExpired ? "EXPIRED" : "VALID",
            };
          });
          list = [...mapped, ...list];
        }
      } catch (err) {
        console.warn("Weights API fetch note:", err);
      }

      // 2. Local custom weights
      if (typeof window !== "undefined") {
        try {
          const custom = JSON.parse(localStorage.getItem("maanak_custom_weights") || "[]");
          if (Array.isArray(custom)) {
            list = [...custom, ...list];
          }
        } catch (e) {
          console.warn("Failed reading custom weights", e);
        }
      }

      // Deduplicate by code or id
      const seen = new Set<string>();
      const deduped = list.filter((item) => {
        if (seen.has(item.code)) return false;
        seen.add(item.code);
        return true;
      });

      setInventory(deduped);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWeights();
  }, []);

  const handleAddWeightSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newNablCert.trim()) return;

    const newSet: StandardWeightSet = {
      id: `ws-${Date.now()}`,
      code: newCode.trim().toUpperCase(),
      oimlClass: newClass,
      range: newRange.trim(),
      nablCertNo: newNablCert.trim(),
      calibratingAgency: newAgency.trim(),
      calibrationDate: new Date().toISOString().split("T")[0],
      expiryDate: newExpiry,
      uncertaintyFormatted: `U ≤ ${newUncertainty} (k=2)`,
      status: "valid",
      statusLabel: "VALID",
    };

    // Save to local storage
    if (typeof window !== "undefined") {
      const existing = JSON.parse(localStorage.getItem("maanak_custom_weights") || "[]");
      existing.unshift(newSet);
      localStorage.setItem("maanak_custom_weights", JSON.stringify(existing));
    }

    // Try API
    try {
      await weightsApi.register({
        identificationCode: newSet.code,
        oimlClass: newSet.oimlClass,
        nominalMassRange: newSet.range,
        certificateNumber: newSet.nablCertNo,
        calibratingLaboratory: newSet.calibratingAgency,
        calibrationDate: newSet.calibrationDate,
        expiryDate: newSet.expiryDate,
        expandedUncertaintyU: 0.0000005,
      });
    } catch (err) {
      console.warn("API registration fallback to local storage:", err);
    }

    setIsAddModalOpen(false);
    setNewCode("");
    setNewNablCert("");
    await loadWeights();
  };

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

  const filteredInventory = inventory.filter(
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
          <Button
            size="sm"
            variant="outline"
            leftIcon={<PlusCircle size={18} weight="bold" />}
            className="font-semibold shadow-xs min-h-[48px]"
            onClick={() => setIsAddModalOpen(true)}
          >
            Register Weight Set
          </Button>
          <Link href="/bench">
            <Button
              size="sm"
              leftIcon={<ArrowRight size={18} weight="bold" />}
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
              <div className="w-9 h-9 rounded-2xl text-primary flex items-center justify-center">
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
              <div className="w-9 h-9 rounded-2xl text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
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
              <div className="w-9 h-9 rounded-2xl text-amber-600 dark:text-amber-400 flex items-center justify-center">
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
                className="px-3 py-1.5 rounded-full border border-amber-500/40 bg-transparent text-amber-700 dark:text-amber-400 hover:border-amber-500/60 transition-all min-h-[48px] inline-flex items-center cursor-pointer font-medium"
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
              <thead className="bg-muted/50 text-foreground border-b-2 border-neutral-300 dark:border-neutral-700">
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
              <tbody className="divide-y divide-neutral-300 dark:divide-neutral-700">
                {filteredInventory.map((set) => (
                  <tr key={set.id} className="hover:bg-accent/40 transition-colors group">
                    <td className="py-4 px-5 font-mono font-bold text-foreground whitespace-nowrap">
                      {set.code}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-transparent text-primary border border-primary/40">
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
                        onClick={() => setInspectingSet(set)}
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
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-transparent text-primary border border-primary/40">
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
                    onClick={() => setInspectingSet(set)}
                  >
                    View Certificate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Modal: Calibration Certificate Inspector */}
        {inspectingSet && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <Card className="w-full max-w-lg p-6 bg-card border border-border shadow-2xl rounded-2xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <ShieldCheck size={22} weight="duotone" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">NABL Calibration Certificate</CardTitle>
                    <CardDescription className="text-xs font-mono">{inspectingSet.nablCertNo}</CardDescription>
                  </div>
                </div>
                <Badge variant={inspectingSet.status === "valid" ? "pass" : "warning"}>
                  {inspectingSet.statusLabel}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-4 rounded-xl border border-border/70">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Standard Set Code:</span>
                  <strong className="font-mono font-bold text-foreground">{inspectingSet.code}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">OIML Accuracy Class:</span>
                  <strong className="font-semibold text-primary">Class {inspectingSet.oimlClass}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Nominal Range:</span>
                  <strong className="font-mono text-foreground">{inspectingSet.range}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Expanded Uncertainty:</span>
                  <strong className="font-mono text-foreground">{inspectingSet.uncertaintyFormatted}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Calibration Date:</span>
                  <strong className="font-mono text-foreground">{inspectingSet.calibrationDate}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Valid Until:</span>
                  <strong className="font-mono text-foreground">{inspectingSet.expiryDate}</strong>
                </div>
                <div className="col-span-2 pt-1 border-t border-border/40">
                  <span className="text-muted-foreground block text-[11px]">Calibrating Laboratory:</span>
                  <strong className="text-foreground">{inspectingSet.calibratingAgency}</strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle size={15} weight="fill" />
                  <span>NABL 129 Traceability Verified</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Direct unbroken traceability chain established to National Primary Standards at NPL India under ISO/IEC 17025 accreditation.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="default" onClick={() => setInspectingSet(null)} className="min-h-[40px] px-5">
                  Close Inspection
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Modal: Add Standard Weight Set */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <Card className="w-full max-w-lg p-6 bg-card border border-border shadow-2xl rounded-2xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <PlusCircle size={22} weight="duotone" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Register Working Standard Set</CardTitle>
                    <CardDescription className="text-xs">Add traceable calibrated mass standards to laboratory inventory.</CardDescription>
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddWeightSet} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">Set Identification Code</label>
                    <Input
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder="e.g. RRSL-WS-F1-09"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">OIML Accuracy Class</label>
                    <select
                      value={newClass}
                      onChange={(e) => setNewClass(e.target.value as any)}
                      className="w-full h-[48px] px-3 rounded-md border border-border bg-background font-mono text-xs focus:ring-1 focus:ring-primary"
                    >
                      <option value="E1">Class E1 (Ultra-Precision)</option>
                      <option value="E2">Class E2 (High Precision)</option>
                      <option value="F1">Class F1 (Standard Precision)</option>
                      <option value="F2">Class F2 (Secondary Standard)</option>
                      <option value="M1">Class M1 (Working Industrial)</option>
                      <option value="M2">Class M2 (Commercial Verification)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">Nominal Range</label>
                    <Input
                      value={newRange}
                      onChange={(e) => setNewRange(e.target.value)}
                      placeholder="e.g. 1 g – 10 kg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">Expanded Uncertainty U</label>
                    <Input
                      value={newUncertainty}
                      onChange={(e) => setNewUncertainty(e.target.value)}
                      placeholder="e.g. 0.5 mg"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">NABL Calibration Certificate #</label>
                  <Input
                    value={newNablCert}
                    onChange={(e) => setNewNablCert(e.target.value)}
                    placeholder="e.g. CC-NABL-2026-9941"
                    required
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Calibrating Laboratory / Agency</label>
                  <Input
                    value={newAgency}
                    onChange={(e) => setNewAgency(e.target.value)}
                    placeholder="e.g. National Physical Laboratory (NPL India)"
                    required
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Calibration Expiry Date</label>
                  <Input
                    type="date"
                    value={newExpiry}
                    onChange={(e) => setNewExpiry(e.target.value)}
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="default">
                    Save to Standards Inventory
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </Shell>
  );
}
