import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Breadcrumbs } from "./Breadcrumbs";
import { MobileNav, MAIN_NAV_ITEMS } from "./MobileNav";
import { Shell } from "./Shell";

describe("TASK-048: Universal Responsive Mobile Shell & Navigation", () => {
  describe("Breadcrumbs Component", () => {
    test("renders accessible nav landmark with aria-label='Breadcrumbs'", () => {
      const html = renderToStaticMarkup(
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Dashboard" }]} />
      );
      assert.ok(html.includes('aria-label="Breadcrumbs"'));
      assert.ok(html.includes("<ol"));
      assert.ok(html.includes("<li"));
    });

    test("sets aria-current='page' on the active / last breadcrumb item", () => {
      const html = renderToStaticMarkup(
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Bench Execution", href: "/bench" },
            { label: "Session TS-2026-0089" },
          ]}
        />
      );
      assert.ok(html.includes('aria-current="page"'));
      assert.ok(html.includes("Session TS-2026-0089"));
      // Intermediate item should be an anchor tag
      assert.ok(html.includes('href="/bench"'));
    });

    test("falls back to default Home segment when items array is empty", () => {
      const html = renderToStaticMarkup(<Breadcrumbs items={[]} />);
      assert.ok(html.includes('aria-label="Breadcrumbs"'));
      assert.ok(html.includes("Home"));
    });
  });

  describe("MobileNav Component & Routes", () => {
    test("exposes all mandatory legal metrology route targets", () => {
      const routes = MAIN_NAV_ITEMS.map((item) => item.href);
      assert.ok(routes.includes("/dashboard"), "Missing /dashboard route");
      assert.ok(routes.includes("/instruments"), "Missing /instruments route");
      assert.ok(routes.includes("/bench"), "Missing /bench route");
      assert.ok(routes.includes("/review") || routes.includes("/reviews"), "Missing /review route");
      assert.ok(routes.includes("/reports"), "Missing /reports route");
      assert.ok(routes.includes("/provenance"), "Missing /provenance route");
      assert.ok(routes.includes("/rule-packs"), "Missing /rule-packs route");
      assert.ok(routes.includes("/weights"), "Missing /weights route");
      assert.ok(routes.includes("/verify"), "Missing /verify route");
      assert.strictEqual(MAIN_NAV_ITEMS.length, 9);
    });

    test("renders mobile hamburger button with min 48px touch target and accessibility label", () => {
      const html = renderToStaticMarkup(<MobileNav />);
      assert.ok(
        html.includes('aria-label="Open navigation menu"'),
        "Missing open navigation aria-label"
      );
      // Verify min 48px touch target styling (w-12 h-12 is 48px x 48px)
      assert.ok(html.includes("w-12 h-12"), "Button touch target should be >= 48px (w-12 h-12)");
    });

    test("renders mobile bottom navigation bar with key workbench tabs", () => {
      const html = renderToStaticMarkup(<MobileNav />);
      assert.ok(
        html.includes('aria-label="Mobile Bottom Navigation"'),
        "Missing bottom navigation landmark"
      );
      assert.ok(html.includes('href="/dashboard"'), "Bottom bar missing dashboard link");
      assert.ok(html.includes('href="/bench"'), "Bottom bar missing bench link");
      assert.ok(html.includes('href="/instruments"'), "Bottom bar missing instruments link");
      assert.ok(html.includes('href="/reports"'), "Bottom bar missing reports link");
    });
  });

  describe("Shell Component", () => {
    test("renders desktop sidebar with persistent navigation and officer footer", () => {
      const html = renderToStaticMarkup(
        <Shell pageTitle="Test Session Bench">
          <div id="test-content">Observation Entry Panel</div>
        </Shell>
      );

      // Desktop aside presence with w-64 width
      assert.ok(html.includes("<aside"), "Shell should contain desktop sidebar <aside>");
      assert.ok(html.includes("w-64"), "Sidebar should have fixed w-64 desktop width");

      // Verify officer designation and WELMEC service status
      assert.ok(html.includes("R. K. Verma") || html.includes("Officer") || html.includes("Legal Metrology"), "Sidebar should display testing officer");
      assert.ok(html.includes("Facility") || html.includes("RRSL") || html.includes("Officer"), "Sidebar should display testing facility");
      assert.ok(html.includes("WELMEC 7.2 Service"), "Sidebar should display WELMEC status");

      // Main content rendering
      assert.ok(html.includes("Test Session Bench"), "Page title should be rendered");
      assert.ok(html.includes("Observation Entry Panel"), "Children should be rendered in main container");
    });

    test("renders sticky bottom action bar slot when provided", () => {
      const html = renderToStaticMarkup(
        <Shell
          bottomActionBar={
            <button id="save-btn" type="button">
              Save Observation &amp; Next Load
            </button>
          }
        >
          <div>Bench View</div>
        </Shell>
      );
      assert.ok(html.includes("Save Observation &amp; Next Load"));
      assert.ok(html.includes("fixed bottom-14 lg:bottom-0"), "Bottom action bar should be fixed");
    });
  });

  describe("TASK-069: Navbar 404 Route Resolutions", () => {
    test("renders InstrumentsPage without 404", () => {
      const InstrumentsPage = require("@/app/instruments/page").default;
      const html = renderToStaticMarkup(<InstrumentsPage />);
      assert.ok(html.includes("NAWI Instrument Registry"));
      assert.ok(html.includes("DS-215 Precision Counter"));
    });

    test("renders ReportsIndexPage without 404", () => {
      const ReportsPage = require("@/app/reports/page").default;
      const html = renderToStaticMarkup(<ReportsPage />);
      assert.ok(html.includes("OIML R 76-2 Test Reports &amp; Certificates") || html.includes("OIML R 76-2 Test Reports & Certificates"));
      assert.ok(html.includes("CERT-2026-0142"));
    });

    test("renders PublicVerifyLookupPage without 404", () => {
      const VerifyLookupPage = require("@/app/verify/page").default;
      const html = renderToStaticMarkup(<VerifyLookupPage />);
      assert.ok(html.includes("National Metrological Verification Portal"));
      assert.ok(html.includes("Verify Certificate Authenticity"));
    });

    test("renders RulePacksPage without 404", () => {
      const RulePacksPage = require("@/app/rule-packs/page").default;
      const html = renderToStaticMarkup(<RulePacksPage />);
      assert.ok(html.includes("Standards-as-Code &amp; Statutory Rule Packs") || html.includes("Standards-as-Code & Statutory Rule Packs"));
      assert.ok(html.includes("OIML R-76-1:2006 Edition"));
    });

    test("renders ProvenancePage without 404", () => {
      const ProvenancePage = require("@/app/provenance/page").default;
      const html = renderToStaticMarkup(<ProvenancePage />);
      assert.ok(html.includes("WELMEC 7.2 Cryptographic Provenance Ledger"));
      assert.ok(html.includes("Chronological Cryptographic Event Blocks"));
    });
  });
});
