import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import {
  generateTestKeyPairAndCertificate,
  signReportDigest,
  extractPdfSignatureMetadata,
} from "@maanak/crypto-provenance";
import { compileOimlPdfReport, type OimlReportData } from "./pdf.js";

describe("TASK-034: Official OIML R 76-2 Multi-Page PDF Compiler (pdf.ts)", () => {
  const sampleReportData: OimlReportData = {
    reportNumber: "RRSL-DEL-2026-0042",
    issueDate: "2026-09-21",
    laboratory: {
      name: "Regional Reference Standards Laboratory (RRSL), Faridabad",
      address: "Plot No. 1, Metrology Complex, Faridabad, Haryana - 121001",
      accreditationNumber: "NABL CC-2026-MET-001",
      signatoryName: "Dr. A. K. Sharma",
      signatoryDesignation: "Director & Authorized Legal Metrology Signatory",
    },
    instrument: {
      manufacturer: "Avery Weigh-Tronix India Ltd.",
      model: "AW-PRO-15K",
      serialNumber: "SN-2026-990142",
      accuracyClass: "Class III",
      maxCapacity: "15.0",
      minCapacity: "0.100",
      verificationIntervalE: "0.005",
      actualIntervalD: "0.001",
      unit: "kg",
    },
    environmental: {
      temperatureStartC: 22.4,
      temperatureEndC: 23.1,
      humidityPercent: 54,
      barometricPressureHpa: 1012.8,
    },
    provenance: {
      sessionHash:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      verifyBaseUrl: "https://verify.maanak.gov.in",
      genesisHash:
        "0000000000000000000000000000000000000000000000000000000000000000",
      totalChainNodes: 16,
    },
    results: {
      overallStatus: "PASS",
      form1Weighing: {
        observations: [
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
            loadMass: "0.100",
            calculatedIndicationP: "0.1002",
            rawErrorE: "0.0002",
            zeroErrorE0: "0.0000",
            correctedErrorEc: "0.0002",
            applicableMpe: "0.0025",
            pass: true,
          },
          {
            loadMass: "2.500",
            calculatedIndicationP: "2.5005",
            rawErrorE: "0.0005",
            zeroErrorE0: "0.0000",
            correctedErrorEc: "0.0005",
            applicableMpe: "0.0025",
            pass: true,
          },
          {
            loadMass: "5.000",
            calculatedIndicationP: "5.0008",
            rawErrorE: "0.0008",
            zeroErrorE0: "0.0000",
            correctedErrorEc: "0.0008",
            applicableMpe: "0.0050",
            pass: true,
          },
          {
            loadMass: "10.000",
            calculatedIndicationP: "10.0010",
            rawErrorE: "0.0010",
            zeroErrorE0: "0.0000",
            correctedErrorEc: "0.0010",
            applicableMpe: "0.0050",
            pass: true,
          },
          {
            loadMass: "15.000",
            calculatedIndicationP: "15.0015",
            rawErrorE: "0.0015",
            zeroErrorE0: "0.0000",
            correctedErrorEc: "0.0015",
            applicableMpe: "0.0075",
            pass: true,
          },
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
        ],
        status: "PASS",
      },
      form2TemperatureDrift: {
        temperatureSteps: [
          { tempC: 20, zeroIndication: 0.0, error: 0.0, mpe: 0.0025 },
          { tempC: 40, zeroIndication: 0.0004, error: 0.0004, mpe: 0.0025 },
          { tempC: -10, zeroIndication: -0.0003, error: -0.0003, mpe: 0.0025 },
          { tempC: 5, zeroIndication: 0.0001, error: 0.0001, mpe: 0.0025 },
          { tempC: 20, zeroIndication: 0.0, error: 0.0, mpe: 0.0025 },
        ],
        maxDriftRateCPerHr: 0.4,
        maxDriftRateAllowed: 5.0,
        status: "PASS",
      },
      form3Eccentricity: {
        testLoad: 5.0,
        positions: [
          {
            name: "Center",
            indication: 5.0005,
            error: 0.0005,
            mpe: 0.005,
            pass: true,
          },
          {
            name: "Front-Left",
            indication: 5.0006,
            error: 0.0006,
            mpe: 0.005,
            pass: true,
          },
          {
            name: "Back-Left",
            indication: 5.0004,
            error: 0.0004,
            mpe: 0.005,
            pass: true,
          },
          {
            name: "Back-Right",
            indication: 5.0005,
            error: 0.0005,
            mpe: 0.005,
            pass: true,
          },
          {
            name: "Front-Right",
            indication: 5.0007,
            error: 0.0007,
            mpe: 0.005,
            pass: true,
          },
        ],
        status: "PASS",
      },
      form4Discrimination: {
        loads: [
          {
            load: 0.1,
            extraLoad: 0.0014,
            initialI: 0.1,
            newI: 0.101,
            pass: true,
          },
          {
            load: 7.5,
            extraLoad: 0.0014,
            initialI: 7.5,
            newI: 7.501,
            pass: true,
          },
          {
            load: 15.0,
            extraLoad: 0.0014,
            initialI: 15.0,
            newI: 15.001,
            pass: true,
          },
        ],
        status: "PASS",
      },
      form5Repeatability: {
        runs: [
          {
            load: 7.5,
            count: 10,
            minI: 7.5,
            maxI: 7.501,
            spread: 0.001,
            maxAllowedSpread: 0.005,
            pass: true,
          },
          {
            load: 15.0,
            count: 10,
            minI: 15.0,
            maxI: 15.0015,
            spread: 0.0015,
            maxAllowedSpread: 0.0075,
            pass: true,
          },
        ],
        status: "PASS",
      },
      form6Creep: {
        testLoad: 15.0,
        durationMinutes: 30,
        initialError: 0.0015,
        maxCreepError: 0.0005,
        zeroReturnError: 0.0002,
        maxAllowedCreep: 0.00375,
        status: "PASS",
      },
    },
  };

  it("compiles multi-page PDF report within benchmark threshold (< 1.5 seconds)", async () => {
    const result = await compileOimlPdfReport(sampleReportData);

    assert.ok(Buffer.isBuffer(result.pdfBuffer));
    assert.ok(
      result.pdfBuffer.length > 5000,
      "PDF buffer must contain substantial document content",
    );
    assert.equal(
      result.pageCount,
      5,
      "Must compile exactly 5 pages for Forms 1-6",
    );
    assert.ok(
      result.compilationTimeMs < 1500,
      `Compilation time (${result.compilationTimeMs}ms) must be under 1.5s threshold`,
    );
  });

  it("generates valid PDF byte stream with proper header and trailer", async () => {
    const result = await compileOimlPdfReport(sampleReportData);
    const pdfString = result.pdfBuffer.toString("latin1");

    // PDF Magic header: %PDF-1.x
    assert.ok(pdfString.startsWith("%PDF-"));
    // PDF EOF marker
    assert.ok(pdfString.includes("%%EOF"));
  });

  it("can be reloaded and parsed cleanly by PDFDocument", async () => {
    const result = await compileOimlPdfReport(sampleReportData);
    const parsedPdf = await PDFDocument.load(result.pdfBuffer);

    assert.equal(parsedPdf.getPageCount(), 5);
    const pages = parsedPdf.getPages();
    assert.equal(pages.length, 5);

    // Each page conforms to standard A4 size (595.28 x 841.89 pt)
    for (const p of pages) {
      const { width, height } = p.getSize();
      assert.ok(Math.abs(width - 595.28) < 1);
      assert.ok(Math.abs(height - 841.89) < 1);
    }
  });

  it("embeds public verification QR code on Page 1", async () => {
    const result = await compileOimlPdfReport(sampleReportData);
    const pdfDoc = await PDFDocument.load(result.pdfBuffer);
    const page1 = pdfDoc.getPage(0);
    assert.ok(page1);

    // QR Image stream XObject check in compiled PDF
    const pdfString = result.pdfBuffer.toString("latin1");
    assert.ok(
      pdfString.includes("/Subtype /Image") || pdfString.includes("/Image"),
    );
  });

  it("integrates seamlessly with TASK-031 X.509 PKI Digital Signature Service", async () => {
    // 1. Compile the 5-page PDF report
    const { pdfBuffer } = await compileOimlPdfReport(sampleReportData);

    // 2. Generate RSA key pair & self-signed X.509 certificate for signer
    const { privateKeyPem, certificatePem } =
      await generateTestKeyPairAndCertificate({
        commonName: "Dr. A. K. Sharma",
        organization: "Regional Reference Standards Laboratory",
        country: "IN",
      });

    // 3. Digitally sign the compiled PDF report
    const signedPdf = await signReportDigest(
      pdfBuffer,
      privateKeyPem,
      certificatePem,
      {
        signerName: "Dr. A. K. Sharma",
        reason: "Official Metrological Verification Approval",
        location: "Faridabad, India",
      },
    );

    assert.ok(Buffer.isBuffer(signedPdf));
    assert.ok(
      signedPdf.length > pdfBuffer.length,
      "Signed PDF must contain signature dictionary",
    );

    // 4. Extract and verify digital signature metadata
    const sigList = extractPdfSignatureMetadata(signedPdf, certificatePem);
    assert.equal(sigList.length, 1, "Must detect exactly 1 embedded signature");
    const sigMetadata = sigList[0];
    assert.ok(
      sigMetadata.isValidSignature,
      "Cryptographic signature verification must pass",
    );
    assert.equal(sigMetadata.name, "Dr. A. K. Sharma");
    assert.equal(
      sigMetadata.reason,
      "Official Metrological Verification Approval",
    );
  });
});
