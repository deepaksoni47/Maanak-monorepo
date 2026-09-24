import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  OFFLINE_DB_NAME,
  OFFLINE_DB_VERSION,
  cacheSession,
  cacheSessions,
  getCachedSession,
  getCachedSessions,
  cacheInstrument,
  cacheInstruments,
  getCachedInstrument,
  getCachedInstruments,
  cacheStandardWeights,
  getCachedStandardWeights,
  enqueueOfflineMutation,
  getPendingOfflineMutations,
  updateMutationStatus,
  removeOfflineMutation,
  clearAllOfflineData,
  CachedSession,
  CachedInstrument,
  CachedWeight,
} from "./offline-db.js";

describe("TASK-091: IndexedDB Production Storage Driver (maanak_offline_db)", () => {
  beforeEach(async () => {
    await clearAllOfflineData();
  });

  describe("1. Database Configuration & Store Architecture", () => {
    it("exposes standardized database name and version", () => {
      assert.equal(OFFLINE_DB_NAME, "maanak_offline_db");
      assert.equal(OFFLINE_DB_VERSION, 1);
    });
  });

  describe("2. Test Sessions Cache Operations", () => {
    const mockSession: CachedSession = {
      id: "sess-offline-001",
      sessionNumber: "RRSL-DEL-2026-TEST",
      status: "IN_PROGRESS",
      instrumentId: "inst-001",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("caches single session and retrieves it by ID", async () => {
      await cacheSession(mockSession);
      const retrieved = await getCachedSession("sess-offline-001");
      assert.ok(retrieved);
      assert.equal(retrieved.sessionNumber, "RRSL-DEL-2026-TEST");
      assert.equal(retrieved.status, "IN_PROGRESS");
    });

    it("caches batch of sessions and retrieves all cached records", async () => {
      const batch: CachedSession[] = [
        mockSession,
        {
          id: "sess-offline-002",
          sessionNumber: "RRSL-MUM-2026-TEST",
          status: "DRAFT",
          instrumentId: "inst-002",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await cacheSessions(batch);
      const all = await getCachedSessions();
      assert.equal(all.length, 2);
      assert.ok(all.some((s) => s.id === "sess-offline-001"));
      assert.ok(all.some((s) => s.id === "sess-offline-002"));
    });
  });

  describe("3. Instruments Specification Cache", () => {
    const mockInstrument: CachedInstrument = {
      id: "inst-999",
      serialNumber: "SN-999-VERIFIED",
      model: "AP-3000",
      manufacturer: "Maanak Instruments",
      accuracyClass: "Class III",
      maxCapacity: 15,
      minCapacity: 0.1,
      verificationScaleIntervalE: 0.005,
      unit: "kg",
    };

    it("caches instrument models and allows lookup by ID", async () => {
      await cacheInstrument(mockInstrument);
      const retrieved = await getCachedInstrument("inst-999");
      assert.ok(retrieved);
      assert.equal(retrieved.serialNumber, "SN-999-VERIFIED");
      assert.equal(retrieved.model, "AP-3000");
    });

    it("batch caches multiple instruments for offline intake selection", async () => {
      await cacheInstruments([
        mockInstrument,
        {
          id: "inst-1000",
          serialNumber: "SN-1000-PRECISION",
          model: "XP-205",
          manufacturer: "Mettler Toledo",
          accuracyClass: "Class I",
          maxCapacity: 220,
          minCapacity: 0.001,
          verificationScaleIntervalE: 0.0001,
          unit: "g",
        },
      ]);

      const all = await getCachedInstruments();
      assert.equal(all.length, 2);
    });
  });

  describe("4. Reference Standard Weights Inventory Cache", () => {
    it("caches standard weight sets with NABL calibration uncertainties", async () => {
      const weights: CachedWeight[] = [
        {
          id: "wt-f1-01",
          oimlClass: "F1",
          certificateNumber: "NABL/2026/F1-001",
          nominalMass: 10,
          unit: "kg",
          expandedUncertaintyU: 0.00005,
        },
        {
          id: "wt-e2-02",
          oimlClass: "E2",
          certificateNumber: "NABL/2026/E2-004",
          nominalMass: 1,
          unit: "kg",
          expandedUncertaintyU: 0.00001,
        },
      ];

      await cacheStandardWeights(weights);
      const retrieved = await getCachedStandardWeights();
      assert.equal(retrieved.length, 2);
      assert.equal(retrieved[0].oimlClass, "F1");
      assert.equal(retrieved[1].oimlClass, "E2");
    });
  });

  describe("5. Offline Queue Mutation Operations & Sync Lifecycle", () => {
    it("enqueues observation mutation with queueId, timestamp, and PENDING status", async () => {
      const mutation = await enqueueOfflineMutation({
        sessionId: "sess-offline-001",
        endpoint: "/api/v1/sync/push",
        payload: {
          loadKg: 5,
          indication: 5.0002,
          turningPointP: 5.0001,
        },
      });

      assert.ok(mutation.queueId);
      assert.equal(mutation.status, "PENDING");
      assert.equal(mutation.retryCount, 0);
      assert.ok(mutation.timestamp);

      const pending = await getPendingOfflineMutations();
      assert.equal(pending.length, 1);
      assert.equal(pending[0].queueId, mutation.queueId);
    });

    it("transitions mutation status and tracks retry count upon failure", async () => {
      const mutation = await enqueueOfflineMutation({
        sessionId: "sess-offline-001",
        endpoint: "/api/v1/sync/push",
        payload: { loadKg: 10 },
      });

      // Mark SYNCING
      await updateMutationStatus(mutation.queueId, "SYNCING");
      let pending = await getPendingOfflineMutations();
      assert.equal(pending.length, 0, "SYNCING items excluded from pending poll");

      // Mark FAILED on network drop
      await updateMutationStatus(mutation.queueId, "FAILED", "Network timeout: ERR_CONNECTION_REFUSED");
      pending = await getPendingOfflineMutations();
      assert.equal(pending.length, 1);
      assert.equal(pending[0].retryCount, 1);
      assert.equal(pending[0].error, "Network timeout: ERR_CONNECTION_REFUSED");
    });

    it("removes mutation from queue upon successful sync resolution", async () => {
      const mutation = await enqueueOfflineMutation({
        sessionId: "sess-offline-001",
        endpoint: "/api/v1/sync/push",
        payload: { loadKg: 15 },
      });

      await removeOfflineMutation(mutation.queueId);
      const pending = await getPendingOfflineMutations();
      assert.equal(pending.length, 0);
    });

    it("clears all stores cleanly with clearAllOfflineData", async () => {
      await cacheSession({
        id: "sess-x",
        sessionNumber: "X",
        status: "DRAFT",
        instrumentId: "i",
        createdAt: "",
        updatedAt: "",
      });
      await enqueueOfflineMutation({
        sessionId: "sess-x",
        endpoint: "/push",
        payload: {},
      });

      await clearAllOfflineData();

      const sessions = await getCachedSessions();
      const mutations = await getPendingOfflineMutations();
      assert.equal(sessions.length, 0);
      assert.equal(mutations.length, 0);
    });
  });
});
