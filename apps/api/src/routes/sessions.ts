import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  PrismaClient,
  prisma as defaultPrisma,
  sessionWithDetailsInclude,
  SessionWithDetails,
} from "@maanak/db";
import {
  generateTestPlan,
  RulePackRegistry,
  rulePackRegistry,
} from "@maanak/rules-engine";
import { requireAuth, requireRole, Role } from "../auth/index.js";

export interface SessionsRouterOptions {
  db?: PrismaClient;
  rulesRegistry?: RulePackRegistry;
}

const CreateSessionRequestSchema = z.object({
  laboratoryId: z.string().uuid("Invalid laboratory ID format").optional(),
  instrumentUnitId: z.string().uuid("Invalid instrument unit ID format"),
  testPlanId: z.string().uuid("Invalid test plan ID format").optional(),
  rulePackVersionId: z
    .string()
    .uuid("Invalid rule pack version ID format")
    .optional(),
  sessionNumber: z.string().optional(),
  deviceId: z.string().optional(),
  localId: z.string().uuid().optional(),
  startedAt: z.string().datetime().optional(),
});

const UpdateSessionStatusSchema = z.object({
  status: z.enum([
    "DRAFT",
    "IN_PROGRESS",
    "UNDER_REVIEW",
    "COMPLETED",
    "CANCELLED",
    "LOCKED",
  ]),
  comments: z.string().optional(),
});

