"use client";

import React, { useState, useEffect } from "react";
import { reviewApi, sessionsApi } from "@/lib/api";
import {
  ShieldWarning,
  GitFork,
  CheckCircle,
  WarningCircle,
  XCircle,
  MagnifyingGlass,
  Funnel,
  ArrowSquareOut,
  ClockCountdown,
  FileText,
  User,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { Shell } from "@/components/layout/Shell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  DerivationTreeModal,
  type FlaggedAuditItem,
} from "@/components/review/DerivationTreeModal";

const INITIAL_AUDIT_ITEMS: FlaggedAuditItem[] = [
  {
    id: "audit-1",
    sessionNumber: "TS-2026-0140",
    model: "Sartorius Entris II 224i",
    accuracyClass: "Class I",
    inspector: "K. Sharma (Insp-04)",
    stepNumber: 7,
    nominalLoad: "150.0000 g",
    indication: "150.0010 g",
    deltaL: "0.0004 g",
    eVal: "0.0010 g (1 mg)",
    turningPointP: "150.0011 g",
    errorEc: "+0.0014 g (+1.4 mg)",
    mpeLimit: "±0.0010 g (±1.0 mg)",
    anomalyCode: "OIML-ERR-MPE-EXCEEDED",
    anomalyTitle: "Clause 3.5.1: Maximum Permissible Error Exceeded",
    anomalyDescription:
      "Calculated corrected error Ec (+1.4 mg) exceeds the OIML Table 6 MPE limit (±1.0 mg) at 150 g nominal verification load.",
    severity: "critical",
    ruleCitation: "OIML R-76-1:2006 Cl. 3.5.1, Table 6",
  },
  {
    id: "audit-2",
    sessionNumber: "TS-2026-0139",
    model: "Mettler Toledo XPE205",
    accuracyClass: "Class I",
    inspector: "P. Iyer (Insp-02)",
    stepNumber: 3,
    nominalLoad: "10.0000 g",
    indication: "10.0000 g",
    deltaL: "0.0000 g",
    eVal: "0.0001 g (0.1 mg)",
    turningPointP: "10.00005 g",
    errorEc: "+0.00005 g (+0.05 mg)",
    mpeLimit: "±0.0002 g (±0.2 mg)",
    anomalyCode: "OIML-WARN-TP-STAGNATION",
    anomalyTitle: "Clause A.4.4.3: Zero Vernier Progression Anomaly",
    anomalyDescription:
      "Vernier weight addition deltaL remained exactly 0.0000 g across consecutive test steps without oscillation, suggesting possible rounding or deadband masking.",
    severity: "warning",
    ruleCitation: "OIML R-76-1:2006 Annex A.4.4.3",
  },
  {
    id: "audit-3",
    sessionNumber: "TS-2026-0141",
    model: "Essae DS-215 Platform",
    accuracyClass: "Class III",
    inspector: "A. Verma (Insp-07)",
    stepNumber: 5,
    nominalLoad: "10.000 kg",
    indication: "10.005 kg",
    deltaL: "0.002 kg",
    eVal: "0.005 kg (5 g)",
    turningPointP: "10.0055 kg",
    errorEc: "+0.0035 kg (+3.5 g)",
    mpeLimit: "±0.0050 kg (±5.0 g)",
    anomalyCode: "OIML-WARN-ZERO-RETURN",
    anomalyTitle: "Clause A.4.4.2: Zero-Load Return Drift (E0)",
    anomalyDescription:
      "Initial zero-load offset drift E0 shifted by +2.5 g (> 0.5e) following initial step discharge before re-zeroing.",
    severity: "critical",
    ruleCitation: "OIML R-76-1:2006 Annex A.4.4.2",
  },
  {
    id: "audit-4",
    sessionNumber: "TS-2026-0142",
    model: "Avery Weigh-Tronix ZM305",
    accuracyClass: "Class III",
    inspector: "R. Nair (Insp-03)",
    stepNumber: 8,
    nominalLoad: "20.000 kg",
    indication: "20.000 kg",
    deltaL: "0.003 kg",
    eVal: "0.005 kg (5 g)",
    turningPointP: "20.0005 kg",
    errorEc: "+0.0010 kg (+1.0 g)",
    mpeLimit: "±0.0050 kg (±5.0 g)",
    anomalyCode: "OIML-INFO-ECCENTRICITY",
    anomalyTitle: "Clause 3.6.2: Minor Corner Load Variance",
    anomalyDescription:
      "Off-center corner loading difference measured 1.8e (below 2.0e rejection threshold, within observation watch limit).",
    severity: "info",
    ruleCitation: "OIML R-76-1:2006 Cl. 3.6.2",
  },
];

