import { z } from "zod";
import {
  AccuracyClass,
  InstrumentType,
  TareType,
  WeighingDeviceType,
} from "./metrology.js";
import { TestFormType } from "./session.js";

export const PartialWeighingRangeSchema = z.object({
  rangeIndex: z.number().int().min(1).max(3),
  maxCapacity: z.string().min(1, "Max capacity is required"),
  minCapacity: z.string().optional(),
  verificationIntervalE: z
    .string()
    .min(1, "Verification interval e is required"),
  actualIntervalD: z.string().min(1, "Actual interval d is required"),
  scaleDivisionCountN: z.number().int().optional(),
});

export type PartialWeighingRangeInput = z.infer<
  typeof PartialWeighingRangeSchema
>;

export const CreateInstrumentSchema = z.object({
  modelName: z.string().min(1, "Model name is required"),
  patternDesignation: z.string().optional(),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  accuracyClass: z.nativeEnum(AccuracyClass),
  instrumentType: z.nativeEnum(InstrumentType),
  weighingPrinciple: z.string().optional(),
  weighingDeviceType: z.nativeEnum(WeighingDeviceType).optional(),
  maxCapacity: z.string().min(1, "Max capacity is required"),
  minCapacity: z.string().min(1, "Min capacity is required"),
  verificationIntervalE: z
    .string()
    .min(1, "Verification scale interval (e) is required"),
  actualIntervalD: z.string().min(1, "Actual scale interval (d) is required"),
  unitOfMeasure: z.enum(["kg", "g", "mg", "t", "ct"]).default("kg"),
  tareMax: z.string().optional(),
  tareType: z.nativeEnum(TareType).optional(),
  isMultiInterval: z.boolean().default(false),
  isMultipleRange: z.boolean().default(false),
  numberOfPartialRanges: z.number().int().min(1).max(3).default(1),
  partialRanges: z.array(PartialWeighingRangeSchema).optional(),
  tempRangeMinC: z.string().optional(),
  tempRangeMaxC: z.string().optional(),
  powerSupplyVoltageNominal: z.string().optional(),
  powerSupplyFrequencyHz: z.string().optional(),
  firmwareVersionId: z.string().optional(),
});

export type CreateInstrumentInput = z.infer<typeof CreateInstrumentSchema>;

export const SubmitObservationSchema = z.object({
  testSessionId: z.string().min(1, "Session ID is required"),
  testPlanItemId: z.string().optional(),
  sequenceNumber: z.number().int().positive().optional(),
  testClause: z.string().optional(),
  testFormType: z.nativeEnum(TestFormType).optional(),
  loadRunDirection: z
    .enum(["ASCENDING", "DESCENDING", "NOT_APPLICABLE"])
    .default("NOT_APPLICABLE"),
  loadMass: z.string().min(1, "Load mass (L) is required"),
  indicatedValue: z.string().min(1, "Indicated value (I) is required"),
  turningPointDeltaL: z.string().min(1, "Turning point delta L is required"),
  zeroIndicationI0: z.string().optional(),
  zeroDeltaL0: z.string().optional(),
  eccentricityPosition: z.number().int().min(1).max(5).optional(),
  elapsedTimeMinutes: z.string().optional(),
  activePartialRangeIndex: z.number().int().min(1).max(3).default(1),
  temperature: z.string().optional(),
  humidity: z.string().optional(),
  timestamp: z.string().optional(),
});

export type SubmitObservationInput = z.infer<typeof SubmitObservationSchema>;

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const VerifyReportSchema = z
  .object({
    reportId: z.string().optional(),
    sessionNumber: z.string().optional(),
    pdfSha256: z.string().optional(),
    qrPayload: z.string().optional(),
  })
  .refine(
    (data) =>
      Boolean(
        data.reportId || data.sessionNumber || data.pdfSha256 || data.qrPayload,
      ),
    {
      message:
        "At least one verification parameter (reportId, sessionNumber, pdfSha256, or qrPayload) must be provided",
    },
  );

export type VerifyReportInput = z.infer<typeof VerifyReportSchema>;

export const CreateTestSessionSchema = z.object({
  laboratoryId: z.string().min(1, "Laboratory ID is required"),
  instrumentUnitId: z.string().min(1, "Instrument Unit ID is required"),
  testPlanId: z.string().min(1, "Test Plan ID is required"),
  rulePackVersionId: z.string().min(1, "Rule Pack Version ID is required"),
  sessionNumber: z.string().optional(),
});

export type CreateTestSessionInput = z.infer<typeof CreateTestSessionSchema>;

export const LogEnvironmentalSchema = z.object({
  testSessionId: z.string().min(1, "Session ID is required"),
  temperatureC: z.string().min(1, "Temperature is required"),
  relativeHumidityPercent: z.string().min(1, "Humidity is required"),
  barometricPressureHpa: z.string().optional(),
});

export type LogEnvironmentalInput = z.infer<typeof LogEnvironmentalSchema>;

export const SubmitReviewAuditSchema = z.object({
  testSessionId: z.string().min(1, "Session ID is required"),
  reviewStage: z.enum(["SECOND_LEVEL_REVIEW", "DIRECTOR_APPROVAL"]),
  decision: z.enum(["APPROVED", "FLAGGED_FOR_CORRECTION", "REJECTED"]),
  comments: z.string().optional(),
});

export type SubmitReviewAuditInput = z.infer<typeof SubmitReviewAuditSchema>;

export const SignReportSchema = z.object({
  testSessionId: z.string().min(1, "Session ID is required"),
  pdfBinaryHashSha256: z
    .string()
    .length(64, "SHA-256 hash must be exactly 64 hexadecimal characters"),
  x509CertificateSerial: z.string().min(1, "Certificate serial is required"),
  pkiSignatureValueBase64: z.string().min(1, "PKI signature value is required"),
  timestampTokenBase64: z.string().optional(),
});

export type SignReportInput = z.infer<typeof SignReportSchema>;
