import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRouteAccess } from "./lib/routes-config";

/**
 * Safely decodes the payload of a JWT token on Edge runtime without external dependencies.
 */
export function extractRoleFromToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    // Standard Base64 decoding available in Edge/Browser environments
    const decoded = atob(base64);
    const parsed = JSON.parse(decoded);
    return parsed.role || null;
  } catch {
    return null;
  }
}

/**
 * Next.js Edge Middleware for Role-Based Access Control and Route Protection.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Retrieve auth token from cookies or authorization header
  const cookieToken = request.cookies.get("maanak_access_token")?.value;
  const authHeader = request.headers.get("authorization");
  const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const token = cookieToken || headerToken;

  // Determine user role: check JWT claims first, fallback to explicit role cookie/header
  let userRole: string | null = null;
  if (token) {
    userRole = extractRoleFromToken(token);
  }

  if (!userRole) {
    userRole =
      request.cookies.get("maanak_user_role")?.value ||
      request.headers.get("x-user-role") ||
      (token ? "INSPECTOR" : null); // default fall-through if token exists without parseable role
  }

  // Validate route access against statutory matrix
  const { isAllowed, redirectUrl } = checkRouteAccess(pathname, userRole);

  if (!isAllowed && redirectUrl) {
    const targetUrl = new URL(redirectUrl, request.url);
    return NextResponse.redirect(targetUrl);
  }

  return NextResponse.next();
}

/**
 * Configure paths that should be processed by this middleware.
 * Excludes Next.js internal static assets, favicon, service worker, and web manifest.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest).*)",
  ],
};
