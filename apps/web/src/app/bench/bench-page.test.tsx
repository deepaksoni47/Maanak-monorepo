import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import BenchPage, { metadata } from "./page";
import BenchLoading from "./loading";

describe("TASK-054: Real-Time Bench Observation Logging Page (/bench)", () => {
  describe("Page Metadata", () => {
    test("defines compliant metadata title and description", () => {
      assert.strictEqual(metadata.title, "Real-Time Metrology Test Bench");
      assert.ok(
        typeof metadata.description === "string" &&
          metadata.description.includes("Clause A.4.4")
      );
    });
  });

  describe("Zero-CLS Loading State (loading.tsx)", () => {
    test("strictly avoids generic spinners and matches live bench card geometry", () => {
      const html = renderToStaticMarkup(<BenchLoading />);

      // Skeletons present
      assert.ok(html.includes("animate-pulse"));
      assert.ok(html.includes("bg-muted/60"));

      // Generic spinners must NOT be present
      assert.ok(!html.includes("animate-spin"));
      assert.ok(!html.includes("CircleNotch"));
      assert.ok(!html.includes("Loading..."));
    });
  });

  describe("BenchPage UI Component Rendering", () => {
    test("renders shell breadcrumbs with Home, Dashboard, and Bench segments", () => {
      const html = renderToStaticMarkup(<BenchPage />);
      assert.ok(html.includes("Home"));
      assert.ok(html.includes("Dashboard"));
      assert.ok(html.includes("Bench Execution"));
    });

    test("renders session metadata and ambient sensor telemetry", () => {
      const html = renderToStaticMarkup(<BenchPage />);
      assert.ok(html.includes("Session TS-2026-0142: Essae DS-215"));
      assert.ok(html.includes("CLASS III"));
      assert.ok(html.includes("Max 15 kg | e = 5 g"));
      assert.ok(html.includes("20.4°C"));
      assert.ok(html.includes("54% RH"));
      assert.ok(html.includes("1013.2 hPa"));
    });

    test("renders 10-step load schedule chips per Clause A.4.4.1", () => {
      const html = renderToStaticMarkup(<BenchPage />);
      assert.ok(html.includes("#1"));
      assert.ok(html.includes("#4"));
      assert.ok(html.includes("#7"));
      assert.ok(html.includes("#10"));
    });

    test("renders active ObservationCard with turning point calculation and Vernier keypad", () => {
      const html = renderToStaticMarkup(<BenchPage />);
      // Default to Step #4 (2.5 kg)
      assert.ok(html.includes("Step #4"));
      assert.ok(html.includes("Turning Point (P)"));
      assert.ok(html.includes("Error (Ec = E - E0)"));
      assert.ok(html.includes("0.1e"));
      assert.ok(html.includes("0.2e"));
      assert.ok(html.includes("0.5e"));
      assert.ok(html.includes("1e"));
    });

    test("renders sticky bottom action bar with Submit & Advance button", () => {
      const html = renderToStaticMarkup(<BenchPage />);
      assert.ok(html.includes("Submit Observation &amp; Advance") || html.includes("Submit Observation & Advance"));
      assert.ok(html.includes("Previous"));
    });

    test("enforces minimum 48px touch targets for Vernier chips and action buttons", () => {
      const html = renderToStaticMarkup(<BenchPage />);
      assert.ok(html.includes("min-h-[48px]"));
    });
  });
});
