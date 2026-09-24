import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { PrismaClient, prisma as defaultPrisma, Prisma } from "@maanak/db";
import {
  calculateIndicationP,
  calculateRawErrorE,
  calculateCorrectedErrorEc,
  evaluateCompliance,
  getMpe,
  getActiveRangeForLoad,
  RulePackRegistry,
  rulePackRegistry,
} from "@maanak/rules-engine";
import {
  generateProvenanceNode,
  GENESIS_PREV_HASH,
} from "@maanak/crypto-provenance";
import { requireAuth, requireRole, Role } from "../auth/index.js";

export interface ObservationsRouterOptions {
  db?: PrismaClient;
  rulesRegistry?: RulePackRegistry;
}

const WeightUsedSchema = z.object({
  calibrationCertificateId: z
    .string()
    .uuid("Invalid calibration certificate ID format"),
  weightMassApplied: z.union([z.string(), z.number()]),
});

const RecordObservationSchema = z.object({
  testSessionId: z.string().uuid("Invalid test session ID format"),
  testPlanItemId: z
    .string()
    .uuid("Invalid test plan item ID format")
    .optional(),
  sequenceNumber: z
    .number()
    .int()
    .positive("Sequence number must be a positive integer")
    .optional(),
  testClause: z.string().default("A.4.4"),
  loadRunDirection: z
    .enum(["ASCENDING", "DESCENDING", "NOT_APPLICABLE", "STATIC"])
    .default("NOT_APPLICABLE"),
  targetLoadL: z.union([z.string(), z.number()]),
  displayedIndicationI: z.union([z.string(), z.number()]),
  changeoverWeightDl: z.union([z.string(), z.number()]).default("0"),
  zeroIndicationI0: z.union([z.string(), z.number()]).optional(),
  zeroDeltaL0: z.union([z.string(), z.number()]).optional(),
  eccentricityPosition: z.number().int().min(1).max(5).optional(),
  elapsedTimeMinutes: z.union([z.string(), z.number()]).optional(),
  activePartialRangeIndex: z.number().int().min(1).max(3).optional(),
  weightsUsed: z.array(WeightUsedSchema).optional(),
});

