import express, { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

export interface AppOptions {
  corsOrigin?: string | string[];
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
  const allowedOrigins = options.corsOrigin || process.env.CORS_ORIGIN || "*";
  app.use(
    cors({
      origin: allowedOrigins === "*" ? "*" : allowedOrigins,
      credentials: allowedOrigins !== "*",
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

  // 7. 404 Fallback Handler
  app.use(notFoundHandler);

  // 8. Centralized Global Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
