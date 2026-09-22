import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import {
  AccuracyClass,
  PartialWeighingRange,
  ComplianceStatus,
} from "@maanak/types";
import {
  getActiveRangeForLoad,
  validatePartialRanges,
  getMultiIntervalMpe,
  calculateMultiIntervalObservation,
  toDecimal,
} from "@maanak/rules-engine";
import { createApp } from "../../apps/api/src/app.js";
import { Role, generateTokens } from "../../apps/api/src/auth/index.js";

describe("TASK-061: Ground Truth Verification TC-03: Multi-Interval Partial Range Switching", () => {
  // Dual-range scale specification per OIML R-76 Clause 3.3
  // Range 1 (W1): 0 <= L <= 3.0 kg, e1 = 1 g, d1 = 1 g, n1 = 3,000 divisions
  // Range 2 (W2): 3.0 < L <= 6.0 kg, e2 = 2 g, d2 = 2 g, n2 = 3,000 divisions
  const TC03_DUAL_RANGES: PartialWeighingRange[] = [
    {
      rangeIndex: 1,
      maxCapacity: "3 kg",
      minCapacity: "0.02 kg", // 20e1 = 20 g
      verificationIntervalE: "1 g",
      actualIntervalD: "1 g",
      scaleDivisionCountN: 3000,
    },
    {
      rangeIndex: 2,
      maxCapacity: "6 kg",
      minCapacity: "0.04 kg", // 20e2 = 40 g
      verificationIntervalE: "2 g",
      actualIntervalD: "2 g",
      scaleDivisionCountN: 3000,
    },
  ];

  const mockLabId = "11111111-2222-3333-4444-555555555555";
  const mockOfficerId = "usr-insp-003";

  const inspectorTokens = generateTokens({
    sub: mockOfficerId,
    username: "inspector.verma",
    email: "inspector.verma@rrsl.gov.in",
    role: Role.INSPECTOR,
    laboratoryId: mockLabId,
    permissions: ["sessions:create", "observations:create"],
  });

  describe("1. Partial Range Configuration Validation (OIML R-76 Clause 3.3)", () => {
    test("validates TC-03 dual-range configuration meets all OIML Clause 3.3 requirements", () => {
      const result = validatePartialRanges(TC03_DUAL_RANGES, {
        accuracyClass: AccuracyClass.CLASS_III,
      });

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    test("rejects invalid partial ranges with non-increasing verification intervals (e1 >= e2)", () => {
      const invalidRanges: PartialWeighingRange[] = [
        {
          rangeIndex: 1,
          maxCapacity: "3 kg",
          verificationIntervalE: "2 g",
          actualIntervalD: "2 g",
        },
        {
          rangeIndex: 2,
          maxCapacity: "6 kg",
          verificationIntervalE: "1 g", // Invalid: e2 < e1
          actualIntervalD: "1 g",
        },
      ];

      const result = validatePartialRanges(invalidRanges);
      assert.strictEqual(result.valid, false);
      assert.ok(
        result.errors.some((err) =>
          /must be strictly greater than previous range e/i.test(err)
        )
      );
    });

    test("rejects invalid partial ranges with non-increasing maximum capacities (Max1 >= Max2)", () => {
      const invalidRanges: PartialWeighingRange[] = [
        {
          rangeIndex: 1,
          maxCapacity: "6 kg",
          verificationIntervalE: "1 g",
          actualIntervalD: "1 g",
        },
        {
          rangeIndex: 2,
          maxCapacity: "4 kg", // Invalid: Max2 < Max1
          verificationIntervalE: "2 g",
          actualIntervalD: "2 g",
        },
      ];

      const result = validatePartialRanges(invalidRanges);
      assert.strictEqual(result.valid, false);
      assert.ok(
        result.errors.some((err) =>
          /must be strictly greater than previous range Max/i.test(err)
        )
      );
    });
  });

  describe("2. Dynamic Interval Switching & Vernier Resolution (Clause 3.3 Blueprint)", () => {
    test("resolves Range 1 at L = 2.0 kg: active e1 = 1 g, Vernier step increment = 0.1 g", () => {
      const active = getActiveRangeForLoad("2.0 kg", TC03_DUAL_RANGES);

      assert.strictEqual(active.rangeIndex, 1);
      assert.strictEqual(active.activeE, "1 g");
      assert.strictEqual(active.activeEInKg, "0.001");
      assert.strictEqual(active.vernierStepIncrement, "0.0001"); // 0.1 g
      assert.strictEqual(active.halfIntervalE, "0.0005"); // 0.5e = 0.5 g
      assert.strictEqual(active.scaleDivisionCountN, 3000);
      assert.strictEqual(active.isOverflow, false);
    });

    test("resolves Range 2 at L = 5.0 kg: active e2 = 2 g, Vernier step increment = 0.2 g", () => {
      const active = getActiveRangeForLoad("5.0 kg", TC03_DUAL_RANGES);

      assert.strictEqual(active.rangeIndex, 2);
      assert.strictEqual(active.activeE, "2 g");
      assert.strictEqual(active.activeEInKg, "0.002");
      assert.strictEqual(active.vernierStepIncrement, "0.0002"); // 0.2 g
      assert.strictEqual(active.halfIntervalE, "0.001"); // 0.5e = 1.0 g
      assert.strictEqual(active.scaleDivisionCountN, 3000);
      assert.strictEqual(active.isOverflow, false);
    });

    test("exact boundary L = 3.0 kg evaluates to Range 1 (L <= Max1)", () => {
      const active = getActiveRangeForLoad("3.0 kg", TC03_DUAL_RANGES);

      assert.strictEqual(active.rangeIndex, 1);
      assert.strictEqual(active.activeEInKg, "0.001");
      assert.strictEqual(active.isOverflow, false);
    });

    test("load immediately above boundary L = 3.001 kg switches dynamically to Range 2", () => {
      const active = getActiveRangeForLoad("3.001 kg", TC03_DUAL_RANGES);

      assert.strictEqual(active.rangeIndex, 2);
      assert.strictEqual(active.activeEInKg, "0.002");
      assert.strictEqual(active.isOverflow, false);
    });

    test("load exceeding Max2 (e.g. 6.5 kg) triggers overflow flag", () => {
      const active = getActiveRangeForLoad("6.5 kg", TC03_DUAL_RANGES);

      assert.strictEqual(active.rangeIndex, 2);
      assert.strictEqual(active.isOverflow, true);
    });
  });

  describe("3. Dynamic Table 6 MPE Recalculation Across Ranges", () => {
    test("computes Range 1 MPE at L = 2.0 kg (2000e1): MPE = ±1.0e1 = ±1.0 g", () => {
      // m1 = 2000e1 (bracket: 500e < m <= 2000e) -> MPE = ±1.0e = ±1.0 g = ±0.001 kg
      const mpeResult = getMultiIntervalMpe(
        "2.0 kg",
        TC03_DUAL_RANGES,
        AccuracyClass.CLASS_III
      );

      assert.strictEqual(mpeResult.activeRange.rangeIndex, 1);
      assert.strictEqual(mpeResult.activeRange.activeEInKg, "0.001");
      assert.strictEqual(mpeResult.mInDivisions, "2000");
      assert.strictEqual(mpeResult.mpeInE, "1.0");
      assert.strictEqual(mpeResult.mpeInMass, "0.001"); // 1.0 g in kg
      assert.strictEqual(mpeResult.stepBracket, "(500e, 2000e]");
    });

    test("computes Range 2 MPE at L = 5.0 kg (2500e2): MPE = ±1.5e2 = ±3.0 g", () => {
      // m2 = 5 kg / 0.002 kg = 2500e2 (bracket: 2000e < m <= 10000e) -> MPE = ±1.5e = ±3.0 g = ±0.003 kg
      const mpeResult = getMultiIntervalMpe(
        "5.0 kg",
        TC03_DUAL_RANGES,
        AccuracyClass.CLASS_III
      );

      assert.strictEqual(mpeResult.activeRange.rangeIndex, 2);
      assert.strictEqual(mpeResult.activeRange.activeEInKg, "0.002");
      assert.strictEqual(mpeResult.mInDivisions, "2500");
      assert.strictEqual(mpeResult.mpeInE, "1.5");
      assert.strictEqual(mpeResult.mpeInMass, "0.003"); // 3.0 g in kg
      assert.strictEqual(mpeResult.stepBracket, "(2000e, 10000e]");
    });
  });

  describe("4. Multi-Interval Observation Calculation & Vernier Increments", () => {
    test("Range 1 Observation (2 kg, I = 2.000 kg, deltaL = 0.4 g): computes P, E and validates 0.1e step", () => {
      // P = 2.000 + 0.5 * 0.001 - 0.0004 = 2.000 + 0.0005 - 0.0004 = 2.0001 kg
      // E = 2.0001 - 2.000 = +0.0001 kg (+0.1 g)
      const obs = calculateMultiIntervalObservation({
        loadMassL: "2 kg",
        indicatedI: "2.000 kg",
        deltaL: "0.0004 kg", // 4 * 0.1 g (multiple of 0.1e1)
        partialRanges: TC03_DUAL_RANGES,
      });

      assert.strictEqual(obs.activeRange.rangeIndex, 1);
      assert.strictEqual(obs.indicatedP, "2.0001");
      assert.strictEqual(obs.rawErrorE, "0.0001");
      assert.strictEqual(obs.isVernierStepValid, true);
    });

    test("Range 2 Observation (5 kg, I = 5.000 kg, deltaL = 0.6 g): computes P, E and validates 0.2e step", () => {
      // P = 5.000 + 0.5 * 0.002 - 0.0006 = 5.000 + 0.001 - 0.0006 = 5.0004 kg
      // E = 5.0004 - 5.000 = +0.0004 kg (+0.4 g)
      const obs = calculateMultiIntervalObservation({
        loadMassL: "5 kg",
        indicatedI: "5.000 kg",
        deltaL: "0.0006 kg", // 3 * 0.2 g (multiple of 0.1e2)
        partialRanges: TC03_DUAL_RANGES,
      });

      assert.strictEqual(obs.activeRange.rangeIndex, 2);
      assert.strictEqual(obs.indicatedP, "5.0004");
      assert.strictEqual(obs.rawErrorE, "0.0004");
      assert.strictEqual(obs.isVernierStepValid, true);
    });

    test("flags non-standard Vernier weight step not matching active range 0.1e", () => {
      // In Range 2, e2 = 2 g so step is 0.2 g. An increment of 0.15 g is invalid.
      const obs = calculateMultiIntervalObservation({
        loadMassL: "5 kg",
        indicatedI: "5.000 kg",
        deltaL: "0.00015 kg", // 0.15 g, not a multiple of 0.2 g
        partialRanges: TC03_DUAL_RANGES,
      });

      assert.strictEqual(obs.activeRange.rangeIndex, 2);
      assert.strictEqual(obs.isVernierStepValid, false);
    });
  });

  describe("5. Directional Sticky Unloading Behavior (OIML Clause 3.3.3)", () => {
    test("maintains Range 2 during decreasing load if stickyDecreasing is active", () => {
      const active = getActiveRangeForLoad("2.0 kg", TC03_DUAL_RANGES, {
        direction: "decreasing",
        stickyDecreasing: true,
        previousRangeIndex: 2,
      });

      assert.strictEqual(active.rangeIndex, 2);
      assert.strictEqual(active.activeEInKg, "0.002");
    });

    test("resets to Range 1 when decreasing load returns to zero", () => {
      const active = getActiveRangeForLoad("0 kg", TC03_DUAL_RANGES, {
        direction: "decreasing",
        stickyDecreasing: true,
        previousRangeIndex: 2,
      });

      assert.strictEqual(active.rangeIndex, 1);
      assert.strictEqual(active.activeEInKg, "0.001");
    });
  });

  describe("6. REST API Gateway Multi-Interval Observation Integration (/api/v1/observations)", () => {
    let app: any;
    let mockDb: any;
    let storedSessions: any[] = [];
    let storedObservations: any[] = [];
    let storedCalcs: any[] = [];
    let storedProvenance: any[] = [];

    const mockSessionId = "aaaaaaaa-1111-2222-3333-444444444444";
    const mockPlanId = "bbbbbbbb-1111-2222-3333-444444444444";
    const mockItemId = "cccccccc-1111-2222-3333-444444444444";

    beforeEach(() => {
      storedObservations = [];
      storedCalcs = [];
      storedProvenance = [];

      const mockMultiModel = {
        id: "model-tc03-dual",
        modelName: "Mettler Toledo BBA231 Dual-Range Platform",
        manufacturerName: "Mettler-Toledo",
        accuracyClassId: "class-iii-id",
        accuracyClass: { code: "III" },
        maxCapacity: "6.00000000",
        minCapacity: "0.02000000",
        verificationScaleIntervalE: "0.00100000",
        actualScaleIntervalD: "0.00100000",
        scaleDivisionCountN: 3000,
        unitOfMeasure: "kg",
        isMultiInterval: true,
        partialRanges: [
          {
            rangeIndex: 1,
            maxCapacityI: "3.00000000",
            minCapacityI: "0.02000000",
            verificationScaleIntervalEI: "0.00100000", // e1 = 1g
            actualScaleIntervalDI: "0.00100000",
            scaleDivisionCountNI: 3000,
          },
          {
            rangeIndex: 2,
            maxCapacityI: "6.00000000",
            minCapacityI: "0.04000000",
            verificationScaleIntervalEI: "0.00200000", // e2 = 2g
            actualScaleIntervalDI: "0.00200000",
            scaleDivisionCountNI: 3000,
          },
        ],
      };

      const mockUnit = {
        id: "unit-tc03-01",
        instrumentModelId: mockMultiModel.id,
        serialNumber: "SN-TC03-98214",
        instrumentModel: mockMultiModel,
      };

      const mockPlan = {
        id: mockPlanId,
        title: "TC-03 Multi-Interval Test Plan",
        items: [
          {
            id: mockItemId,
            clauseNumber: "A.4.4",
            formNumber: "Form 1",
            title: "Weighing Performance",
          },
        ],
      };

      storedSessions = [
        {
          id: mockSessionId,
          sessionNumber: "SES-TC03-001",
          laboratoryId: mockLabId,
          instrumentUnitId: mockUnit.id,
          testPlanId: mockPlan.id,
          rulePackVersionId: "rp-ver-001",
          testingOfficerId: mockOfficerId,
          status: "DRAFT",
          instrumentUnit: mockUnit,
          testPlan: mockPlan,
        },
      ];

      mockDb = {
        testSession: {
          findUnique: async ({ where }: any) => {
            const s = storedSessions.find((item) => item.id === where.id);
            return s || null;
          },
          update: async ({ where, data }: any) => {
            const s = storedSessions.find((item) => item.id === where.id);
            if (s) Object.assign(s, data);
            return s;
          },
        },
        rawObservation: {
          findFirst: async () => null,
          create: async ({ data }: any) => {
            const obs = { id: `obs-${storedObservations.length + 1}`, ...data };
            storedObservations.push(obs);
            return obs;
          },
        },
        calculationRun: {
          findFirst: async ({ where }: any) => {
            const matches = storedCalcs.filter((r) => r.testSessionId === where.testSessionId);
            return matches.length > 0 ? matches[matches.length - 1] : null;
          },
          create: async ({ data }: any) => {
            const calc = { id: `calc-${storedCalcs.length + 1}`, ...data };
            storedCalcs.push(calc);
            return calc;
          },
          update: async ({ where, data }: any) => {
            const run = storedCalcs.find((r) => r.id === where.id);
            if (run) Object.assign(run, data);
            return run;
          },
        },
        calculationTraceItem: {
          create: async ({ data }: any) => {
            return { id: `trace-${Date.now()}`, ...data };
          },
        },
        provenanceNode: {
          findFirst: async ({ where }: any) => {
            const matches = storedProvenance.filter((n) => n.testSessionId === where.testSessionId);
            return matches.length > 0 ? matches[matches.length - 1] : null;
          },
          create: async ({ data }: any) => {
            const node = { id: `node-${storedProvenance.length + 1}`, ...data };
            storedProvenance.push(node);
            return node;
          },
        },
        observationWeightUsed: {
          createMany: async () => ({ count: 0 }),
        },
        $transaction: async (fn: any) => fn(mockDb),
      };

      app = createApp({ db: mockDb });
    });

    test("POST /api/v1/observations: dynamically switches active e from 1 g (Range 1) to 2 g (Range 2)", async () => {
      // Step 1: L = 2.0 kg (Range 1: active e = 0.001 kg, 0.5e = 0.0005 kg)
      // dL = 0.0004 kg -> P = 2.0 + 0.0005 - 0.0004 = 2.0001 kg
      // E = 2.0001 - 2.0 = +0.0001 kg (+0.1 g)
      // MPE at 2000e = ±1.0e = ±0.001 kg
      const res1 = await request(app)
        .post("/api/v1/observations")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          testSessionId: mockSessionId,
          targetLoadL: "2.000",
          displayedIndicationI: "2.000",
          changeoverWeightDl: "0.0004",
          loadRunDirection: "ASCENDING",
          testClause: "A.4.4",
        });

      assert.strictEqual(res1.status, 201);
      assert.strictEqual(res1.body.message, "Observation recorded successfully.");
      assert.strictEqual(res1.body.calculation.preRoundingIndicationP, "2.0001");
      assert.strictEqual(res1.body.calculation.rawErrorE, "0.0001");
      assert.strictEqual(res1.body.calculation.mpeLimitApplied, "0.001");
      assert.strictEqual(res1.body.calculation.complianceStatus, ComplianceStatus.PASS);

      // Step 2: L = 5.0 kg (Range 2: active e = 0.002 kg, 0.5e = 0.0010 kg)
      // dL = 0.0006 kg -> P = 5.0 + 0.0010 - 0.0006 = 5.0004 kg
      // E = 5.0004 - 5.0 = +0.0004 kg (+0.4 g)
      // MPE at 2500e = ±1.5e = ±0.003 kg
      const res2 = await request(app)
        .post("/api/v1/observations")
        .set("Authorization", `Bearer ${inspectorTokens.accessToken}`)
        .send({
          testSessionId: mockSessionId,
          targetLoadL: "5.000",
          displayedIndicationI: "5.000",
          changeoverWeightDl: "0.0006",
          loadRunDirection: "ASCENDING",
          testClause: "A.4.4",
        });

      assert.strictEqual(res2.status, 201);
      assert.strictEqual(res2.body.message, "Observation recorded successfully.");
      assert.strictEqual(res2.body.calculation.preRoundingIndicationP, "5.0004");
      assert.strictEqual(res2.body.calculation.rawErrorE, "0.0004");
      assert.strictEqual(res2.body.calculation.mpeLimitApplied, "0.003");
      assert.strictEqual(res2.body.calculation.complianceStatus, ComplianceStatus.PASS);

      // Verify cryptographic provenance hash continuity between the two observations
      assert.strictEqual(storedProvenance.length, 2);
      assert.strictEqual(storedProvenance[0].nodeSequence, 0);
      assert.strictEqual(storedProvenance[1].nodeSequence, 1);
      assert.strictEqual(storedProvenance[1].previousHash, storedProvenance[0].currentHash);
    });
  });
});
