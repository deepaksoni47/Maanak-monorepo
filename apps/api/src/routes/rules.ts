import { Router, Request, Response, NextFunction } from "express";
import {
  RulePackRegistry,
  rulePackRegistry as defaultRulePackRegistry,
  validateRulePack,
} from "@maanak/rules-engine";
import { requireAuth, requireRole, Role } from "../auth/index.js";

export interface RulesRouterOptions {
  registry?: RulePackRegistry;
}

/**
 * Creates the Rule Pack Management REST router.
 */
export function createRulesRouter(options: RulesRouterOptions = {}): Router {
  const router = Router();
  const registry = options.registry || defaultRulePackRegistry;

  /**
   * GET /api/v1/rules
   * Lists metadata for all registered rule packs.
   */
  router.get("/", (_req: Request, res: Response) => {
    const packs = registry.listRulePacks();
    return res.status(200).json({
      success: true,
      count: packs.length,
      rulePacks: packs,
    });
  });

  /**
   * GET /api/v1/rules/active
   * Retrieves full specification of the currently active rule pack.
   */
  router.get("/active", (_req: Request, res: Response, next: NextFunction) => {
    try {
      const activePack = registry.getActiveRulePack();
      return res.status(200).json({
        success: true,
        rulePack: activePack,
      });
    } catch (err) {
      return next(err);
    }
  });

  /**
   * GET /api/v1/rules/:id
   * Retrieves full specification for a specific rule pack by its ID.
   */
  router.get("/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    if (!registry.hasRulePack(id)) {
      return res.status(404).json({
        error: `Rule pack with ID '${id}' not found.`,
        code: "NOT_FOUND",
        path: req.originalUrl,
        requestId: req.headers["x-request-id"],
      });
    }

    const pack = registry.getRulePack(id);
    return res.status(200).json({
      success: true,
      rulePack: pack,
    });
  });

  /**
   * Handler for registering a rule pack payload.
   */
  const handleUpload = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const payload = req.body?.rulePack ? req.body.rulePack : req.body;
      const setActive = Boolean(req.body?.setActive);

      const validatedPack = validateRulePack(payload);
      const registered = registry.registerRulePack(validatedPack, {
        setActive,
      });

      return res.status(201).json({
        success: true,
        message: `Rule pack '${registered.id}' registered successfully.`,
        rulePack: {
          id: registered.id,
          standard: registered.standard,
          title: registered.title,
          version: registered.version,
          effectiveFrom: registered.effectiveFrom,
          issuingBody: registered.issuingBody,
          isActive: registry.getActiveRulePack().id === registered.id,
        },
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * POST /api/v1/rules/upload
   * Registers a new or updated rule pack. Restricted to ADMIN.
   */
  router.post("/upload", requireAuth, requireRole(Role.ADMIN), handleUpload);
  router.post("/", requireAuth, requireRole(Role.ADMIN), handleUpload);

  /**
   * POST /api/v1/rules/:id/activate
   * Hot-swaps the currently active rule pack. Restricted to ADMIN and DIRECTOR.
   */
  router.post(
    "/:id/activate",
    requireAuth,
    requireRole([Role.ADMIN, Role.DIRECTOR]),
    (req: Request, res: Response) => {
      const { id } = req.params;
      if (!registry.hasRulePack(id)) {
        return res.status(404).json({
          error: `Rule pack with ID '${id}' not found.`,
          code: "NOT_FOUND",
          path: req.originalUrl,
          requestId: req.headers["x-request-id"],
        });
      }

      const active = registry.setActiveRulePack(id);
      return res.status(200).json({
        success: true,
        message: `Active rule pack set to '${id}'.`,
        activePackId: active.id,
      });
    },
  );

  return router;
}

export const rulesRouter = createRulesRouter();
