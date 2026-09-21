"use client";

import React from "react";
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
} from "@phosphor-icons/react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <Scales size={24} weight="bold" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">MAANAK</span>
              <span className="text-xs text-muted-foreground ml-2 font-medium px-2 py-0.5 rounded-xl bg-accent text-accent-foreground border border-primary/20">
                मानक v2.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:bg-primary/90 transition-all shadow-sm"
            >
              <span>Workbench</span>
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-accent text-accent-foreground text-xs font-semibold border border-primary/20">
            <Sparkle size={14} weight="fill" className="text-primary" />
            <span>OIML R 76-1:2006 / OIML R 76-2:2007 Compliant</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
            Legal Metrology Automated{" "}
            <span className="text-primary">Pattern Evaluation</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground font-normal leading-relaxed">
            Government of India platform for Non-Automatic Weighing Instruments (NAWI)
            model approval, deterministic turning point verification, NABL 129 uncertainty
            gatekeeping, and WELMEC 7.2 cryptographic provenance.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground px-7 py-3 text-base font-semibold hover:bg-primary/90 transition-all shadow-md"
            >
              <span>Launch Lab Console</span>
              <ArrowRight size={18} weight="bold" />
            </Link>
            <Link
              href="/verify"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-card border border-border text-foreground px-6 py-3 text-base font-medium hover:bg-accent hover:text-accent-foreground transition-all"
            >
              <QrCode size={20} weight="regular" />
              <span>Verify Certificate Hash</span>
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16 lg:mt-24">
          <div className="rounded-3xl bg-card p-6 border border-border space-y-3 transition-all hover:border-primary/40 hover:shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Cpu size={26} weight="duotone" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Standards-as-Code</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Decoupled regulatory rules engine supporting dynamic Table 3 and Table 6
              MPE calculations without core application re-deployments.
            </p>
          </div>

          <div className="rounded-3xl bg-card p-6 border border-border space-y-3 transition-all hover:border-primary/40 hover:shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <LockKey size={26} weight="duotone" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">WELMEC 7.2 Cryptography</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Root-to-leaf SHA-256 provenance graph tracking bench observations,
              environmental logs, and X.509 PKI director sign-off.
            </p>
          </div>

          <div className="rounded-3xl bg-card p-6 border border-border space-y-3 transition-all hover:border-primary/40 hover:shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck size={26} weight="duotone" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">NABL 129 Pre-Checks</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Automated standard weight expanded uncertainty gatekeeping (U ≤ 1/3 MPE)
              preventing invalid multi-day laboratory bench execution.
            </p>
          </div>

          <div className="rounded-3xl bg-card p-6 border border-border space-y-3 transition-all hover:border-primary/40 hover:shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <ChartLineUp size={26} weight="duotone" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Vernier Turning Point Math</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Deterministic 30-digit precision arithmetic for P, E, and Ec calculations
              with stepped vector error curves vs MPE envelopes.
            </p>
          </div>

          <div className="rounded-3xl bg-card p-6 border border-border space-y-3 transition-all hover:border-primary/40 hover:shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <FileText size={26} weight="duotone" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">OIML R 76-2 Reports</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Automated multi-page PDF and editable OpenXML DOCX report compiler
              with embedded verification QR and Adobe signature dictionaries.
            </p>
          </div>

          <div className="rounded-3xl bg-card p-6 border border-border space-y-3 transition-all hover:border-primary/40 hover:shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <CheckCircle size={26} weight="duotone" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Multi-Device PWA</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Offline-capable mobile and tablet experience with 48px touch targets,
              decimal Vernier keypads, and automatic server synchronization.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-muted-foreground space-y-1">
          <p>
            MAANAK (मानक) — Developed for the Department of Consumer Affairs, Government of India
          </p>
          <p>
            Under Section 22 of the Legal Metrology Act, 2009 & Legal Metrology (Approval of Models) Rules, 2011/2019
          </p>
        </div>
      </footer>
    </main>
  );
}
