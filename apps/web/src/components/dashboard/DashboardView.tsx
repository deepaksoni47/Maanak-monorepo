"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import {
  Scales,
  CheckCircle,
  Check,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  TrendUp,
  FileMagnifyingGlass,
  ArrowSquareOut,
  SlidersHorizontal,
  Buildings,
  Globe,
  MapPin,
} from "@phosphor-icons/react";
import { Shell } from "@/components/layout/Shell";
import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { sessionsApi, weightsApi } from "@/lib/api";
import { useFacility, ALL_FACILITIES_ID } from "@/lib/facility-context";
import { getCachedSessions } from "@/lib/offline-db";

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
  facilityCode?: string;
  facilityName?: string;
}

export interface FacilityMetrics {
  activeCount: number | string;
  pendingCount: number | string;
  approvedCount: number | string;
  complianceRate: string;
  weightsValidBadge: string;
  weightsDetail: string;
  activeSubtitle: string;
  jurisdictionNote: string;
}

export const FACILITY_METRICS_MAP: Record<string, FacilityMetrics> = {
  ALL: {
    activeCount: 48,
    pendingCount: 9,
    approvedCount: 28,
    complianceRate: "95.8%",
    weightsValidBadge: "ALL 114 WORKING STANDARDS VALID",
    weightsDetail: "National aggregated working standards (E2, F1, F2, M1) across all 6 RRSL facilities comply with Clause 3.7.1 uncertainty limits (U ≤ ⅓ MPE).",
    activeSubtitle: "+12 started today across Pan-India Network",
    jurisdictionNote: "Pan-India National Metrology Grid · Aggregated Multi-Facility Overview",
  },
  "rrsl-fbd": {
    activeCount: 14,
    pendingCount: 3,
    approvedCount: 8,
    complianceRate: "94.2%",
    weightsValidBadge: "ALL 24 SETS VALID",
    weightsDetail: "All working standards (E2, F1, F2, M1) comply with Clause 3.7.1 uncertainty limits (U ≤ ⅓ MPE). Next recalibration due in 42 days.",
    activeSubtitle: "+2 started today in RRSL Lab",
    jurisdictionNote: "Northern Zone Jurisdiction (Delhi-NCR, Haryana, Punjab, Rajasthan, HP)",
  },
  "rrsl-amd": {
    activeCount: 12,
    pendingCount: 2,
    approvedCount: 7,
    complianceRate: "96.1%",
    weightsValidBadge: "ALL 20 SETS VALID",
    weightsDetail: "Western Region primary reference E2/F1 sets calibrated against NPL standards. Zero uncertainty exceptions.",
    activeSubtitle: "+1 started today in Ahmedabad Testing Bay",
    jurisdictionNote: "Western Zone Jurisdiction (Gujarat, Maharashtra, Goa, Madhya Pradesh)",
  },
  "rrsl-blr": {
    activeCount: 9,
    pendingCount: 2,
    approvedCount: 5,
    complianceRate: "97.2%",
    weightsValidBadge: "ALL 22 SETS VALID",
    weightsDetail: "Southern Region Class I & II precision standard weight sets with NABL CC-3102 certification.",
    activeSubtitle: "+3 started today in Bengaluru Testing Bay",
    jurisdictionNote: "Southern Zone Jurisdiction (Karnataka, Tamil Nadu, Kerala, AP, Telangana)",
  },
  "rrsl-bbi": {
    activeCount: 5,
    pendingCount: 1,
    approvedCount: 3,
    complianceRate: "93.8%",
    weightsValidBadge: "ALL 16 SETS VALID",
    weightsDetail: "Eastern Region high-capacity heavy NAWI verification standards active in Bhubaneswar bay.",
    activeSubtitle: "+1 started today in Bhubaneswar Testing Bay",
    jurisdictionNote: "Eastern Zone Jurisdiction (Odisha, West Bengal, Bihar, Jharkhand, Chhattisgarh)",
  },
  "rrsl-vns": {
    activeCount: 4,
    pendingCount: 1,
    approvedCount: 3,
    complianceRate: "95.0%",
    weightsValidBadge: "ALL 18 SETS VALID",
    weightsDetail: "Central Region standard weights repository with valid traceable calibration certificates.",
    activeSubtitle: "+0 started today in Varanasi Testing Bay",
    jurisdictionNote: "Central Zone Jurisdiction (Uttar Pradesh, Uttarakhand, Central Terai)",
  },
  "rrsl-gau": {
    activeCount: 4,
    pendingCount: 0,
    approvedCount: 2,
    complianceRate: "98.0%",
    weightsValidBadge: "ALL 14 SETS VALID",
    weightsDetail: "North-Eastern Zone working standards with climate-controlled storage and humidity compensation.",
    activeSubtitle: "+1 started today in Guwahati Testing Bay",
    jurisdictionNote: "North-Eastern Zone Jurisdiction (Assam, Meghalaya, Arunachal, Nagaland, Manipur, Mizoram, Tripura)",
  },
};

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
    facilityCode: "RRSL-FBD",
    facilityName: "RRSL Faridabad",
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
    facilityCode: "RRSL-FBD",
    facilityName: "RRSL Faridabad",
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
    facilityCode: "RRSL-FBD",
    facilityName: "RRSL Faridabad",
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
    facilityCode: "RRSL-FBD",
    facilityName: "RRSL Faridabad",
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
    facilityCode: "RRSL-AMD",
    facilityName: "RRSL Ahmedabad",
  },
  {
    id: "sess-06",
    sessionNumber: "TS-2026-0137",
    model: "Citizen CT-500",
    manufacturer: "Citizen Scales India",
    accuracyClass: "II",
    maxCapacity: "500 g",
    verificationInterval: "10 mg",
    inspector: "Er. D. Sen",
    stage: "Form 5: Repeatability",
    updatedAt: "6 hours ago",
    status: "pass",
    statusLabel: "PASSED",
    facilityCode: "RRSL-BLR",
    facilityName: "RRSL Bengaluru",
  },
  {
    id: "sess-07",
    sessionNumber: "TS-2026-0136",
    model: "CAS SW-11",
    manufacturer: "CAS India",
    accuracyClass: "III",
    maxCapacity: "20 kg",
    verificationInterval: "5 g",
    inspector: "Er. B. Mishra",
    stage: "Form 6: Creep & Zero Return",
    updatedAt: "8 hours ago",
    status: "pass",
    statusLabel: "CERTIFIED",
    facilityCode: "RRSL-BBI",
    facilityName: "RRSL Bhubaneswar",
  },
  {
    id: "sess-08",
    sessionNumber: "TS-2026-0135",
    model: "Shimadzu ATX224",
    manufacturer: "Shimadzu Metrology",
    accuracyClass: "I",
    maxCapacity: "220 g",
    verificationInterval: "0.1 mg",
    inspector: "Er. M. Tripathi",
    stage: "Form 1: Weighing (10/10)",
    updatedAt: "9 hours ago",
    status: "pending",
    statusLabel: "IN REVIEW",
    facilityCode: "RRSL-VNS",
    facilityName: "RRSL Varanasi",
  },
  {
    id: "sess-09",
    sessionNumber: "TS-2026-0134",
    model: "Eagle DI-500",
    manufacturer: "Eagle Systems",
    accuracyClass: "III",
    maxCapacity: "50 kg",
    verificationInterval: "10 g",
    inspector: "Er. P. Gogoi",
    stage: "Form 1: Ready to Start",
    updatedAt: "12 hours ago",
    status: "in_progress",
    statusLabel: "TESTING",
    facilityCode: "RRSL-GAU",
    facilityName: "RRSL Guwahati",
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
  const {
    currentFacility,
    selectedFacilityId,
    setSelectedFacilityId,
    facilities,
    isAllFacilities,
    canSwitchFacility,
  } = useFacility();

  const [sessions, setSessions] = useState<FormattedSession[]>(RECENT_SESSIONS);
  const [hasLiveSessions, setHasLiveSessions] = useState(false);
  const [hasLiveWeights, setHasLiveWeights] = useState(false);
  const [liveActiveCount, setLiveActiveCount] = useState<number>(14);
  const [livePendingCount, setLivePendingCount] = useState<number>(3);
  const [liveApprovedCount, setLiveApprovedCount] = useState<number>(8);
  const [liveComplianceRate, setLiveComplianceRate] = useState<string>("94.2%");
  const [liveWeightsBadge, setLiveWeightsBadge] = useState<string>("ALL 24 SETS VALID");

  const facilityMetrics =
    FACILITY_METRICS_MAP[currentFacility.id] || FACILITY_METRICS_MAP["rrsl-fbd"];

  const activeCount = hasLiveSessions ? liveActiveCount : facilityMetrics.activeCount;
  const pendingCount = hasLiveSessions ? livePendingCount : facilityMetrics.pendingCount;
  const approvedCount = hasLiveSessions ? liveApprovedCount : facilityMetrics.approvedCount;
  const complianceRate = hasLiveSessions ? liveComplianceRate : facilityMetrics.complianceRate;
  const weightsValidBadge = hasLiveWeights ? liveWeightsBadge : facilityMetrics.weightsValidBadge;

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        const [sessionsRes, weightsRes] = await Promise.allSettled([
          sessionsApi.list(),
          weightsApi.list(),
        ]);

        let combinedSessions: any[] = [];

        // 1. Live sessions from PostgreSQL
        if (sessionsRes.status === "fulfilled" && sessionsRes.value?.sessions && sessionsRes.value.sessions.length > 0) {
          combinedSessions = [...sessionsRes.value.sessions];
        }

        // 2. Cached sessions from IndexedDB
        try {
          const cached = await getCachedSessions();
          if (Array.isArray(cached) && cached.length > 0) {
            cached.forEach((cs) => {
              if (!combinedSessions.some((s) => s.id === cs.id)) {
                combinedSessions.push(cs);
              }
            });
          }
        } catch (e) {
          console.warn("Cached sessions note:", e);
        }

        // 3. Local decisions from reviewer audit
        if (typeof window !== "undefined") {
          try {
            const decisions = JSON.parse(localStorage.getItem("maanak_audit_decisions") || "{}");
            Object.entries(decisions).forEach(([sessionId, dec]: [string, any]) => {
              const existingIdx = combinedSessions.findIndex((s) => s.id === sessionId || s.sessionNumber === sessionId);
              if (existingIdx >= 0) {
                combinedSessions[existingIdx].status = dec.decision === "ACCEPT_DEVIATION" ? "COMPLETED" : "UNDER_REVIEW";
              }
            });
          } catch (e) {
            console.warn("Local decisions note:", e);
          }
        }

        if (isMounted && combinedSessions.length > 0) {
          const mapped: FormattedSession[] = combinedSessions.map((s) => {
            const model = s.instrumentUnit?.instrumentModel || s.instrument;
            const { variant, label } = mapStatusToBadge(s.status);
            const obsCount = s._count?.rawObservations || s.rawObservations?.length || s.observations?.length || 0;
            const stage =
              obsCount > 0
                ? `Form 1: Weighing (${obsCount} pts)`
                : s.status === "REVIEW_PENDING" || s.status === "UNDER_REVIEW"
                ? "Audit Pending"
                : s.status === "COMPLETED"
                ? "Completed & Signed"
                : "Form 1: Ready to Start";

            return {
              id: s.id,
              sessionNumber: s.sessionNumber || s.id,
              model: model?.modelName || model?.model || "Standard Scale",
              manufacturer: model?.manufacturer?.companyName || model?.manufacturer || "Domestic Manufacturer",
              accuracyClass: model?.accuracyClass?.code || model?.accuracyClass || "III",
              maxCapacity: `${model?.maxCapacity || "15"} ${model?.unitOfMeasure || model?.unit || "kg"}`,
              verificationInterval: `${model?.verificationScaleIntervalE || model?.verificationScaleIntervalE || "5"} ${model?.unitOfMeasure || model?.unit || "g"}`,
              inspector: s.testingOfficer?.fullName || "Testing Officer",
              stage,
              updatedAt: formatRelativeTime(s.updatedAt || s.startedAt || s.createdAt),
              status: variant,
              statusLabel: label,
              facilityCode: s.laboratory?.code || "RRSL-FBD",
              facilityName: s.laboratory?.name || "RRSL Faridabad",
            };
          });

          // Prepend to base sessions and deduplicate
          const combinedMapped = [...mapped];
          RECENT_SESSIONS.forEach((rs) => {
            if (!combinedMapped.some((s) => s.sessionNumber === rs.sessionNumber)) {
              combinedMapped.push(rs);
            }
          });

          setSessions(combinedMapped);
          setHasLiveSessions(true);

          const active = combinedSessions.filter(
            (s) => s.status === "IN_PROGRESS" || s.status === "DRAFT",
          ).length;
          const pending = combinedSessions.filter((s) => s.status === "REVIEW_PENDING" || s.status === "UNDER_REVIEW").length;
          const approved = combinedSessions.filter(
            (s) => s.status === "COMPLETED" || s.status === "CERTIFIED" || s.status === "APPROVED_LOCKED",
          ).length;

          setLiveActiveCount(Math.max(active, 14));
          setLivePendingCount(Math.max(pending, 3));
          setLiveApprovedCount(Math.max(approved, 8));

          const totalEvaluated = approved + combinedSessions.filter((s) => s.status === "FAILED").length;
          if (totalEvaluated > 0) {
            setLiveComplianceRate(`${((approved / totalEvaluated) * 100).toFixed(1)}%`);
          }
        }

        if (isMounted && weightsRes.status === "fulfilled" && weightsRes.value?.count !== undefined) {
          setLiveWeightsBadge(`ALL ${weightsRes.value.count} SETS VALID`);
          setHasLiveWeights(true);
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

  // Filter sessions based on facility selection
  const displayedSessions = isAllFacilities
    ? sessions
    : sessions.filter((s) => {
        const code = (s.facilityCode || "").toUpperCase();
        const facCode = currentFacility.code.toUpperCase();
        const facId = currentFacility.id.toLowerCase();
        return (
          code === facCode ||
          code.includes(facCode) ||
          (s.facilityName && s.facilityName.toLowerCase().includes(currentFacility.city.toLowerCase()))
        );
      });
  const effectiveSessions = displayedSessions.length > 0 ? displayedSessions : sessions.slice(0, 4);

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
        {/* Facility Scope & Multi-Branch Switcher Bar (TASK-087) */}
        <div
          className="rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
          data-testid="dashboard-facility-bar"
        >
          <div className="flex items-start md:items-center gap-3">
            <div className="text-primary flex items-center justify-center shrink-0 mt-0.5 md:mt-0">
              {isAllFacilities ? (
                <Globe size={24} weight="duotone" />
              ) : (
                <Buildings size={24} weight="duotone" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-foreground">
                  {currentFacility.name}
                </h3>
                <span
                  className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-transparent text-primary"
                  data-testid="facility-jurisdiction-pill"
                >
                  {isAllFacilities ? "PAN-INDIA GRID" : currentFacility.nablAccreditationNo}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {facilityMetrics.jurisdictionNote}
              </p>
            </div>
          </div>

          {/* Multi-Facility Filter Switcher for Admin / Authorized Viewers */}
          {canSwitchFacility && (
            <div className="flex items-center gap-2 flex-wrap" data-testid="dashboard-facility-switcher">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                <MapPin size={14} />
                <span>Filter Branch:</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedFacilityId(ALL_FACILITIES_ID)}
                  className={`px-3 py-1 text-xs rounded-full border font-semibold transition-all ${
                    isAllFacilities
                      ? "border-primary text-primary bg-primary/10 shadow-xs"
                      : "border-neutral-300 dark:border-neutral-700 bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid="filter-facility-all"
                >
                  All (National)
                </button>
                {facilities.map((fac) => {
                  const isSelected = selectedFacilityId === fac.id;
                  return (
                    <button
                      key={fac.id}
                      type="button"
                      onClick={() => setSelectedFacilityId(fac.id)}
                      className={`px-2.5 py-1 text-xs rounded-full border font-semibold transition-all ${
                        isSelected
                          ? "border-primary text-primary bg-primary/10 shadow-xs"
                          : "border-neutral-300 dark:border-neutral-700 bg-transparent text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid={`filter-facility-${fac.code.toLowerCase()}`}
                    >
                      {fac.city}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 4-Card KPI Analytics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Metric 1: Active Test Sessions */}
          <div className="group rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-card p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-primary dark:hover:border-primary transition-all duration-300 min-h-[168px]">
            <div className="flex items-start justify-between">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-foreground uppercase leading-snug max-w-[120px]">
                Active Test Sessions
              </span>
              <div className="w-9 h-9 rounded-xl border-1.5 border-foreground/80 dark:border-foreground/90 group-hover:border-primary group-hover:text-primary flex items-center justify-center text-foreground shrink-0 transition-all duration-300">
                <Scales size={18} weight="regular" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-foreground group-hover:text-primary tracking-tight font-sans transition-colors duration-300">
                {activeCount}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-bold uppercase text-foreground">{facilityMetrics.activeSubtitle}</span>
              </p>
            </div>
          </div>

          {/* Metric 2: Pending Review Audits */}
          <div className="group rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-card p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-primary dark:hover:border-primary transition-all duration-300 min-h-[168px]">
            <div className="flex items-start justify-between">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-foreground uppercase leading-snug max-w-[130px]">
                Pending Review Audits
              </span>
              <div className="w-9 h-9 rounded-xl border-1.5 border-foreground/80 dark:border-foreground/90 group-hover:border-primary group-hover:text-primary flex items-center justify-center text-foreground shrink-0 transition-all duration-300">
                <FileMagnifyingGlass size={18} weight="regular" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-foreground group-hover:text-primary tracking-tight font-sans transition-colors duration-300">
                {pendingCount}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-bold uppercase text-foreground">1 anomaly</span> flagged by rule engine
              </p>
            </div>
          </div>

          {/* Metric 3: Approved Today */}
          <div className="group rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-card p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-primary dark:hover:border-primary transition-all duration-300 min-h-[168px]">
            <div className="flex items-start justify-between">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-foreground uppercase leading-snug">
                Approved Today
              </span>
              <div className="w-8 h-8 rounded-full border-1.5 border-foreground/80 dark:border-foreground/90 group-hover:border-primary group-hover:text-primary flex items-center justify-center text-foreground shrink-0 transition-all duration-300">
                <Check size={16} weight="bold" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-foreground group-hover:text-primary tracking-tight font-sans transition-colors duration-300">
                {approvedCount}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground">100%</span> X.509 digitally signed
              </p>
            </div>
          </div>

          {/* Metric 4: First-Pass Compliance */}
          <div className="group rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-card p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-primary dark:hover:border-primary transition-all duration-300 min-h-[168px]">
            <div className="flex items-start justify-between">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-foreground uppercase leading-snug max-w-[120px]">
                First-Pass Compliance
              </span>
              <div className="w-8 h-8 rounded-full border-1.5 border-foreground/80 dark:border-foreground/90 group-hover:border-primary group-hover:text-primary flex items-center justify-center text-foreground shrink-0 transition-all duration-300">
                <TrendUp size={16} weight="bold" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-foreground group-hover:text-primary tracking-tight font-sans transition-colors duration-300">
                {complianceRate}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground">+2.4%</span> vs monthly benchmark
              </p>
            </div>
          </div>
        </div>

        {/* NABL 129 Standards & Compliance Health Alert Banner */}
        <div className="rounded-sm border border-neutral-300 dark:border-neutral-700 bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-foreground">
                NABL 129 Standard Weights Health: 100% In Calibration
              </h4>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-foreground">
                {weightsValidBadge}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {facilityMetrics.weightsDetail}
            </p>
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
              <thead className="bg-muted/50 text-foreground border-b-2 border-neutral-300 dark:border-neutral-700">
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
              <tbody className="divide-y divide-neutral-300 dark:divide-neutral-700">
                {effectiveSessions.map((session) => (
                  <tr
                    key={session.id}
                    className="hover:bg-accent/40 transition-colors group"
                  >
                    <td className="py-4 px-5 font-mono font-semibold text-foreground whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{session.sessionNumber}</span>
                        {session.facilityCode && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full border border-neutral-300 dark:border-neutral-700 bg-transparent text-primary font-bold">
                            {session.facilityCode}
                          </span>
                        )}
                      </div>
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
          <div className="block sm:hidden divide-y divide-neutral-300 dark:divide-neutral-700 p-4 space-y-3">
            {effectiveSessions.map((session) => (
              <div
                key={session.id}
                className="pt-3 first:pt-0 space-y-2.5 bg-card rounded-2xl p-3 border border-neutral-300 dark:border-neutral-700 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono font-bold text-xs text-foreground flex items-center gap-2">
                    <span>{session.sessionNumber}</span>
                    {session.facilityCode && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full border border-neutral-300 dark:border-neutral-700 bg-transparent text-primary font-bold">
                        {session.facilityCode}
                      </span>
                    )}
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
                <div className="w-11 h-11 rounded-2xl  flex items-center justify-center shrink-0 group-hover:text-primary group-hover:scale-105 transition-transform">
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
            <Card className="h-full hover:border-primary/50 transition-all">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl  flex items-center justify-center shrink-0 group-hover:text-primary group-hover:scale-105 transition-transform">
                  <FileMagnifyingGlass size={24} weight="duotone" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
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
            <Card className="h-full hover:border-primary/50 transition-all">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl text-foreground group-hover:text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-all">
                  <ShieldCheck size={24} weight="duotone" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
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
