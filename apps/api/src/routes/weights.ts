import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { PrismaClient, prisma as defaultPrisma } from "@maanak/db";
import {
  validateStandardWeightUncertainty,
  validateStandardWeightSet,
  StandardWeightCheckInput,
} from "@maanak/rules-engine";
import { requireAuth, requireRole, Role } from "../auth/index.js";

export interface WeightsRouterOptions {
  db?: PrismaClient;
}

const RegisterWeightSetSchema = z.object({
  identificationCode: z.string().min(1, "Identification code is required"),
  oimlClass: z.string().min(1, "OIML accuracy class is required"),
  laboratoryId: z.string().uuid().optional(),
  manufacturerName: z.string().optional(),
  material: z.string().optional(),
  nominalMassMin: z.union([z.string(), z.number()]),
  nominalMassMax: z.union([z.string(), z.number()]),
  certificate: z.object({
    certificateNumber: z.string().min(1, "Certificate number is required"),
    calibratingAgency: z.string().min(1, "Calibrating agency is required"),
    nablCertNo: z
      .string()
      .min(1, "NABL accreditation certificate number is required"),
    calibrationDate: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    expiryDate: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    expandedUncertaintyU: z.union([z.string(), z.number()]),
    uncertaintyUnit: z.string().default("mg"),
    coverageFactorK: z.union([z.string(), z.number()]).default("2.00"),
    certificatePdfUrl: z.string().url().optional(),
  }),
});

const SinglePreCheckSchema = z.object({
  uncertaintyU: z.union([z.string(), z.number()]),
  targetLoad: z.union([z.string(), z.number()]),
  e: z.union([z.string(), z.number()]),
  accuracyClass: z.enum([
    "I",
    "II",
    "III",
    "IIII",
    "CLASS_I",
    "CLASS_II",
    "CLASS_III",
    "CLASS_IIII",
  ]),
  uncertaintyUnit: z.string().optional(),
  loadUnit: z.string().optional(),
  eUnit: z.string().optional(),
  weightId: z.string().optional(),
  weightClass: z.string().optional(),
  mode: z
    .enum([
      "INITIAL_VERIFICATION",
      "IN_SERVICE",
      "initialVerification",
      "inService",
    ])
    .optional(),
});

function normalizeMode(
  mode?: string,
): "initialVerification" | "inService" | undefined {
  if (!mode) return undefined;
  if (mode === "IN_SERVICE" || mode === "inService") return "inService";
  return "initialVerification";
}

const BatchPreCheckSchema = z.object({
  weights: z
    .array(
      z.object({
        loadMass: z.union([z.string(), z.number()]),
        uncertaintyU: z.union([z.string(), z.number()]),
        weightId: z.string().optional(),
        weightClass: z.string().optional(),
        unit: z.string().optional(),
        applicableMpe: z.union([z.string(), z.number()]).optional(),
      }),
    )
    .min(1, "At least one weight required for batch pre-check"),
  e: z.union([z.string(), z.number()]),
  accuracyClass: z.enum([
    "I",
    "II",
    "III",
    "IIII",
    "CLASS_I",
    "CLASS_II",
    "CLASS_III",
    "CLASS_IIII",
  ]),
  unit: z.string().optional(),
  mode: z
    .enum([
      "INITIAL_VERIFICATION",
      "IN_SERVICE",
      "initialVerification",
      "inService",
    ])
    .optional(),
});

