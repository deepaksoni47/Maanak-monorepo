import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { RulePackRegistry, loadDefaultRulePack } from "@maanak/rules-engine";
import { Role, generateTokens } from "./auth/index.js";
import { createApp } from "./app.js";

describe("TASK-039: Rule Pack Management REST Routes (/api/v1/rules)", () => {
  let registry: RulePackRegistry;
  let app: any;

  // Tokens for RBAC testing
  const adminTokens = generateTokens({
    sub: "usr-admin-001",
    username: "admin",
    email: "admin@rrsl.gov.in",
    role: Role.ADMIN,
    laboratoryId: "lab-amd",
    permissions: ["*"],
  });

  const directorTokens = generateTokens({
    sub: "usr-dir-001",
    username: "director",
    email: "director@rrsl.gov.in",
    role: Role.DIRECTOR,
    laboratoryId: "lab-amd",
    permissions: ["standards:approve"],
  });

  const inspectorTokens = generateTokens({
    sub: "usr-insp-001",
    username: "inspector",
    email: "inspector@rrsl.gov.in",
    role: Role.INSPECTOR,
    laboratoryId: "lab-amd",
    permissions: ["sessions:create"],
  });

  beforeEach(() => {
    // Fresh isolated registry for each test
    registry = new RulePackRegistry();
    app = createApp({ rulesRegistry: registry });
  });

  describe("GET /api/v1/rules - List Rule Packs", () => {
    it("returns list of registered rule packs with metadata and active state", async () => {
      const res = await request(app).get("/api/v1/rules");

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.rulePacks));
      assert.ok(res.body.count >= 1);

      const activePack = res.body.rulePacks.find((p: any) => p.isActive);
      assert.ok(activePack, "There must be an active rule pack");
      assert.strictEqual(activePack.id, "oiml-r76-2006-v1");
      assert.strictEqual(activePack.standard, "OIML R 76-1:2006");
    });
  });

  describe("GET /api/v1/rules/active - Active Rule Pack Details", () => {
    it("retrieves full specification of the currently active rule pack", async () => {
      const res = await request(app).get("/api/v1/rules/active");

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.rulePack);
      assert.strictEqual(res.body.rulePack.id, "oiml-r76-2006-v1");
      assert.ok(res.body.rulePack.table3Classification);
      assert.ok(res.body.rulePack.table6MpeBrackets);
      assert.ok(res.body.rulePack.metrologicalRules);
      assert.ok(res.body.rulePack.environmentalConstraints);
    });
  });

  describe("GET /api/v1/rules/:id - Specific Rule Pack by ID", () => {
    it("returns 200 and rule pack details when given an existing ID", async () => {
      const res = await request(app).get("/api/v1/rules/oiml-r76-2006-v1");

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.rulePack.id, "oiml-r76-2006-v1");
      assert.strictEqual(res.body.rulePack.issuingBody, "OIML");
    });

    it("returns 404 NOT_FOUND when given an unknown rule pack ID", async () => {
      const res = await request(app).get("/api/v1/rules/non-existent-pack-999");

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, "NOT_FOUND");
      assert.ok(res.body.error.includes("non-existent-pack-999"));
    });
  });

  describe("POST /api/v1/rules/upload - Register / Hot-Swap Rule Pack", () => {
    const validCustomPack = {
      ...loadDefaultRulePack(),
      id: "oiml-r76-custom-2027",
      title: "OIML R 76-1 Custom 2027 Revision",
      version: "2.0.0",
      effectiveFrom: "2027-01-01T00:00:00Z",
    };

    it("rejects unauthenticated upload requests with 401", async () => {
      const res = await request(app)
        .post("/api/v1/rules/upload")
        .send(validCustomPack);

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, "UNAUTHORIZED");
    });

    it("rejects non-admin roles (INSPECTOR) with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .post("/api/v1/rules/upload")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send(validCustomPack);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.code, "FORBIDDEN");
    });

    it("rejects invalid rule pack schema with 400 VALIDATION_ERROR", async () => {
      const invalidPack = {
        id: "invalid-pack",
        title: "Missing all required fields",
      };

      const res = await request(app)
        .post("/api/v1/rules/upload")
        .set("Authorization", `Bearer ${adminTokens.accessToken}`)
        .send(invalidPack);

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, "VALIDATION_ERROR");
    });

    it("allows ADMIN to upload a valid rule pack and registers it successfully", async () => {
      const res = await request(app)
        .post("/api/v1/rules/upload")
        .set("Authorization", `Bearer ${adminTokens.accessToken}`)
        .send(validCustomPack);

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.rulePack.id, "oiml-r76-custom-2027");
      assert.strictEqual(
        res.body.rulePack.title,
        "OIML R 76-1 Custom 2027 Revision",
      );

      // Verify it appears in the list
      const listRes = await request(app).get("/api/v1/rules");
      assert.strictEqual(listRes.body.count, 2);
      const customItem = listRes.body.rulePacks.find(
        (p: any) => p.id === "oiml-r76-custom-2027",
      );
      assert.ok(customItem, "Newly uploaded pack must be in list");
    });

    it("allows uploading with setActive: true to hot-swap active rule pack immediately", async () => {
      const res = await request(app)
        .post("/api/v1/rules/upload")
        .set("Authorization", `Bearer ${adminTokens.accessToken}`)
        .send({
          rulePack: validCustomPack,
          setActive: true,
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.rulePack.isActive, true);

      // Verify active endpoint returns new pack
      const activeRes = await request(app).get("/api/v1/rules/active");
      assert.strictEqual(activeRes.body.rulePack.id, "oiml-r76-custom-2027");
    });
  });

  describe("POST /api/v1/rules/:id/activate - Switch Active Rule Pack", () => {
    beforeEach(async () => {
      const secondaryPack = {
        ...loadDefaultRulePack(),
        id: "oiml-r76-secondary",
        title: "Secondary Rule Pack",
        version: "1.5.0",
      };
      registry.registerRulePack(secondaryPack, { setActive: false });
    });

    it("rejects unauthenticated activation requests with 401", async () => {
      const res = await request(app).post(
        "/api/v1/rules/oiml-r76-secondary/activate",
      );

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, "UNAUTHORIZED");
    });

    it("rejects unauthorized role (INSPECTOR) with 403", async () => {
      const res = await request(app)
        .post("/api/v1/rules/oiml-r76-secondary/activate")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.code, "FORBIDDEN");
    });

    it("returns 404 when activating a non-existent rule pack ID", async () => {
      const res = await request(app)
        .post("/api/v1/rules/unknown-pack-id/activate")
        .set("Authorization", `Bearer ${adminTokens.accessToken}`);

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, "NOT_FOUND");
    });

    it("allows DIRECTOR to activate an existing secondary rule pack", async () => {
      const res = await request(app)
        .post("/api/v1/rules/oiml-r76-secondary/activate")
        .set("Authorization", `Bearer ${directorTokens.accessToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.activePackId, "oiml-r76-secondary");

      // Verify active endpoint now reflects secondary pack
      const activeRes = await request(app).get("/api/v1/rules/active");
      assert.strictEqual(activeRes.body.rulePack.id, "oiml-r76-secondary");
    });

    it("allows ADMIN to switch active rule pack back to default", async () => {
      // First switch to secondary
      registry.setActiveRulePack("oiml-r76-secondary");

      const res = await request(app)
        .post("/api/v1/rules/oiml-r76-2006-v1/activate")
        .set("Authorization", `Bearer ${adminTokens.accessToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.activePackId, "oiml-r76-2006-v1");

      const activeRes = await request(app).get("/api/v1/rules/active");
      assert.strictEqual(activeRes.body.rulePack.id, "oiml-r76-2006-v1");
    });
  });
});
