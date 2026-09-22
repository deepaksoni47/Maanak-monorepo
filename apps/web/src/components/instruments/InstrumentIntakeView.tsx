"use client";

import React, { useState, useId } from "react";
import Link from "next/link";
import {
  Scales,
  CheckCircle,
  XCircle,
  Warning,
  Sparkle,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  Info,
  FloppyDisk,
  Lightning,
  Hash,
} from "@phosphor-icons/react";
import { Shell } from "@/components/layout/Shell";
import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  evaluateTable3Classification,
  MassUnit,
  AccuracyClassType,
} from "@/lib/table3";

interface PresetSpec {
  name: string;
  classType: AccuracyClassType;
  unit: MassUnit;
  max: string;
  e: string;
  d: string;
  min: string;
  weighingPrinciple: string;
}

const PRESETS: PresetSpec[] = [
  {
    name: "Class III Retail Bench Scale",
    classType: "III",
    unit: "kg",
    max: "15",
    e: "0.005",
    d: "0.005",
    min: "0.1",
    weighingPrinciple: "Strain Gauge Load Cell",
  },
  {
    name: "Class II Precision Balance",
    classType: "II",
    unit: "g",
    max: "300",
    e: "0.01",
    d: "0.01",
    min: "0.2",
    weighingPrinciple: "Electromagnetic Force Restoration (EMFR)",
  },
  {
    name: "Class I Analytical Balance",
    classType: "I",
    unit: "g",
    max: "200",
    e: "0.001",
    d: "0.0001",
    min: "0.1",
    weighingPrinciple: "Electromagnetic Force Restoration (EMFR)",
  },
  {
    name: "Class IIII Industrial Platform",
    classType: "IIII",
    unit: "kg",
    max: "20",
    e: "0.05",
    d: "0.05",
    min: "0.5",
    weighingPrinciple: "Multi-Strain Gauge Shear Beam",
  },
];

