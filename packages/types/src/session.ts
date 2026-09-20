import { ComplianceStatus } from "./metrology.js";

export enum TestFormType {
  FORM_1_WEIGHING = "FORM_1_WEIGHING",
  FORM_2_TEMP_DRIFT = "FORM_2_TEMP_DRIFT",
  FORM_3_ECCENTRICITY = "FORM_3_ECCENTRICITY",
  FORM_4_DISCRIMINATION = "FORM_4_DISCRIMINATION",
  FORM_5_REPEATABILITY = "FORM_5_REPEATABILITY",
  FORM_6_CREEP = "FORM_6_CREEP",
}

export enum SessionStatus {
  DRAFT = "DRAFT",
  IN_PROGRESS = "IN_PROGRESS",
  BENCH_IN_PROGRESS = "BENCH_IN_PROGRESS",
  CALCULATIONS_COMPLETE = "CALCULATIONS_COMPLETE",
  PENDING_REVIEW = "PENDING_REVIEW",
  UNDER_REVIEW = "UNDER_REVIEW",
  FLAGGED = "FLAGGED",
  REQUIRES_RETEST = "REQUIRES_RETEST",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export type LoadRunDirection = "ASCENDING" | "DESCENDING" | "NOT_APPLICABLE";

export interface ZeroCorrectionObservation {
  zeroIndicationI0: string;
  zeroDeltaL0?: string;
}

export interface RawObservation {
  id?: string;
  localId?: string;
  testSessionId?: string;
  testPlanItemId?: string;
  sequenceNumber?: number;
  testClause?: string;
  loadRunDirection?: LoadRunDirection;
  loadMass: string;
  indicatedValue: string;
  turningPointDeltaL: string;
  zeroIndicationI0?: string;
  zeroDeltaL0?: string;
  zeroCorrection?: ZeroCorrectionObservation;
  eccentricityPosition?: number;
  elapsedTimeMinutes?: string;
  activePartialRangeIndex?: number;
  temperature?: string;
  humidity?: string;
  timestamp: string;
  recordedAt?: string;
}

export interface CalculationTraceItem {
  id?: string;
  calculationRunId?: string;
  rawObservationId?: string;
  loadMass?: string;
  calculatedIndicationP: string;
  rawErrorE: string;
  zeroErrorE0: string;
  correctedErrorEc: string;
  applicableMpe: string;
  mpeBracketCategory?: string;
  complianceStatus?: ComplianceStatus;
  pass: boolean;
  formulaStepNotes?: string[];
  stepDerivationTreeJson?: string[];
}

export interface CalculationRun {
  id?: string;
  testSessionId: string;
  rulePackVersionId: string;
  executedByUserId?: string;
  executedAt?: string;
  overallComplianceStatus: ComplianceStatus;
  totalPointsEvaluated: number;
  totalPointsFailed: number;
  maxErrorToMpeRatio: string;
  traceItems?: CalculationTraceItem[];
}

export interface TestSession {
  id?: string;
  localId?: string;
  sessionNumber: string;
  laboratoryId: string;
  instrumentUnitId: string;
  testPlanId: string;
  rulePackVersionId: string;
  testingOfficerId: string;
  status: SessionStatus;
  startedAt: string;
  completedAt?: string;
  syncStatus?: "PENDING" | "SYNCED" | "CONFLICT";
  deviceId?: string;
  serverSyncedAt?: string;
}

export interface SessionEnvironmentalLog {
  id?: string;
  testSessionId: string;
  loggedAt: string;
  temperatureC: string;
  relativeHumidityPercent: string;
  barometricPressureHpa?: string;
  tempDriftRateCPerHr?: string;
  isTempStable?: boolean;
}

export interface ReviewAudit {
  id?: string;
  testSessionId: string;
  reviewerUserId: string;
  reviewStage: "SECOND_LEVEL_REVIEW" | "DIRECTOR_APPROVAL";
  decision: "APPROVED" | "FLAGGED_FOR_CORRECTION" | "REJECTED";
  comments?: string;
  automatedAnomalyFlagsJson?: string[];
  reviewedAt: string;
}
