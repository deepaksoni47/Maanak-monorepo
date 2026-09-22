"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Scales,
  CheckCircle,
  Thermometer,
  Drop,
  Gauge,
  ArrowRight,
  ArrowLeft,
  FloppyDisk,
  WarningCircle,
  Check,
  CaretRight,
  ShieldCheck,
  FileText,
  ArrowsClockwise,
  Table,
} from "@phosphor-icons/react";
import { Shell } from "@/components/layout/Shell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ObservationCard, ObservationData } from "./ObservationCard";
import { OfflineSyncBanner } from "@/components/common/OfflineSyncBanner";
import { enqueueOfflineObservation } from "@/lib/offline-sync";
import { ObservationLedgerTable, LedgerEntry } from "./ObservationLedgerTable";
import { ToleranceSafetyGauge } from "./ToleranceSafetyGauge";
import { OfficerGuidanceBanner } from "./OfficerGuidanceBanner";
import { observationsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const INITIAL_STEPS: ObservationData[] = [
  {
    stepNumber: 1,
    label: "Step #1 (Zero Load E₀)",
    appliedLoad: 0.0,
    indication: 0.0,
    deltaL: 0.0025, // 0.5e
    eVal: 0.005,
    e0: 0.0,
    mpeLimit: 0.0025, // ±0.5e
    unit: "kg",
    direction: "ASCENDING",
  },
  {
    stepNumber: 2,
    label: "Step #2 (Min = 20e)",
    appliedLoad: 0.1,
    indication: 0.1,
    deltaL: 0.0025,
    eVal: 0.005,
    e0: 0.0,
    mpeLimit: 0.0025,
    unit: "kg",
    direction: "ASCENDING",
  },
  {
    stepNumber: 3,
    label: "Step #3 (100e)",
    appliedLoad: 0.5,
    indication: 0.5,
    deltaL: 0.0025,
    eVal: 0.005,
    e0: 0.0,
    mpeLimit: 0.0025,
    unit: "kg",
    direction: "ASCENDING",
  },
  {
    stepNumber: 4,
    label: "Step #4 (500e MPE Transition)",
    appliedLoad: 2.5,
    indication: 2.5,
    deltaL: 0.002, // Turning Point = 2.5005 kg, E = +0.5g
    eVal: 0.005,
    e0: 0.0,
    mpeLimit: 0.0025,
    unit: "kg",
    direction: "ASCENDING",
  },
  {
    stepNumber: 5,
    label: "Step #5 (1000e)",
    appliedLoad: 5.0,
    indication: 5.0,
    deltaL: 0.0025,
    eVal: 0.005,
    e0: 0.0,
    mpeLimit: 0.005, // ±1.0e
    unit: "kg",
    direction: "ASCENDING",
  },
  {
    stepNumber: 6,
    label: "Step #6 (Half Max 1500e)",
    appliedLoad: 7.5,
    indication: 7.5,
    deltaL: 0.0025,
    eVal: 0.005,
    e0: 0.0,
    mpeLimit: 0.005,
    unit: "kg",
    direction: "ASCENDING",
  },
  {
    stepNumber: 7,
    label: "Step #7 (2000e MPE Transition)",
    appliedLoad: 10.0,
    indication: 10.0,
    deltaL: 0.0025,
    eVal: 0.005,
    e0: 0.0,
    mpeLimit: 0.005,
    unit: "kg",
    direction: "ASCENDING",
  },
  {
    stepNumber: 8,
    label: "Step #8 (Max = 3000e Full Load)",
    appliedLoad: 15.0,
    indication: 15.0,
    deltaL: 0.0015, // Turning point = 15.001 kg, E = +1.0g
    eVal: 0.005,
    e0: 0.0,
    mpeLimit: 0.0075, // ±1.5e
    unit: "kg",
    direction: "ASCENDING",
  },
  {
    stepNumber: 9,
    label: "Step #9 (Half Max Return Descending)",
    appliedLoad: 7.5,
    indication: 7.5,
    deltaL: 0.0025,
    eVal: 0.005,
    e0: 0.0,
    mpeLimit: 0.005,
    unit: "kg",
    direction: "DESCENDING",
  },
  {
    stepNumber: 10,
    label: "Step #10 (Zero Return)",
    appliedLoad: 0.0,
    indication: 0.0,
    deltaL: 0.0025,
    eVal: 0.005,
    e0: 0.0,
    mpeLimit: 0.0025,
    unit: "kg",
    direction: "DESCENDING",
  },
];

// Helper to calculate pseudo WELMEC hash snippet for an observation
function calculateWelmecHashSnippet(step: ObservationData, P: number, Ec: number): string {
  const seed = `${step.stepNumber}:${step.appliedLoad}:${step.indication}:${step.deltaL}:${P}:${Ec}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `0x${(hash >>> 0).toString(16).padStart(8, "0").slice(0, 8)}...`;
}

export function BenchWorkbenchView() {
  const { user } = useAuth();
  const [steps, setSteps] = useState<ObservationData[]>(INITIAL_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(3); // Default to Step #4 for interactive demo
  const [savedSteps, setSavedSteps] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
  });

  const activeObservation = steps[currentStepIndex];

  // Helper to compute P, E, and Ec for any step
  const computeStepResult = (obs: ObservationData) => {
    const P = obs.indication + 0.5 * obs.eVal - obs.deltaL;
    const E = P - obs.appliedLoad;
    const zeroStep = steps[0];
    const e0 = zeroStep ? zeroStep.indication + 0.5 * zeroStep.eVal - zeroStep.deltaL : 0;
    const Ec = E - e0;
    const isPass = Math.abs(Ec) <= obs.mpeLimit + 1e-9;
    return { P, E, Ec, isPass };
  };

  const activeResult = computeStepResult(activeObservation);

  // Generate ledger entries dynamically from all saved steps plus active step
  const buildLedgerEntries = (): LedgerEntry[] => {
    return steps
      .filter((s) => savedSteps[s.stepNumber] || s.stepNumber === activeObservation.stepNumber)
      .map((s) => {
        const res = computeStepResult(s);
        const absEc = Math.abs(res.Ec);
        const toleranceConsumed = s.mpeLimit > 0 ? (absEc / s.mpeLimit) * 100 : 0;
        return {
          stepNumber: s.stepNumber,
          direction: s.direction || "ASCENDING",
          stageLabel: s.label,
          appliedLoad: s.appliedLoad,
          indication: s.indication,
          deltaL: s.deltaL,
          eVal: s.eVal,
          turningPointP: +res.P.toFixed(4),
          rawErrorE: +res.E.toFixed(4),
          intrinsicErrorEc: +res.Ec.toFixed(4),
          mpeLimit: s.mpeLimit,
          unit: s.unit || "kg",
          isPass: res.isPass,
          toleranceConsumedPercent: toleranceConsumed,
          hashSnippet: calculateWelmecHashSnippet(s, res.P, res.Ec),
          timestamp: new Date().toLocaleTimeString("en-IN", { hour12: false }),
        };
      });
  };

  const ledgerEntries = buildLedgerEntries();

  const handleObservationChange = (updated: ObservationData) => {
    const nextSteps = [...steps];
    nextSteps[currentStepIndex] = updated;
    setSteps(nextSteps);

    // Call live backend calculation asynchronously to ensure 100% real-time backend synchronization
    observationsApi
      .calculateTurningPoint({
        indication: updated.indication,
        deltaL: updated.deltaL,
        e: updated.eVal,
        nominalLoad: updated.appliedLoad,
        e0: updated.e0,
        accuracyClass: "CLASS_III",
        loadUnit: updated.unit || "kg",
      })
      .catch(() => {
        // Safe offline fallback already handled locally
      });
  };

  const handleSaveAndAdvance = () => {
    setSavedSteps((prev) => ({ ...prev, [activeObservation.stepNumber]: true }));

    // Automatically buffer observation into IndexedDB
    enqueueOfflineObservation({
      sessionId: "TS-2026-0142",
      stepNumber: activeObservation.stepNumber,
      nominalLoad: `${activeObservation.appliedLoad} ${activeObservation.unit}`,
      indication: `${activeObservation.indication} ${activeObservation.unit}`,
      deltaL: `${activeObservation.deltaL} ${activeObservation.unit}`,
      turningPointP: `${activeResult.P.toFixed(4)} ${activeObservation.unit}`,
      errorEc: `${activeResult.Ec.toFixed(4)} ${activeObservation.unit}`,
    }).catch(() => {});

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  // Preset quick navigation for field officers (Zero, Min 20e, 1/4 Max, 1/2 Max, Max)
  const jumpToPresetLoad = (loadValue: number) => {
    const foundIdx = steps.findIndex((s) => Math.abs(s.appliedLoad - loadValue) < 0.001);
    if (foundIdx !== -1) {
      setCurrentStepIndex(foundIdx);
    }
  };

  return (
    <Shell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Bench Execution" },
      ]}
      pageTitle="OIML R-76 Real-Time Observation Workbench"
      pageSubtitle="Clause A.4.4 Form 1: Weighing Performance Test with turning point P = I + 0.5e - ΔL determination."
      bottomActionBar={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentStepIndex === 0}
              onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
              leftIcon={<ArrowLeft size={16} />}
              className="text-xs font-semibold min-h-[48px]"
            >
              Previous
            </Button>
            <div className="text-xs font-mono font-semibold text-muted-foreground px-2 hidden sm:block">
              Step {currentStepIndex + 1} of {steps.length}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleSaveAndAdvance}
              rightIcon={<ArrowRight size={16} weight="bold" />}
              className="font-bold shadow-xs min-h-[48px] text-xs sm:text-sm px-5"
            >
              {currentStepIndex === steps.length - 1
                ? "Complete Weighing Test ✓"
                : "Submit Observation & Advance"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Session Info & Ambient Telemetry Strip */}
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Scales size={22} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-foreground">
                  Session TS-2026-0142: Essae DS-215
                </h3>
                <Badge variant="pass" showIcon={false} className="py-0.5 px-2 text-[10px]">
                  CLASS III
                </Badge>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Max 15 kg | e = 5 g | TAC: IND/09/2026/042
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Officer: {user ? `${user.fullName} (${user.role})` : "Guest Officer (Sign In to Sign & Stamp)"} | RRSL Faridabad Testing Bay #2
              </p>
            </div>
          </div>

          {/* Environmental Sensors Readout */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs bg-muted/40 p-2 sm:p-2.5 rounded-2xl shrink-0 overflow-x-auto">
            <div className="flex items-center gap-1 text-foreground font-mono">
              <Thermometer size={16} className="text-amber-500" />
              <span>20.4°C</span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1 text-foreground font-mono">
              <Drop size={16} className="text-sky-500" />
              <span>54% RH</span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1 text-foreground font-mono">
              <Gauge size={16} className="text-emerald-500" />
              <span>1013.2 hPa</span>
            </div>
          </div>
        </div>

        {/* Offline PWA Sync Status Banner */}
        <OfflineSyncBanner sessionId="TS-2026-0142" />

        {/* Officer Guided Mode Banner (Plain-English Field Instructions) */}
        <OfficerGuidanceBanner
          stepNumber={activeObservation.stepNumber}
          direction={activeObservation.direction || "ASCENDING"}
          appliedLoad={activeObservation.appliedLoad}
          unit={activeObservation.unit || "kg"}
          eVal={activeObservation.eVal}
          onQuickFill={() => {
            handleObservationChange({
              ...activeObservation,
              indication: activeObservation.appliedLoad,
            });
          }}
        />

        {/* Dynamic MPE Tolerance & Safety Monitor Gauge */}
        <ToleranceSafetyGauge
          intrinsicErrorEc={activeResult.Ec}
          mpeLimit={activeObservation.mpeLimit}
          currentStepIndex={currentStepIndex}
          totalSteps={steps.length}
          unit={activeObservation.unit}
        />

        {/* Officer Quick Load Preset Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
            <Scales size={14} className="text-primary" />
            <span>Quick Load Presets:</span>
          </span>
          <button
            type="button"
            onClick={() => jumpToPresetLoad(0.0)}
            className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-accent text-xs font-mono font-medium transition-colors shrink-0"
          >
            Zero (0 kg)
          </button>
          <button
            type="button"
            onClick={() => jumpToPresetLoad(0.1)}
            className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-accent text-xs font-mono font-medium transition-colors shrink-0"
          >
            Min (0.1 kg)
          </button>
          <button
            type="button"
            onClick={() => jumpToPresetLoad(7.5)}
            className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-accent text-xs font-mono font-medium transition-colors shrink-0"
          >
            ½ Max (7.5 kg)
          </button>
          <button
            type="button"
            onClick={() => jumpToPresetLoad(15.0)}
            className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-accent text-xs font-mono font-medium transition-colors shrink-0"
          >
            Full Max (15.0 kg)
          </button>
        </div>

        {/* Step Progression Chip Strip */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Clause A.4.4.1 Test Load Schedule (10 Steps):</span>
            <span>
              {Object.keys(savedSteps).length} of {steps.length} Recorded
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {steps.map((step, idx) => {
              const isCurrent = idx === currentStepIndex;
              const isSaved = savedSteps[step.stepNumber];
              const res = computeStepResult(step);

              return (
                <button
                  key={step.stepNumber}
                  type="button"
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`px-3 py-2 rounded-2xl text-xs font-medium border shrink-0 transition-all min-h-[48px] flex items-center gap-1.5 cursor-pointer ${
                    isCurrent
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold ring-2 ring-primary/30"
                      : isSaved
                      ? res.isPass
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "bg-destructive/10 border-destructive/40 text-destructive font-semibold"
                      : "bg-card border-border text-foreground hover:bg-accent"
                  }`}
                >
                  <span>#{step.stepNumber}</span>
                  <span className="font-mono">
                    {step.appliedLoad} {step.unit}
                  </span>
                  {step.direction === "DESCENDING" && (
                    <span className="text-[10px]">▼</span>
                  )}
                  {isSaved && res.isPass && (
                    <Check size={12} weight="bold" className="text-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Active Step ObservationCard (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <ObservationCard
              observation={activeObservation}
              onChange={handleObservationChange}
              onRetest={() => {
                const next = [...steps];
                next[currentStepIndex] = {
                  ...activeObservation,
                  indication: activeObservation.appliedLoad,
                  deltaL: 0.0025,
                };
                setSteps(next);
              }}
            />
          </div>

          {/* Right Column: Complete Step Matrix Table & Formula Guidance (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card>
              <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Weighing Run Matrix</CardTitle>
                  <CardDescription>
                    Clause A.4.4 10-load observation log
                  </CardDescription>
                </div>
                <Badge
                  variant={activeResult.isPass ? "pass" : "fail"}
                  className="font-mono text-xs"
                >
                  RUN STATUS: {activeResult.isPass ? "PASS" : "OVER MPE"}
                </Badge>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                      <tr>
                        <th scope="col" className="py-2.5 px-3 font-semibold">Step</th>
                        <th scope="col" className="py-2.5 px-2 font-semibold">Load (L)</th>
                        <th scope="col" className="py-2.5 px-2 font-semibold">Turning (P)</th>
                        <th scope="col" className="py-2.5 px-2 font-semibold">Error (Ec)</th>
                        <th scope="col" className="py-2.5 px-3 text-right font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {steps.map((s, idx) => {
                        const r = computeStepResult(s);
                        const isCurrent = idx === currentStepIndex;

                        return (
                          <tr
                            key={s.stepNumber}
                            onClick={() => setCurrentStepIndex(idx)}
                            className={`cursor-pointer transition-colors ${
                              isCurrent
                                ? "bg-primary/10 font-semibold"
                                : "hover:bg-accent/40"
                            }`}
                          >
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-mono">#{s.stepNumber}</span>
                              {s.direction === "DESCENDING" && (
                                <span className="text-[10px] text-muted-foreground ml-1">▼</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 font-mono whitespace-nowrap">
                              {s.appliedLoad.toFixed(3)} kg
                            </td>
                            <td className="py-2.5 px-2 font-mono whitespace-nowrap">
                              {r.P.toFixed(4)} kg
                            </td>
                            <td
                              className={`py-2.5 px-2 font-mono whitespace-nowrap font-bold ${
                                r.isPass
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-destructive"
                              }`}
                            >
                              {(r.Ec * 1000).toFixed(1)} g
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <Badge
                                variant={r.isPass ? "pass" : "fail"}
                                showIcon={false}
                                className="py-0 px-2 text-[10px] font-mono"
                              >
                                {r.isPass ? "PASS" : "FAIL"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Metrological Guidance Card */}
            <div className="rounded-3xl border border-border/80 bg-muted/20 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <FileText size={16} className="text-primary" />
                <span>OIML R-76 Clause A.4.4.3 Turning Point Formula:</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                P = I + 0.5e - ΔL = {activeObservation.indication.toFixed(4)} + {(0.5 * activeObservation.eVal).toFixed(4)} - {activeObservation.deltaL.toFixed(4)} = {activeResult.P.toFixed(4)} kg
              </p>
              <p className="text-[11px] text-muted-foreground font-mono">
                Ec = (P - L) - E₀ = {activeResult.E >= 0 ? `+${(activeResult.E * 1000).toFixed(1)}` : (activeResult.E * 1000).toFixed(1)} g
              </p>
            </div>
          </div>
        </div>

        {/* Live Metrological Test Observation Ledger Table (Appended on each operation) */}
        <ObservationLedgerTable
          entries={ledgerEntries}
          currentStepNumber={activeObservation.stepNumber}
          onSelectStep={(num) => {
            const idx = steps.findIndex((s) => s.stepNumber === num);
            if (idx !== -1) setCurrentStepIndex(idx);
          }}
        />
      </div>
    </Shell>
  );
}
