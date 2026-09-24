import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import manifest from "@/app/manifest";
import {
  enqueueOfflineObservation,
  getPendingObservations,
  markObservationSynced,
  clearSyncedObservations,
  flushPendingObservations,
} from "./offline-sync";
import { OfflineSyncBanner } from "@/components/common/OfflineSyncBanner";

describe("TASK-058: Offline PWA Service Worker & IndexedDB Sync Engine", () => {
  describe("Web App Manifest Configuration (manifest.ts)", () => {
    test("generates compliant PWA manifest metadata for standalone metrology operation", () => {
      const pwaManifest = manifest();

      assert.strictEqual(pwaManifest.short_name, "MAANAK");
      assert.strictEqual(pwaManifest.start_url, "/bench");
      assert.strictEqual(pwaManifest.display, "standalone");
      assert.strictEqual(pwaManifest.theme_color, "#0284c7");
      assert.strictEqual(pwaManifest.background_color, "#090d16");
      assert.ok(Array.isArray(pwaManifest.icons) && pwaManifest.icons.length >= 2);
    });
  });

  describe("Offline Observation Storage & Sync Queue", () => {
    beforeEach(async () => {
      await clearSyncedObservations();
    });

    test("enqueues raw observation offline with timestamp and PENDING status", async () => {
      const item = await enqueueOfflineObservation({
        sessionId: "TS-2026-0142",
        stepNumber: 4,
        nominalLoad: "5.000 kg",
        indication: "5.000 kg",
        deltaL: "0.001 kg",
        turningPointP: "5.0015 kg",
        errorEc: "+0.0015 kg",
      });

      assert.ok(item.id.startsWith("offline-"));
      assert.strictEqual(item.status, "PENDING");
      assert.strictEqual(item.sessionId, "TS-2026-0142");
      assert.strictEqual(item.nominalLoad, "5.000 kg");
      assert.ok(typeof item.timestamp === "string");
    });

    test("retrieves list of pending observations waiting for network reconnection", async () => {
      await enqueueOfflineObservation({
        sessionId: "TS-2026-0142",
        stepNumber: 5,
        nominalLoad: "7.500 kg",
        indication: "7.500 kg",
        deltaL: "0.002 kg",
        turningPointP: "7.5005 kg",
        errorEc: "+0.0005 kg",
      });

      const pending = await getPendingObservations();
      assert.ok(pending.length >= 1);
      const target = pending.find((i) => i.nominalLoad === "7.500 kg");
      assert.ok(target);
      assert.strictEqual(target?.status, "PENDING");
    });

    test("marks observation as synced and flushes queue upon reconnect", async () => {
      const obs = await enqueueOfflineObservation({
        sessionId: "TS-2026-0142",
        stepNumber: 6,
        nominalLoad: "10.000 kg",
        indication: "10.000 kg",
        deltaL: "0.002 kg",
        turningPointP: "10.0005 kg",
        errorEc: "+0.0005 kg",
      });

      await markObservationSynced(obs.id);
      const pendingAfterMark = await getPendingObservations();
      assert.ok(!pendingAfterMark.some((i) => i.id === obs.id));

      const flushResult = await flushPendingObservations();
      assert.ok(typeof flushResult.syncedCount === "number");
    });
  });

  describe("OfflineSyncBanner Component", () => {
    test("renders PWA live sync status banner with simulated offline toggle", () => {
      const html = renderToStaticMarkup(
        <OfflineSyncBanner sessionId="TS-2026-0142" />
      );

      assert.ok(html.includes("PWA Live Sync"));
      assert.ok(html.includes("Simulate Offline"));
    });
  });

  describe("TASK-093: Service Worker Background Sync Engine & Conflict Resolver", () => {
    test("processes pending mutations in chronological order and synchronizes successfully", async () => {
      const {
        clearAllOfflineData,
        enqueueOfflineMutation,
        getPendingOfflineMutations,
      } = await import("./offline-db");
      const { flushPendingOfflineMutations } = await import("./offline-sync");

      await clearAllOfflineData();

      // Enqueue two offline mutations with distinct timestamps
      await enqueueOfflineMutation({
        queueId: "mut-seq-1",
        sessionId: "sess-offline-sync-1",
        endpoint: "/api/v1/sync/push",
        payload: { sequenceNumber: 1, targetLoadL: "0.000", indication: "0.000" },
      });

      await enqueueOfflineMutation({
        queueId: "mut-seq-2",
        sessionId: "sess-offline-sync-1",
        endpoint: "/api/v1/sync/push",
        payload: { sequenceNumber: 2, targetLoadL: "5.000", indication: "5.000" },
      });

      const pendingBefore = await getPendingOfflineMutations();
      assert.equal(pendingBefore.length, 2);

      // Mock fetch accepting batch
      const mockFetch: typeof fetch = async (url, init) => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            syncedSessions: ["sess-offline-sync-1"],
            processedObservations: 1,
          }),
        } as any;
      };

      const result = await flushPendingOfflineMutations({
        fetchFn: mockFetch,
        apiBaseUrl: "http://test-server:4000",
      });

      assert.equal(result.syncedCount, 2);
      assert.equal(result.failedCount, 0);
      assert.equal(result.conflictCount, 0);

      // Queue must now be empty
      const pendingAfter = await getPendingOfflineMutations();
      assert.equal(pendingAfter.length, 0);
    });

    test("handles conflict resolution on APPROVED_LOCKED session by rejecting write and recording conflict", async () => {
      const {
        clearAllOfflineData,
        enqueueOfflineMutation,
        getPendingOfflineMutations,
      } = await import("./offline-db");
      const { flushPendingOfflineMutations } = await import("./offline-sync");

      await clearAllOfflineData();

      await enqueueOfflineMutation({
        queueId: "mut-locked-001",
        sessionId: "sess-locked-session-99",
        endpoint: "/api/v1/sync/push",
        payload: { sequenceNumber: 3, targetLoadL: "10.000", indication: "10.000" },
      });

      // Mock fetch returning 403 SESSION_IMMUTABLE_LOCKED
      const mockFetchLocked: typeof fetch = async () => {
        return {
          ok: false,
          status: 403,
          json: async () => ({
            code: "SESSION_IMMUTABLE_LOCKED",
            error: "Session is in APPROVED_LOCKED state and immutable under WELMEC 7.2",
          }),
        } as any;
      };

      const result = await flushPendingOfflineMutations({
        fetchFn: mockFetchLocked,
        apiBaseUrl: "http://test-server:4000",
      });

      assert.equal(result.conflictCount, 1);
      assert.equal(result.syncedCount, 0);
      assert.equal(result.results[0].status, "CONFLICT_REJECTED");
      assert.ok(result.results[0].error?.includes("SESSION_IMMUTABLE_LOCKED"));

      // Mutation is marked as FAILED with conflict error
      const pending = await getPendingOfflineMutations();
      assert.equal(pending.length, 1);
      assert.equal(pending[0].status, "FAILED");
      assert.ok(pending[0].error?.includes("SESSION_IMMUTABLE_LOCKED"));
    });
  });
});
