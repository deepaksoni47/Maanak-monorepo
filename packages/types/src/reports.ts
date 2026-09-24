import { CalculationTraceItem } from "./session.js";
import { DigitalSignatureMetadata } from "./compliance.js";

export type { DigitalSignatureMetadata };

export interface EvidenceAttachment {
  id?: string;
  category?: "NAMEPLATE" | "SEALING" | "CHAMBER_SETUP" | "ANOMALY" | "GENERAL" | string;
  imageBuffer?: Buffer | Uint8Array;
  fileName?: string;
  mimeType?: "image/jpeg" | "image/png" | "application/pdf" | string;
  fileHashSha256?: string;
  description?: string;
  caption?: string;
  calloutNotes?: string[];
}

export interface Form1WeighingReportData {
  observations: CalculationTraceItem[];
  maxErrorToMpeRatio?: string | number;
  hysteresisMax?: string | number;
  zeroReturnError?: string | number;
  status: "PASS" | "FAIL";
}

export interface Form2TemperatureDriftReportData {
  temperatureSteps: {
    tempC: number;
    zeroIndication: number;
    error: number;
    mpe: number;
  }[];
  maxDriftRateCPerHr: number;
  maxDriftRateAllowed: number;
  status: "PASS" | "FAIL";
}

export interface Form3EccentricityReportData {
  testLoad: number;
  positions: {
    name: string;
    indication: number;
    error: number;
    mpe: number;
    pass: boolean;
  }[];
  status: "PASS" | "FAIL";
}

export interface Form4DiscriminationReportData {
  loads: {
    load: number;
    extraLoad: number;
    initialI: number;
    newI: number;
    pass: boolean;
  }[];
  status: "PASS" | "FAIL";
}

export interface Form5RepeatabilityReportData {
  runs: {
    load: number;
    count: number;
    minI: number;
    maxI: number;
    spread: number;
    maxAllowedSpread: number;
    pass: boolean;
  }[];
  status: "PASS" | "FAIL";
}

export interface Form6CreepReportData {
  testLoad: number;
  durationMinutes: number;
  initialError: number;
  maxCreepError: number;
  zeroReturnError: number;
  maxAllowedCreep: number;
  status: "PASS" | "FAIL";
}

/** Form 7: Warm-up Time Test (OIML R 76-1 Clause A.5.2) */
export interface Form7WarmUpReportData {
  warmUpMinutes: number;
  zeroErrorAtStart: number;
  zeroErrorAfterWarmUp: number;
  loadErrorAtStart: number;
  loadErrorAfterWarmUp: number;
  testLoad: number;
  mpe: number;
  status: "PASS" | "FAIL";
}

/** Form 8: Long-Term Span Stability (OIML R 76-1 Clause A.4.4.4) */
export interface Form8SpanStabilityReportData {
  initialSpan: number;
  finalSpan: number;
  spanDrift: number;
  maxAllowedDrift: number;
  testLoad: number;
  durationDays?: number;
  status: "PASS" | "FAIL";
}

/** Form 9: Tare Weighing Accuracy & Balancing (OIML R 76-1 Clause A.4.6) */
export interface Form9TareAccuracyReportData {
  tareLoad: number;
  netLoad: number;
  netIndication: number;
  netError: number;
  mpe: number;
  status: "PASS" | "FAIL";
}

/** Form 10: Voltage Variations / Mains & Battery (OIML R 76-1 Clause A.5.4) */
export interface Form10VoltageVariationReportData {
  nominalVoltage: number;
  testedVoltages: {
    voltage: number;
    indication: number;
    error: number;
    mpe: number;
    pass: boolean;
  }[];
  status: "PASS" | "FAIL";
}

/** Form 11: AC Mains Dips & Short Interruptions (OIML R 76-1 Annex B.3.1) */
export interface Form11MainsDipsReportData {
  reductionPercent: number;
  cyclesCount: number;
  maxObservedFault: number;
  significantFaultLimit: number;
  status: "PASS" | "FAIL";
}

/** Form 12: Electrical Fast Transient / Burst Disturbance (OIML R 76-1 Annex B.3.2) */
export interface Form12ElectricalBurstsReportData {
  testVoltageKv: number;
  couplingLines: string;
  maxObservedFault: number;
  significantFaultLimit: number;
  status: "PASS" | "FAIL";
}

