import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  RRSL_FACILITIES,
  ALL_FACILITIES_NODE,
  FacilityProvider,
  getFacilityById,
  detectFacilityFromUser,
} from "@/lib/facility-context";
import { FacilitySwitcher } from "@/components/layout/FacilitySwitcher";
import { DashboardView, FACILITY_METRICS_MAP } from "./DashboardView";

describe("TASK-087: RRSL Multi-Facility Dashboard & Facility Switcher", () => {
  describe("1. Facility Metadata & Multi-Tenant Boundaries", () => {
    test("exposes all 6 statutory RRSL facilities across Indian metrology zones", () => {
      assert.strictEqual(RRSL_FACILITIES.length, 6);

      const codes = RRSL_FACILITIES.map((f) => f.code);
      assert.ok(codes.includes("RRSL-FBD"), "Must include RRSL Faridabad (Northern)");
      assert.ok(codes.includes("RRSL-AMD"), "Must include RRSL Ahmedabad (Western)");
      assert.ok(codes.includes("RRSL-BLR"), "Must include RRSL Bengaluru (Southern)");
      assert.ok(codes.includes("RRSL-BBI"), "Must include RRSL Bhubaneswar (Eastern)");
      assert.ok(codes.includes("RRSL-VNS"), "Must include RRSL Varanasi (Central)");
      assert.ok(codes.includes("RRSL-GAU"), "Must include RRSL Guwahati (North-Eastern)");
    });

    test("contains accredited NABL numbers and statutory jurisdictions for each facility", () => {
      for (const fac of RRSL_FACILITIES) {
        assert.ok(fac.nablAccreditationNo.startsWith("NABL"), `${fac.code} missing valid NABL number`);
        assert.ok(fac.jurisdiction.length > 10, `${fac.code} missing jurisdiction description`);
        assert.ok(fac.city.length > 2, `${fac.code} missing city`);
        assert.ok(fac.state.length > 2, `${fac.code} missing state`);
      }
    });

    test("provides national grid aggregated node with Pan-India scope", () => {
      assert.strictEqual(ALL_FACILITIES_NODE.id, "ALL");
      assert.strictEqual(ALL_FACILITIES_NODE.code, "NATIONAL-GRID");
      assert.ok(ALL_FACILITIES_NODE.name.includes("National Metrology Grid"));
      assert.ok(ALL_FACILITIES_NODE.jurisdiction.includes("All Regional Reference"));
    });

    test("resolves facilities by ID or code", () => {
      const fbd = getFacilityById("rrsl-fbd");
      assert.strictEqual(fbd.code, "RRSL-FBD");
      assert.strictEqual(fbd.city, "Faridabad");

      const amd = getFacilityById("rrsl-amd");
      assert.strictEqual(amd.code, "RRSL-AMD");
      assert.strictEqual(amd.city, "Ahmedabad");

      const all = getFacilityById("ALL");
      assert.strictEqual(all.code, "NATIONAL-GRID");
    });

    test("detects home facility from user profile designation and facility string", () => {
      const f1 = detectFacilityFromUser("RRSL Ahmedabad Bay #2");
      assert.strictEqual(f1.code, "RRSL-AMD");

      const f2 = detectFacilityFromUser("RRSL Bengaluru Center");
      assert.strictEqual(f2.code, "RRSL-BLR");

      const f3 = detectFacilityFromUser("Testing Officer (Bhubaneswar)");
      assert.strictEqual(f3.code, "RRSL-BBI");

      const fDefault = detectFacilityFromUser(null);
      assert.strictEqual(fDefault.code, "RRSL-FBD");
    });
  });

  describe("2. FacilitySwitcher Component", () => {
    test("renders interactive switcher with accessible controls", () => {
      const html = renderToStaticMarkup(
        <FacilityProvider>
          <FacilitySwitcher />
        </FacilityProvider>
      );

      // In default guest/admin mode, renders switcher container and button
      assert.ok(html.includes('data-testid="facility-switcher-container"'));
      assert.ok(html.includes('data-testid="facility-switcher-btn"'));
      assert.ok(html.includes('aria-label="Select RRSL Facility Node"'));
      assert.ok(html.includes("RRSL Faridabad"));
      assert.ok(html.includes("NABL TC-5421"));
    });

    test("adheres to Maanak design system high-contrast borders and geometry", () => {
      const html = renderToStaticMarkup(
        <FacilityProvider>
          <FacilitySwitcher />
        </FacilityProvider>
      );

      assert.ok(html.includes("border-neutral-300 dark:border-neutral-700"));
      assert.ok(html.includes("rounded-2xl"));
    });
  });

  describe("3. DashboardView Multi-Facility Adaptation", () => {
    test("renders facility scope bar with facility name and NABL badge", () => {
      const html = renderToStaticMarkup(
        <FacilityProvider>
          <DashboardView />
        </FacilityProvider>
      );

      assert.ok(html.includes('data-testid="dashboard-facility-bar"'));
      assert.ok(html.includes("RRSL Faridabad (NABL TC-5421)"));
      assert.ok(html.includes("NABL TC-5421"));
      assert.ok(html.includes("Northern Zone Jurisdiction"));
    });

    test("renders multi-facility quick filter buttons for administrative switching", () => {
      const html = renderToStaticMarkup(
        <FacilityProvider>
          <DashboardView />
        </FacilityProvider>
      );

      assert.ok(html.includes('data-testid="dashboard-facility-switcher"'));
      assert.ok(html.includes('data-testid="filter-facility-all"'));
      assert.ok(html.includes('data-testid="filter-facility-rrsl-fbd"'));
      assert.ok(html.includes('data-testid="filter-facility-rrsl-amd"'));
      assert.ok(html.includes('data-testid="filter-facility-rrsl-blr"'));
      assert.ok(html.includes('data-testid="filter-facility-rrsl-bbi"'));
      assert.ok(html.includes('data-testid="filter-facility-rrsl-vns"'));
      assert.ok(html.includes('data-testid="filter-facility-rrsl-gau"'));
    });

    test("displays facility-specific KPI metrics and calibration counts", () => {
      const fbdStats = FACILITY_METRICS_MAP["rrsl-fbd"];
      const amdStats = FACILITY_METRICS_MAP["rrsl-amd"];
      const nationalStats = FACILITY_METRICS_MAP["ALL"];

      // Individual RRSL stats
      assert.strictEqual(fbdStats.activeCount, 14);
      assert.strictEqual(fbdStats.approvedCount, 8);
      assert.strictEqual(fbdStats.complianceRate, "94.2%");

      assert.strictEqual(amdStats.activeCount, 12);
      assert.strictEqual(amdStats.approvedCount, 7);
      assert.strictEqual(amdStats.complianceRate, "96.1%");

      // National aggregated stats
      assert.strictEqual(nationalStats.activeCount, 48);
      assert.strictEqual(nationalStats.approvedCount, 28);
      assert.strictEqual(nationalStats.complianceRate, "95.8%");
      assert.strictEqual(nationalStats.weightsValidBadge, "ALL 114 WORKING STANDARDS VALID");
    });

    test("renders recent verification sessions with branch node indicator tag", () => {
      const html = renderToStaticMarkup(
        <FacilityProvider>
          <DashboardView />
        </FacilityProvider>
      );

      assert.ok(html.includes("TS-2026-0142"));
      assert.ok(html.includes("RRSL-FBD"));
      assert.ok(html.includes("Essae DS-215"));
    });
  });
});
