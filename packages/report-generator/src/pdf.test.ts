import { describe, it } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
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

  describe("TASK-080: PDF Report Annex Evidence Embedder (High-Res Photo & Sealing Diagram)", () => {
    // 1x1 valid sample image buffers for unit tests
    const samplePngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    const sampleJpgBuffer = Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
      "base64",
    );

    it("compiles 6-page PDF report with embedded nameplate photo and sealing diagram on Annex Page 6", async () => {
      const reportWithEvidence: OimlReportData = {
        ...sampleReportData,
        reportNumber: "RRSL-DEL-2026-EVID-01",
        evidenceAttachments: [
          {
            type: "NAMEPLATE_PHOTO",
            imageBuffer: samplePngBuffer,
            fileName: "unit_nameplate_rating_tag.png",
            mimeType: "image/png",
            fileHashSha256: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
            description: "High-resolution macro photo of indelible scale rating plate showing Max 15kg and e=5g.",
          },
          {
            type: "SEALING_DIAGRAM",
            imageBuffer: sampleJpgBuffer,
            fileName: "physical_sealing_location_plan.jpg",
            mimeType: "image/jpeg",
            fileHashSha256: "a1c4356789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            description: "CAD schematic of physical wire/lead seal locations and calibration locking screws.",
          },
        ],
      };

      const result = await compileOimlPdfReport(reportWithEvidence);

      assert.ok(Buffer.isBuffer(result.pdfBuffer));
      assert.equal(
        result.pageCount,
        6,
        "Must compile exactly 6 pages (5 core pages + 1 Annex page for 2 attachments)",
      );

      const parsedPdf = await PDFDocument.load(result.pdfBuffer);
      assert.equal(parsedPdf.getPageCount(), 6);

      const annexPage = parsedPdf.getPage(5);
      const { width, height } = annexPage.getSize();
      assert.ok(Math.abs(width - 595.28) < 1);
      assert.ok(Math.abs(height - 841.89) < 1);

      // Helper to extract all decoded text from PDF content streams
      const extractAllPdfText = (doc: PDFDocument): string => {
        let allText = "";
        for (const [, obj] of doc.context.enumerateIndirectObjects()) {
          if ((obj as any).getContents) {
            try {
              const decomp = zlib
                .inflateSync(Buffer.from((obj as any).getContents()))
                .toString();
              const hexMatches = decomp.match(/<([0-9A-Fa-f]+)>/g) || [];
              for (const h of hexMatches) {
                allText +=
                  Buffer.from(h.slice(1, -1), "hex").toString("utf-8") + " ";
              }
            } catch {}
          }
        }
        return allText;
      };

      const extractedText = extractAllPdfText(parsedPdf);
      assert.ok(extractedText.includes("ANNEX A"));
      assert.ok(extractedText.includes("NAMEPLATE"));
      assert.ok(extractedText.includes("SEALING"));
      assert.ok(extractedText.includes("SHA-256 Watermark:"));
      assert.ok(
        extractedText.includes(
          "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
        ),
      );
      assert.ok(extractedText.includes("WELMEC 7.2 INTEGRITY: ANCHORED"));
      assert.ok(extractedText.includes("Lead/wire security seal"));

      // Verify embedded image XObject streams are present in PDF
      const pdfString = result.pdfBuffer.toString("latin1");
      const imgMatches = pdfString.match(/\/Subtype \/Image/g) || [];
      assert.ok(
        imgMatches.length >= 3,
        "Must contain QR code image and embedded evidence images",
      );
    });

    it("dynamically allocates multiple Annex pages when evidence count exceeds 2", async () => {
      const reportWith3Items: OimlReportData = {
        ...sampleReportData,
        reportNumber: "RRSL-DEL-2026-EVID-02",
        evidenceAttachments: [
          {
            type: "NAMEPLATE_PHOTO",
            imageBuffer: samplePngBuffer,
            fileName: "photo1.png",
            fileHashSha256: "1111111111111111111111111111111111111111111111111111111111111111",
          },
          {
            type: "SEALING_DIAGRAM",
            imageBuffer: sampleJpgBuffer,
            fileName: "diagram1.jpg",
            fileHashSha256: "2222222222222222222222222222222222222222222222222222222222222222",
          },
          {
            type: "CIRCUIT_SCHEMATIC",
            fileName: "schematic1.pdf",
            mimeType: "application/pdf",
            fileHashSha256: "3333333333333333333333333333333333333333333333333333333333333333",
            description: "PCB layout and junction box wiring diagram.",
          },
        ],
      };

      const result = await compileOimlPdfReport(reportWith3Items);
      assert.equal(
        result.pageCount,
        7,
        "Must compile exactly 7 pages (5 core pages + 2 Annex pages for 3 attachments)",
      );

      const parsedPdf = await PDFDocument.load(result.pdfBuffer);
      assert.equal(parsedPdf.getPageCount(), 7);

      let allText = "";
      for (const [, obj] of parsedPdf.context.enumerateIndirectObjects()) {
        if ((obj as any).getContents) {
          try {
            const decomp = zlib
              .inflateSync(Buffer.from((obj as any).getContents()))
              .toString();
            const hexMatches = decomp.match(/<([0-9A-Fa-f]+)>/g) || [];
            for (const h of hexMatches) {
              allText +=
                Buffer.from(h.slice(1, -1), "hex").toString("utf-8") + " ";
            }
          } catch {}
        }
      }

      assert.ok(allText.includes("PART 1/2"));
      assert.ok(allText.includes("PART 2/2"));
    });

    it("renders wireframe graphic placeholder gracefully when imageBuffer is not provided", async () => {
      const reportWithPlaceholder: OimlReportData = {
        ...sampleReportData,
        reportNumber: "RRSL-DEL-2026-EVID-03",
        evidenceAttachments: [
          {
            type: "USER_MANUAL",
            fileName: "handbook.pdf",
            mimeType: "application/pdf",
            fileHashSha256: "4444444444444444444444444444444444444444444444444444444444444444",
            description: "Operating instructions and verification manual excerpt.",
          },
        ],
      };

      const result = await compileOimlPdfReport(reportWithPlaceholder);
      assert.equal(result.pageCount, 6);

      const parsedPdf = await PDFDocument.load(result.pdfBuffer);
      let allText = "";
      for (const [, obj] of parsedPdf.context.enumerateIndirectObjects()) {
        if ((obj as any).getContents) {
          try {
            const decomp = zlib
              .inflateSync(Buffer.from((obj as any).getContents()))
              .toString();
            const hexMatches = decomp.match(/<([0-9A-Fa-f]+)>/g) || [];
            for (const h of hexMatches) {
              allText +=
                Buffer.from(h.slice(1, -1), "hex").toString("utf-8") + " ";
            }
          } catch {}
        }
      }

      assert.ok(allText.includes("HIGH-RESOLUTION EVIDENCE VAULT ATTACHMENT"));
      assert.ok(
        allText.includes(
          "4444444444444444444444444444444444444444444444444444444444444444",
        ),
      );
    });
  });

  // -------------------------------------------------------------------------
  // TASK-089: Forms 7–14 Modular Test Report Schema Extension
  // -------------------------------------------------------------------------
  describe("TASK-089: Forms 7–14 Modular Test Report Schema Extension", () => {
    it("compiles 6-page PDF report with Forms 7–9 (Warm-up, Span Stability, Tare Accuracy) on dedicated Modular Evaluation Page", async () => {
      const modularReportData: OimlReportData = {
        ...sampleReportData,
        reportNumber: "RRSL-DEL-2026-MOD-789",
        results: {
          ...sampleReportData.results,
          form7WarmUp: {
            warmUpMinutes: 30,
            zeroErrorAtStart: 0.0005,
            zeroErrorAfterWarmUp: 0.0001,
            loadErrorAtStart: 0.001,
            loadErrorAfterWarmUp: 0.0002,
            testLoad: 15.0,
            mpe: 0.005,
            status: "PASS",
          },
          form8SpanStability: {
            initialSpan: 15.0,
            finalSpan: 15.0002,
            spanDrift: 0.0002,
            maxAllowedDrift: 0.0025,
            testLoad: 15.0,
            durationDays: 28,
            status: "PASS",
          },
          form9TareAccuracy: {
            tareLoad: 2.5,
            netLoad: 10.0,
            netIndication: 10.0001,
            netError: 0.0001,
            mpe: 0.005,
            status: "PASS",
          },
        },
      };

      const result = await compileOimlPdfReport(modularReportData);
      assert.equal(result.pageCount, 6);

      const parsedPdf = await PDFDocument.load(result.pdfBuffer);
      assert.equal(parsedPdf.getPageCount(), 6);

      let allText = "";
      for (const [, obj] of parsedPdf.context.enumerateIndirectObjects()) {
        if ((obj as any).getContents) {
          try {
            const decomp = zlib
              .inflateSync(Buffer.from((obj as any).getContents()))
              .toString();
            const hexMatches = decomp.match(/<([0-9A-Fa-f]+)>/g) || [];
            for (const h of hexMatches) {
              allText +=
                Buffer.from(h.slice(1, -1), "hex").toString("utf-8") + " ";
            }
          } catch {}
        }
      }

      assert.ok(allText.includes("FORM 7: WARM-UP TIME TEST"));
      assert.ok(allText.includes("FORM 8: LONG-TERM SPAN STABILITY"));
      assert.ok(allText.includes("FORM 9: TARE WEIGHING ACCURACY"));
    });

    it("compiles 6-page PDF report with Forms 10–14 (Voltage Variations & Electrical Disturbance Battery)", async () => {
      const disturbanceReportData: OimlReportData = {
        ...sampleReportData,
        reportNumber: "RRSL-DEL-2026-DIST-1014",
        results: {
          ...sampleReportData.results,
          form10VoltageVariation: {
            nominalVoltage: 230,
            testedVoltages: [
              { voltage: 195.5, indication: 15.0001, error: 0.0001, mpe: 0.005, pass: true },
              { voltage: 230.0, indication: 15.0000, error: 0.0, mpe: 0.005, pass: true },
              { voltage: 253.0, indication: 15.0002, error: 0.0002, mpe: 0.005, pass: true },
            ],
            status: "PASS",
          },
          form11MainsDips: {
            reductionPercent: 100,
            cyclesCount: 10,
            maxObservedFault: 0.0001,
            significantFaultLimit: 0.005,
            status: "PASS",
          },
          form12ElectricalBursts: {
            testVoltageKv: 1.0,
            couplingLines: "Power Mains AC",
            maxObservedFault: 0.0002,
            significantFaultLimit: 0.005,
            status: "PASS",
          },
          form13ElectrostaticDischarge: {
            contactDischargeKv: 6.0,
            airDischargeKv: 8.0,
            dischargesCount: 10,
            maxObservedFault: 0.0001,
            significantFaultLimit: 0.005,
            status: "PASS",
          },
          form14ElectromagneticImmunity: {
            fieldStrengthVPerM: 10,
            frequencyRangeMhz: "80-2000 MHz",
            maxObservedFault: 0.0003,
            significantFaultLimit: 0.005,
            status: "PASS",
          },
        },
      };

      const result = await compileOimlPdfReport(disturbanceReportData);
      assert.equal(result.pageCount, 6);

      const parsedPdf = await PDFDocument.load(result.pdfBuffer);
      assert.equal(parsedPdf.getPageCount(), 6);

      let allText = "";
      for (const [, obj] of parsedPdf.context.enumerateIndirectObjects()) {
        if ((obj as any).getContents) {
          try {
            const decomp = zlib
              .inflateSync(Buffer.from((obj as any).getContents()))
              .toString();
            const hexMatches = decomp.match(/<([0-9A-Fa-f]+)>/g) || [];
            for (const h of hexMatches) {
              allText +=
                Buffer.from(h.slice(1, -1), "hex").toString("utf-8") + " ";
            }
          } catch {}
        }
      }

      assert.ok(allText.includes("FORM 10: VOLTAGE VARIATIONS TEST"));
      assert.ok(allText.includes("FORMS 11-14: ELECTRICAL DISTURBANCES"));
    });

    it("compiles 7-page PDF report with complete Forms 1–14 suite", async () => {
      const fullSuiteReportData: OimlReportData = {
        ...sampleReportData,
        reportNumber: "RRSL-DEL-2026-FULL-1TO14",
        results: {
          ...sampleReportData.results,
          form7WarmUp: {
            warmUpMinutes: 30,
            zeroErrorAtStart: 0.0005,
            zeroErrorAfterWarmUp: 0.0001,
            loadErrorAtStart: 0.001,
            loadErrorAfterWarmUp: 0.0002,
            testLoad: 15.0,
            mpe: 0.005,
            status: "PASS",
          },
          form8SpanStability: {
            initialSpan: 15.0,
            finalSpan: 15.0002,
            spanDrift: 0.0002,
            maxAllowedDrift: 0.0025,
            testLoad: 15.0,
            status: "PASS",
          },
          form9TareAccuracy: {
            tareLoad: 2.5,
            netLoad: 10.0,
            netIndication: 10.0,
            netError: 0.0,
            mpe: 0.005,
            status: "PASS",
          },
          form10VoltageVariation: {
            nominalVoltage: 230,
            testedVoltages: [],
            status: "PASS",
          },
          form11MainsDips: {
            reductionPercent: 100,
            cyclesCount: 10,
            maxObservedFault: 0.0001,
            significantFaultLimit: 0.005,
            status: "PASS",
          },
          form12ElectricalBursts: {
            testVoltageKv: 1.0,
            couplingLines: "Power Mains AC",
            maxObservedFault: 0.0001,
            significantFaultLimit: 0.005,
            status: "PASS",
          },
          form13ElectrostaticDischarge: {
            contactDischargeKv: 6.0,
            airDischargeKv: 8.0,
            dischargesCount: 10,
            maxObservedFault: 0.0001,
            significantFaultLimit: 0.005,
            status: "PASS",
          },
          form14ElectromagneticImmunity: {
            fieldStrengthVPerM: 10,
            frequencyRangeMhz: "80-2000 MHz",
            maxObservedFault: 0.0001,
            significantFaultLimit: 0.005,
            status: "PASS",
          },
        },
      };

      const result = await compileOimlPdfReport(fullSuiteReportData);
      assert.equal(result.pageCount, 7);
      assert.ok(result.pdfBuffer.length > 5000);
    });
  });

  describe("TASK-090: Forms 15–17 Administrative Checklist & Marking Verification", () => {
    it("compiles 6-page PDF report with Forms 15–17 (Software examination, markings, sealing) on dedicated Administrative Page", async () => {
      const adminReportData: OimlReportData = {
        ...sampleReportData,
        reportNumber: "RRSL-DEL-2026-ADMIN-01",
        results: {
          ...sampleReportData.results,
          form15SoftwareExamination: {
            softwareId: "FW-v3.4.1-REL",
            checksumHex: "SHA256:7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E",
            welmecRiskClass: "Risk Class C / Extension D",
            items: [
              {
                id: "item-15-1",
                requirement: "Software Identification & Checksum Display",
                welmecClause: "W-7.2 §2.1",
                status: "PASS",
                remarks: "Checksum matches reference firmware binary",
              },
              {
                id: "item-15-2",
                requirement: "Software Separation of Legally Relevant Functions",
                welmecClause: "W-7.2 §2.2",
                status: "PASS",
                remarks: "Type P instrument software partition sealed",
              },
            ],
            overallStatus: "PASS",
          },
          form16DescriptiveMarkings: {
            items: [
              {
                id: "item-16-1",
                markingItem: "Manufacturer Name & Trade Mark",
                oimlClause: "7.1.1",
                presentedValue: "Avery Weigh-Tronix India",
                status: "PASS",
              },
              {
                id: "item-16-2",
                markingItem: "Metrological Limits (Max, Min, e, d)",
                oimlClause: "7.1.1",
                presentedValue: "Class III | Max=15kg Min=100g e=5g",
                status: "PASS",
              },
            ],
            overallStatus: "PASS",
          },
          form17SealingVerification: {
            physicalSealCount: 3,
            electronicEventCounterValue: "EC-0089",
            items: [
              {
                id: "item-17-1",
                sealItem: "Calibration Lock Switch Hardware Seal",
                oimlClause: "4.1.2.4",
                status: "PASS",
                remarks: "Lead-and-wire seal intact with RRSL stamp",
              },
              {
                id: "item-17-2",
                sealItem: "Official Verification Mark Stamping Area",
                oimlClause: "4.1.2.5",
                status: "PASS",
                remarks: "8mm diameter smooth copper insert on front bezel",
              },
            ],
            overallStatus: "PASS",
          },
        },
      };

      const result = await compileOimlPdfReport(adminReportData);
      assert.equal(result.pageCount, 6);
      assert.ok(result.pdfBuffer.length > 5000);
      assert.ok(result.compilationTimeMs < 1500);

      // Verify the PDF can be parsed cleanly
      const loadedDoc = await PDFDocument.load(result.pdfBuffer);
      assert.equal(loadedDoc.getPageCount(), 6);
    });

    it("compiles 8-page PDF report with complete Forms 1–17 suite (Standard 1–6 + Modular 7–9 + Disturbances 10–14 + Administrative 15–17)", async () => {
      const fullCompleteReportData: OimlReportData = {
        ...sampleReportData,
        reportNumber: "RRSL-DEL-2026-COMPLETE-17",
        results: {
          ...sampleReportData.results,
          form7WarmUp: {
            warmUpMinutes: 30,
            zeroErrorAtStart: 0.0005,
            zeroErrorAfterWarmUp: 0.0001,
            loadErrorAtStart: 0.001,
            loadErrorAfterWarmUp: 0.0002,
            testLoad: 15.0,
            mpe: 0.005,
            status: "PASS",
          },
          form8SpanStability: {
            initialSpan: 15.0,
            finalSpan: 15.0002,
            spanDrift: 0.0002,
            maxAllowedDrift: 0.0025,
            testLoad: 15.0,
            status: "PASS",
          },
          form9TareAccuracy: {
            tareLoad: 2.5,
            netLoad: 10.0,
            netIndication: 10.0,
            netError: 0.0,
            mpe: 0.005,
            status: "PASS",
          },
          form10VoltageVariation: {
            nominalVoltage: 230,
            testedVoltages: [],
            status: "PASS",
          },
          form11MainsDips: {
            reductionPercent: 100,
            cyclesCount: 10,
            maxObservedFault: 0.0001,
            significantFaultLimit: 0.005,
            status: "PASS",
          },
          form12ElectricalBursts: {
            testVoltageKv: 1.0,
            couplingLines: "Power Mains AC",
            maxObservedFault: 0.0001,
            significantFaultLimit: 0.005,
            status: "PASS",
          },
          form13ElectrostaticDischarge: {
            contactDischargeKv: 6.0,
            airDischargeKv: 8.0,
            dischargesCount: 10,
            maxObservedFault: 0.0001,
            significantFaultLimit: 0.005,
            status: "PASS",
          },
          form14ElectromagneticImmunity: {
            fieldStrengthVPerM: 10,
            frequencyRangeMhz: "80-2000 MHz",
            maxObservedFault: 0.0001,
            significantFaultLimit: 0.005,
            status: "PASS",
          },
          form15SoftwareExamination: {
            softwareId: "FW-v3.4.1-REL",
            checksumHex: "SHA256:7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E",
            welmecRiskClass: "Risk Class C / Extension D",
            items: [],
            overallStatus: "PASS",
          },
          form16DescriptiveMarkings: {
            items: [],
            overallStatus: "PASS",
          },
          form17SealingVerification: {
            physicalSealCount: 2,
            electronicEventCounterValue: "EC-0042",
            items: [],
            overallStatus: "PASS",
          },
        },
      };

      const result = await compileOimlPdfReport(fullCompleteReportData);
      assert.equal(result.pageCount, 8);
      assert.ok(result.pdfBuffer.length > 5000);

      const loadedDoc = await PDFDocument.load(result.pdfBuffer);
      assert.equal(loadedDoc.getPageCount(), 8);
    });
  });
});