export function createWeightsRouter(
  options: WeightsRouterOptions = {},
): Router {
  const router = Router();
  const db = options.db || defaultPrisma;

  /**
   * GET /api/v1/weights
   * Lists available standard weight sets and calibration certificates for laboratory.
   */
  router.get(
    "/",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const labId =
          (req.query.laboratoryId as string) || req.user?.laboratoryId;
        const oimlClass = req.query.oimlClass as string | undefined;
        const activeOnly = req.query.activeOnly !== "false";

        const weights = await db.referenceStandard.findMany({
          where: {
            ...(labId ? { laboratoryId: labId } : {}),
            ...(oimlClass
              ? { oimlClass: String(oimlClass).toUpperCase() }
              : {}),
            ...(activeOnly ? { isActive: true } : {}),
          },
          include: {
            calibrationCertificates: {
              where: activeOnly ? { isActive: true } : {},
              orderBy: { expiryDate: "desc" },
            },
            laboratory: {
              select: {
                id: true,
                code: true,
                name: true,
                city: true,
              },
            },
          },
          orderBy: { identificationCode: "asc" },
        });

        return res.status(200).json({
          success: true,
          count: weights.length,
          weights,
        });
      } catch (err) {
        return next(err);
      }
    },
  );

  /**
   * POST /api/v1/weights
   * Registers a new reference standard weight set with its initial calibration certificate.
   * Requires ADMIN, DIRECTOR, or INSPECTOR role.
   */
  router.post(
    "/",
    requireAuth,
    requireRole([Role.ADMIN, Role.DIRECTOR, Role.INSPECTOR]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validated = RegisterWeightSetSchema.parse(req.body);
        const labId = validated.laboratoryId || req.user?.laboratoryId;

        if (!labId) {
          return res.status(400).json({
            error: "Laboratory ID is required to register reference standards.",
            code: "VALIDATION_ERROR",
            path: req.originalUrl,
            requestId: req.headers["x-request-id"],
          });
        }

        const cert = validated.certificate;

        const created = await db.referenceStandard.create({
          data: {
            laboratoryId: labId,
            identificationCode: validated.identificationCode,
            oimlClass: validated.oimlClass.toUpperCase(),
            manufacturerName: validated.manufacturerName,
            material: validated.material,
            nominalMassMin: String(validated.nominalMassMin),
            nominalMassMax: String(validated.nominalMassMax),
            isActive: true,
            calibrationCertificates: {
              create: {
                certificateNumber: cert.certificateNumber,
                calibratingAgency: cert.calibratingAgency,
                nablCertNo: cert.nablCertNo,
                calibrationDate: new Date(cert.calibrationDate),
                expiryDate: new Date(cert.expiryDate),
                expandedUncertaintyU: String(cert.expandedUncertaintyU),
                uncertaintyUnit: cert.uncertaintyUnit || "mg",
                coverageFactorK: String(cert.coverageFactorK || "2.00"),
                certificatePdfUrl: cert.certificatePdfUrl,
                isActive: true,
              },
            },
          },
          include: {
            calibrationCertificates: true,
          },
        });

        return res.status(201).json({
          success: true,
          message: "Reference standard weight set registered successfully.",
          weight: created,
        });
      } catch (err) {
        return next(err);
      }
    },
  );

  /**
   * POST /api/v1/weights/precheck
   * Real-time NABL 129 uncertainty gatekeeper check (U <= 1/3 MPE).
   * Supports both single weight check and batch weight check.
   */
  router.post(
    "/precheck",
    requireAuth,
    (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check if request is batch or single
        if (Array.isArray(req.body?.weights)) {
          const batchData = BatchPreCheckSchema.parse(req.body);
          const weightItems: StandardWeightCheckInput[] = batchData.weights.map(
            (w) => ({
              loadMass: w.loadMass,
              uncertaintyU: w.uncertaintyU,
              weightId: w.weightId,
              weightClass: w.weightClass,
              unit: (w.unit as any) || (batchData.unit as any),
              applicableMpe: w.applicableMpe,
            }),
          );

          const result = validateStandardWeightSet(
            weightItems,
            batchData.e,
            batchData.accuracyClass,
            {
              unit: batchData.unit as any,
              mode: normalizeMode(batchData.mode),
            },
          );

          return res.status(200).json({
            success: true,
            compliant: result.allCompliant,
            status: result.allCompliant ? "COMPLIANT" : "NON_COMPLIANT",
            warning: result.summaryWarning,
            failingCount: result.failingCount,
            passingCount: result.passingCount,
            results: result.results,
          });
        }

        // Single check
        const singleData = SinglePreCheckSchema.parse(req.body);
        const result = validateStandardWeightUncertainty(
          singleData.uncertaintyU,
          singleData.targetLoad,
          singleData.e,
          singleData.accuracyClass,
          {
            uncertaintyUnit: singleData.uncertaintyUnit as any,
            loadUnit: singleData.loadUnit as any,
            eUnit: singleData.eUnit as any,
            weightId: singleData.weightId,
            weightClass: singleData.weightClass,
            mode: normalizeMode(singleData.mode),
          },
        );

        return res.status(200).json({
          success: true,
          compliant: result.compliant,
          status: result.compliant ? "COMPLIANT" : "NON_COMPLIANT",
          warning: result.warningMessage,
          actualUncertainty: result.actualUncertainty,
          maxAllowedUncertainty: result.maxAllowedUncertainty,
          mpeApplied: result.mpeApplied,
          loadPoint: result.loadPoint,
          ratioToMpe: result.ratioToMpe,
          unit: result.unit,
        });
      } catch (err) {
        return next(err);
      }
    },
  );

  return router;
}

export const weightsRouter = createWeightsRouter();
