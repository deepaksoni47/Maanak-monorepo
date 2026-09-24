import { Request, Response, NextFunction } from "express";
import { Role } from "../auth/service.js";

declare global {
  namespace Express {
    interface Request {
      tenantLaboratoryId?: string;
    }
  }
}

/**
 * Multi-Tenant Laboratory Scoping Middleware (TASK-085)
 *
 * Extracts laboratoryId from authenticated JWT claims (req.user.laboratoryId).
 * - For non-ADMIN users, strictly enforces laboratory tenancy.
 * - For ADMIN users, allows cross-facility access or explicit laboratory targeting via query/header parameter.
 */
export function tenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return next();
  }

  // Admin users can optionally specify target laboratory or operate cross-facility
  if (req.user.role === Role.ADMIN) {
    const overrideLabId =
      (req.query.laboratoryId as string) ||
      (req.headers["x-laboratory-id"] as string) ||
      req.user.laboratoryId;
    req.tenantLaboratoryId = overrideLabId;
    return next();
  }

  // Non-admin roles (INSPECTOR, REVIEWER, DIRECTOR) are strictly scoped to their assigned facility
  req.tenantLaboratoryId = req.user.laboratoryId;
  return next();
}

/**
 * Helper: Computes Prisma `where` clause filter for multi-tenant laboratory scoping.
 * - Returns `{ laboratoryId: string }` for scoped tenant users.
 * - Returns `{}` for ADMIN cross-facility queries (unless explicitly filtered).
 */
export function getTenantWhereClause(req: Request): { laboratoryId?: string } {
  if (!req.user) return {};

  if (req.user.role === Role.ADMIN) {
    const explicitLabId =
      (req.query.laboratoryId as string) ||
      (req.headers["x-laboratory-id"] as string);
    return explicitLabId ? { laboratoryId: explicitLabId } : {};
  }

  return req.user.laboratoryId ? { laboratoryId: req.user.laboratoryId } : {};
}

/**
 * Helper: Asserts that an authenticated user has statutory permission to access
 * a laboratory-scoped record (e.g. test session, reference weight, physical instrument unit).
 *
 * Returns true if permitted, false if cross-tenant violation.
 */
export function isTenantAccessAllowed(
  req: Request,
  resourceLaboratoryId: string | null | undefined,
): boolean {
  if (!req.user) return false;
  if (req.user.role === Role.ADMIN) return true;
  if (!resourceLaboratoryId) return true;
  return req.user.laboratoryId === resourceLaboratoryId;
}
