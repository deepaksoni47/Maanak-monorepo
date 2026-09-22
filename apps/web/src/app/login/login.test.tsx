import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PRESET_OFFICERS, useAuth } from "../../lib/auth-context.js";
import LoginPage from "./page.js";

describe("TASK-064: Genuine End-to-End Authentication & Session Management", () => {
  describe("1. Pre-configured Officer Testing Personas", () => {
    test("defines all 4 key statutory metrology roles with valid credentials", () => {
      assert.strictEqual(PRESET_OFFICERS.length, 4);

      const inspector = PRESET_OFFICERS.find((p) => p.role === "INSPECTOR");
      assert.ok(inspector);
      assert.strictEqual(inspector.email, "inspector@maanak.gov.in");
      assert.strictEqual(inspector.name, "R. K. Verma");

      const reviewer = PRESET_OFFICERS.find((p) => p.role === "REVIEWER");
      assert.ok(reviewer);
      assert.strictEqual(reviewer.email, "reviewer@maanak.gov.in");

      const director = PRESET_OFFICERS.find((p) => p.role === "DIRECTOR");
      assert.ok(director);
      assert.strictEqual(director.email, "director@maanak.gov.in");

      const admin = PRESET_OFFICERS.find((p) => p.role === "ADMIN");
      assert.ok(admin);
      assert.strictEqual(admin.email, "admin@maanak.gov.in");
    });
  });

  describe("2. Unauthenticated Clean Default State", () => {
    test("useAuth hook defaults to null user and isAuthenticated=false without stored session", () => {
      function Consumer() {
        const auth = useAuth();
        return (
          <div id="auth-state">
            <span id="authenticated">{String(auth.isAuthenticated)}</span>
            <span id="user">{auth.user ? auth.user.fullName : "NONE"}</span>
          </div>
        );
      }

      const html = renderToStaticMarkup(<Consumer />);
      assert.ok(html.includes('<span id="authenticated">false</span>'));
      assert.ok(html.includes('<span id="user">NONE</span>'));
    });
  });

  describe("3. Login & Registration UI Rendering", () => {
    test("renders both Sign In and Create Officer Account tabs", () => {
      const html = renderToStaticMarkup(<LoginPage />);
      assert.ok(html.includes("Sign In"));
      assert.ok(html.includes("Create Officer Account"));
      assert.ok(html.includes("Fast Testing Personas"));
      assert.ok(html.includes("inspector@maanak.gov.in"));
    });
  });
});
