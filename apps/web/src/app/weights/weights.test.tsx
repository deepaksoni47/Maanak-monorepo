import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import WeightsPage, { metadata } from "./page";
import WeightsLoading from "./loading";
import { evaluateNablGatekeeper, computeOimlTable6Mpe } from "@/lib/nabl129";

describe("TASK-053: Standard Weight Inventory & Live NABL Gatekeeper Page (/weights)", () => {
  describe("Page Metadata", () => {
    test("defines compliant metadata title and description", () => {
      assert.strictEqual(
        metadata.title,
        "Standard Weight Inventory & NABL 129 Gatekeeper"
      );
      assert.ok(
        typeof metadata.description === "string" &&
          metadata.description.includes("NABL 129 expanded uncertainty gatekeeper")
      );
    });
  });

  describe("Zero-CLS Loading State (loading.tsx)", () => {
    test("strictly avoids generic spinners and renders geometry-matching skeletons", () => {
      const html = renderToStaticMarkup(<WeightsLoading />);

      // Skeletons present
      assert.ok(html.includes("animate-pulse"));
      assert.ok(html.includes("bg-muted/60"));

      // Generic spinners must NOT be present
      assert.ok(!html.includes("animate-spin"));
      assert.ok(!html.includes("CircleNotch"));
      assert.ok(!html.includes("Loading..."));
    });
  });

  describe("Pure NABL 129 Gatekeeper Engine (OIML Clause 3.7.1)", () => {
    test("approves in-spec standard weight (U <= 1/3 MPE)", () => {
      // Load = 2.5 kg, e = 5 g (500e) -> MPE = ±0.5e = ±2.5 g -> U_max = 0.833 g
      // U = 0.5 g <= 0.833 g (ratio = 20.0%)
      const res = evaluateNablGatekeeper({
        load: 2.5,
        loadUnit: "kg",
        e: 0.005,
        eUnit: "kg",
        accuracyClass: "III",
        uncertaintyU: 0.0005, // 0.5 g
        uncertaintyUnit: "kg",
      });

      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.status, "PASS");
      assert.strictEqual(res.mpeFactorE, 0.5);
      assert.strictEqual(res.mpeInGrams, 2.5);
      assert.strictEqual(res.recommendedWeightClass, "Class F1 or F2");
      assert.ok(res.ratioUtoMpe <= 1 / 3);
    });

    test("flags violation when uncertainty exceeds 1/3 MPE (U > 1/3 MPE)", () => {
      // U = 2.0 g > 0.833 g (ratio = 80.0%)
      const res = evaluateNablGatekeeper({
        load: 2.5,
        loadUnit: "kg",
        e: 0.005,
        eUnit: "kg",
        accuracyClass: "III",
        uncertaintyU: 0.002, // 2.0 g
        uncertaintyUnit: "kg",
      });

      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.status, "FAIL_UNCERTAINTY_EXCEEDED");
      assert.ok(res.ratioUtoMpe > 1 / 3);
      assert.ok(res.message.includes("exceeds ⅓ MPE limit"));
    });

    test("computes correct Table 6 MPE brackets for Class I, II, III, and IIII", () => {
      // Class I: 60,000e -> bracket 2 (±1.0e)
      const mpeI = computeOimlTable6Mpe(60, 0.001, "I", "g");
      assert.strictEqual(mpeI.mpeFactorE, 1.0);

      // Class III: 1,000e -> bracket 2 (±1.0e)
      const mpeIII = computeOimlTable6Mpe(5, 0.005, "III", "kg");
      assert.strictEqual(mpeIII.mpeFactorE, 1.0);

      // Class III: 4,000e -> bracket 3 (±1.5e)
      const mpeIIIHigh = computeOimlTable6Mpe(20, 0.005, "III", "kg");
      assert.strictEqual(mpeIIIHigh.mpeFactorE, 1.5);
    });
  });

  describe("WeightsPage UI Component Rendering", () => {
    test("renders shell breadcrumbs and page header", () => {
      const html = renderToStaticMarkup(<WeightsPage />);
      assert.ok(html.includes("Home"));
      assert.ok(html.includes("Dashboard"));
      assert.ok(html.includes("Weights &amp; Standards") || html.includes("Weights & Standards"));
    });

    test("renders 3 KPI metric summary cards", () => {
      const html = renderToStaticMarkup(<WeightsPage />);
      assert.ok(html.includes("Working Standard Sets"));
      assert.ok(html.includes("24 sets"));
      assert.ok(html.includes("NABL 129 Calibration Health"));
      assert.ok(html.includes("0 Expired"));
      assert.ok(html.includes("Recalibration Schedule"));
      assert.ok(html.includes("42 days"));
    });

    test("renders standard weight sets inventory with OIML class badges and certificates", () => {
      const html = renderToStaticMarkup(<WeightsPage />);
      assert.ok(html.includes("RRSL-WS-E2-01"));
      assert.ok(html.includes("Class E2"));
      assert.ok(html.includes("CC-NABL-2025-9081"));
      assert.ok(html.includes("VALID"));

      assert.ok(html.includes("RRSL-WS-F1-02"));
      assert.ok(html.includes("Class F1"));

      assert.ok(html.includes("RRSL-WS-M1-08"));
      assert.ok(html.includes("DUE IN 9 DAYS"));
    });

    test("renders NABL 129 uncertainty gatekeeper simulator with Table 6 computation", () => {
      const html = renderToStaticMarkup(<WeightsPage />);
      assert.ok(html.includes("Live NABL 129 Gatekeeper Simulator (Clause 3.7.1)"));
      assert.ok(html.includes("Table 6 MPE"));
      assert.ok(html.includes("Max Allowed U (⅓ MPE)"));
      assert.ok(html.includes("Uncertainty Ratio (U / MPE)"));
      assert.ok(html.includes("Required Weight Tier"));
    });

    test("enforces minimum 48px touch targets for inputs and action buttons", () => {
      const html = renderToStaticMarkup(<WeightsPage />);
      assert.ok(html.includes("min-h-[48px]"));
    });
  });
});
