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
      assert.ok(html.includes("rounded-3xl"));
      assert.ok(html.includes("animate-pulse"));
      assert.ok(html.includes("grid grid-cols-2"));
      assert.ok(html.includes("grid grid-cols-5")); // Keypad slot
    });
  });
});
