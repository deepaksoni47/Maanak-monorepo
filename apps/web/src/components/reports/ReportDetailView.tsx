"use client";

import React, { useState } from "react";
import {
  FilePdf,
  FileDoc,
  Certificate,
  ShieldCheck,
  CheckCircle,
  QrCode,
  Key,
  Scales,
  ArrowsClockwise,
  User,
  CalendarCheck,
  Hash,
  DownloadSimple,
} from "@phosphor-icons/react";
import { Shell } from "@/components/layout/Shell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { VectorErrorCurve } from "@/components/reports/VectorErrorCurve";
import {
  SigningPinModal,
  type DigitalSignatureData,
} from "@/components/reports/SigningPinModal";

export interface ReportDetailViewProps {
  id?: string;
}

const FORMS_SUMMARY = [
  {
    form: "Form 1",
    title: "Weighing Performance & Hysteresis",
    rule: "Clause A.4.4",
    result: "Max error +1.15e @ 15 kg",
    limit: "±1.50e",
    status: "pass" as const,
  },
  {
    form: "Form 2",
    title: "Temperature Drift on Zero",
    rule: "Clause A.4.1",
    result: "0.22e / 5°C drift rate",
    limit: "≤ 0.50e / 5°C",
    status: "pass" as const,
  },
  {
    form: "Form 3",
    title: "Eccentric Loading (Corner Test)",
    rule: "Clause 3.6.2",
    result: "Max corner variance 0.65e",
    limit: "≤ 1.00e",
    status: "pass" as const,
  },
  {
    form: "Form 4",
    title: "Discrimination (1.4d Test)",
    rule: "Clause 3.8",
    result: "Extra 1.4d produces +1d indication",
    limit: "≥ 1d step",
    status: "pass" as const,
  },
  {
    form: "Form 5",
    title: "Repeatability (10-Run Spread)",
    rule: "Clause 3.6.1",
    result: "Spread = 0.40e across 10 cycles",
    limit: "≤ 1.00e",
    status: "pass" as const,
  },
  {
    form: "Form 6",
    title: "30-Min Creep & Zero Return",
    rule: "Clause A.4.11",
    result: "Creep = 0.25e; Return = 0.10e",
    limit: "≤ 0.50e",
    status: "pass" as const,
  },
];

