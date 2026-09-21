import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { PrismaClient } from "@maanak/db";
import { Role, generateTokens } from "./auth/index.js";
import { createApp } from "./app.js";

describe("TASK-040: Reference Standard Weight Inventory & NABL Pre-Check Routes (/api/v1/weights)", () => {
  let mockPrisma: any;
  let app: any;
  let storedWeights: any[] = [];

  const mockLabId = "11111111-2222-3333-4444-555555555555";

  // Tokens for RBAC testing
  const inspectorTokens = generateTokens({
    sub: "usr-insp-001",
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
    sub: "usr-admin-001",
    username: "admin.rrsl",
    email: "admin@rrsl.gov.in",
    role: Role.ADMIN,
    laboratoryId: mockLabId,
    permissions: ["*"],
  });

  beforeEach(() => {
    storedWeights = [
      {
        id: "wt-e2-001",
        laboratoryId: mockLabId,
        identificationCode: "RRSL/WT/E2/2024-01",
        oimlClass: "E2",
        manufacturerName: "Häfner Gewichte GmbH",
        material: "Austenitic Stainless Steel",
        nominalMassMin: "0.00000100",
        nominalMassMax: "0.50000000",
        isActive: true,
        laboratory: {
          id: mockLabId,
          code: "RRSL-AMD",
          name: "RRSL Ahmedabad",
          city: "Ahmedabad",
        },
        calibrationCertificates: [
          {
            id: "cert-e2-001",
            referenceStandardId: "wt-e2-001",
            certificateNumber: "NPLI/CS/2024/E2/0942",
            calibratingAgency:
              "National Physical Laboratory of India (NPL-CSIR)",
            nablCertNo: "CC-NPL-001",
            calibrationDate: new Date("2024-01-15T00:00:00Z"),
            expiryDate: new Date("2026-01-14T00:00:00Z"),
            expandedUncertaintyU: "0.00000015",
            uncertaintyUnit: "g",
            coverageFactorK: "2.00",
            isActive: true,
          },
        ],
      },
      {
        id: "wt-f1-001",
        laboratoryId: mockLabId,
        identificationCode: "RRSL/WT/F1/2024-02",
        oimlClass: "F1",
        manufacturerName: "Mettler Toledo",
        material: "Stainless Steel",
        nominalMassMin: "0.00100000",
        nominalMassMax: "20.00000000",
        isActive: true,
        laboratory: {
          id: mockLabId,
          code: "RRSL-AMD",
          name: "RRSL Ahmedabad",
          city: "Ahmedabad",
        },
        calibrationCertificates: [
          {
            id: "cert-f1-001",
            referenceStandardId: "wt-f1-001",
            certificateNumber: "NPLI/CS/2024/F1/1102",
            calibratingAgency:
              "National Physical Laboratory of India (NPL-CSIR)",
            nablCertNo: "CC-NPL-001",
            calibrationDate: new Date("2024-03-10T00:00:00Z"),
            expiryDate: new Date("2026-03-09T00:00:00Z"),
            expandedUncertaintyU: "0.00000100",
            uncertaintyUnit: "g",
            coverageFactorK: "2.00",
            isActive: true,
          },
        ],
      },
    ];

    mockPrisma = {
      referenceStandard: {
        findMany: async ({ where }: any) => {
          let list = [...storedWeights];
          if (where?.laboratoryId) {
            list = list.filter((w) => w.laboratoryId === where.laboratoryId);
          }
          if (where?.oimlClass) {
            list = list.filter((w) => w.oimlClass === where.oimlClass);
          }
          if (where?.isActive) {
            list = list.filter((w) => w.isActive);
          }
          return list;
        },
        create: async ({ data }: any) => {
          const newCert = data.calibrationCertificates?.create;
          const certRecord = newCert
            ? {
                id: `cert-${Date.now()}`,
                referenceStandardId: `wt-${Date.now()}`,
                ...newCert,
              }
            : null;

          const newWeight = {
            id: `wt-${Date.now()}`,
            laboratoryId: data.laboratoryId,
            identificationCode: data.identificationCode,
            oimlClass: data.oimlClass,
            manufacturerName: data.manufacturerName,
            material: data.material,
            nominalMassMin: data.nominalMassMin,
            nominalMassMax: data.nominalMassMax,
            isActive: data.isActive,
            calibrationCertificates: certRecord ? [certRecord] : [],
          };
          storedWeights.push(newWeight);
          return newWeight;
        },
      },
    } as unknown as PrismaClient;

    app = createApp({ db: mockPrisma });
  });

  describe("GET /api/v1/weights - List Standard Weights", () => {
    it("rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
      const res = await request(app).get("/api/v1/weights");

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, "UNAUTHORIZED");
    });

    it("returns list of active standard weights for the authenticated inspector", async () => {
      const res = await request(app)
        .get("/api/v1/weights")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.count, 2);
      assert.strictEqual(Array.isArray(res.body.weights), true);

      const codes = res.body.weights.map((w: any) => w.identificationCode);
      assert.ok(codes.includes("RRSL/WT/E2/2024-01"));
      assert.ok(codes.includes("RRSL/WT/F1/2024-02"));
    });

    it("filters standard weights by oimlClass query parameter", async () => {
      const res = await request(app)
        .get("/api/v1/weights?oimlClass=E2")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.count, 1);
      assert.strictEqual(res.body.weights[0].oimlClass, "E2");
    });
  });

  describe("POST /api/v1/weights - Register Reference Standard Weight Set", () => {
    const validWeightPayload = {
      identificationCode: "RRSL/WT/M1/2026-05",
      oimlClass: "M1",
      manufacturerName: "Avery India Ltd",
      material: "Cast Iron",
      nominalMassMin: "1.00000000",
      nominalMassMax: "50.00000000",
      certificate: {
        certificateNumber: "RRSL/CAL/2026/M1/0088",
        calibratingAgency: "RRSL Bangalore",
        nablCertNo: "CC-RRSL-BLR-04",
        calibrationDate: "2026-01-10T00:00:00Z",
        expiryDate: "2028-01-09T00:00:00Z",
        expandedUncertaintyU: "0.00001000",
        uncertaintyUnit: "kg",
        coverageFactorK: "2.00",
      },
    };

    it("rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
      const res = await request(app)
        .post("/api/v1/weights")
        .send(validWeightPayload);

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, "UNAUTHORIZED");
    });

    it("rejects unauthorized roles (REVIEWER) with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .post("/api/v1/weights")
        .set("Authorization", `Bearer ${reviewerTokens.accessToken}`)
        .send(validWeightPayload);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.code, "FORBIDDEN");
    });

    it("rejects payload missing required certificate information with 400 VALIDATION_ERROR", async () => {
      const invalidPayload = {
        identificationCode: "RRSL/WT/TEST",
        oimlClass: "M1",
      };

      const res = await request(app)
        .post("/api/v1/weights")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send(invalidPayload);

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, "VALIDATION_ERROR");
    });

    it("allows INSPECTOR to register new standard weight set and returns 201 Created", async () => {
      const res = await request(app)
        .post("/api/v1/weights")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send(validWeightPayload);

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(
        res.body.weight.identificationCode,
        "RRSL/WT/M1/2026-05",
      );
      assert.strictEqual(res.body.weight.oimlClass, "M1");
      assert.ok(res.body.weight.calibrationCertificates.length >= 1);
      assert.strictEqual(
        res.body.weight.calibrationCertificates[0].certificateNumber,
        "RRSL/CAL/2026/M1/0088",
      );
    });
  });

  describe("POST /api/v1/weights/precheck - Real-Time NABL 129 Gatekeeper", () => {
    it("rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
      const res = await request(app).post("/api/v1/weights/precheck").send({
        uncertaintyU: "0.0001",
        targetLoad: "10",
        e: "0.005",
        accuracyClass: "III",
      });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, "UNAUTHORIZED");
    });

    it("validates compliant standard weight (U <= 1/3 MPE) and returns compliant: true", async () => {
      // Class III, e=5g (0.005 kg), TargetLoad=10 kg (2000e)
      // Bracket (500e < m <= 2000e) -> MPE = ±1.0e = 5g (0.005 kg).
      // 1/3 MPE = 1.66667g (0.0016667 kg).
      // Standard weight with U = 0.5g (0.0005 kg) is strictly <= 1/3 MPE!
      const res = await request(app)
        .post("/api/v1/weights/precheck")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          uncertaintyU: "0.0005",
          targetLoad: "10",
          e: "0.005",
          accuracyClass: "III",
          loadUnit: "kg",
          uncertaintyUnit: "kg",
          eUnit: "kg",
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.compliant, true);
      assert.strictEqual(res.body.status, "COMPLIANT");
      assert.strictEqual(res.body.warning, undefined);
      assert.ok(res.body.maxAllowedUncertainty);
    });

    it("flags out-of-spec standard weight (U > 1/3 MPE) with compliant: false and amber warning payload (Acceptance Criteria)", async () => {
      // Class III, e=5g (0.005 kg), TargetLoad=2.5 kg (500e)
      // Bracket (m <= 500e) -> MPE = ±0.5e = 2.5g (0.0025 kg).
      // 1/3 MPE = 0.83333g (0.0008333 kg).
      // Standard weight with U = 1.5g (0.0015 kg) violates U <= 1/3 MPE!
      const res = await request(app)
        .post("/api/v1/weights/precheck")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          uncertaintyU: "0.0015",
          targetLoad: "2.5",
          e: "0.005",
          accuracyClass: "III",
          weightId: "WT-M1-042",
          loadUnit: "kg",
          uncertaintyUnit: "kg",
          eUnit: "kg",
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.compliant, false);
      assert.strictEqual(res.body.status, "NON_COMPLIANT");
      assert.ok(res.body.warning, "Must contain warning payload");
      assert.ok(
        res.body.warning.includes("NABL 129 VIOLATION"),
        "Warning must cite NABL 129 violation",
      );
      assert.ok(
        res.body.warning.includes("exceeds 1/3 MPE limit"),
        "Warning must explain 1/3 MPE limit",
      );
    });

    it("validates batch of standard weights across multiple test load points", async () => {
      // Class III, e=5g (0.005 kg)
      // Load 1: 2.5 kg (500e, MPE=2.5g, 1/3 MPE=0.833g), U=0.2g (Compliant)
      // Load 2: 10 kg (2000e, MPE=5.0g, 1/3 MPE=1.667g), U=0.5g (Compliant)
      // Load 3: 15 kg (3000e, MPE=7.5g, 1/3 MPE=2.500g), U=4.0g (VIOLATION)
      const res = await request(app)
        .post("/api/v1/weights/precheck")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          e: "0.005",
          accuracyClass: "III",
          unit: "kg",
          weights: [
            { loadMass: "2.5", uncertaintyU: "0.0002", weightId: "W1" },
            { loadMass: "10.0", uncertaintyU: "0.0005", weightId: "W2" },
            { loadMass: "15.0", uncertaintyU: "0.0040", weightId: "W3" },
          ],
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.compliant, false);
      assert.strictEqual(res.body.status, "NON_COMPLIANT");
      assert.strictEqual(res.body.failingCount, 1);
      assert.strictEqual(res.body.passingCount, 2);
      assert.ok(res.body.warning.includes("NABL 129 Pre-Check Failed"));
      assert.strictEqual(res.body.results.length, 3);
      assert.strictEqual(res.body.results[0].compliant, true);
      assert.strictEqual(res.body.results[1].compliant, true);
      assert.strictEqual(res.body.results[2].compliant, false);
    });

    it("rejects invalid pre-check payload with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/weights/precheck")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          // missing uncertaintyU, targetLoad, e, and accuracyClass
          invalid: true,
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, "VALIDATION_ERROR");
    });
  });
});
