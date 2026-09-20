import { z } from "zod";
import { AccuracyClass, InstrumentType } from "./metrology.js";

export const CreateInstrumentSchema = z.object({
  modelName: z.string().min(1),
  manufacturer: z.string().min(1),
  accuracyClass: z.nativeEnum(AccuracyClass),
  instrumentType: z.nativeEnum(InstrumentType),
  maxCapacity: z.string().min(1),
  minCapacity: z.string().min(1),
  verificationIntervalE: z.string().min(1),
  actualIntervalD: z.string().min(1),
});

export type CreateInstrumentInput = z.infer<typeof CreateInstrumentSchema>;
