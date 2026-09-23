import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ObservationCard,
  ObservationData,
  VernierKeypad,
  BenchCardSkeleton,
} from "./index";

describe("TASK-050: Mobile-First Observation Card & Vernier Keypad", () => {
  const mockPassingObservation: ObservationData = {
    stepNumber: 4,
    label: "Step #4 (100% Max)",
    appliedLoad: 15.0,
    indication: 15.0,
    deltaL: 0.001, // 0.2e
    eVal: 0.005, // e = 5g
    e0: 0,
    mpeLimit: 0.0075, // ±1.5e = 7.5g
    unit: "kg",
    direction: "ASCENDING",
  };

  const mockFailingObservation: ObservationData = {
    ...mockPassingObservation,
    stepNumber: 5,
    label: "Step #5 (Over-tolerance)",
    indication: 15.01, // Large error
    deltaL: 0.0,
    mpeLimit: 0.0075,
  };

  describe("ObservationCard Component & OIML A.4.4.3 Calculations", () => {
    test("renders cleanly with step header and nominal load", () => {
      const html = renderToStaticMarkup(
        <ObservationCard observation={mockPassingObservation} />
      );
      assert.ok(html.includes("#4"));
      assert.ok(html.includes("Step #4 (100% Max)"));
      assert.ok(html.includes("15.0000 kg"));
      assert.ok(html.includes("▲ Asc"));
    });

    test("computes Turning Point P = I + 0.5e - deltaL accurately", () => {
      // P = 15.0000 + 0.5 * 0.005 - 0.001 = 15.0015 kg
      const html = renderToStaticMarkup(
        <ObservationCard observation={mockPassingObservation} />
      );
      assert.ok(html.includes("15.0015 kg"));
    });

    test("assigns PASS compliance badge when |Ec| <= MPE", () => {
      const html = renderToStaticMarkup(
        <ObservationCard observation={mockPassingObservation} />
      );
      assert.ok(html.includes("PASS"));
      assert.ok(html.includes("bg-emerald-500")); // Safe margin progress bar
    });

    test("assigns FAIL compliance badge when |Ec| > MPE", () => {
      const html = renderToStaticMarkup(
        <ObservationCard observation={mockFailingObservation} />
      );
      assert.ok(html.includes("FAIL"));
      assert.ok(html.includes("border-destructive"));
    });

    test("renders officer quick preset buttons and decimal inputs", () => {
      const html = renderToStaticMarkup(
        <ObservationCard observation={mockPassingObservation} />
      );
      assert.ok(html.includes("Match L (15)"));
      assert.ok(html.includes("Zero"));
      assert.ok(html.toLowerCase().includes('inputmode="decimal"'));
    });
  });

  describe("VernierKeypad Component", () => {
    test("enforces minimum 48px touch targets on all increment and reset buttons", () => {
      const html = renderToStaticMarkup(
        <VernierKeypad
          value={0.001}
          eVal={0.005}
          unit="kg"
          onChange={() => {}}
        />
      );

      // Verify all buttons enforce min-h-[48px] and min-w-[48px]
      assert.ok(html.includes("min-h-[48px]"));
      assert.ok(html.includes("min-w-[48px]"));

      // Verify increment chips (+0.1e, +0.2e, +0.5e, +1e)
      assert.ok(html.includes("0.1e"));
      assert.ok(html.includes("0.2e"));
      assert.ok(html.includes("0.5e"));
      assert.ok(html.includes("1e"));
      assert.ok(html.includes("Reset"));
    });
  });

  describe("BenchCardSkeleton Component", () => {
    test("renders zero-CLS geometry matching observation card layout", () => {
      const html = renderToStaticMarkup(<BenchCardSkeleton />);
      assert.ok(html.includes("rounded-sm"));
      assert.ok(html.includes("animate-pulse"));
      assert.ok(html.includes("grid grid-cols-2"));
      assert.ok(html.includes("grid grid-cols-5")); // Keypad slot
    });
  });

  describe("ObservationLedgerTable Component", () => {
    test("renders official OIML ledger table with turning point and errors", () => {
      const { ObservationLedgerTable } = require("./ObservationLedgerTable");
      const html = renderToStaticMarkup(
        <ObservationLedgerTable
          entries={[
            {
              stepNumber: 1,
              direction: "ASCENDING",
              stageLabel: "Step #1 (Zero Load E₀)",
              appliedLoad: 0.0,
              indication: 0.0,
              deltaL: 0.0025,
              eVal: 0.005,
              turningPointP: 0.0,
              rawErrorE: 0.0,
              intrinsicErrorEc: 0.0,
              mpeLimit: 0.0025,
              unit: "kg",
              isPass: true,
              toleranceConsumedPercent: 0,
              hashSnippet: "0x811c9dc5...",
              timestamp: "12:00:00",
            },
            {
              stepNumber: 8,
              direction: "ASCENDING",
              stageLabel: "Step #8 (Max Full Load)",
              appliedLoad: 15.0,
              indication: 15.0,
              deltaL: 0.0015,
              eVal: 0.005,
              turningPointP: 15.001,
              rawErrorE: 0.001,
              intrinsicErrorEc: 0.001,
              mpeLimit: 0.0075,
              unit: "kg",
              isPass: true,
              toleranceConsumedPercent: 13.3,
              hashSnippet: "0xa4f2910b...",
              timestamp: "12:05:00",
            },
          ]}
        />
      );

      assert.ok(html.includes("Official OIML R-76 Observation Ledger"));
      assert.ok(html.includes("Step #1 (Zero Load E₀)"));
      assert.ok(html.includes("Step #8 (Max Full Load)"));
      assert.ok(html.includes("15.0000 kg"));
      assert.ok(html.includes("0x811c9dc5..."));
      assert.ok(html.includes("2 Steps Logged"));
    });
  });

  describe("ToleranceSafetyGauge Component", () => {
    test("calculates and displays dynamic safe margin and battery progress", () => {
      const { ToleranceSafetyGauge } = require("./ToleranceSafetyGauge");
      const html = renderToStaticMarkup(
        <ToleranceSafetyGauge
          intrinsicErrorEc={0.001}
          mpeLimit={0.005}
          currentStepIndex={4}
          totalSteps={10}
        />
      );

      assert.ok(html.includes("Dynamic MPE Tolerance &amp; Safety Monitor") || html.includes("Dynamic MPE Tolerance & Safety Monitor"));
      // 0.001 / 0.005 = 20% consumed -> 80.0% SAFE MARGIN
      assert.ok(html.includes("80.0% SAFE MARGIN"));
      assert.ok(html.includes("5 of 10 Steps (50%)"));
    });
  });

  describe("OfficerGuidanceBanner Component", () => {
    test("renders plain-language instructions for field officers with quick auto-fill", () => {
      const { OfficerGuidanceBanner } = require("./OfficerGuidanceBanner");
      const html = renderToStaticMarkup(
        <OfficerGuidanceBanner
          stepNumber={6}
          direction="ASCENDING"
          appliedLoad={7.5}
          unit="kg"
          eVal={0.005}
          onQuickFill={() => {}}
        />
      );

      assert.ok(html.includes("Officer Field Guidance · Step #6"));
      assert.ok(html.includes("Place exactly 7.5000 kg of certified standard weights"));
      assert.ok(html.includes("Quick Auto-Fill Indication (7.5 kg)"));
    });
  });
});
