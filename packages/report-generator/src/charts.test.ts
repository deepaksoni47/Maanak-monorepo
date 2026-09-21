import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CalculationTraceItem } from "@maanak/types";
import { generateErrorCurveSvg, extractErrorCurveData } from "./charts.js";

describe("TASK-033: Vector Error Curve SVG Generator (charts.ts)", () => {
  // TC-01 Ground Truth Dataset: 15 kg Class III Scale (e = 5 g = 0.005 kg)
  // Brackets:
  // 0 <= L <= 2.5 kg (500e): MPE = 0.5e = 0.0025 kg
  // 2.5 kg < L <= 10.0 kg (2000e): MPE = 1.0e = 0.0050 kg
  // 10.0 kg < L <= 15.0 kg (3000e): MPE = 1.5e = 0.0075 kg
  const sampleObservations: CalculationTraceItem[] = [
    {
      loadMass: "0.000",
      calculatedIndicationP: "0.0000",
      rawErrorE: "0.0000",
      zeroErrorE0: "0.0000",
      correctedErrorEc: "0.0000",
      applicableMpe: "0.0025",
      pass: true,
    },
    {
      loadMass: "0.100", // Min (20e)
      calculatedIndicationP: "0.1002",
      rawErrorE: "0.0002",
      zeroErrorE0: "0.0000",
      correctedErrorEc: "0.0002",
      applicableMpe: "0.0025",
      pass: true,
    },
    {
      loadMass: "2.500", // 500e bracket limit
      calculatedIndicationP: "2.5005",
      rawErrorE: "0.0005",
      zeroErrorE0: "0.0000",
      correctedErrorEc: "0.0005",
      applicableMpe: "0.0025",
      pass: true,
    },
    {
      loadMass: "5.000", // 1000e
      calculatedIndicationP: "5.0008",
      rawErrorE: "0.0008",
      zeroErrorE0: "0.0000",
      correctedErrorEc: "0.0008",
      applicableMpe: "0.0050",
      pass: true,
    },
    {
      loadMass: "10.000", // 2000e bracket limit
      calculatedIndicationP: "10.0010",
      rawErrorE: "0.0010",
      zeroErrorE0: "0.0000",
      correctedErrorEc: "0.0010",
      applicableMpe: "0.0050",
      pass: true,
    },
    {
      loadMass: "15.000", // Max (3000e)
      calculatedIndicationP: "15.0015",
      rawErrorE: "0.0015",
      zeroErrorE0: "0.0000",
      correctedErrorEc: "0.0015",
      applicableMpe: "0.0075",
      pass: true,
    },
    // Descending / Unloading run
    {
      loadMass: "10.000",
      calculatedIndicationP: "10.0012",
      rawErrorE: "0.0012",
      zeroErrorE0: "0.0000",
      correctedErrorEc: "0.0012",
      applicableMpe: "0.0050",
      pass: true,
    },
    {
      loadMass: "2.500",
      calculatedIndicationP: "2.5004",
      rawErrorE: "0.0004",
      zeroErrorE0: "0.0000",
      correctedErrorEc: "0.0004",
      applicableMpe: "0.0025",
      pass: true,
    },
    {
      loadMass: "0.000",
      calculatedIndicationP: "0.0001",
      rawErrorE: "0.0001",
      zeroErrorE0: "0.0000",
      correctedErrorEc: "0.0001",
      applicableMpe: "0.0025",
      pass: true,
    },
  ];

  describe("extractErrorCurveData helper", () => {
    it("converts CalculationTraceItems into typed numeric points", () => {
      const data = extractErrorCurveData(sampleObservations);
      assert.equal(data.length, 9);
      assert.equal(data[0].load, 0);
      assert.equal(data[0].correctedError, 0);
      assert.equal(data[0].mpe, 0.0025);
      assert.equal(data[0].direction, "ASCENDING");

      assert.equal(data[5].load, 15);
      assert.equal(data[5].correctedError, 0.0015);
      assert.equal(data[5].mpe, 0.0075);
      assert.equal(data[5].direction, "ASCENDING");

      // Descending points
      assert.equal(data[6].direction, "DESCENDING");
      assert.equal(data[7].direction, "DESCENDING");
      assert.equal(data[8].direction, "DESCENDING");
    });

    it("gracefully handles missing or NaN values", () => {
      const corruptObs: CalculationTraceItem[] = [
        {
          loadMass: undefined,
          calculatedIndicationP: "invalid",
          rawErrorE: "",
          zeroErrorE0: "0",
          correctedErrorEc: "abc",
          applicableMpe: undefined as unknown as string,
          pass: false,
        },
      ];
      const data = extractErrorCurveData(corruptObs);
      assert.equal(data.length, 1);
      assert.equal(data[0].load, 0);
      assert.equal(data[0].correctedError, 0);
      assert.equal(data[0].mpe, 0);
      assert.equal(data[0].pass, false);
    });
  });

  describe("generateErrorCurveSvg Core SVG Output", () => {
    it("produces valid, standalone SVG document markup", () => {
      const svg = generateErrorCurveSvg(sampleObservations, 15, {
        accuracyClass: "Class III",
        verificationIntervalE: "0.005 kg",
      });

      assert.ok(svg.startsWith("<svg"));
      assert.ok(svg.endsWith("</svg>"));
      assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
      assert.ok(svg.includes('viewBox="0 0 800 460"'));
      assert.ok(svg.includes('role="img"'));
    });

    it("renders title, metadata and axis labels", () => {
      const svg = generateErrorCurveSvg(sampleObservations, "15.0", {
        title: "Custom Calibration Error Curve",
        subtitle: "Instrument Unit: SN-2026-99",
        accuracyClass: "III",
        verificationIntervalE: "5 g",
        unit: "kg",
      });

      assert.ok(svg.includes("Custom Calibration Error Curve"));
      assert.ok(svg.includes("SN-2026-99"));
      assert.ok(svg.includes("Class: III"));
      assert.ok(svg.includes("Max: 15 kg"));
      assert.ok(svg.includes("Applied Test Load L (kg)"));
      assert.ok(svg.includes("Corrected Error Ec (kg)"));
    });

    it("renders zero error reference line and axes", () => {
      const svg = generateErrorCurveSvg(sampleObservations, 15);

      assert.ok(svg.includes("<!-- Zero Baseline (Ec = 0) -->"));
      assert.ok(svg.includes("<!-- Axes -->"));
    });

    it("renders shaded MPE tolerance envelope polygon and stepped boundary lines", () => {
      const svg = generateErrorCurveSvg(sampleObservations, 15, {
        includeToleranceArea: true,
      });

      assert.ok(
        svg.includes("<!-- MPE Tolerance Envelopes (Stepped Brackets) -->"),
      );
      assert.ok(svg.includes("<polygon points="));
      assert.ok(svg.includes('stroke-dasharray="4 3"'));
    });

    it("omits tolerance envelope polygon when includeToleranceArea is false", () => {
      const svg = generateErrorCurveSvg(sampleObservations, 15, {
        includeToleranceArea: false,
      });

      assert.ok(
        !svg.includes("<!-- MPE Tolerance Envelopes (Stepped Brackets) -->"),
      );
      assert.ok(!svg.includes("<polygon points="));
    });

    it("renders both ascending and descending curves with data point circles", () => {
      const svg = generateErrorCurveSvg(sampleObservations, 15);

      assert.ok(svg.includes("<!-- Ascending Loading Curve -->"));
      assert.ok(svg.includes("<!-- Descending Unloading Curve -->"));
      assert.ok(svg.includes("<!-- Plotted Observation Points -->"));

      // 9 data point circles
      const circleCount = (svg.match(/<circle/g) || []).length;
      // 9 observation circles + legend circles
      assert.ok(circleCount >= 9);
      assert.ok(svg.includes("<title>"));
      assert.ok(svg.includes("Status: PASS"));
    });

    it("highlights failing observations with failPointColor", () => {
      const failingObs: CalculationTraceItem[] = [
        ...sampleObservations.slice(0, 3),
        {
          loadMass: "5.000",
          calculatedIndicationP: "5.0100",
          rawErrorE: "0.0100",
          zeroErrorE0: "0.0000",
          correctedErrorEc: "0.0100", // Exceeds MPE of 0.0050!
          applicableMpe: "0.0050",
          pass: false,
        },
      ];

      const svg = generateErrorCurveSvg(failingObs, 15);
      assert.ok(svg.includes("Status: FAIL"));
      assert.ok(svg.includes('fill="#dc2626"')); // red-600 fail point
    });

    it("supports custom dimensions and themes", () => {
      const svg = generateErrorCurveSvg(sampleObservations, 15, {
        width: 1000,
        height: 600,
        theme: {
          background: "#f8fafc",
          curveColor: "#0284c7",
          passPointColor: "#16a34a",
        },
      });

      assert.ok(svg.includes('viewBox="0 0 1000 600"'));
      assert.ok(svg.includes('fill="#f8fafc"'));
      assert.ok(svg.includes('stroke="#0284c7"'));
      assert.ok(svg.includes('fill="#16a34a"'));
    });
  });
});
