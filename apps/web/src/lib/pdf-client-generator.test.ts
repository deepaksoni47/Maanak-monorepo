import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { generateClientSideOimlPdf, type ClientPdfReportData } from "./pdf-client-generator";

describe("Client-Side OIML PDF Generator (pdf-client-generator.ts)", () => {
  const sampleData: ClientPdfReportData = {
    reportNumber: "RRSL-AHM-2026-0042",
    sessionId: "sess-2026-verify-001",
    issueDate: "2026-09-28",
    instrument: {
      model: "Avery Weigh-Tronix AW-PRO-15K",
      serialNumber: "SN-2026-990142",
      accuracyClass: "Class III",
      maxCapacity: "15.0 kg",
      minCapacity: "0.100 kg",
      e: "0.005 kg",
      d: "0.001 kg",
      n: "3000",
    },
    signature: {
      signedBy: "Dr. Rajesh Sharma",
      signatoryTitle: "Director (Legal Metrology), RRSL Ahmedabad",
      issuer: "National Root CA - Legal Metrology Section 22 Class 3 DSC",
      algorithm: "RSA-2048 / SHA-256 with PKCS#7 Attached Signature",
      timestampUtc: "2026-09-28T12:00:00Z",
      signatureHash: "9f8a2c14e6b7d3058a74e9c1f6d3a82e5b4c7d0182f6e9a3c5b8d7e14a2f09c6",
    },
  };

  it("compiles a valid A4 PDF document containing embedded National Emblem and QR code", async () => {
    const pdfBytes = await generateClientSideOimlPdf(sampleData);
    assert.ok(pdfBytes instanceof Uint8Array);
    assert.ok(pdfBytes.length > 5000, "PDF buffer must be non-trivial");

    // Load PDF back with pdf-lib to verify structure
    const pdfDoc = await PDFDocument.load(pdfBytes);
    assert.equal(pdfDoc.getPageCount(), 1);

    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();
    assert.ok(Math.abs(width - 595.28) < 1, "Page width should be standard A4");
    assert.ok(Math.abs(height - 841.89) < 1, "Page height should be standard A4");

    // Validate image streams are present in PDF (National Emblem and QR Code)
    const pdfRawString = Buffer.from(pdfBytes).toString("latin1");
    assert.ok(
      pdfRawString.includes("/Subtype /Image") || pdfRawString.includes("/Image"),
      "PDF must contain embedded images for National Emblem and verification QR",
    );
  });
});
