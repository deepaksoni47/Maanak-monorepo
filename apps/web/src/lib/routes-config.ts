/**
 * Maanak Route Protection & Role-Based Access Control Configuration
 * Defines route access matrix and permission boundaries across statutory roles.
 */

export enum Role {
  ADMIN = "ADMIN",
  DIRECTOR = "DIRECTOR",
  REVIEWER = "REVIEWER",
  INSPECTOR = "INSPECTOR",
}

export interface RouteAccessRule {
  pathPattern: string | RegExp;
  exact?: boolean;
  requiresAuth: boolean;
  allowedRoles?: Role[];
}

/**
 * Statutory Route Access Matrix
 * - /bench/**: [Role.INSPECTOR, Role.ADMIN]
 * - /review/**: [Role.REVIEWER, Role.DIRECTOR, Role.ADMIN]
 * - /reports/**: [Role.INSPECTOR, Role.REVIEWER, Role.DIRECTOR, Role.ADMIN]
 * - /rule-packs/**: [Role.ADMIN]
 * - /admin/**: [Role.ADMIN]
 */
export const ROUTE_ACCESS_RULES: RouteAccessRule[] = [
  // Public routes (no auth required)
  { pathPattern: "/", exact: true, requiresAuth: false },
  { pathPattern: "/login", exact: false, requiresAuth: false },
  { pathPattern: "/access-denied", exact: false, requiresAuth: false },
  { pathPattern: "/verify", exact: false, requiresAuth: false },
  { pathPattern: "/manifest.webmanifest", exact: true, requiresAuth: false },

  // Role-restricted routes
  {
    pathPattern: "/bench",
    exact: false,
    requiresAuth: true,
    allowedRoles: [Role.INSPECTOR, Role.ADMIN],
  },
  {
    pathPattern: "/review",
    exact: false,
    requiresAuth: true,
    allowedRoles: [Role.REVIEWER, Role.DIRECTOR, Role.ADMIN],
  },
  {
    pathPattern: "/reports",
    exact: false,
    requiresAuth: true,
    allowedRoles: [Role.INSPECTOR, Role.REVIEWER, Role.DIRECTOR, Role.ADMIN],
  },
  {
    pathPattern: "/rule-packs",
    exact: false,
    requiresAuth: true,
    allowedRoles: [Role.ADMIN],
  },
  {
    pathPattern: "/admin",
    exact: false,
    requiresAuth: true,
    allowedRoles: [Role.ADMIN],
  },

  // General authenticated routes
  {
    pathPattern: "/dashboard",
    exact: false,
    requiresAuth: true,
    allowedRoles: [Role.INSPECTOR, Role.REVIEWER, Role.DIRECTOR, Role.ADMIN],
  },
  {
    pathPattern: "/instruments",
    exact: false,
    requiresAuth: true,
    allowedRoles: [Role.INSPECTOR, Role.REVIEWER, Role.DIRECTOR, Role.ADMIN],
  },
  {
    pathPattern: "/weights",
    exact: false,
    requiresAuth: true,
    allowedRoles: [Role.INSPECTOR, Role.REVIEWER, Role.DIRECTOR, Role.ADMIN],
  },
  {
    pathPattern: "/provenance",
    exact: false,
    requiresAuth: true,
    allowedRoles: [Role.INSPECTOR, Role.REVIEWER, Role.DIRECTOR, Role.ADMIN],
  },
];

/**
 * Finds matching route rule for a given pathname.
 */
export function getRouteRule(pathname: string): RouteAccessRule | undefined {
  // Normalize pathname: remove trailing slash if not root
  const normalized = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  return ROUTE_ACCESS_RULES.find((rule) => {
    if (typeof rule.pathPattern === "string") {
      if (rule.exact) {
        return normalized === rule.pathPattern;
      }
      return normalized === rule.pathPattern || normalized.startsWith(`${rule.pathPattern}/`);
    }
    return rule.pathPattern.test(normalized);
  });
}

/**
 * Determines whether a user with given role can access the specified pathname.
 */
export function checkRouteAccess(
  pathname: string,
  userRole?: string | null
): { isAllowed: boolean; redirectUrl?: string; reason?: "UNAUTHENTICATED" | "FORBIDDEN" } {
  const rule = getRouteRule(pathname);

  // If no specific rule matches, default to requiring authentication if not an internal static route
  if (!rule) {
    if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
      return { isAllowed: true };
    }
    // Default protected
    if (!userRole) {
      return {
        isAllowed: false,
        reason: "UNAUTHENTICATED",
        redirectUrl: `/login?callbackUrl=${encodeURIComponent(pathname)}`,
      };
    }
    return { isAllowed: true };
  }

  // If route is public
  if (!rule.requiresAuth) {
    return { isAllowed: true };
  }

  // Route requires authentication
  if (!userRole) {
    return {
      isAllowed: false,
      reason: "UNAUTHENTICATED",
      redirectUrl: `/login?callbackUrl=${encodeURIComponent(pathname)}`,
    };
  }

  // Check role restrictions
  if (rule.allowedRoles && rule.allowedRoles.length > 0) {
    const hasRole = rule.allowedRoles.includes(userRole as Role);
    if (!hasRole) {
      return {
        isAllowed: false,
        reason: "FORBIDDEN",
        redirectUrl: `/access-denied?required=${encodeURIComponent(rule.allowedRoles.join(","))}&role=${encodeURIComponent(userRole)}`,
      };
    }
  }

  return { isAllowed: true };
}
