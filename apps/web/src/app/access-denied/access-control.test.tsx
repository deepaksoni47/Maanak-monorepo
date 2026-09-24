import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Role,
  ROUTE_ACCESS_RULES,
  getRouteRule,
  checkRouteAccess,
} from "../../lib/routes-config.js";
import { extractRoleFromToken } from "../../middleware.js";
import AccessDeniedPage from "./page.js";

describe("TASK-094: Next.js Client-Side Route Protection & Edge Middleware", () => {
  describe("1. Statutory Route Access Matrix Configuration", () => {
    test("defines role-based protection rules matching specifications", () => {
      // Bench is restricted to INSPECTOR and ADMIN
      const benchRule = getRouteRule("/bench");
      assert.ok(benchRule);
      assert.strictEqual(benchRule.requiresAuth, true);
      assert.deepStrictEqual(benchRule.allowedRoles, [Role.INSPECTOR, Role.ADMIN]);

      // Nested bench route also matches
      const nestedBenchRule = getRouteRule("/bench/TS-2026-0001");
      assert.ok(nestedBenchRule);
      assert.strictEqual(nestedBenchRule.requiresAuth, true);

      // Review is restricted to REVIEWER, DIRECTOR, and ADMIN
      const reviewRule = getRouteRule("/review");
      assert.ok(reviewRule);
      assert.strictEqual(reviewRule.requiresAuth, true);
      assert.deepStrictEqual(reviewRule.allowedRoles, [
        Role.REVIEWER,
        Role.DIRECTOR,
        Role.ADMIN,
      ]);

      // Reports is restricted to INSPECTOR, REVIEWER, DIRECTOR, and ADMIN
      const reportsRule = getRouteRule("/reports");
      assert.ok(reportsRule);
      assert.strictEqual(reportsRule.requiresAuth, true);
      assert.deepStrictEqual(reportsRule.allowedRoles, [
        Role.INSPECTOR,
        Role.REVIEWER,
        Role.DIRECTOR,
        Role.ADMIN,
      ]);

      // Rule Packs is restricted to ADMIN only
      const rulePacksRule = getRouteRule("/rule-packs");
      assert.ok(rulePacksRule);
      assert.strictEqual(rulePacksRule.requiresAuth, true);
      assert.deepStrictEqual(rulePacksRule.allowedRoles, [Role.ADMIN]);

      // Admin is restricted to ADMIN only
      const adminRule = getRouteRule("/admin");
      assert.ok(adminRule);
      assert.strictEqual(adminRule.requiresAuth, true);
      assert.deepStrictEqual(adminRule.allowedRoles, [Role.ADMIN]);
    });

    test("defines public routes without requiring authentication", () => {
      const publicPaths = ["/", "/login", "/access-denied", "/verify", "/manifest.webmanifest"];
      for (const path of publicPaths) {
        const rule = getRouteRule(path);
        assert.ok(rule, `Rule should exist for ${path}`);
        assert.strictEqual(rule.requiresAuth, false, `${path} must not require auth`);
      }
    });
  });

  describe("2. checkRouteAccess Enforcement Logic", () => {
    test("unauthenticated access to protected route redirects to /login with callbackUrl", () => {
      const resBench = checkRouteAccess("/bench", null);
      assert.strictEqual(resBench.isAllowed, false);
      assert.strictEqual(resBench.reason, "UNAUTHENTICATED");
      assert.strictEqual(resBench.redirectUrl, "/login?callbackUrl=%2Fbench");

      const resReview = checkRouteAccess("/review/item-42", undefined);
      assert.strictEqual(resReview.isAllowed, false);
      assert.strictEqual(resReview.reason, "UNAUTHENTICATED");
      assert.strictEqual(resReview.redirectUrl, "/login?callbackUrl=%2Freview%2Fitem-42");
    });

    test("unauthenticated access to public routes is permitted", () => {
      assert.strictEqual(checkRouteAccess("/", null).isAllowed, true);
      assert.strictEqual(checkRouteAccess("/login", null).isAllowed, true);
      assert.strictEqual(checkRouteAccess("/access-denied", null).isAllowed, true);
      assert.strictEqual(checkRouteAccess("/verify/abc123hash", null).isAllowed, true);
    });

    test("INSPECTOR role access rights", () => {
      // Allowed on bench, reports, dashboard, instruments
      assert.strictEqual(checkRouteAccess("/bench", Role.INSPECTOR).isAllowed, true);
      assert.strictEqual(checkRouteAccess("/reports", Role.INSPECTOR).isAllowed, true);
      assert.strictEqual(checkRouteAccess("/dashboard", Role.INSPECTOR).isAllowed, true);

      // Forbidden on review, rule-packs, admin
      const reviewCheck = checkRouteAccess("/review", Role.INSPECTOR);
      assert.strictEqual(reviewCheck.isAllowed, false);
      assert.strictEqual(reviewCheck.reason, "FORBIDDEN");
      assert.ok(reviewCheck.redirectUrl?.startsWith("/access-denied"));

      const adminCheck = checkRouteAccess("/admin", Role.INSPECTOR);
      assert.strictEqual(adminCheck.isAllowed, false);
      assert.strictEqual(adminCheck.reason, "FORBIDDEN");

      const rulePacksCheck = checkRouteAccess("/rule-packs", Role.INSPECTOR);
      assert.strictEqual(rulePacksCheck.isAllowed, false);
      assert.strictEqual(rulePacksCheck.reason, "FORBIDDEN");
    });

    test("REVIEWER and DIRECTOR role access rights", () => {
      // REVIEWER allowed on review and reports, forbidden on bench and admin
      assert.strictEqual(checkRouteAccess("/review", Role.REVIEWER).isAllowed, true);
      assert.strictEqual(checkRouteAccess("/reports", Role.REVIEWER).isAllowed, true);
      assert.strictEqual(checkRouteAccess("/bench", Role.REVIEWER).isAllowed, false);
      assert.strictEqual(checkRouteAccess("/admin", Role.REVIEWER).isAllowed, false);

      // DIRECTOR allowed on review and reports, forbidden on bench and admin
      assert.strictEqual(checkRouteAccess("/review", Role.DIRECTOR).isAllowed, true);
      assert.strictEqual(checkRouteAccess("/reports", Role.DIRECTOR).isAllowed, true);
      assert.strictEqual(checkRouteAccess("/bench", Role.DIRECTOR).isAllowed, false);
      assert.strictEqual(checkRouteAccess("/admin", Role.DIRECTOR).isAllowed, false);
    });

    test("ADMIN role has unrestricted access across all partitions", () => {
      assert.strictEqual(checkRouteAccess("/bench", Role.ADMIN).isAllowed, true);
      assert.strictEqual(checkRouteAccess("/review", Role.ADMIN).isAllowed, true);
      assert.strictEqual(checkRouteAccess("/reports", Role.ADMIN).isAllowed, true);
      assert.strictEqual(checkRouteAccess("/rule-packs", Role.ADMIN).isAllowed, true);
      assert.strictEqual(checkRouteAccess("/admin", Role.ADMIN).isAllowed, true);
      assert.strictEqual(checkRouteAccess("/dashboard", Role.ADMIN).isAllowed, true);
    });
  });

  describe("3. Edge Middleware JWT Role Extraction", () => {
    test("extracts role from base64url-encoded JWT token payload", () => {
      const payload = { sub: "user-123", email: "admin@maanak.gov.in", role: "ADMIN" };
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
      const fakeToken = `header.${base64Payload}.signature`;

      const role = extractRoleFromToken(fakeToken);
      assert.strictEqual(role, "ADMIN");
    });

    test("handles malformed or invalid tokens safely returning null", () => {
      assert.strictEqual(extractRoleFromToken("not-a-valid-token"), null);
      assert.strictEqual(extractRoleFromToken(""), null);
      assert.strictEqual(extractRoleFromToken("header.invalid-base64-json.sig"), null);
    });
  });

  describe("4. Access Denied 403 Page Rendering", () => {
    test("renders high-contrast 403 Forbidden Access Denied component", () => {
      const html = renderToStaticMarkup(<AccessDeniedPage />);
      assert.ok(html.includes("403"));
      assert.ok(html.includes("Statutory Access Restricted"));
      assert.ok(html.includes("OIML R-76 / WELMEC 7.2 ROLE PARTITION"));
      assert.ok(html.includes("Return to Dashboard"));
      assert.ok(html.includes("Switch Officer Role"));
    });
  });
});
