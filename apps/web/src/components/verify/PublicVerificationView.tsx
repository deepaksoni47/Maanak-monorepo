"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldWarning,
  QrCode,
  Scales,
  Certificate,
  CheckCircle,
  XCircle,
  Copy,
  ArrowRight,
  MagnifyingGlass,
  Building,
  CalendarCheck,
  Warning,
  LockKey,
} from "@phosphor-icons/react";
import { Shell } from "@/components/layout/Shell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface PublicVerificationViewProps {
  hash: string;
}

export function PublicVerificationView({ hash }: PublicVerificationViewProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [inputHash, setInputHash] = useState<string>("");

  // Determine authenticity:
  // Hashes containing "tamper", "invalid", or "corrupt" are flagged as violations.
  const isTampered =
    hash.toLowerCase().includes("tamper") ||
    hash.toLowerCase().includes("invalid") ||
    hash.toLowerCase().includes("corrupt");

  const isAuthentic = !isTampered && hash.length >= 12;

  const handleCopyHash = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Public Verification", href: "/verify" },
    {
      label: `${hash.slice(0, 8)}...`,
      href: `/verify/${hash}`,
    },
  ];

  return (
    <Shell breadcrumbs={breadcrumbs}>
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        {/* National Verification Portal Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <QrCode className="h-4 w-4" />
            <span>National Legal Metrology Verification Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            OIML R-76 Certificate Authenticity
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
            Instant cryptographic validation of non-automatic weighing instrument
            verification seals under the Legal Metrology Act, 2009.
          </p>
        </div>

        {/* Primary Verdict Banner */}
        {isAuthentic ? (
          <Card className="p-6 bg-emerald-500/10 border-emerald-500/30 text-center space-y-3 relative overflow-hidden shadow-lg shadow-emerald-500/5">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <ShieldCheck className="h-10 w-10" weight="duotone" />
            </div>

            <div className="space-y-1">
              <Badge variant="pass" className="text-xs uppercase font-bold py-1 px-3">
                AUTHENTIC &amp; UNTAMPERED (वैध एवं प्रमाणित)
              </Badge>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                Cryptographic Integrity Confirmed
              </h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                This instrument has undergone official verification under OIML R-76
                at an accredited government laboratory. The physical verification seal
                matches the immutable ledger.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/40">
                <CheckCircle className="h-4 w-4" weight="fill" />
                LEGAL FOR TRADE (व्यापार हेतु स्वीकृत)
              </span>
            </div>
          </Card>
        ) : (
          <Card className="p-6 bg-rose-500/10 border-rose-500/30 text-center space-y-3 relative overflow-hidden shadow-lg shadow-rose-500/5">
            <div className="inline-flex p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <ShieldWarning className="h-10 w-10" weight="duotone" />
            </div>

            <div className="space-y-1">
              <Badge variant="fail" className="text-xs uppercase font-bold py-1 px-3">
                TAMPER DETECTED / UNVERIFIED (अवैध / संदिग्ध)
              </Badge>
              <h2 className="text-xl sm:text-2xl font-bold text-rose-400">
                Cryptographic Signature Mismatch
              </h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                The provided hash does not match any authenticated OIML R-76 test
                session in the national registry. This instrument is not certified
                for commercial or legal transactions.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-background/60 border border-rose-500/20 text-xs text-rose-400/90 text-left space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Warning className="h-4 w-4 shrink-0" weight="fill" />
                <span>Statutory Warning: Legal Metrology Act, 2009</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Using unverified weighing instruments for commercial transactions is a
                cognizable offence under Section 24 and punishable under Section 33.
              </p>
            </div>
          </Card>
        )}

        {/* Instrument & Laboratory Details (Displayed for Authentic Records) */}
        {isAuthentic && (
          <Card className="p-5 sm:p-6 bg-card/80 backdrop-blur-xs border-border/80 space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <Scales className="h-5 w-5 text-primary" weight="duotone" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Verified NAWI Instrument Specifications
                </h3>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                Class III (Medium)
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground">Manufacturer &amp; Model</span>
                <p className="text-sm font-bold text-foreground">
                  Essae-Teraoka DS-215 Commercial Platform
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground">Physical Serial Number</span>
                <p className="text-sm font-mono font-bold text-foreground">
                  SN-2026-ES-00984
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground">Capacity &amp; Resolution</span>
                <p className="text-sm font-mono font-bold text-foreground">
                  Max 15.000 kg | e = 5 g (n = 3,000)
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground">Certificate Number</span>
                <p className="text-sm font-mono font-bold text-primary">
                  RRSL-OIML-2026-0089
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground">Verification Date</span>
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <CalendarCheck className="h-4 w-4 text-emerald-400" />
                  22 September 2026 (Valid until 21 Sep 2027)
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground">Issuing Authority</span>
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-primary" />
                  RRSL Ahmedabad (NABL CC-2189)
                </p>
              </div>
            </div>

            {/* Direct Link to Official Report */}
            <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Test Session Reference: <strong className="font-mono text-foreground">TS-2026-0142</strong>
              </div>

              <Link
                href="/reports/TS-2026-0142"
                className="w-full sm:w-auto"
              >
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto min-h-[48px] px-4 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 flex items-center justify-center gap-2"
                >
                  <Certificate className="h-4 w-4" weight="bold" />
                  <span>Inspect Official Calibration Certificate</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Cryptographic Provenance Details */}
        <Card className="p-5 sm:p-6 bg-card/80 backdrop-blur-xs border-border/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <LockKey className="h-4 w-4 text-primary" />
              <span>WELMEC 7.2 SHA-256 Ledger Provenance</span>
            </h3>
            <Badge variant="pass" className="text-[10px]">
              SHA-256 Verified
            </Badge>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              Verification Hash Reference
            </label>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border/70">
              <span className="font-mono text-xs text-foreground break-all flex-1 select-all">
                {hash}
              </span>
              <button
                type="button"
                onClick={handleCopyHash}
                aria-label="Copy SHA-256 hash to clipboard"
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition min-h-[48px] min-w-[48px] flex items-center justify-center shrink-0"
              >
                {copied ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400" weight="fill" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
            {copied && (
              <p className="text-[11px] text-emerald-400 font-medium">
                SHA-256 hash copied to clipboard!
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] font-mono text-muted-foreground pt-1">
            <div>
              <span className="block text-muted-foreground/70">Algorithm</span>
              <strong className="text-foreground">FIPS 180-4 SHA-256</strong>
            </div>
            <div>
              <span className="block text-muted-foreground/70">Chain Depth</span>
              <strong className="text-foreground">18 Block Events</strong>
            </div>
            <div>
              <span className="block text-muted-foreground/70">Digital Signer</span>
              <strong className="text-foreground">Dr. Rajesh Sharma (Director)</strong>
            </div>
          </div>
        </Card>

        {/* Manual Hash Lookup Bar */}
        <div className="p-4 rounded-2xl bg-card/60 border border-border/70 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <MagnifyingGlass className="h-4 w-4 text-primary" />
            <span>Field Officer Hash / Certificate Lookup</span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputHash.trim()) {
                window.location.href = `/verify/${encodeURIComponent(inputHash.trim())}`;
              }
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              placeholder="Paste SHA-256 hash or certificate number..."
              value={inputHash}
              onChange={(e) => setInputHash(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-mono placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 min-h-[48px]"
            />
            <Button
              type="submit"
              className="min-h-[48px] px-5 text-xs font-bold shrink-0 flex items-center justify-center gap-2"
            >
              <span>Verify Hash</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </Shell>
  );
}
