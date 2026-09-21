import type {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";
import { ZodError } from "zod";

export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: unknown;
  path?: string;
  requestId?: string;
  timestamp: string;
}

/**
 * Global centralized error handling middleware.
 * Formats errors consistently as JSON with error message, error code, and timestamp.
 */
export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const timestamp = new Date().toISOString();
  const requestId = (req.headers["x-request-id"] as string) || undefined;
  const path = req.originalUrl || req.url;

  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Input validation failed",
      code: "VALIDATION_ERROR",
      details: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
        code: e.code,
      })),
      path,
      requestId,
      timestamp,
    });
    return;
  }

  // Handle Malformed JSON request bodies
  if (
    err instanceof SyntaxError &&
    "status" in err &&
    (err as any).status === 400 &&
    "body" in err
  ) {
    res.status(400).json({
      error: "Malformed JSON payload in request body",
      code: "INVALID_JSON",
      path,
      requestId,
      timestamp,
    });
    return;
  }

  // Handle Explicit HTTP Status or default to 500
  const statusCode =
    typeof err.statusCode === "number"
      ? err.statusCode
      : typeof err.status === "number"
        ? err.status
        : 500;
  const code =
    err.code && typeof err.code === "string"
      ? err.code
      : statusCode === 500
        ? "INTERNAL_SERVER_ERROR"
        : "ERROR";
  const message =
    statusCode === 500 && process.env.NODE_ENV === "production"
      ? "An internal server error occurred"
      : err.message || "Unknown error occurred";

  res.status(statusCode).json({
    error: message,
    code,
    details: err.details,
    path,
    requestId,
    timestamp,
  });
};

/**
 * 404 Not Found fallback handler for unmatched API routes.
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl || req.url}`,
    code: "NOT_FOUND",
    path: req.originalUrl || req.url,
    requestId: (req.headers["x-request-id"] as string) || undefined,
    timestamp: new Date().toISOString(),
  });
};
