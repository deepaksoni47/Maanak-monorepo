import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "./app.js";

describe("TASK-037: Express Application Skeleton & Security Middleware (app.ts)", () => {
  const app = createApp();

  describe("Healthcheck & Service Endpoints", () => {
    it("GET /health returns HTTP 200 with service status metadata", async () => {
      const res = await request(app).get("/health");

      assert.equal(res.status, 200);
      assert.equal(
        res.headers["content-type"].includes("application/json"),
        true,
      );
      assert.equal(res.body.status, "ok");
      assert.equal(res.body.service, "@maanak/api");
      assert.equal(res.body.version, "1.0.0");
      assert.ok(typeof res.body.uptimeSeconds === "number");
      assert.ok(typeof res.body.timestamp === "string");
    });

    it("GET /api/v1/health matches the root healthcheck contract", async () => {
      const res = await request(app).get("/api/v1/health");

      assert.equal(res.status, 200);
      assert.equal(res.body.status, "ok");
      assert.equal(res.body.service, "@maanak/api");
    });

    it("GET / returns API Gateway root overview with 200 OK", async () => {
      const res = await request(app).get("/");

      assert.equal(res.status, 200);
      assert.ok(res.body.name.includes("MAANAK"));
      assert.equal(res.body.version, "1.0.0");
    });
  });

  describe("Security Middleware & Headers (Helmet, CORS, Tracing)", () => {
    it("sets security headers via Helmet middleware", async () => {
      const res = await request(app).get("/health");

      // Helmet security headers
      assert.equal(res.headers["x-content-type-options"], "nosniff");
      assert.equal(res.headers["x-dns-prefetch-control"], "off");
      assert.ok(res.headers["content-security-policy"]);
    });

    it("assigns and echoes X-Request-Id header for request correlation", async () => {
      // 1. When client provides X-Request-Id
      const customId = "req-trace-abc-123";
      const resWithCustom = await request(app)
        .get("/health")
        .set("X-Request-Id", customId);

      assert.equal(resWithCustom.headers["x-request-id"], customId);

      // 2. When client omits X-Request-Id, server generates UUID
      const resGenerated = await request(app).get("/health");
      assert.ok(resGenerated.headers["x-request-id"]);
      assert.match(
        resGenerated.headers["x-request-id"],
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it("enables CORS with proper allow headers", async () => {
      const res = await request(app)
        .get("/health")
        .set("Origin", "http://localhost:3000");
      assert.ok(
        res.headers["access-control-allow-origin"] === "*" ||
        res.headers["access-control-allow-origin"] === "http://localhost:3000",
      );
    });
  });

  describe("Error Handling & 404 Fallback", () => {
    it("returns structured JSON 404 for unmapped routes", async () => {
      const res = await request(app).get("/api/v1/non-existent-route-xyz");

      assert.equal(res.status, 404);
      assert.equal(res.body.code, "NOT_FOUND");
      assert.ok(res.body.error.includes("Route not found"));
      assert.ok(res.body.timestamp);
    });

    it("handles malformed JSON request bodies with 400 INVALID_JSON", async () => {
      const res = await request(app)
        .post("/health")
        .set("Content-Type", "application/json")
        .send('{ "broken": json');

      assert.equal(res.status, 400);
      assert.equal(res.body.code, "INVALID_JSON");
      assert.ok(res.body.error.includes("Malformed JSON"));
    });
  });
});
