import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compileOimlDocxReport } from "./docx.js";
import type { OimlReportData } from "./pdf.js";

describe("TASK-035: Editable Word Document (.docx) Compiler (docx.ts)", () => {
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
        ],
        status: "PASS",
      },
      form2TemperatureDrift: {
        temperatureSteps: [
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

  it("compiles valid .docx buffer under benchmark threshold (< 1.5 seconds)", async () => {
    const result = await compileOimlDocxReport(sampleReportData);

    assert.ok(Buffer.isBuffer(result.docxBuffer));
    assert.ok(result.docxBuffer.length > 5000, "DOCX file must be substantial");
    assert.equal(result.reportNumber, "RRSL-DEL-2026-0042");
    assert.ok(
      result.compilationTimeMs < 1500,
      `Compilation took ${result.compilationTimeMs}ms, exceeding 1500ms limit`,
    );
  });

  it("generates standard OpenXML / ZIP file structure with PK magic bytes", async () => {
    const result = await compileOimlDocxReport(sampleReportData);
    const buf = result.docxBuffer;

    // Standard ZIP magic bytes: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
    assert.equal(buf[0], 0x50, "Must have PK ZIP header byte 0");
    assert.equal(buf[1], 0x4b, "Must have PK ZIP header byte 1");
    assert.equal(buf[2], 0x03, "Must have PK ZIP header byte 2");
    assert.equal(buf[3], 0x04, "Must have PK ZIP header byte 3");

    // Convert raw buffer to string to verify internal OpenXML parts
    const rawString = buf.toString("latin1");
    assert.ok(
      rawString.includes("[Content_Types].xml"),
      "Must contain OpenXML Content_Types",
    );
    assert.ok(
      rawString.includes("word/document.xml"),
      "Must contain Word document XML part",
    );
    assert.ok(
      rawString.includes("word/media/"),
      "Must contain embedded QR code media part",
    );
  });

  it("contains expected certificate text and metrological data in the document archive", async () => {
    const result = await compileOimlDocxReport(sampleReportData);
    const docXml = extractZipEntry(result.docxBuffer, "word/document.xml");

    assert.ok(
      docXml,
      "Must successfully extract and decompress word/document.xml",
    );
    // Validates that report numbers, laboratory details, and test clauses are present in the document
    assert.ok(
      docXml.includes("RRSL-DEL-2026-0042"),
      "Must contain Certificate Number",
    );
    assert.ok(docXml.includes("Faridabad"), "Must contain Laboratory City");
    assert.ok(docXml.includes("AW-PRO-15K"), "Must contain Model Number");
    assert.ok(
      docXml.includes("WEIGHING PERFORMANCE"),
      "Must contain Form 1 Header",
    );
    assert.ok(
      docXml.includes("TEMPERATURE EFFECT"),
      "Must contain Form 2 Header",
    );
    assert.ok(docXml.includes("ECCENTRICITY"), "Must contain Form 3 Header");
  });
});

function extractZipEntry(zipBuffer: Buffer, entryName: string): string | null {
  const zlib = require("node:zlib");
  let offset = 0;
  while (offset < zipBuffer.length - 4) {
    if (zipBuffer.readUInt32LE(offset) === 0x04034b50) {
      const compMethod = zipBuffer.readUInt16LE(offset + 8);
      const compressedSize = zipBuffer.readUInt32LE(offset + 18);
      const fileNameLen = zipBuffer.readUInt16LE(offset + 26);
      const extraLen = zipBuffer.readUInt16LE(offset + 28);
      const fileName = zipBuffer.toString(
        "utf8",
        offset + 30,
        offset + 30 + fileNameLen,
      );
      const dataOffset = offset + 30 + fileNameLen + extraLen;

      if (fileName === entryName) {
        const slice = zipBuffer.subarray(
          dataOffset,
          dataOffset + compressedSize,
        );
        if (compMethod === 8) {
          return zlib.inflateRawSync(slice).toString("utf8");
        } else if (compMethod === 0) {
          return slice.toString("utf8");
        }
      }
      offset = dataOffset + compressedSize;
    } else {
      offset++;
    }
  }
  return null;
}
