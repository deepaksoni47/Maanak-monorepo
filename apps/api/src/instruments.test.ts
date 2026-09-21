import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { PrismaClient } from "@maanak/db";
import { Role, generateTokens } from "./auth/index.js";
import { createApp } from "./app.js";

describe("TASK-041: Instrument Model Registration & Table 3 Classification Routes (/api/v1/instruments)", () => {
  let mockPrisma: any;
  let app: any;
  let storedInstruments: any[] = [];
  let storedManufacturers: any[] = [];
  let storedAccuracyClasses: any[] = [];

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

  beforeEach(() => {
    storedAccuracyClasses = [
      { id: "class-i-id", code: "I", name: "Special Accuracy" },
      { id: "class-ii-id", code: "II", name: "High Accuracy" },
      { id: "class-iii-id", code: "III", name: "Medium Accuracy" },
      { id: "class-iiii-id", code: "IIII", name: "Ordinary Accuracy" },
    ];

    storedManufacturers = [
      {
        id: "mfg-001",
        companyName: "Essae-Teraoka Pvt Ltd",
        tradeLicenseNo: "TL-BLR-0982",
        registrationNumber: "REG-IND-MFG-001",
        addressLine1: "Electronic City Phase 2",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560100",
        contactPerson: "K. R. Rao",
        contactEmail: "compliance@essae.com",
        contactPhone: "+91-80-28520123",
      },
    ];

    storedInstruments = [
      {
        id: "inst-tc01-001",
        manufacturerId: "mfg-001",
        accuracyClassId: "class-iii-id",
        modelName: "DS-215 Bench Scale",
        patternDesignation: "IND/09/2024/481",
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
        tempRangeMinC: -10.0,
        tempRangeMaxC: 40.0,
        powerSupplyVoltageNominal: 230.0,
        powerSupplyFrequencyHz: 50.0,
        firmwareVersionId: "v2.1.0",
        accuracyClass: storedAccuracyClasses[2],
        manufacturer: storedManufacturers[0],
        partialRanges: [],
      },
    ];

    mockPrisma = {
      accuracyClass: {
        findFirst: async ({ where }: any) => {
          return (
            storedAccuracyClasses.find((c) => c.code === where?.code) || null
          );
        },
      },
      manufacturer: {
        findFirst: async () => storedManufacturers[0] || null,
        upsert: async ({ where, create, update }: any) => {
          let found = storedManufacturers.find(
            (m) => m.registrationNumber === where.registrationNumber,
          );
          if (found) {
            Object.assign(found, update);
            return found;
          }
          const created = {
            id: `mfg-${Date.now()}`,
            ...create,
          };
          storedManufacturers.push(created);
          return created;
        },
      },
      instrumentModel: {
        findMany: async ({ where }: any) => {
          let list = [...storedInstruments];
          if (where?.accuracyClass?.code) {
            list = list.filter(
              (i) => i.accuracyClass?.code === where.accuracyClass.code,
            );
          }
          if (where?.instrumentType) {
            list = list.filter(
              (i) => i.instrumentType === where.instrumentType,
            );
          }
          if (where?.OR) {
            const search = where.OR[0]?.modelName?.contains?.toLowerCase();
            if (search) {
              list = list.filter(
                (i) =>
                  i.modelName.toLowerCase().includes(search) ||
                  i.patternDesignation.toLowerCase().includes(search) ||
                  i.manufacturer?.companyName.toLowerCase().includes(search),
              );
            }
          }
          return list;
        },
        findUnique: async ({ where }: any) => {
          return storedInstruments.find((i) => i.id === where.id) || null;
        },
        create: async ({ data }: any) => {
          const accClass =
            storedAccuracyClasses.find((c) => c.id === data.accuracyClassId) ||
            storedAccuracyClasses[2];
          const mfg =
            storedManufacturers.find((m) => m.id === data.manufacturerId) ||
            storedManufacturers[0];

          const created = {
            id: `inst-${Date.now()}`,
            ...data,
            accuracyClass: accClass,
            manufacturer: mfg,
            partialRanges: data.partialRanges?.create || [],
          };
          storedInstruments.push(created);
          return created;
        },
      },
    } as unknown as PrismaClient;

    app = createApp({ db: mockPrisma });
  });

  describe("POST /api/v1/instruments/classify - Live Table 3 Classifier", () => {
    it("computes n = Max/e and verifies Table 3 compliance for Class III scale", async () => {
      // Max = 15 kg, e = 5 g (0.005 kg), d = 5 g -> n = 3000
      const res = await request(app).post("/api/v1/instruments/classify").send({
        maxCapacity: "15",
        verificationScaleIntervalE: "0.005",
        actualScaleIntervalD: "0.005",
        accuracyClass: "III",
        unitOfMeasure: "kg",
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.n, 3000);
      assert.strictEqual(res.body.classification.valid, true);
      assert.strictEqual(res.body.classification.accuracyClass, "III");
      assert.strictEqual(res.body.classification.minAllowedN, 500);
      assert.strictEqual(res.body.classification.maxAllowedN, 10000);
    });

    it("detects invalid division count n exceeding Table 3 ceiling", async () => {
      // Max = 15 kg, e = 0.0001 kg (0.1g) -> n = 150000 (exceeds Class III max of 10000)
      const res = await request(app).post("/api/v1/instruments/classify").send({
        maxCapacity: "15",
        verificationScaleIntervalE: "0.0001",
        actualScaleIntervalD: "0.0001",
        accuracyClass: "III",
        unitOfMeasure: "kg",
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.classification.valid, false);
      assert.ok(res.body.classification.errorReason);
    });
  });

  describe("GET /api/v1/instruments - List Instruments", () => {
    it("rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
      const res = await request(app).get("/api/v1/instruments");

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, "UNAUTHORIZED");
    });

    it("returns list of registered instruments for authenticated inspector", async () => {
      const res = await request(app)
        .get("/api/v1/instruments")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.count, 1);
      assert.strictEqual(
        res.body.instruments[0].patternDesignation,
        "IND/09/2024/481",
      );
    });

    it("supports search filter by model name or pattern designation", async () => {
      const res = await request(app)
        .get("/api/v1/instruments?search=DS-215")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.count, 1);

      const noMatch = await request(app)
        .get("/api/v1/instruments?search=NonExistentModel")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.strictEqual(noMatch.status, 200);
      assert.strictEqual(noMatch.body.count, 0);
    });
  });

  describe("GET /api/v1/instruments/:id - Single Instrument Inspection", () => {
    it("returns instrument details for a valid ID", async () => {
      const res = await request(app)
        .get("/api/v1/instruments/inst-tc01-001")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.instrument.id, "inst-tc01-001");
      assert.strictEqual(res.body.instrument.modelName, "DS-215 Bench Scale");
    });

    it("returns 404 NOT_FOUND for unknown instrument ID", async () => {
      const res = await request(app)
        .get("/api/v1/instruments/unknown-id-999")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`);

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, "NOT_FOUND");
    });
  });

  describe("POST /api/v1/instruments - Register Instrument Pattern", () => {
    const validInstrumentPayload = {
      modelName: "Phoenix Precision Platform",
      patternDesignation: "IND/09/2026/912",
      instrumentType: "Industrial Bench Scale",
      weighingPrinciple: "Strain Gauge Load Cell",
      accuracyClass: "III",
      maxCapacity: "30.00000000",
      minCapacity: "0.20000000",
      verificationScaleIntervalE: "0.01000000", // 10g -> n = 3000
      actualScaleIntervalD: "0.01000000",
      unitOfMeasure: "kg",
      manufacturer: {
        companyName: "Phoenix Weighing Technologies Ltd",
        tradeLicenseNo: "TL-AHM-9811",
        registrationNumber: "REG-PHX-2026",
      },
    };

    it("rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
      const res = await request(app)
        .post("/api/v1/instruments")
        .send(validInstrumentPayload);

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, "UNAUTHORIZED");
    });

    it("rejects unauthorized role (REVIEWER) with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .post("/api/v1/instruments")
        .set("Authorization", `Bearer ${reviewerTokens.accessToken}`)
        .send(validInstrumentPayload);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.code, "FORBIDDEN");
    });

    it("rejects instrument failing Table 3 classification with 400 CLASSIFICATION_INVALID", async () => {
      // Violation: d > e (OIML R 76-1 Cl 3.4.2 constraint: d <= e <= 10d)
      const invalidPayload = {
        ...validInstrumentPayload,
        patternDesignation: "IND/09/2026/INVALID",
        verificationScaleIntervalE: "0.005",
        actualScaleIntervalD: "0.010", // d > e!
      };

      const res = await request(app)
        .post("/api/v1/instruments")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send(invalidPayload);

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, "CLASSIFICATION_INVALID");
      assert.ok(res.body.error);
    });

    it("registers valid instrument and returns 201 with computed scale divisions n (Acceptance Criteria)", async () => {
      // Max = 30 kg, e = 0.010 kg (10g) -> n = 30 / 0.010 = 3000
      const res = await request(app)
        .post("/api/v1/instruments")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send(validInstrumentPayload);

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.n, 3000);
      assert.strictEqual(res.body.classification.valid, true);
      assert.strictEqual(
        res.body.instrument.patternDesignation,
        "IND/09/2026/912",
      );
      assert.strictEqual(res.body.instrument.scaleDivisionCountN, 3000);
    });

    it("registers multi-interval instrument with partial ranges", async () => {
      const multiIntervalPayload = {
        modelName: "Multi-Range Retail Counter Scale",
        patternDesignation: "IND/09/2026/MULTI-01",
        accuracyClass: "III",
        maxCapacity: "15.00000000",
        verificationScaleIntervalE: "0.00500000",
        actualScaleIntervalD: "0.00500000",
        unitOfMeasure: "kg",
        isMultiInterval: true,
        numberOfPartialRanges: 2,
        partialRanges: [
          {
            rangeIndex: 1,
            maxCapacityI: "6.00000000",
            minCapacityI: "0.04000000",
            verificationScaleIntervalEI: "0.00200000",
            actualScaleIntervalDI: "0.00200000",
          },
          {
            rangeIndex: 2,
            maxCapacityI: "15.00000000",
            minCapacityI: "0.10000000",
            verificationScaleIntervalEI: "0.00500000",
            actualScaleIntervalDI: "0.00500000",
          },
        ],
      };

      const res = await request(app)
        .post("/api/v1/instruments")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send(multiIntervalPayload);

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.instrument.isMultiInterval, true);
      assert.strictEqual(res.body.instrument.partialRanges.length, 2);
    });
  });
});
