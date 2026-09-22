import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import {
  generateProvenanceNode,
  GENESIS_PREV_HASH,
  validateSessionProvenanceChain,
  verifyObservationTamper,
  ProvenanceNodeInput,
} from "@maanak/crypto-provenance";
import { createApp } from "../../apps/api/src/app.js";
import { Role, generateTokens } from "../../apps/api/src/auth/index.js";

describe("TASK-063: Ground Truth Verification TC-05: WELMEC 7.2 Database Tampering Audit", () => {
  const mockLabId = "11111111-2222-3333-4444-555555555555";
  const mockOfficerId = "usr-insp-005";
  const mockSessionId = "55555555-aaaa-bbbb-cccc-999999999999";

  const inspectorTokens = generateTokens({
    sub: mockOfficerId,
    username: "inspector.singh",
    email: "inspector.singh@rrsl.gov.in",
    role: Role.INSPECTOR,
    laboratoryId: mockLabId,
    permissions: ["sessions:create", "observations:create", "reports:generate"],
  });

  describe("1. WELMEC 7.2 Cryptographic Chain Generation & Intact Verification", () => {
    test("generates and verifies intact 3-point Form 1 weighing sequence without tampering", () => {
      // Step 0: Zero load
      const obs0Payload = {
        testClause: "A.4.4",
        loadRunDirection: "ASCENDING",
        targetLoadL: "0.00000000",
        displayedIndicationI: "0.00000000",
        changeoverWeightDl: "0.00250000",
      };
      const node0 = generateProvenanceNode({
        id: "node-seq-0",
        testSessionId: mockSessionId,
        nodeSequence: 0,
        nodeType: "OBSERVATION_LOG",
        previousNodeHashSha256: GENESIS_PREV_HASH,
        payload: obs0Payload,
      });

      // Step 1: 10.000 kg load (Original indication: 10.000 kg)
      const obs1PayloadOriginal = {
        testClause: "A.4.4",
        loadRunDirection: "ASCENDING",
        targetLoadL: "10.00000000",
        displayedIndicationI: "10.00000000",
        changeoverWeightDl: "0.00150000",
      };
      const node1 = generateProvenanceNode({
        id: "node-seq-1",
        testSessionId: mockSessionId,
        nodeSequence: 1,
        nodeType: "OBSERVATION_LOG",
        previousNodeHashSha256: node0.currentNodeHashSha256,
        payload: obs1PayloadOriginal,
      });

      // Step 2: 15.000 kg load (Max)
      const obs2Payload = {
        testClause: "A.4.4",
        loadRunDirection: "ASCENDING",
        targetLoadL: "15.00000000",
        displayedIndicationI: "15.00000000",
        changeoverWeightDl: "0.00100000",
      };
      const node2 = generateProvenanceNode({
        id: "node-seq-2",
        testSessionId: mockSessionId,
        nodeSequence: 2,
        nodeType: "OBSERVATION_LOG",
        previousNodeHashSha256: node1.currentNodeHashSha256,
        payload: obs2Payload,
      });

      const intactChain: ProvenanceNodeInput[] = [
        { ...node0, payload: obs0Payload },
        { ...node1, payload: obs1PayloadOriginal },
        { ...node2, payload: obs2Payload },
      ];

      const validation = validateSessionProvenanceChain(intactChain);

      assert.strictEqual(validation.valid, true);
      assert.strictEqual(validation.totalNodesChecked, 3);
      assert.strictEqual(validation.failureReason, undefined);
      assert.strictEqual(validation.brokenAtIndex, undefined);
    });
  });

  describe("2. TC-05 Ground Truth Acceptance: Direct SQL Modification Detection (I = 10.000 kg -> 10.005 kg)", () => {
    test("detects unauthorized SQL modification of raw observation indication and pinpoints corrupted node", () => {
      // 1. Construct genesis and intact nodes
      const obs0Payload = {
        testClause: "A.4.4",
        loadRunDirection: "ASCENDING",
        targetLoadL: "0.00000000",
        displayedIndicationI: "0.00000000",
      };
      const node0 = generateProvenanceNode({
        id: "node-uuid-0",
        testSessionId: mockSessionId,
        nodeSequence: 0,
        nodeType: "OBSERVATION_LOG",
        previousNodeHashSha256: GENESIS_PREV_HASH,
        payload: obs0Payload,
      });

      const obs1PayloadOriginal = {
        testClause: "A.4.4",
        loadRunDirection: "ASCENDING",
        targetLoadL: "10.00000000",
        displayedIndicationI: "10.00000000", // Original: 10.000 kg
      };
      const node1 = generateProvenanceNode({
        id: "node-uuid-1",
        testSessionId: mockSessionId,
        nodeSequence: 1,
        nodeType: "OBSERVATION_LOG",
        previousNodeHashSha256: node0.currentNodeHashSha256,
        payload: obs1PayloadOriginal,
      });

      const obs2Payload = {
        testClause: "A.4.4",
        loadRunDirection: "ASCENDING",
        targetLoadL: "15.00000000",
        displayedIndicationI: "15.00000000",
      };
      const node2 = generateProvenanceNode({
        id: "node-uuid-2",
        testSessionId: mockSessionId,
        nodeSequence: 2,
        nodeType: "OBSERVATION_LOG",
        previousNodeHashSha256: node1.currentNodeHashSha256,
        payload: obs2Payload,
      });

      // 2. Simulate direct SQL update in database:
      // UPDATE raw_observations SET displayed_indication_i = '10.00500000' WHERE id = 'obs-2';
      const obs1PayloadTampered = {
        testClause: "A.4.4",
        loadRunDirection: "ASCENDING",
        targetLoadL: "10.00000000",
        displayedIndicationI: "10.00500000", // Tampered: +5 g modification
      };

      // 3. Single-observation tamper check
      const singleCheck = verifyObservationTamper(node1, obs1PayloadTampered);
      assert.strictEqual(singleCheck.isTampered, true);
      assert.notStrictEqual(singleCheck.actualHash, singleCheck.expectedHash);

      // 4. Validate entire session provenance chain with tampered database record
      const tamperedChain: ProvenanceNodeInput[] = [
        { ...node0, payload: obs0Payload },
        { ...node1, payload: obs1PayloadTampered },
        { ...node2, payload: obs2Payload },
      ];

      const validation = validateSessionProvenanceChain(tamperedChain);

      // Acceptance Criteria: Asserts failure, identifies corrupted node 1, and reports PAYLOAD_TAMPERED
      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.brokenAtIndex, 1);
      assert.strictEqual(validation.brokenNodeId, "node-uuid-1");
      assert.strictEqual(validation.failureReason, "PAYLOAD_TAMPERED");
      assert.ok(validation.details?.includes("sequence 1 was modified"));
    });

    test("detects broken hash link when adversary rewrites node hash without updating child nodes", () => {
      const node0 = generateProvenanceNode({
        id: "node-link-0",
        testSessionId: mockSessionId,
        nodeSequence: 0,
        nodeType: "OBSERVATION_LOG",
        payload: { step: 0 },
      });

      const node1 = generateProvenanceNode({
        id: "node-link-1",
        testSessionId: mockSessionId,
        nodeSequence: 1,
        nodeType: "OBSERVATION_LOG",
        previousNodeHashSha256: node0.currentNodeHashSha256,
        payload: { step: 1 },
      });

      const node2 = generateProvenanceNode({
        id: "node-link-2",
        testSessionId: mockSessionId,
        nodeSequence: 2,
        nodeType: "OBSERVATION_LOG",
        previousNodeHashSha256: node1.currentNodeHashSha256,
        payload: { step: 2 },
      });

      // Adversary modifies node1's currentNodeHashSha256 directly in database
      const tamperedNode1 = {
        ...node1,
        currentNodeHashSha256: "f".repeat(64),
      };

      const chain = [node0, tamperedNode1, node2];
      const validation = validateSessionProvenanceChain(chain);

      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.failureReason, "HASH_LINK_MISMATCH");
      assert.strictEqual(validation.brokenAtIndex, 2); // Node 2's previousHash doesn't match Node 1's rewritten hash
    });
  });

  describe("3. Public Verification Gateway Tamper Verdict (/api/v1/verify/:hash)", () => {
    let app: any;
    let mockDb: any;

    beforeEach(() => {
      // Construct a session with a tampered provenance node in database
      const node0 = generateProvenanceNode({
        id: "node-verify-0",
        testSessionId: mockSessionId,
        nodeSequence: 0,
        nodeType: "SESSION_INIT",
        previousNodeHashSha256: GENESIS_PREV_HASH,
        payload: { session: mockSessionId },
      });

      // Intentionally create node 1 with mismatched previous hash (tampered link)
      const tamperedNode1 = {
        id: "node-verify-1",
        testSessionId: mockSessionId,
        nodeSequence: 1,
        nodeType: "OBSERVATION_LOG",
        previousNodeHashSha256: "bad0".repeat(16), // Corrupted previous hash
        payloadHashSha256: "1111".repeat(16),
        currentNodeHashSha256: "2222".repeat(16),
        createdAt: new Date(),
      };

      const mockSession = {
        id: mockSessionId,
        sessionNumber: "SES-TC05-TAMPERED",
        status: "COMPLETED",
        laboratory: {
          name: "Regional Reference Standards Laboratory (RRSL)",
        },
        instrumentUnit: {
          instrumentModel: {
            modelName: "High Precision Balance DS-215",
            maxCapacity: "15.000",
            minCapacity: "0.100",
            verificationScaleIntervalE: "0.005",
            unitOfMeasure: "kg",
            manufacturer: { companyName: "Essae-Teraoka" },
            accuracyClass: { name: "Class III" },
          },
        },
        digitalSignatures: [],
        reports: [],
        provenanceNodes: [node0, tamperedNode1],
      };

      mockDb = {
        provenanceNode: {
          findFirst: async ({ where }: any) => {
            const queryHash = where.OR?.[0]?.currentNodeHashSha256 || where.OR?.[1]?.payloadHashSha256;
            if (queryHash === node0.currentNodeHashSha256) return node0;
            if (queryHash === tamperedNode1.currentNodeHashSha256) return tamperedNode1;
            return null;
          },
        },
        digitalSignature: {
          findFirst: async () => null,
        },
        reportVersion: {
          findFirst: async () => null,
        },
        testSession: {
          findFirst: async ({ where }: any) => {
            if (where.OR?.some((cond: any) => cond.id === mockSessionId || cond.sessionNumber === mockSession.sessionNumber)) {
              return mockSession;
            }
            return null;
          },
          findUnique: async ({ where }: any) => {
            if (where.id === mockSessionId) return mockSession;
            return null;
          },
        },
      };

      app = createApp({ db: mockDb });
    });

    test("GET /api/v1/verify/:hash detects tampered provenance chain and flags tamperDetected: true", async () => {
      const res = await request(app).get(`/api/v1/verify/${mockSessionId}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.valid, false);
      assert.strictEqual(res.body.tamperDetected, true);
      assert.strictEqual(res.body.chainValidation.valid, false);
      assert.strictEqual(res.body.chainValidation.failureReason, "HASH_LINK_MISMATCH");
      assert.strictEqual(res.body.chainValidation.brokenAtIndex, 1);
    });
  });

  describe("4. Report Generation Gatekeeper Blockade (/api/v1/reports/:sessionId/generate)", () => {
    let app: any;
    let mockDb: any;
    let mockStorage: any;
    let savedReports: any[] = [];

    beforeEach(() => {
      savedReports = [];

      // Valid node 0
      const node0 = generateProvenanceNode({
        id: "node-rep-0",
        testSessionId: mockSessionId,
        nodeSequence: 0,
        nodeType: "SESSION_INIT",
        previousNodeHashSha256: GENESIS_PREV_HASH,
        payload: { init: true },
      });

      // Corrupted node 1 (broken chain linkage)
      const corruptedNode1 = {
        id: "node-rep-1",
        testSessionId: mockSessionId,
        nodeSequence: 1,
        nodeType: "OBSERVATION_LOG",
        previousNodeHashSha256: "deadbeef".repeat(8), // Does not match node0
        payloadHashSha256: "beefdead".repeat(8),
        currentNodeHashSha256: "cafebabe".repeat(8),
        createdAt: new Date(),
      };

      const mockModel = {
        id: "model-tc05",
        modelName: "Commercial Bench Scale",
        maxCapacity: "15.000",
        minCapacity: "0.100",
        verificationScaleIntervalE: "0.005",
        actualScaleIntervalD: "0.005",
        unitOfMeasure: "kg",
        manufacturer: { companyName: "Essae-Teraoka Ltd." },
        accuracyClass: { name: "Class III", code: "CLASS_III" },
      };

      const mockUnit = {
        id: "unit-tc05",
        serialNumber: "SN-2026-TC05-SQL",
        instrumentModel: mockModel,
      };

      const mockSession = {
        id: mockSessionId,
        sessionNumber: "SES-2026-TC05-BLOCK",
        status: "COMPLETED",
        laboratoryId: mockLabId,
        laboratory: {
          id: mockLabId,
          code: "RRSL-DEL",
          name: "Regional Reference Standards Laboratory",
          addressLine1: "Metrology Complex",
          city: "Faridabad",
          state: "Haryana",
          pincode: "121001",
          nablAccreditationNo: "NABL CC-2026-MET-001",
        },
        testingOfficer: {
          fullName: "Inspector Singh",
          designation: "Legal Metrology Inspector",
        },
        instrumentUnit: mockUnit,
        environmentalLogs: [
          {
            temperatureC: "22.00",
            relativeHumidityPercent: "50.00",
            barometricPressureHpa: "1013.25",
            loggedAt: new Date(),
          },
        ],
        rawObservations: [
          {
            id: "obs-1",
            sequenceNumber: 1,
            targetLoadL: "10.000",
            displayedIndicationI: "10.005", // Tampered indication
            changeoverWeightDl: "0.0015",
          },
        ],
        calculationRuns: [
          {
            executedAt: new Date(),
            maxErrorToMpeRatio: "0.3000",
            overallComplianceStatus: "COMPLIANT",
            traceItems: [
              {
                id: "trace-1",
                rawObservationId: "obs-1",
                preRoundingIndicationP: "10.0060",
                rawErrorE: "0.0060",
                zeroErrorE0: "0.0000",
                correctedIntrinsicErrorEc: "0.0060",
                mpeLimitApplied: "0.0050",
                mpeBracketCategory: "(500e, 2000e]",
                complianceStatus: "FAIL",
                rawObservation: {
                  targetLoadL: "10.000",
                },
              },
            ],
          },
        ],
        provenanceNodes: [node0, corruptedNode1],
        reports: [],
      };

      mockDb = {
        testSession: {
          findUnique: async ({ where }: any) => {
            if (where.id === mockSessionId) return mockSession;
            return null;
          },
        },
        report: {
          findFirst: async () => null,
          create: async () => null,
        },
        reportVersion: {
          create: async () => null,
        },
        provenanceNode: {
          findFirst: async () => null,
          create: async () => null,
        },
        $transaction: async (fn: any) => fn(mockDb),
      };

      mockStorage = {
        saveReport: async (sessionId: string, format: string, buffer: Buffer, meta: any) => {
          savedReports.push({ sessionId, format, buffer, meta });
          return {
            storagePath: `/reports/${sessionId}.${format}`,
            fileSizeBytes: buffer.length,
            sha256Checksum: "mocksha256",
          };
        },
      };

      app = createApp({ db: mockDb, storage: mockStorage });
    });

    test("POST /api/v1/reports/:sessionId/generate locks and blocks report compilation on tampered provenance (HTTP 409)", async () => {
      const res = await request(app)
        .post(`/api/v1/reports/${mockSessionId}/generate`)
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      // Acceptance Criteria: Provenance validation fails, identifies corrupted node, and prevents report generation
      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.error, "PROVENANCE_TAMPER_DETECTED");
      assert.strictEqual(res.body.brokenAtIndex, 1);
      assert.match(res.body.message, /Direct database tampering or broken link detected/);

      // Verify that no report was written to storage
      assert.strictEqual(savedReports.length, 0, "No official report PDF or DOCX must be persisted for tampered session");
    });
  });
});
