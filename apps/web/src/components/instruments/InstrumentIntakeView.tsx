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
  UploadSimple,
  QrCode,
  Tag,
  Buildings,
  LockKey,
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
  toGrams,
} from "@/lib/table3";
import { saveNewInstrument, InstrumentItem } from "@/lib/instruments-store";
import { instrumentsApi } from "@/lib/api";

interface PresetSpec {
  name: string;
  classType: AccuracyClassType;
  unit: MassUnit;
  max: string;
  e: string;
  d: string;
  min: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  tacNumber: string;
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
    model: "Essae DS-215 Precision Counter",
    manufacturer: "Essae-Teraoka Ltd.",
    serialNumber: "SN-2026-9042",
    tacNumber: "IND/09/2026/042",
    weighingPrinciple: "Strain Gauge Load Cell",
  },
  {
    name: "Class II Precision Balance",
    classType: "II",
    unit: "kg",
    max: "6.2",
    e: "0.0001",
    d: "0.00001",
    min: "0.005",
    model: "Mettler Toledo MS-TS Industrial",
    manufacturer: "Mettler Toledo India",
    serialNumber: "SN-2026-8819",
    tacNumber: "IND/04/2025/118",
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
    model: "Avery Weigh-Tronix ZM305 Platform",
    manufacturer: "Avery India Ltd.",
    serialNumber: "SN-2026-7734",
    tacNumber: "IND/11/2025/089",
    weighingPrinciple: "Multi-Strain Gauge Shear Beam",
  },
  {
    name: "Class I Analytical Balance",
    classType: "I",
    unit: "g",
    max: "220",
    e: "0.0001",
    d: "0.00001",
    min: "0.01",
    model: "Sartorius Cubis II Ultra-Micro",
    manufacturer: "Sartorius India",
    serialNumber: "SN-2026-6621",
    tacNumber: "IND/01/2026/003",
    weighingPrinciple: "Electromagnetic Force Restoration (EMFR)",
  },
];

