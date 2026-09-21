import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { PrismaClient, prisma as defaultPrisma, Prisma } from "@maanak/db";
import {
  calculateIndicationP,
  calculateRawErrorE,
  evaluateObservationCompliance,
  getActiveRangeForLoad,
  RulePackRegistry,
  rulePackRegistry,
} from "@maanak/rules-engine";
import {
  generateProvenanceNode,
  GENESIS_PREV_HASH,
} from "@maanak/crypto-provenance";
import { requireAuth, requireRole, Role } from "../auth/index.js";

export interface SyncRouterOptions {
  db?: PrismaClient;
  rulesRegistry?: RulePackRegistry;
}

const WeightUsedSchema = z.object({
  calibrationCertificateId: z
    .string()
    .uuid("Invalid calibration certificate ID format"),
  weightMassApplied: z.union([z.string(), z.number()]),
});

const SyncObservationItemSchema = z.object({
  localId: z.string().optional(),
  testPlanItemId: z.string().uuid("Invalid test plan item ID format"),
  testClause: z.string().min(1, "Test clause is required"),
  sequenceNumber: z.number().int().min(1, "Sequence number must be at least 1"),
  loadRunDirection: z.enum(["ASCENDING", "DESCENDING"]).default("ASCENDING"),
  targetLoadL: z.union([z.string(), z.number()]),
  displayedIndicationI: z.union([z.string(), z.number()]),
  changeoverWeightDl: z.union([z.string(), z.number()]).default("0.0"),
  zeroIndicationI0: z.union([z.string(), z.number()]).default("0.0"),
  zeroDeltaL0: z.union([z.string(), z.number()]).optional(),
  eccentricityPosition: z.number().int().min(1).max(5).optional(),
  elapsedTimeMinutes: z.union([z.string(), z.number()]).optional(),
  activePartialRangeIndex: z.number().int().min(1).max(3).default(1),
  recordedAt: z.string().optional(),
  weightsUsed: z.array(WeightUsedSchema).optional(),
});

const SyncEnvironmentalLogSchema = z.object({
  temperatureC: z.union([z.string(), z.number()]),
  relativeHumidityPercent: z.union([z.string(), z.number()]),
  barometricPressureHpa: z.union([z.string(), z.number()]).optional(),
  loggedAt: z.string().optional(),
});

const SyncSessionPushSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
  localId: z.string().optional(),
  observations: z.array(SyncObservationItemSchema).default([]),
  environmentalLogs: z.array(SyncEnvironmentalLogSchema).optional(),
});

const SyncPushRequestSchema = z.object({
  deviceId: z.string().optional(),
  sessions: z
    .array(SyncSessionPushSchema)
    .min(1, "At least one session must be provided for synchronization"),
});

