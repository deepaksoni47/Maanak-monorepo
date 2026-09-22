import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import VerifyPage, { generateMetadata } from "./page";
import VerifyLoading from "./loading";

const AUTHENTIC_HASH =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const TAMPERED_HASH = "tampered-hash-violation";

describe("TASK-057: Public Verification QR Landing Page (/verify/[hash])", () => {
  describe("Page Metadata", () => {
    test("generates compliant dynamic metadata title and description", async () => {
      const meta = await generateMetadata({
        params: Promise.resolve({ hash: AUTHENTIC_HASH }),
      });
      const title = typeof meta.title === "string" ? meta.title : "";
      assert.ok(title.includes("Public Verification"));
      assert.ok(
        typeof meta.description === "string" &&
          meta.description.includes("OIML R-76")
      );
    });
  });

  describe("Zero-CLS Loading State (loading.tsx)", () => {
    test("strictly avoids generic spinners and matches live verification portal geometry", () => {
      const html = renderToStaticMarkup(<VerifyLoading />);

      // Skeletons present
      assert.ok(html.includes("animate-pulse"));
      assert.ok(html.includes("bg-muted"));

      // Generic spinners must NOT be present
      assert.ok(!html.includes("animate-spin"));
      assert.ok(!html.includes("CircleNotch"));
      assert.ok(!html.includes("Loading..."));
    });
  });

  describe("Authentic Hash Verification Rendering", () => {
    test("renders shell breadcrumbs with Home, Public Verification segments", async () => {
      const PageComponent = await VerifyPage({
        params: Promise.resolve({ hash: AUTHENTIC_HASH }),
      });
      const html = renderToStaticMarkup(PageComponent);

      assert.ok(html.includes("Home"));
      assert.ok(html.includes("Public Verification"));
      assert.ok(html.includes("e3b0c442..."));
    });

    test("renders AUTHENTIC & UNTAMPERED banner with LEGAL FOR TRADE statutory stamp", async () => {
      const PageComponent = await VerifyPage({
        params: Promise.resolve({ hash: AUTHENTIC_HASH }),
      });
      const html = renderToStaticMarkup(PageComponent);

      assert.ok(html.includes("AUTHENTIC &amp; UNTAMPERED"));
      assert.ok(html.includes("Cryptographic Integrity Confirmed"));
      assert.ok(html.includes("LEGAL FOR TRADE"));
    });

    test("renders NAWI instrument specifications and link to official calibration certificate", async () => {
      const PageComponent = await VerifyPage({
        params: Promise.resolve({ hash: AUTHENTIC_HASH }),
      });
      const html = renderToStaticMarkup(PageComponent);

      assert.ok(html.includes("Essae-Teraoka DS-215"));
      assert.ok(html.includes("SN-2026-ES-00984"));
      assert.ok(html.includes("Class III (Medium)"));
      assert.ok(html.includes("RRSL-OIML-2026-0089"));
      assert.ok(html.includes("RRSL Ahmedabad (NABL CC-2189)"));
      assert.ok(html.includes("/reports/TS-2026-0142"));
      assert.ok(html.includes("Inspect Official Calibration Certificate"));
    });

    test("renders WELMEC 7.2 cryptographic ledger details with copy action", async () => {
      const PageComponent = await VerifyPage({
        params: Promise.resolve({ hash: AUTHENTIC_HASH }),
      });
      const html = renderToStaticMarkup(PageComponent);

      assert.ok(html.includes("WELMEC 7.2 SHA-256 Ledger Provenance"));
      assert.ok(html.includes(AUTHENTIC_HASH));
      assert.ok(html.includes("FIPS 180-4 SHA-256"));
      assert.ok(html.includes("18 Block Events"));
      assert.ok(html.includes("Dr. Rajesh Sharma (Director)"));
    });

    test("enforces minimum 48px touch targets on buttons and inputs", async () => {
      const PageComponent = await VerifyPage({
        params: Promise.resolve({ hash: AUTHENTIC_HASH }),
      });
      const html = renderToStaticMarkup(PageComponent);

      assert.ok(html.includes("min-h-[48px]"));
    });
  });

  describe("Tampered / Invalid Hash Verification Rendering", () => {
    test("renders TAMPER DETECTED / UNVERIFIED warning banner and statutory citation", async () => {
      const PageComponent = await VerifyPage({
        params: Promise.resolve({ hash: TAMPERED_HASH }),
      });
      const html = renderToStaticMarkup(PageComponent);

      assert.ok(html.includes("TAMPER DETECTED / UNVERIFIED"));
      assert.ok(html.includes("Cryptographic Signature Mismatch"));
      assert.ok(html.includes("Legal Metrology Act, 2009"));
      assert.ok(html.includes("Section 24"));
    });
  });
});
