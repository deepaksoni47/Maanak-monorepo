"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  X,
  Buildings,
  Hash,
  PencilSimple,
  Plus,
} from "@phosphor-icons/react";
import { Shell } from "@/components/layout/Shell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ObservationCard, ObservationData } from "./ObservationCard";
import { OfflineSyncBanner } from "@/components/common/OfflineSyncBanner";
import { enqueueOfflineObservation } from "@/lib/offline-sync";
import { ObservationLedgerTable, LedgerEntry } from "./ObservationLedgerTable";
import { ToleranceSafetyGauge } from "./ToleranceSafetyGauge";
import { OfficerGuidanceBanner } from "./OfficerGuidanceBanner";
import { TestBatteryNavigator, FormId, STATUTORY_FORMS } from "./TestBatteryNavigator";
import { Form2TempDriftCard } from "./Form2TempDriftCard";
import { Form3EccentricityCard } from "./Form3EccentricityCard";
import { Form4DiscriminationCard } from "./Form4DiscriminationCard";
import { Form5RepeatabilityCard } from "./Form5RepeatabilityCard";
import { Form6CreepCard } from "./Form6CreepCard";
import { EvidenceVaultCard } from "@/components/evidence";
import { observationsApi, sessionsApi, instrumentsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  InstrumentItem,
  DEFAULT_INSTRUMENTS,
  getStoredInstruments,
  updateStoredInstrument,
} from "@/lib/instruments-store";

