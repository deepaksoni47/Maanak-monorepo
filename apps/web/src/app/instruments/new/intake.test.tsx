import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import NewInstrumentPage, { metadata } from "./page";
import InstrumentIntakeLoading from "./loading";
import { evaluateTable3Classification } from "@/lib/table3";

describe("TASK-052: Instrument Intake & Live Table 3 Classification Page (/instruments/new)", () => {
  describe("Page Metadata", () => {
    test("defines compliant metadata title and description", () => {
      assert.strictEqual(
        metadata.title,
        "New Instrument Intake & Classification"
      );
      assert.ok(
        typeof metadata.description === "string" &&
          metadata.description.includes("OIML R-76 Table 3")
      );
    });
  });

  describe("Zero-CLS Loading State (loading.tsx)", () => {
    test("strictly avoids generic spinners and matches live form geometry", () => {
      const html = renderToStaticMarkup(<InstrumentIntakeLoading />);

      // Skeleton primitives present
      assert.ok(html.includes("animate-pulse"));
      assert.ok(html.includes("bg-muted/60"));

      // Generic spinners must NOT be present
      assert.ok(!html.includes("animate-spin"));
      assert.ok(!html.includes("CircleNotch"));
      assert.ok(!html.includes("Loading..."));
    });

    test("mirrors 2-column layout on wide screens", () => {
      const html = renderToStaticMarkup(<InstrumentIntakeLoading />);
      assert.ok(html.includes("lg:col-span-7"));
      assert.ok(html.includes("lg:col-span-5"));
    });
  });

  describe("Pure Table 3 Metrological Classification Engine", () => {
    test("correctly classifies Class III scale (Max = 15 kg, e = 5 g -> n = 3,000)", () => {
      const res = evaluateTable3Classification({
        max: 15,
        maxUnit: "kg",
        e: 0.005,
        eUnit: "kg",
      });

      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.derivedClass, "III");
      assert.strictEqual(res.scaleDivisionsN, 3000);
      assert.strictEqual(res.minAllowedN, 500);
      assert.strictEqual(res.maxAllowedN, 10000);
      assert.strictEqual(res.minCapacityFactorE, 20);
    });

    test("correctly classifies Class I analytical balance (Max = 200 g, e = 1 mg, d = 0.1 mg -> n = 200,000)", () => {
      const res = evaluateTable3Classification({
        max: 200,
        maxUnit: "g",
        e: 0.001, // 1 mg
        eUnit: "g",
        d: 0.0001, // 0.1 mg
        dUnit: "g",
      });

      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.derivedClass, "I");
      assert.strictEqual(res.scaleDivisionsN, 200000);
      assert.strictEqual(res.minAllowedN, 50000);
      assert.strictEqual(res.maxAllowedN, null); // No upper limit in Class I
      assert.strictEqual(res.minCapacityFactorE, 100);
    });

    test("correctly classifies Class II precision balance (Max = 300 g, e = 10 mg -> n = 30,000)", () => {
      const res = evaluateTable3Classification({
        max: 300,
        maxUnit: "g",
        e: 0.01,
        eUnit: "g",
      });

      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.derivedClass, "II");
      assert.strictEqual(res.scaleDivisionsN, 30000);
      assert.strictEqual(res.minAllowedN, 100);
      assert.strictEqual(res.maxAllowedN, 100000);
      assert.strictEqual(res.minCapacityFactorE, 20);
    });

    test("correctly classifies Class IIII industrial platform (Max = 20 kg, e = 50 g -> n = 400)", () => {
      const res = evaluateTable3Classification({
        max: 20,
        maxUnit: "kg",
        e: 0.05,
        eUnit: "kg",
      });

      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.derivedClass, "IIII");
      assert.strictEqual(res.scaleDivisionsN, 400);
      assert.strictEqual(res.minAllowedN, 100);
      assert.strictEqual(res.maxAllowedN, 1000);
      assert.strictEqual(res.minCapacityFactorE, 10);
    });

    test("flags violation when actual interval d exceeds verification interval e (d > e)", () => {
      const res = evaluateTable3Classification({
        max: 15,
        maxUnit: "kg",
        e: 0.005,
        eUnit: "kg",
        d: 0.01, // 10g > 5g
        dUnit: "kg",
      });

      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.isIntervalValid, false);
      assert.ok(
        res.errorReasons.some((r) => r.includes("Actual scale interval (d) cannot exceed"))
      );
    });

    test("flags violation when declared Min is below required minCapacityFactor * e", () => {
      const res = evaluateTable3Classification({
        max: 15,
        maxUnit: "kg",
        e: 0.005,
        eUnit: "kg",
        min: 0.05, // 50g < 20e (100g)
        minUnit: "kg",
        requestedClass: "III",
      });

      assert.strictEqual(res.valid, false);
      assert.ok(
        res.errorReasons.some((r) => r.includes("Declared Min") && r.includes("below required minimum"))
      );
    });
  });

  describe("NewInstrumentPage UI Rendering", () => {
    test("renders shell breadcrumbs with Home, Dashboard, and Instrument Intake segments", () => {
      const html = renderToStaticMarkup(<NewInstrumentPage />);
      assert.ok(html.includes("Home"));
      assert.ok(html.includes("Dashboard"));
      assert.ok(html.includes("Instrument Intake"));
    });

    test("renders real-time Table 3 compliance card with scale division count", () => {
      const html = renderToStaticMarkup(<NewInstrumentPage />);

      // Scale division count display (15 kg / 0.005 kg = 3,000)
      assert.ok(html.includes("Scale Division Count (n = Max / e)"));
      assert.ok(html.includes("3,000"));
      assert.ok(html.includes("Table 3 Compliance Engine"));
      assert.ok(html.includes("COMPLIANT"));
      assert.ok(html.includes("Class III (Medium Accuracy)"));
    });

    test("renders quick preset buttons for laboratory testing officers", () => {
      const html = renderToStaticMarkup(<NewInstrumentPage />);
      assert.ok(html.includes("Class III Retail Bench Scale"));
      assert.ok(html.includes("Class II Precision Balance"));
      assert.ok(html.includes("Class I Analytical Balance"));
      assert.ok(html.includes("Class IIII Industrial Platform"));
    });

    test("enforces minimum 48px touch targets for inputs and action buttons", () => {
      const html = renderToStaticMarkup(<NewInstrumentPage />);
      // Both inputs and action buttons must include min-h-[48px]
      assert.ok(html.includes("min-h-[48px]"));
    });
  });
});
