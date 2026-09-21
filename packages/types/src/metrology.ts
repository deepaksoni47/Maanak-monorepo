export enum AccuracyClass {
  CLASS_I = "I",
  CLASS_II = "II",
  CLASS_III = "III",
  CLASS_IIII = "IIII",
}

export enum InstrumentType {
  SINGLE_INTERVAL = "SINGLE_INTERVAL",
  MULTI_INTERVAL = "MULTI_INTERVAL",
  MULTIPLE_RANGE = "MULTIPLE_RANGE",
}

export enum WeightClass {
  E1 = "E1",
  E2 = "E2",
  F1 = "F1",
  F2 = "F2",
  M1 = "M1",
  M2 = "M2",
  M3 = "M3",
}

export enum ComplianceStatus {
  PASS = "PASS",
  FAIL = "FAIL",
  INCONCLUSIVE = "INCONCLUSIVE",
}

export enum TareType {
  SUBTRACTIVE = "SUBTRACTIVE",
  ADDITIVE = "ADDITIVE",
}

export enum WeighingDeviceType {
  ELECTRONIC = "ELECTRONIC",
  MECHANICAL = "MECHANICAL",
  HYBRID = "HYBRID",
}

export type UnitOfMeasurement = "kg" | "g" | "mg" | "t" | "ct";

export interface PartialWeighingRange {
  rangeIndex: number;
  maxCapacity: string;
  minCapacity?: string;
  verificationIntervalE: string;
  actualIntervalD: string;
  scaleDivisionCountN?: number;
}

export interface ScaleClassificationResult {
  valid: boolean;
  accuracyClass: AccuracyClass;
  scaleDivisionsN: string;
  n?: number;
  minAllowedN: number | string;
  maxAllowedN: number | string | null;
  errorReason?: string;
}

export interface InstrumentModelSpecification {
  id?: string;
  modelName: string;
  patternDesignation?: string;
  manufacturer: string;
  accuracyClass: AccuracyClass;
  instrumentType: InstrumentType;
  weighingPrinciple?: string;
  weighingDeviceType?: WeighingDeviceType;
  maxCapacity: string;
  minCapacity: string;
  verificationIntervalE: string;
  actualIntervalD: string;
  scaleDivisionCountN?: number;
  unitOfMeasure?: UnitOfMeasurement;
  tareMax?: string;
  tareType?: TareType;
  isMultiInterval?: boolean;
  isMultipleRange?: boolean;
  numberOfPartialRanges?: number;
  partialRanges?: PartialWeighingRange[];
  tempRangeMinC?: string;
  tempRangeMaxC?: string;
  powerSupplyVoltageNominal?: string;
  powerSupplyFrequencyHz?: string;
  firmwareVersionId?: string;
}

export interface InstrumentUnit {
  id?: string;
  instrumentModelId: string;
  serialNumber: string;
  yearOfManufacture: number;
  indicatorSerialNo?: string;
  loadCellModelNo?: string;
  loadCellSerialNo?: string;
  sealingArrangementDetails?: string;
}
