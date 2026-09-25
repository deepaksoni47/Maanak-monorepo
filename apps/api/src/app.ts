import express, { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { tenantMiddleware } from "./middleware/tenant.js";
import { createAuthRouter, authRouter, AuthService } from "./auth/index.js";
import {
  createRulesRouter,
  rulesRouter,
  createWeightsRouter,
  weightsRouter,
  createInstrumentsRouter,
  instrumentsRouter,
  createSessionsRouter,
  sessionsRouter,
  createObservationsRouter,
  observationsRouter,
  createReviewRouter,
  reviewRouter,
  createReportsRouter,
  reportsRouter,
  createVerifyRouter,
  verifyRouter,
  createSyncRouter,
  syncRouter,
  createEvidenceRouter,
  evidenceRouter,
  createAdminRouter,
  adminRouter,
} from "./routes/index.js";
import { RulePackRegistry } from "@maanak/rules-engine";
import { PrismaClient } from "@maanak/db";
import { IReportStorage } from "@maanak/report-generator";

export interface AppOptions {
  corsOrigin?: string | string[];
  authService?: AuthService;
  rulesRegistry?: RulePackRegistry;
  db?: PrismaClient;
  storage?: IReportStorage;
}

/**
 * Express application factory.
 * Configures security middleware, standard routing, request tracing, and centralized error handling.
 */
export function createApp(options: AppOptions = {}): Express {
  const app: Express = express();

  // 1. Security HTTP Headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 2. Cross-Origin Resource Sharing (CORS)
  const rawOrigins = options.corsOrigin || process.env.CORS_ORIGIN || process.env.CLIENT_URL || "*";
  const parseOrigin = (s: string) => s.trim().replace(/\/+$/, "");

  let allowedOriginsList: string[] = [];
  let isWildcard = false;

  if (Array.isArray(rawOrigins)) {
    allowedOriginsList = rawOrigins.map(parseOrigin);
    if (allowedOriginsList.includes("*")) isWildcard = true;
  } else if (typeof rawOrigins === "string") {
    if (rawOrigins.trim() === "*") {
      isWildcard = true;
    } else {
      allowedOriginsList = rawOrigins.split(",").map(parseOrigin).filter(Boolean);
    }
  }

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        if (!requestOrigin || isWildcard) {
          return callback(null, true);
        }
        const cleanOrigin = parseOrigin(requestOrigin);
        if (allowedOriginsList.includes(cleanOrigin)) {
          return callback(null, true);
        }
        // Allow LAN / localhost origins
        const isLocalNetwork = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
          cleanOrigin,
        );
        if (isLocalNetwork) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
      exposedHeaders: ["X-Request-Id"],
    }),
  );

  // 3. Request Correlation ID Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers["x-request-id"] as string) || randomUUID();
    req.headers["x-request-id"] = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
  });

  // 4. Body Parsers with 10MB payload threshold for large PDF/signature data
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(tenantMiddleware);

  // 5. Root & Health Check Endpoints
  const healthResponse = () => ({
    status: "ok",
    service: "@maanak/api",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json(healthResponse());
  });

  app.get("/api/v1/health", (_req: Request, res: Response) => {
    res.status(200).json(healthResponse());
  });

  // 6. Base API Route Index
  app.get("/", (_req: Request, res: Response) => {
    res.status(200).json({
      name: "MAANAK Legal Metrology API Gateway",
      version: "1.0.0",
      documentation: "/api/v1/docs",
      health: "/health",
      timestamp: new Date().toISOString(),
    });
  });

  // 7. Authentication & Authorization Routes
  const configuredAuthRouter = options.authService
    ? createAuthRouter(options.authService)
    : authRouter;
  app.use("/api/v1/auth", configuredAuthRouter);

  // 8. Rule Pack Management Routes
  const configuredRulesRouter = options.rulesRegistry
    ? createRulesRouter({ registry: options.rulesRegistry })
    : rulesRouter;
  app.use("/api/v1/rules", configuredRulesRouter);

  // 9. Reference Standard Weight Inventory & NABL Pre-Check Routes
  const configuredWeightsRouter = options.db
    ? createWeightsRouter({ db: options.db })
    : weightsRouter;
  app.use("/api/v1/weights", configuredWeightsRouter);

  // 10. Instrument Model Registration & Table 3 Classification Routes
  const configuredInstrumentsRouter = options.db
    ? createInstrumentsRouter({ db: options.db })
    : instrumentsRouter;
  app.use("/api/v1/instruments", configuredInstrumentsRouter);

  // 11. Test Sessions & Dynamic Plan Routes
  const configuredSessionsRouter =
    options.db || options.rulesRegistry || options.storage
      ? createSessionsRouter({
          db: options.db,
          rulesRegistry: options.rulesRegistry,
          storage: options.storage,
        })
      : sessionsRouter;
  app.use("/api/v1/sessions", configuredSessionsRouter);

  // 12. Raw Observations & Real-Time Calculation Routes
  const configuredObservationsRouter =
    options.db || options.rulesRegistry
      ? createObservationsRouter({
        db: options.db,
        rulesRegistry: options.rulesRegistry,
      })
      : observationsRouter;
  app.use("/api/v1/observations", configuredObservationsRouter);

  // 13. Reviewer Anomaly Audit & Decision Routes
  const configuredReviewRouter =
    options.db || options.rulesRegistry
      ? createReviewRouter({
        db: options.db,
        rulesRegistry: options.rulesRegistry,
      })
      : reviewRouter;
  app.use("/api/v1/review", configuredReviewRouter);

  // 14. Report Generation & Digital Signing Routes
  const configuredReportsRouter =
    options.db || options.storage
      ? createReportsRouter({
        db: options.db,
        storage: options.storage,
      })
      : reportsRouter;
  app.use("/api/v1/reports", configuredReportsRouter);

  // 15. Public Verification Route (WELMEC 7.2 QR landing)
  const configuredVerifyRouter = options.db
    ? createVerifyRouter({ db: options.db })
    : verifyRouter;
  app.use("/api/v1/verify", configuredVerifyRouter);

  // 16. Offline Sync Routes (Push / Pull)
  const configuredSyncRouter =
    options.db || options.rulesRegistry
      ? createSyncRouter({
        db: options.db,
        rulesRegistry: options.rulesRegistry,
      })
      : syncRouter;
  app.use("/api/v1/sync", configuredSyncRouter);

  // 17. Statutory Evidence & Sealing Photo Routes (Dual Cloudinary/Local)
  const configuredEvidenceRouter = options.db
    ? createEvidenceRouter({ db: options.db })
    : evidenceRouter;
  app.use("/api/v1/evidence", configuredEvidenceRouter);

  // 18. Backend Administrative Routes (Personnel, Roles & Audit Trail)
  const configuredAdminRouter = options.db
    ? createAdminRouter({ db: options.db })
    : adminRouter;
  app.use("/api/v1/admin", configuredAdminRouter);

  // 19. 404 Fallback Handler
  app.use(notFoundHandler);

  // 19. Centralized Global Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