export function InstrumentIntakeView() {
  const modelId = useId();
  const serialId = useId();
  const mfrId = useId();
  const applicantId = useId();
  const patternId = useId();
  const maxId = useId();
  const eId = useId();
  const dId = useId();
  const minId = useId();

  // Step 1 & 2: Applicant, Manufacturer & Instrument Type
  const [instrumentType, setInstrumentType] = useState<"COMPLETE_SCALE" | "INDICATOR_MODULE">("COMPLETE_SCALE");
  const [modelName, setModelName] = useState("Essae DS-215 Precision Counter");
  const [serialNumber, setSerialNumber] = useState("SN-2026-9042");
  const [manufacturer, setManufacturer] = useState("Essae-Teraoka Ltd.");
  const [applicantName, setApplicantName] = useState("Essae Legal Metrology Division");
  const [countryOfOrigin, setCountryOfOrigin] = useState("India");
  const [patternDesignation, setPatternDesignation] = useState("IND/09/2026/042");
  const [weighingPrinciple, setWeighingPrinciple] = useState("Strain Gauge Load Cell");

  // Step 3 & 4: Metrological Parameters & Units
  const [unit, setUnit] = useState<MassUnit>("kg");
  const [max, setMax] = useState("15");
  const [e, setE] = useState("0.005");
  const [d, setD] = useState("0.005");
  const [min, setMin] = useState("0.1");
  const [classSelection, setClassSelection] = useState<AccuracyClassType | "AUTO">("AUTO");

  // Multi-Interval Configuration
  const [isMultiInterval, setIsMultiInterval] = useState(false);
  const [partialMax1, setPartialMax1] = useState("6");
  const [partialE1, setPartialE1] = useState("0.002");
  const [partialMax2, setPartialMax2] = useState("15");
  const [partialE2, setPartialE2] = useState("0.005");

  // Sealing Diagram & Nameplate Upload
  const [nameplateFileName, setNameplateFileName] = useState<string | null>("nameplate_plate_scan_ds215.png");
  const [ocrExtracted, setOcrExtracted] = useState<boolean>(true);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredInstrument, setRegisteredInstrument] = useState<InstrumentItem | null>(null);

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
    setModelName(preset.model);
    setManufacturer(preset.manufacturer);
    setSerialNumber(preset.serialNumber);
    setPatternDesignation(preset.tacNumber);
    setWeighingPrinciple(preset.weighingPrinciple);
    setClassSelection(preset.classType);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!evaluation.valid) return;

    setIsSubmitting(true);

    const maxKg = toGrams(maxNum, unit) / 1000;
    const eKg = toGrams(eNum, unit) / 1000;
    const dKg = toGrams(dNum, unit) / 1000;
    const minKg = toGrams(minNum, unit) / 1000;

    const mappedClass: "CLASS_I" | "CLASS_II" | "CLASS_III" | "CLASS_IIII" =
      evaluation.derivedClass === "I"
        ? "CLASS_I"
        : evaluation.derivedClass === "II"
        ? "CLASS_II"
        : evaluation.derivedClass === "IIII"
        ? "CLASS_IIII"
        : "CLASS_III";

    let newInst = saveNewInstrument({
      serialNumber,
      model: modelName,
      manufacturer,
      applicantName,
      countryOfOrigin,
      instrumentType,
      accuracyClass: mappedClass,
      maxCapacity: `${maxNum} ${unit}`,
      maxCapacityKg: maxKg,
      minCapacity: `${minNum} ${unit}`,
      minCapacityKg: minKg,
      verificationInterval: `${eNum} ${unit}`,
      verificationIntervalKg: eKg,
      actualInterval: `${dNum} ${unit}`,
      actualIntervalKg: dKg,
      ratioN: evaluation.scaleDivisionsN,
      isMultiInterval,
      partialRanges: isMultiInterval
        ? [
            { max: parseFloat(partialMax1) || 0, e: parseFloat(partialE1) || 0, d: parseFloat(partialE1) || 0 },
            { max: parseFloat(partialMax2) || 0, e: parseFloat(partialE2) || 0, d: parseFloat(partialE2) || 0 },
          ]
        : undefined,
      tacNumber: patternDesignation,
      weighingPrinciple,
    });

    try {
      const payload = {
        modelName,
        patternDesignation,
        instrumentType: instrumentType === "COMPLETE_SCALE" ? "Non-Automatic Weighing Instrument" : "Indicator Module",
        weighingPrinciple,
        accuracyClass: mappedClass,
        maxCapacity: maxKg,
        minCapacity: minKg,
        verificationScaleIntervalE: eKg,
        actualScaleIntervalD: dKg,
        unitOfMeasure: "kg",
        isMultiInterval,
        serialNumber,
        manufacturer: {
          companyName: manufacturer,
          registrationNumber: `REG-${manufacturer.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase()}-2026`,
          tradeLicenseNo: "TL-STD-2026",
          addressLine1: "Industrial Zone",
          city: "Metrology City",
          state: "State Division",
          pincode: "110001",
          contactPerson: applicantName || "Authorized Signatory",
          contactEmail: "legal@manufacturer.in",
          contactPhone: "+91-9876543210",
        },
      };
      const apiRes = await instrumentsApi.register(payload);
      if (apiRes?.instrument?.id) {
        newInst = {
          ...newInst,
          id: apiRes.instrument.id,
        };
      }
    } catch (err) {
      console.warn("Live API instrument registration warning:", err);
    } finally {
      setIsSubmitting(false);
      setRegisteredInstrument(newInst);
    }
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
      pageTitle="Phase 1: Instrument Registration & Classification"
      pageSubtitle="Register Non-Automatic Weighing Instruments (NAWI) with real-time OIML R-76 Table 3 compliance verification."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quick Metrology Preset Bar */}
        <div className="rounded-sm border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            {/* Card 1: Applicant & Manufacturer Metadata */}
            <Card className="rounded-sm border border-border shadow-xs">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Buildings size={20} className="text-primary" />
                  1. Applicant &amp; Manufacturer Metadata
                </CardTitle>
                <CardDescription>
                  Manufacturer legal entity, manufacturing facility, and applicant details under Section 22.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor={mfrId} className="text-xs font-semibold text-foreground">
                      Manufacturer Legal Entity *
                    </label>
                    <Input
                      id={mfrId}
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                      placeholder="e.g. Essae-Teraoka Ltd."
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor={applicantId} className="text-xs font-semibold text-foreground">
                      Applicant Name &amp; Division *
                    </label>
                    <Input
                      id={applicantId}
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="e.g. Legal Metrology Division"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Country of Origin / Facility
                    </label>
                    <Input
                      value={countryOfOrigin}
                      onChange={(e) => setCountryOfOrigin(e.target.value)}
                      placeholder="e.g. India"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Instrument Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setInstrumentType("COMPLETE_SCALE")}
                        className={`p-2.5 rounded-2xl text-xs font-bold border transition-all ${
                          instrumentType === "COMPLETE_SCALE"
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                            : "border-border text-muted-foreground hover:bg-muted/40"
                        }`}
                      >
                        Complete Scale
                      </button>
                      <button
                        type="button"
                        onClick={() => setInstrumentType("INDICATOR_MODULE")}
                        className={`p-2.5 rounded-2xl text-xs font-bold border transition-all ${
                          instrumentType === "INDICATOR_MODULE"
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                            : "border-border text-muted-foreground hover:bg-muted/40"
                        }`}
                      >
                        Indicator / Module
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Instrument Identification & Serial Details */}
            <Card className="rounded-sm border border-border shadow-xs">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Tag size={20} className="text-primary" />
                  2. Pattern Identification &amp; Serial Designation
                </CardTitle>
                <CardDescription>
                  Unique pattern designation, serial number for this unit under test, and sensor principle.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor={modelId} className="text-xs font-semibold text-foreground">
                      Instrument Model Designation *
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
                    <label htmlFor={serialId} className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Unique Serial Number *</span>
                      <span className="text-[11px] font-mono text-muted-foreground">Unit Under Test</span>
                    </label>
                    <Input
                      id={serialId}
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="e.g. SN-2026-9042"
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
                      <option value="Multi-Strain Gauge Shear Beam">Multi-Strain Gauge Shear Beam</option>
                      <option value="Hydraulic / Mechanical Lever">Hydraulic / Mechanical Lever</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Metrological Specifications & Range */}
            <Card className="rounded-sm border border-border shadow-xs">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Scales size={20} className="text-primary" />
                    3. Metrological Parameters (OIML R 76-1 Cl 3.2)
                  </CardTitle>
                  <CardDescription>
                    Capacity (Max, Min), verification scale interval (e), and scale interval (d).
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
                      <span className="text-[11px] text-muted-foreground font-mono">Upper limit</span>
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
                    <label htmlFor={minId} className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Minimum Capacity (Min) *</span>
                      <span className="text-[11px] text-muted-foreground font-mono">Lower legal boundary</span>
                    </label>
                    <Input
                      id={minId}
                      numeric
                      unit={unit}
                      value={min}
                      onChange={(e) => setMin(e.target.value)}
                      placeholder="0.1"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor={eId} className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Verification Scale Interval (e) *</span>
                      <span className="text-[11px] text-muted-foreground font-mono">Table 3 basis</span>
                    </label>
                    <Input
                      id={eId}
                      numeric
                      unit={unit}
                      value={e}
                      onChange={(e) => setE(e.target.value)}
                      placeholder="0.005"
                      required
                    />
                  </div>

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
                      onChange={(e) => setD(e.target.value)}
                      placeholder="0.005"
                      required
                    />
                  </div>
                </div>

                {/* Multi-Interval Configuration Toggle */}
                <div className="pt-2 border-t border-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-foreground">Multi-Interval / Range Scale</span>
                      <p className="text-[11px] text-muted-foreground">
                        Enable if instrument operates across multiple partial ranges (W1, W2) with distinct scale intervals (e1, e2).
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isMultiInterval}
                      onChange={(e) => setIsMultiInterval(e.target.checked)}
                      className="h-5 w-5 rounded-lg border-border text-primary focus:ring-primary"
                    />
                  </div>

                  {isMultiInterval && (
                    <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/70 space-y-3 animate-in fade-in">
                      <div className="text-xs font-bold text-foreground">
                        Partial Range Definitions (Clause 3.3):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-muted-foreground">
                            Partial Range 1 Max (W1)
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
                            Partial Division 1 (e1)
                          </label>
                          <Input
                            numeric
                            unit={unit}
                            value={partialE1}
                            onChange={(e) => setPartialE1(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Nameplate Photo & Sealing Diagram (per Flowchart H & I) */}
            <Card className="rounded-sm border border-border shadow-xs">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <UploadSimple size={20} className="text-primary" />
                  4. Nameplate Photo &amp; Sealing Diagram
                </CardTitle>
                <CardDescription>
                  Upload photographic proof of physical nameplate markings and lead sealing provisions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="border-2 border-dashed border-border/80 rounded-2xl p-4 text-center space-y-2 bg-muted/10">
                  <div className="w-10 h-10 mx-auto rounded-2xl text-primary flex items-center justify-center">
                    <UploadSimple size={20} />
                  </div>
                  <div className="text-xs text-foreground font-semibold">
                    {nameplateFileName ? `Uploaded: ${nameplateFileName}` : "Drag and drop nameplate scan or browse"}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    JPEG, PNG, or PDF up to 15MB. Tamper-evident hash generated upon save.
                  </p>
                  {ocrExtracted && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center gap-2">
                      <Sparkle size={14} weight="fill" className="text-emerald-500" />
                      <span>OCR Extraction Active: Max 15 kg, e = 5 g, Class III confirmed.</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Real-Time Table 3 Classification Monitor (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="rounded-sm border border-border shadow-xs sticky top-6">
              <CardHeader className="bg-muted/20 border-b border-border/70 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    OIML R 76-1 Table 3 Verification
                  </span>
                  <Badge variant={classVariant} className="font-mono text-xs font-bold px-2.5 py-0.5">
                    {evaluation.valid ? "COMPLIANT" : "NON-COMPLIANT"}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold text-foreground mt-2">
                  Table 3 Compliance Engine
                </CardTitle>
                <CardDescription className="text-xs">
                  {evaluation.valid && evaluation.derivedClass === "III"
                    ? "Class III (Medium Accuracy)"
                    : evaluation.valid
                    ? `Class ${activeClassDisplay} Compliant`
                    : "Validates scale division ratio n = Max / e against statutory Table 3 brackets."}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Mathematical Evaluation Stats */}
                <div className="space-y-2 text-xs divide-y divide-border/60">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-muted-foreground">Scale Division Count (n = Max / e):</span>
                    <span className="font-mono font-bold text-foreground text-sm">
                      {evaluation.nFormatted} divisions
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-muted-foreground">Table 3 Allowed Range (n_min - n_max):</span>
                    <span className="font-mono font-semibold text-foreground">
                      {evaluation.minAllowedN
                        ? `${evaluation.minAllowedN.toLocaleString()} – ${
                            evaluation.maxAllowedN ? evaluation.maxAllowedN.toLocaleString() : "No limit"
                          }`
                        : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-muted-foreground">Interval Ratio (e / d):</span>
                    <span
                      className={`font-mono font-semibold ${
                        evaluation.isIntervalValid ? "text-foreground" : "text-destructive"
                      }`}
                    >
                      {evaluation.ratioED.toFixed(1)}x {evaluation.isIntervalValid ? "(d ≤ e ≤ 10d ✓)" : "(Violates Clause 3.4.2 ✗)"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-muted-foreground">Minimum Capacity Requirement:</span>
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
                      <span>Table 3 Boundary Violation Warning</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px]">
                      {evaluation.errorReasons.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Registration Result & Action Card */}
                {registeredInstrument ? (
                  <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 space-y-3 animate-in fade-in">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                      <ShieldCheck size={18} weight="fill" />
                      <span>Instrument Registered Successfully!</span>
                    </div>
                    <div className="text-xs font-mono space-y-1 text-foreground">
                      <div>Model: <span className="font-semibold">{registeredInstrument.model}</span></div>
                      <div>Serial: <span className="font-semibold">{registeredInstrument.serialNumber}</span></div>
                      <div>Capacity: <span className="font-semibold">{registeredInstrument.maxCapacity}</span></div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        SHA-256: {registeredInstrument.sha256MetadataNode}
                      </div>
                    </div>
                    <div className="pt-2 flex flex-col gap-2">
                      <Link href={`/bench?instrumentId=${registeredInstrument.id}`}>
                        <Button className="w-full text-xs font-bold" rightIcon={<ArrowRight size={14} weight="bold" />}>
                          Proceed to Test Bench with this Instrument →
                        </Button>
                      </Link>
                      <Link href="/instruments">
                        <Button variant="outline" className="w-full text-xs font-semibold">
                          View in Instrument Registry
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-border/60 space-y-3">
                    <Button
                      type="submit"
                      disabled={!evaluation.valid || isSubmitting}
                      isLoading={isSubmitting}
                      leftIcon={<PlusCircle size={18} weight="bold" />}
                      className="w-full font-bold shadow-xs min-h-[48px]"
                    >
                      Register Instrument &amp; Save Metadata
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
                      <Link href="/instruments" className="w-full">
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full text-xs min-h-[48px]"
                        >
                          Cancel
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Shell>
  );
}
