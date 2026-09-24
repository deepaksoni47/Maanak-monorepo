import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { PrismaClient, Prisma } from "@maanak/db";
import { Role, generateTokens } from "./auth/index.js";
import { createApp } from "./app.js";

describe("TASK-044: Reviewer Anomaly Audit Routes (/api/v1/review)", () => {
  let mockPrisma: any;
  let app: any;

  let storedSessions: any[] = [];
  let storedAudits: any[] = [];
  let storedProvNodes: any[] = [];

  const mockLabId = "11111111-2222-3333-4444-555555555555";
  const mockReviewerId = "usr-rev-001";
  const mockCleanSessionId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const mockAnomalySessionId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

  // Tokens for RBAC testing
  const reviewerTokens = generateTokens({
    sub: mockReviewerId,
    username: "reviewer.desai",
    email: "reviewer.desai@rrsl.gov.in",
    role: Role.REVIEWER,
    laboratoryId: mockLabId,
    permissions: ["sessions:review", "audits:create"],
  });

  const inspectorTokens = generateTokens({
    sub: "usr-insp-001",
    username: "inspector.patel",
    email: "inspector.patel@rrsl.gov.in",
    role: Role.INSPECTOR,
    laboratoryId: mockLabId,
    permissions: ["observations:create"],
  });

  const directorTokens = generateTokens({
    sub: "usr-dir-001",
    username: "director.sharma",
    email: "director.sharma@rrsl.gov.in",
    role: Role.DIRECTOR,
    laboratoryId: mockLabId,
    permissions: ["*"],
  });

  beforeEach(() => {
    // Session 1: Clean monotonic observations
    const cleanObservations = [
      {
        id: "obs-clean-1",
        sequenceNumber: 1,
        targetLoadL: new Prisma.Decimal("0.0"),
        displayedIndicationI: new Prisma.Decimal("0.0"),
        changeoverWeightDl: new Prisma.Decimal("0.0025"),
      },
      {
        id: "obs-clean-2",
        sequenceNumber: 2,
        targetLoadL: new Prisma.Decimal("2.5"),
        displayedIndicationI: new Prisma.Decimal("2.5"),
        changeoverWeightDl: new Prisma.Decimal("0.0020"),
      },
      {
        id: "obs-clean-3",
        sequenceNumber: 3,
        targetLoadL: new Prisma.Decimal("10.0"),
        displayedIndicationI: new Prisma.Decimal("10.0"),
        changeoverWeightDl: new Prisma.Decimal("0.0015"),
      },
      {
        id: "obs-clean-4",
        sequenceNumber: 4,
        targetLoadL: new Prisma.Decimal("15.0"),
        displayedIndicationI: new Prisma.Decimal("15.0"),
        changeoverWeightDl: new Prisma.Decimal("0.0010"),
      },
    ];

    // Session 2: Injected non-monotonic step & excessive deltaL (> e)
    const anomalousObservations = [
      {
        id: "obs-anom-1",
        sequenceNumber: 1,
        targetLoadL: new Prisma.Decimal("2.5"),
        displayedIndicationI: new Prisma.Decimal("2.500"),
        changeoverWeightDl: new Prisma.Decimal("0.0020"),
      },
      {
        id: "obs-anom-2",
        sequenceNumber: 2,
        targetLoadL: new Prisma.Decimal("5.0"),
        displayedIndicationI: new Prisma.Decimal("2.490"), // Anomaly 1: Non-monotonic drop!
        changeoverWeightDl: new Prisma.Decimal("0.0060"), // Anomaly 2: deltaL > e (0.006 > 0.005)!
      },
      {
        id: "obs-anom-3",
        sequenceNumber: 3,
        targetLoadL: new Prisma.Decimal("10.0"),
        displayedIndicationI: new Prisma.Decimal("10.000"),
        changeoverWeightDl: new Prisma.Decimal("0.0015"),
      },
    ];

    const cleanEnvironmental = [
      {
        id: "env-1",
        temperatureC: new Prisma.Decimal("20.0"),
        relativeHumidityPercent: new Prisma.Decimal("50.0"),
        loggedAt: new Date("2026-09-21T10:00:00Z"),
      },
      {
        id: "env-2",
        temperatureC: new Prisma.Decimal("21.0"),
        relativeHumidityPercent: new Prisma.Decimal("52.0"),
        loggedAt: new Date("2026-09-21T11:00:00Z"),
      },
    ];

    storedSessions = [
      {
        id: mockCleanSessionId,
        sessionNumber: "SES-2026-CLEAN",
        status: "UNDER_REVIEW",
        instrumentUnit: {
          instrumentModel: {
            modelName: "DS-215 Precision Balance",
            verificationScaleIntervalE: new Prisma.Decimal("0.00500000"), // 5g
            maxCapacity: new Prisma.Decimal("15.00000000"),
            minCapacity: new Prisma.Decimal("0.10000000"),
            unitOfMeasure: "kg",
          },
        },
        rawObservations: cleanObservations,
        environmentalLogs: cleanEnvironmental,
      },
      {
        id: mockAnomalySessionId,
        sessionNumber: "SES-2026-ANOMALIES",
        status: "UNDER_REVIEW",
        instrumentUnit: {
          instrumentModel: {
            modelName: "DS-215 Precision Balance",
            verificationScaleIntervalE: new Prisma.Decimal("0.00500000"),
            maxCapacity: new Prisma.Decimal("15.00000000"),
            minCapacity: new Prisma.Decimal("0.10000000"),
            unitOfMeasure: "kg",
          },
        },
        rawObservations: anomalousObservations,
        environmentalLogs: cleanEnvironmental,
      },
    ];

    storedAudits = [];
    storedProvNodes = [];

    mockPrisma = {
      testSession: {
        findUnique: async (args: any) => {
          return storedSessions.find((s) => s.id === args.where.id) || null;
        },
        update: async (args: any) => {
          const s = storedSessions.find((s) => s.id === args.where.id);
          if (!s) throw new Error("Session not found");
          Object.assign(s, args.data);
          return s;
        },
      },
      reviewAudit: {
        findMany: async (args: any) => {
          return storedAudits
            .filter((a) => a.testSessionId === args.where.testSessionId)
            .map((a) => ({
              ...a,
              reviewerUser: {
                id: a.reviewerUserId,
                username: "reviewer.desai",
                fullName: "S. P. Patel",
                designation: "Senior Metrologist",
                role: { code: "REVIEWER", name: "Technical Reviewer" },
              },
            }));
        },
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
      provenanceNode: {
        findFirst: async (args: any) => {
          const matches = storedProvNodes.filter(
            (n) => n.testSessionId === args.where.testSessionId,
          );
          if (matches.length === 0) return null;
          return matches[matches.length - 1];
        },
        create: async (args: any) => {
          const record = { id: `node-${Date.now()}`, ...args.data };
          storedProvNodes.push(record);
          return record;
        },
      },
      $transaction: async (fn: any) => fn(mockPrisma),
    };

    app = createApp({ db: mockPrisma as unknown as PrismaClient });
  });

  describe("GET /api/v1/review/sessions/:id/audit - Anomaly Detection Engine (Acceptance Target)", () => {
    it("rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
      const res = await request(app).get(
        `/api/v1/review/sessions/${mockCleanSessionId}/audit`,
      );
      assert.equal(res.status, 401);
      assert.equal(res.body.code, "UNAUTHORIZED");
    });

    it("rejects unauthorized role (INSPECTOR) with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get(`/api/v1/review/sessions/${mockCleanSessionId}/audit`)
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.code, "FORBIDDEN");
    });

    it("returns 404 for unknown session ID", async () => {
      const res = await request(app)
        .get(
          "/api/v1/review/sessions/99999999-9999-9999-9999-999999999999/audit",
        )
        .set("Authorization", `Bearer ${reviewerTokens.accessToken}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.error, "NOT_FOUND");
    });

    it("evaluates clean session: reports 0 anomalies with clean audit verdict", async () => {
      const res = await request(app)
        .get(`/api/v1/review/sessions/${mockCleanSessionId}/audit`)
        .set("Authorization", `Bearer ${reviewerTokens.accessToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.testSessionId, mockCleanSessionId);
      assert.equal(res.body.sessionNumber, "SES-2026-CLEAN");

      const audit = res.body.audit;
      assert.equal(audit.hasAnomalies, false);
      assert.equal(audit.totalAnomalies, 0);
      assert.equal(audit.criticalCount, 0);
      assert.equal(audit.flags.length, 0);
      assert.match(audit.summary, /0 anomalies detected/);
    });

    it("flags anomalies in contaminated session: detects non-monotonicity and excessive deltaL > e", async () => {
      const res = await request(app)
        .get(`/api/v1/review/sessions/${mockAnomalySessionId}/audit`)
        .set("Authorization", `Bearer ${reviewerTokens.accessToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.testSessionId, mockAnomalySessionId);

      const audit = res.body.audit;
      assert.equal(audit.hasAnomalies, true);
      assert.ok(audit.totalAnomalies >= 2);

      // Check for ANOMALY_NON_MONOTONIC_INDICATION
      const monoFlag = audit.flags.find(
        (f: any) => f.code === "ANOMALY_NON_MONOTONIC_INDICATION",
      );
      assert.ok(monoFlag);
      assert.equal(monoFlag.severity, "CRITICAL");
      assert.match(monoFlag.message, /Non-monotonic step detected/);

      // Check for ANOMALY_EXCESSIVE_DELTA_L
      const deltaFlag = audit.flags.find(
        (f: any) => f.code === "ANOMALY_EXCESSIVE_DELTA_L",
      );
      assert.ok(deltaFlag);
      assert.match(deltaFlag.message, /exceeds verification scale interval e/);
    });
  });

  describe("POST /api/v1/review/decision - Reviewer Sign-Off Decision", () => {
    it("rejects unauthorized role (INSPECTOR) with 403", async () => {
      const res = await request(app)
        .post("/api/v1/review/decision")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          testSessionId: mockCleanSessionId,
          decision: "APPROVED",
          comments: "Test looks clean.",
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.code, "FORBIDDEN");
    });

    it("records APPROVED decision: transitions session status to COMPLETED and chains provenance node", async () => {
      const res = await request(app)
        .post("/api/v1/review/decision")
        .set("Authorization", `Bearer ${reviewerTokens.accessToken}`)
        .send({
          testSessionId: mockCleanSessionId,
          reviewStage: "SECOND_LEVEL_REVIEW",
          decision: "APPROVED",
          comments:
            "Metrological verification approved. All points comply with OIML R 76-1 Table 6.",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.sessionStatus, "COMPLETED");
      assert.equal(res.body.anomaliesDetected, 0);

      // Verify audit record was created in database
      assert.equal(storedAudits.length, 1);
      assert.equal(storedAudits[0].decision, "APPROVED");
      assert.equal(storedAudits[0].reviewerUserId, mockReviewerId);

      // Verify session was updated to COMPLETED in database
      const session = storedSessions.find((s) => s.id === mockCleanSessionId);
      assert.equal(session.status, "COMPLETED");
      assert.ok(session.completedAt);

      // Verify WELMEC 7.2 provenance node was appended
      assert.equal(storedProvNodes.length, 1);
      assert.equal(storedProvNodes[0].nodeType, "REVIEW_AUDIT");
      assert.ok(storedProvNodes[0].currentNodeHashSha256);
    });

    it("records FLAGGED_FOR_CORRECTION decision: transitions session status to RETURNED_TO_OFFICER and stores flags (TASK-081)", async () => {
      const res = await request(app)
        .post("/api/v1/review/decision")
        .set("Authorization", `Bearer ${reviewerTokens.accessToken}`)
        .send({
          testSessionId: mockAnomalySessionId,
          reviewStage: "SECOND_LEVEL_REVIEW",
          decision: "FLAGGED_FOR_CORRECTION",
          flaggedFormId: "form1",
          comments:
            "Flagged non-monotonic step at 5kg load. Please re-take observations.",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.sessionStatus, "RETURNED_TO_OFFICER");
      assert.ok(res.body.anomaliesDetected >= 2);

      const session = storedSessions.find((s) => s.id === mockAnomalySessionId);
      assert.equal(session.status, "RETURNED_TO_OFFICER");

      // Verify audit record contains flaggedFormId tag
      const audit = storedAudits.find(
        (a) => a.testSessionId === mockAnomalySessionId,
      );
      assert.ok(audit);
      assert.ok(audit.comments.includes("[FLAGGED_CLAUSE: form1]"));
    });

    it("records DIRECTOR_APPROVAL decision: transitions session status to APPROVED_LOCKED (TASK-081)", async () => {
      const res = await request(app)
        .post("/api/v1/review/decision")
        .set("Authorization", `Bearer ${directorTokens.accessToken}`)
        .send({
          testSessionId: mockCleanSessionId,
          reviewStage: "DIRECTOR_APPROVAL",
          decision: "APPROVED",
          comments: "Final statutory approval by Laboratory Director under Section 22.",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.sessionStatus, "APPROVED_LOCKED");

      const session = storedSessions.find((s) => s.id === mockCleanSessionId);
      assert.equal(session.status, "APPROVED_LOCKED");
    });
  });

  describe("GET /api/v1/review/sessions/:id/history - Audit History Trail", () => {
    beforeEach(async () => {
      // Create an audit entry
      await request(app)
        .post("/api/v1/review/decision")
        .set("Authorization", `Bearer ${reviewerTokens.accessToken}`)
        .send({
          testSessionId: mockCleanSessionId,
          decision: "APPROVED",
          comments: "Approved by Senior Metrologist.",
        });
    });

    it("returns audit history for the session with reviewer profiles", async () => {
      const res = await request(app)
        .get(`/api/v1/review/sessions/${mockCleanSessionId}/history`)
        .set("Authorization", `Bearer ${reviewerTokens.accessToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.testSessionId, mockCleanSessionId);
      assert.equal(res.body.count, 1);
      assert.equal(res.body.audits[0].decision, "APPROVED");
      assert.equal(res.body.audits[0].reviewerUser.username, "reviewer.desai");
    });
  });
});
