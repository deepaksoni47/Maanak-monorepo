import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FileText, QrCode, ShieldCheck, DownloadSimple, ArrowRight, CheckCircle, Certificate } from "@phosphor-icons/react";

export const metadata: Metadata = {
  title: "Statutory Test Reports & Certificates | MAANAK",
  description:
    "Official directory of OIML R 76-2 verification certificates, digital X.509 signatures, and tamper-evident audit reports.",
};

interface ReportItem {
  id: string;
  reportNumber: string;
  sessionId: string;
  instrumentModel: string;
  serialNumber: string;
  accuracyClass: string;
  issuedAt: string;
  directorSigned: boolean;
  complianceOutcome: "PASS" | "FAIL";
  sha256Hash: string;
}

const REPORTS_DATA: ReportItem[] = [
  {
    id: "TS-2026-0142",
    reportNumber: "CERT-2026-0142",
    sessionId: "TS-2026-0142",
    instrumentModel: "Essae DS-215 Precision Counter",
    serialNumber: "SN-2026-9042",
    accuracyClass: "Class III",
    issuedAt: "2026-09-22",
    directorSigned: true,
    complianceOutcome: "PASS",
    sha256Hash: "0x8fa37b12d94e7732a10b8cf6347209...",
  },
  {
    id: "TS-2026-0140",
    reportNumber: "CERT-2026-0140",
    sessionId: "TS-2026-0140",
    instrumentModel: "Mettler Toledo Industrial Platform",
    serialNumber: "SN-2026-8819",
    accuracyClass: "Class II",
    issuedAt: "2026-09-20",
    directorSigned: true,
    complianceOutcome: "PASS",
    sha256Hash: "0x7bb024f9e115cc7203b876a4550183...",
  },
  {
    id: "TS-2026-0089",
    reportNumber: "CERT-2026-0089",
    sessionId: "TS-2026-0089",
    instrumentModel: "Avery Weigh-Tronix Heavy Scale",
    serialNumber: "SN-2026-7734",
    accuracyClass: "Class III",
    issuedAt: "2026-09-15",
    directorSigned: false,
    complianceOutcome: "FAIL",
    sha256Hash: "0x33e8a1d7f023ab9154ec4718902891...",
  },
];

export default function ReportsIndexPage() {
  return (
    <Shell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Test Reports & Certificates" },
      ]}
      pageTitle="OIML R 76-2 Test Reports & Certificates"
      pageSubtitle="Authenticated Legal Metrology verification certificates bearing official X.509 PKI signatures and WELMEC 7.2 cryptographic tamper-evidence."
    >
      <div className="space-y-6">
        {/* KPI Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 rounded-3xl border border-border bg-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Certificate size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Certificates Issued</div>
              <div className="text-xl font-bold font-mono text-foreground">3 Official Records</div>
            </div>
          </Card>
          <Card className="p-4 rounded-3xl border border-border bg-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">PKI Signed by Director</div>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                2 Sealed
              </div>
            </div>
          </Card>
          <Card className="p-4 rounded-3xl border border-border bg-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <QrCode size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Public Verifiable QR</div>
              <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
                100% Traceable
              </div>
            </div>
          </Card>
        </div>

        {/* Certificates Table */}
        <Card className="rounded-3xl border border-border overflow-hidden shadow-xs">
          <CardHeader className="p-4 sm:p-5 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
            <div>
              <CardTitle className="text-base font-bold">Issued Verification Certificates</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Statutory test certificates compliant with OIML R 76-2 Section 7.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/70 font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-3 px-4">Certificate #</th>
                    <th scope="col" className="py-3 px-4">Instrument / Serial</th>
                    <th scope="col" className="py-3 px-4">Class</th>
                    <th scope="col" className="py-3 px-4">Date Issued</th>
                    <th scope="col" className="py-3 px-4">Director X.509 PKI</th>
                    <th scope="col" className="py-3 px-4 text-center">Compliance</th>
                    <th scope="col" className="py-3 px-4 text-right">View / Verify</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {REPORTS_DATA.map((item) => (
                    <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {item.reportNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{item.instrumentModel}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{item.serialNumber}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {item.accuracyClass}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        {item.issuedAt}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.directorSigned ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                            <ShieldCheck size={16} weight="fill" />
                            <span>Digitally Signed</span>
                          </div>
                        ) : (
                          <div className="text-amber-600 dark:text-amber-400 text-[11px] font-medium">
                            Pending Review
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={item.complianceOutcome === "PASS" ? "pass" : "fail"}
                          showIcon={false}
                          className="text-[10px] font-mono py-0.5 px-2 font-bold"
                        >
                          {item.complianceOutcome}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/verify/${item.sha256Hash.slice(2, 18)}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 min-h-[36px] text-xs font-semibold px-2.5"
                              leftIcon={<QrCode size={14} />}
                              title="Public QR Verification"
                            >
                              QR
                            </Button>
                          </Link>
                          <Link href={`/reports/${item.id}`}>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 min-h-[36px] text-xs font-semibold px-3"
                              rightIcon={<ArrowRight size={14} weight="bold" />}
                            >
                              Certificate
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
