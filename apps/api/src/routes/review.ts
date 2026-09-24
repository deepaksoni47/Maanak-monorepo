import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { PrismaClient, prisma as defaultPrisma, Prisma } from "@maanak/db";
import {
  AnomalyDetector,
  RulePackRegistry,
  rulePackRegistry,
} from "@maanak/rules-engine";
import {
  generateProvenanceNode,
  GENESIS_PREV_HASH,
} from "@maanak/crypto-provenance";
import { requireAuth, requireRole, Role } from "../auth/index.js";

export interface ReviewRouterOptions {
  db?: PrismaClient;
  rulesRegistry?: RulePackRegistry;
}

const SubmitReviewDecisionSchema = z.object({
  testSessionId: z.string().uuid("Invalid test session ID format"),
  reviewStage: z
    .enum(["INTAKE_REVIEW", "SECOND_LEVEL_REVIEW", "DIRECTOR_APPROVAL"])
    .default("SECOND_LEVEL_REVIEW"),
  decision: z.enum(["APPROVED", "FLAGGED_FOR_CORRECTION", "REJECTED"]),
  comments: z.string().min(1, "Reviewer comments are required"),
  flaggedFormId: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export function createReviewRouter(options: ReviewRouterOptions = {}): Router {
  const router = Router();
  const db = options.db || defaultPrisma;
  const registry = options.rulesRegistry || rulePackRegistry;

  /**
   * Helper: Run AnomalyDetector on a session and return structured anomaly audit
   */
  async function performSessionAudit(sessionId: string) {
    const session = await db.testSession.findUnique({
      where: { id: sessionId },
      include: {
        instrumentUnit: {
          include: {
            instrumentModel: true,
          },
        },
        rawObservations: {
          orderBy: { sequenceNumber: "asc" },
        },
        environmentalLogs: {
          orderBy: { loggedAt: "asc" },
        },
      },
    });

    if (!session) return null;

    const model = session.instrumentUnit.instrumentModel;
    const activeRulePack = registry.getActiveRulePack();

    const detector = new AnomalyDetector({
      e: String(model.verificationScaleIntervalE),
      max: String(model.maxCapacity),
      min: String(model.minCapacity),
      unit: (model.unitOfMeasure as any) || "kg",
      rulePack: activeRulePack,
    });

    // Monotonicity & DeltaL checks on raw observations
    const observations = session.rawObservations.map((obs) => ({
      id: obs.id,
      stepIndex: obs.sequenceNumber,
      load: String(obs.targetLoadL),
      indication: String(obs.displayedIndicationI),
      deltaL: String(obs.changeoverWeightDl),
      unit: (model.unitOfMeasure as any) || "kg",
    }));

    // Environmental stability inputs if multiple logs exist
    let environmental: any = undefined;
    if (session.environmentalLogs && session.environmentalLogs.length >= 2) {
      const first = session.environmentalLogs[0];
      const last =
        session.environmentalLogs[session.environmentalLogs.length - 1];
      const diffHours =
        (last.loggedAt.getTime() - first.loggedAt.getTime()) / (1000 * 60 * 60);

      environmental = {
        tempStartC: Number(first.temperatureC),
        tempEndC: Number(last.temperatureC),
        durationHours: diffHours > 0 ? diffHours : 1,
        startTime: first.loggedAt,
        endTime: last.loggedAt,
      };
    }

    const auditReport = detector.auditSession({
      instrument: {
        e: String(model.verificationScaleIntervalE),
        max: String(model.maxCapacity),
        min: String(model.minCapacity),
        unit: (model.unitOfMeasure as any) || "kg",
      },
      observations,
      environmental,
    });

    return { session, auditReport };
  }

  // ---------------------------------------------------------------------------
  // 1. GET /api/v1/review/sessions/:id/audit - Run anomaly detector & flag anomalies
  // ---------------------------------------------------------------------------
  router.get(
    "/sessions/:id/audit",
    requireAuth,
    requireRole([Role.REVIEWER, Role.DIRECTOR, Role.ADMIN]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;

        const auditData = await performSessionAudit(id);
        if (!auditData) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `Test session with ID "${id}" not found.`,
          });
          return;
        }

        const { session, auditReport } = auditData;

        res.status(200).json({
          testSessionId: session.id,
          sessionNumber: session.sessionNumber,
          status: session.status,
          audit: auditReport,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 2. GET /api/v1/review/sessions/:id/history - Review audit trail history
  // ---------------------------------------------------------------------------
  router.get(
    "/sessions/:id/history",
    requireAuth,
    requireRole([Role.REVIEWER, Role.DIRECTOR, Role.ADMIN, Role.INSPECTOR]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;

        const session = await db.testSession.findUnique({
          where: { id },
          select: { id: true, sessionNumber: true },
        });

        if (!session) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `Test session with ID "${id}" not found.`,
          });
          return;
        }

        const audits = await db.reviewAudit.findMany({
          where: { testSessionId: id },
          orderBy: { reviewedAt: "desc" },
          include: {
            reviewerUser: {
              select: {
                id: true,
                username: true,
                fullName: true,
                designation: true,
                role: { select: { code: true, name: true } },
              },
            },
          },
        });

        res.status(200).json({
          testSessionId: session.id,
          sessionNumber: session.sessionNumber,
          count: audits.length,
          audits,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 3. POST /api/v1/review/decision - Senior Reviewer / Director sign-off decision
  // ---------------------------------------------------------------------------
  router.post(
    "/decision",
    requireAuth,
    requireRole([Role.REVIEWER, Role.DIRECTOR, Role.ADMIN]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validated = SubmitReviewDecisionSchema.parse(req.body);
        const reviewerId = req.user!.sub;

        const auditData = await performSessionAudit(validated.testSessionId);
        if (!auditData) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `Test session with ID "${validated.testSessionId}" not found.`,
          });
          return;
        }

        const { session, auditReport } = auditData;

        // Determine new session status based on reviewer decision
        let nextSessionStatus: string;
        if (validated.decision === "APPROVED") {
          nextSessionStatus =
            validated.reviewStage === "DIRECTOR_APPROVAL"
              ? "APPROVED_LOCKED"
              : "COMPLETED";
        } else if (validated.decision === "FLAGGED_FOR_CORRECTION") {
          nextSessionStatus = "RETURNED_TO_OFFICER";
        } else {
          nextSessionStatus = "LOCKED"; // rejected/cancelled
        }

        const result = await db.$transaction(async (tx) => {
          // 1. Create ReviewAudit entry
          const formattedComments = validated.flaggedFormId
            ? `[FLAGGED_CLAUSE: ${validated.flaggedFormId}] ${validated.comments}`
            : validated.comments;

          const reviewAudit = await tx.reviewAudit.create({
            data: {
              testSessionId: session.id,
              reviewerUserId: reviewerId,
              reviewStage: validated.reviewStage,
              decision: validated.decision,
              comments: formattedComments,
              automatedAnomalyFlagsJson:
                auditReport.flags as unknown as Prisma.InputJsonValue,
              reviewedAt: new Date(),
            },
          });

          // 2. Update session status
          const updatedSession = await tx.testSession.update({
            where: { id: session.id },
            data: {
              status: nextSessionStatus,
              completedAt:
                nextSessionStatus === "COMPLETED" ? new Date() : undefined,
            },
          });

          // 3. Append to WELMEC 7.2 provenance chain
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
            nodeType: "REVIEW_AUDIT",
            previousNodeHashSha256: prevHash,
            payload: {
              reviewAuditId: reviewAudit.id,
              reviewerId,
              reviewStage: validated.reviewStage,
              decision: validated.decision,
              anomalyCount: auditReport.totalAnomalies,
              criticalAnomalies: auditReport.criticalCount,
              reviewedAt: reviewAudit.reviewedAt.toISOString(),
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

          return { reviewAudit, updatedSession, provNodeRecord };
        });

        res.status(201).json({
          message: `Review decision "${validated.decision}" recorded successfully.`,
          reviewAudit: result.reviewAudit,
          sessionStatus: result.updatedSession.status,
          anomaliesDetected: auditReport.totalAnomalies,
          provenance: {
            nodeSequence: result.provNodeRecord.nodeSequence,
            currentHash: result.provNodeRecord.currentNodeHashSha256,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

export const reviewRouter = createReviewRouter();
