import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UserManagementView } from "../../components/admin/UserManagementView.js";
import AdminUsersPage from "./users/page.js";
import { adminApi } from "../../lib/api.js";

describe("TASK-097: Frontend Administrative Portal & User Management Page (/admin/users)", () => {
  describe("1. adminApi Client Surface Exports", () => {
    test("exports all required administrative API methods", () => {
      assert.strictEqual(typeof adminApi.listUsers, "function");
      assert.strictEqual(typeof adminApi.createUser, "function");
      assert.strictEqual(typeof adminApi.updateUser, "function");
      assert.strictEqual(typeof adminApi.listRoles, "function");
      assert.strictEqual(typeof adminApi.listAuditLogs, "function");
    });
  });

  describe("2. UserManagementView Component Rendering", () => {
    test("renders metric cards for personnel, clearance, and security mode", () => {
      const html = renderToStaticMarkup(<UserManagementView />);
      assert.ok(html.includes("Total Personnel"));
      assert.ok(html.includes("Active Officers"));
      assert.ok(html.includes("Assigned Facilities"));
      assert.ok(html.includes("RBAC Security Mode"));
      assert.ok(html.includes("OIML R-76 / WELMEC 7.2"));
    });

    test("renders personnel table with standard statutory personas and role badges", () => {
      const html = renderToStaticMarkup(<UserManagementView />);
      assert.ok(html.includes("R. K. Verma"));
      assert.ok(html.includes("inspector@maanak.gov.in"));
      assert.ok(html.includes("INSPECTOR"));

      assert.ok(html.includes("S. P. Patel"));
      assert.ok(html.includes("REVIEWER"));

      assert.ok(html.includes("Dr. A. K. Sharma"));
      assert.ok(html.includes("DIRECTOR"));

      assert.ok(html.includes("System Administrator"));
      assert.ok(html.includes("ADMIN"));
    });

    test("renders search input, role filters, and provision officer button", () => {
      const html = renderToStaticMarkup(<UserManagementView />);
      assert.ok(html.includes("Search officer by name, username, or email..."));
      assert.ok(html.includes("Provision Officer Account"));
      assert.ok(html.includes("Personnel Directory"));
      assert.ok(html.includes("Audit Trail"));
    });
  });

  describe("3. AdminUsersPage Layout & Shell Integration", () => {
    test("renders AdminUsersPage with title, subtitle, and breadcrumbs", () => {
      const html = renderToStaticMarkup(<AdminUsersPage />);
      assert.ok(html.includes("Personnel &amp; Access Management") || html.includes("Personnel & Access Management"));
      assert.ok(html.includes("Admin Portal"));
      assert.ok(html.includes("Personnel Directory"));
    });
  });
});
