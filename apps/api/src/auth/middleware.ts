import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, AuthenticatedUser, Role } from "./service.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware: Enforces Bearer JWT authentication.
 * Verifies the token and attaches the decoded AuthenticatedUser to `req.user`.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error:
        "Authentication required. Missing or malformed Authorization header.",
      code: "UNAUTHORIZED",
      path: req.originalUrl,
      requestId: req.headers["x-request-id"],
    });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      error: "Authentication token missing.",
      code: "UNAUTHORIZED",
      path: req.originalUrl,
      requestId: req.headers["x-request-id"],
    });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    return next();
  } catch (err: any) {
    const isExpired = err?.name === "TokenExpiredError";
    return res.status(401).json({
      error: isExpired
        ? "Authentication token has expired. Please refresh your session."
        : "Invalid authentication token.",
      code: isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
      path: req.originalUrl,
      requestId: req.headers["x-request-id"],
    });
  }
}

/**
 * Middleware factory: Enforces Role-Based Access Control (RBAC).
 * Returns 401 if unauthenticated, 403 if role is not in allowed roles.
 */
export function requireRole(allowedRoles: Role | string | (Role | string)[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required.",
        code: "UNAUTHORIZED",
        path: req.originalUrl,
        requestId: req.headers["x-request-id"],
      });
    }

    if (!roles.includes(req.user.role as Role)) {
      return res.status(403).json({
        error: `Forbidden: User role '${req.user.role}' is not authorized. Required: [${roles.join(", ")}].`,
        code: "FORBIDDEN",
        path: req.originalUrl,
        requestId: req.headers["x-request-id"],
      });
    }

    return next();
  };
}

/**
 * Middleware factory: Enforces granular permission requirements.
 * Allows access if the user holds the required permission or has the '*' admin wildcard.
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required.",
        code: "UNAUTHORIZED",
        path: req.originalUrl,
        requestId: req.headers["x-request-id"],
      });
    }

    const perms = req.user.permissions || [];
    const hasPermission = perms.includes(permission) || perms.includes("*");

    if (!hasPermission) {
      return res.status(403).json({
        error: `Forbidden: Missing required permission '${permission}'.`,
        code: "FORBIDDEN",
        path: req.originalUrl,
        requestId: req.headers["x-request-id"],
      });
    }

    return next();
  };
}

/**
 * Middleware: Optional Bearer JWT authentication.
 * If token is present and valid, attaches `req.user`.
 * If missing or invalid, proceeds without rejecting, allowing read-only access.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
  } catch {
    // Tolerated for optional auth
  }

  return next();
}
