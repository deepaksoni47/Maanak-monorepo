import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { PrismaClient, prisma as defaultPrisma } from "@maanak/db";
import {
  classifyInstrument,
  normalizeAccuracyClass,
} from "@maanak/rules-engine";
import { requireAuth, requireRole, Role } from "../auth/index.js";

export interface InstrumentsRouterOptions {
  db?: PrismaClient;
}

const AccuracyClassEnum = z.enum([
  "I",
  "II",
  "III",
  "IIII",
  "CLASS_I",
  "CLASS_II",
  "CLASS_III",
  "CLASS_IIII",
]);

const PartialRangeInputSchema = z.object({
  rangeIndex: z.number().int().min(1),
  maxCapacityI: z.union([z.string(), z.number()]),
  minCapacityI: z.union([z.string(), z.number()]),
  verificationScaleIntervalEI: z.union([z.string(), z.number()]),
  actualScaleIntervalDI: z.union([z.string(), z.number()]),
});

const RegisterInstrumentSchema = z.object({
  modelName: z.string().min(1, "Model name is required"),
  patternDesignation: z.string().min(1, "Pattern designation is required"),
  instrumentType: z.string().default("Non-Automatic Weighing Instrument"),
  weighingPrinciple: z.string().default("Strain Gauge Load Cell"),
  accuracyClass: AccuracyClassEnum,
  accuracyClassId: z.string().uuid().optional(),
  manufacturerId: z.string().uuid().optional(),
  manufacturer: z
    .object({
      companyName: z.string().min(1),
      tradeLicenseNo: z.string().default("TL-DEFAULT-001"),
      registrationNumber: z.string().min(1),
      addressLine1: z.string().default("Industrial Estate"),
      city: z.string().default("Ahmedabad"),
      state: z.string().default("Gujarat"),
      pincode: z.string().default("380001"),
      contactPerson: z.string().default("Authorized Signatory"),
      contactEmail: z.string().email().default("contact@manufacturer.com"),
      contactPhone: z.string().default("+91-9876543210"),
    })
    .optional(),
  maxCapacity: z.union([z.string(), z.number()]),
  minCapacity: z.union([z.string(), z.number()]).optional(),
  verificationScaleIntervalE: z.union([z.string(), z.number()]),
  actualScaleIntervalD: z.union([z.string(), z.number()]).optional(),
  unitOfMeasure: z.string().default("kg"),
  isMultiInterval: z.boolean().default(false),
  isMultipleRange: z.boolean().default(false),
  numberOfPartialRanges: z.number().int().default(1),
  partialRanges: z.array(PartialRangeInputSchema).optional(),
  tempRangeMinC: z.number().default(-10.0),
  tempRangeMaxC: z.number().default(40.0),
  powerSupplyVoltageNominal: z.number().default(230.0),
  powerSupplyFrequencyHz: z.number().default(50.0),
  firmwareVersionId: z.string().default("1.0.0"),
});

const ClassifyOnlySchema = z.object({
  maxCapacity: z.union([z.string(), z.number()]),
  minCapacity: z.union([z.string(), z.number()]).optional(),
  verificationScaleIntervalE: z.union([z.string(), z.number()]),
  actualScaleIntervalD: z.union([z.string(), z.number()]).optional(),
  accuracyClass: AccuracyClassEnum,
  unitOfMeasure: z.string().default("kg"),
});

