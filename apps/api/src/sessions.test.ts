import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { PrismaClient } from "@maanak/db";
import { Role, generateTokens } from "./auth/index.js";
import { createApp } from "./app.js";

describe("TASK-042: Test Session & Dynamic Plan Routes (/api/v1/sessions)", () => {
  let mockPrisma: any;
  let app: any;
  let storedSessions: any[] = [];
  let storedInstruments: any[] = [];
  let storedUnits: any[] = [];
  let storedPlans: any[] = [];
  let storedRulePackVersions: any[] = [];
  let storedAudits: any[] = [];

  const mockLabId = "11111111-2222-3333-4444-555555555555";
  const mockOfficerId = "usr-insp-001";

  // Tokens for RBAC testing
  const inspectorTokens = generateTokens({
    sub: mockOfficerId,
    username: "inspector.patel",
    email: "inspector.patel@rrsl.gov.in",
    role: Role.INSPECTOR,
    laboratoryId: mockLabId,
    permissions: ["sessions:create", "observations:create"],
  });

  const reviewerTokens = generateTokens({
    sub: "usr-rev-001",
    username: "reviewer.desai",
    email: "reviewer.desai@rrsl.gov.in",
    role: Role.REVIEWER,
    laboratoryId: mockLabId,
    permissions: ["sessions:review"],
  });

  const adminTokens = generateTokens({
    sub: "usr-adm-001",
    username: "admin.sharma",
    email: "admin.sharma@rrsl.gov.in",
    role: Role.ADMIN,
    laboratoryId: mockLabId,
    permissions: ["*"],
  });

  beforeEach(() => {
    storedRulePackVersions = [
      {
        id: "22222222-2222-2222-2222-222222222222",
        rulePackId: "rp-001",
        versionTag: "2006-v1.0",
        isActive: true,
        effectiveFrom: new Date("2006-01-01"),
      },
    ];

    storedInstruments = [
      {
        id: "33333333-3333-3333-3333-333333333333",
        modelName: "DS-215 Bench Scale",
        patternDesignation: "IND/09/2024/481",
        accuracyClass: { code: "III" },
        instrumentType: "Non-Automatic Counter Scale",
        weighingPrinciple: "Strain Gauge Load Cell",
        maxCapacity: "15.00000000",
        minCapacity: "0.10000000",
        verificationScaleIntervalE: "0.00500000",
        actualScaleIntervalD: "0.00500000",
        scaleDivisionCountN: 3000,
        unitOfMeasure: "kg",
        isMultiInterval: false,
        isMultipleRange: false,
        numberOfPartialRanges: 1,
        manufacturer: { companyName: "Essae-Teraoka Pvt Ltd" },
      },
    ];

    storedUnits = [
      {
        id: "44444444-4444-4444-4444-444444444444",
        instrumentModelId: "33333333-3333-3333-3333-333333333333",
        serialNumber: "SN-2026-98765",
        yearOfManufacture: 2026,
        instrumentModel: storedInstruments[0],
      },
    ];

    storedPlans = [];
    storedSessions = [];
    storedAudits = [];

    mockPrisma = {
      instrumentUnit: {
        findUnique: async (args: any) => {
          const unit = storedUnits.find((u) => u.id === args.where.id);
          if (!unit) return null;
          return {
            ...unit,
            instrumentModel: storedInstruments.find(
              (m) => m.id === unit.instrumentModelId,
            ),
          };
        },
      },
      rulePackVersion: {
        findFirst: async (args: any) => {
          if (args?.where?.isActive) {
            return storedRulePackVersions.find((v) => v.isActive) || null;
          }
          return storedRulePackVersions[0] || null;
        },
      },
      testPlan: {
        findFirst: async (args: any) => {
          return (
            storedPlans.find(
              (p) => p.instrumentModelId === args.where.instrumentModelId,
            ) || null
          );
        },
        create: async (args: any) => {
          const plan = {
            id: `plan-${Date.now()}`,
            ...args.data,
            items: args.data.items?.create || [],
          };
          storedPlans.push(plan);
          return plan;
        },
      },
      testSession: {
        create: async (args: any) => {
          const unit = storedUnits.find(
            (u) => u.id === args.data.instrumentUnitId,
          );
          const plan = storedPlans.find((p) => p.id === args.data.testPlanId);
          const session = {
            id: `ses-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            ...args.data,
            createdAt: new Date(),
            updatedAt: new Date(),
            instrumentUnit: unit
              ? { ...unit, instrumentModel: storedInstruments[0] }
              : undefined,
            testPlan: plan,
            testingOfficer: {
              id: args.data.testingOfficerId,
              username: "inspector.patel",
              fullName: "Rajesh Patel",
              designation: "Senior Metrology Officer",
            },
            laboratory: {
              id: args.data.laboratoryId,
              laboratoryName: "Regional Reference Standards Laboratory",
              laboratoryCode: "RRSL-AHM",
            },
          };
          storedSessions.push(session);
          return session;
        },
        findMany: async (args: any) => {
          let res = [...storedSessions];
          if (args?.where?.laboratoryId) {
            res = res.filter((s) => s.laboratoryId === args.where.laboratoryId);
          }
          if (args?.where?.status) {
            res = res.filter((s) => s.status === args.where.status);
          }
          if (args?.where?.testingOfficerId) {
            res = res.filter(
              (s) => s.testingOfficerId === args.where.testingOfficerId,
            );
          }
          if (args?.where?.instrumentUnitId) {
            res = res.filter(
              (s) => s.instrumentUnitId === args.where.instrumentUnitId,
            );
          }
          if (args?.where?.OR) {
            const query = args.where.OR[0].sessionNumber.contains.toLowerCase();
            res = res.filter(
              (s) =>
                s.sessionNumber.toLowerCase().includes(query) ||
                s.instrumentUnit?.serialNumber?.toLowerCase().includes(query),
            );
          }
          const skip = args?.skip || 0;
          const take = args?.take || res.length;
          return res.slice(skip, skip + take).map((s) => ({
            ...s,
            _count: { rawObservations: 0, calculationRuns: 0, reviewAudits: 0 },
          }));
        },
        count: async (args: any) => {
          let res = [...storedSessions];
          if (args?.where?.laboratoryId) {
            res = res.filter((s) => s.laboratoryId === args.where.laboratoryId);
          }
          if (args?.where?.status) {
            res = res.filter((s) => s.status === args.where.status);
          }
          return res.length;
        },
        findUnique: async (args: any) => {
          const s = storedSessions.find((item) => item.id === args.where.id);
          if (!s) return null;
          return {
            ...s,
            instrumentUnit: {
              ...storedUnits[0],
              instrumentModel: storedInstruments[0],
            },
            testPlan: storedPlans.find((p) => p.id === s.testPlanId) || {
              id: s.testPlanId,
              title: "Default Test Plan",
              items: [],
            },
          };
        },
        update: async (args: any) => {
          const idx = storedSessions.findIndex((s) => s.id === args.where.id);
          if (idx === -1) throw new Error("Session not found");
          storedSessions[idx] = {
            ...storedSessions[idx],
            ...args.data,
            updatedAt: new Date(),
          };
          return storedSessions[idx];
        },
      },
      reviewAudit: {
        create: async (args: any) => {
          const record = {
            id: `audit-${Date.now()}`,
            ...args.data,
            reviewedAt: new Date(),
          };
          storedAudits.push(record);
          return record;
        },
      },
    };

    app = createApp({ db: mockPrisma as unknown as PrismaClient });
  });

  describe("POST /api/v1/sessions - Test Session Intake", () => {
    it("rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
      const res = await request(app).post("/api/v1/sessions").send({
        instrumentUnitId: "44444444-4444-4444-4444-444444444444",
      });

      assert.equal(res.status, 401);
      assert.equal(res.body.code, "UNAUTHORIZED");
    });

    it("rejects unauthorized roles (REVIEWER) with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .post("/api/v1/sessions")
        .set("Authorization", `Bearer ${reviewerTokens.accessToken}`)
        .send({
          instrumentUnitId: "44444444-4444-4444-4444-444444444444",
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.code, "FORBIDDEN");
    });

    it("returns 404 NOT_FOUND when instrument unit does not exist", async () => {
      const res = await request(app)
        .post("/api/v1/sessions")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          instrumentUnitId: "99999999-9999-9999-9999-999999999999",
        });

      assert.equal(res.status, 404);
      assert.equal(res.body.error, "NOT_FOUND");
    });

    it("creates new session in DRAFT status and dynamically generates test plan", async () => {
      const res = await request(app)
        .post("/api/v1/sessions")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          instrumentUnitId: "44444444-4444-4444-4444-444444444444",
          sessionNumber: "SES-2026-TEST-001",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.message, "Test session created successfully.");
      assert.ok(res.body.session);
      assert.equal(res.body.session.sessionNumber, "SES-2026-TEST-001");
      assert.equal(res.body.session.status, "DRAFT");
      assert.equal(res.body.session.laboratoryId, mockLabId);
      assert.equal(res.body.session.testingOfficerId, mockOfficerId);
      assert.ok(res.body.session.testPlanId);

      // Verify dynamic plan was generated and saved with 6 test clauses
      assert.equal(storedPlans.length, 1);
      assert.equal(storedPlans[0].totalTestClauses, 6);
      assert.equal(storedPlans[0].items.length, 6);
    });

    it("auto-generates unique sessionNumber when omitted", async () => {
      const res = await request(app)
        .post("/api/v1/sessions")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          instrumentUnitId: "44444444-4444-4444-4444-444444444444",
        });

      assert.equal(res.status, 201);
      assert.ok(res.body.session.sessionNumber.startsWith("SES-"));
    });
  });

  describe("GET /api/v1/sessions - List Sessions with Filters", () => {
    beforeEach(async () => {
      // Seed 2 sessions
      await request(app)
        .post("/api/v1/sessions")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          instrumentUnitId: "44444444-4444-4444-4444-444444444444",
          sessionNumber: "SES-FILTER-001",
        });

      await request(app)
        .post("/api/v1/sessions")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          instrumentUnitId: "44444444-4444-4444-4444-444444444444",
          sessionNumber: "SES-FILTER-002",
        });
    });

    it("rejects unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/v1/sessions");
      assert.equal(res.status, 401);
    });

    it("returns list of sessions with pagination metadata", async () => {
      const res = await request(app)
        .get("/api/v1/sessions")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.sessions.length, 2);
      assert.equal(res.body.meta.totalCount, 2);
      assert.equal(res.body.meta.page, 1);
    });

    it("filters sessions by status", async () => {
      const res = await request(app)
        .get("/api/v1/sessions?status=DRAFT")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.sessions.length, 2);
      assert.equal(res.body.sessions[0].status, "DRAFT");
    });

    it("searches sessions by session number substring", async () => {
      const res = await request(app)
        .get("/api/v1/sessions?search=002")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.sessions.length, 1);
      assert.equal(res.body.sessions[0].sessionNumber, "SES-FILTER-002");
    });
  });

  describe("GET /api/v1/sessions/:id - Session Details", () => {
    let createdSessionId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post("/api/v1/sessions")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          instrumentUnitId: "44444444-4444-4444-4444-444444444444",
          sessionNumber: "SES-DETAIL-001",
        });
      createdSessionId = res.body.session.id;
    });

    it("returns 404 for unknown session ID", async () => {
      const res = await request(app)
        .get("/api/v1/sessions/non-existent-id")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.error, "NOT_FOUND");
    });

    it("returns full session details with include graph", async () => {
      const res = await request(app)
        .get(`/api/v1/sessions/${createdSessionId}`)
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.session.id, createdSessionId);
      assert.equal(res.body.session.sessionNumber, "SES-DETAIL-001");
      assert.ok(res.body.session.instrumentUnit);
      assert.equal(
        res.body.session.instrumentUnit.serialNumber,
        "SN-2026-98765",
      );
      assert.ok(res.body.session.testingOfficer);
    });
  });

  describe("GET /api/v1/sessions/:id/plan - Dynamic Test Plan & Standard Load Points (Acceptance Target)", () => {
    let createdSessionId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post("/api/v1/sessions")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          instrumentUnitId: "44444444-4444-4444-4444-444444444444",
          sessionNumber: "SES-PLAN-001",
        });
      createdSessionId = res.body.session.id;
    });

    it("returns dynamically computed standard load points for Forms 1 through 6", async () => {
      const res = await request(app)
        .get(`/api/v1/sessions/${createdSessionId}/plan`)
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.testSessionId, createdSessionId);
      assert.equal(res.body.sessionNumber, "SES-PLAN-001");

      // Verify Instrument Model spec
      assert.equal(res.body.instrumentModel.modelName, "DS-215 Bench Scale");
      assert.equal(res.body.instrumentModel.accuracyClass, "III");
      assert.equal(res.body.instrumentModel.maxCapacity, "15.00000000");

      // Verify Test Plan contains 6 clauses
      const testPlan = res.body.testPlan;
      assert.equal(testPlan.totalTestClauses, 6);
      assert.equal(testPlan.items.length, 6);

      // Form 1: Weighing Performance
      const form1 = testPlan.items.find(
        (it: any) => it.formNumber === "Form 1",
      );
      assert.ok(form1);
      assert.equal(form1.clauseNumber, "A.4.4");
      assert.ok(form1.targetLoads.length >= 10);

      // Verify critical load points exist in Form 1: Min (0.1), 500e (2.5), 2000e (10.0), Max (15.0)
      const form1Loads = form1.targetLoads.map((p: any) => p.nominalLoad);
      assert.ok(form1Loads.includes("0.1"));
      assert.ok(form1Loads.includes("2.5"));
      assert.ok(form1Loads.includes("10"));
      assert.ok(form1Loads.includes("15"));

      // Form 3: Eccentricity
      const form3 = testPlan.items.find(
        (it: any) => it.formNumber === "Form 3",
      );
      assert.ok(form3);
      assert.equal(form3.targetLoads.length, 5); // 5 positions

      // Form 5: Repeatability
      const form5 = testPlan.items.find(
        (it: any) => it.formNumber === "Form 5",
      );
      assert.ok(form5);
      assert.ok(form5.targetLoads.length >= 6); // Repeated points
    });

    it("returns 404 when plan requested for non-existent session", async () => {
      const res = await request(app)
        .get("/api/v1/sessions/unknown-id/plan")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.error, "NOT_FOUND");
    });
  });

  describe("PATCH /api/v1/sessions/:id/status - State Machine Lifecycle", () => {
    let createdSessionId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post("/api/v1/sessions")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          instrumentUnitId: "44444444-4444-4444-4444-444444444444",
          sessionNumber: "SES-STATUS-001",
        });
      createdSessionId = res.body.session.id;
    });

    it("transitions session from DRAFT to IN_PROGRESS", async () => {
      const res = await request(app)
        .patch(`/api/v1/sessions/${createdSessionId}/status`)
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({ status: "IN_PROGRESS" });

      assert.equal(res.status, 200);
      assert.equal(res.body.session.status, "IN_PROGRESS");
    });

    it("transitions session from IN_PROGRESS to UNDER_REVIEW and generates audit record", async () => {
      // Step 1: DRAFT -> IN_PROGRESS
      await request(app)
        .patch(`/api/v1/sessions/${createdSessionId}/status`)
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({ status: "IN_PROGRESS" });

      // Step 2: IN_PROGRESS -> UNDER_REVIEW
      const res = await request(app)
        .patch(`/api/v1/sessions/${createdSessionId}/status`)
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          status: "UNDER_REVIEW",
          comments: "Observations completed. Ready for reviewer audit.",
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.session.status, "UNDER_REVIEW");

      // Verify audit record was created
      assert.equal(storedAudits.length, 1);
      assert.equal(storedAudits[0].testSessionId, createdSessionId);
      assert.equal(storedAudits[0].reviewStage, "INTAKE_REVIEW");
      assert.equal(
        storedAudits[0].comments,
        "Observations completed. Ready for reviewer audit.",
      );
    });

    it("rejects illegal state transition (DRAFT -> COMPLETED) with 400", async () => {
      const res = await request(app)
        .patch(`/api/v1/sessions/${createdSessionId}/status`)
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({ status: "COMPLETED" });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "INVALID_STATE_TRANSITION");
    });

    it("allows ADMIN to perform override transition", async () => {
      const res = await request(app)
        .patch(`/api/v1/sessions/${createdSessionId}/status`)
        .set("Authorization", `Bearer ${adminTokens.accessToken}`)
        .send({ status: "COMPLETED" });

      assert.equal(res.status, 200);
      assert.equal(res.body.session.status, "COMPLETED");
      assert.ok(res.body.session.completedAt);
    });
  });
});
