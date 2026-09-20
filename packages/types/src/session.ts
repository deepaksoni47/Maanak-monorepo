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
  PENDING_REVIEW = "PENDING_REVIEW",
  FLAGGED = "FLAGGED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface RawObservation {
  loadMass: string;
  indicatedValue: string;
  turningPointDeltaL: string;
  temperature?: string;
  humidity?: string;
  timestamp: string;
}

export interface CalculationTraceItem {
  calculatedIndicationP: string;
  rawErrorE: string;
  zeroErrorE0: string;
  correctedErrorEc: string;
  applicableMpe: string;
  pass: boolean;
}
