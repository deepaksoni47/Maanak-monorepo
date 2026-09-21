"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Scales,
  ShieldCheck,
  FileText,
  QrCode,
  CheckCircle,
  ArrowRight,
  Buildings,
  Flask,
  Fingerprint,
  Calculator,
  Check,
  WarningCircle,
  FilePdf,
  Shield,
  Gauge,
  Sparkle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { GridPattern } from "@/components/ui/grid-pattern";

export default function HomePage() {
  // Simple interactive demonstration for load evaluation
  const [selectedLoad, setSelectedLoad] = useState<number>(2.5); // 2.5 kg = 500e for Class III (e=5g)

  // Quick calculations for the interactive demo (Class III: e = 0.005 kg, Max = 15 kg)
  const eVal = 0.005; // 5g
  const mDivs = selectedLoad / eVal;
  let mpeLimitG = 2.5; // ±0.5e
  if (mDivs > 500 && mDivs <= 2000) mpeLimitG = 5.0; // ±1.0e
  if (mDivs > 2000) mpeLimitG = 7.5; // ±1.5e

  // Simulated typical error
  const sampleErrorG = selectedLoad === 0.1 ? 0.0 : selectedLoad === 2.5 ? 0.5 : selectedLoad === 10 ? 1.0 : 1.5;
  const isPass = Math.abs(sampleErrorG) <= mpeLimitG;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-ring rounded-2xl p-1"
          >
            <div className="relative w-10 h-10 rounded-2xl overflow-hidden border border-border bg-card flex items-center justify-center shadow-xs group-hover:border-primary/50 transition-all">
              <Image
                src="/logo.avif"
                alt="MAANAK Logo"
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
                Legal Metrology Testing Platform
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/instruments" className="hover:text-foreground transition-colors">
              Instruments
            </Link>
            <Link href="/bench" className="hover:text-foreground transition-colors">
              Bench Testing
            </Link>
            <Link href="/reports" className="hover:text-foreground transition-colors">
              Reports
            </Link>
            <Link href="/verify" className="hover:text-foreground transition-colors">
              Verify
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/verify"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-all min-h-[44px]"
            >
              <QrCode size={16} weight="bold" />
              <span>Verify Report</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm min-h-[48px] min-w-[48px]"
            >
              <span>Open Console</span>
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-14 lg:pt-14 lg:pb-20">
        <GridPattern
          width={40}
          height={40}
          x={-1}
          y={-1}
          strokeDasharray="0"
          squares={[
            [4, 4],
            [5, 1],
            [8, 2],
            [5, 3],
            [5, 5],
            [10, 10],
            [12, 15],
            [15, 10],
            [10, 15],
            [15, 10],
            [10, 15],
            [15, 10],
            [2, 3],
            [7, 6],
            [14, 4],
            [18, 7],
            [22, 2],
            [25, 5],
          ]}
          className={cn(
            "stroke-neutral-300/80 dark:stroke-neutral-700/80 fill-primary/15 dark:fill-primary/20",
            "inset-x-0 inset-y-[-10%] h-[120%]"
          )}
          style={{
            WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 35%, white 25%, transparent 85%)",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 35%, white 25%, transparent 85%)",
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
            {/* Left Column (Columns 1-6): Clean, Concise, Human Copy */}
            <div className="lg:col-span-6 space-y-5 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent border border-primary/20 text-xs font-semibold text-accent-foreground">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Department of Consumer Affairs</span>
                <span className="text-border">|</span>
                <span className="text-primary font-bold">OIML R-76 Standard</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-foreground leading-[1.14]">
                Accurate testing & approval for{" "}
                <span className="text-primary relative inline-block">
                  weighing scales
                  <span className="absolute -bottom-1 left-0 w-full h-1 bg-primary/30 rounded-full" />
                </span>
              </h1>

              {/* Short, clear, readable text without walls or complex jargon */}
              <p className="text-base sm:text-lg text-muted-foreground font-normal leading-relaxed max-w-xl">
                Automated error calculation, instant Pass/Fail results, and official test reports for
                laboratory testing officers and legal metrology inspectors.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground px-7 py-3.5 text-base font-semibold hover:bg-primary/90 transition-all shadow-md min-h-[48px]"
                >
                  <Scales size={20} weight="bold" />
                  <span>Start New Test</span>
                  <ArrowRight size={18} weight="bold" />
                </Link>
                <Link
                  href="/verify"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-card border border-border text-foreground px-6 py-3.5 text-base font-medium hover:bg-accent hover:text-accent-foreground transition-all min-h-[48px]"
                >
                  <QrCode size={20} weight="duotone" className="text-primary" />
                  <span>Verify by QR Code</span>
                </Link>
              </div>

              {/* Clean summary chips */}
              <div className="pt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                  <span>Zero math errors</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                  <span>Official PDF & Word reports</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                  <span>Works offline on mobile</span>
                </span>
              </div>
            </div>

            {/* Right Column (Columns 7-12): Free-floating hero illustration */}
            <div className="lg:col-span-6 w-full flex justify-center lg:justify-end items-center">
              <div className="relative w-full max-w-lg xl:max-w-xl flex justify-center">
                <Image
                  src="/hero.avif"
                  alt="MAANAK Legal Metrology Workbench in Action"
                  width={750}
                  height={560}
                  className="w-full h-auto object-contain drop-shadow-lg select-none pointer-events-none"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Step-by-Step Lab Testing Journey */}
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Simple 4-Step Process</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              How a test session works
            </h2>
            <p className="text-sm text-muted-foreground">
              From scale intake to digitally signed certificate in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Step 1 */}
            <div className="rounded-3xl bg-card border border-border p-5 space-y-3 relative hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  01
                </div>
                <Scales size={22} weight="duotone" className="text-primary" />
              </div>
              <h3 className="font-bold text-base text-foreground">Scale Intake</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter model details and capacity. The system automatically verifies scale division limits (n = Max/e).
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-3xl bg-card border border-border p-5 space-y-3 relative hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  02
                </div>
                <ShieldCheck size={22} weight="duotone" className="text-emerald-500" />
              </div>
              <h3 className="font-bold text-base text-foreground">Weight Check</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Picks certified test weights and checks uncertainty. Blocks testing if reference weights are not accurate enough.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-3xl bg-card border border-border p-5 space-y-3 relative hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  03
                </div>
                <Flask size={22} weight="duotone" className="text-primary" />
              </div>
              <h3 className="font-bold text-base text-foreground">Log Readings</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter reading and small changeover weights on tablet or phone. Pre-rounding error is calculated instantly.
              </p>
            </div>

            {/* Step 4 */}
            <div className="rounded-3xl bg-card border border-border p-5 space-y-3 relative hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  04
                </div>
                <FilePdf size={22} weight="duotone" className="text-emerald-500" />
              </div>
              <h3 className="font-bold text-base text-foreground">Sign & Export</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Review automated derivation trees, apply digital signature, and export official OIML PDF with verification QR.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Interactive Live Tolerance Check Demonstration */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Calculator size={15} weight="bold" />
                <span>Try Live Calculation</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                See instant tolerance evaluation
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Select a standard test load for a typical 15 kg grocery scale (Class III, e = 5 g) to see how the system
                checks error against official OIML Table 6 limits.
              </p>

              {/* Load Selection Buttons */}
              <div className="pt-2 flex flex-wrap gap-2">
                {[
                  { label: "Min (100 g)", value: 0.1 },
                  { label: "500e (2.5 kg)", value: 2.5 },
                  { label: "2000e (10 kg)", value: 10.0 },
                  { label: "Max (15 kg)", value: 15.0 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setSelectedLoad(item.value)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all min-h-[44px] ${
                      selectedLoad === item.value
                        ? "bg-primary text-primary-foreground shadow-xs font-bold"
                        : "bg-background border border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Output Card */}
            <div className="lg:col-span-7 bg-background rounded-3xl border border-border p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div className="flex items-center gap-2">
                  <Gauge size={18} weight="bold" className="text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Applied Test Load: {selectedLoad.toFixed(3)} kg
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs font-mono">
                  {isPass ? "PASS" : "FAIL"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded-2xl bg-card border border-border/60">
                  <div className="text-[10px] text-muted-foreground uppercase font-sans">Observed Error</div>
                  <div className="font-bold text-foreground text-sm mt-0.5">
                    +{sampleErrorG.toFixed(1)} g
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-card border border-border/60">
                  <div className="text-[10px] text-muted-foreground uppercase font-sans">Allowed Limit (MPE)</div>
                  <div className="font-bold text-foreground text-sm mt-0.5">
                    ±{mpeLimitG.toFixed(1)} g
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-card border border-border/60 col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-sans">Accuracy Margin</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                    {(((mpeLimitG - Math.abs(sampleErrorG)) / mpeLimitG) * 100).toFixed(0)}% Safe
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-accent/50 border border-primary/20 text-xs flex items-center gap-2.5 text-muted-foreground">
                <CheckCircle size={18} weight="fill" className="text-emerald-500 shrink-0" />
                <span>
                  Error (+{sampleErrorG.toFixed(1)} g) is within Table 6 tolerance bracket (±{mpeLimitG.toFixed(1)} g) for Class III scales.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Accuracy Classes Supported (Educational & Practical) */}
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">All Weighing Categories</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Covers every scale class from lab to highway
            </h2>
            <p className="text-sm text-muted-foreground">
              Built-in rules tailored for all 4 official OIML R-76 accuracy classes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl bg-card border border-border p-5 space-y-2 hover:border-primary/40 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                  Class I
                </span>
                <span className="text-[11px] text-muted-foreground">Special</span>
              </div>
              <h3 className="font-bold text-base text-foreground">Analytical & Gold Balances</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Precision down to 1 mg and 0.1 mg for precious metals, pharmaceuticals, and chemical research.
              </p>
            </div>

            <div className="rounded-3xl bg-card border border-border p-5 space-y-2 hover:border-primary/40 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                  Class II
                </span>
                <span className="text-[11px] text-muted-foreground">High</span>
              </div>
              <h3 className="font-bold text-base text-foreground">Jewelry & Pharmacy Scales</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                High accuracy scales up to 100,000 divisions for medical compounding and trade assaying.
              </p>
            </div>

            <div className="rounded-3xl bg-card border border-border p-5 space-y-2 hover:border-primary/40 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                  Class III
                </span>
                <span className="text-[11px] text-muted-foreground">Medium</span>
              </div>
              <h3 className="font-bold text-base text-foreground">Commercial Retail Scales</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Grocery balances, supermarket checkout scales, and parcel scales up to 10,000 divisions.
              </p>
            </div>

            <div className="rounded-3xl bg-card border border-border p-5 space-y-2 hover:border-primary/40 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                  Class IIII
                </span>
                <span className="text-[11px] text-muted-foreground">Ordinary</span>
              </div>
              <h3 className="font-bold text-base text-foreground">Weighbridges & Industrial</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Heavy truck weighbridges, crane hoists, and bulk cargo scales operating in tough industrial environments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Regional Reference Standard Laboratories (RRSL) */}
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-primary">National Laboratory Network</div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Regional Reference Standard Laboratories</h2>
            </div>
            <span className="text-xs text-muted-foreground">Authorized under Legal Metrology Act, 2009</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { code: "RRSL-FBD", city: "Faridabad", zone: "Northern Region" },
              { code: "RRSL-BLR", city: "Bengaluru", zone: "Southern Region" },
              { code: "RRSL-BBS", city: "Bhubaneswar", zone: "Eastern Region" },
              { code: "RRSL-AMD", city: "Ahmedabad", zone: "Western Region" },
              { code: "RRSL-GHY", city: "Guwahati", zone: "North-Eastern Region" },
            ].map((item) => (
              <div
                key={item.code}
                className="p-3.5 rounded-2xl bg-card border border-border space-y-1 hover:border-primary/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-foreground">{item.code}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="text-xs font-semibold text-foreground">{item.city}</div>
                <div className="text-[10px] text-muted-foreground">{item.zone}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border/80">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-border bg-card flex items-center justify-center">
                <Image
                  src="/logo.avif"
                  alt="MAANAK Logo"
                  width={32}
                  height={32}
                  className="object-contain w-full h-full"
                />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-foreground">MAANAK (मानक)</span>
                <p className="text-[11px] text-muted-foreground">
                  Department of Consumer Affairs • Government of India
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">
                Console
              </Link>
              <Link href="/verify" className="hover:text-foreground transition-colors">
                Verification
              </Link>
              <Link href="/reports" className="hover:text-foreground transition-colors">
                Reports
              </Link>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>
              Legal Metrology (Approval of Models) Rules, 2011/2019 & OIML Recommendation R-76.
            </p>
            <p className="font-mono text-[11px]">
              OIML R-76 • NABL 129 • WELMEC 7.2
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
