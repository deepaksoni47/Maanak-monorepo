"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Scales,
  ShieldCheck,
  FileText,
  ChartLineUp,
  QrCode,
  CheckCircle,
  ArrowRight,
  Sparkle,
  LockKey,
  Cpu,
  Buildings,
  Flask,
  MagnifyingGlass,
  ArrowUpRight,
  ShieldChevron,
  CaretRight,
  Certificate,
  Fingerprint,
  Info,
} from "@phosphor-icons/react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"weighing" | "eccentricity" | "repeatability">("weighing");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Top Navigation Bar with Official Logo */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-ring rounded-2xl p-1">
              <div className="relative w-10 h-10 rounded-2xl overflow-hidden border border-border bg-card flex items-center justify-center shadow-xs group-hover:border-primary/50 transition-all">
                <Image
                  src="/logo.avif"
                  alt="MAANAK (मानक) Logo"
                  width={40}
                  height={40}
                  className="object-contain w-full h-full"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg tracking-tight text-foreground">MAANAK</span>
                  <span className="font-semibold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                    मानक
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground hidden sm:inline font-medium">
                  Legal Metrology Pattern Evaluation Workbench
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/instruments" className="hover:text-foreground transition-colors">
              Intake
            </Link>
            <Link href="/bench" className="hover:text-foreground transition-colors">
              Bench Testing
            </Link>
            <Link href="/reports" className="hover:text-foreground transition-colors">
              OIML Reports
            </Link>
            <Link href="/verify" className="hover:text-foreground transition-colors">
              Public Verify
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/verify"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-all min-h-[44px]"
            >
              <QrCode size={16} weight="bold" />
              <span>Verify Hash</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm min-h-[48px] min-w-[48px]"
            >
              <span>Launch Console</span>
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Section 1: Asymmetric Hero with Live Metrological Proof */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 lg:pt-16 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column (Columns 1-7): Editorial Hierarchy & Authority */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Context Pill & Authority Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent border border-primary/20 text-xs font-semibold text-accent-foreground">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-muted-foreground">Govt of India</span>
                <span className="text-border">|</span>
                <span className="text-primary font-bold">Section 22 Legal Metrology Act, 2009</span>
              </div>

              {/* High-Contrast Asymmetric Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.12]">
                Deterministic compliance verification for{" "}
                <span className="text-primary relative inline-block">
                  Non-Automatic
                  <span className="absolute -bottom-1 left-0 w-full h-1 bg-primary/30 rounded-full" />
                </span>{" "}
                Weighing Instruments.
              </h1>

              {/* Real Domain Copy without AI Clichés */}
              <p className="text-base sm:text-lg text-muted-foreground font-normal leading-relaxed max-w-2xl">
                Replace manual paper clipboards, broken spreadsheets, and retrospective calibration failures.
                MAANAK deterministically evaluates NAWI pattern compliance under{" "}
                <strong className="text-foreground font-semibold">OIML R 76-1:2006</strong>, executes automated Vernier
                turning-point math, blocks standard weight uncertainty violations under{" "}
                <strong className="text-foreground font-semibold">NABL 129</strong>, and seals audit trails with{" "}
                <strong className="text-foreground font-semibold">WELMEC 7.2 SHA-256</strong> provenance.
              </p>

              {/* Action Cluster & Standards Chip */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-primary text-primary-foreground px-7 py-3.5 text-base font-semibold hover:bg-primary/90 transition-all shadow-md min-h-[48px]"
                >
                  <Scales size={20} weight="bold" />
                  <span>Start Pattern Evaluation</span>
                  <ArrowRight size={18} weight="bold" />
                </Link>
                <Link
                  href="/verify"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-card border border-border text-foreground px-6 py-3.5 text-base font-medium hover:bg-accent hover:text-accent-foreground transition-all min-h-[48px]"
                >
                  <Fingerprint size={20} weight="duotone" className="text-primary" />
                  <span>Audit Session Hash</span>
                </Link>
              </div>

              {/* Verifiable Trust Metrics */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-border/70 max-w-lg">
                <div>
                  <div className="font-mono text-xl sm:text-2xl font-bold text-foreground tabular-nums">0.0000</div>
                  <div className="text-xs text-muted-foreground font-medium">Math Floating Drift</div>
                </div>
                <div>
                  <div className="font-mono text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    U ≤ ⅓MPE
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">NABL 129 Gatekeeper</div>
                </div>
                <div>
                  <div className="font-mono text-xl sm:text-2xl font-bold text-foreground tabular-nums">17 Forms</div>
                  <div className="text-xs text-muted-foreground font-medium">OIML R 76-2 Reports</div>
                </div>
              </div>
            </div>

            {/* Right Column (Columns 8-12): Real Metrological Evidence Terminal */}
            <div className="lg:col-span-5 w-full">
              <div className="rounded-3xl border border-border bg-card shadow-lg p-5 sm:p-6 space-y-4 relative overflow-hidden">
                {/* Visual Top Band with Status */}
                <div className="flex items-center justify-between border-b border-border/80 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Flask size={18} weight="bold" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Live Bench Terminal
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        RRSL-FBD • Session TS-2026-0089
                      </div>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
                    <CheckCircle size={14} weight="fill" />
                    <span>VERIFIED PASS</span>
                  </div>
                </div>

                {/* Instrument Metadata Block */}
                <div className="bg-background/80 rounded-2xl p-3 border border-border/60 text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Instrument Under Test:</span>
                    <span className="font-semibold text-foreground">Apex Electronic Precision</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground font-mono">
                    <span>Accuracy Class:</span>
                    <span className="font-bold text-primary px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20">
                      Class III (Medium)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground font-mono">
                    <span>Capacity / Division:</span>
                    <span className="font-medium text-foreground">
                      Max = 15.000 kg • e = 5.0 g • n = 3,000
                    </span>
                  </div>
                </div>

                {/* Test Observation Execution Grid */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
                    <span>Clause A.4.4 Weighing Test:</span>
                    <span className="text-[11px] font-mono text-primary">Load Step #4 (100% Max)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-2xl bg-background border border-border/60">
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Applied Load (L)</div>
                      <div className="font-mono text-sm font-bold text-foreground tabular-nums mt-0.5">
                        15.0000 <span className="text-xs text-muted-foreground font-normal">kg</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-background border border-border/60">
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Indication (I)</div>
                      <div className="font-mono text-sm font-bold text-foreground tabular-nums mt-0.5">
                        15.0000 <span className="text-xs text-muted-foreground font-normal">kg</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-background border border-border/60">
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Vernier (ΔL)</div>
                      <div className="font-mono text-sm font-bold text-foreground tabular-nums mt-0.5">
                        0.0010 <span className="text-xs text-muted-foreground font-normal">kg (0.2e)</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-background border border-border/60">
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Turning Point (P)</div>
                      <div className="font-mono text-sm font-bold text-foreground tabular-nums mt-0.5">
                        15.0015 <span className="text-xs text-muted-foreground font-normal">kg</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mathematical Derivation & MPE Comparison Card */}
                <div className="p-3 rounded-2xl bg-accent/60 border border-primary/20 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Error (Ec = E - E0):</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">+1.5000 g (+0.30e)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Table 6 MPE Tolerance:</span>
                    <span className="font-bold text-foreground">±7.5000 g (±1.50e)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full w-[20%]" />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                    <span>Observed |Ec|: 20% of MPE</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">80% Margin Retained</span>
                  </div>
                </div>

                {/* NABL 129 Standard Weight Check */}
                <div className="p-2.5 rounded-2xl bg-background border border-border/60 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} weight="bold" className="text-emerald-500 shrink-0" />
                    <div>
                      <div className="text-[11px] font-semibold text-foreground">NABL 129 Check: Compliant</div>
                      <div className="text-[10px] text-muted-foreground">U = 0.0008 g ≤ 2.50 g (⅓ MPE)</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                    PASSED
                  </span>
                </div>

                {/* WELMEC 7.2 Cryptographic Seal */}
                <div className="pt-1 flex items-center justify-between text-[11px] text-muted-foreground font-mono border-t border-border/60">
                  <div className="flex items-center gap-1.5 truncate mr-2">
                    <LockKey size={14} weight="bold" className="text-primary shrink-0" />
                    <span className="truncate">SHA256: 7f83b165...94827ae4</span>
                  </div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">CHAIN LOCKED</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Non-Generic Functional Architecture (Asymmetric Pillars) */}
        <section className="border-t border-border bg-card/40 py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-3 mb-12">
              <div className="text-xs font-bold uppercase tracking-wider text-primary">
                Metrological Architecture
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
                Engineered for legal defensibility, not generic convenience.
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                Every calculation, rule check, and report artifact in MAANAK is bound by statutory standards
                enforceable in a court of law under Section 24 and Section 32.
              </p>
            </div>

            {/* Asymmetric 3-Pillar Layout (One wide anchor card + 2 complementary cards) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Wide Anchor Card (7 cols): Standards-as-Code Engine */}
              <div className="lg:col-span-7 rounded-3xl bg-card border border-border p-6 sm:p-8 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Cpu size={28} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Standards-as-Code Rule Packs</h3>
                    <p className="text-xs font-mono text-primary mt-0.5">oiml-r76-2006-v1.json • Runtime Ingestion</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Statutory regulations change across gazette notifications. MAANAK decouples R-76 Table 3
                    scale boundaries and Table 6 MPE step-bracket matrices from compiled application code into
                    immutable, versioned JSON rule packs. Updates to OIML standards can be hot-swapped dynamically
                    without database rebuilds or software re-certification.
                  </p>

                  <div className="p-4 rounded-2xl bg-background border border-border text-xs font-mono space-y-2">
                    <div className="text-muted-foreground">// Table 6 Initial Verification Bracket Evaluation</div>
                    <div className="text-foreground">
                      <span className="text-primary font-bold">Class III:</span> 0 ≤ m ≤ 500e →{" "}
                      <span className="text-emerald-500 font-semibold">±0.5e</span> | 500e &lt; m ≤ 2000e →{" "}
                      <span className="text-emerald-500 font-semibold">±1.0e</span> | m &gt; 2000e →{" "}
                      <span className="text-emerald-500 font-semibold">±1.5e</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border/70 flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>Zero hardcoded formula limits</span>
                  <Link href="/rule-packs" className="text-primary hover:underline inline-flex items-center gap-1 font-semibold">
                    <span>Inspect Rule Schema</span>
                    <ArrowRight size={14} weight="bold" />
                  </Link>
                </div>
              </div>

              {/* Stacked Right Column (5 cols): NABL 129 Gatekeeper & WELMEC Provenance */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                {/* Pillar 2: NABL 129 Gatekeeper */}
                <div className="rounded-3xl bg-card border border-border p-6 flex-1 hover:border-primary/40 transition-all shadow-xs space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <ShieldChevron size={24} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">NABL 129 Pre-Validation Gatekeeper</h3>
                    <p className="text-xs font-mono text-amber-600 dark:text-amber-400">
                      U ≤ ⅓ MPE Expanded Uncertainty
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Testing with out-of-calibration or high-uncertainty standard weights invalidates entire multi-day
                    lab trials. The algorithmic gatekeeper cross-checks test weight certificates against applied load
                    brackets before observation recording is unlocked.
                  </p>
                </div>

                {/* Pillar 3: WELMEC 7.2 Cryptographic Chain */}
                <div className="rounded-3xl bg-card border border-border p-6 flex-1 hover:border-primary/40 transition-all shadow-xs space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <LockKey size={24} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">WELMEC 7.2 SHA-256 Non-Repudiation</h3>
                    <p className="text-xs font-mono text-primary">Extension L Audit Graph & PKI Seals</p>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Every observation, ambient temperature reading, and calculation run appends an immutable node to
                    the session hash graph. Direct SQL tampering breaks the cryptographic chain and triggers immediate
                    tamper alerts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Interactive OIML R 76-2 Test Form Matrix */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-primary">Standardized Protocols</div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
                Official OIML R 76-2 Form Battery
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl">
                Automated form execution covering all 17 standardized pattern evaluation modules with live derivation step trees.
              </p>
            </div>

            {/* Form Selector Tabs */}
            <div className="inline-flex p-1 rounded-2xl bg-muted border border-border text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("weighing")}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === "weighing"
                    ? "bg-background text-primary shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Form 1: Weighing
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("eccentricity")}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === "eccentricity"
                    ? "bg-background text-primary shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Form 3: Corner Load
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("repeatability")}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === "repeatability"
                    ? "bg-background text-primary shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Form 5: Repeatability
              </button>
            </div>
          </div>

          {/* Tab Content Display Card */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6">
            {activeTab === "weighing" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      Form 1: Weighing Performance & Hysteresis (Clause A.4.4)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      5 ascending and descending load steps including Min, 500e, 2000e, and Max.
                    </p>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                    10 Observation Points
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-left">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="py-2.5 px-3">Run Direction</th>
                        <th className="py-2.5 px-3">Applied Load (L)</th>
                        <th className="py-2.5 px-3">Indication (I)</th>
                        <th className="py-2.5 px-3">Vernier (ΔL)</th>
                        <th className="py-2.5 px-3">Turning Point (P)</th>
                        <th className="py-2.5 px-3">Error (Ec)</th>
                        <th className="py-2.5 px-3">MPE Limit</th>
                        <th className="py-2.5 px-3 text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      <tr>
                        <td className="py-2.5 px-3 text-primary font-semibold">ASCENDING</td>
                        <td className="py-2.5 px-3">0.100 kg (Min)</td>
                        <td className="py-2.5 px-3">0.100 kg</td>
                        <td className="py-2.5 px-3">0.0025 kg</td>
                        <td className="py-2.5 px-3">0.1000 kg</td>
                        <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">0.000 g</td>
                        <td className="py-2.5 px-3">±2.500 g (±0.5e)</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">PASS</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-primary font-semibold">ASCENDING</td>
                        <td className="py-2.5 px-3">2.500 kg (500e)</td>
                        <td className="py-2.5 px-3">2.500 kg</td>
                        <td className="py-2.5 px-3">0.0020 kg</td>
                        <td className="py-2.5 px-3">2.5005 kg</td>
                        <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">+0.500 g</td>
                        <td className="py-2.5 px-3">±2.500 g (±0.5e)</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">PASS</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-primary font-semibold">ASCENDING</td>
                        <td className="py-2.5 px-3">10.000 kg (2000e)</td>
                        <td className="py-2.5 px-3">10.000 kg</td>
                        <td className="py-2.5 px-3">0.0015 kg</td>
                        <td className="py-2.5 px-3">10.0010 kg</td>
                        <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">+1.000 g</td>
                        <td className="py-2.5 px-3">±5.000 g (±1.0e)</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">PASS</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-primary font-semibold">ASCENDING</td>
                        <td className="py-2.5 px-3">15.000 kg (Max)</td>
                        <td className="py-2.5 px-3">15.000 kg</td>
                        <td className="py-2.5 px-3">0.0010 kg</td>
                        <td className="py-2.5 px-3">15.0015 kg</td>
                        <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">+1.500 g</td>
                        <td className="py-2.5 px-3">±7.500 g (±1.5e)</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">PASS</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "eccentricity" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      Form 3: Eccentricity Corner Load (Clause A.4.7)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Testing 4 quadrant corner locations + center position at L = ⅓ Max (5.000 kg).
                    </p>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                    5 Position Matrix
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-2xl bg-background border border-border text-center space-y-1">
                    <div className="text-muted-foreground">Pos 1 (Center)</div>
                    <div className="font-bold text-foreground">Ec = +0.5 g</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">PASS</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-background border border-border text-center space-y-1">
                    <div className="text-muted-foreground">Pos 2 (Front-L)</div>
                    <div className="font-bold text-foreground">Ec = +0.8 g</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">PASS</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-background border border-border text-center space-y-1">
                    <div className="text-muted-foreground">Pos 3 (Rear-L)</div>
                    <div className="font-bold text-foreground">Ec = +1.1 g</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">PASS</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-background border border-border text-center space-y-1">
                    <div className="text-muted-foreground">Pos 4 (Rear-R)</div>
                    <div className="font-bold text-foreground">Ec = -0.4 g</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">PASS</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-background border border-border text-center space-y-1">
                    <div className="text-muted-foreground">Pos 5 (Front-R)</div>
                    <div className="font-bold text-foreground">Ec = +0.9 g</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">PASS</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "repeatability" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      Form 5: Repeatability Spread (Clause A.4.10)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      10 successive weighings at 50% Max (7.5 kg) and 100% Max (15 kg).
                    </p>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                    Spread ≤ |MPE|
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-background border border-border text-xs font-mono flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="text-muted-foreground">Evaluation at Load L = 15.000 kg:</div>
                    <div className="text-foreground font-bold mt-0.5">
                      Max P = 15.0015 kg • Min P = 15.0005 kg • Spread = 1.000 g
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground">MPE Limit: ±7.500 g</div>
                    <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                      REPEATABILITY VERIFIED (PASS)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 4: National Laboratory Infrastructure & Regional Traceability */}
        <section className="border-t border-border bg-card/20 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
              <div className="text-xs font-bold uppercase tracking-wider text-primary">
                National Laboratory Network
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Regional Reference Standard Laboratories (RRSLs)
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Calibrated against National Physical Laboratory (NPL) primary standards under Section 22 statutory jurisdiction.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {[
                { code: "RRSL-FBD", city: "Faridabad", state: "Haryana (North)" },
                { code: "RRSL-BLR", city: "Bengaluru", state: "Karnataka (South)" },
                { code: "RRSL-BBS", city: "Bhubaneswar", state: "Odisha (East)" },
                { code: "RRSL-AMD", city: "Ahmedabad", state: "Gujarat (West)" },
                { code: "RRSL-GHY", city: "Guwahati", state: "Assam (North-East)" },
              ].map((lab) => (
                <div
                  key={lab.code}
                  className="rounded-2xl border border-border bg-card p-4 text-left space-y-1.5 hover:border-primary/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <Buildings size={20} weight="duotone" className="text-primary" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <div className="font-mono text-xs font-bold text-foreground mt-1">{lab.code}</div>
                  <div className="text-xs font-semibold text-foreground">{lab.city}</div>
                  <div className="text-[11px] text-muted-foreground">{lab.state}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer with Official Logo & Legal Metrology Act Mandate */}
      <footer className="border-t border-border bg-card/60 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-border/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-border bg-card flex items-center justify-center">
                <Image
                  src="/logo.avif"
                  alt="MAANAK Logo"
                  width={36}
                  height={36}
                  className="object-contain w-full h-full"
                />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-foreground">MAANAK (मानक)</span>
                <p className="text-xs text-muted-foreground">
                  Department of Consumer Affairs • Ministry of Consumer Affairs, Food & Public Distribution
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">
                Lab Console
              </Link>
              <Link href="/verify" className="hover:text-foreground transition-colors">
                Public Verification
              </Link>
              <Link href="/rule-packs" className="hover:text-foreground transition-colors">
                OIML Rule Packs
              </Link>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>
              Statutory Pattern Evaluation under Section 22 of the Legal Metrology Act, 2009 & Legal Metrology (Approval of Models) Rules, 2011/2019.
            </p>
            <p className="font-mono text-[11px]">
              OIML R 76-1:2006 • WELMEC 7.2 • NABL 129
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
