import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReportPage, { generateMetadata } from "./page";
import ReportLoading from "./loading";
import { SigningPinModal } from "@/components/reports/SigningPinModal";
import { VectorErrorCurve } from "@/components/reports/VectorErrorCurve";

describe("TASK-056: Report Preview & Director X.509 PKI Signing Page (/reports/[id])", () => {
  describe("Page Metadata", () => {
    test("generates compliant dynamic metadata title and description", async () => {
      const meta = await generateMetadata({
        params: Promise.resolve({ id: "TS-2026-0142" }),
      });
      assert.strictEqual(
        meta.title,
        "OIML R 76-2 Test Certificate #TS-2026-0142"
      );
      assert.ok(
        typeof meta.description === "string" &&
          meta.description.includes("OIML R 76-2")
      );
    });
  });

  describe("Zero-CLS Loading State (loading.tsx)", () => {
    test("strictly avoids generic spinners and matches live certificate geometry", () => {
      const html = renderToStaticMarkup(<ReportLoading />);

      // Skeletons present
      assert.ok(html.includes("animate-pulse"));
      assert.ok(html.includes("bg-muted"));

      // Generic spinners must NOT be present
      assert.ok(!html.includes("animate-spin"));
      assert.ok(!html.includes("CircleNotch"));
      assert.ok(!html.includes("Loading..."));
    });
  });

  describe("ReportPage UI Component Rendering", () => {
    test("renders shell breadcrumbs with Home, Dashboard, and Test Reports segments", async () => {
      const PageComponent = await ReportPage({
        params: Promise.resolve({ id: "TS-2026-0142" }),
      });
      const html = renderToStaticMarkup(PageComponent);

      assert.ok(html.includes("Home"));
      assert.ok(html.includes("Dashboard"));
      assert.ok(html.includes("Test Reports"));
      assert.ok(html.includes("TS-2026-0142"));
    });

    test("renders official institutional header and NABL accreditation number", async () => {
      const PageComponent = await ReportPage({
        params: Promise.resolve({ id: "TS-2026-0142" }),
      });
      const html = renderToStaticMarkup(PageComponent);

      assert.ok(
        html.includes(
          "Regional Reference Standard Laboratory (RRSL), Ahmedabad"
        )
      );
      assert.ok(html.includes("NABL ISO/IEC 17025 Accr. # CC-2189"));
      assert.ok(html.includes("Government of India"));
    });

    test("renders NAWI instrument specifications and Forms 1-6 summary table", async () => {
      const PageComponent = await ReportPage({
        params: Promise.resolve({ id: "TS-2026-0142" }),
      });
      const html = renderToStaticMarkup(PageComponent);

      // NAWI Specs
      assert.ok(html.includes("Essae DS-215"));
      assert.ok(html.includes("Class III (Medium)"));
      assert.ok(html.includes("15.000 kg"));
      assert.ok(html.includes("3,000 divisions"));

      // Forms 1-6
      assert.ok(html.includes("Form 1"));
      assert.ok(html.includes("Weighing Performance &amp; Hysteresis"));
      assert.ok(html.includes("Form 2"));
      assert.ok(html.includes("Temperature Drift on Zero"));
      assert.ok(html.includes("Form 3"));
      assert.ok(html.includes("Eccentric Loading (Corner Test)"));
      assert.ok(html.includes("Form 4"));
      assert.ok(html.includes("Discrimination (1.4d Test)"));
      assert.ok(html.includes("Form 5"));
      assert.ok(html.includes("Repeatability (10-Run Spread)"));
      assert.ok(html.includes("Form 6"));
      assert.ok(html.includes("30-Min Creep &amp; Zero Return"));
    });

    test("renders WELMEC 7.2 cryptographic provenance block with SHA-256 root and QR badge", async () => {
      const PageComponent = await ReportPage({
        params: Promise.resolve({ id: "TS-2026-0142" }),
      });
      const html = renderToStaticMarkup(PageComponent);

      assert.ok(
        html.includes("WELMEC 7.2 Software Guide Tamper-Evident Provenance Seal")
      );
      assert.ok(
        html.includes(
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        )
      );
      assert.ok(html.includes("18 Linked Nodes"));
    });

    test("enforces minimum 48px touch targets on signing and download action buttons", async () => {
      const PageComponent = await ReportPage({
        params: Promise.resolve({ id: "TS-2026-0142" }),
      });
      const html = renderToStaticMarkup(PageComponent);

      assert.ok(html.includes("min-h-[48px]"));
    });
  });

  describe("VectorErrorCurve Component", () => {
    test("renders pure SVG vector error curve with stepped MPE envelopes and data points", () => {
      const html = renderToStaticMarkup(<VectorErrorCurve maxCapacity={15} />);

      assert.ok(html.includes("Vector Error Curve (Ec vs Load)"));
      assert.ok(html.includes("<svg"));
      assert.ok(html.includes("+1.5e"));
      assert.ok(html.includes("-1.5e"));
      assert.ok(html.includes("15 kg"));
      assert.ok(html.includes("Ascending (▲)"));
      assert.ok(html.includes("Descending (▼)"));
    });
  });

  describe("SigningPinModal Component", () => {
    test("does not render when isOpen is false", () => {
      const html = renderToStaticMarkup(
        <SigningPinModal
          isOpen={false}
          reportId="TS-2026-0142"
          onClose={() => {}}
          onSignSuccess={() => {}}
        />
      );
      assert.strictEqual(html, "");
    });

    test("renders accessible PIN authorization dialog when isOpen is true", () => {
      const html = renderToStaticMarkup(
        <SigningPinModal
          isOpen={true}
          reportId="TS-2026-0142"
          onClose={() => {}}
          onSignSuccess={() => {}}
        />
      );

      // Accessibility
      assert.ok(html.includes('role="dialog"'));
      assert.ok(html.includes('aria-modal="true"'));

      // Signatory Identity & Issuer
      assert.ok(html.includes("Director X.509 PKI Signature"));
      assert.ok(html.includes("CN=Dr. Rajesh Sharma"));
      assert.ok(html.includes("CCA India / RSA-2048 / SHA-256"));

      // Keypad numbers
      assert.ok(html.includes("1"));
      assert.ok(html.includes("9"));
      assert.ok(html.includes("Clear"));
      assert.ok(html.includes("⌫"));

      // Action button
      assert.ok(html.includes("Confirm &amp; Digitally Sign Report"));
    });
  });
});
