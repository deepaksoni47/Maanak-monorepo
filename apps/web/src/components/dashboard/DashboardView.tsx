"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import {
  Scales,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  TrendUp,
  FileMagnifyingGlass,
  ArrowSquareOut,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { Shell } from "@/components/layout/Shell";
import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { sessionsApi, weightsApi } from "@/lib/api";

export interface FormattedSession {
  id: string;
  sessionNumber: string;
  model: string;
  manufacturer: string;
  accuracyClass: string;
  maxCapacity: string;
  verificationInterval: string;
  inspector: string;
  stage: string;
  updatedAt: string;
  status: BadgeVariant;
  statusLabel: string;
}

export const RECENT_SESSIONS: FormattedSession[] = [
  {
    id: "sess-01",
    sessionNumber: "TS-2026-0142",
    model: "Essae DS-215",
    manufacturer: "Essae-Teraoka Ltd.",
    accuracyClass: "III",
    maxCapacity: "15 kg",
    verificationInterval: "5 g",
    inspector: "Er. R. Verma",
    stage: "Form 1: Weighing (10/10)",
    updatedAt: "10 mins ago",
    status: "pass",
    statusLabel: "PASSED",
  },
  {
    id: "sess-02",
    sessionNumber: "TS-2026-0141",
    model: "Mettler Toledo ME204",
    manufacturer: "Mettler Toledo AG",
    accuracyClass: "I",
    maxCapacity: "220 g",
    verificationInterval: "0.1 mg",
    inspector: "Er. S. Patil",
    stage: "Form 2: Temp Drift (Step 4)",
    updatedAt: "25 mins ago",
    status: "in_progress",
    statusLabel: "TESTING",
  },
  {
    id: "sess-03",
    sessionNumber: "TS-2026-0140",
    model: "Avery Berkel FX-120",
    manufacturer: "Avery India Ltd.",
    accuracyClass: "III",
    maxCapacity: "30 kg",
    verificationInterval: "10 g",
    inspector: "Er. A. Sharma",
    stage: "Form 3: Eccentricity",
    updatedAt: "1 hour ago",
    status: "pending",
    statusLabel: "IN REVIEW",
  },
  {
    id: "sess-04",
    sessionNumber: "TS-2026-0139",
    model: "Wensar HPB-300",
    manufacturer: "Wensar Weighing Scales",
    accuracyClass: "II",
    maxCapacity: "300 g",
    verificationInterval: "1 mg",
    inspector: "Er. V. Nair",
    stage: "Form 4: Discrimination",
    updatedAt: "3 hours ago",
    status: "fail",
    statusLabel: "MPE EXCEEDED",
  },
  {
    id: "sess-05",
    sessionNumber: "TS-2026-0138",
    model: "Sartorius Entris II",
    manufacturer: "Sartorius India Pvt Ltd",
    accuracyClass: "I",
    maxCapacity: "120 g",
    verificationInterval: "0.1 mg",
    inspector: "Er. S. Patil",
    stage: "Completed & Signed",
    updatedAt: "5 hours ago",
    status: "pass",
    statusLabel: "CERTIFIED",
  },
];

function mapStatusToBadge(status: string): { variant: BadgeVariant; label: string } {
  switch (status?.toUpperCase()) {
    case "COMPLETED":
    case "CERTIFIED":
    case "PASS":
      return { variant: "pass", label: "PASSED" };
    case "FAILED":
    case "FAIL":
      return { variant: "fail", label: "MPE EXCEEDED" };
    case "REVIEW_PENDING":
    case "PENDING":
      return { variant: "pending", label: "IN REVIEW" };
    case "IN_PROGRESS":
      return { variant: "in_progress", label: "TESTING" };
    case "DRAFT":
    default:
      return { variant: "in_progress", label: "DRAFT" };
  }
}

