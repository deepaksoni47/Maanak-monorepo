"use client";

import React from "react";
import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Scales, Plus, ArrowRight, Flask, CheckCircle } from "@phosphor-icons/react";

export interface InstrumentItem {
  id: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  accuracyClass: "CLASS_I" | "CLASS_II" | "CLASS_III" | "CLASS_IIII";
  maxCapacity: string;
  maxCapacityKg: number;
  verificationInterval: string;
  verificationIntervalKg: number;
  tacNumber: string;
  status: "VERIFIED" | "IN_PROGRESS" | "PENDING_VERIFICATION";
  lastVerified: string;
}

export const REGISTERED_INSTRUMENTS: InstrumentItem[] = [
  {
    id: "inst-001",
    serialNumber: "SN-2026-9042",
    model: "Essae DS-215 Precision Counter",
    manufacturer: "Essae-Teraoka Ltd.",
    accuracyClass: "CLASS_III",
    maxCapacity: "15.000 kg",
    maxCapacityKg: 15.0,
    verificationInterval: "5 g",
    verificationIntervalKg: 0.005,
    tacNumber: "IND/09/2026/042",
    status: "VERIFIED",
    lastVerified: "2026-09-21",
  },
  {
    id: "inst-002",
    serialNumber: "SN-2026-8819",
    model: "Mettler Toledo MS-TS Industrial",
    manufacturer: "Mettler Toledo India",
    accuracyClass: "CLASS_II",
    maxCapacity: "6.200 kg",
    maxCapacityKg: 6.2,
    verificationInterval: "0.1 g",
    verificationIntervalKg: 0.0001,
    tacNumber: "IND/04/2025/118",
    status: "IN_PROGRESS",
    lastVerified: "2026-09-22",
  },
  {
    id: "inst-003",
    serialNumber: "SN-2026-7734",
    model: "Avery Weigh-Tronix ZM305 Platform",
    manufacturer: "Avery India Ltd.",
    accuracyClass: "CLASS_III",
    maxCapacity: "30.000 kg",
    maxCapacityKg: 30.0,
    verificationInterval: "10 g",
    verificationIntervalKg: 0.01,
    tacNumber: "IND/11/2025/089",
    status: "PENDING_VERIFICATION",
    lastVerified: "2026-08-14",
  },
  {
    id: "inst-004",
    serialNumber: "SN-2026-6621",
    model: "Sartorius Cubis II Ultra-Micro",
    manufacturer: "Sartorius India",
    accuracyClass: "CLASS_I",
    maxCapacity: "220.000 g",
    maxCapacityKg: 0.22,
    verificationInterval: "0.1 mg",
    verificationIntervalKg: 0.0000001,
    tacNumber: "IND/01/2026/003",
    status: "VERIFIED",
    lastVerified: "2026-09-18",
  },
];

export function InstrumentsListView() {
  return (
    <Shell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Instrument Intake & Registry" },
      ]}
      pageTitle="NAWI Instrument Registry"
      pageSubtitle="Official directory of pattern-approved Non-Automatic Weighing Instruments in accordance with the Legal Metrology Act, 2009."
      headerActions={
        <Link href="/instruments/new">
          <Button
            leftIcon={<Plus size={16} weight="bold" />}
            className="font-bold min-h-[48px] px-5"
          >
            Intake New Instrument
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 rounded-3xl border border-border bg-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Scales size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Total Registered</div>
              <div className="text-xl font-bold font-mono text-foreground">4 Active Scales</div>
            </div>
          </Card>
          <Card className="p-4 rounded-3xl border border-border bg-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Verified &amp; Stamped</div>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                2 Compliant
              </div>
            </div>
          </Card>
          <Card className="p-4 rounded-3xl border border-border bg-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Flask size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Under Test Battery</div>
              <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                1 on Bench
              </div>
            </div>
          </Card>
        </div>

        {/* Instruments Table */}
        <Card className="rounded-3xl border border-border overflow-hidden shadow-xs">
          <CardHeader className="p-4 sm:p-5 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
            <div>
              <CardTitle className="text-base font-bold">Registered Legal Instruments</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Statutory NAWI units registered under State Controller of Legal Metrology. Click &quot;Test on Bench&quot; to load directly into the testing schedule.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/70 font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-3 px-4">Serial Number</th>
                    <th scope="col" className="py-3 px-4">Make &amp; Model</th>
                    <th scope="col" className="py-3 px-4">OIML Class</th>
                    <th scope="col" className="py-3 px-4">Max Capacity</th>
                    <th scope="col" className="py-3 px-4">Interval (e)</th>
                    <th scope="col" className="py-3 px-4">Pattern TAC</th>
                    <th scope="col" className="py-3 px-4 text-center">Status</th>
                    <th scope="col" className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {REGISTERED_INSTRUMENTS.map((item) => (
                    <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {item.serialNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{item.model}</div>
                        <div className="text-[11px] text-muted-foreground">{item.manufacturer}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {item.accuracyClass.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-foreground">
                        {item.maxCapacity}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        {item.verificationInterval}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                        {item.tacNumber}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={
                            item.status === "VERIFIED"
                              ? "pass"
                              : item.status === "IN_PROGRESS"
                              ? "in_progress"
                              : "pending"
                          }
                          showIcon={false}
                          className="text-[10px] font-mono py-0.5 px-2"
                        >
                          {item.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/bench?instrumentId=${item.id}`}>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 min-h-[36px] text-xs font-bold px-3"
                              leftIcon={<Flask size={13} weight="bold" />}
                            >
                              Test on Bench
                            </Button>
                          </Link>
                          <Link href="/reports/TS-2026-0142">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 min-h-[36px] text-xs font-semibold px-2 text-muted-foreground hover:text-foreground"
                              aria-label="View verification report"
                            >
                              <ArrowRight size={15} />
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