export function InstrumentIntakeView() {
  const modelId = useId();
  const mfrId = useId();
  const patternId = useId();
  const maxId = useId();
  const eId = useId();
  const dId = useId();
  const minId = useId();

  // General Instrument State
  const [modelName, setModelName] = useState("Essae DS-215");
  const [manufacturer, setManufacturer] = useState("Essae-Teraoka Ltd.");
  const [patternDesignation, setPatternDesignation] = useState("IND/09/2026/042");
  const [weighingPrinciple, setWeighingPrinciple] = useState("Strain Gauge Load Cell");

  // Metrological Parameters State
  const [unit, setUnit] = useState<MassUnit>("kg");
  const [max, setMax] = useState("15");
  const [e, setE] = useState("0.005");
  const [d, setD] = useState("0.005");
  const [min, setMin] = useState("0.1");
  const [classSelection, setClassSelection] = useState<AccuracyClassType | "AUTO">("AUTO");
  const [isMultiInterval, setIsMultiInterval] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Partial ranges for multi-interval
  const [partialMax1, setPartialMax1] = useState("6");
  const [partialE1, setPartialE1] = useState("0.002");

  // Reactive Table 3 Evaluation
  const maxNum = parseFloat(max) || 0;
  const eNum = parseFloat(e) || 0;
  const dNum = parseFloat(d) || eNum;
  const minNum = parseFloat(min) || 0;

  const evaluation = evaluateTable3Classification({
    max: maxNum,
    maxUnit: unit,
    e: eNum,
    eUnit: unit,
    d: dNum,
    dUnit: unit,
    min: minNum,
    minUnit: unit,
    requestedClass: classSelection === "AUTO" ? undefined : classSelection,
  });

  const applyPreset = (preset: PresetSpec) => {
    setUnit(preset.unit);
    setMax(preset.max);
    setE(preset.e);
    setD(preset.d);
    setMin(preset.min);
    setWeighingPrinciple(preset.weighingPrinciple);
    setClassSelection(preset.classType);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!evaluation.valid) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedSuccess(true);
    }, 600);
  };

  const activeClassDisplay = evaluation.derivedClass || "Unclassified";
  const classVariant: BadgeVariant = evaluation.valid ? "pass" : "fail";

  return (
    <Shell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Instrument Intake" },
      ]}
      pageTitle="Instrument Intake & Table 3 Classification"
      pageSubtitle="Register Non-Automatic Weighing Instruments (NAWI) with real-time OIML R-76 Table 3 compliance verification."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quick Metrology Preset Bar */}
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Lightning size={16} weight="fill" className="text-primary" />
            <span>Load Quick Laboratory Preset:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-background hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all min-h-[48px] inline-flex items-center cursor-pointer"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Workbench Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Specifications (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card 1: Pattern Identification */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  1. Instrument Identification & Pattern Approval
                </CardTitle>
                <CardDescription>
                  Manufacturer legal entity and Legal Metrology Division registration details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor={modelId} className="text-xs font-semibold text-foreground">
                      Instrument Model Name *
                    </label>
                    <Input
                      id={modelId}
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="e.g. Essae DS-215"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor={mfrId} className="text-xs font-semibold text-foreground">
                      Manufacturer / Applicant *
                    </label>
                    <Input
                      id={mfrId}
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                      placeholder="e.g. Essae-Teraoka Ltd."
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor={patternId} className="text-xs font-semibold text-foreground">
                      Pattern Designation / TAC Ref *
                    </label>
                    <Input
                      id={patternId}
                      value={patternDesignation}
                      onChange={(e) => setPatternDesignation(e.target.value)}
                      placeholder="IND/09/2026/042"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Weighing Principle
                    </label>
                    <select
                      value={weighingPrinciple}
                      onChange={(e) => setWeighingPrinciple(e.target.value)}
                      className="w-full h-11 min-h-[48px] rounded-2xl border border-border bg-input/50 px-4 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background"
                    >
                      <option value="Strain Gauge Load Cell">Strain Gauge Load Cell</option>
                      <option value="Electromagnetic Force Restoration (EMFR)">
                        Electromagnetic Force Restoration (EMFR)
                      </option>
                      <option value="Tuning Fork Sensor">Tuning Fork Sensor</option>
                      <option value="Surface Acoustic Wave (SAW)">Surface Acoustic Wave (SAW)</option>
                      <option value="Hydraulic / Mechanical Lever">Hydraulic / Mechanical Lever</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Metrological Specifications & Range */}
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">
                    2. Metrological Parameters (OIML R 76-1 Cl 3.2)
                  </CardTitle>
                  <CardDescription>
                    Enter capacity, verification scale interval, and scale division parameters.
                  </CardDescription>
                </div>
                {/* Unit of Measure Selector */}
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-2xl shrink-0">
                  {(["kg", "g", "mg"] as MassUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all min-h-[36px] ${
                        unit === u
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor={maxId} className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Maximum Capacity (Max) *</span>
                      <span className="text-[11px] text-muted-foreground font-mono">Upper range limit</span>
                    </label>
                    <Input
                      id={maxId}
                      numeric
                      unit={unit}
                      value={max}
                      onChange={(e) => setMax(e.target.value)}
                      placeholder="15"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor={eId} className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Verification Scale Interval (e) *</span>
                      <span className="text-[11px] text-muted-foreground font-mono">OIML Table 3 basis</span>
                    </label>
                    <Input
                      id={eId}
                      numeric
                      unit={unit}
                      value={e}
                      onChange={(evt) => {
                        const val = evt.target.value;
                        setE(val);
                        // Auto sync d if d equals previous e
                        if (d === e) setD(val);
                      }}
                      placeholder="0.005"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor={dId} className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Actual Scale Interval (d) *</span>
                      <span className="text-[11px] text-muted-foreground font-mono">d ≤ e ≤ 10d</span>
                    </label>
                    <Input
                      id={dId}
                      numeric
                      unit={unit}
                      value={d}
                      hasError={!evaluation.isIntervalValid}
                      onChange={(e) => setD(e.target.value)}
                      placeholder="0.005"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor={minId} className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Minimum Capacity (Min)</span>
                      <span className="text-[11px] text-muted-foreground font-mono">Clause 3.2 requirement</span>
                    </label>
                    <Input
                      id={minId}
                      numeric
                      unit={unit}
                      value={min}
                      onChange={(e) => setMin(e.target.value)}
                      placeholder="0.1"
                    />
                  </div>
                </div>

                {/* Target Accuracy Class Override */}
                <div className="pt-2 border-t border-border/60">
                  <label className="text-xs font-semibold text-foreground block mb-2">
                    Target Accuracy Class Selection
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(["AUTO", "I", "II", "III", "IIII"] as const).map((cls) => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => setClassSelection(cls)}
                        className={`px-3 py-2 rounded-2xl text-xs font-semibold border transition-all min-h-[48px] flex items-center justify-center gap-1.5 ${
                          classSelection === cls
                            ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                            : "border-border bg-card text-foreground hover:bg-accent"
                        }`}
                      >
                        {cls === "AUTO" ? (
                          <>
                            <Sparkle size={14} weight="fill" />
                            <span>Auto (Live)</span>
                          </>
                        ) : (
                          <span>Class {cls}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Multi-Interval Switch */}
                <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        Multi-Interval Weighing Instrument (Clause 3.3)
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Multiple partial weighing ranges with automatically ascending scale intervals ($e_i$).
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMultiInterval(!isMultiInterval)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isMultiInterval ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isMultiInterval ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {isMultiInterval && (
                    <div className="pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Partial Range 1 Max (Max₁)
                        </label>
                        <Input
                          numeric
                          unit={unit}
                          value={partialMax1}
                          onChange={(e) => setPartialMax1(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Partial Range 1 Interval (e₁)
                        </label>
                        <Input
                          numeric
                          unit={unit}
                          value={partialE1}
                          onChange={(e) => setPartialE1(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live Table 3 Metrological Classification Card (5 cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-14">
            <Card className={evaluation.valid ? "border-primary/40" : "border-destructive/40"}>
              <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-base flex items-center gap-1.5">
                    <Scales size={18} weight="duotone" className="text-primary" />
                    <span>Table 3 Compliance Engine</span>
                  </CardTitle>
                  <CardDescription>
                    Real-time verification against OIML R 76-1:2006 Table 3.
                  </CardDescription>
                </div>
                <Badge variant={classVariant} className="font-mono text-xs">
                  {evaluation.valid ? "COMPLIANT" : "INVALID"}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-5 pt-5">
                {/* Scale Division Count n Display */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/60">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Scale Division Count (n = Max / e)
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono tracking-tight text-foreground" data-testid="scale-divisions-n">
                      {evaluation.nFormatted}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      divisions
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <span>Formula:</span>
                    <code className="bg-background px-1.5 py-0.5 rounded font-mono text-[10px]">
                      {maxNum} {unit} ÷ {eNum} {unit}
                    </code>
                  </div>
                </div>

                {/* Determined Accuracy Class Pill */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Determined Accuracy Class
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div
                      data-testid="accuracy-class-badge"
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold shadow-xs ${
                        evaluation.valid
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-destructive/10 text-destructive border-destructive/30"
                      }`}
                    >
                      <Scales size={18} weight="bold" />
                      <span>
                        Class {activeClassDisplay}
                        {activeClassDisplay === "I" && " (Special Accuracy)"}
                        {activeClassDisplay === "II" && " (High Accuracy)"}
                        {activeClassDisplay === "III" && " (Medium Accuracy)"}
                        {activeClassDisplay === "IIII" && " (Ordinary Accuracy)"}
                      </span>
                    </div>

                    {classSelection === "AUTO" && evaluation.derivedClass && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        (Auto-classified)
                      </span>
                    )}
                  </div>
                </div>

                {/* Table 3 Limits Table Verification */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                    <span className="text-muted-foreground">Permissible n Range:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {evaluation.minAllowedN !== null ? evaluation.minAllowedN.toLocaleString() : "—"}{" "}
                      to{" "}
                      {evaluation.maxAllowedN !== null ? evaluation.maxAllowedN.toLocaleString() : "No Limit"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                    <span className="text-muted-foreground">Verification Interval (e):</span>
                    <span className="font-mono font-semibold text-foreground">
                      {eNum} {unit} ({evaluation.eInGrams} g)
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                    <span className="text-muted-foreground">Scale Interval Ratio (e / d):</span>
                    <span
                      className={`font-mono font-semibold ${
                        evaluation.isIntervalValid
                          ? "text-foreground"
                          : "text-destructive"
                      }`}
                    >
                      {evaluation.ratioED.toFixed(1)}x {evaluation.isIntervalValid ? "(d ≤ e ≤ 10d ✓)" : "(Violates Clause 3.4.2 ✗)"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-muted-foreground">Required Min Capacity:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {evaluation.minCapacityRequiredFormatted || "—"}{" "}
                      {evaluation.minCapacityFactorE && `(${evaluation.minCapacityFactorE}e)`}
                    </span>
                  </div>
                </div>

                {/* Diagnostic Feedback / Violations Alert */}
                {evaluation.valid ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                      <span>Complies with OIML R 76-1 Table 3</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      The instrument specification is fully compliant with legal metrology rules for Class {activeClassDisplay}. Ready for pattern testing.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <XCircle size={16} weight="fill" className="text-destructive" />
                      <span>Table 3 Compliance Violations</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px]">
                      {evaluation.errorReasons.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Form Action Triggers */}
                <div className="pt-3 border-t border-border/60 space-y-3">
                  <Button
                    type="submit"
                    disabled={!evaluation.valid || isSubmitting}
                    isLoading={isSubmitting}
                    leftIcon={<PlusCircle size={18} weight="bold" />}
                    className="w-full font-bold shadow-xs min-h-[48px]"
                  >
                    {submittedSuccess ? "Instrument Registered ✓" : "Register Instrument & Create Session"}
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      leftIcon={<FloppyDisk size={16} />}
                      className="w-full text-xs font-semibold min-h-[48px]"
                      onClick={() => alert("Draft specification saved locally.")}
                    >
                      Save Draft
                    </Button>
                    <Link href="/dashboard" className="w-full">
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-xs min-h-[48px]"
                      >
                        Cancel
                      </Button>
                    </Link>
                  </div>

                  {submittedSuccess && (
                    <div className="p-3 rounded-2xl bg-primary/10 border border-primary/25 text-center text-xs text-primary font-semibold">
                      Instrument registered successfully! Redirecting to test bench...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Shell>
  );
}