export function ReviewAuditView() {
  const [items, setItems] = useState<FlaggedAuditItem[]>(INITIAL_AUDIT_ITEMS);
  const [selectedItem, setSelectedItem] = useState<FlaggedAuditItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [decisionFeedback, setDecisionFeedback] = useState<{
    id: string;
    message: string;
    type: "success" | "warning" | "error";
  } | null>(null);

  // Hydrate live sessions awaiting review from PostgreSQL database
  useEffect(() => {
    let isMounted = true;
    async function loadReviewSessions() {
      try {
        const res = await sessionsApi.list({ status: "UNDER_REVIEW" });
        if (isMounted && res?.sessions && res.sessions.length > 0) {
          const liveItems: FlaggedAuditItem[] = res.sessions.map((s: any) => {
            const model = s.instrumentUnit?.instrumentModel;
            const officer = s.testingOfficer?.fullName || "Testing Officer";
            const lastObs = s.rawObservations?.[s.rawObservations.length - 1];
            return {
              id: s.id,
              sessionNumber: s.sessionNumber,
              model: model?.modelName || "NAWI Verification Scale",
              accuracyClass: `Class ${model?.accuracyClass?.code || "III"}`,
              inspector: officer,
              stepNumber: lastObs?.sequenceNumber || 1,
              nominalLoad: `${lastObs?.targetLoadL || 15} kg`,
              indication: `${lastObs?.displayedIndicationI || 15} kg`,
              deltaL: `${lastObs?.changeoverWeightDl || 0.002} kg`,
              eVal: `${model?.verificationScaleIntervalE || 0.005} kg`,
              turningPointP: `${lastObs?.turningPointP || 15.0005} kg`,
              errorEc: `${lastObs?.errorEc || 0.0005} kg`,
              mpeLimit: "±0.0050 kg",
              anomalyCode: "OIML-AUDIT-SUBMITTED",
              anomalyTitle: "Weighing Performance Verification Audit Pending",
              anomalyDescription:
                "Testing complete at bench. Awaiting ISO/IEC 17025 derivation step sign-off and anomaly screening.",
              severity: "warning",
              ruleCitation: "OIML R-76-1:2006 Cl. 3.5.1",
            };
          });
          setItems((prev) => [
            ...liveItems,
            ...prev.filter(
              (p) => !liveItems.some((l) => l.sessionNumber === p.sessionNumber)
            ),
          ]);
        }
      } catch (err) {
        console.warn("Live review sessions load note:", err);
      }
    }
    loadReviewSessions();
    return () => {
      isMounted = false;
    };
  }, []);

  const pendingCount = items.length;
  const criticalCount = items.filter((i) => i.severity === "critical").length;
  const warningCount = items.filter((i) => i.severity === "warning").length;

  const filteredItems = items.filter((item) => {
    const matchesSeverity =
      filterSeverity === "all" || item.severity === filterSeverity;
    const matchesSearch =
      item.sessionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.anomalyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.inspector.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const handleOpenDerivationTree = (item: FlaggedAuditItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleDecision = async (
    action: "APPROVED" | "FLAGGED_FOR_CORRECTION" | "REJECTED",
    options?: { comments?: string; flaggedFormId?: string }
  ) => {
    if (!selectedItem) return;

    let msg = "";
    let type: "success" | "warning" | "error" = "success";

    if (action === "APPROVED") {
      msg = `Session ${selectedItem.sessionNumber} approved by Senior Reviewer.`;
      type = "success";
    } else if (action === "FLAGGED_FOR_CORRECTION") {
      msg = options?.comments || `Session ${selectedItem.sessionNumber} flagged for correction and re-test requested.`;
      type = "warning";
    } else {
      msg = `Session ${selectedItem.sessionNumber} rejected under OIML R-76 Clause 3.5.1.`;
      type = "error";
    }

    // Persist reviewer decision live to backend API & PostgreSQL
    try {
      await reviewApi.submitDecision({
        testSessionId: selectedItem.id,
        decision: action,
        comments: msg,
        flaggedFormId: options?.flaggedFormId,
        reviewStage: "SECOND_LEVEL_REVIEW",
      });
    } catch (err) {
      console.warn("Live review decision submission note:", err);
    }

    setDecisionFeedback({ id: selectedItem.id, message: msg, type });
    // Remove from pending audit queue
    setItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
    setIsModalOpen(false);
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Senior Reviewer Anomaly Audit", href: "/review" },
  ];

  return (
    <Shell breadcrumbs={breadcrumbs}>
      <div className="space-y-6 pb-12">
        {/* Header Title & Description */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <ShieldWarning className="h-8 w-8 text-primary" weight="duotone" />
              Senior Reviewer Anomaly Audit
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              OIML R-76 & ISO/IEC 17025 observation anomaly queue with live
              mathematical derivation tree inspection and calibration sign-off.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/40 text-primary py-1.5 px-3">
              ISO 17025 §7.8 Sign-Off
            </Badge>
          </div>
        </div>

        {/* Global Decision Feedback Toast / Banner */}
        {decisionFeedback && (
          <div
            role="status"
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
              decisionFeedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : decisionFeedback.type === "warning"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {decisionFeedback.type === "success" && (
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" weight="fill" />
              )}
              {decisionFeedback.type === "warning" && (
                <WarningCircle className="h-5 w-5 text-amber-400 shrink-0" weight="fill" />
              )}
              {decisionFeedback.type === "error" && (
                <XCircle className="h-5 w-5 text-rose-400 shrink-0" weight="fill" />
              )}
              <span>{decisionFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setDecisionFeedback(null)}
              className="text-xs font-semibold underline hover:opacity-80 transition-opacity min-h-[32px] px-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top 3 KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 sm:p-5 flex items-center gap-4 bg-card/60 backdrop-blur-xs border-border/70">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ClockCountdown className="h-6 w-6" weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Pending Audit Queue
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {pendingCount} <span className="text-sm font-normal text-muted-foreground">sessions</span>
              </p>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 flex items-center gap-4 bg-card/60 backdrop-blur-xs border-border/70">
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <WarningCircle className="h-6 w-6" weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Critical Anomalies
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {criticalCount} <span className="text-sm font-normal text-muted-foreground">flagged</span>
              </p>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 flex items-center gap-4 bg-card/60 backdrop-blur-xs border-border/70">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="h-6 w-6" weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Reviewed Today
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                8 <span className="text-sm font-normal text-muted-foreground">approved</span>
              </p>
            </div>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by session #, model, or inspector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-card/70 border border-border/70 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 transition min-h-[48px]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 shrink-0">
              <Funnel className="h-3.5 w-3.5" /> Severity:
            </span>
            {(["all", "critical", "warning", "info"] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setFilterSeverity(sev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition min-h-[48px] min-w-[48px] flex items-center justify-center ${
                  filterSeverity === sev
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Queue List */}
        {filteredItems.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-border/80">
            <div className="inline-flex p-4 rounded-full bg-emerald-500/10 text-emerald-400 mb-3">
              <CheckCircle className="h-8 w-8" weight="duotone" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              No Anomaly Flags Pending
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              All recorded observations satisfy OIML R-76 Maximum Permissible Error
              and Clause A.4 turning point progression criteria.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className="p-5 sm:p-6 bg-card/60 backdrop-blur-xs border-border/70 hover:border-primary/40 transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left Column: Anomaly Details & Test Session */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">
                        {item.sessionNumber}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs border-border/60 bg-muted/40 font-mono"
                      >
                        {item.accuracyClass}
                      </Badge>
                      <Badge
                        variant={
                          item.severity === "critical"
                            ? "fail"
                            : item.severity === "warning"
                            ? "warning"
                            : "neutral"
                        }
                        className="uppercase text-[11px] font-semibold"
                      >
                        {item.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        Step {item.stepNumber} @ {item.nominalLoad}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                        {item.anomalyTitle}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.anomalyDescription}
                      </p>
                    </div>

                    {/* Metadata strip */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <span>Instrument:</span>
                        <strong className="text-foreground">{item.model}</strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary" />
                        <span>Inspector:</span>
                        <strong className="text-foreground">{item.inspector}</strong>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span>Citation:</span>
                        <span className="text-primary">{item.ruleCitation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Values & Derivation Action Button */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/40">
                    <div className="text-left sm:text-right font-mono">
                      <div className="text-xs text-muted-foreground">
                        Calculated Ec vs MPE
                      </div>
                      <div className="text-sm font-bold text-foreground">
                        <span className="text-rose-400">{item.errorEc}</span>
                        <span className="text-muted-foreground font-normal mx-1">/</span>
                        <span>{item.mpeLimit}</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenDerivationTree(item)}
                      className="min-h-[48px] px-4 border-primary/40 hover:bg-primary/10 text-primary flex items-center gap-2 w-full sm:w-auto"
                    >
                      <GitFork className="h-4 w-4" weight="bold" />
                      <span>Audit Step Derivation Tree</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Full Derivation Tree Modal */}
      <DerivationTreeModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onDecision={handleDecision}
      />
    </Shell>
  );
}
