import { WeightClass } from "./metrology.js";

export interface WeightCertificate {
  id?: string;
  referenceStandardId?: string;
  certificateNumber: string;
  calibratingAgency: string;
  nablCertNo: string;
  calibrationDate: string;
  expiryDate: string;
  expandedUncertaintyU: string;
  uncertaintyUnit?: string;
  coverageFactorK: string;
  certificatePdfUrl?: string;
  isActive?: boolean;
}

export interface ReferenceStandard {
  id?: string;
  laboratoryId: string;
  identificationCode: string;
  oimlClass: WeightClass | string;
  manufacturerName?: string;
  material?: string;
  nominalMassMin: string;
  nominalMassMax: string;
  isActive?: boolean;
}

export interface NABLPreCheckResult {
  compliant: boolean;
  actualUncertainty: string;
  maxAllowedUncertainty: string;
  mpeApplied?: string;
  loadPoint?: string;
  ratioToMpe?: string;
  weightId?: string;
  unit?: string;
  warningMessage?: string;
}

export interface NABLBatchPreCheckResult {
  allCompliant: boolean;
  results: NABLPreCheckResult[];
  failingCount: number;
  passingCount: number;
  summaryWarning?: string;
}

export type AnomalySeverity = "CRITICAL" | "WARNING" | "INFO";

export type AnomalyCode =
  | "ANOMALY_NON_MONOTONIC_INDICATION"
  | "ANOMALY_EXCESSIVE_DELTA_L"
  | "ANOMALY_NEGATIVE_DELTA_L"
  | "ANOMALY_TEMPERATURE_DRIFT_EXCEEDED"
  | "ANOMALY_TEMPERATURE_OUT_OF_RANGE"
  | "ANOMALY_TARE_SANITY_FAILED"
  | "ANOMALY_NEGATIVE_INDICATION"
  | "ANOMALY_OVERLOAD_EXCEEDED"
  | "ANOMALY_NEGATIVE_LOAD";

export interface AnomalyFlag {
  code: AnomalyCode | string;
  severity: AnomalySeverity;
  rule: string;
  message: string;
  loadPoint?: string;
  details?: Record<string, any>;
}

export interface AnomalyAuditReport {
  hasAnomalies: boolean;
  totalAnomalies: number;
  criticalCount: number;
  warningCount: number;
  flags: AnomalyFlag[];
  summary: string;
}

export type ProvenanceNodeType =
  | "SESSION_INIT"
  | "OBSERVATION_LOG"
  | "CALCULATION_RUN"
  | "REVIEW_AUDIT"
  | "PDF_SIGN";

export interface ProvenanceNode {
  id?: string;
  testSessionId?: string;
  nodeSequence?: number;
  nodeId?: string;
  parentNodeId?: string;
  eventType?: string;
  nodeType?: ProvenanceNodeType | string;
  previousNodeHashSha256?: string;
  payloadHash: string;
  payloadHashSha256?: string;
  currentNodeHashSha256?: string;
  merkleRoot?: string;
  timestamp: string;
  createdAt?: string;
}

export interface DigitalSignatureMetadata {
  id?: string;
  testSessionId?: string;
  signerUserId?: string;
  signerRole?: string;
  certificateDn: string;
  serialNumber: string;
  signingTime: string;
  sha256Digest: string;
  pdfBinaryHashSha256?: string;
  x509CertificateSerial?: string;
  pkiSignatureValueBase64?: string;
  timestampTokenBase64?: string;
  valid: boolean;
}

export interface PublicVerificationResult {
  valid: boolean;
  sessionNumber: string;
  instrumentModel: string;
  manufacturer: string;
  laboratoryName: string;
  signedAt: string;
  signerName: string;
  pdfSha256: string;
  tamperDetected: boolean;
  message?: string;
}
