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

export interface PartialWeighingRange {
  rangeIndex: number;
  maxCapacity: string;
  verificationIntervalE: string;
  actualIntervalD: string;
}

export interface InstrumentModelSpecification {
  modelName: string;
  manufacturer: string;
  accuracyClass: AccuracyClass;
  instrumentType: InstrumentType;
  maxCapacity: string;
  minCapacity: string;
  verificationIntervalE: string;
  actualIntervalD: string;
  tareMax?: string;
  partialRanges?: PartialWeighingRange[];
}
