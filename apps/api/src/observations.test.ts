import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { PrismaClient, Prisma } from "@maanak/db";
import { Role, generateTokens } from "./auth/index.js";
import { createApp } from "./app.js";

describe("TASK-043: Raw Observation Entry & Real-Time Math API (/api/v1/observations)", () => {
  let mockPrisma: any;
  let app: any;

  let storedSessions: any[] = [];
  let storedInstruments: any[] = [];
  let storedUnits: any[] = [];
  let storedPlans: any[] = [];
  let storedObservations: any[] = [];
  let storedTraceItems: any[] = [];
  let storedCalcRuns: any[] = [];
  let storedProvNodes: any[] = [];
  let storedWeightsUsed: any[] = [];

  const mockLabId = "11111111-2222-3333-4444-555555555555";
  const mockOfficerId = "usr-insp-001";
  const mockSessionId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const mockLockedSessionId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const mockApprovedSessionId = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
  const mockMultiSessionId = "dddddddd-dddd-dddd-dddd-dddddddddddd";
  const mockUnitId = "44444444-4444-4444-4444-444444444444";
  const mockCertId = "cccccccc-cccc-cccc-cccc-cccccccccccc";

  // Tokens for RBAC testing
  const inspectorTokens = generateTokens({
    sub: mockOfficerId,
    username: "inspector.patel",
    email: "inspector.patel@rrsl.gov.in",
    role: Role.INSPECTOR,
    laboratoryId: mockLabId,
    permissions: ["observations:create", "observations:read"],
  });

  const reviewerTokens = generateTokens({
    sub: "usr-rev-001",
    username: "reviewer.desai",
    email: "reviewer.desai@rrsl.gov.in",
    role: Role.REVIEWER,
    laboratoryId: mockLabId,
    permissions: ["sessions:review"],
  });

  beforeEach(() => {
    storedInstruments = [
      {
        id: "33333333-3333-3333-3333-333333333333",
        modelName: "DS-215 Bench Scale",
        patternDesignation: "IND/09/2024/481",
        accuracyClass: { code: "III" },
        maxCapacity: "15.00000000",
        minCapacity: "0.10000000",
        verificationScaleIntervalE: "0.00500000", // 5g
        actualScaleIntervalD: "0.00500000",
        scaleDivisionCountN: 3000,
        unitOfMeasure: "kg",
        isMultiInterval: false,
        partialRanges: [],
      },
      {
        id: "multi-model-001",
        modelName: "Multi-Range Electronic Balance",
        patternDesignation: "IND/09/2024/MULTI",
        accuracyClass: { code: "III" },
        maxCapacity: "15.00000000",
        minCapacity: "0.04000000",
        verificationScaleIntervalE: "0.00200000",
        actualScaleIntervalD: "0.00200000",
        scaleDivisionCountN: 5000,
        unitOfMeasure: "kg",
        isMultiInterval: true,
        partialRanges: [
          {
            rangeIndex: 1,
            maxCapacityI: "6.00000000",
            minCapacityI: "0.04000000",
            verificationScaleIntervalEI: "0.00200000", // e1 = 2g
            actualScaleIntervalDI: "0.00200000",
            scaleDivisionCountNI: 3000,
          },
          {
            rangeIndex: 2,
            maxCapacityI: "15.00000000",
            minCapacityI: "0.10000000",
            verificationScaleIntervalEI: "0.00500000", // e2 = 5g
            actualScaleIntervalDI: "0.00500000",
            scaleDivisionCountNI: 3000,
          },
        ],
      },
    ];

    storedUnits = [
      {
        id: mockUnitId,
        instrumentModelId: storedInstruments[0].id,
        serialNumber: "SN-2026-98765",
        instrumentModel: storedInstruments[0],
      },
      {
        id: "multi-unit-001",
        instrumentModelId: storedInstruments[1].id,
        serialNumber: "SN-MULTI-001",
        instrumentModel: storedInstruments[1],
      },
    ];

    storedPlans = [
      {
        id: "plan-001",
        title: "Official OIML R 76 Test Plan",
        items: [
          {
            id: "item-form1-id",
            clauseNumber: "A.4.4",
            formNumber: "Form 1",
            title: "Weighing Performance",
          },
        ],
      },
    ];

    storedSessions = [
      {
        id: mockSessionId,
        sessionNumber: "SES-2026-001",
        laboratoryId: mockLabId,
        instrumentUnitId: mockUnitId,
        testPlanId: storedPlans[0].id,
        rulePackVersionId: "rp-ver-001",
        testingOfficerId: mockOfficerId,
        status: "DRAFT",
        instrumentUnit: storedUnits[0],
        testPlan: storedPlans[0],
      },
      {
        id: mockLockedSessionId,
        sessionNumber: "SES-2026-LOCKED",
        laboratoryId: mockLabId,
        instrumentUnitId: mockUnitId,
        testPlanId: storedPlans[0].id,
        rulePackVersionId: "rp-ver-001",
        testingOfficerId: mockOfficerId,
        status: "UNDER_REVIEW",
        instrumentUnit: storedUnits[0],
        testPlan: storedPlans[0],
      },
      {
        id: mockMultiSessionId,
        sessionNumber: "SES-2026-MULTI",
        laboratoryId: mockLabId,
        instrumentUnitId: "multi-unit-001",
        testPlanId: storedPlans[0].id,
        rulePackVersionId: "rp-ver-001",
        testingOfficerId: mockOfficerId,
        status: "IN_PROGRESS",
        instrumentUnit: storedUnits[1],
        testPlan: storedPlans[0],
      },
      {
        id: mockApprovedSessionId,
        sessionNumber: "SES-2026-APPROVED-LOCKED",
        laboratoryId: mockLabId,
        instrumentUnitId: mockUnitId,
        testPlanId: storedPlans[0].id,
        rulePackVersionId: "rp-ver-001",
        testingOfficerId: mockOfficerId,
        status: "APPROVED_LOCKED",
        instrumentUnit: storedUnits[0],
        testPlan: storedPlans[0],
      },
    ];

    storedObservations = [];
    storedTraceItems = [];
    storedCalcRuns = [];
    storedProvNodes = [];
    storedWeightsUsed = [];

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
      testPlanItem: {
        create: async (args: any) => {
          const item = { id: `item-${Date.now()}`, ...args.data };
          storedPlans[0].items.push(item);
          return item;
        },
      },
      rawObservation: {
        findFirst: async (args: any) => {
          const matches = storedObservations.filter(
            (o) =>
              o.testSessionId === args.where.testSessionId &&
              o.testPlanItemId === args.where.testPlanItemId,
          );
          if (matches.length === 0) return null;
          return matches[matches.length - 1];
        },
        findMany: async (args: any) => {
          let list = storedObservations.filter(
            (o) => o.testSessionId === args.where.testSessionId,
          );
          if (args.where.testClause) {
            list = list.filter((o) => o.testClause === args.where.testClause);
          }
          return list.map((o) => ({
            ...o,
            weightsUsed: storedWeightsUsed.filter(
              (w) => w.rawObservationId === o.id,
            ),
            calculationTraceItems: storedTraceItems.filter(
              (t) => t.rawObservationId === o.id,
            ),
          }));
        },
        create: async (args: any) => {
          const record = {
            id: `obs-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            ...args.data,
            createdAt: new Date(),
          };
          storedObservations.push(record);
          return record;
        },
        findUnique: async (args: any) => {
          const obs = storedObservations.find((o) => o.id === args.where.id);
          if (!obs) return null;
          const session = storedSessions.find((s) => s.id === obs.testSessionId);
          return {
            ...obs,
            testSession: session,
          };
        },
        update: async (args: any) => {
          const obs = storedObservations.find((o) => o.id === args.where.id);
          if (!obs) throw new Error("Observation not found");
          Object.assign(obs, args.data);
          return obs;
        },
        delete: async (args: any) => {
          const idx = storedObservations.findIndex((o) => o.id === args.where.id);
          if (idx === -1) throw new Error("Observation not found");
          const [deleted] = storedObservations.splice(idx, 1);
          return deleted;
        },
      },
      observationWeightUsed: {
        createMany: async (args: any) => {
          for (const item of args.data) {
            storedWeightsUsed.push({ id: `wused-${Date.now()}`, ...item });
          }
          return { count: args.data.length };
        },
        deleteMany: async (args: any) => {
          storedWeightsUsed = storedWeightsUsed.filter((w) => w.rawObservationId !== args.where.rawObservationId);
          return { count: 1 };
        },
      },
      calculationRun: {
        findFirst: async (args: any) => {
          const matches = storedCalcRuns.filter(
            (r) => r.testSessionId === args.where.testSessionId,
          );
          if (matches.length === 0) return null;
          return matches[matches.length - 1];
        },
        create: async (args: any) => {
          const record = {
            id: `run-${Date.now()}`,
            ...args.data,
            executedAt: new Date(),
          };
          storedCalcRuns.push(record);
          return record;
        },
        update: async (args: any) => {
          const run = storedCalcRuns.find((r) => r.id === args.where.id);
          if (!run) throw new Error("Run not found");
          Object.assign(run, args.data);
          return run;
        },
      },
      calculationTraceItem: {
        create: async (args: any) => {
          const record = {
            id: `trace-${Date.now()}`,
            ...args.data,
            createdAt: new Date(),
          };
          storedTraceItems.push(record);
          return record;
        },
        deleteMany: async (args: any) => {
          storedTraceItems = storedTraceItems.filter((t) => t.rawObservationId !== args.where.rawObservationId);
          return { count: 1 };
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

  describe("POST /api/v1/observations - Real-Time Metrology Math & Storage", () => {
    it("rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
      const res = await request(app).post("/api/v1/observations").send({
        testSessionId: mockSessionId,
        targetLoadL: "2.5",
        displayedIndicationI: "2.5",
        changeoverWeightDl: "0.002",
      });

      assert.equal(res.status, 401);
      assert.equal(res.body.code, "UNAUTHORIZED");
    });

    it("rejects unauthorized role (REVIEWER) with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .post("/api/v1/observations")
        .set("Authorization", `Bearer ${reviewerTokens.accessToken}`)
        .send({
          testSessionId: mockSessionId,
          targetLoadL: "2.5",
          displayedIndicationI: "2.5",
          changeoverWeightDl: "0.002",
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.code, "FORBIDDEN");
    });

    it("returns 404 when test session does not exist", async () => {
      const res = await request(app)
        .post("/api/v1/observations")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          testSessionId: "99999999-9999-9999-9999-999999999999",
          targetLoadL: "2.5",
          displayedIndicationI: "2.5",
          changeoverWeightDl: "0.002",
        });

      assert.equal(res.status, 404);
      assert.equal(res.body.error, "NOT_FOUND");
    });

    it("rejects observation recording on locked session with 400 SESSION_LOCKED", async () => {
      const res = await request(app)
        .post("/api/v1/observations")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          testSessionId: mockLockedSessionId,
          targetLoadL: "2.5",
          displayedIndicationI: "2.5",
          changeoverWeightDl: "0.002",
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "SESSION_LOCKED");
    });

    it("evaluates TC-01 500e load point (L=2.5kg, I=2.5kg, dL=0.0020kg): computes P, E, Ec, MPE and PASS (Acceptance Target)", async () => {
      // For Class III 15kg scale (e=0.005 kg):
      // P = I + 0.5e - dL = 2.5 + 0.0025 - 0.0020 = 2.5005 kg
      // Raw error E = P - L = 2.5005 - 2.5000 = +0.0005 kg (+0.5 g)
      // Zero error E0 = 0
      // Ec = E - E0 = +0.0005 kg
      // MPE at 500e (500 * 0.005 = 2.5 kg) for Class III = +/-0.5e = +/-0.0025 kg
      // |Ec| (0.0005) <= MPE (0.0025) -> PASS
      const res = await request(app)
        .post("/api/v1/observations")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          testSessionId: mockSessionId,
          targetLoadL: "2.500",
          displayedIndicationI: "2.500",
          changeoverWeightDl: "0.0020",
          loadRunDirection: "ASCENDING",
          testClause: "A.4.4",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.message, "Observation recorded successfully.");

      const calc = res.body.calculation;
      assert.equal(calc.preRoundingIndicationP, "2.5005");
      assert.equal(calc.rawErrorE, "0.0005");
      assert.equal(calc.zeroErrorE0, "0");
      assert.equal(calc.correctedIntrinsicErrorEc, "0.0005");
      assert.equal(calc.mpeLimitApplied, "0.0025");
      assert.equal(calc.complianceStatus, "PASS");
      assert.equal(calc.pass, true);
      assert.ok(calc.derivationTree.length > 5);

      // Verify provenance chaining
      assert.ok(res.body.provenance);
      assert.equal(res.body.provenance.nodeSequence, 0); // Genesis sequence
      assert.equal(res.body.provenance.previousHash, "0".repeat(64));
      assert.ok(res.body.provenance.currentHash.length === 64);

      // Verify session automatically transitioned to IN_PROGRESS from DRAFT
      const session = storedSessions.find((s) => s.id === mockSessionId);
      assert.equal(session.status, "IN_PROGRESS");
    });

    it("evaluates out-of-spec observation and correctly flags FAIL with exact MPE", async () => {
      // Intentionally large drift: I = 2.505, dL = 0.0001 -> P = 2.505 + 0.0025 - 0.0001 = 2.5074
      // E = 2.5074 - 2.5 = 0.0074 kg > MPE 0.0025 kg -> FAIL
      const res = await request(app)
        .post("/api/v1/observations")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          testSessionId: mockSessionId,
          targetLoadL: "2.500",
          displayedIndicationI: "2.505",
          changeoverWeightDl: "0.0001",
          loadRunDirection: "ASCENDING",
          testClause: "A.4.4",
        });

      assert.equal(res.status, 201);
      const calc = res.body.calculation;
      assert.equal(calc.complianceStatus, "FAIL");
      assert.equal(calc.pass, false);
      assert.equal(calc.preRoundingIndicationP, "2.5074");
      assert.equal(calc.correctedIntrinsicErrorEc, "0.0074");
      assert.equal(calc.mpeLimitApplied, "0.0025");
    });

    it("evaluates multi-interval scale: dynamically switches active e from e1 (2g) to e2 (5g) when crossing range boundary", async () => {
      // Range 1: 0 <= L <= 6 kg, e1 = 0.002 kg
      // At L = 2.0 kg (Range 1): active e = 0.002 kg, 0.5e = 0.0010 kg
      const res1 = await request(app)
        .post("/api/v1/observations")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          testSessionId: mockMultiSessionId,
          targetLoadL: "2.000",
          displayedIndicationI: "2.000",
          changeoverWeightDl: "0.0010", // dL = 0.0010
          loadRunDirection: "ASCENDING",
        });

      assert.equal(res1.status, 201);
      // P = 2.0 + 0.0010 - 0.0010 = 2.0000
      assert.equal(res1.body.calculation.preRoundingIndicationP, "2");
      assert.equal(res1.body.calculation.rawErrorE, "0");

      // Range 2: 6 < L <= 15 kg, e2 = 0.005 kg
      // At L = 10.0 kg (Range 2): active e = 0.005 kg, 0.5e = 0.0025 kg
      const res2 = await request(app)
        .post("/api/v1/observations")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          testSessionId: mockMultiSessionId,
          targetLoadL: "10.000",
          displayedIndicationI: "10.000",
          changeoverWeightDl: "0.0025", // dL = 0.0025
          loadRunDirection: "ASCENDING",
        });

      assert.equal(res2.status, 201);
      // P = 10.0 + 0.0025 - 0.0025 = 10.0000
      assert.equal(res2.body.calculation.preRoundingIndicationP, "10");
      assert.equal(res2.body.calculation.rawErrorE, "0");
      // MPE for 10kg in Range 2 (2000 * 0.005 = 10 kg -> 2000e bracket) = +/-1.0e = 0.005 kg
      assert.equal(res2.body.calculation.mpeLimitApplied, "0.005");
    });

    it("chains cryptographic provenance nodes deterministically across sequential observations", async () => {
      // First observation
      const res1 = await request(app)
        .post("/api/v1/observations")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          testSessionId: mockSessionId,
          targetLoadL: "2.5",
          displayedIndicationI: "2.5",
          changeoverWeightDl: "0.0025",
        });

      const hash1 = res1.body.provenance.currentHash;

      // Second observation
      const res2 = await request(app)
        .post("/api/v1/observations")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          testSessionId: mockSessionId,
          targetLoadL: "10.0",
          displayedIndicationI: "10.0",
          changeoverWeightDl: "0.0025",
        });

      assert.equal(res2.body.provenance.nodeSequence, 1);
      assert.equal(res2.body.provenance.previousHash, hash1);
      assert.notEqual(res2.body.provenance.currentHash, hash1);
    });

    it("records reference weights applied with calibration certificates", async () => {
      const res = await request(app)
        .post("/api/v1/observations")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          testSessionId: mockSessionId,
          targetLoadL: "2.5",
          displayedIndicationI: "2.5",
          changeoverWeightDl: "0.0025",
          weightsUsed: [
            {
              calibrationCertificateId: mockCertId,
              weightMassApplied: "2.000",
            },
            {
              calibrationCertificateId: mockCertId,
              weightMassApplied: "0.500",
            },
          ],
        });

      assert.equal(res.status, 201);
      assert.equal(storedWeightsUsed.length, 2);
    });
  });

  describe("GET /api/v1/observations/session/:sessionId - List Observations", () => {
    beforeEach(async () => {
      // Seed 2 observations
      await request(app)
        .post("/api/v1/observations")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          testSessionId: mockSessionId,
          targetLoadL: "2.5",
          displayedIndicationI: "2.5",
          changeoverWeightDl: "0.0020",
          testClause: "A.4.4",
        });

      await request(app)
        .post("/api/v1/observations")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          testSessionId: mockSessionId,
          targetLoadL: "10.0",
          displayedIndicationI: "10.0",
          changeoverWeightDl: "0.0015",
          testClause: "A.4.4",
        });
    });

    it("rejects unauthenticated requests with 401", async () => {
      const res = await request(app).get(
        `/api/v1/observations/session/${mockSessionId}`,
      );
      assert.equal(res.status, 401);
    });

    it("returns list of observations for the given session", async () => {
      const res = await request(app)
        .get(`/api/v1/observations/session/${mockSessionId}`)
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.testSessionId, mockSessionId);
      assert.equal(res.body.count, 2);
      assert.equal(res.body.observations.length, 2);
      assert.equal(res.body.observations[0].sequenceNumber, 1);
      assert.equal(res.body.observations[1].sequenceNumber, 2);
    });

    it("filters observations by testClause query parameter", async () => {
      const res = await request(app)
        .get(`/api/v1/observations/session/${mockSessionId}?testClause=A.4.4`)
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.count, 2);

      const noMatch = await request(app)
        .get(`/api/v1/observations/session/${mockSessionId}?testClause=A.4.7`)
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.equal(noMatch.status, 200);
      assert.equal(noMatch.body.count, 0);
    });
  });

  describe("TASK-082: WORM Immutability Lock on APPROVED_LOCKED Observations", () => {
    it("POST /api/v1/observations rejects observation creation on APPROVED_LOCKED session with 403 SESSION_IMMUTABLE_LOCKED", async () => {
      const res = await request(app)
        .post("/api/v1/observations")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          testSessionId: mockApprovedSessionId,
          targetLoadL: "2.5",
          displayedIndicationI: "2.5",
          changeoverWeightDl: "0.002",
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.error, "SESSION_IMMUTABLE_LOCKED");
      assert.ok(res.body.message.includes("statutorily APPROVED_LOCKED (WORM)"));
    });

    it("DELETE /api/v1/observations/:id rejects deletion of observation on APPROVED_LOCKED session with 403 SESSION_IMMUTABLE_LOCKED", async () => {
      // First create observation in storedObservations belonging to approved session
      const obsId = "obs-locked-1";
      storedObservations.push({
        id: obsId,
        testSessionId: mockApprovedSessionId,
        testPlanItemId: storedPlans[0].items[0].id,
        sequenceNumber: 1,
        testClause: "A.4.4",
        loadRunDirection: "ASCENDING",
        targetLoadL: new Prisma.Decimal("2.5"),
        displayedIndicationI: new Prisma.Decimal("2.5"),
        changeoverWeightDl: new Prisma.Decimal("0.0"),
        zeroIndicationI0: new Prisma.Decimal("0.0"),
        recordedAt: new Date(),
      });

      const res = await request(app)
        .delete(`/api/v1/observations/${obsId}`)
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.error, "SESSION_IMMUTABLE_LOCKED");
      assert.ok(res.body.message.includes("statutorily APPROVED_LOCKED (WORM)"));
    });

    it("PATCH /api/v1/observations/:id rejects modification of observation on APPROVED_LOCKED session with 403 SESSION_IMMUTABLE_LOCKED", async () => {
      const obsId = "obs-locked-2";
      storedObservations.push({
        id: obsId,
        testSessionId: mockApprovedSessionId,
        testPlanItemId: storedPlans[0].items[0].id,
        sequenceNumber: 2,
        testClause: "A.4.4",
        loadRunDirection: "ASCENDING",
        targetLoadL: new Prisma.Decimal("5.0"),
        displayedIndicationI: new Prisma.Decimal("5.0"),
        changeoverWeightDl: new Prisma.Decimal("0.0"),
        zeroIndicationI0: new Prisma.Decimal("0.0"),
        recordedAt: new Date(),
      });

      const res = await request(app)
        .patch(`/api/v1/observations/${obsId}`)
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({ displayedIndicationI: "5.005" });

      assert.equal(res.status, 403);
      assert.equal(res.body.error, "SESSION_IMMUTABLE_LOCKED");
      assert.ok(res.body.message.includes("statutorily APPROVED_LOCKED (WORM)"));
    });

    it("DELETE /api/v1/observations/:id succeeds on active DRAFT session", async () => {
      const obsId = "obs-active-draft";
      storedObservations.push({
        id: obsId,
        testSessionId: mockSessionId,
        testPlanItemId: storedPlans[0].items[0].id,
        sequenceNumber: 99,
        testClause: "A.4.4",
        loadRunDirection: "ASCENDING",
        targetLoadL: new Prisma.Decimal("1.0"),
        displayedIndicationI: new Prisma.Decimal("1.0"),
        changeoverWeightDl: new Prisma.Decimal("0.0"),
        zeroIndicationI0: new Prisma.Decimal("0.0"),
        recordedAt: new Date(),
      });

      const res = await request(app)
        .delete(`/api/v1/observations/${obsId}`)
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.deletedId, obsId);
    });
  });
});