export function ReportDetailView({ id = "TS-2026-0142" }: ReportDetailViewProps) {
  const [signature, setSignature] = useState<DigitalSignatureData | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const handleOpenPinModal = () => {
    setIsPinModalOpen(true);
  };

  const handleSignSuccess = (sigData: DigitalSignatureData) => {
    setSignature(sigData);
    triggerDownload("PDF");
  };

  const triggerDownload = (format: "PDF" | "DOCX") => {
    const filename = `OIML-R76-2-Report-${id}.${format.toLowerCase()}`;
    setDownloadNotice(`Generated and downloaded ${filename} successfully.`);

    // Trigger synthetic browser download
    if (typeof window !== "undefined") {
      const dummyContent = `MAANAK OIML R-76 Official Report #${id}\nSignatory: ${
        signature?.signedBy || "Director (Legal Metrology)"
      }\nDate: ${new Date().toISOString()}`;
      const blob = new Blob([dummyContent], {
        type: format === "PDF" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Test Reports", href: "/reports" },
    { label: id, href: `/reports/${id}` },
  ];

  return (
    <Shell breadcrumbs={breadcrumbs}>
      <div className="space-y-6 pb-16">
        {/* Top Header & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <Certificate className="h-8 w-8 text-primary" weight="duotone" />
                OIML R 76-2 Test Certificate
              </h1>
              <Badge
                variant={signature ? "pass" : "pending"}
                className="font-mono text-xs uppercase"
              >
                {signature
                  ? "DIGITALLY SIGNED & SEALED (X.509)"
                  : "PENDING DIRECTOR SIGNATURE"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Certificate # RRSL-OIML-2026-0089 | Test Session #{id}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!signature ? (
              <Button
                type="button"
                onClick={handleOpenPinModal}
                className="min-h-[48px] px-5 text-sm font-bold flex items-center gap-2 shadow-sm"
                data-testid="sign-report-btn"
              >
                <Key className="h-5 w-5" weight="bold" />
                <span>Sign &amp; Seal Report (X.509 PKI)</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => triggerDownload("PDF")}
                  className="min-h-[48px] px-4 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 flex items-center gap-2"
                >
                  <FilePdf className="h-5 w-5" weight="duotone" />
                  <span>Download Signed PDF</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => triggerDownload("DOCX")}
                  className="min-h-[48px] px-4 text-xs font-bold border-border/80 hover:bg-muted/60 flex items-center gap-2"
                >
                  <FileDoc className="h-5 w-5" weight="duotone" />
                  <span>Download Word (.docx)</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Global Download Feedback Banner */}
        {downloadNotice && (
          <div
            role="status"
            className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center justify-between gap-3 text-sm animate-in fade-in"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" weight="fill" />
              <span>{downloadNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setDownloadNotice(null)}
              className="text-xs font-semibold underline hover:opacity-80 min-h-[32px] px-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Official Certificate Card Preview */}
        <Card className="p-6 sm:p-8 bg-card/80 backdrop-blur-xs border-border/80 shadow-md space-y-6">
          {/* Institutional Header Strip */}
          <div className="border-b border-border/70 pb-6 text-center space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Government of India • Ministry of Consumer Affairs, Food &amp; Public Distribution
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Regional Reference Standard Laboratory (RRSL), Ahmedabad
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-muted-foreground pt-1">
              <span>NABL ISO/IEC 17025 Accr. # CC-2189</span>
              <span>•</span>
              <span>OIML Issuing Authority: OIML-IA-IN-01</span>
              <span>•</span>
              <span>Issued: 22 September 2026</span>
            </div>
          </div>

          {/* NAWI Instrument Technical Specifications */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Scales className="h-4 w-4 text-primary" />
              <span>Instrument Verification Specifications</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-muted/30 border border-border/60 text-xs">
              <div>
                <span className="text-muted-foreground block">Instrument Model</span>
                <strong className="text-foreground text-sm font-semibold">Essae DS-215</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">Serial Number</span>
                <strong className="text-foreground font-mono">SN-2026-ES-00984</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">Accuracy Class</span>
                <strong className="text-foreground font-semibold">Class III (Medium)</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">Max Capacity (Max)</span>
                <strong className="text-foreground font-mono">15.000 kg</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">Scale Interval (e)</span>
                <strong className="text-foreground font-mono">5 g (0.005 kg)</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">Scale Interval (d)</span>
                <strong className="text-foreground font-mono">5 g (0.005 kg)</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">Minimum Capacity (Min)</span>
                <strong className="text-foreground font-mono">100 g (20e)</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">Verification Scale Steps (n)</span>
                <strong className="text-foreground font-mono">3,000 divisions</strong>
              </div>
            </div>
          </div>

          {/* Multi-Form Test Summary Table (Forms 1–6) */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              <span>OIML R-76 Annex A Verification Test Battery Summary</span>
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-border/70">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border/70">
                  <tr>
                    <th className="p-3">Test Form</th>
                    <th className="p-3">Examination Scope</th>
                    <th className="p-3">Clause</th>
                    <th className="p-3 font-mono">Measured Result</th>
                    <th className="p-3 font-mono">OIML Limit</th>
                    <th className="p-3 text-right">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {FORMS_SUMMARY.map((row) => (
                    <tr key={row.form} className="hover:bg-muted/20 transition">
                      <td className="p-3 font-bold text-foreground font-mono">{row.form}</td>
                      <td className="p-3 font-medium text-foreground">{row.title}</td>
                      <td className="p-3 font-mono text-muted-foreground text-[11px]">{row.rule}</td>
                      <td className="p-3 font-mono text-foreground">{row.result}</td>
                      <td className="p-3 font-mono text-muted-foreground">{row.limit}</td>
                      <td className="p-3 text-right">
                        <Badge variant="pass" className="text-[10px] py-0 px-2 uppercase font-bold">
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Embedded Vector Error Curve */}
          <div className="space-y-3">
            <VectorErrorCurve maxCapacity={15} />
          </div>

          {/* Cryptographic Provenance Block (WELMEC 7.2) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" weight="duotone" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  WELMEC 7.2 Software Guide Tamper-Evident Provenance Seal
                </h4>
              </div>
              <Badge variant="pass" className="text-[10px] font-mono">
                SQL Tamper Seal: VERIFIED
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-background/60 border border-border/60">
                <span className="text-[11px] text-muted-foreground block">Genesis Node Hash</span>
                <span className="text-[10px] text-foreground break-all">
                  4a58b8f72a91283d5a84e2098d63a89047bf1b2c45e6d78a9c1e0f3b4a58b8f7
                </span>
              </div>
              <div className="p-3 rounded-xl bg-background/60 border border-border/60">
                <span className="text-[11px] text-muted-foreground block">Merkle Chain Root (SHA-256)</span>
                <span className="text-[10px] text-primary break-all font-bold">
                  e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                </span>
              </div>
              <div className="p-3 rounded-xl bg-background/60 border border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Block Depth</span>
                  <span className="text-sm font-bold text-foreground">18 Linked Nodes</span>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <QrCode className="h-7 w-7" />
                </div>
              </div>
            </div>
          </div>

          {/* Director X.509 PKI Signing Stamp */}
          <div className="pt-2 border-t border-border/70">
            {signature ? (
              <div
                className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in"
                data-testid="sealed-signature-block"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                    <Certificate className="h-7 w-7" weight="duotone" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">
                        Digitally Signed &amp; Sealed by {signature.signedBy}
                      </h4>
                      <Badge variant="pass" className="text-[10px]">
                        X.509 Verified
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {signature.signatoryTitle}
                    </p>
                    <div className="text-[11px] font-mono text-muted-foreground mt-1">
                      Issuer: {signature.issuer} • Algorithm: {signature.algorithm}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400/90 mt-0.5">
                      Timestamp: {signature.timestampUtc} • Cert Serial: {signature.serialNumber}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    onClick={() => triggerDownload("PDF")}
                    className="min-h-[48px] px-4 text-xs font-bold flex items-center gap-2"
                  >
                    <DownloadSimple className="h-4 w-4" weight="bold" />
                    <span>Download Signed PDF</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Key className="h-5 w-5 text-amber-500" weight="fill" />
                    <span>Director Legal Metrology Signature Required</span>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This OIML R 76-2 calibration certificate is pending final X.509 PKI cryptographic sealing.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleOpenPinModal}
                  className="min-h-[48px] px-5 text-xs font-bold shrink-0 w-full sm:w-auto"
                >
                  <Key className="h-4 w-4 mr-1.5" weight="bold" />
                  <span>Authorize &amp; Sign Report</span>
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Director Signing PIN Modal */}
      <SigningPinModal
        isOpen={isPinModalOpen}
        reportId={id}
        onClose={() => setIsPinModalOpen(false)}
        onSignSuccess={handleSignSuccess}
      />
    </Shell>
  );
}
