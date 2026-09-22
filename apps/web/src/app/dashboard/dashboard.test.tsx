import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DashboardPage, { metadata } from "./page";
import DashboardLoading from "./loading";

describe("TASK-051: Laboratory Executive Dashboard Page (/dashboard)", () => {
  describe("Page Metadata", () => {
    test("defines compliant metadata title and description", () => {
      assert.strictEqual(metadata.title, "Dashboard & Lab Analytics");
      assert.ok(
        typeof metadata.description === "string" &&
          metadata.description.includes("OIML R-76")
      );
    });
  });

  describe("Zero-CLS Loading State (loading.tsx)", () => {
    test("strictly adheres to zero-generic-spinner rule using geometry-matching skeletons", () => {
      const html = renderToStaticMarkup(<DashboardLoading />);

      // Must contain skeleton primitives
      assert.ok(html.includes("animate-pulse"));
      assert.ok(html.includes("bg-muted/60"));

      // Must NOT contain generic loading spinners
      assert.ok(!html.includes("animate-spin"));
      assert.ok(!html.includes("CircleNotch"));
      assert.ok(!html.includes("Loading..."));
    });

    test("renders 4-card metric grid skeleton matching live layout", () => {
      const html = renderToStaticMarkup(<DashboardLoading />);
      // Grid container for 4 metric cards
      assert.ok(html.includes("grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"));
    });
  });

  describe("DashboardPage Component Rendering", () => {
    test("renders shell breadcrumbs with Home and Dashboard segments", () => {
      const html = renderToStaticMarkup(<DashboardPage />);
      assert.ok(html.includes("Home"));
      assert.ok(html.includes("Dashboard"));
      assert.ok(html.includes('aria-current="page"'));
    });

    test("renders 4 KPI metric cards with accurate values and metrological icons", () => {
      const html = renderToStaticMarkup(<DashboardPage />);

      // Metric 1: Active Test Sessions
      assert.ok(html.includes("Active Test Sessions"));
      assert.ok(html.includes("14"));
      assert.ok(html.includes("+2 started"));

      // Metric 2: Pending Review Audits
      assert.ok(html.includes("Pending Review Audits"));
      assert.ok(html.includes("3"));
      assert.ok(html.includes("1 anomaly"));

      // Metric 3: Approved Today
      assert.ok(html.includes("Approved Today"));
      assert.ok(html.includes("8"));
      assert.ok(html.includes("100%"));

      // Metric 4: First-Pass Compliance
      assert.ok(html.includes("First-Pass Compliance"));
      assert.ok(html.includes("94.2%"));
      assert.ok(html.includes("+2.4%"));
    });

    test("renders NABL 129 Standard Weights calibration banner", () => {
      const html = renderToStaticMarkup(<DashboardPage />);
      assert.ok(
        html.includes("NABL 129 Standard Weights Health: 100% In Calibration")
      );
      assert.ok(html.includes("ALL 24 SETS VALID"));
      assert.ok(html.includes("Inspect Standard Weights"));
    });

    test("renders recent test sessions with model details and status badges", () => {
      const html = renderToStaticMarkup(<DashboardPage />);

      // Session records
      assert.ok(html.includes("TS-2026-0142"));
      assert.ok(html.includes("Essae DS-215"));
      assert.ok(html.includes("Class III"));
      assert.ok(html.includes("PASSED"));

      assert.ok(html.includes("TS-2026-0141"));
      assert.ok(html.includes("Mettler Toledo ME204"));
      assert.ok(html.includes("Class I"));
      assert.ok(html.includes("TESTING"));

      assert.ok(html.includes("TS-2026-0140"));
      assert.ok(html.includes("Avery Berkel FX-120"));
      assert.ok(html.includes("IN REVIEW"));

      assert.ok(html.includes("TS-2026-0139"));
      assert.ok(html.includes("Wensar HPB-300"));
      assert.ok(html.includes("MPE EXCEEDED"));
    });

    test("enforces minimum 48px touch targets for mobile accessibility", () => {
      const html = renderToStaticMarkup(<DashboardPage />);
      // Action buttons should include min-h-[48px]
      assert.ok(html.includes("min-h-[48px]"));
    });

    test("renders operational navigation shortcuts for intake, review, and verification", () => {
      const html = renderToStaticMarkup(<DashboardPage />);
      assert.ok(html.includes("Intake New Instrument"));
      assert.ok(html.includes("Senior Reviewer Audit"));
      assert.ok(html.includes("Public QR Verification"));
    });
  });
});