/** Form 13: Electrostatic Discharge - ESD (OIML R 76-1 Annex B.3.3) */
export interface Form13ElectrostaticDischargeReportData {
  contactDischargeKv: number;
  airDischargeKv: number;
  dischargesCount: number;
  maxObservedFault: number;
  significantFaultLimit: number;
  status: "PASS" | "FAIL";
}

/** Form 14: Electromagnetic Immunity & Surges (OIML R 76-1 Annex B.3.4) */
export interface Form14ElectromagneticImmunityReportData {
  fieldStrengthVPerM: number;
  frequencyRangeMhz: string;
  maxObservedFault: number;
  significantFaultLimit: number;
  status: "PASS" | "FAIL";
}

export type ChecklistItemStatus = "PASS" | "FAIL" | "NA";

export interface Form15ChecklistItem {
  id: string;
  requirement: string;
  welmecClause: string;
  status: ChecklistItemStatus;
  remarks?: string;
}

export interface Form15SoftwareExaminationReportData {
  formTitle?: string;
  softwareId?: string;
  checksumHex?: string;
  welmecRiskClass?: string;
  items: Form15ChecklistItem[];
  overallStatus: "PASS" | "FAIL" | "NA";
  evaluatedBy?: string;
}

export interface Form16MarkingChecklistItem {
  id: string;
  markingItem: string;
  oimlClause: string;
  presentedValue?: string;
  status: ChecklistItemStatus;
  remarks?: string;
}

export interface Form16DescriptiveMarkingsReportData {
  formTitle?: string;
  items: Form16MarkingChecklistItem[];
  overallStatus: "PASS" | "FAIL" | "NA";
  evaluatedBy?: string;
}

export interface Form17SealingChecklistItem {
  id: string;
  sealItem: string;
  oimlClause: string;
  status: ChecklistItemStatus;
  remarks?: string;
}

export interface Form17SealingVerificationReportData {
  formTitle?: string;
  physicalSealCount?: number;
  electronicEventCounterValue?: number | string;
  items: Form17SealingChecklistItem[];
  overallStatus: "PASS" | "FAIL" | "NA";
  evaluatedBy?: string;
}

export interface OimlReportData {
  reportNumber: string;
  issueDate: string;
  evidenceAttachments?: EvidenceAttachment[];
  laboratory: {
    name: string;
    address?: string;
    accreditationNumber?: string;
    signatoryName: string;
    signatoryDesignation: string;
  };
  instrument: {
    manufacturer: string;
    model: string;
    serialNumber: string;
    accuracyClass: string;
    maxCapacity: string | number;
    minCapacity: string | number;
    verificationIntervalE: string | number;
    actualIntervalD?: string | number;
    unit: string;
  };
  environmental: {
    temperatureStartC: string | number;
    temperatureEndC: string | number;
    humidityPercent: string | number;
    barometricPressureHpa?: string | number;
  };
  provenance: {
    sessionHash: string;
    verifyBaseUrl: string;
    genesisHash?: string;
    totalChainNodes?: number;
    timestamp?: string;
  };
  results: {
    overallStatus: "PASS" | "FAIL" | "INCONCLUSIVE";
    form1Weighing: Form1WeighingReportData;
    form2TemperatureDrift?: Form2TemperatureDriftReportData;
    form3Eccentricity?: Form3EccentricityReportData;
    form4Discrimination?: Form4DiscriminationReportData;
    form5Repeatability?: Form5RepeatabilityReportData;
    form6Creep?: Form6CreepReportData;
    form7WarmUp?: Form7WarmUpReportData;
    form8SpanStability?: Form8SpanStabilityReportData;
    form9TareAccuracy?: Form9TareAccuracyReportData;
    form10VoltageVariation?: Form10VoltageVariationReportData;
    form11MainsDips?: Form11MainsDipsReportData;
    form12ElectricalBursts?: Form12ElectricalBurstsReportData;
    form13ElectrostaticDischarge?: Form13ElectrostaticDischargeReportData;
    form14ElectromagneticImmunity?: Form14ElectromagneticImmunityReportData;
    form15SoftwareExamination?: Form15SoftwareExaminationReportData;
    form16DescriptiveMarkings?: Form16DescriptiveMarkingsReportData;
    form17SealingVerification?: Form17SealingVerificationReportData;
  };
  signatureMetadata?: DigitalSignatureMetadata;
}
