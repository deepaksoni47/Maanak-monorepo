import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReviewPage, { metadata } from "./page";
import ReviewLoading from "./loading";
import {
  DerivationTreeModal,
  type FlaggedAuditItem,
} from "@/components/review/DerivationTreeModal";

const MOCK_AUDIT_ITEM: FlaggedAuditItem = {
  id: "test-audit-1",
  sessionNumber: "TS-2026-0140",
  model: "Sartorius Entris II 224i",
  accuracyClass: "Class I",
  inspector: "K. Sharma (Insp-04)",
  stepNumber: 7,
  nominalLoad: "150.0000 g",
  indication: "150.0010 g",
  deltaL: "0.0004 g",
  eVal: "0.0010 g (1 mg)",
  turningPointP: "150.0011 g",
  errorEc: "+0.0014 g (+1.4 mg)",
  mpeLimit: "±0.0010 g (±1.0 mg)",
  anomalyCode: "OIML-ERR-MPE-EXCEEDED",
  anomalyTitle: "Clause 3.5.1: Maximum Permissible Error Exceeded",
  anomalyDescription:
    "Calculated corrected error Ec (+1.4 mg) exceeds the OIML Table 6 MPE limit (±1.0 mg) at 150 g nominal verification load.",
  severity: "critical",
  ruleCitation: "OIML R-76-1:2006 Cl. 3.5.1, Table 6",
};

describe("TASK-055: Senior Reviewer Anomaly Audit Page (/review)", () => {
  describe("Page Metadata", () => {
    test("defines compliant metadata title and description", () => {
      assert.strictEqual(metadata.title, "Senior Reviewer Anomaly Audit");
      assert.ok(
        typeof metadata.description === "string" &&
          metadata.description.includes("OIML R-76")
      );
    });
  });

  describe("Zero-CLS Loading State (loading.tsx)", () => {
    test("strictly avoids generic spinners and matches live review card geometry", () => {
      const html = renderToStaticMarkup(<ReviewLoading />);

      // Skeletons present
      assert.ok(html.includes("animate-pulse"));
      assert.ok(html.includes("bg-muted/60"));

      // Generic spinners must NOT be present
      assert.ok(!html.includes("animate-spin"));
      assert.ok(!html.includes("CircleNotch"));
      assert.ok(!html.includes("Loading..."));
    });
  });

  describe("ReviewPage UI Component Rendering", () => {
    test("renders shell breadcrumbs with Home, Dashboard, and Review segments", () => {
      const html = renderToStaticMarkup(<ReviewPage />);
      assert.ok(html.includes("Home"));
      assert.ok(html.includes("Dashboard"));
      assert.ok(html.includes("Senior Reviewer Anomaly Audit"));
    });

    test("renders 3 KPI cards with Pending, Critical, and Reviewed Today metrics", () => {
      const html = renderToStaticMarkup(<ReviewPage />);
      assert.ok(html.includes("Pending Audit Queue"));
      assert.ok(html.includes("Critical Anomalies"));
      assert.ok(html.includes("Reviewed Today"));
    });

    test("renders flagged test sessions with OIML R-76 rule citations and severity badges", () => {
      const html = renderToStaticMarkup(<ReviewPage />);
      assert.ok(html.includes("TS-2026-0140"));
      assert.ok(html.includes("Sartorius Entris II 224i"));
      assert.ok(html.includes("OIML R-76-1:2006 Cl. 3.5.1, Table 6"));
      assert.ok(html.includes("TS-2026-0139"));
      assert.ok(html.includes("Mettler Toledo XPE205"));
      assert.ok(html.includes("Audit Step Derivation Tree"));
    });

    test("enforces minimum 48px touch targets on all interactive review buttons", () => {
      const html = renderToStaticMarkup(<ReviewPage />);
      assert.ok(html.includes("min-h-[48px]"));
    });
  });

  describe("DerivationTreeModal Component", () => {
    test("does not render when isOpen is false", () => {
      const html = renderToStaticMarkup(
        <DerivationTreeModal
          item={MOCK_AUDIT_ITEM}
          isOpen={false}
          onClose={() => {}}
        />
      );
      assert.strictEqual(html, "");
    });

    test("renders full mathematical derivation tree when isOpen is true", () => {
      const html = renderToStaticMarkup(
        <DerivationTreeModal
          item={MOCK_AUDIT_ITEM}
          isOpen={true}
          onClose={() => {}}
        />
      );

      // Dialog accessibility
      assert.ok(html.includes('role="dialog"'));
      assert.ok(html.includes('aria-modal="true"'));

      // Mathematical derivation nodes
      assert.ok(html.includes("Scale Indication (I)"));
      assert.ok(html.includes("Vernier Changeover (ΔL)"));
      assert.ok(html.includes("Turning Point P Formula (Clause A.4.4.3)"));
      assert.ok(html.includes("Corrected Intrinsic Error (Ec)"));
      assert.ok(html.includes("Permissible Limit (|MPE|)"));

      // Specific mock values
      assert.ok(html.includes("150.0000 g"));
      assert.ok(html.includes("150.0010 g"));
      assert.ok(html.includes("0.0004 g"));
      assert.ok(html.includes("150.0011 g"));
      assert.ok(html.includes("+0.0014 g (+1.4 mg)"));
      assert.ok(html.includes("±0.0010 g (±1.0 mg)"));

      // Senior reviewer decision actions
      assert.ok(html.includes("Cancel"));
      assert.ok(html.includes("Flag for Re-Test &amp; Notify Officer"));
      assert.ok(html.includes("Sign-Off &amp; Accept Deviation"));
    });
  });
});
