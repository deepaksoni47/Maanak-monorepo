import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { Prisma } from "@maanak/db";
import { MemoryReportStorage } from "@maanak/report-generator";
import {
  extractPdfSignatureMetadata,
  generateTestKeyPairAndCertificate,
} from "@maanak/crypto-provenance";
import { Role, generateTokens } from "./auth/index.js";
import { createApp } from "./app.js";

describe("TASK-045: Report Generation & PKI Signing Routes (/api/v1/reports)", () => {
  let mockPrisma: any;
  let storage: MemoryReportStorage;
  let app: any;

  let storedSessions: any[] = [];
  let storedReports: any[] = [];
  let storedReportVersions: any[] = [];
  let storedSignatures: any[] = [];
  let storedProvNodes: any[] = [];
  let storedUsers: any[] = [];

  const mockLabId = "11111111-2222-3333-4444-555555555555";
  const mockDirectorId = "usr-dir-001";
  const mockReviewerId = "usr-rev-001";
  const mockInspectorId = "usr-insp-001";
  const mockSessionId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

  const directorTokens = generateTokens({
    sub: mockDirectorId,
    username: "director.sharma",
    email: "director.sharma@rrsl.gov.in",
    role: Role.DIRECTOR,
    laboratoryId: mockLabId,
    permissions: ["*"],
  });

  const reviewerTokens = generateTokens({
    sub: mockReviewerId,
    username: "reviewer.desai",
    email: "reviewer.desai@rrsl.gov.in",
    role: Role.REVIEWER,
    laboratoryId: mockLabId,
    permissions: ["sessions:review"],
  });

  const inspectorTokens = generateTokens({
    sub: mockInspectorId,
    username: "inspector.patel",
    email: "inspector.patel@rrsl.gov.in",
    role: Role.INSPECTOR,
    laboratoryId: mockLabId,
    permissions: ["observations:create"],
  });

  beforeEach(() => {
    storage = new MemoryReportStorage();

    storedUsers = [
      {
        id: mockDirectorId,
        username: "director.sharma",
        email: "director.sharma@rrsl.gov.in",
        fullName: "Dr. A. K. Sharma",
        designation: "Director & Authorized Legal Metrology Signatory",
      },
      {
        id: mockReviewerId,
        username: "reviewer.desai",
        email: "reviewer.desai@rrsl.gov.in",
        fullName: "S. K. Desai",
        designation: "Senior Metrological Reviewer",
      },
    ];

    storedSessions = [
      {
        id: mockSessionId,
        sessionNumber: "DEL-2026-0042",
        status: "COMPLETED",
        laboratoryId: mockLabId,
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
        testingOfficer: {
          fullName: "Dr. A. K. Sharma",
          designation: "Director & Authorized Legal Metrology Signatory",
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
            manufacturer: {
              companyName: "Avery Weigh-Tronix India Ltd.",
            },
            accuracyClass: {
              code: "CLASS_III",
              name: "Class III",
            },
          },
        },
        environmentalLogs: [
          {
            temperatureC: new Prisma.Decimal("22.40"),
            relativeHumidityPercent: new Prisma.Decimal("54.00"),
            barometricPressureHpa: new Prisma.Decimal("1012.80"),
            loggedAt: new Date("2026-09-21T09:00:00Z"),
          },
          {
            temperatureC: new Prisma.Decimal("23.10"),
            relativeHumidityPercent: new Prisma.Decimal("55.00"),
            barometricPressureHpa: new Prisma.Decimal("1012.50"),
            loggedAt: new Date("2026-09-21T11:00:00Z"),
          },
        ],
        rawObservations: [
          {
            id: "obs-1",
            sequenceNumber: 1,
            targetLoadL: new Prisma.Decimal("0.0000"),
            displayedIndicationI: new Prisma.Decimal("0.0000"),
            changeoverWeightDl: new Prisma.Decimal("0.0025"),
          },
          {
            id: "obs-2",
            sequenceNumber: 2,
            targetLoadL: new Prisma.Decimal("2.5000"),
            displayedIndicationI: new Prisma.Decimal("2.5000"),
            changeoverWeightDl: new Prisma.Decimal("0.0020"),
          },
          {
            id: "obs-3",
            sequenceNumber: 3,
            targetLoadL: new Prisma.Decimal("10.0000"),
            displayedIndicationI: new Prisma.Decimal("10.0000"),
            changeoverWeightDl: new Prisma.Decimal("0.0015"),
          },
          {
            id: "obs-4",
            sequenceNumber: 4,
            targetLoadL: new Prisma.Decimal("15.0000"),
            displayedIndicationI: new Prisma.Decimal("15.0000"),
            changeoverWeightDl: new Prisma.Decimal("0.0010"),
          },
        ],
        calculationRuns: [
          {
            id: "calc-run-001",
            overallComplianceStatus: "PASS",
            totalPointsEvaluated: 4,
            totalPointsFailed: 0,
            maxErrorToMpeRatio: new Prisma.Decimal("0.4000"),
            executedAt: new Date("2026-09-21T11:05:00Z"),
            traceItems: [
              {
                id: "trace-1",
                calculationRunId: "calc-run-001",
                rawObservationId: "obs-1",
                preRoundingIndicationP: new Prisma.Decimal("0.0000"),
                rawErrorE: new Prisma.Decimal("0.0000"),
                zeroErrorE0: new Prisma.Decimal("0.0000"),
                correctedIntrinsicErrorEc: new Prisma.Decimal("0.0000"),
                mpeLimitApplied: new Prisma.Decimal("0.0025"),
                mpeBracketCategory: "±0.5e",
                complianceStatus: "PASS",
                createdAt: new Date("2026-09-21T11:05:01Z"),
                rawObservation: {
                  targetLoadL: new Prisma.Decimal("0.0000"),
                },
              },
              {
                id: "trace-2",
                calculationRunId: "calc-run-001",
                rawObservationId: "obs-2",
                preRoundingIndicationP: new Prisma.Decimal("2.5005"),
                rawErrorE: new Prisma.Decimal("0.0005"),
                zeroErrorE0: new Prisma.Decimal("0.0000"),
                correctedIntrinsicErrorEc: new Prisma.Decimal("0.0005"),
                mpeLimitApplied: new Prisma.Decimal("0.0025"),
                mpeBracketCategory: "±0.5e",
                complianceStatus: "PASS",
                createdAt: new Date("2026-09-21T11:05:02Z"),
                rawObservation: {
                  targetLoadL: new Prisma.Decimal("2.5000"),
                },
              },
            ],
          },
        ],
        provenanceNodes: [
          {
            id: "prov-0",
            testSessionId: mockSessionId,
            nodeSequence: 0,
            nodeType: "SESSION_INIT",
            previousNodeHashSha256:
              "0000000000000000000000000000000000000000000000000000000000000000",
            currentNodeHashSha256:
              "1111111111111111111111111111111111111111111111111111111111111111",
          },
          {
            id: "prov-1",
            testSessionId: mockSessionId,
            nodeSequence: 1,
            nodeType: "REVIEW_AUDIT",
            previousNodeHashSha256:
              "1111111111111111111111111111111111111111111111111111111111111111",
            currentNodeHashSha256:
              "2222222222222222222222222222222222222222222222222222222222222222",
          },
        ],
        reports: [],
      },
    ];

    storedReports = [];
    storedReportVersions = [];
    storedSignatures = [];
    storedProvNodes = [...storedSessions[0].provenanceNodes];

    // Build mock Prisma client
    mockPrisma = {
      testSession: {
        findUnique: async (args: any) => {
          const sess = storedSessions.find((s) => s.id === args.where.id);
          if (!sess) return null;
          return {
            ...sess,
            reports: storedReports.filter((r) => r.testSessionId === sess.id),
            provenanceNodes: storedProvNodes.filter(
              (p) => p.testSessionId === sess.id || !p.testSessionId,
            ),
          };
        },
      },
      user: {
        findUnique: async (args: any) => {
          return storedUsers.find((u) => u.id === args.where.id) || null;
        },
      },
      report: {
        findUnique: async (args: any) => {
          const rep = storedReports.find(
            (r) =>
              r.id === args.where.id ||
              r.testSessionId === args.where.testSessionId,
          );
          if (!rep) return null;
          return {
            ...rep,
            versions: storedReportVersions.filter((v) => v.reportId === rep.id),
          };
        },
        findFirst: async (args: any) => {
          const orConditions = args.where.OR;
          const match = storedReports.find((r) =>
            orConditions.some(
              (cond: any) =>
                (cond.id && r.id === cond.id) ||
                (cond.testSessionId && r.testSessionId === cond.testSessionId),
            ),
          );
          if (!match) return null;
          return {
            ...match,
            versions: storedReportVersions.filter(
              (v) => v.reportId === match.id,
            ),
            testSession: {
              ...storedSessions.find((s) => s.id === match.testSessionId),
              digitalSignatures: storedSignatures.filter(
                (ds) => ds.testSessionId === match.testSessionId,
              ),
            },
          };
        },
        create: async (args: any) => {
          const created = {
            id: `rep-${storedReports.length + 1}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...args.data,
          };
          storedReports.push(created);
          return created;
        },
        update: async (args: any) => {
          const rep = storedReports.find((r) => r.id === args.where.id);
          if (rep) {
            Object.assign(rep, args.data, { updatedAt: new Date() });
          }
          return rep;
        },
      },
      reportVersion: {
        create: async (args: any) => {
          const created = {
            id: `ver-${storedReportVersions.length + 1}`,
            createdAt: new Date(),
            ...args.data,
          };
          storedReportVersions.push(created);
          return created;
        },
      },
      digitalSignature: {
        create: async (args: any) => {
          const created = {
            id: `sig-${storedSignatures.length + 1}`,
            ...args.data,
          };
          storedSignatures.push(created);
          return created;
        },
      },
      provenanceNode: {
        findFirst: async (args: any) => {
          const nodes = storedProvNodes.filter(
            (p) => p.testSessionId === args.where.testSessionId,
          );
          return nodes.length > 0 ? nodes[nodes.length - 1] : null;
        },
        create: async (args: any) => {
          const created = {
            id: `prov-${storedProvNodes.length + 1}`,
            ...args.data,
          };
          storedProvNodes.push(created);
          return created;
        },
      },
      $transaction: async (fn: any) => fn(mockPrisma),
    };

    app = createApp({
      db: mockPrisma,
      storage,
    });
  });

  // -------------------------------------------------------------------------
  // 1. Authentication & RBAC Guards
  // -------------------------------------------------------------------------
  it("should enforce authentication on all report endpoints", async () => {
    const unauthPost = await request(app).post(
      `/api/v1/reports/${mockSessionId}/generate`,
    );
    assert.equal(unauthPost.status, 401);

    const unauthSign = await request(app).post(
      `/api/v1/reports/${mockSessionId}/sign`,
    );
    assert.equal(unauthSign.status, 401);

    const unauthPdf = await request(app).get(
      `/api/v1/reports/${mockSessionId}/pdf`,
    );
    assert.equal(unauthPdf.status, 401);
  });

  it("should reject non-directors from signing reports (RBAC 403)", async () => {
    // Inspector tries to sign
    const res = await request(app)
      .post(`/api/v1/reports/${mockSessionId}/sign`)
      .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
      .send({});

    assert.equal(res.status, 403);
    assert.ok(res.body.error.includes("Forbidden"));
  });

  // -------------------------------------------------------------------------
  // 2. Report Generation (PDF & DOCX)
  // -------------------------------------------------------------------------
  it("should return 404 if test session is not found", async () => {
    const nonExistent = "00000000-0000-0000-0000-000000000000";
    const res = await request(app)
      .post(`/api/v1/reports/${nonExistent}/generate`)
      .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.error, "NOT_FOUND");
  });

  it("should compile and persist both PDF and DOCX reports", async () => {
    const res = await request(app)
      .post(`/api/v1/reports/${mockSessionId}/generate`)
      .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.report);
    assert.equal(res.body.report.reportNumber, "RRSL-DEL-2026-0042");
    assert.equal(res.body.report.isSigned, false);
    assert.equal(res.body.report.currentVersionNo, 1);

    // Verify file metadata returned
    assert.ok(res.body.files.pdf);
    assert.ok(res.body.files.docx);
    assert.ok(res.body.files.pdf.sizeBytes > 1000);
    assert.ok(res.body.files.docx.sizeBytes > 500);
    assert.equal(typeof res.body.files.pdf.sha256Checksum, "string");
    assert.equal(res.body.files.pdf.sha256Checksum.length, 64);

    // Verify storage has both files
    const pdfInStorage = await storage.getReport(mockSessionId, "pdf");
    assert.ok(pdfInStorage);
    assert.equal(pdfInStorage.buffer.subarray(0, 4).toString(), "%PDF");

    const docxInStorage = await storage.getReport(mockSessionId, "docx");
    assert.ok(docxInStorage);
    assert.equal(docxInStorage.buffer.subarray(0, 2).toString(), "PK");

    // Verify WELMEC 7.2 provenance node was appended
    const lastNode = storedProvNodes[storedProvNodes.length - 1];
    assert.equal(lastNode.nodeType, "REPORT_GENERATED");
    assert.equal(lastNode.nodeSequence, 2);
  });

  // -------------------------------------------------------------------------
  // 3. X.509 PKI Digital Signing
  // -------------------------------------------------------------------------
  it("should fail signing if report has not been generated yet", async () => {
    const res = await request(app)
      .post(`/api/v1/reports/${mockSessionId}/sign`)
      .set("Authorization", `Bearer ${directorTokens.accessToken}`)
      .send({});

    assert.equal(res.status, 404);
  });

  it("should apply Director X.509 PKI signature and embed ISO 32000-1 signature dictionary into PDF", async () => {
    // 1. Generate report first
    const genRes = await request(app)
      .post(`/api/v1/reports/${mockSessionId}/generate`)
      .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);
    assert.equal(genRes.status, 201);
    const reportId = genRes.body.report.id;

    // 2. Generate test keys for director
    const keyPair = await generateTestKeyPairAndCertificate({
      commonName: "Dr. A. K. Sharma (Director)",
      organization: "Regional Reference Standard Laboratory",
      country: "IN",
      serialNumber: "0102030405060708090a",
    });

    // 3. Director signs report
    const signRes = await request(app)
      .post(`/api/v1/reports/${reportId}/sign`)
      .set("Authorization", `Bearer ${directorTokens.accessToken}`)
      .send({
        privateKeyPem: keyPair.privateKeyPem,
        certificatePem: keyPair.certificatePem,
        reason: "Official OIML R-76 NAWI Verification Test Certification",
        location: "RRSL Faridabad",
      });

    assert.equal(signRes.status, 200);
    assert.equal(signRes.body.success, true);
    assert.equal(signRes.body.report.isSigned, true);
    assert.equal(signRes.body.report.currentVersionNo, 2);
    assert.ok(signRes.body.signature);
    assert.equal(typeof signRes.body.signature.pdfBinaryHashSha256, "string");
    assert.equal(signRes.body.signature.pdfBinaryHashSha256.length, 64);

    // 4. Retrieve signed PDF and verify embedded Adobe signature
    const signedPdf = await storage.getReport(mockSessionId, "pdf");
    assert.ok(signedPdf);

    const signatures = extractPdfSignatureMetadata(
      signedPdf.buffer,
      keyPair.certificatePem,
    );
    assert.ok(signatures.length > 0);
    assert.equal(signatures[0].isValidSignature, true);
    assert.equal(
      signatures[0].reason,
      "Official OIML R-76 NAWI Verification Test Certification",
    );

    // 5. Verify provenance node for signature
    const lastNode = storedProvNodes[storedProvNodes.length - 1];
    assert.equal(lastNode.nodeType, "DIGITAL_SIGNATURE");
  });

  // -------------------------------------------------------------------------
  // 4. Document Streaming & Checksum Verification
  // -------------------------------------------------------------------------
  it("should stream PDF and DOCX documents with correct MIME headers", async () => {
    // Generate report
    await request(app)
      .post(`/api/v1/reports/${mockSessionId}/generate`)
      .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

    // Stream PDF
    const pdfRes = await request(app)
      .get(`/api/v1/reports/${mockSessionId}/pdf`)
      .set("Authorization", `Bearer ${reviewerTokens.accessToken}`);

    assert.equal(pdfRes.status, 200);
    assert.equal(pdfRes.headers["content-type"], "application/pdf");
    assert.ok(pdfRes.headers["content-disposition"]?.includes("RRSL-DEL-2026-0042.pdf"));
    assert.ok(pdfRes.headers["x-sha256-checksum"]);
    assert.ok(Buffer.isBuffer(pdfRes.body));
    assert.equal(pdfRes.body.subarray(0, 4).toString(), "%PDF");

    // Stream DOCX
    const binaryParser = (res: any, callback: (err: Error | null, body: Buffer) => void) => {
      res.setEncoding("binary");
      let data = "";
      res.on("data", (chunk: string) => {
        data += chunk;
      });
      res.on("end", () => {
        callback(null, Buffer.from(data, "binary"));
      });
    };

    const docxRes = await request(app)
      .get(`/api/v1/reports/${mockSessionId}/docx`)
      .set("Authorization", `Bearer ${reviewerTokens.accessToken}`)
      .buffer(true)
      .parse(binaryParser);

    assert.equal(docxRes.status, 200);
    assert.equal(
      docxRes.headers["content-type"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    assert.ok(docxRes.headers["content-disposition"]?.includes("RRSL-DEL-2026-0042.docx"));
    assert.ok(docxRes.headers["x-sha256-checksum"]);
    assert.ok(Buffer.isBuffer(docxRes.body));
    assert.equal(docxRes.body.subarray(0, 2).toString(), "PK");
  });

  it("should verify cryptographic integrity of stored report files (/verify)", async () => {
    await request(app)
      .post(`/api/v1/reports/${mockSessionId}/generate`)
      .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

    const verifyRes = await request(app)
      .get(`/api/v1/reports/${mockSessionId}/verify`)
      .set("Authorization", `Bearer ${reviewerTokens.accessToken}`);

    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.isValid, true);
    assert.equal(verifyRes.body.files.pdf.isValid, true);
    assert.equal(verifyRes.body.files.docx.isValid, true);
  });

  it("should retrieve full report details and versions by ID (/reports/:id)", async () => {
    const genRes = await request(app)
      .post(`/api/v1/reports/${mockSessionId}/generate`)
      .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

    const reportId = genRes.body.report.id;

    const getRes = await request(app)
      .get(`/api/v1/reports/${reportId}`)
      .set("Authorization", `Bearer ${reviewerTokens.accessToken}`);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.report.id, reportId);
    assert.equal(getRes.body.report.versions.length, 2); // pdf and docx
    assert.equal(typeof getRes.body.report.versions[0].fileSizeBytes, "number");
  });
});
