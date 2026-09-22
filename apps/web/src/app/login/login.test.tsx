import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { PRESET_OFFICERS } from "../../lib/auth-context.js";

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
});
