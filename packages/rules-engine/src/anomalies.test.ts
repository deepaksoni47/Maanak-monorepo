import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { AnomalyDetector } from "./anomalies.js";

describe("TASK-023: Metrological Sanity & Physical Anomaly Detection Engine (anomalies.ts)", () => {
  const detector = new AnomalyDetector({
    e: "0.005 kg", // 5 g
    max: "15 kg",
    unit: "kg",
  });

  describe("Rule 1: Monotonicity Detection", () => {
    test("Monotonic increasing sequence passes with 0 anomaly flags", () => {
      const sequence = [
        { load: "0 kg", indication: "0 kg", stepIndex: 0 },
        { load: "2.5 kg", indication: "2.500 kg", stepIndex: 1 },
        { load: "5.0 kg", indication: "5.000 kg", stepIndex: 2 },
        { load: "10.0 kg", indication: "10.000 kg", stepIndex: 3 },
        { load: "15.0 kg", indication: "15.000 kg", stepIndex: 4 },
      ];

      const flags = detector.checkMonotonicity(sequence);
      assert.equal(flags.length, 0);
    });

    test("Injected non-monotonic step (increasing load, decreasing indication) flags ANOMALY_NON_MONOTONIC_INDICATION", () => {
      const sequence = [
        { load: "2.5 kg", indication: "2.500 kg", stepIndex: 0 },
        { load: "5.0 kg", indication: "2.490 kg", stepIndex: 1 }, // Non-monotonic drop!
        { load: "10.0 kg", indication: "10.000 kg", stepIndex: 2 },
      ];

      const flags = detector.checkMonotonicity(sequence);
      assert.equal(flags.length, 1);
      assert.equal(flags[0].code, "ANOMALY_NON_MONOTONIC_INDICATION");
      assert.equal(flags[0].severity, "CRITICAL");
      assert.match(flags[0].message, /Non-monotonic step detected/);
      assert.match(flags[0].message, /indication decreased from 2.5 to 2.49/);
      assert.equal(flags[0].details?.previousStepIndex, 0);
      assert.equal(flags[0].details?.currentStepIndex, 1);
    });

    test("Injected non-monotonic step (decreasing load, increasing indication) flags ANOMALY_NON_MONOTONIC_INDICATION", () => {
      const sequence = [
        { load: "15.0 kg", indication: "15.000 kg", stepIndex: 0 },
        { load: "10.0 kg", indication: "10.000 kg", stepIndex: 1 },
        { load: "5.0 kg", indication: "10.050 kg", stepIndex: 2 }, // Inversion: indication went up to 10.050 while load decreased from 10 to 5!
      ];

      const flags = detector.checkMonotonicity(sequence);
      assert.equal(flags.length, 1);
      assert.equal(flags[0].code, "ANOMALY_NON_MONOTONIC_INDICATION");
      assert.equal(flags[0].severity, "CRITICAL");
      assert.match(flags[0].message, /indication increased from 10 to 10\.05/);
    });
  });

  describe("Rule 2: Delta L Bounds (0 <= deltaL <= e)", () => {
    test("Compliant fractional Vernier loads within [0, e] pass cleanly", () => {
      // e = 5 g (0.005 kg). deltaL = 2 g (0.002 kg) is compliant
      const flag1 = detector.checkDeltaL("0.002 kg", "0.005 kg");
      assert.equal(flag1, null);

      // Exact boundaries: deltaL = 0 and deltaL = e
      const flagZero = detector.checkDeltaL("0 kg", "0.005 kg");
      assert.equal(flagZero, null);

      const flagE = detector.checkDeltaL("0.005 kg", "0.005 kg");
      assert.equal(flagE, null);
    });

    test("Excessive fractional load deltaL > e flags ANOMALY_EXCESSIVE_DELTA_L", () => {
      // deltaL = 6 g (0.006 kg), e = 5 g (0.005 kg) -> deltaL = 1.2e > e
      const flag = detector.checkDeltaL("0.006 kg", "0.005 kg", {
        load: "5 kg",
        stepIndex: 3,
      });

      assert.ok(flag);
      assert.equal(flag!.code, "ANOMALY_EXCESSIVE_DELTA_L");
      assert.equal(flag!.severity, "CRITICAL");
      assert.match(flag!.message, /Excessive fractional load deltaL=0\.006/);
      assert.match(flag!.message, /exceeds verification scale interval e=0\.005/);
      assert.equal(flag!.details?.ratioToE, "1.20");
    });

    test("Negative fractional load deltaL < 0 flags ANOMALY_NEGATIVE_DELTA_L", () => {
      const flag = detector.checkDeltaL("-0.001 kg", "0.005 kg");
      assert.ok(flag);
      assert.equal(flag!.code, "ANOMALY_NEGATIVE_DELTA_L");
      assert.equal(flag!.severity, "CRITICAL");
      assert.match(flag!.message, /Negative fractional load/);
    });

    test("checkDeltaLSequence evaluates multiple steps and flags outliers", () => {
      const observations = [
        { deltaL: "0.001 kg", load: "2.5 kg", stepIndex: 0 },
        { deltaL: "0.007 kg", load: "5.0 kg", stepIndex: 1 }, // 7 g > 5 g -> excessive!
        { deltaL: "0.003 kg", load: "10.0 kg", stepIndex: 2 },
      ];

      const flags = detector.checkDeltaLSequence(observations);
      assert.equal(flags.length, 1);
      assert.equal(flags[0].code, "ANOMALY_EXCESSIVE_DELTA_L");
      assert.equal(flags[0].details?.stepIndex, 1);
    });
  });

  describe("Rule 3: Environmental Stability (Thermal Drift Rate <= 5.0 °C/h)", () => {
    test("Compliant drift rate (1.5 °C/h <= 5.0 °C/h) passes with 0 flags", () => {
      const flags = detector.checkEnvironmentalStability({
        tempStartC: 21.0,
        tempEndC: 22.5,
        durationHours: 1.0, // 1.5 °C in 1 h = 1.5 °C/h
      });

      assert.equal(flags.length, 0);
    });

    test("Excessive drift rate (8.0 °C/h > 5.0 °C/h) flags ANOMALY_TEMPERATURE_DRIFT_EXCEEDED", () => {
      // 20.0 °C to 24.0 °C in 30 minutes (0.5 h) -> 4.0 °C / 0.5 h = 8.0 °C/h
      const flags = detector.checkEnvironmentalStability({
        tempStartC: 20.0,
        tempEndC: 24.0,
        durationMinutes: 30,
      });

      assert.equal(flags.length, 1);
      assert.equal(flags[0].code, "ANOMALY_TEMPERATURE_DRIFT_EXCEEDED");
      assert.equal(flags[0].severity, "CRITICAL");
      assert.match(flags[0].message, /Thermal drift rate of 8\.00 °C\/h exceeds maximum permissible limit/);
      assert.equal(flags[0].details?.driftRateCPerHour, "8.00");
    });

    test("Calculates drift duration from ISO date timestamps", () => {
      const flags = detector.checkEnvironmentalStability({
        tempStartC: 22.0,
        tempEndC: 29.0, // 7 °C change
        startTime: "2026-09-21T10:00:00.000Z",
        endTime: "2026-09-21T11:00:00.000Z", // 1 hour -> 7 °C/h > 5 °C/h
      });

      assert.equal(flags.length, 1);
      assert.equal(flags[0].code, "ANOMALY_TEMPERATURE_DRIFT_EXCEEDED");
    });

    test("Flags operating temperature outside standard range [10 °C, 40 °C]", () => {
      const flags = detector.checkEnvironmentalStability({
        tempStartC: 8.5, // Below 10 °C!
        tempEndC: 9.0,
        tempMinC: 10.0,
        tempMaxC: 40.0,
        durationHours: 1.0,
      });

      assert.equal(flags.length, 2); // Both start and end are < 10 °C
      assert.equal(flags[0].code, "ANOMALY_TEMPERATURE_OUT_OF_RANGE");
      assert.equal(flags[0].severity, "WARNING");
      assert.match(flags[0].message, /Start temperature 8\.5 °C is outside specified operating range/);
    });

    test("Flags operating temperature outside default rulePack limits [-10 °C, 40 °C]", () => {
      const flags = detector.checkEnvironmentalStability({
        tempStartC: -15.0, // Below default -10 °C!
        tempEndC: 45.0,    // Above default 40 °C!
        durationHours: 10.0, // 60 °C / 10 h = 6.0 °C/h
      });

      const codes = flags.map((f) => f.code);
      assert.ok(codes.includes("ANOMALY_TEMPERATURE_OUT_OF_RANGE"));
      assert.ok(codes.includes("ANOMALY_TEMPERATURE_DRIFT_EXCEEDED"));
    });
  });

  describe("Rule 4: Tare Sanity (Complete Zero Cancellation at Zero Net Load)", () => {
    test("Tare net indication cancelling to 0 at zero net load passes cleanly", () => {
      const flag = detector.checkTareSanity({
        tareLoad: "2 kg",
        netLoad: "0 kg",
        netIndication: "0 kg",
      });
      assert.equal(flag, null);
    });

    test("Small residual within 0.25e tolerance passes", () => {
      // e = 5 g (0.005 kg). 0.25e = 1.25 g (0.00125 kg).
      // Residual 1 g (0.001 kg) is <= 1.25 g -> compliant
      const flag = detector.checkTareSanity({
        tareLoad: "2 kg",
        netLoad: "0 kg",
        netIndication: "0.001 kg",
      });
      assert.equal(flag, null);
    });

    test("Excessive residual at zero net load flags ANOMALY_TARE_SANITY_FAILED", () => {
      // Residual 3 g (0.003 kg) > 1.25 g (0.25e)
      const flag = detector.checkTareSanity({
        tareLoad: "2 kg",
        netLoad: "0 kg",
        netIndication: "0.003 kg",
      });

      assert.ok(flag);
      assert.equal(flag!.code, "ANOMALY_TARE_SANITY_FAILED");
      assert.equal(flag!.severity, "CRITICAL");
      assert.match(flag!.message, /Tare sanity failure: Non-zero net indication/);
    });

    test("Tare load exceeding scale Max flags ANOMALY_OVERLOAD_EXCEEDED", () => {
      // Max = 15 kg. Applied tare = 16 kg -> exceeds Max
      const flag = detector.checkTareSanity({
        tareLoad: "16 kg",
        netLoad: "0 kg",
        netIndication: "0 kg",
      });

      assert.ok(flag);
      assert.equal(flag!.code, "ANOMALY_OVERLOAD_EXCEEDED");
      assert.match(flag!.message, /Applied tare load 16 kg exceeds scale maximum capacity/);
    });
  });

  describe("Additional Physical Sanity Checks", () => {
    test("Negative load flags ANOMALY_NEGATIVE_LOAD", () => {
      const flags = detector.checkPhysicalSanity({
        load: "-1 kg",
        indication: "0 kg",
      });
      assert.equal(flags.length, 1);
      assert.equal(flags[0].code, "ANOMALY_NEGATIVE_LOAD");
    });

    test("Negative indication under positive load flags ANOMALY_NEGATIVE_INDICATION", () => {
      const flags = detector.checkPhysicalSanity({
        load: "5 kg",
        indication: "-0.010 kg",
      });
      assert.equal(flags.length, 1);
      assert.equal(flags[0].code, "ANOMALY_NEGATIVE_INDICATION");
    });

    test("Load exceeding Max + 9e flags ANOMALY_OVERLOAD_EXCEEDED", () => {
      // Max = 15 kg, e = 0.005 kg. Max + 9e = 15.045 kg.
      // Load = 16 kg > 15.045 kg -> overload
      const flags = detector.checkPhysicalSanity({
        load: "16 kg",
        indication: "15.000 kg",
      });
      assert.equal(flags.length, 1);
      assert.equal(flags[0].code, "ANOMALY_OVERLOAD_EXCEEDED");
    });
  });

  describe("Comprehensive Session Audit (auditSession & Static API)", () => {
    test("Clean session returns hasAnomalies: false with 0 flags", () => {
      const report = detector.auditSession({
        observations: [
          { load: "0 kg", indication: "0 kg", deltaL: "0.002 kg", stepIndex: 0 },
          { load: "5 kg", indication: "5.000 kg", deltaL: "0.002 kg", stepIndex: 1 },
          { load: "10 kg", indication: "10.000 kg", deltaL: "0.002 kg", stepIndex: 2 },
        ],
        environmental: {
          tempStartC: 22.0,
          tempEndC: 23.0,
          durationHours: 1.0,
        },
        tareRuns: [
          { tareLoad: "2 kg", netLoad: "0 kg", netIndication: "0 kg" },
        ],
      });

      assert.equal(report.hasAnomalies, false);
      assert.equal(report.totalAnomalies, 0);
      assert.equal(report.criticalCount, 0);
      assert.equal(report.warningCount, 0);
      assert.match(report.summary, /0 anomalies detected/);
    });

    test("Session with multiple anomalies aggregates all flags with diagnostic summary", () => {
      const report = detector.auditSession({
        observations: [
          { load: "2.5 kg", indication: "2.500 kg", deltaL: "0.002 kg", stepIndex: 0 },
          { load: "5.0 kg", indication: "2.400 kg", deltaL: "0.008 kg", stepIndex: 1 }, // Non-monotonic & deltaL > e
        ],
        environmental: {
          tempStartC: 20.0,
          tempEndC: 27.0, // 7 °C in 0.5 h -> 14 °C/h > 5 °C/h
          durationMinutes: 30,
        },
      });

      assert.equal(report.hasAnomalies, true);
      assert.equal(report.totalAnomalies, 3); // non-monotonic, excessive deltaL, thermal drift
      assert.equal(report.criticalCount, 3);
      assert.equal(report.warningCount, 0);

      const codes = report.flags.map((f) => f.code);
      assert.ok(codes.includes("ANOMALY_NON_MONOTONIC_INDICATION"));
      assert.ok(codes.includes("ANOMALY_EXCESSIVE_DELTA_L"));
      assert.ok(codes.includes("ANOMALY_TEMPERATURE_DRIFT_EXCEEDED"));
      assert.match(report.summary, /Session audit flagged 3 anomaly\/anomalies/);
    });

    test("Static convenience methods match instantiated methods", () => {
      const monoFlags = AnomalyDetector.checkMonotonicity([
        { load: "5 kg", indication: "5 kg" },
        { load: "10 kg", indication: "4 kg" },
      ]);
      assert.equal(monoFlags.length, 1);
      assert.equal(monoFlags[0].code, "ANOMALY_NON_MONOTONIC_INDICATION");

      const deltaFlag = AnomalyDetector.checkDeltaL("0.006 kg", "0.005 kg");
      assert.ok(deltaFlag);
      assert.equal(deltaFlag!.code, "ANOMALY_EXCESSIVE_DELTA_L");
    });
  });
});