export function createSessionsRouter(
  options: SessionsRouterOptions = {},
): Router {
  const router = Router();
  const db = options.db || defaultPrisma;
  const registry = options.rulesRegistry || rulePackRegistry;

  /**
   * Helper: Map Prisma InstrumentModel to InstrumentModelSpecification for generateTestPlan
   */
  function mapToModelSpec(model: any) {
    return {
      modelName: model.modelName,
      patternDesignation: model.patternDesignation,
      manufacturer: model.manufacturer?.companyName || "Unknown Manufacturer",
      accuracyClass: model.accuracyClass?.code || model.accuracyClass || "III",
      instrumentType: model.instrumentType || "SINGLE_INTERVAL",
      weighingPrinciple: model.weighingPrinciple,
      maxCapacity: String(model.maxCapacity),
      minCapacity: String(model.minCapacity),
      verificationIntervalE: String(
        model.verificationScaleIntervalE || model.verificationIntervalE,
      ),
      actualIntervalD: String(
        model.actualScaleIntervalD ||
          model.actualIntervalD ||
          model.verificationScaleIntervalE,
      ),
      unitOfMeasure: (model.unitOfMeasure as any) || "kg",
      isMultiInterval: Boolean(model.isMultiInterval),
      isMultipleRange: Boolean(model.isMultipleRange),
      numberOfPartialRanges: model.numberOfPartialRanges || 1,
      partialRanges: model.partialRanges?.map((pr: any) => ({
        rangeIndex: pr.rangeIndex,
        maxCapacity: String(pr.maxCapacityI || pr.maxCapacity),
        minCapacity: pr.minCapacityI ? String(pr.minCapacityI) : undefined,
        verificationIntervalE: String(
          pr.verificationScaleIntervalEI || pr.verificationIntervalE,
        ),
        actualIntervalD: String(pr.actualScaleIntervalDI || pr.actualIntervalD),
        scaleDivisionCountN: pr.scaleDivisionCountNI || pr.scaleDivisionCountN,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // 1. POST /api/v1/sessions - Create new test session
  // ---------------------------------------------------------------------------
  router.post(
    "/",
    requireAuth,
    requireRole([Role.INSPECTOR, Role.ADMIN]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validated = CreateSessionRequestSchema.parse(req.body);
        const officerId = req.user!.sub;
        const laboratoryId = validated.laboratoryId || req.user!.laboratoryId;

        if (!laboratoryId) {
          res.status(400).json({
            error: "VALIDATION_ERROR",
            message:
              "Laboratory ID is required either in request body or user profile.",
          });
          return;
        }

        // Verify instrument unit exists
        const unit = await db.instrumentUnit.findUnique({
          where: { id: validated.instrumentUnitId },
          include: {
            instrumentModel: {
              include: {
                accuracyClass: true,
                manufacturer: true,
                partialRanges: true,
              },
            },
          },
        });

        if (!unit) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `Instrument unit with ID "${validated.instrumentUnitId}" not found.`,
          });
          return;
        }

        // Determine or resolve RulePackVersion
        let rulePackVersionId = validated.rulePackVersionId;
        if (!rulePackVersionId) {
          const activeVersion = await db.rulePackVersion.findFirst({
            where: { isActive: true },
            orderBy: { effectiveFrom: "desc" },
          });

          if (activeVersion) {
            rulePackVersionId = activeVersion.id;
          } else {
            // Fallback: search any version or synthesize default
            const anyVersion = await db.rulePackVersion.findFirst();
            if (anyVersion) {
              rulePackVersionId = anyVersion.id;
            } else {
              res.status(400).json({
                error: "CONFIGURATION_ERROR",
                message: "No active rule pack version configured in database.",
              });
              return;
            }
          }
        }

        // Determine or resolve / generate TestPlan
        let testPlanId = validated.testPlanId;
        if (!testPlanId) {
          // Check if instrument model already has a test plan
          const existingPlan = await db.testPlan.findFirst({
            where: { instrumentModelId: unit.instrumentModelId },
            include: { items: true },
          });

          if (existingPlan) {
            testPlanId = existingPlan.id;
          } else {
            // Dynamically generate test plan using rules engine
            const activeRulePack = registry.getActiveRulePack();
            const modelSpec = mapToModelSpec(unit.instrumentModel);
            const dynamicPlan = generateTestPlan(modelSpec, activeRulePack);

            // Persist the generated test plan and plan items
            const newPlan = await db.testPlan.create({
              data: {
                instrumentModelId: unit.instrumentModelId,
                title:
                  dynamicPlan.title ||
                  `${unit.instrumentModel.modelName} Test Plan`,
                totalTestClauses: dynamicPlan.totalTestClauses,
                items: {
                  create: dynamicPlan.items.map((item, idx) => ({
                    clauseNumber: item.clauseNumber,
                    formNumber: item.formNumber,
                    title: item.title,
                    executionOrder: idx + 1,
                    isMandatory: item.isMandatory ?? true,
                  })),
                },
              },
            });
            testPlanId = newPlan.id;
          }
        }

        // Generate unique session number if not provided: SES-YYYYMMDD-XXXX
        const sessionNumber =
          validated.sessionNumber ||
          `SES-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
            1000 + Math.random() * 9000,
          )}`;

        const session = await db.testSession.create({
          data: {
            sessionNumber,
            laboratoryId,
            instrumentUnitId: validated.instrumentUnitId,
            testPlanId: testPlanId!,
            rulePackVersionId: rulePackVersionId!,
            testingOfficerId: officerId,
            deviceId: validated.deviceId,
            localId: validated.localId,
            status: "DRAFT",
            startedAt: validated.startedAt
              ? new Date(validated.startedAt)
              : new Date(),
          },
          include: sessionWithDetailsInclude,
        });

        res.status(201).json({
          message: "Test session created successfully.",
          session,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 2. GET /api/v1/sessions - List test sessions with filters
  // ---------------------------------------------------------------------------
  router.get(
    "/",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const {
          laboratoryId,
          status,
          testingOfficerId,
          instrumentUnitId,
          search,
          page = "1",
          limit = "20",
        } = req.query;

        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const take = Math.min(
          100,
          Math.max(1, parseInt(limit as string, 10) || 20),
        );
        const skip = (pageNum - 1) * take;

        const where: any = {};

        // Scope to user's lab if inspector, unless lab is specified or user is admin
        if (laboratoryId) {
          where.laboratoryId = laboratoryId as string;
        } else if (req.user?.role !== Role.ADMIN && req.user?.laboratoryId) {
          where.laboratoryId = req.user.laboratoryId;
        }

        if (status) {
          where.status = status as string;
        }

        if (testingOfficerId) {
          where.testingOfficerId = testingOfficerId as string;
        }

        if (instrumentUnitId) {
          where.instrumentUnitId = instrumentUnitId as string;
        }

        if (search) {
          const searchStr = String(search);
          where.OR = [
            { sessionNumber: { contains: searchStr, mode: "insensitive" } },
            {
              instrumentUnit: {
                serialNumber: { contains: searchStr, mode: "insensitive" },
              },
            },
          ];
        }

        const [sessions, totalCount] = await Promise.all([
          db.testSession.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
              laboratory: {
                select: {
                  id: true,
                  laboratoryName: true,
                  laboratoryCode: true,
                },
              },
              instrumentUnit: {
                include: {
                  instrumentModel: {
                    select: {
                      id: true,
                      modelName: true,
                      patternDesignation: true,
                      accuracyClass: true,
                      maxCapacity: true,
                      unitOfMeasure: true,
                    },
                  },
                },
              },
              testingOfficer: {
                select: {
                  id: true,
                  username: true,
                  fullName: true,
                  designation: true,
                },
              },
              testPlan: {
                select: { id: true, title: true, totalTestClauses: true },
              },
              _count: {
                select: {
                  rawObservations: true,
                  calculationRuns: true,
                  reviewAudits: true,
                },
              },
            },
          }),
          db.testSession.count({ where }),
        ]);

        res.status(200).json({
          sessions,
          meta: {
            page: pageNum,
            limit: take,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 3. GET /api/v1/sessions/:id - Get session details with include graph
  // ---------------------------------------------------------------------------
  router.get(
    "/:id",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;

        const session = await db.testSession.findUnique({
          where: { id },
          include: sessionWithDetailsInclude,
        });

        if (!session) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `Test session with ID "${id}" not found.`,
          });
          return;
        }

        res.status(200).json({ session });
      } catch (err) {
        next(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 4. GET /api/v1/sessions/:id/plan - Get or dynamically compute standard load points
  // ---------------------------------------------------------------------------
  router.get(
    "/:id/plan",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;

        const session = await db.testSession.findUnique({
          where: { id },
          include: {
            instrumentUnit: {
              include: {
                instrumentModel: {
                  include: {
                    accuracyClass: true,
                    manufacturer: true,
                    partialRanges: true,
                  },
                },
              },
            },
            testPlan: {
              include: {
                items: {
                  orderBy: { executionOrder: "asc" },
                },
              },
            },
          },
        });

        if (!session) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `Test session with ID "${id}" not found.`,
          });
          return;
        }

        const model = session.instrumentUnit.instrumentModel;
        const modelSpec = mapToModelSpec(model);
        const activeRulePack = registry.getActiveRulePack();

        // Dynamically compute the load points and test plan items
        const dynamicPlan = generateTestPlan(modelSpec, activeRulePack);

        res.status(200).json({
          testSessionId: session.id,
          sessionNumber: session.sessionNumber,
          instrumentModel: {
            id: model.id,
            modelName: model.modelName,
            patternDesignation: model.patternDesignation,
            accuracyClass: modelSpec.accuracyClass,
            maxCapacity: modelSpec.maxCapacity,
            verificationIntervalE: modelSpec.verificationIntervalE,
            unitOfMeasure: modelSpec.unitOfMeasure,
          },
          testPlan: {
            id: session.testPlanId,
            title: session.testPlan?.title || dynamicPlan.title,
            totalTestClauses: dynamicPlan.totalTestClauses,
            items: dynamicPlan.items,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 5. PATCH /api/v1/sessions/:id/status - Lifecycle transitions
  // ---------------------------------------------------------------------------
  router.patch(
    "/:id/status",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const validated = UpdateSessionStatusSchema.parse(req.body);

        const session = await db.testSession.findUnique({
          where: { id },
        });

        if (!session) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `Test session with ID "${id}" not found.`,
          });
          return;
        }

        // Validate state transitions
        // Valid transitions:
        // DRAFT -> IN_PROGRESS, CANCELLED
        // IN_PROGRESS -> UNDER_REVIEW, DRAFT, CANCELLED
        // UNDER_REVIEW -> COMPLETED, IN_PROGRESS, LOCKED
        // COMPLETED -> LOCKED
        const current = session.status;
        const nextStatus = validated.status;

        const allowedTransitions: Record<string, string[]> = {
          DRAFT: ["IN_PROGRESS", "CANCELLED"],
          IN_PROGRESS: ["UNDER_REVIEW", "DRAFT", "CANCELLED"],
          UNDER_REVIEW: ["COMPLETED", "IN_PROGRESS", "LOCKED"],
          COMPLETED: ["LOCKED"],
          CANCELLED: [],
          LOCKED: [],
        };

        if (
          current !== nextStatus &&
          !allowedTransitions[current]?.includes(nextStatus)
        ) {
          // Allow ADMIN override if needed, otherwise reject invalid transition
          if (req.user?.role !== Role.ADMIN) {
            res.status(400).json({
              error: "INVALID_STATE_TRANSITION",
              message: `Cannot transition session from status "${current}" to "${nextStatus}".`,
            });
            return;
          }
        }

        const updateData: any = {
          status: nextStatus,
        };

        if (nextStatus === "COMPLETED" && !session.completedAt) {
          updateData.completedAt = new Date();
        }

        const updated = await db.testSession.update({
          where: { id },
          data: updateData,
          include: sessionWithDetailsInclude,
        });

        // If transition is to UNDER_REVIEW, write review audit log
        if (nextStatus === "UNDER_REVIEW") {
          await db.reviewAudit.create({
            data: {
              testSessionId: id,
              reviewerUserId: req.user!.sub,
              reviewStage: "INTAKE_REVIEW",
              decision: "PENDING_REVIEW",
              comments:
                validated.comments || "Session submitted for technical review.",
              automatedAnomalyFlags: [],
            },
          });
        }

        res.status(200).json({
          message: `Session status updated to "${nextStatus}".`,
          session: updated,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

export const sessionsRouter = createSessionsRouter();
