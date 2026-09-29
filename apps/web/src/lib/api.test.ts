import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  authApi,
  sessionsApi,
  observationsApi,
  weightsApi,
  instrumentsApi,
  rulesApi,
  reviewApi,
  reportsApi,
  verifyApi,
  dashboardApi,
  provenanceApi,
} from "./api.js";

describe("TASK-065: Unified Live Backend API Client", () => {
  describe("1. Client Surface & Sub-API Exports", () => {
    test("exports all required legal metrology sub-APIs", () => {
      assert.ok(authApi.login);
      assert.ok(authApi.getProfile);
      assert.ok(sessionsApi.list);
      assert.ok(sessionsApi.create);
      assert.ok(sessionsApi.getPlan);
      assert.ok(observationsApi.logObservation);
      assert.ok(observationsApi.calculateTurningPoint);
      assert.ok(weightsApi.list);
      assert.ok(weightsApi.precheck);
      assert.ok(instrumentsApi.list);
      assert.ok(instrumentsApi.classify);
      assert.ok(rulesApi.list);
      assert.ok(reviewApi.getAuditSummary);
      assert.ok(reviewApi.getQueue);
      assert.ok(dashboardApi.getMetrics);
      assert.ok(provenanceApi.getLedger);
      assert.ok(reportsApi.generate);
      assert.ok(verifyApi.verifyHash);
    });
  });

  describe("2. Live Integration with Express API Gateway (port 4000)", () => {
    test("fetches active rule pack from backend", async () => {
      try {
        const res = await rulesApi.list();
        assert.ok(res);
        assert.ok(Array.isArray(res.rulePacks));
      } catch (err: any) {
        // Tolerated if running in disconnected CI
        if (err?.code !== "ECONNREFUSED" && err?.cause?.code !== "ECONNREFUSED" && !err?.message?.includes("fetch failed")) {
          throw err;
        }
      }
    });

    test("executes real-time turning point calculation via backend API", async () => {
      try {
        const res = await observationsApi.calculateTurningPoint({
          indication: 10.0,
          deltaL: 0.002,
          e: 0.005,
          nominalLoad: 10.0,
        });
        assert.strictEqual(res.success, true);
        assert.ok(res.turningPointP);
        assert.ok(res.rawErrorE);
      } catch (err: any) {
        if (err?.code !== "ECONNREFUSED" && err?.cause?.code !== "ECONNREFUSED" && !err?.message?.includes("fetch failed")) {
          throw err;
        }
      }
    });
  });
});