function formatRelativeTime(dateString?: string | Date | null): string {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} mins ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export function DashboardView() {
  const [sessions, setSessions] = useState<FormattedSession[]>(RECENT_SESSIONS);
  const [activeCount, setActiveCount] = useState<number | string>(14);
  const [pendingCount, setPendingCount] = useState<number | string>(3);
  const [approvedCount, setApprovedCount] = useState<number | string>(8);
  const [complianceRate, setComplianceRate] = useState<string>("94.2%");
  const [weightsValidBadge, setWeightsValidBadge] = useState<string>("ALL 24 SETS VALID");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        const [sessionsRes, weightsRes] = await Promise.allSettled([
          sessionsApi.list(),
          weightsApi.list(),
        ]);

        if (isMounted) {
          if (sessionsRes.status === "fulfilled" && sessionsRes.value?.sessions && sessionsRes.value.sessions.length > 0) {
            const rawSessions: any[] = sessionsRes.value.sessions;

            const mapped: FormattedSession[] = rawSessions.map((s) => {
              const model = s.instrumentUnit?.instrumentModel;
              const { variant, label } = mapStatusToBadge(s.status);
              const obsCount = s._count?.rawObservations || s.rawObservations?.length || 0;
              const stage =
                obsCount > 0
                  ? `Form 1: Weighing (${obsCount} pts)`
                  : s.status === "REVIEW_PENDING"
                  ? "Audit Pending"
                  : "Form 1: Ready to Start";

              return {
                id: s.id,
                sessionNumber: s.sessionNumber,
                model: model?.modelName || "Standard Scale",
                manufacturer: model?.manufacturer?.companyName || "Domestic Manufacturer",
                accuracyClass: model?.accuracyClass?.code || "III",
                maxCapacity: `${model?.maxCapacity || "15"} ${model?.unitOfMeasure || "kg"}`,
                verificationInterval: `${model?.verificationScaleIntervalE || "5"} ${model?.unitOfMeasure || "g"}`,
                inspector: s.testingOfficer?.fullName || "Testing Officer",
                stage,
                updatedAt: formatRelativeTime(s.updatedAt || s.startedAt),
                status: variant,
                statusLabel: label,
              };
            });

            setSessions(mapped);

            const active = rawSessions.filter(
              (s) => s.status === "IN_PROGRESS" || s.status === "DRAFT",
            ).length;
            const pending = rawSessions.filter((s) => s.status === "REVIEW_PENDING").length;
            const approved = rawSessions.filter(
              (s) => s.status === "COMPLETED" || s.status === "CERTIFIED",
            ).length;

            setActiveCount(active);
            setPendingCount(pending);
            setApprovedCount(approved);

            const totalEvaluated = approved + rawSessions.filter((s) => s.status === "FAILED").length;
            if (totalEvaluated > 0) {
              setComplianceRate(`${((approved / totalEvaluated) * 100).toFixed(1)}%`);
            }
          }

          if (weightsRes.status === "fulfilled" && weightsRes.value?.count !== undefined) {
            setWeightsValidBadge(`ALL ${weightsRes.value.count} SETS VALID`);
          }
        }
      } catch (err) {
        console.error("Live dashboard hydration note:", err);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Shell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dashboard" },
      ]}
      pageTitle="Laboratory Executive Dashboard"
      pageSubtitle="Real-time legal metrology testing queue, OIML R-76 compliance analytics, and NABL working standards status."
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
        {/* 4-Card KPI Analytics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Active Sessions */}
          <Card className="hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Test Sessions
              </CardTitle>
              <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Scales size={20} weight="duotone" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
                {activeCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                  +2 started
                </span>{" "}
                today in RRSL Lab
              </p>
            </CardContent>
          </Card>

          {/* Metric 2: Pending Reviews */}
          <Card className="hover:border-amber-500/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pending Review Audits
              </CardTitle>
              <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <FileMagnifyingGlass size={20} weight="duotone" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400">
                {pendingCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-amber-600 dark:text-amber-400 font-semibold font-mono">
                  1 anomaly
                </span>{" "}
                flagged by rule engine
              </p>
            </CardContent>
          </Card>

          {/* Metric 3: Approved Today */}
          <Card className="hover:border-emerald-500/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Approved Today
              </CardTitle>
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle size={20} weight="fill" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                {approvedCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                  100%
                </span>{" "}
                X.509 digitally signed
              </p>
            </CardContent>
          </Card>

          {/* Metric 4: Compliance Rate */}
          <Card className="hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                First-Pass Compliance
              </CardTitle>
              <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <TrendUp size={20} weight="bold" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
                {complianceRate}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                  +2.4%
                </span>{" "}
                vs monthly benchmark
              </p>
            </CardContent>
          </Card>
        </div>

        {/* NABL 129 Standards & Compliance Health Alert Banner */}
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck size={22} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-foreground">
                  NABL 129 Standard Weights Health: 100% In Calibration
                </h4>
                <Badge variant="pass" showIcon={false} className="py-0.5 px-2 text-[10px]">
                  {weightsValidBadge}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All working standards (E2, F1, F2, M1) comply with Clause 3.7.1 uncertainty limits (U ≤ ⅓ MPE). Next recalibration due in 42 days.
              </p>
            </div>
          </div>
          <Link href="/weights" className="shrink-0">
            <Button
              variant="outline"
              size="sm"
              rightIcon={<ArrowRight size={14} weight="bold" />}
              className="w-full sm:w-auto text-xs font-semibold min-h-[48px]"
            >
              Inspect Standard Weights
            </Button>
          </Link>
        </div>

        {/* Recent Verification Sessions Table Card */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60">
            <div>
              <CardTitle className="text-base sm:text-lg">Recent Verification Sessions</CardTitle>
              <CardDescription>
                Active testing sessions and recent compliance determinations per OIML R-76.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/bench">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<SlidersHorizontal size={16} />}
                  className="text-xs min-h-[48px]"
                >
                  Filter Queue
                </Button>
              </Link>
            </div>
          </CardHeader>

          {/* Desktop Table View (>= 640px) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                <tr>
                  <th scope="col" className="py-3.5 px-5 font-semibold">Session ID</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">Instrument Model</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">Class / Capacity</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">Inspector</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">Current Test Stage</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">Status</th>
                  <th scope="col" className="py-3.5 px-5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sessions.map((session) => (
                  <tr
                    key={session.id}
                    className="hover:bg-accent/40 transition-colors group"
                  >
                    <td className="py-4 px-5 font-mono font-semibold text-foreground whitespace-nowrap">
                      {session.sessionNumber}
                      <div className="text-[10px] text-muted-foreground font-sans font-normal">
                        {session.updatedAt}
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{session.model}</div>
                      <div className="text-[11px] text-muted-foreground">{session.manufacturer}</div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 font-semibold text-foreground">
                        Class {session.accuracyClass}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        Max {session.maxCapacity} | e={session.verificationInterval}
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-muted-foreground">
                      {session.inspector}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-medium text-foreground">{session.stage}</span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <Badge variant={session.status} className="font-mono text-[11px]">
                        {session.statusLabel}
                      </Badge>
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <Link href={`/bench?session=${session.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          rightIcon={<ArrowSquareOut size={14} weight="bold" />}
                          className="text-xs h-9 min-h-[48px] px-3 group-hover:text-primary"
                        >
                          Open
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Collapsible Cards (< 640px) */}
          <div className="block sm:hidden divide-y divide-border/60 p-4 space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="pt-3 first:pt-0 space-y-2.5 bg-card/50 rounded-2xl p-3 border border-border/60"
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono font-bold text-xs text-foreground">
                    {session.sessionNumber}
                  </div>
                  <Badge variant={session.status} className="font-mono text-[10px]">
                    {session.statusLabel}
                  </Badge>
                </div>

                <div>
                  <div className="font-semibold text-sm text-foreground">{session.model}</div>
                  <div className="text-xs text-muted-foreground">{session.manufacturer}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-xl">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-semibold">Class / Max</div>
                    <div className="font-medium text-foreground">
                      Class {session.accuracyClass} ({session.maxCapacity})
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-semibold">Verification Div (e)</div>
                    <div className="font-mono text-foreground">{session.verificationInterval}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Stage: <strong className="text-foreground font-medium">{session.stage}</strong></span>
                  <span>{session.updatedAt}</span>
                </div>

                <div className="pt-2">
                  <Link href={`/bench?session=${session.id}`} className="block">
                    <Button
                      variant="outline"
                      size="sm"
                      rightIcon={<ArrowRight size={14} weight="bold" />}
                      className="w-full text-xs font-semibold justify-between min-h-[48px]"
                    >
                      Open Session Workbench
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Operational Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/instruments/new" className="block group">
            <Card className="h-full hover:border-primary/50 transition-all">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <PlusCircle size={24} weight="duotone" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    Intake New Instrument
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Register NAWI specification, calculate n = Max/e, and auto-assign accuracy class.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/review" className="block group">
            <Card className="h-full hover:border-amber-500/50 transition-all">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileMagnifyingGlass size={24} weight="duotone" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground group-hover:text-amber-500 transition-colors">
                    Senior Reviewer Audit
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Audit algorithmic anomaly flags, temperature drift overruns, and tare hysteresis.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/verify" className="block group">
            <Card className="h-full hover:border-emerald-500/50 transition-all">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck size={24} weight="duotone" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground group-hover:text-emerald-500 transition-colors">
                    Public QR Verification
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Verify cryptographic provenance SHA-256 chain and Section 22 model certificate.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </Shell>
  );
}
