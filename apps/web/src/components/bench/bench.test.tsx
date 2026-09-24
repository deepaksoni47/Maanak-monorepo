import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ObservationCard,
  ObservationData,
  VernierKeypad,
  BenchCardSkeleton,
  TestBatteryNavigator,
  Form2TempDriftCard,
  computeForm2StepResult,
  DEFAULT_FORM2_STEPS,
  Form3EccentricityCard,
  computeEccentricityPositionResult,
  getTable6MpeForLoad,
  POSITION_DEFINITIONS,
} from "./index";

describe("TASK-050: Mobile-First Observation Card & Vernier Keypad", () => {
  const mockPassingObservation: ObservationData = {
    stepNumber: 4,
    label: "Step #4 (100% Max)",
    appliedLoad: 15.0,
    indication: 15.0,
    deltaL: 0.001, // 0.2e
    eVal: 0.005, // e = 5g
    e0: 0,
    mpeLimit: 0.0075, // ±1.5e = 7.5g
    unit: "kg",
    direction: "ASCENDING",
  };

  const mockFailingObservation: ObservationData = {
    ...mockPassingObservation,
    stepNumber: 5,
    label: "Step #5 (Over-tolerance)",
    indication: 15.01, // Large error
    deltaL: 0.0,
    mpeLimit: 0.0075,
  };

  describe("ObservationCard Component & OIML A.4.4.3 Calculations", () => {
    test("renders cleanly with step header and nominal load", () => {
      const html = renderToStaticMarkup(
        <ObservationCard observation={mockPassingObservation} />
      );
      assert.ok(html.includes("#4"));
      assert.ok(html.includes("Step #4 (100% Max)"));
      assert.ok(html.includes("15.0000 kg"));
      assert.ok(html.includes("▲ Asc"));
    });

    test("computes Turning Point P = I + 0.5e - deltaL accurately", () => {
      // P = 15.0000 + 0.5 * 0.005 - 0.001 = 15.0015 kg
      const html = renderToStaticMarkup(
        <ObservationCard observation={mockPassingObservation} />
      );
      assert.ok(html.includes("15.0015 kg"));
    });

    test("assigns PASS compliance badge when |Ec| <= MPE", () => {
      const html = renderToStaticMarkup(
        <ObservationCard observation={mockPassingObservation} />
      );
      assert.ok(html.includes("PASS"));
      assert.ok(html.includes("bg-emerald-500")); // Safe margin progress bar
    });

    test("assigns FAIL compliance badge when |Ec| > MPE", () => {
      const html = renderToStaticMarkup(
        <ObservationCard observation={mockFailingObservation} />
      );
      assert.ok(html.includes("FAIL"));
      assert.ok(html.includes("border-destructive"));
    });

    test("renders officer quick preset buttons and decimal inputs", () => {
      const html = renderToStaticMarkup(
        <ObservationCard observation={mockPassingObservation} />
      );
      assert.ok(html.includes("Match L (15)"));
      assert.ok(html.includes("Zero"));
      assert.ok(html.toLowerCase().includes('inputmode="decimal"'));
    });
  });

  describe("VernierKeypad Component", () => {
    test("enforces minimum 48px touch targets on all increment and reset buttons", () => {
      const html = renderToStaticMarkup(
        <VernierKeypad
          value={0.001}
          eVal={0.005}
          unit="kg"
          onChange={() => {}}
        />
      );

      // Verify all buttons enforce min-h-[48px] and min-w-[48px]
      assert.ok(html.includes("min-h-[48px]"));
      assert.ok(html.includes("min-w-[48px]"));

      // Verify increment chips (+0.1e, +0.2e, +0.5e, +1e)
      assert.ok(html.includes("0.1e"));
      assert.ok(html.includes("0.2e"));
      assert.ok(html.includes("0.5e"));
      assert.ok(html.includes("1e"));
      assert.ok(html.includes("Reset"));
    });
  });

  describe("BenchCardSkeleton Component", () => {
    test("renders zero-CLS geometry matching observation card layout", () => {
      const html = renderToStaticMarkup(<BenchCardSkeleton />);
      assert.ok(html.includes("rounded-sm"));
      assert.ok(html.includes("animate-pulse"));
      assert.ok(html.includes("grid grid-cols-2"));
      assert.ok(html.includes("grid grid-cols-5")); // Keypad slot
    });
  });

  describe("ObservationLedgerTable Component", () => {
    test("renders official OIML ledger table with turning point and errors", () => {
      const { ObservationLedgerTable } = require("./ObservationLedgerTable");
      const html = renderToStaticMarkup(
        <ObservationLedgerTable
          entries={[
            {
              stepNumber: 1,
              direction: "ASCENDING",
              stageLabel: "Step #1 (Zero Load E₀)",
              appliedLoad: 0.0,
              indication: 0.0,
              deltaL: 0.0025,
              eVal: 0.005,
              turningPointP: 0.0,
              rawErrorE: 0.0,
              intrinsicErrorEc: 0.0,
              mpeLimit: 0.0025,
              unit: "kg",
              isPass: true,
              toleranceConsumedPercent: 0,
              hashSnippet: "0x811c9dc5...",
              timestamp: "12:00:00",
            },
            {
              stepNumber: 8,
              direction: "ASCENDING",
              stageLabel: "Step #8 (Max Full Load)",
              appliedLoad: 15.0,
              indication: 15.0,
              deltaL: 0.0015,
              eVal: 0.005,
              turningPointP: 15.001,
              rawErrorE: 0.001,
              intrinsicErrorEc: 0.001,
              mpeLimit: 0.0075,
              unit: "kg",
              isPass: true,
              toleranceConsumedPercent: 13.3,
              hashSnippet: "0xa4f2910b...",
              timestamp: "12:05:00",
            },
          ]}
        />
      );

      assert.ok(html.includes("Official OIML R-76 Observation Ledger"));
      assert.ok(html.includes("Step #1 (Zero Load E₀)"));
      assert.ok(html.includes("Step #8 (Max Full Load)"));
      assert.ok(html.includes("15.0000 kg"));
      assert.ok(html.includes("0x811c9dc5..."));
      assert.ok(html.includes("2 Steps Logged"));
    });
  });

  describe("ToleranceSafetyGauge Component", () => {
    test("calculates and displays dynamic safe margin and battery progress", () => {
      const { ToleranceSafetyGauge } = require("./ToleranceSafetyGauge");
      const html = renderToStaticMarkup(
        <ToleranceSafetyGauge
          intrinsicErrorEc={0.001}
          mpeLimit={0.005}
          currentStepIndex={4}
          totalSteps={10}
        />
      );

      assert.ok(html.includes("Dynamic MPE Tolerance &amp; Safety Monitor") || html.includes("Dynamic MPE Tolerance & Safety Monitor"));
      // 0.001 / 0.005 = 20% consumed -> 80.0% SAFE MARGIN
      assert.ok(html.includes("80.0% SAFE MARGIN"));
      assert.ok(html.includes("5 of 10 Steps (50%)"));
    });
  });

  describe("OfficerGuidanceBanner Component", () => {
    test("renders plain-language instructions for field officers with quick auto-fill", () => {
      const { OfficerGuidanceBanner } = require("./OfficerGuidanceBanner");
      const html = renderToStaticMarkup(
        <OfficerGuidanceBanner
          stepNumber={6}
          direction="ASCENDING"
          appliedLoad={7.5}
          unit="kg"
          eVal={0.005}
          onQuickFill={() => {}}
        />
      );

      assert.ok(html.includes("Officer Field Guidance · Step #6"));
      assert.ok(html.includes("Place exactly 7.5000 kg of certified standard weights"));
      assert.ok(html.includes("Quick Auto-Fill Indication (7.5 kg)"));
    });
  });

  describe("TASK-071: TestBatteryNavigator & Multi-Form Navigation", () => {
    test("renders all 6 statutory test forms under OIML R-76 Annex A", () => {
      const html = renderToStaticMarkup(
        <TestBatteryNavigator
          activeForm="form1"
          onSelectForm={() => {}}
          formStatuses={{
            form1: { status: "PASS", progressPercent: 100, completedSteps: 10, totalSteps: 10 },
            form2: { status: "PENDING", progressPercent: 0, completedSteps: 0, totalSteps: 5 },
            form3: { status: "FAIL", progressPercent: 60, completedSteps: 3, totalSteps: 5 },
          }}
        />
      );

      // Verify accessible container
      assert.ok(html.includes('role="tablist"'));
      assert.ok(html.includes("OIML R-76 Statutory Test Battery Forms"));

      // Verify all 6 statutory forms are present with their OIML clauses
      assert.ok(html.includes("Form 1: Weighing"));
      assert.ok(html.includes("OIML R 76-1 A.4.4.3"));

      assert.ok(html.includes("Form 2: Temp Drift"));
      assert.ok(html.includes("OIML R 76-1 A.4.4.2"));

      assert.ok(html.includes("Form 3: Eccentricity"));
      assert.ok(html.includes("OIML R 76-1 A.4.7"));

      assert.ok(html.includes("Form 4: Discrimination"));
      assert.ok(html.includes("OIML R 76-1 A.4.8"));

      assert.ok(html.includes("Form 5: Repeatability"));
      assert.ok(html.includes("OIML R 76-1 A.4.10"));

      assert.ok(html.includes("Form 6: Creep &amp; Zero") || html.includes("Form 6: Creep & Zero"));
      assert.ok(html.includes("OIML R 76-1 A.4.11"));

      // Verify active tab attributes
      assert.ok(html.includes('id="tab-form1"'));
      assert.ok(html.includes('aria-selected="true"'));

      // Verify status badges
      assert.ok(html.includes("PASS"));
      assert.ok(html.includes("FAIL"));

      // Verify step indicators
      assert.ok(html.includes("10/10"));
      assert.ok(html.includes("3/5"));
    });

    test("sets aria-selected=false on inactive tabs", () => {
      const html = renderToStaticMarkup(
        <TestBatteryNavigator
          activeForm="form3"
          onSelectForm={() => {}}
        />
      );

      assert.ok(html.includes('id="tab-form3"'));
      assert.ok(html.includes('aria-selected="true"'));
      assert.ok(html.includes('id="tab-form1"'));
      assert.ok(html.includes('aria-selected="false"'));
      assert.ok(html.includes('id="tab-form2"'));
      assert.ok(html.includes('aria-selected="false"'));
    });
  });

  describe("TASK-072: Form 2 Temperature Effect on No-Load & Thermal Drift", () => {
    test("computes zero turning point P0 and zero error E0 accurately", () => {
      const step1 = DEFAULT_FORM2_STEPS[0];
      const res1 = computeForm2StepResult(step1);
      assert.equal(res1.P0, 0.0);
      assert.equal(res1.E0, 0.0);
      assert.equal(res1.isZeroCompliant, true);
      assert.equal(res1.isOverallPass, true);
    });

    test("computes chamber ramp rate and thermal zero drift between consecutive steps", () => {
      const step1 = DEFAULT_FORM2_STEPS[0];
      const step2 = DEFAULT_FORM2_STEPS[1];

      const res2 = computeForm2StepResult(step2, step1, "CLASS_III");
      assert.equal(res2.deltaT, 20);
      assert.equal(res2.elapsedHours, 5.0);
      assert.equal(res2.rampRateCPerHour, 4.0);
      assert.equal(res2.isRampRateCompliant, true);

      assert.equal(res2.zeroDrift, 0.0005);
      assert.equal(res2.maxAllowedDrift, 0.02);
      assert.equal(res2.isDriftCompliant, true);
      assert.equal(res2.isOverallPass, true);
    });

    test("flags violation when chamber ramp rate exceeds 5.0 °C/h", () => {
      const step1 = { ...DEFAULT_FORM2_STEPS[0], temperatureC: 20.0 };
      const fastStep2 = {
        ...DEFAULT_FORM2_STEPS[1],
        temperatureC: 40.0,
        elapsedMinutes: 120, // 2 hours -> 20 / 2 = 10.0 °C/h
      };

      const res = computeForm2StepResult(fastStep2, step1, "CLASS_III");
      assert.equal(res.rampRateCPerHour, 10.0);
      assert.equal(res.isRampRateCompliant, false);
      assert.equal(res.isOverallPass, false);
    });

    test("renders Form2TempDriftCard UI with all 4 statutory temperature steps", () => {
      const html = renderToStaticMarkup(
        <Form2TempDriftCard
          eVal={0.005}
          unit="kg"
          accuracyClass="CLASS_III"
        />
      );

      assert.ok(html.includes("+20°C Chamber") || html.includes("20°C Chamber"));
      assert.ok(html.includes("+40°C Chamber") || html.includes("40°C Chamber"));
      assert.ok(html.includes("-10°C Chamber"));

      assert.ok(html.includes("OIML R 76-1 Clause A.5.3.2"));
      assert.ok(html.includes("Chamber Temperature (°C)"));
      assert.ok(html.includes("Relative Humidity (% RH)"));
      assert.ok(html.includes("Soak Duration (min)"));

      assert.ok(html.includes("Observed Zero Indication"));
      assert.ok(html.includes("Vernier Added Load"));

      assert.ok(html.includes("PASS"));
      assert.ok(html.includes("Save &amp; Advance") || html.includes("Save & Advance"));
    });
  });

  describe("TASK-073: Form 3 Eccentricity & Corner Load 5-Position Receptor", () => {
    test("computes Table 6 MPE brackets for 1/3 Max eccentricity loads", () => {
      assert.equal(getTable6MpeForLoad(2.0, 0.005, "CLASS_III"), 0.0025);
      assert.equal(getTable6MpeForLoad(5.0, 0.005, "CLASS_III"), 0.005);
      assert.equal(getTable6MpeForLoad(12.0, 0.005, "CLASS_III"), 0.0075);
    });

    test("computes turning point P, Ec, and evaluates corner-to-center spread", () => {
      const centerData = {
        positionNumber: 1,
        label: "Position 1: Center",
        quadrantName: "Center Receptor",
        appliedLoad: 5.0,
        indication: 5.0,
        deltaL: 0.0025,
        eVal: 0.005,
        e0: 0.0,
        unit: "kg",
      };
      const centerRes = computeEccentricityPositionResult(centerData);
      assert.equal(centerRes.P, 5.0);
      assert.equal(centerRes.Ec, 0.0);
      assert.equal(centerRes.isCompliant, true);

      const cornerData = {
        positionNumber: 2,
        label: "Position 2: Front-Left",
        quadrantName: "Quadrant 1 (FL)",
        appliedLoad: 5.0,
        indication: 5.003,
        deltaL: 0.0025,
        eVal: 0.005,
        e0: 0.0,
        unit: "kg",
      };
      const cornerRes = computeEccentricityPositionResult(cornerData, centerRes.Ec, "CLASS_III");
      assert.equal(cornerRes.P, 5.003);
      assert.equal(cornerRes.Ec, 0.003);
      assert.equal(cornerRes.isCompliant, true);
      assert.equal(cornerRes.spreadToCenter, 0.003);
      assert.equal(cornerRes.isSpreadCompliant, true);
    });

    test("flags violation when corner load error exceeds Table 6 MPE limit", () => {
      const failingCorner = {
        positionNumber: 3,
        label: "Position 3: Front-Right",
        quadrantName: "Quadrant 2 (FR)",
        appliedLoad: 5.0,
        indication: 5.008,
        deltaL: 0.0025,
        eVal: 0.005,
        e0: 0.0,
        unit: "kg",
      };
      const cornerRes = computeEccentricityPositionResult(failingCorner, 0.0, "CLASS_III");
      assert.equal(cornerRes.isCompliant, false);
      assert.equal(cornerRes.isSpreadCompliant, false);
    });

    test("renders Form3EccentricityCard UI with all 5 pan positions and 1/3 Max load", () => {
      const html = renderToStaticMarkup(
        <Form3EccentricityCard
          maxCapacityKg={15}
          verificationIntervalKg={0.005}
          accuracyClass="CLASS_III"
          unit="kg"
        />
      );

      assert.ok(html.includes("Form 3: Eccentricity"));
      assert.ok(html.includes("Clause A.4.7"));
      assert.ok(html.includes("1/3 Max = 5 kg") || html.includes("5.000") || html.includes("5 kg"));

      assert.ok(html.includes("#1") && html.includes("Center"));
      assert.ok(html.includes("#2") && html.includes("Q1"));
      assert.ok(html.includes("#3") && html.includes("Q2"));
      assert.ok(html.includes("#4") && html.includes("Q3"));
      assert.ok(html.includes("#5") && html.includes("Q4"));

      assert.ok(html.includes("Scale Indication"));
      assert.ok(html.includes("Vernier Added Load"));
      assert.ok(html.includes("PASS"));
      assert.ok(html.includes("Save &amp; Advance") || html.includes("Save & Advance"));
    });
  });
});