export function createSyncRouter(options: SyncRouterOptions = {}): Router {
  const router = Router();
  const db = options.db || defaultPrisma;
  const registry = options.rulesRegistry || rulePackRegistry;

  function toDecimalString(val: any, fallback = "0.0"): string {
    if (val === undefined || val === null || val === "") return fallback;
    return String(val);
  }

  // ---------------------------------------------------------------------------
  // 1. GET /api/v1/sync/pull
  // Fetches active sessions, test plans, instrument configurations, and reference
  // weight inventory for offline caching on mobile bench devices.
  // ---------------------------------------------------------------------------
  router.get(
    "/pull",
    requireAuth,
    requireRole([Role.INSPECTOR, Role.ADMIN, Role.REVIEWER, Role.DIRECTOR]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user!;
        const queryLabId = req.query.laboratoryId as string | undefined;
        const targetLabId =
          user.role === Role.ADMIN && queryLabId
            ? queryLabId
            : user.laboratoryId;

        // Fetch active test sessions
        const activeSessions = await db.testSession.findMany({
          where: {
            laboratoryId: targetLabId,
            status: { in: ["DRAFT", "IN_PROGRESS"] },
          },
          include: {
            testPlan: {
              include: {
                items: {
                  orderBy: { executionOrder: "asc" },
                },
              },
            },
            instrumentUnit: {
              include: {
                instrumentModel: {
                  include: {
                    accuracyClass: true,
                    manufacturer: true,
                    partialRanges: {
                      orderBy: { rangeIndex: "asc" },
                    },
                  },
                },
              },
            },
            environmentalLogs: {
              orderBy: { loggedAt: "desc" },
              take: 5,
            },
            rawObservations: {
              orderBy: { sequenceNumber: "desc" },
              take: 1,
            },
            provenanceNodes: {
              orderBy: { nodeSequence: "desc" },
              take: 1,
            },
          },
        });

        // Fetch reference standard weights available for this laboratory
        const referenceStandards = await db.referenceStandard.findMany({
          where: {
            laboratoryId: targetLabId,
            isActive: true,
          },
          include: {
            calibrationCertificates: {
              where: { isActive: true },
              orderBy: { expiryDate: "desc" },
              take: 1,
            },
          },
        });

        const formattedSessions = activeSessions.map((s) => {
          const lastObs = s.rawObservations[0];
          const lastNode = s.provenanceNodes[0];
          return {
            id: s.id,
            localId: s.localId,
            sessionNumber: s.sessionNumber,
            status: s.status,
            syncStatus: s.syncStatus,
            testPlan: s.testPlan,
            instrumentUnit: s.instrumentUnit,
            recentEnvironmentalLogs: s.environmentalLogs,
            latestSequenceNumber: lastObs ? lastObs.sequenceNumber : 0,
            latestProvenanceHash: lastNode
              ? lastNode.currentNodeHashSha256
              : GENESIS_PREV_HASH,
            latestNodeSequence: lastNode ? lastNode.nodeSequence : -1,
          };
        });

        res.status(200).json({
          sessions: formattedSessions,
          referenceStandards,
          serverTimestamp: new Date().toISOString(),
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 2. POST /api/v1/sync/push
  // Ingests batch of offline observations and environmental logs, evaluates
  // metrological compliance in real-time, and extends the WELMEC 7.2 provenance chain.
  // ---------------------------------------------------------------------------
  router.post(
    "/push",
    requireAuth,
    requireRole([Role.INSPECTOR, Role.ADMIN]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validated = SyncPushRequestSchema.parse(req.body);
        const syncedResults: any[] = [];

        for (const sessionData of validated.sessions) {
          const result = await db.$transaction(async (tx) => {
            const session = await tx.testSession.findUnique({
              where: { id: sessionData.sessionId },
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
                calculationRuns: {
                  orderBy: { executedAt: "desc" },
                  take: 1,
                },
              },
            });

            if (!session) {
              return {
                sessionId: sessionData.sessionId,
                error: `Session ${sessionData.sessionId} not found`,
                success: false,
              };
            }

            const model = session.instrumentUnit.instrumentModel;
            const accuracyClass = (model.accuracyClass?.code || "III") as
              | "I"
              | "II"
              | "III"
              | "IIII";
            const unit = (model.unitOfMeasure as any) || "kg";

            // 1. Ensure CalculationRun exists
            let calcRun = session.calculationRuns[0];
            if (!calcRun) {
              calcRun = await tx.calculationRun.create({
                data: {
                  testSessionId: session.id,
                  rulePackVersionId: session.rulePackVersionId,
                  executedByUserId: req.user!.sub,
                  overallComplianceStatus: "PASS",
                  totalPointsEvaluated: 0,
                  totalPointsFailed: 0,
                  maxErrorToMpeRatio: new Prisma.Decimal("0.0"),
                },
              });
            }

            // 2. Ingest Observations
            let newObservationsCount = 0;
            let currentTotalEvaluated = calcRun.totalPointsEvaluated;
            let currentTotalFailed = calcRun.totalPointsFailed;
            let currentMaxRatio = Number(calcRun.maxErrorToMpeRatio);

            for (const obs of sessionData.observations) {
              // Check idempotency by sequence or localId
              const existingObs = await tx.rawObservation.findFirst({
                where: {
                  testSessionId: session.id,
                  OR: [
                    ...(obs.localId ? [{ localId: obs.localId }] : []),
                    {
                      testPlanItemId: obs.testPlanItemId,
                      sequenceNumber: obs.sequenceNumber,
                    },
                  ],
                },
              });

              if (existingObs) {
                continue; // Skip already synced observation
              }

              // Determine active interval e
              let activeE = toDecimalString(model.verificationScaleIntervalE);
              let activeRangeIndex = obs.activePartialRangeIndex || 1;

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
                    obs.targetLoadL,
                    mappedRanges,
                    {
                      unit,
                      direction:
                        obs.loadRunDirection === "DESCENDING"
                          ? "decreasing"
                          : "increasing",
                    },
                  );
                  activeE = activeRangeRes.activeE;
                  activeRangeIndex = activeRangeRes.rangeIndex;
                } catch {
                  activeE = toDecimalString(model.verificationScaleIntervalE);
                }
              }

              // Metrological math
              let zeroEDecimal = "0.0";
              if (obs.zeroIndicationI0) {
                const zeroP = calculateIndicationP(
                  obs.zeroIndicationI0,
                  obs.zeroDeltaL0 || "0.0",
                  activeE,
                  { unit },
                );
                zeroEDecimal = calculateRawErrorE(zeroP, "0.0").toString();
              }

              const compliance = evaluateObservationCompliance({
                indicatedI: obs.displayedIndicationI,
                deltaL: obs.changeoverWeightDl,
                loadMassL: obs.targetLoadL,
                zeroErrorE0: zeroEDecimal,
                e: activeE,
                accuracyClass,
                unit,
              });

              // Persist RawObservation
              const createdObs = await tx.rawObservation.create({
                data: {
                  localId: obs.localId || undefined,
                  testSessionId: session.id,
                  testPlanItemId: obs.testPlanItemId,
                  sequenceNumber: obs.sequenceNumber,
                  testClause: obs.testClause,
                  loadRunDirection: obs.loadRunDirection,
                  targetLoadL: new Prisma.Decimal(
                    toDecimalString(obs.targetLoadL),
                  ),
                  displayedIndicationI: new Prisma.Decimal(
                    toDecimalString(obs.displayedIndicationI),
                  ),
                  changeoverWeightDl: new Prisma.Decimal(
                    toDecimalString(obs.changeoverWeightDl),
                  ),
                  zeroIndicationI0: new Prisma.Decimal(
                    toDecimalString(obs.zeroIndicationI0),
                  ),
                  eccentricityPosition: obs.eccentricityPosition,
                  elapsedTimeMinutes: obs.elapsedTimeMinutes
                    ? new Prisma.Decimal(
                        toDecimalString(obs.elapsedTimeMinutes),
                      )
                    : null,
                  activePartialRangeIndex: activeRangeIndex,
                  recordedAt: obs.recordedAt
                    ? new Date(obs.recordedAt)
                    : new Date(),
                },
              });

              // Persist Weights Used
              if (obs.weightsUsed && obs.weightsUsed.length > 0) {
                for (const w of obs.weightsUsed) {
                  await tx.observationWeightUsed.create({
                    data: {
                      rawObservationId: createdObs.id,
                      calibrationCertificateId: w.calibrationCertificateId,
                      weightMassApplied: new Prisma.Decimal(
                        toDecimalString(w.weightMassApplied),
                      ),
                    },
                  });
                }
              }

              // Persist CalculationTraceItem
              await tx.calculationTraceItem.create({
                data: {
                  calculationRunId: calcRun.id,
                  rawObservationId: createdObs.id,
                  preRoundingIndicationP: new Prisma.Decimal(
                    compliance.indicatedP,
                  ),
                  rawErrorE: new Prisma.Decimal(compliance.rawErrorE),
                  zeroErrorE0: new Prisma.Decimal(compliance.zeroErrorE0),
                  correctedIntrinsicErrorEc: new Prisma.Decimal(
                    compliance.correctedErrorEc,
                  ),
                  mpeLimitApplied: new Prisma.Decimal(compliance.mpeInMass),
                  mpeBracketCategory: compliance.stepBracket,
                  complianceStatus: compliance.pass ? "PASS" : "FAIL",
                  stepDerivationTreeJson: [
                    `P = I + 0.5e - dL = ${compliance.indicatedI} + 0.5*${compliance.e} - ${compliance.deltaL} = ${compliance.indicatedP}`,
                    `E = P - L = ${compliance.indicatedP} - ${compliance.loadMassL} = ${compliance.rawErrorE}`,
                    `Ec = E - E0 = ${compliance.rawErrorE} - ${compliance.zeroErrorE0} = ${compliance.correctedErrorEc}`,
                    `MPE = ${compliance.mpeInMass} (${compliance.stepBracket})`,
                    `Ratio to MPE = ${compliance.ratioToMpe}`,
                  ] as any,
                },
              });

              newObservationsCount++;
              currentTotalEvaluated++;
              if (!compliance.pass) {
                currentTotalFailed++;
              }
              const ratio = Number(compliance.ratioToMpe);
              if (ratio > currentMaxRatio) {
                currentMaxRatio = ratio;
              }
            }

            // 3. Ingest Environmental Logs
            let newEnvLogsCount = 0;
            if (
              sessionData.environmentalLogs &&
              sessionData.environmentalLogs.length > 0
            ) {
              for (const env of sessionData.environmentalLogs) {
                await tx.sessionEnvironmentalLog.create({
                  data: {
                    testSessionId: session.id,
                    temperatureC: new Prisma.Decimal(
                      toDecimalString(env.temperatureC),
                    ),
                    relativeHumidityPercent: new Prisma.Decimal(
                      toDecimalString(env.relativeHumidityPercent),
                    ),
                    barometricPressureHpa: env.barometricPressureHpa
                      ? new Prisma.Decimal(
                          toDecimalString(env.barometricPressureHpa),
                        )
                      : null,
                    loggedAt: env.loggedAt
                      ? new Date(env.loggedAt)
                      : new Date(),
                  },
                });
                newEnvLogsCount++;
              }
            }

            // 4. Update CalculationRun summary
            if (newObservationsCount > 0) {
              await tx.calculationRun.update({
                where: { id: calcRun.id },
                data: {
                  totalPointsEvaluated: currentTotalEvaluated,
                  totalPointsFailed: currentTotalFailed,
                  maxErrorToMpeRatio: new Prisma.Decimal(
                    currentMaxRatio.toFixed(4),
                  ),
                  overallComplianceStatus:
                    currentTotalFailed > 0 ? "FAIL" : "PASS",
                  executedAt: new Date(),
                },
              });
            }

            // 5. Append to WELMEC 7.2 Cryptographic Provenance Chain
            const lastNode = await tx.provenanceNode.findFirst({
              where: { testSessionId: session.id },
              orderBy: { nodeSequence: "desc" },
            });

            const nextSeq = lastNode ? lastNode.nodeSequence + 1 : 0;
            const prevHash = lastNode
              ? lastNode.currentNodeHashSha256
              : GENESIS_PREV_HASH;

            const provNodeRecord = generateProvenanceNode({
              testSessionId: session.id,
              nodeSequence: nextSeq,
              nodeType: "OBSERVATION_LOG",
              previousNodeHashSha256: prevHash,
              payload: {
                syncType: "OFFLINE_BATCH_PUSH",
                deviceId: validated.deviceId,
                observationsIngested: newObservationsCount,
                environmentalLogsIngested: newEnvLogsCount,
                syncedAt: new Date().toISOString(),
              },
            });

            const createdProvNode = await tx.provenanceNode.create({
              data: {
                testSessionId: session.id,
                nodeSequence: provNodeRecord.nodeSequence,
                nodeType: provNodeRecord.nodeType,
                previousNodeHashSha256: provNodeRecord.previousNodeHashSha256,
                payloadHashSha256: provNodeRecord.payloadHashSha256,
                currentNodeHashSha256: provNodeRecord.currentNodeHashSha256,
              },
            });

            // 6. Update TestSession sync state
            await tx.testSession.update({
              where: { id: session.id },
              data: {
                syncStatus: "SYNCED",
                deviceId: validated.deviceId || session.deviceId,
                serverSyncedAt: new Date(),
                status:
                  session.status === "DRAFT" ? "IN_PROGRESS" : session.status,
              },
            });

            return {
              sessionId: session.id,
              success: true,
              observationsIngested: newObservationsCount,
              environmentalLogsIngested: newEnvLogsCount,
              latestProvenanceHash: createdProvNode.currentNodeHashSha256,
              provenanceSequence: createdProvNode.nodeSequence,
              syncStatus: "SYNCED",
            };
          });

          syncedResults.push(result);
        }

        res.status(200).json({
          success: true,
          syncedSessions: syncedResults,
          serverTimestamp: new Date().toISOString(),
        });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

export const syncRouter = createSyncRouter();
