import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { Role, generateTokens } from "./auth/index.js";
import { createApp } from "./app.js";

describe("TASK-096: Backend Administrative API Endpoints (/api/v1/admin/*)", () => {
  let app: any;

  // Generate tokens for testing all statutory roles
  const adminTokens = generateTokens({
    sub: "usr-admin-001",
    username: "admin",
    email: "admin@maanak.gov.in",
    role: Role.ADMIN,
    laboratoryId: "cab925b6-17e6-4674-b6d3-ce6695deff96",
    permissions: ["*"],
  });

  const directorTokens = generateTokens({
    sub: "usr-dir-001",
    username: "director",
    email: "director@maanak.gov.in",
    role: Role.DIRECTOR,
    laboratoryId: "cab925b6-17e6-4674-b6d3-ce6695deff96",
    permissions: ["reports:sign"],
  });

  const reviewerTokens = generateTokens({
    sub: "usr-rev-001",
    username: "reviewer",
    email: "reviewer@maanak.gov.in",
    role: Role.REVIEWER,
    laboratoryId: "cab925b6-17e6-4674-b6d3-ce6695deff96",
    permissions: ["sessions:review"],
  });

  const inspectorTokens = generateTokens({
    sub: "usr-insp-001",
    username: "inspector",
    email: "inspector@maanak.gov.in",
    role: Role.INSPECTOR,
    laboratoryId: "cab925b6-17e6-4674-b6d3-ce6695deff96",
    permissions: ["sessions:execute"],
  });

  beforeEach(() => {
    app = createApp();
  });

  describe("1. RBAC Guard Enforcement across Admin Endpoints", () => {
    it("rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
      const res = await request(app).get("/api/v1/admin/users");
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, "UNAUTHORIZED");
    });

    it("rejects INSPECTOR role with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.code, "FORBIDDEN");
    });

    it("rejects REVIEWER role with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get("/api/v1/admin/roles")
        .set("Authorization", `Bearer ${reviewerTokens.accessToken}`);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.code, "FORBIDDEN");
    });

    it("rejects DIRECTOR role with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get("/api/v1/admin/audit-logs")
        .set("Authorization", `Bearer ${directorTokens.accessToken}`);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.code, "FORBIDDEN");
    });

    it("permits ADMIN role to access administrative endpoints", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users")
        .set("Authorization", `Bearer ${adminTokens.accessToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });
  });

  describe("2. GET /api/v1/admin/users - User Directory & Filtering", () => {
    it("lists personnel with sanitized profiles and no password hash leakage", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users")
        .set("Authorization", `Bearer ${adminTokens.accessToken}`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.users));
      assert.ok(res.body.users.length >= 4);

      for (const u of res.body.users) {
        assert.ok(u.id);
        assert.ok(u.email);
        assert.ok(u.role);
        assert.strictEqual(u.passwordHash, undefined, "passwordHash must never be exposed");
        assert.strictEqual(u.password, undefined, "password must never be exposed");
      }
    });

    it("filters personnel by role query parameter", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users?role=INSPECTOR")
        .set("Authorization", `Bearer ${adminTokens.accessToken}`);

      assert.strictEqual(res.status, 200);
      for (const u of res.body.users) {
        assert.strictEqual(u.role, "INSPECTOR");
      }
    });

    it("filters personnel by search query across name/email", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users?search=verma")
        .set("Authorization", `Bearer ${adminTokens.accessToken}`);

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.users.length >= 1);
      assert.ok(res.body.users.some((u: any) => u.fullName.toLowerCase().includes("verma")));
    });
  });

  describe("3. POST /api/v1/admin/users - Personnel Provisioning", () => {
    it("rejects invalid provisioning payload with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/admin/users")
        .set("Authorization", `Bearer ${adminTokens.accessToken}`)
        .send({
          email: "invalid-email",
          role: "SUPER_OFFICER", // invalid role
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, "VALIDATION_ERROR");
    });

    it("provisions new Legal Metrology officer account and returns 201 Created", async () => {
      const newOfficerEmail = `officer_${Date.now()}@rrsl.gov.in`;
      const res = await request(app)
        .post("/api/v1/admin/users")
        .set("Authorization", `Bearer ${adminTokens.accessToken}`)
        .send({
          fullName: "Ananya Sharma",
          email: newOfficerEmail,
          role: "INSPECTOR",
          designation: "Junior Metrologist / Testing Officer",
          mobileNumber: "+91-9876543210",
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.user);
      assert.strictEqual(res.body.user.fullName, "Ananya Sharma");
      assert.strictEqual(res.body.user.email, newOfficerEmail);
      assert.strictEqual(res.body.user.role, "INSPECTOR");
      assert.strictEqual(res.body.user.isActive, true);
      assert.strictEqual(res.body.user.passwordHash, undefined);
    });
  });

  describe("4. PATCH /api/v1/admin/users/:id - User Role & Profile Update", () => {
    it("updates officer designation and active status with 200 OK", async () => {
      // First fetch users to get an ID
      const listRes = await request(app)
        .get("/api/v1/admin/users")
        .set("Authorization", `Bearer ${adminTokens.accessToken}`);
      const targetUser = listRes.body.users[0];

      const patchRes = await request(app)
        .patch(`/api/v1/admin/users/${targetUser.id}`)
        .set("Authorization", `Bearer ${adminTokens.accessToken}`)
        .send({
          designation: "Promoted Senior Testing Officer",
          isActive: true,
        });

      assert.strictEqual(patchRes.status, 200);
      assert.strictEqual(patchRes.body.success, true);
      assert.strictEqual(patchRes.body.user.designation, "Promoted Senior Testing Officer");
    });

    it("returns 404 NOT_FOUND when updating non-existent user", async () => {
      const res = await request(app)
        .patch("/api/v1/admin/users/non-existent-user-uuid")
        .set("Authorization", `Bearer ${adminTokens.accessToken}`)
        .send({
          designation: "Ghost Officer",
        });

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, "NOT_FOUND");
    });
  });

  describe("5. GET /api/v1/admin/roles - Statutory Roles Specification", () => {
    it("returns all 4 standard legal metrology roles with granted permissions", async () => {
      const res = await request(app)
        .get("/api/v1/admin/roles")
        .set("Authorization", `Bearer ${adminTokens.accessToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.count, 4);

      const roleCodes = res.body.roles.map((r: any) => r.code);
      assert.ok(roleCodes.includes("INSPECTOR"));
      assert.ok(roleCodes.includes("REVIEWER"));
      assert.ok(roleCodes.includes("DIRECTOR"));
      assert.ok(roleCodes.includes("ADMIN"));

      const adminRole = res.body.roles.find((r: any) => r.code === "ADMIN");
      assert.ok(adminRole.permissions.includes("*"));
    });
  });

  describe("6. GET /api/v1/admin/audit-logs - Administrative Audit Trail", () => {
    it("returns chronological audit logs created by system and admin actions", async () => {
      const res = await request(app)
        .get("/api/v1/admin/audit-logs")
        .set("Authorization", `Bearer ${adminTokens.accessToken}`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.auditLogs));
      assert.ok(res.body.auditLogs.length >= 1);
    });
  });
});