export function createInstrumentsRouter(
  options: InstrumentsRouterOptions = {},
): Router {
  const router = Router();
  const db = options.db || defaultPrisma;

  /**
   * POST /api/v1/instruments/classify
   * Real-time OIML R 76 Table 3 classifier calculation (returns n = Max/e, verification status).
   */
  router.post(
    "/classify",
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = ClassifyOnlySchema.parse(req.body);
        const normClass = normalizeAccuracyClass(body.accuracyClass);
        const dVal =
          body.actualScaleIntervalD ?? body.verificationScaleIntervalE;

        const classification = classifyInstrument(
          body.maxCapacity,
          body.verificationScaleIntervalE,
          dVal,
          normClass,
          {
            minCapacity: body.minCapacity,
            unit: body.unitOfMeasure as any,
          },
        );

        return res.status(200).json({
          success: true,
          n: classification.n,
          classification,
        });
      } catch (err) {
        return next(err);
      }
    },
  );

  /**
   * GET /api/v1/instruments
   * List instruments with search & filter.
   */
  router.get(
    "/",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const search = req.query.search as string | undefined;
        const accuracyClass = req.query.accuracyClass as string | undefined;
        const instrumentType = req.query.instrumentType as string | undefined;

        const instruments = await db.instrumentModel.findMany({
          where: {
            ...(accuracyClass
              ? {
                  accuracyClass: {
                    code: normalizeAccuracyClass(accuracyClass as any),
                  },
                }
              : {}),
            ...(instrumentType ? { instrumentType } : {}),
            ...(search
              ? {
                  OR: [
                    { modelName: { contains: search, mode: "insensitive" } },
                    {
                      patternDesignation: {
                        contains: search,
                        mode: "insensitive",
                      },
                    },
                    {
                      manufacturer: {
                        companyName: { contains: search, mode: "insensitive" },
                      },
                    },
                  ],
                }
              : {}),
          },
          include: {
            accuracyClass: true,
            manufacturer: true,
            partialRanges: { orderBy: { rangeIndex: "asc" } },
          },
          orderBy: { createdAt: "desc" },
        });

        return res.status(200).json({
          success: true,
          count: instruments.length,
          instruments,
        });
      } catch (err) {
        return next(err);
      }
    },
  );

  /**
   * GET /api/v1/instruments/:id
   * Retrieve single instrument model by ID.
   */
  router.get(
    "/:id",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const instrument = await db.instrumentModel.findUnique({
          where: { id },
          include: {
            accuracyClass: true,
            manufacturer: true,
            partialRanges: { orderBy: { rangeIndex: "asc" } },
            units: true,
          },
        });

        if (!instrument) {
          return res.status(404).json({
            error: `Instrument model with ID '${id}' not found.`,
            code: "NOT_FOUND",
            path: req.originalUrl,
            requestId: req.headers["x-request-id"],
          });
        }

        return res.status(200).json({
          success: true,
          instrument,
        });
      } catch (err) {
        return next(err);
      }
    },
  );

  /**
   * POST /api/v1/instruments
   * Register new NAWI pattern with Table 3 classification check.
   * Acceptance Criteria: Returns 201 with computed scale divisions n = Max/e.
   */
  router.post(
    "/",
    requireAuth,
    requireRole([Role.ADMIN, Role.DIRECTOR, Role.INSPECTOR]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validated = RegisterInstrumentSchema.parse(req.body);
        const normClass = normalizeAccuracyClass(validated.accuracyClass);
        const dVal =
          validated.actualScaleIntervalD ??
          validated.verificationScaleIntervalE;

        // 1. Table 3 NAWI Classification Gatekeeper Check
        const classification = classifyInstrument(
          validated.maxCapacity,
          validated.verificationScaleIntervalE,
          dVal,
          normClass,
          {
            minCapacity: validated.minCapacity,
            unit: validated.unitOfMeasure as any,
          },
        );

        if (!classification.valid) {
          return res.status(400).json({
            error:
              classification.errorReason ||
              `Instrument parameters do not satisfy OIML R 76 Table 3 limits for Class ${normClass}.`,
            code: "CLASSIFICATION_INVALID",
            classification,
            path: req.originalUrl,
            requestId: req.headers["x-request-id"],
          });
        }

        // 2. Resolve Accuracy Class record
        let classId = validated.accuracyClassId;
        if (!classId) {
          const accClass = await db.accuracyClass.findFirst({
            where: { code: normClass },
          });
          classId = accClass?.id;
        }

        if (!classId) {
          classId = "acc-class-default-uuid";
        }

        // 3. Resolve or Create Manufacturer
        let mfgId = validated.manufacturerId;
        if (!mfgId && validated.manufacturer) {
          const mfg = await db.manufacturer.upsert({
            where: {
              registrationNumber: validated.manufacturer.registrationNumber,
            },
            update: {
              companyName: validated.manufacturer.companyName,
            },
            create: {
              companyName: validated.manufacturer.companyName,
              tradeLicenseNo: validated.manufacturer.tradeLicenseNo,
              registrationNumber: validated.manufacturer.registrationNumber,
              addressLine1: validated.manufacturer.addressLine1,
              city: validated.manufacturer.city,
              state: validated.manufacturer.state,
              pincode: validated.manufacturer.pincode,
              contactPerson: validated.manufacturer.contactPerson,
              contactEmail: validated.manufacturer.contactEmail,
              contactPhone: validated.manufacturer.contactPhone,
            },
          });
          mfgId = mfg.id;
        }

        if (!mfgId) {
          const firstMfg = await db.manufacturer.findFirst();
          mfgId = firstMfg?.id || "mfg-default-uuid";
        }

        // 4. Calculate default minCapacity if omitted: minCapacity = minCapacityFactorE * e
        const calculatedMinCapacity =
          validated.minCapacity !== undefined
            ? String(validated.minCapacity)
            : String(
                classification.minCapacityFactorE *
                  Number(validated.verificationScaleIntervalE),
              );

        // 5. Create Instrument Model in database
        const created = await db.instrumentModel.create({
          data: {
            manufacturerId: mfgId,
            accuracyClassId: classId,
            modelName: validated.modelName,
            patternDesignation: validated.patternDesignation,
            instrumentType: validated.instrumentType,
            weighingPrinciple: validated.weighingPrinciple,
            maxCapacity: String(validated.maxCapacity),
            minCapacity: calculatedMinCapacity,
            verificationScaleIntervalE: String(
              validated.verificationScaleIntervalE,
            ),
            actualScaleIntervalD: String(dVal),
            scaleDivisionCountN: classification.n,
            unitOfMeasure: validated.unitOfMeasure,
            isMultiInterval: validated.isMultiInterval,
            isMultipleRange: validated.isMultipleRange,
            numberOfPartialRanges: validated.numberOfPartialRanges,
            tempRangeMinC: validated.tempRangeMinC,
            tempRangeMaxC: validated.tempRangeMaxC,
            powerSupplyVoltageNominal: validated.powerSupplyVoltageNominal,
            powerSupplyFrequencyHz: validated.powerSupplyFrequencyHz,
            firmwareVersionId: validated.firmwareVersionId,
            partialRanges: validated.partialRanges
              ? {
                  create: validated.partialRanges.map((pr) => ({
                    rangeIndex: pr.rangeIndex,
                    maxCapacityI: String(pr.maxCapacityI),
                    minCapacityI: String(pr.minCapacityI),
                    verificationScaleIntervalEI: String(
                      pr.verificationScaleIntervalEI,
                    ),
                    actualScaleIntervalDI: String(pr.actualScaleIntervalDI),
                  })),
                }
              : undefined,
          },
          include: {
            accuracyClass: true,
            manufacturer: true,
            partialRanges: true,
          },
        });

        return res.status(201).json({
          success: true,
          message: "Instrument model registered successfully.",
          n: classification.n,
          classification: {
            valid: classification.valid,
            n: classification.n,
            minAllowedN: classification.minAllowedN,
            maxAllowedN: classification.maxAllowedN,
            accuracyClass: classification.accuracyClass,
          },
          instrument: created,
        });
      } catch (err) {
        return next(err);
      }
    },
  );

  return router;
}

export const instrumentsRouter = createInstrumentsRouter();
