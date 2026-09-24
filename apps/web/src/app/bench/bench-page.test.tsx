import { test, describe, it } from "node:test";
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

    test("renders New Offline Session button in bench header (TASK-092)", () => {
      const html = renderToStaticMarkup(<BenchPage />);
      assert.ok(html.includes("New Offline Session"));
    });
  });

  describe("TASK-092: Offline Session Creation & Local Observation Engine", () => {
    it("creates offline session with RFC 4122 UUID and pre-cached instrument specs", async () => {
      const { createOfflineSession, getCachedSession, generateUuid } = await import("@/lib/offline-db");

      const uuid = generateUuid();
      assert.match(
        uuid,
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        "Must generate compliant RFC 4122 v4 UUID"
      );

      const session = await createOfflineSession({
        instrument: {
          id: "inst-offline-shielded",
          serialNumber: "SN-SHIELDED-BAY-4",
          model: "XP-500",
          manufacturer: "Shielded Lab Balances",
          accuracyClass: "Class II",
          maxCapacity: 500,
          minCapacity: 0.5,
          verificationScaleIntervalE: 0.01,
          unit: "g",
        },
        officerName: "Inspector Ramesh",
      });

      assert.ok(session.id);
      assert.equal(session.status, "IN_PROGRESS");
      assert.equal(session.isOfflineCreated, true);

      const retrieved = await getCachedSession(session.id);
      assert.ok(retrieved);
      assert.equal(retrieved.instrumentId, "inst-offline-shielded");
    });

    it("evaluates 10 test points locally and logs observations with RFC 4122 UUID localId without network", async () => {
      const { createOfflineSession, logOfflineObservation, getPendingOfflineMutations } = await import("@/lib/offline-db");

      const session = await createOfflineSession({
        instrument: {
          id: "inst-offline-test",
          serialNumber: "SN-OFFLINE-100",
          model: "AW-15K",
          manufacturer: "Avery Weigh-Tronix",
          accuracyClass: "Class III",
          maxCapacity: 15,
          minCapacity: 0.1,
          verificationScaleIntervalE: 0.005,
          unit: "kg",
        },
      });

      // Log 10 standard observation load points completely offline
      const loads = [0.0, 0.1, 0.5, 2.5, 5.0, 7.5, 10.0, 15.0, 7.5, 0.0];
      for (let i = 0; i < loads.length; i++) {
        const load = loads[i];
        const res = await logOfflineObservation({
          sessionId: session.id,
          stepNumber: i + 1,
          targetLoadL: load,
          displayedIndicationI: load,
          changeoverWeightDl: 0.0025, // 0.5e
          eVal: 0.005,
          e0: 0.0,
          mpeLimit: 0.005,
          unit: "kg",
          direction: i >= 8 ? "DESCENDING" : "ASCENDING",
        });

        // Verify client-side RFC 4122 UUID localId
        assert.ok(res.localId, "Must assign localId");
        assert.match(
          res.localId,
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          "localId must be RFC 4122 v4 UUID"
        );

        // Verify pure TypeScript offline Turning Point evaluation: P = I + 0.5e - ΔL = load + 0.0025 - 0.0025 = load
        assert.equal(res.turningPointP, load);
        assert.equal(res.errorE, 0);
        assert.equal(res.intrinsicErrorEc, 0);
        assert.equal(res.isPass, true);
      }

      // Check offline queue
      const queue = await getPendingOfflineMutations();
      const sessionMutations = queue.filter((m) => m.sessionId === session.id);
      assert.equal(sessionMutations.length, 10, "All 10 observations must be queued in offline DB");
    });
  });
});
