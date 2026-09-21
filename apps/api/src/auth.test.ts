import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import express from "express";
import { PrismaClient } from "@maanak/db";
import {
  Role,
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  AuthService,
  requireAuth,
  requireRole,
  requirePermission,
} from "./auth/index.js";
import { createApp } from "./app.js";

describe("TASK-038: Argon2id Authentication & RBAC Middleware Guards", () => {
  describe("Argon2id Password Hashing & Verification", () => {
    it("hashes plaintext passwords using the Argon2id variant", async () => {
      const password = "LegalMetrology2026!Secured";
      const hash = await hashPassword(password);

      assert.ok(hash, "Hash should be non-empty");
      assert.ok(
        hash.startsWith("$argon2id$"),
        `Expected argon2id prefix, got: ${hash.substring(0, 15)}`,
      );
    });

    it("verifies matching passwords successfully", async () => {
      const password = "Director@RRSL#MasterKey";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(hash, password);
      assert.strictEqual(isValid, true);
    });

    it("rejects non-matching passwords", async () => {
      const password = "CorrectPassword123";
      const wrongPassword = "WrongPassword456";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(hash, wrongPassword);
      assert.strictEqual(isValid, false);
    });

    it("safely returns false for malformed or corrupted hashes", async () => {
      const isValid = await verifyPassword("not-a-valid-argon2-hash", "test");
      assert.strictEqual(isValid, false);
    });
  });

  describe("JWT Token Generation & Verification", () => {
    const mockPayload = {
      sub: "11111111-2222-3333-4444-555555555555",
      username: "director",
      email: "director@rrsl.gov.in",
      role: Role.DIRECTOR,
      laboratoryId: "99999999-8888-7777-6666-555555555555",
      permissions: ["reports:sign", "reports:publish"],
    };

    it("generates an access token and refresh token pair", () => {
      const tokens = generateTokens(mockPayload);

      assert.ok(tokens.accessToken, "Access token must be generated");
      assert.ok(tokens.refreshToken, "Refresh token must be generated");
      assert.strictEqual(tokens.tokenType, "Bearer");
      assert.strictEqual(tokens.expiresIn, 900);
    });

    it("verifies and decodes a valid access token", () => {
      const tokens = generateTokens(mockPayload);
      const decoded = verifyAccessToken(tokens.accessToken);

      assert.strictEqual(decoded.sub, mockPayload.sub);
      assert.strictEqual(decoded.username, mockPayload.username);
      assert.strictEqual(decoded.email, mockPayload.email);
      assert.strictEqual(decoded.role, mockPayload.role);
      assert.strictEqual(decoded.laboratoryId, mockPayload.laboratoryId);
      assert.deepStrictEqual(decoded.permissions, mockPayload.permissions);
    });

    it("verifies and decodes a valid refresh token", () => {
      const tokens = generateTokens(mockPayload);
      const decoded = verifyRefreshToken(tokens.refreshToken);

      assert.strictEqual(decoded.sub, mockPayload.sub);
      assert.strictEqual(decoded.tokenType, "refresh");
    });

    it("throws when verifying an invalid or tampered access token", () => {
      assert.throws(() => {
        verifyAccessToken("invalid.tampered.token");
      });
    });

    it("throws when verifying an expired access token", () => {
      const secret =
        process.env.JWT_SECRET ||
        "maanak-default-access-secret-minimum-32-chars-long";
      const expiredToken = jwt.sign(mockPayload, secret, { expiresIn: "0s" });

      assert.throws(() => {
        verifyAccessToken(expiredToken);
      });
    });
  });

  describe("RBAC & Auth Middleware Units", () => {
    const mockInspector = {
      sub: "usr-insp-001",
      username: "inspector",
      email: "inspector@rrsl.gov.in",
      role: Role.INSPECTOR,
      laboratoryId: "lab-rrsl-amd",
      permissions: ["sessions:create", "observations:create"],
    };

    const mockAdmin = {
      sub: "usr-admin-001",
      username: "admin",
      email: "admin@rrsl.gov.in",
      role: Role.ADMIN,
      laboratoryId: "lab-rrsl-amd",
      permissions: ["*"],
    };

    it("requireAuth rejects request when Authorization header is missing", () => {
      let responseStatus = 0;
      let responseBody: any = null;

      const req: any = { headers: {}, originalUrl: "/api/v1/protected" };
      const res: any = {
        status: (code: number) => {
          responseStatus = code;
          return {
            json: (body: any) => {
              responseBody = body;
            },
          };
        },
      };
      const next = () => assert.fail("next() should not be called");

      requireAuth(req, res, next);
      assert.strictEqual(responseStatus, 401);
      assert.strictEqual(responseBody.code, "UNAUTHORIZED");
    });

    it("requireAuth rejects request with non-Bearer token", () => {
      let responseStatus = 0;
      const req: any = {
        headers: { authorization: "Basic dXNlcjpwYXNz" },
        originalUrl: "/test",
      };
      const res: any = {
        status: (code: number) => {
          responseStatus = code;
          return { json: () => {} };
        },
      };
      const next = () => assert.fail("next() should not be called");

      requireAuth(req, res, next);
      assert.strictEqual(responseStatus, 401);
    });

    it("requireAuth attaches decoded user to req.user for valid token", () => {
      const tokens = generateTokens(mockInspector);
      let nextCalled = false;

      const req: any = {
        headers: { authorization: `Bearer ${tokens.accessToken}` },
        originalUrl: "/test",
      };
      const res: any = {
        status: () => ({ json: () => {} }),
      };
      const next = () => {
        nextCalled = true;
      };

      requireAuth(req, res, next);
      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.user.username, mockInspector.username);
      assert.strictEqual(req.user.role, Role.INSPECTOR);
    });

    it("requireRole allows authorized roles and rejects unauthorized roles", () => {
      const directorGuard = requireRole([Role.DIRECTOR, Role.ADMIN]);

      // Test 1: Inspector denied
      let status1 = 0;
      let body1: any = null;
      const req1: any = { user: mockInspector, headers: {} };
      const res1: any = {
        status: (c: number) => {
          status1 = c;
          return {
            json: (b: any) => {
              body1 = b;
            },
          };
        },
      };
      directorGuard(req1, res1, () => assert.fail("Should not pass"));
      assert.strictEqual(status1, 403);
      assert.strictEqual(body1.code, "FORBIDDEN");

      // Test 2: Admin permitted
      let passAdmin = false;
      const req2: any = { user: mockAdmin, headers: {} };
      const res2: any = {};
      directorGuard(req2, res2, () => {
        passAdmin = true;
      });
      assert.strictEqual(passAdmin, true);
    });

    it("requirePermission allows specific permission or wildcard (*)", () => {
      const signGuard = requirePermission("reports:sign");

      // Inspector without 'reports:sign' denied
      let status1 = 0;
      const req1: any = { user: mockInspector, headers: {} };
      const res1: any = {
        status: (c: number) => {
          status1 = c;
          return { json: () => {} };
        },
      };
      signGuard(req1, res1, () => assert.fail("Should not pass"));
      assert.strictEqual(status1, 403);

      // Admin with '*' allowed
      let passAdmin = false;
      const req2: any = { user: mockAdmin, headers: {} };
      const res2: any = {};
      signGuard(req2, res2, () => {
        passAdmin = true;
      });
      assert.strictEqual(passAdmin, true);
    });
  });

  describe("HTTP Integration Tests (Routes & App)", () => {
    // Setup Mock Database for AuthService
    let testPasswordHash: string;
    let mockUser: any;
    let mockPrisma: any;
    let authService: AuthService;
    let app: any;
    let protectedApp: any;

    it("sets up mock authentication environment", async () => {
      testPasswordHash = await hashPassword("ValidPassword123!");

      mockUser = {
        id: "00000000-0000-0000-0000-000000000001",
        username: "inspector.patel",
        email: "inspector.patel@rrsl.gov.in",
        fullName: "S. P. Patel",
        designation: "Testing Officer",
        roleId: "role-insp",
        laboratoryId: "lab-amd",
        passwordHash: testPasswordHash,
        isActive: true,
        role: {
          id: "role-insp",
          code: Role.INSPECTOR,
          name: "Legal Metrology Officer",
          permissionsJson: ["sessions:create", "observations:create"],
        },
        laboratory: {
          id: "lab-amd",
          code: "RRSL-AMD",
          name: "RRSL Ahmedabad",
        },
      };

      mockPrisma = {
        user: {
          findFirst: async ({ where }: any) => {
            const orList = where?.OR || [];
            const target = orList[0]?.email || orList[1]?.username;
            if (
              target === mockUser.email.toLowerCase() ||
              target === mockUser.username.toLowerCase()
            ) {
              return mockUser;
            }
            return null;
          },
          findUnique: async ({ where }: any) => {
            if (where.id === mockUser.id) {
              return mockUser;
            }
            return null;
          },
          update: async () => mockUser,
        },
      } as unknown as PrismaClient;

      authService = new AuthService(mockPrisma);
      app = createApp({ authService });

      // Create test app with protected routes
      protectedApp = express();
      protectedApp.use(express.json());
      protectedApp.get(
        "/api/v1/test/director-only",
        requireAuth,
        requireRole(Role.DIRECTOR),
        (_req: any, res: any) => {
          res.status(200).json({ status: "authorized-for-director" });
        },
      );

      protectedApp.get(
        "/api/v1/test/inspector-allowed",
        requireAuth,
        requireRole([Role.INSPECTOR, Role.DIRECTOR]),
        (_req: any, res: any) => {
          res.status(200).json({ status: "authorized" });
        },
      );
    });

    it("POST /api/v1/auth/login validates required fields", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({});

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, "VALIDATION_ERROR");
    });

    it("POST /api/v1/auth/login rejects non-existent user or invalid password", async () => {
      // 1. Wrong username
      const res1 = await request(app).post("/api/v1/auth/login").send({
        username: "unknown.user",
        password: "ValidPassword123!",
      });
      assert.strictEqual(res1.status, 401);
      assert.strictEqual(res1.body.code, "INVALID_CREDENTIALS");

      // 2. Wrong password
      const res2 = await request(app).post("/api/v1/auth/login").send({
        username: "inspector.patel",
        password: "IncorrectPassword!",
      });
      assert.strictEqual(res2.status, 401);
      assert.strictEqual(res2.body.code, "INVALID_CREDENTIALS");
    });

    it("POST /api/v1/auth/login succeeds with valid credentials and returns JWT tokens", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        username: "inspector.patel",
        password: "ValidPassword123!",
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.user.username, "inspector.patel");
      assert.strictEqual(res.body.user.role, Role.INSPECTOR);
      assert.ok(res.body.tokens.accessToken, "Should return accessToken");
      assert.ok(res.body.tokens.refreshToken, "Should return refreshToken");
      assert.strictEqual(res.body.tokens.tokenType, "Bearer");
    });

    it("GET /api/v1/auth/me returns 401 when token is omitted", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, "UNAUTHORIZED");
    });

    it("GET /api/v1/auth/me returns authenticated user profile with valid Bearer token", async () => {
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "inspector.patel@rrsl.gov.in",
        password: "ValidPassword123!",
      });

      const token = loginRes.body.tokens.accessToken;
      const meRes = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);

      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meRes.body.success, true);
      assert.strictEqual(meRes.body.user.username, "inspector.patel");
      assert.strictEqual(meRes.body.user.role, Role.INSPECTOR);
    });

    it("POST /api/v1/auth/refresh returns a fresh token pair", async () => {
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        username: "inspector.patel",
        password: "ValidPassword123!",
      });

      const refreshToken = loginRes.body.tokens.refreshToken;
      const refreshRes = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken });

      assert.strictEqual(refreshRes.status, 200);
      assert.strictEqual(refreshRes.body.success, true);
      assert.ok(refreshRes.body.tokens.accessToken);
      assert.ok(refreshRes.body.tokens.refreshToken);
    });

    it("enforces RBAC role guards on protected test routes", async () => {
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        username: "inspector.patel",
        password: "ValidPassword123!",
      });
      const inspectorToken = loginRes.body.tokens.accessToken;

      // 1. Inspector accesses inspector-allowed route -> 200 OK
      const allowedRes = await request(protectedApp)
        .get("/api/v1/test/inspector-allowed")
        .set("Authorization", `Bearer ${inspectorToken}`);
      assert.strictEqual(allowedRes.status, 200);
      assert.strictEqual(allowedRes.body.status, "authorized");

      // 2. Inspector attempts director-only route -> 403 Forbidden
      const deniedRes = await request(protectedApp)
        .get("/api/v1/test/director-only")
        .set("Authorization", `Bearer ${inspectorToken}`);
      assert.strictEqual(deniedRes.status, 403);
      assert.strictEqual(deniedRes.body.code, "FORBIDDEN");
    });
  });
});
