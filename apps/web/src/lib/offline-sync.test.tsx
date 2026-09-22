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
});
