import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { Prisma } from "@maanak/db";
import {
  generateProvenanceNode,
  GENESIS_PREV_HASH,
  validateSessionProvenanceChain,
} from "@maanak/crypto-provenance";
import { Role, generateTokens } from "./auth/index.js";
import { createApp } from "./app.js";

describe("TASK-046: Public Verification & Offline Sync Routes (/api/v1/verify, /api/v1/sync)", () => {
  let mockPrisma: any;
  let app: any;

  let storedSessions: any[] = [];
  let storedRawObservations: any[] = [];
  let storedCalculationRuns: any[] = [];
  let storedCalculationTraces: any[] = [];
  let storedEnvironmentalLogs: any[] = [];
  let storedReferenceStandards: any[] = [];
  let storedProvenanceNodes: any[] = [];
  let storedDigitalSignatures: any[] = [];
  let storedReports: any[] = [];
  let storedReportVersions: any[] = [];

  const mockLabId = "11111111-2222-3333-4444-555555555555";
  const mockInspectorId = "usr-insp-001";
  const mockDirectorId = "usr-dir-001";
  const mockSessionId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const mockTestPlanItemId = "33333333-3333-3333-3333-333333333333";
  const mockWeightCertId = "44444444-4444-4444-4444-444444444444";

  const inspectorTokens = generateTokens({
    sub: mockInspectorId,
    username: "inspector.patel",
    email: "inspector.patel@rrsl.gov.in",
    role: Role.INSPECTOR,
    laboratoryId: mockLabId,
    permissions: ["observations:create", "sync:push", "sync:pull"],
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
    // 1. Genesis node for session
    const genesisNode = generateProvenanceNode({
      testSessionId: mockSessionId,
      nodeSequence: 0,
      nodeType: "SESSION_INIT",
      previousNodeHashSha256: GENESIS_PREV_HASH,
      payload: {
        sessionNumber: "DEL-2026-0042",
        laboratoryId: mockLabId,
        createdAt: "2026-09-21T08:00:00.000Z",
      },
    });

    storedProvenanceNodes = [
      {
        id: "prov-0",
        ...genesisNode,
      },
    ];

    storedSessions = [
      {
        id: mockSessionId,
        sessionNumber: "DEL-2026-0042",
        status: "IN_PROGRESS",
        syncStatus: "SYNCED",
        laboratoryId: mockLabId,
        rulePackVersionId: "rule-v1",
        laboratory: {
          id: mockLabId,
          code: "RRSL-DEL",
          name: "Regional Reference Standards Laboratory (RRSL), Faridabad",
          addressLine1: "Plot No. 1, Metrology Complex",
          city: "Faridabad",
          state: "Haryana",
          pincode: "121001",
          nablAccreditationNo: "NABL CC-2026-MET-001",
        },
        instrumentUnit: {
          id: "unit-001",
          serialNumber: "SN-2026-990142",
          instrumentModel: {
            id: "model-001",
            modelName: "AW-PRO-15K",
            unitOfMeasure: "kg",
            maxCapacity: new Prisma.Decimal("15.0000"),
            minCapacity: new Prisma.Decimal("0.1000"),
            verificationScaleIntervalE: new Prisma.Decimal("0.0050"),
            actualScaleIntervalD: new Prisma.Decimal("0.0010"),
            scaleDivisionCountN: 3000,
            isMultiInterval: false,
            manufacturer: {
              companyName: "Avery Weigh-Tronix India Ltd.",
            },
            accuracyClass: {
              code: "CLASS_III",
              name: "Class III",
            },
            partialRanges: [],
          },
        },
        testPlan: {
          id: "plan-001",
          title: "Standard OIML R 76-1 Test Plan",
          items: [
            {
              id: mockTestPlanItemId,
              clauseNumber: "A.4.4",
              formNumber: "Form 1",
              title: "Weighing Performance Test",
              executionOrder: 1,
            },
          ],
        },
        environmentalLogs: [],
        rawObservations: [],
        calculationRuns: [],
        digitalSignatures: [],
        reports: [],
      },
    ];

    storedRawObservations = [];
    storedCalculationRuns = [];
    storedCalculationTraces = [];
    storedEnvironmentalLogs = [];
    storedDigitalSignatures = [];
    storedReports = [];
    storedReportVersions = [];

    storedReferenceStandards = [
      {
        id: "ref-std-001",
        laboratoryId: mockLabId,
        identificationCode: "STD-M1-001",
        oimlClass: "M1",
        nominalMassMin: "1.0",
        nominalMassMax: "20.0",
        isActive: true,
        calibrationCertificates: [
          {
            id: mockWeightCertId,
            certificateNumber: "NABL-CAL-2026-9988",
            calibratingAgency: "NPL India",
            expandedUncertaintyU: "0.0005",
            coverageFactorK: "2.0",
            expiryDate: new Date("2027-12-31"),
            isActive: true,
          },
        ],
      },
    ];

    mockPrisma = {
      testSession: {
        findUnique: async (args: any) => {
          const sess = storedSessions.find((s) => s.id === args.where.id);
          if (!sess) return null;
          return {
            ...sess,
            environmentalLogs: storedEnvironmentalLogs.filter(
              (e) => e.testSessionId === sess.id,
            ),
            rawObservations: storedRawObservations.filter(
              (o) => o.testSessionId === sess.id,
            ),
            calculationRuns: storedCalculationRuns.filter(
              (c) => c.testSessionId === sess.id,
            ),
            digitalSignatures: storedDigitalSignatures.filter(
              (d) => d.testSessionId === sess.id,
            ),
            reports: storedReports.filter((r) => r.testSessionId === sess.id),
            provenanceNodes: storedProvenanceNodes
              .filter((p) => p.testSessionId === sess.id)
              .sort((a, b) => a.nodeSequence - b.nodeSequence),
          };
        },
        findFirst: async (args: any) => {
          const orConds = args.where.OR;
          const match = storedSessions.find((s) =>
            orConds.some(
              (cond: any) =>
                (cond.id && s.id === cond.id) ||
                (cond.sessionNumber && s.sessionNumber === cond.sessionNumber),
            ),
          );
          return match || null;
        },
        findMany: async (args: any) => {
          return storedSessions
            .filter(
              (s) =>
                s.laboratoryId === args.where.laboratoryId &&
                args.where.status.in.includes(s.status),
            )
            .map((sess) => ({
              ...sess,
              environmentalLogs: storedEnvironmentalLogs.filter(
                (e) => e.testSessionId === sess.id,
              ),
              rawObservations: storedRawObservations.filter(
                (o) => o.testSessionId === sess.id,
              ),
              provenanceNodes: storedProvenanceNodes
                .filter((p) => p.testSessionId === sess.id)
                .sort((a, b) => b.nodeSequence - a.nodeSequence),
            }));
        },
        update: async (args: any) => {
          const sess = storedSessions.find((s) => s.id === args.where.id);
          if (sess) {
            Object.assign(sess, args.data);
          }
          return sess;
        },
      },
      provenanceNode: {
        findFirst: async (args: any) => {
          if (args.where?.OR) {
            const orConds = args.where.OR;
            return (
              storedProvenanceNodes.find((n) =>
                orConds.some(
                  (cond: any) =>
                    (cond.currentNodeHashSha256 &&
                      n.currentNodeHashSha256 === cond.currentNodeHashSha256) ||
                    (cond.payloadHashSha256 &&
                      n.payloadHashSha256 === cond.payloadHashSha256),
                ),
              ) || null
            );
          }
          const nodes = storedProvenanceNodes.filter(
            (n) => n.testSessionId === args.where.testSessionId,
          );
          return nodes.length > 0 ? nodes[nodes.length - 1] : null;
        },
        create: async (args: any) => {
          const created = {
            id: `prov-${storedProvenanceNodes.length + 1}`,
            ...args.data,
          };
          storedProvenanceNodes.push(created);
          return created;
        },
      },
      digitalSignature: {
        findFirst: async (args: any) => {
          return (
            storedDigitalSignatures.find(
              (d) => d.pdfBinaryHashSha256 === args.where.pdfBinaryHashSha256,
            ) || null
          );
        },
      },
      reportVersion: {
        findFirst: async (args: any) => {
          const ver = storedReportVersions.find(
            (v) => v.fileHashSha256 === args.where.fileHashSha256,
          );
          if (!ver) return null;
          const report = storedReports.find((r) => r.id === ver.reportId);
          return { ...ver, report };
        },
      },
      referenceStandard: {
        findMany: async (args: any) => {
          return storedReferenceStandards.filter(
            (r) =>
              r.laboratoryId === args.where.laboratoryId &&
              r.isActive === args.where.isActive,
          );
        },
      },
      rawObservation: {
        findFirst: async (args: any) => {
          return (
            storedRawObservations.find(
              (o) =>
                o.testSessionId === args.where.testSessionId &&
                ((args.where.localId && o.localId === args.where.localId) ||
                  (o.testPlanItemId === args.where.testPlanItemId &&
                    o.sequenceNumber === args.where.sequenceNumber)),
            ) || null
          );
        },
        create: async (args: any) => {
          const created = {
            id: `obs-${storedRawObservations.length + 1}`,
            ...args.data,
          };
          storedRawObservations.push(created);
          return created;
        },
      },
      observationWeightUsed: {
        create: async (args: any) => args.data,
      },
      calculationRun: {
        create: async (args: any) => {
          const created = {
            id: `calc-${storedCalculationRuns.length + 1}`,
            ...args.data,
          };
          storedCalculationRuns.push(created);
          return created;
        },
        update: async (args: any) => {
          const run = storedCalculationRuns.find((c) => c.id === args.where.id);
          if (run) Object.assign(run, args.data);
          return run;
        },
      },
      calculationTraceItem: {
        create: async (args: any) => {
          const created = {
            id: `trace-${storedCalculationTraces.length + 1}`,
            ...args.data,
          };
          storedCalculationTraces.push(created);
          return created;
        },
      },
      sessionEnvironmentalLog: {
        create: async (args: any) => {
          const created = {
            id: `env-${storedEnvironmentalLogs.length + 1}`,
            ...args.data,
          };
          storedEnvironmentalLogs.push(created);
          return created;
        },
      },
      $transaction: async (fn: any) => fn(mockPrisma),
    };

    app = createApp({
      db: mockPrisma,
    });
  });

  // -------------------------------------------------------------------------
  // 1. GET /api/v1/sync/pull
  // -------------------------------------------------------------------------
  it("should enforce authentication on sync/pull", async () => {
    const res = await request(app).get("/api/v1/sync/pull");
    assert.equal(res.status, 401);
  });

  it("should pull active sessions, test plans, and reference standards for offline caching", async () => {
    const res = await request(app)
      .get("/api/v1/sync/pull")
      .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.sessions);
    assert.equal(res.body.sessions.length, 1);
    assert.equal(res.body.sessions[0].id, mockSessionId);
    assert.equal(res.body.sessions[0].sessionNumber, "DEL-2026-0042");
    assert.ok(res.body.sessions[0].testPlan);
    assert.equal(res.body.sessions[0].testPlan.items.length, 1);
    assert.ok(res.body.referenceStandards);
    assert.equal(res.body.referenceStandards.length, 1);
    assert.equal(res.body.referenceStandards[0].identificationCode, "STD-M1-001");
    assert.ok(res.body.serverTimestamp);
  });

  // -------------------------------------------------------------------------
  // 2. POST /api/v1/sync/push
  // -------------------------------------------------------------------------
  it("should enforce authentication & inspector role on sync/push", async () => {
    const unauthRes = await request(app)
      .post("/api/v1/sync/push")
      .send({ sessions: [] });
    assert.equal(unauthRes.status, 401);

    const reviewerRes = await request(app)
      .post("/api/v1/sync/push")
      .set("Authorization", `Bearer ${reviewerTokens.accessToken}`)
      .send({ sessions: [] });
    assert.equal(reviewerRes.status, 403);
  });

  it("should ingest batch observations, compute real-time metrological math, and extend hash chain", async () => {
    const batchPayload = {
      deviceId: "bench-tablet-04",
      sessions: [
        {
          sessionId: mockSessionId,
          observations: [
            {
              localId: "local-obs-1",
              testPlanItemId: mockTestPlanItemId,
              testClause: "A.4.4",
              sequenceNumber: 1,
              loadRunDirection: "ASCENDING",
              targetLoadL: "0.000",
              displayedIndicationI: "0.000",
              changeoverWeightDl: "0.0025",
              zeroIndicationI0: "0.000",
            },
            {
              localId: "local-obs-2",
              testPlanItemId: mockTestPlanItemId,
              testClause: "A.4.4",
              sequenceNumber: 2,
              loadRunDirection: "ASCENDING",
              targetLoadL: "2.500",
              displayedIndicationI: "2.500",
              changeoverWeightDl: "0.0020",
              zeroIndicationI0: "0.000",
              weightsUsed: [
                {
                  calibrationCertificateId: mockWeightCertId,
                  weightMassApplied: "2.500",
                },
              ],
            },
            {
              localId: "local-obs-3",
              testPlanItemId: mockTestPlanItemId,
              testClause: "A.4.4",
              sequenceNumber: 3,
              loadRunDirection: "ASCENDING",
              targetLoadL: "10.000",
              displayedIndicationI: "10.000",
              changeoverWeightDl: "0.0015",
              zeroIndicationI0: "0.000",
            },
          ],
          environmentalLogs: [
            {
              temperatureC: "22.6",
              relativeHumidityPercent: "53.5",
              barometricPressureHpa: "1013.1",
            },
          ],
        },
      ],
    };

    const res = await request(app)
      .post("/api/v1/sync/push")
      .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
      .send(batchPayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.syncedSessions.length, 1);
    assert.equal(res.body.syncedSessions[0].observationsIngested, 3);
    assert.equal(res.body.syncedSessions[0].environmentalLogsIngested, 1);
    assert.equal(res.body.syncedSessions[0].provenanceSequence, 1);
    assert.ok(res.body.syncedSessions[0].latestProvenanceHash);

    // Verify raw observations and traces created
    assert.equal(storedRawObservations.length, 3);
    assert.equal(storedCalculationTraces.length, 3);
    assert.equal(storedEnvironmentalLogs.length, 1);

    // Verify WELMEC 7.2 provenance chain validity
    const sessionNodes = storedProvenanceNodes.filter(
      (n) => n.testSessionId === mockSessionId,
    );
    assert.equal(sessionNodes.length, 2); // genesis + batch sync node
    const chainValidation = validateSessionProvenanceChain(sessionNodes);
    assert.equal(chainValidation.valid, true);
    assert.equal(chainValidation.totalNodesChecked, 2);
  });

  // -------------------------------------------------------------------------
  // 3. GET /api/v1/verify/:hash
  // -------------------------------------------------------------------------
  it("should return 404 for unknown hash or identifier", async () => {
    const res = await request(app).get("/api/v1/verify/unknown-hash-12345");
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "NOT_FOUND");
  });

  it("should verify authentic session via genesis or node hash without authentication (public route)", async () => {
    const genesisHash = storedProvenanceNodes[0].currentNodeHashSha256;

    const res = await request(app).get(`/api/v1/verify/${genesisHash}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.sessionNumber, "DEL-2026-0042");
    assert.equal(res.body.laboratoryName, "Regional Reference Standards Laboratory (RRSL), Faridabad");
    assert.equal(res.body.instrumentModel, "AW-PRO-15K");
    assert.equal(res.body.manufacturer, "Avery Weigh-Tronix India Ltd.");
    assert.equal(res.body.tamperDetected, false);
    assert.equal(res.body.chainValidation.valid, true);
  });

  it("should detect cryptographic tampering in provenance chain (TC-05)", async () => {
    // 1. Add a second node
    const secondNode = generateProvenanceNode({
      testSessionId: mockSessionId,
      nodeSequence: 1,
      nodeType: "OBSERVATION_LOG",
      previousNodeHashSha256: storedProvenanceNodes[0].currentNodeHashSha256,
      payload: { count: 5 },
    });
    storedProvenanceNodes.push({
      id: "prov-1",
      ...secondNode,
    });

    // 2. Add a third node with TAMPERED previous hash (broken link!)
    storedProvenanceNodes.push({
      id: "prov-2",
      testSessionId: mockSessionId,
      nodeSequence: 2,
      nodeType: "REPORT_SIGNED",
      previousNodeHashSha256: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", // TAMPERED!
      payloadHashSha256: "3333333333333333333333333333333333333333333333333333333333333333",
      currentNodeHashSha256: "4444444444444444444444444444444444444444444444444444444444444444",
    });

    // 3. Verify public endpoint flags the tamper
    const res = await request(app).get(`/api/v1/verify/DEL-2026-0042`);
    assert.equal(res.status, 200);
    assert.equal(res.body.tamperDetected, true);
    assert.equal(res.body.valid, false);
    assert.equal(res.body.chainValidation.valid, false);
    assert.equal(res.body.chainValidation.failureReason, "HASH_LINK_MISMATCH");
  });
});
