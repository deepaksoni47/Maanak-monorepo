import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EvidenceVaultCard, EvidenceItem } from "./EvidenceVaultCard";

describe("TASK-079: EvidenceVaultCard & Photo Intake Component", () => {
  const sampleEvidence: EvidenceItem[] = [
    {
      id: "ev-1",
      testSessionId: "session-abc-123",
      category: "NAMEPLATE_PHOTO",
      fileName: "scale-rating-plate.jpg",
      fileStoragePath: "https://res.cloudinary.com/maanak/image/upload/v1/scale-rating-plate.jpg",
      mimeType: "image/jpeg",
      fileHashSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      sizeBytes: 2048576,
      storageProvider: "cloudinary",
      createdAt: new Date("2026-09-24T10:00:00Z"),
    },
    {
      id: "ev-2",
      testSessionId: "session-abc-123",
      category: "SEALING_DIAGRAM",
      fileName: "lead_wire_sealing.png",
      fileStoragePath: "/evidence/lead_wire_sealing.png",
      mimeType: "image/png",
      fileHashSha256: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
      sizeBytes: 1048576,
      storageProvider: "local",
      createdAt: new Date("2026-09-24T10:30:00Z"),
    },
  ];

  test("renders vault container with header and category counter badges", () => {
    const html = renderToStaticMarkup(
      <EvidenceVaultCard sessionId="session-abc-123" initialItems={sampleEvidence} />
    );

    assert.ok(html.includes("Statutory Evidence Vault"));
    assert.ok(html.includes("Rule 5(2) Compliant"));
    assert.ok(html.includes("WELMEC 7.2 provenance"));
    assert.ok(html.includes("Nameplate &amp; Markings") || html.includes("Nameplate & Markings"));
    assert.ok(html.includes("Sealing Plan &amp; Diagram") || html.includes("Sealing Plan & Diagram"));
    assert.ok(html.includes("Circuit Schematics"));
    assert.ok(html.includes("Manual &amp; Docs") || html.includes("Manual & Docs"));
    assert.ok(html.includes("2 Files Anchored"));
  });

  test("renders uploaded evidence items with file names, sizes, and SHA-256 fingerprint", () => {
    const html = renderToStaticMarkup(
      <EvidenceVaultCard sessionId="session-abc-123" initialItems={sampleEvidence} />
    );

    assert.ok(html.includes("scale-rating-plate.jpg"));
    assert.ok(html.includes("2000.6 KB"));
    assert.ok(html.includes("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"));
    assert.ok(html.includes("SHA-256:"));
    assert.ok(html.includes("cloudinary"));
  });

  test("renders camera capture input with capture environment attribute and action buttons", () => {
    const html = renderToStaticMarkup(
      <EvidenceVaultCard sessionId="session-abc-123" />
    );

    assert.ok(html.includes('capture="environment"'));
    assert.ok(html.includes("Take Photo (Camera)"));
    assert.ok(html.includes("Choose File / PDF"));
    assert.ok(html.includes("Supported formats:"));
  });

  test("renders empty state guidance when no items are attached to category", () => {
    const html = renderToStaticMarkup(
      <EvidenceVaultCard sessionId="session-abc-123" initialItems={[]} />
    );

    assert.ok(html.includes("No evidence files uploaded for this category yet"));
    assert.ok(html.includes("Use the camera or upload button above"));
  });

  test("disables upload and camera action buttons when disabled prop is true", () => {
    const html = renderToStaticMarkup(
      <EvidenceVaultCard sessionId="session-abc-123" disabled={true} />
    );

    assert.ok(html.includes("disabled"));
  });
});