export function createObservationsRouter(
  options: ObservationsRouterOptions = {},
): Router {
  const router = Router();
  const db = options.db || defaultPrisma;
  const registry = options.rulesRegistry || rulePackRegistry;

  /**
   * Helper to format Prisma decimal or number to Decimal string
   */
  function toDecimalString(val: any, fallback = "0.0"): string {
    if (val === undefined || val === null || val === "") return fallback;
    return String(val);
  }

  // ---------------------------------------------------------------------------
  // 1. POST /api/v1/observations - Record observation & run real-time metrology math
  // ---------------------------------------------------------------------------
  router.post(
    "/",
    requireAuth,
    requireRole([Role.INSPECTOR, Role.ADMIN]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validated = RecordObservationSchema.parse(req.body);

        // Fetch session with instrument, model, and partial ranges
        const session = await db.testSession.findUnique({
          where: { id: validated.testSessionId },
          include: {
            instrumentUnit: {
              include: {
                instrumentModel: {
                  include: {
                    accuracyClass: true,
                    partialRanges: { orderBy: { rangeIndex: "asc" } },
                  },
                },
              },
            },
            testPlan: {
              include: {
                items: true,
              },
            },
          },
        });

        if (!session) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `Test session with ID "${validated.testSessionId}" not found.`,
          });
          return;
        }

        // Check WORM immutability lock status
        if (session.status === "APPROVED_LOCKED") {
          res.status(403).json({
            error: "SESSION_IMMUTABLE_LOCKED",
            message: `Test session "${session.id}" is statutorily APPROVED_LOCKED (WORM). Direct observation additions, modifications, or deletions are strictly prohibited by legal metrology compliance rules.`,
          });
          return;
        }

        if (
          session.status === "UNDER_REVIEW" ||
          session.status === "COMPLETED" ||
          session.status === "LOCKED"
        ) {
          res.status(400).json({
            error: "SESSION_LOCKED",
            message: `Cannot record observation in session status "${session.status}". Session is locked for modification.`,
          });
          return;
        }

        const model = session.instrumentUnit.instrumentModel;
        const accuracyClass = (model.accuracyClass?.code || "III") as
          "I" | "II" | "III" | "IIII";
        const unit = (model.unitOfMeasure as any) || "kg";

        // Determine active scale interval e and active range
        let activeE = toDecimalString(model.verificationScaleIntervalE);
        let activeRangeIndex = validated.activePartialRangeIndex || 1;

        if (
          model.isMultiInterval &&
          model.partialRanges &&
          model.partialRanges.length > 0
        ) {
          try {
            const mappedRanges = model.partialRanges.map((pr) => ({
              rangeIndex: pr.rangeIndex,
              maxCapacity: toDecimalString(pr.maxCapacityI),
              minCapacity: pr.minCapacityI
                ? toDecimalString(pr.minCapacityI)
                : undefined,
              verificationIntervalE: toDecimalString(
                pr.verificationScaleIntervalEI,
              ),
              actualIntervalD: toDecimalString(pr.actualScaleIntervalDI),
              scaleDivisionCountN: pr.scaleDivisionCountNI,
            }));
            const activeRangeRes = getActiveRangeForLoad(
              validated.targetLoadL,
              mappedRanges,
              {
                unit,
                direction:
                  validated.loadRunDirection === "DESCENDING"
                    ? "decreasing"
                    : "increasing",
              },
            );
            activeE = activeRangeRes.activeE;
            activeRangeIndex = activeRangeRes.rangeIndex;
          } catch {
            // fallback to default model interval
            activeE = toDecimalString(model.verificationScaleIntervalE);
          }
        }

        // Metrological math calculation
        // 1. Turning point indication P = I + 0.5e - deltaL
        const indPDecimal = calculateIndicationP(
          validated.displayedIndicationI,
          validated.changeoverWeightDl,
          activeE,
          { unit },
        );
        const indP = indPDecimal.toFixed();

        // 2. Raw error E = P - L
        const rawEDecimal = calculateRawErrorE(
          indPDecimal,
          validated.targetLoadL,
          { unit },
        );
        const rawE = rawEDecimal.toFixed();

        // 3. Zero error E0: if zero observation parameters provided, compute E0; else default to 0
        let zeroE0 = "0";
        if (validated.zeroIndicationI0 !== undefined) {
          const zeroDl = validated.zeroDeltaL0 || "0";
          const zeroP = calculateIndicationP(
            validated.zeroIndicationI0,
            zeroDl,
            activeE,
            { unit },
          );
          zeroE0 = calculateRawErrorE(zeroP, "0", { unit }).toFixed();
        }

        // 4. Corrected intrinsic error Ec = E - E0
        const ecDecimal = calculateCorrectedErrorEc(rawEDecimal, zeroE0, {
          unit,
        });
        const ec = ecDecimal.toFixed();

        // 5. OIML MPE calculation & compliance evaluation
        const activeRulePack = registry.getActiveRulePack();
        const mpeRes = getMpe(validated.targetLoadL, activeE, accuracyClass, {
          unit,
          rulePack: activeRulePack,
        });
        const mpeLimit = mpeRes.mpeInMass;
        const compliance = evaluateCompliance(ecDecimal, mpeLimit, { unit });

        // Resolve test plan item ID
        let planItemId = validated.testPlanItemId;
        if (!planItemId) {
          // Attempt to match by clause or pick the first item
          const matchedItem =
            session.testPlan?.items.find(
              (it) => it.clauseNumber === validated.testClause,
            ) || session.testPlan?.items[0];
          if (matchedItem) {
            planItemId = matchedItem.id;
          } else {
            // Create fallback test plan item if none exist
            const fallbackItem = await db.testPlanItem.create({
              data: {
                testPlanId: session.testPlanId,
                clauseNumber: validated.testClause,
                formNumber: "Form 1",
                title: `Clause ${validated.testClause} Test`,
                executionOrder: 1,
              },
            });
            planItemId = fallbackItem.id;
          }
        }

        // Sequence number resolution
        let seqNum = validated.sequenceNumber;
        if (!seqNum) {
          const lastObs = await db.rawObservation.findFirst({
            where: {
              testSessionId: session.id,
              testPlanItemId: planItemId,
            },
            orderBy: { sequenceNumber: "desc" },
          });
          seqNum = lastObs ? lastObs.sequenceNumber + 1 : 1;
        }

        // Derive derivation tree notes
        const derivationTree = [
          `Load L = ${validated.targetLoadL} ${unit}`,
          `Indicated I = ${validated.displayedIndicationI} ${unit}`,
          `delta L = ${validated.changeoverWeightDl} ${unit}`,
          `P = I + 0.5e - deltaL = ${indP} ${unit}`,
          `E = P - L = ${rawE} ${unit}`,
          `E0 = ${zeroE0} ${unit}`,
          `Ec = E - E0 = ${ec} ${unit}`,
          `MPE Limit = +/-${mpeLimit} ${unit} (Bracket: ${mpeRes.stepBracket})`,
          `Status: ${compliance.status} (|Ec| = ${Math.abs(Number(ec))} <= |MPE| = ${mpeLimit})`,
        ];

        // Execute atomic database persist
        const result = await db.$transaction(async (tx) => {
          // Create RawObservation
          const rawObs = await tx.rawObservation.create({
            data: {
              testSessionId: session.id,
              testPlanItemId: planItemId!,
              sequenceNumber: seqNum!,
              testClause: validated.testClause,
              loadRunDirection: validated.loadRunDirection,
              targetLoadL: new Prisma.Decimal(
                toDecimalString(validated.targetLoadL),
              ),
              displayedIndicationI: new Prisma.Decimal(
                toDecimalString(validated.displayedIndicationI),
              ),
              changeoverWeightDl: new Prisma.Decimal(
                toDecimalString(validated.changeoverWeightDl),
              ),
              zeroIndicationI0: new Prisma.Decimal(zeroE0),
              eccentricityPosition: validated.eccentricityPosition,
              elapsedTimeMinutes: validated.elapsedTimeMinutes
                ? new Prisma.Decimal(
                    toDecimalString(validated.elapsedTimeMinutes),
                  )
                : null,
              activePartialRangeIndex: activeRangeIndex,
              recordedAt: new Date(),
            },
          });

          // Link weights applied if any
          if (validated.weightsUsed && validated.weightsUsed.length > 0) {
            await tx.observationWeightUsed.createMany({
              data: validated.weightsUsed.map((w) => ({
                rawObservationId: rawObs.id,
                calibrationCertificateId: w.calibrationCertificateId,
                weightMassApplied: new Prisma.Decimal(
                  toDecimalString(w.weightMassApplied),
                ),
              })),
            });
          }

          // Locate or create calculation run
          let calcRun = await tx.calculationRun.findFirst({
            where: { testSessionId: session.id },
            orderBy: { executedAt: "desc" },
          });

          if (!calcRun) {
            calcRun = await tx.calculationRun.create({
              data: {
                testSessionId: session.id,
                rulePackVersionId: session.rulePackVersionId,
                executedByUserId: req.user!.sub,
                overallComplianceStatus: compliance.pass
                  ? "COMPLIANT"
                  : "NON_COMPLIANT",
                totalPointsEvaluated: 1,
                totalPointsFailed: compliance.pass ? 0 : 1,
                maxErrorToMpeRatio: new Prisma.Decimal(compliance.ratioToMpe),
              },
            });
          } else {
            // Update calculation run stats
            const totalPoints = calcRun.totalPointsEvaluated + 1;
            const failedPoints =
              calcRun.totalPointsFailed + (compliance.pass ? 0 : 1);
            const currentMaxRatio = Number(calcRun.maxErrorToMpeRatio);
            const newRatio = Math.max(
              currentMaxRatio,
              Number(compliance.ratioToMpe),
            );

            calcRun = await tx.calculationRun.update({
              where: { id: calcRun.id },
              data: {
                totalPointsEvaluated: totalPoints,
                totalPointsFailed: failedPoints,
                maxErrorToMpeRatio: new Prisma.Decimal(newRatio.toFixed(4)),
                overallComplianceStatus:
                  failedPoints > 0 ? "NON_COMPLIANT" : "COMPLIANT",
              },
            });
          }

          // Create CalculationTraceItem
          const traceItem = await tx.calculationTraceItem.create({
            data: {
              calculationRunId: calcRun.id,
              rawObservationId: rawObs.id,
              preRoundingIndicationP: new Prisma.Decimal(indP),
              rawErrorE: new Prisma.Decimal(rawE),
              zeroErrorE0: new Prisma.Decimal(zeroE0),
              correctedIntrinsicErrorEc: new Prisma.Decimal(ec),
              mpeLimitApplied: new Prisma.Decimal(mpeLimit),
              mpeBracketCategory: mpeRes.stepBracket,
              complianceStatus: compliance.pass ? "PASS" : "FAIL",
              stepDerivationTreeJson:
                derivationTree as unknown as Prisma.InputJsonValue,
            },
          });

          // Fetch last provenance node in chain for session
          const lastNode = await tx.provenanceNode.findFirst({
            where: { testSessionId: session.id },
            orderBy: { nodeSequence: "desc" },
          });

          const nextSeq = lastNode ? lastNode.nodeSequence + 1 : 0;
          const prevHash = lastNode
            ? lastNode.currentNodeHashSha256
            : GENESIS_PREV_HASH;

          // Generate cryptographic provenance node
          const provNodeRecord = generateProvenanceNode({
            testSessionId: session.id,
            nodeSequence: nextSeq,
            nodeType: "OBSERVATION_LOG",
            previousNodeHashSha256: prevHash,
            payload: {
              observationId: rawObs.id,
              sequenceNumber: rawObs.sequenceNumber,
              targetLoadL: toDecimalString(rawObs.targetLoadL),
              displayedIndicationI: toDecimalString(
                rawObs.displayedIndicationI,
              ),
              changeoverWeightDl: toDecimalString(rawObs.changeoverWeightDl),
              calculatedP: indP,
              calculatedRawE: rawE,
              correctedEc: ec,
              mpe: mpeLimit,
              compliance: compliance.status,
              recordedAt: rawObs.recordedAt.toISOString(),
            },
          });

          await tx.provenanceNode.create({
            data: {
              testSessionId: session.id,
              nodeSequence: provNodeRecord.nodeSequence,
              nodeType: provNodeRecord.nodeType,
              previousNodeHashSha256: provNodeRecord.previousNodeHashSha256,
              payloadHashSha256: provNodeRecord.payloadHashSha256,
              currentNodeHashSha256: provNodeRecord.currentNodeHashSha256,
              createdAt: provNodeRecord.createdAt,
            },
          });

          // Transition session status to IN_PROGRESS if currently DRAFT
          if (session.status === "DRAFT") {
            await tx.testSession.update({
              where: { id: session.id },
              data: { status: "IN_PROGRESS" },
            });
          }

          return { rawObs, traceItem, provNodeRecord };
        });

        res.status(201).json({
          message: "Observation recorded successfully.",
          observation: result.rawObs,
          calculation: {
            preRoundingIndicationP: indP,
            rawErrorE: rawE,
            zeroErrorE0: zeroE0,
            correctedIntrinsicErrorEc: ec,
            mpeLimitApplied: mpeLimit,
            stepBracket: mpeRes.stepBracket,
            complianceStatus: compliance.status,
            ratioToMpe: compliance.ratioToMpe,
            percentageOfMpe: compliance.percentageOfMpe,
            pass: compliance.pass,
            derivationTree,
          },
          provenance: {
            nodeSequence: result.provNodeRecord.nodeSequence,
            previousHash: result.provNodeRecord.previousNodeHashSha256,
            currentHash: result.provNodeRecord.currentNodeHashSha256,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 2. GET /api/v1/observations/session/:sessionId - List observations for a session
  // ---------------------------------------------------------------------------
  router.get(
    "/session/:sessionId",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { sessionId } = req.params;
        const { testClause } = req.query;

        const where: any = { testSessionId: sessionId };
        if (testClause) {
          where.testClause = String(testClause);
        }

        const observations = await db.rawObservation.findMany({
          where,
          orderBy: { sequenceNumber: "asc" },
          include: {
            weightsUsed: {
              include: {
                calibrationCertificate: true,
              },
            },
            calculationTraceItems: true,
          },
        });

        res.status(200).json({
          testSessionId: sessionId,
          count: observations.length,
          observations,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 3. POST /api/v1/observations/calculate - Real-time turning point & MPE math calculator
  // ---------------------------------------------------------------------------
  router.post(
    "/calculate",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const {
          indication,
          deltaL = "0",
          e,
          nominalLoad,
          e0 = "0",
          accuracyClass = "CLASS_III",
        } = req.body;

        if (indication === undefined || e === undefined || nominalLoad === undefined) {
          res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "Fields 'indication', 'e', and 'nominalLoad' are required for calculation.",
          });
          return;
        }

        const indP = calculateIndicationP(String(indication), String(deltaL), String(e));
        const rawE = calculateRawErrorE(indP.toString(), String(nominalLoad));
        const zeroE0 = calculateRawErrorE(
          calculateIndicationP("0", String(deltaL), String(e)).toString(),
          "0",
        );
        const ec = calculateCorrectedErrorEc(rawE.toString(), String(e0 || zeroE0));

        const mpeRes = getMpe(
          String(nominalLoad),
          String(e),
          accuracyClass as any,
        );

        const compliance = evaluateCompliance(ec, mpeRes.mpeInMass);

        res.status(200).json({
          success: true,
          turningPointP: indP.toString(),
          rawErrorE: rawE.toString(),
          correctedIntrinsicErrorEc: ec.toString(),
          mpe: mpeRes.mpeInMass,
          pass: compliance.pass,
          ratioToMpe: compliance.ratioToMpe,
          percentageOfMpe: compliance.percentageOfMpe,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 4. DELETE /api/v1/observations/:id - Delete observation (WORM enforced)
  // ---------------------------------------------------------------------------
  router.delete(
    "/:id",
    requireAuth,
    requireRole([Role.INSPECTOR, Role.ADMIN]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;

        const obs = await db.rawObservation.findUnique({
          where: { id },
          include: { testSession: true },
        });

        if (!obs) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `Observation with ID "${id}" not found.`,
          });
          return;
        }

        if (obs.testSession.status === "APPROVED_LOCKED") {
          res.status(403).json({
            error: "SESSION_IMMUTABLE_LOCKED",
            message: `Test session "${obs.testSessionId}" is statutorily APPROVED_LOCKED (WORM). Direct observation additions, modifications, or deletions are strictly prohibited by legal metrology compliance rules.`,
          });
          return;
        }

        if (
          obs.testSession.status === "UNDER_REVIEW" ||
          obs.testSession.status === "COMPLETED" ||
          obs.testSession.status === "LOCKED"
        ) {
          res.status(400).json({
            error: "SESSION_LOCKED",
            message: `Cannot delete observation in session status "${obs.testSession.status}". Session is locked for modification.`,
          });
          return;
        }

        await db.$transaction(async (tx) => {
          await tx.observationWeightUsed.deleteMany({
            where: { rawObservationId: id },
          });
          await tx.calculationTraceItem.deleteMany({
            where: { rawObservationId: id },
          });
          await tx.rawObservation.delete({
            where: { id },
          });
        });

        res.status(200).json({
          message: "Observation deleted successfully.",
          deletedId: id,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 5. PATCH /api/v1/observations/:id - Modify observation (WORM enforced)
  // ---------------------------------------------------------------------------
  router.patch(
    "/:id",
    requireAuth,
    requireRole([Role.INSPECTOR, Role.ADMIN]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;

        const obs = await db.rawObservation.findUnique({
          where: { id },
          include: { testSession: true },
        });

        if (!obs) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `Observation with ID "${id}" not found.`,
          });
          return;
        }

        if (obs.testSession.status === "APPROVED_LOCKED") {
          res.status(403).json({
            error: "SESSION_IMMUTABLE_LOCKED",
            message: `Test session "${obs.testSessionId}" is statutorily APPROVED_LOCKED (WORM). Direct observation additions, modifications, or deletions are strictly prohibited by legal metrology compliance rules.`,
          });
          return;
        }

        if (
          obs.testSession.status === "UNDER_REVIEW" ||
          obs.testSession.status === "COMPLETED" ||
          obs.testSession.status === "LOCKED"
        ) {
          res.status(400).json({
            error: "SESSION_LOCKED",
            message: `Cannot modify observation in session status "${obs.testSession.status}". Session is locked for modification.`,
          });
          return;
        }

        const updated = await db.rawObservation.update({
          where: { id },
          data: req.body,
        });

        res.status(200).json({
          message: "Observation updated successfully.",
          observation: updated,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

export const observationsRouter = createObservationsRouter();