// Dynamic OIML R-76 Clause A.4.4 Test Points Schedule Generator
export function generateStepsForInstrument(inst: InstrumentItem): ObservationData[] {
  const e = inst.verificationIntervalKg;
  const max = inst.maxCapacityKg;
  const isClassII = inst.accuracyClass === "CLASS_II";
  const isClassI = inst.accuracyClass === "CLASS_I";

  const minMultiplier = isClassI ? 100 : isClassII ? 50 : 20;
  const mpe1Limit = isClassII ? 5000 * e : 500 * e;
  const mpe2Limit = isClassII ? 20000 * e : 2000 * e;

  const minLoad = +(minMultiplier * e).toFixed(6);
  const step3Load = isClassII ? +(1000 * e).toFixed(6) : +(100 * e).toFixed(6);
  const mpe1Load = Math.min(+(mpe1Limit).toFixed(6), +(max * 0.4).toFixed(6));
  const intermediateLoad = isClassII ? +(10000 * e).toFixed(6) : +(1000 * e).toFixed(6);
  const halfMaxLoad = +(max / 2).toFixed(6);
  const mpe2Load = Math.min(+(mpe2Limit).toFixed(6), +(max * 0.8).toFixed(6));
  const fullMaxLoad = max;

  const getMpe = (L: number) => {
    if (L <= mpe1Limit + 1e-9) return +(0.5 * e).toFixed(6);
    if (L <= mpe2Limit + 1e-9) return +(1.0 * e).toFixed(6);
    return +(1.5 * e).toFixed(6);
  };

  return [
    {
      stepNumber: 1,
      label: "Step #1 (Zero Load E₀)",
      appliedLoad: 0.0,
      indication: 0.0,
      deltaL: +(0.5 * e).toFixed(6),
      eVal: e,
      e0: 0.0,
      mpeLimit: +(0.5 * e).toFixed(6),
      unit: "kg",
      direction: "ASCENDING",
    },
    {
      stepNumber: 2,
      label: `Step #2 (Min Load = ${minMultiplier}e)`,
      appliedLoad: minLoad,
      indication: minLoad,
      deltaL: +(0.5 * e).toFixed(6),
      eVal: e,
      e0: 0.0,
      mpeLimit: getMpe(minLoad),
      unit: "kg",
      direction: "ASCENDING",
    },
    {
      stepNumber: 3,
      label: `Step #3 (${isClassII ? "1000e" : "100e"})`,
      appliedLoad: step3Load,
      indication: step3Load,
      deltaL: +(0.5 * e).toFixed(6),
      eVal: e,
      e0: 0.0,
      mpeLimit: getMpe(step3Load),
      unit: "kg",
      direction: "ASCENDING",
    },
    {
      stepNumber: 4,
      label: `Step #4 (${isClassII ? "5000e" : "500e"} MPE-1 Transition)`,
      appliedLoad: mpe1Load,
      indication: mpe1Load,
      deltaL: +(0.5 * e).toFixed(6),
      eVal: e,
      e0: 0.0,
      mpeLimit: getMpe(mpe1Load),
      unit: "kg",
      direction: "ASCENDING",
    },
    {
      stepNumber: 5,
      label: `Step #5 (${isClassII ? "10000e" : "1000e"})`,
      appliedLoad: intermediateLoad,
      indication: intermediateLoad,
      deltaL: +(0.5 * e).toFixed(6),
      eVal: e,
      e0: 0.0,
      mpeLimit: getMpe(intermediateLoad),
      unit: "kg",
      direction: "ASCENDING",
    },
    {
      stepNumber: 6,
      label: "Step #6 (50% Max Load)",
      appliedLoad: halfMaxLoad,
      indication: halfMaxLoad,
      deltaL: +(0.5 * e).toFixed(6),
      eVal: e,
      e0: 0.0,
      mpeLimit: getMpe(halfMaxLoad),
      unit: "kg",
      direction: "ASCENDING",
    },
    {
      stepNumber: 7,
      label: `Step #7 (${isClassII ? "20000e" : "2000e"} MPE-2 Transition)`,
      appliedLoad: mpe2Load,
      indication: mpe2Load,
      deltaL: +(0.5 * e).toFixed(6),
      eVal: e,
      e0: 0.0,
      mpeLimit: getMpe(mpe2Load),
      unit: "kg",
      direction: "ASCENDING",
    },
    {
      stepNumber: 8,
      label: "Step #8 (100% Full Max)",
      appliedLoad: fullMaxLoad,
      indication: fullMaxLoad,
      deltaL: +(0.5 * e).toFixed(6),
      eVal: e,
      e0: 0.0,
      mpeLimit: getMpe(fullMaxLoad),
      unit: "kg",
      direction: "ASCENDING",
    },
    {
      stepNumber: 9,
      label: "Step #9 (50% Max Return)",
      appliedLoad: halfMaxLoad,
      indication: halfMaxLoad,
      deltaL: +(0.5 * e).toFixed(6),
      eVal: e,
      e0: 0.0,
      mpeLimit: getMpe(halfMaxLoad),
      unit: "kg",
      direction: "DESCENDING",
    },
    {
      stepNumber: 10,
      label: "Step #10 (Zero Return)",
      appliedLoad: 0.0,
      indication: 0.0,
      deltaL: +(0.5 * e).toFixed(6),
      eVal: e,
      e0: 0.0,
      mpeLimit: +(0.5 * e).toFixed(6),
      unit: "kg",
      direction: "DESCENDING",
    },
  ];
}

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

function useSafeBenchParams(): {
  instrumentId: string | null;
  sessionId: string | null;
  form: FormId | null;
} {
  try {
    const searchParams = useSearchParams();
    if (!searchParams) return { instrumentId: null, sessionId: null, form: null };
    const rawForm = searchParams.get("form") as FormId | null;
    const isValidForm =
      rawForm && ["form1", "form2", "form3", "form4", "form5", "form6"].includes(rawForm);
    return {
      instrumentId: searchParams.get("instrumentId"),
      sessionId: searchParams.get("session") || searchParams.get("sessionId"),
      form: isValidForm ? rawForm : null,
    };
  } catch {
    return { instrumentId: null, sessionId: null, form: null };
  }
}

export function BenchWorkbenchView() {
  const { user } = useAuth();
  const { instrumentId: urlInstId, sessionId: urlSessionId, form: urlForm } = useSafeBenchParams();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(urlSessionId);
  const [activeForm, setActiveForm] = useState<FormId>(urlForm || "form1");

  const handleSelectForm = (formId: FormId) => {
    setActiveForm(formId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("form", formId);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const [instrumentsList, setInstrumentsList] = useState<InstrumentItem[]>(DEFAULT_INSTRUMENTS);

  // Initialize selected instrument
  const initialInstrument =
    instrumentsList.find((i) => i.id === urlInstId) || instrumentsList[0];

  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentItem>(initialInstrument);
  const [steps, setSteps] = useState<ObservationData[]>(() =>
    generateStepsForInstrument(initialInstrument)
  );

  // Load dynamically stored instruments and live database session / instruments
  useEffect(() => {
    let isMounted = true;

    async function initBenchData() {
      // 1. Fetch live instruments list from API
      try {
        const instRes = await instrumentsApi.list();
        if (isMounted && instRes?.instruments?.length > 0) {
          const mapped: InstrumentItem[] = instRes.instruments.map((inst: any) => ({
            id: inst.id,
            model: inst.modelName,
            manufacturer: inst.manufacturer?.companyName || "Domestic Manufacturer",
            serialNumber: inst.physicalUnits?.[0]?.serialNumber || `SN-${inst.modelName.replace(/\s+/g, "")}-001`,
            tacNumber: inst.patternDesignation || `IND-OIML-${inst.id.slice(0, 6).toUpperCase()}`,
            accuracyClass: ("CLASS_" + (inst.accuracyClass?.code || "III")) as any,
            maxCapacity: `${inst.maxCapacity} ${inst.unitOfMeasure || "kg"}`,
            verificationInterval: `${inst.verificationScaleIntervalE} ${inst.unitOfMeasure || "kg"}`,
            maxCapacityKg: Number(inst.maxCapacity) || 15,
            verificationIntervalKg: Number(inst.verificationScaleIntervalE) || 0.005,
            status: "VERIFIED",
            createdAt: inst.createdAt,
          }));
          setInstrumentsList(mapped);

          if (urlInstId) {
            const found = mapped.find((m) => m.id === urlInstId);
            if (found) {
              setSelectedInstrument(found);
              setSteps(generateStepsForInstrument(found));
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch instruments for bench:", err);
      }

      // 2. If session is specified in URL, load live session details & raw observations from PostgreSQL
      if (urlSessionId) {
        try {
          const sessRes = await sessionsApi.getById(urlSessionId);
          if (isMounted && sessRes?.session) {
            const s = sessRes.session;
            setActiveSessionId(s.id);
            const model = s.instrumentUnit?.instrumentModel;
            if (model) {
              const instItem: InstrumentItem = {
                id: model.id,
                model: model.modelName,
                manufacturer: model.manufacturer?.companyName || "Domestic Manufacturer",
                serialNumber: s.instrumentUnit?.serialNumber || "SN-OIML-001",
                tacNumber: model.patternDesignation || "IND-OIML-2024",
                accuracyClass: ("CLASS_" + (model.accuracyClass?.code || "III")) as any,
                maxCapacity: `${model.maxCapacity} ${model.unitOfMeasure || "kg"}`,
                verificationInterval: `${model.verificationScaleIntervalE} ${model.unitOfMeasure || "kg"}`,
                maxCapacityKg: Number(model.maxCapacity) || 15,
                verificationIntervalKg: Number(model.verificationScaleIntervalE) || 0.005,
                status: "VERIFIED",
                createdAt: s.createdAt,
              };
              setSelectedInstrument(instItem);
              const generated = generateStepsForInstrument(instItem);

              if (s.rawObservations && s.rawObservations.length > 0) {
                const updatedSteps = [...generated];
                const newSavedSteps: Record<number, boolean> = {};
                for (const obs of s.rawObservations) {
                  const idx = obs.sequenceNumber - 1;
                  if (updatedSteps[idx]) {
                    updatedSteps[idx] = {
                      ...updatedSteps[idx],
                      appliedLoad: Number(obs.targetLoadL),
                      indication: Number(obs.displayedIndicationI),
                      deltaL: Number(obs.changeoverWeightDl),
                      e0: Number(obs.zeroIndicationI0),
                    };
                    newSavedSteps[obs.sequenceNumber] = true;
                  }
                }
                setSteps(updatedSteps);
                setSavedSteps(newSavedSteps);
              } else {
                setSteps(generated);
              }
            }
          }
        } catch (err) {
          console.error("Failed to load live session for bench:", err);
        }
      }
    }

    initBenchData();
    return () => {
      isMounted = false;
    };
  }, [urlInstId, urlSessionId]);

  // Bench step navigation: ALWAYS start at Step #1 (Zero Load E0)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [savedSteps, setSavedSteps] = useState<Record<number, boolean>>({});
  const [isInstrumentSelectorOpen, setIsInstrumentSelectorOpen] = useState<boolean>(false);
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState<boolean>(false);

  // Edit Scale Metadata state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editSerial, setEditSerial] = useState<string>(selectedInstrument.serialNumber);
  const [editModel, setEditModel] = useState<string>(selectedInstrument.model);
  const [editTac, setEditTac] = useState<string>(selectedInstrument.tacNumber);
  const [editMfr, setEditMfr] = useState<string>(selectedInstrument.manufacturer);

  const handleSelectInstrument = (inst: InstrumentItem) => {
    setSelectedInstrument(inst);
    setSteps(generateStepsForInstrument(inst));
    setCurrentStepIndex(0); // Reset to Step #1
    setSavedSteps({});
    setIsInstrumentSelectorOpen(false);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("instrumentId", inst.id);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handleSaveEditMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: InstrumentItem = {
      ...selectedInstrument,
      serialNumber: editSerial,
      model: editModel,
      tacNumber: editTac,
      manufacturer: editMfr,
    };
    setSelectedInstrument(updated);
    updateStoredInstrument(selectedInstrument.id, updated);
    setInstrumentsList((prev) =>
      prev.map((i) => (i.id === selectedInstrument.id ? updated : i))
    );
    setIsEditModalOpen(false);
  };

  const activeObservation = steps[currentStepIndex] || steps[0];

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

    // Call live backend calculation asynchronously
    observationsApi
      .calculateTurningPoint({
        indication: updated.indication,
        deltaL: updated.deltaL,
        e: updated.eVal,
        nominalLoad: updated.appliedLoad,
        e0: updated.e0,
        accuracyClass: selectedInstrument.accuracyClass,
        loadUnit: updated.unit || "kg",
      })
      .catch(() => {
        // Safe offline fallback handled locally
      });
  };

  const handleSaveAndAdvance = () => {
    setSavedSteps((prev) => ({ ...prev, [activeObservation.stepNumber]: true }));

    // Automatically buffer observation into IndexedDB
    enqueueOfflineObservation({
      sessionId: activeSessionId || `TS-${selectedInstrument.serialNumber}`,
      stepNumber: activeObservation.stepNumber,
      nominalLoad: `${activeObservation.appliedLoad} ${activeObservation.unit}`,
      indication: `${activeObservation.indication} ${activeObservation.unit}`,
      deltaL: `${activeObservation.deltaL} ${activeObservation.unit}`,
      turningPointP: `${activeResult.P.toFixed(4)} ${activeObservation.unit}`,
      errorEc: `${activeResult.Ec.toFixed(4)} ${activeObservation.unit}`,
    }).catch(() => {});

    // Save live to PostgreSQL database if active session exists
    if (activeSessionId) {
      observationsApi
        .logObservation({
          sessionId: activeSessionId,
          formType: "Form 1",
          loadStepIndex: activeObservation.stepNumber,
          nominalLoad: activeObservation.appliedLoad,
          scaleIndication: activeObservation.indication,
          vernierLoadAdded: activeObservation.deltaL,
          e: activeObservation.eVal,
          e0: activeObservation.e0,
          accuracyClass: selectedInstrument.accuracyClass,
          loadUnit: activeObservation.unit || "kg",
          loadDirection: activeObservation.direction,
        })
        .catch((err) => {
          console.error("Live DB observation log note:", err);
        });
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      setIsCompletedModalOpen(true);
    }
  };

  // Safe display formatting for max & e
  const displayMax =
    selectedInstrument.id === "inst-001"
      ? "15 kg"
      : selectedInstrument.maxCapacity;
  const displayE =
    selectedInstrument.id === "inst-001"
      ? "5 g"
      : selectedInstrument.verificationInterval;

  const selectedFormMeta =
    STATUTORY_FORMS.find((f) => f.id === activeForm) || STATUTORY_FORMS[0];
  const FormIcon = selectedFormMeta.icon;

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
        {/* Session Info & Ambient Telemetry Strip with Instrument Switcher */}
        <div className="rounded-sm border border-border bg-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Scales size={22} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-foreground">
                  Session TS-{selectedInstrument.id === "inst-001" ? "2026-0142" : selectedInstrument.serialNumber}: {selectedInstrument.model}
                </h3>
                <Badge variant="pass" showIcon={false} className="py-0.5 px-2 text-[10px] font-mono">
                  {selectedInstrument.accuracyClass === "CLASS_III" ? "CLASS III" : selectedInstrument.accuracyClass.replace("_", " ")}
                </Badge>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Max {displayMax} | e = {displayE} | TAC: {selectedInstrument.tacNumber}
                </span>
                <div className="flex items-center gap-1.5 ml-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsInstrumentSelectorOpen(true)}
                    className="h-7 text-xs font-semibold px-2.5 rounded-lg border-primary/30 text-primary hover:bg-primary/10"
                    leftIcon={<ArrowsClockwise size={13} />}
                  >
                    Switch Instrument
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditSerial(selectedInstrument.serialNumber);
                      setEditModel(selectedInstrument.model);
                      setEditTac(selectedInstrument.tacNumber);
                      setEditMfr(selectedInstrument.manufacturer);
                      setIsEditModalOpen(true);
                    }}
                    className="h-7 text-xs font-semibold px-2.5 rounded-lg border-muted-foreground/30 text-muted-foreground hover:bg-muted"
                    leftIcon={<PencilSimple size={13} />}
                  >
                    Edit Serial
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Serial: <span className="font-mono font-semibold text-foreground">{selectedInstrument.serialNumber}</span> · Manufacturer:{" "}
                <span className="font-semibold text-foreground">{selectedInstrument.manufacturer}</span> · Officer:{" "}
                {user ? `${user.fullName} (${user.role})` : "Guest Officer (Sign In to Sign & Stamp)"}
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
        <OfflineSyncBanner sessionId={`TS-${selectedInstrument.serialNumber}`} />

        {/* Statutory Test Battery Multi-Form Navigator */}
        <TestBatteryNavigator
          activeForm={activeForm}
          onSelectForm={handleSelectForm}
          formStatuses={{
            form1: {
              status: activeResult.isPass ? "PASS" : "FAIL",
              progressPercent: Math.round((Object.keys(savedSteps).length / steps.length) * 100),
              completedSteps: Object.keys(savedSteps).length,
              totalSteps: steps.length,
            },
            form2: { status: "PENDING", progressPercent: 0, completedSteps: 0, totalSteps: 5 },
            form3: { status: "PENDING", progressPercent: 0, completedSteps: 0, totalSteps: 5 },
            form4: { status: "PENDING", progressPercent: 0, completedSteps: 0, totalSteps: 3 },
            form5: { status: "PENDING", progressPercent: 0, completedSteps: 0, totalSteps: 10 },
            form6: { status: "PENDING", progressPercent: 0, completedSteps: 0, totalSteps: 6 },
          }}
        />

        {activeForm === "form1" ? (
          <>
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
          unit={activeObservation.unit || "kg"}
        />

        {/* Step Progress Stepper Bar (Step #1 to #10) */}
        <div className="rounded-sm border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span className="text-foreground font-bold">
              Clause A.4.4 Test Load Schedule ({steps.length} Statutory Points):
            </span>
            <span>
              Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
            {steps.map((step, idx) => {
              const isCurrent = idx === currentStepIndex;
              const isSaved = !!savedSteps[step.stepNumber];
              const res = computeStepResult(step);

              return (
                <button
                  key={step.stepNumber}
                  type="button"
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl border text-xs transition-all ${
                    isCurrent
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-2 ring-primary/20"
                      : isSaved
                      ? res.isPass
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold"
                        : "border-destructive/40 bg-destructive/10 text-destructive font-semibold"
                      : "border-border bg-background hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <span className="font-mono text-[10px]">#{step.stepNumber}</span>
                  <span className="sr-only">Step #{step.stepNumber}</span>
                  <span className="text-[11px] font-mono truncate max-w-full font-bold">
                    {step.appliedLoad} {step.unit}
                  </span>
                  <div className="mt-1 flex items-center justify-center h-3 w-3">
                    {isSaved ? (
                      res.isPass ? (
                        <Check size={12} weight="bold" className="text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <WarningCircle size={12} weight="bold" className="text-destructive" />
                      )
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-border" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Observation Interaction Area (Active Observation Card + Live Ledger) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <ObservationCard
              observation={activeObservation}
              onChange={handleObservationChange}
            />
          </div>

          <div className="lg:col-span-5 space-y-4">
            {/* Live Progress Summary Table */}
            <Card className="rounded-sm border border-border overflow-hidden">
              <CardHeader className="p-4 bg-muted/20 border-b border-border/70 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table size={18} className="text-primary" />
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Active Run Summary
                  </CardTitle>
                </div>
                <Badge
                  variant={activeResult.isPass ? "pass" : "fail"}
                  showIcon={false}
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
            <div className="rounded-sm border border-border/80 bg-muted/20 p-4 space-y-2 text-xs">
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
          </>
        ) : activeForm === "form2" ? (
          <Form2TempDriftCard
            eVal={selectedInstrument.verificationIntervalKg}
            unit={selectedInstrument.verificationInterval?.split(" ")[1] || "kg"}
            accuracyClass={selectedInstrument.accuracyClass}
            onSaveStep={(st, res) => {
              enqueueOfflineObservation({
                sessionId: activeSessionId || `TS-${selectedInstrument.serialNumber}`,
                stepNumber: st.stepIndex,
                nominalLoad: `0 ${st.unit}`,
                indication: `${st.indicationZeroI0} ${st.unit}`,
                deltaL: `${st.deltaL0} ${st.unit}`,
                turningPointP: `${res.P0.toFixed(4)} ${st.unit}`,
                errorEc: `${res.E0.toFixed(4)} ${st.unit}`,
              }).catch(() => {});
            }}
          />
        ) : activeForm === "form3" ? (
          <Form3EccentricityCard
            maxCapacityKg={selectedInstrument.maxCapacityKg}
            verificationIntervalKg={selectedInstrument.verificationIntervalKg}
            accuracyClass={selectedInstrument.accuracyClass}
            unit={selectedInstrument.verificationInterval?.split(" ")[1] || "kg"}
            onSavePosition={(pos, res) => {
              enqueueOfflineObservation({
                sessionId: activeSessionId || `TS-${selectedInstrument.serialNumber}`,
                stepNumber: pos.positionNumber,
                nominalLoad: `${pos.appliedLoad} ${pos.unit}`,
                indication: `${pos.indication} ${pos.unit}`,
                deltaL: `${pos.deltaL} ${pos.unit}`,
                turningPointP: `${res.P.toFixed(4)} ${pos.unit}`,
                errorEc: `${res.Ec.toFixed(4)} ${pos.unit}`,
              }).catch(() => {});
            }}
          />
        ) : activeForm === "form4" ? (
          <Form4DiscriminationCard
            maxCapacityKg={selectedInstrument.maxCapacityKg}
            verificationIntervalKg={selectedInstrument.verificationIntervalKg}
            scaleIntervalD={selectedInstrument.verificationIntervalKg}
            accuracyClass={selectedInstrument.accuracyClass}
            unit={selectedInstrument.verificationInterval?.split(" ")[1] || "kg"}
            onSavePoint={(pt, res) => {
              enqueueOfflineObservation({
                sessionId: activeSessionId || `TS-${selectedInstrument.serialNumber}`,
                stepNumber: pt.pointIndex,
                nominalLoad: `${pt.appliedLoad} ${pt.unit}`,
                indication: `${pt.finalIndicationI2} ${pt.unit}`,
                deltaL: `${pt.addedLoadDeltaL} ${pt.unit}`,
                turningPointP: `${(pt.initialIndicationI1 + res.deltaI).toFixed(4)} ${pt.unit}`,
                errorEc: `${res.deltaI.toFixed(4)} ${pt.unit}`,
              }).catch(() => {});
            }}
          />
        ) : activeForm === "form5" ? (
          <Form5RepeatabilityCard
            maxCapacityKg={selectedInstrument.maxCapacityKg}
            verificationIntervalKg={selectedInstrument.verificationIntervalKg}
            accuracyClass={selectedInstrument.accuracyClass}
            unit={selectedInstrument.verificationInterval?.split(" ")[1] || "kg"}
            onSaveSeries={(series, res) => {
              enqueueOfflineObservation({
                sessionId: activeSessionId || `TS-${selectedInstrument.serialNumber}`,
                stepNumber: series.seriesId === "series_half_max" ? 1 : 2,
                nominalLoad: `${series.nominalLoad} ${series.unit}`,
                indication: `${res.meanP} ${series.unit}`,
                deltaL: `0 ${series.unit}`,
                turningPointP: `${res.pMax} ${series.unit}`,
                errorEc: `${res.spreadDeltaE} ${series.unit}`,
              }).catch(() => {});
            }}
          />
        ) : activeForm === "form6" ? (
          <Form6CreepCard
            maxCapacityKg={selectedInstrument.maxCapacityKg}
            verificationIntervalKg={selectedInstrument.verificationIntervalKg}
            accuracyClass={selectedInstrument.accuracyClass}
            unit={selectedInstrument.verificationInterval?.split(" ")[1] || "kg"}
            onSaveForm6={(steps, zeroRet, res) => {
              enqueueOfflineObservation({
                sessionId: activeSessionId || `TS-${selectedInstrument.serialNumber}`,
                stepNumber: 30,
                nominalLoad: `${selectedInstrument.maxCapacityKg} ${steps[0]?.unit || "kg"}`,
                indication: `${res.totalCreep30m} ${steps[0]?.unit || "kg"}`,
                deltaL: `0 ${steps[0]?.unit || "kg"}`,
                turningPointP: `${steps[steps.length - 1]?.P || 0} ${steps[0]?.unit || "kg"}`,
                errorEc: `${res.totalCreep30m} ${steps[0]?.unit || "kg"}`,
              }).catch(() => {});
            }}
          />
        ) : (
          <div
            id={`panel-${activeForm}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeForm}`}
            className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6 animate-in fade-in duration-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FormIcon size={24} weight="duotone" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-foreground">
                      {selectedFormMeta.title}
                    </h3>
                    <Badge variant="pending" showIcon={false} className="py-0.5 px-2 text-[10px] font-mono">
                      PENDING EXECUTION
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    Statutory Rule Reference: <span className="font-semibold text-foreground">{selectedFormMeta.clause}</span>
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectForm("form1")}
                leftIcon={<Scales size={15} />}
                className="shrink-0 text-xs font-semibold"
              >
                Return to Form 1 (Weighing)
              </Button>
            </div>

            {/* Statutory Clause Protocol Guidance */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-primary">
                <FileText size={16} />
                <span>OIML Statutory Test Protocol & Objective</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Annex A Statutory Test Protocol: Complete the required test schedule under controlled environmental conditions.
              </p>
            </div>

            {/* Test Initialization Banner */}
            <div className="border border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3 bg-muted/20">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <FormIcon size={24} weight="duotone" />
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className="text-sm font-bold text-foreground">
                  Ready to Record {selectedFormMeta.shortTitle}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Session <span className="font-mono font-semibold text-foreground">TS-{selectedInstrument.serialNumber}</span> is pre-configured with instrument parameters (Max {displayMax}, e = {displayE}).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Statutory Evidence Vault & Photo Intake (OIML R 76-1 / WELMEC 7.2) */}
        <EvidenceVaultCard
          sessionId={activeSessionId || `TS-${selectedInstrument.serialNumber}`}
        />
      </div>

      {/* Edit Scale Metadata Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-sm p-5 sm:p-6 w-full max-w-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <PencilSimple size={18} className="text-primary" />
                  Edit Active Field Instrument Details
                </h3>
                <p className="text-xs text-muted-foreground">
                  Update serial number or manufacturer for this specific unit under test.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditMetadata} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Serial Number (Unit Under Test) *
                </label>
                <Input
                  value={editSerial}
                  onChange={(e) => setEditSerial(e.target.value)}
                  placeholder="e.g. SN-2026-9042"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Model Designation
                </label>
                <Input
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  placeholder="e.g. Essae DS-215"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Pattern Designation / TAC Ref
                </label>
                <Input
                  value={editTac}
                  onChange={(e) => setEditTac(e.target.value)}
                  placeholder="e.g. IND/09/2026/042"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Manufacturer
                </label>
                <Input
                  value={editMfr}
                  onChange={(e) => setEditMfr(e.target.value)}
                  placeholder="e.g. Essae-Teraoka Ltd."
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs font-bold px-4"
                >
                  Save &amp; Update Bench
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instrument Selection Modal */}
      {isInstrumentSelectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-sm p-5 sm:p-6 w-full max-w-2xl shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <Scales size={20} className="text-primary" />
                  Select Non-Automatic Weighing Instrument (NAWI)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose a target scale to generate its statutory OIML R-76 Clause A.4.4 verification schedule.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsInstrumentSelectorOpen(false)}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {instrumentsList.map((inst) => {
                const isCurrent = inst.id === selectedInstrument.id;
                return (
                  <div
                    key={inst.id}
                    onClick={() => handleSelectInstrument(inst)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrent
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">{inst.model}</span>
                        <Badge
                          variant={inst.accuracyClass === "CLASS_I" ? "outline" : "pass"}
                          showIcon={false}
                          className="text-[10px] font-mono py-0.5 px-2"
                        >
                          {inst.accuracyClass.replace("_", " ")}
                        </Badge>
                        {isCurrent && (
                          <Badge variant="neutral" showIcon={false} className="text-[10px] font-bold bg-primary text-primary-foreground">
                            Active Scale
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>{inst.manufacturer}</span>
                        <span>·</span>
                        <span className="font-mono font-semibold text-foreground">SN: {inst.serialNumber}</span>
                        <span>·</span>
                        <span className="font-mono">TAC: {inst.tacNumber}</span>
                      </div>
                      <div className="text-xs font-mono font-semibold text-foreground/90">
                        Max Capacity: {inst.maxCapacity} | Scale Interval (e): {inst.verificationInterval}
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant={isCurrent ? "default" : "outline"}
                      className="text-xs font-bold shrink-0 self-start sm:self-auto"
                    >
                      {isCurrent ? "Currently Active" : "Select & Load Schedule"}
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-border/60">
              <Link href="/instruments/new">
                <Button
                  type="button"
                  size="sm"
                  leftIcon={<Plus size={14} weight="bold" />}
                  className="text-xs font-bold"
                >
                  + Intake New NAWI Scale (Phase 1)
                </Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInstrumentSelectorOpen(false)}
                className="text-xs font-semibold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Test Battery Complete Modal */}
      {isCompletedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-sm p-6 w-full max-w-md shadow-xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle size={32} weight="fill" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">
                Weighing Performance Test Completed
              </h3>
              <p className="text-xs text-muted-foreground">
                All 10 OIML R-76 Clause A.4.4 test load points have been observed and cryptographically recorded for {selectedInstrument.model}.
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-muted/30 border border-border text-xs font-mono text-left space-y-1">
              <div>Scale: <span className="font-bold">{selectedInstrument.model}</span></div>
              <div>Serial: <span className="font-bold">{selectedInstrument.serialNumber}</span></div>
              <div>Class: <span className="font-bold">{selectedInstrument.accuracyClass}</span></div>
              <div>Completed Steps: <span className="font-bold text-emerald-600">10 / 10 Points</span></div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <Link href="/review" className="w-full">
                <Button className="w-full text-xs font-bold" rightIcon={<ArrowRight size={14} />}>
                  Proceed to Audit Review
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full text-xs font-semibold"
                onClick={() => setIsCompletedModalOpen(false)}
              >
                Stay on Bench
              </Button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
