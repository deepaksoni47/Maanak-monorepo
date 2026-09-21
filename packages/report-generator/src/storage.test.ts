import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  computeReportChecksum,
  verifyChecksum,
  generateReportFileName,
  MemoryReportStorage,
  LocalFilesystemReportStorage,
} from "./storage.js";
import { compileOimlPdfReport, type OimlReportData } from "./pdf.js";
import { compileOimlDocxReport } from "./docx.js";

describe("TASK-036: Report Storage & SHA-256 Checksum Verification (storage.ts)", () => {
  const samplePdfData = Buffer.from(
    "%PDF-1.7 ... dummy pdf content for testing ... %%EOF",
  );
  const sampleSessionId = "session-2026-xyz-001";

  const sampleReportData: OimlReportData = {
    reportNumber: "RRSL-DEL-2026-0042",
    issueDate: "2026-09-21",
    laboratory: {
      name: "Regional Reference Standards Laboratory (RRSL), Faridabad",
      signatoryName: "Dr. A. K. Sharma",
      signatoryDesignation: "Director",
    },
    instrument: {
      manufacturer: "Avery",
      model: "AW-PRO-15K",
      serialNumber: "SN-990142",
      accuracyClass: "Class III",
      maxCapacity: "15.0",
      minCapacity: "0.100",
      verificationIntervalE: "0.005",
      unit: "kg",
    },
    environmental: {
      temperatureStartC: 22.4,
      temperatureEndC: 23.1,
      humidityPercent: 54,
    },
    provenance: {
      sessionHash:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      verifyBaseUrl: "https://verify.maanak.gov.in",
    },
    results: {
      overallStatus: "PASS",
      form1Weighing: {
        observations: [
          {
            loadMass: "0.000",
            calculatedIndicationP: "0.000",
            rawErrorE: "0.000",
            zeroErrorE0: "0.000",
            correctedErrorEc: "0.000",
            applicableMpe: "0.0025",
            pass: true,
          },
          {
            loadMass: "15.000",
            calculatedIndicationP: "15.001",
            rawErrorE: "0.001",
            zeroErrorE0: "0.000",
            correctedErrorEc: "0.001",
            applicableMpe: "0.0075",
            pass: true,
          },
        ],
        status: "PASS",
      },
    },
  };

  describe("Checksum Calculations & Verification Utilities", () => {
    it("computes standard SHA-256 matching NIST vector for empty buffer", () => {
      const emptyHash = computeReportChecksum(Buffer.from(""));
      assert.equal(
        emptyHash,
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      );
    });

    it("produces 64-character lowercase hex checksum", () => {
      const checksum = computeReportChecksum(samplePdfData);
      assert.equal(checksum.length, 64);
      assert.match(checksum, /^[0-9a-f]{64}$/);
    });

    it("verifies checksum correctly and handles casing", () => {
      const checksum = computeReportChecksum(samplePdfData);
      assert.ok(verifyChecksum(samplePdfData, checksum));
      assert.ok(verifyChecksum(samplePdfData, checksum.toUpperCase()));
      assert.strictEqual(verifyChecksum(samplePdfData, "0".repeat(64)), false);
      assert.strictEqual(verifyChecksum(samplePdfData, ""), false);
    });

    it("generates standardized report filenames", () => {
      assert.equal(
        generateReportFileName("RRSL/DEL/2026", "pdf"),
        "RRSL_DEL_2026_report.pdf",
      );
      assert.equal(
        generateReportFileName("SESSION-001", "docx"),
        "SESSION-001_report.docx",
      );
    });
  });

  describe("MemoryReportStorage Operations", () => {
    it("saves, retrieves, and verifies report in memory", async () => {
      const storage = new MemoryReportStorage();

      const meta = await storage.saveReport(
        sampleSessionId,
        "pdf",
        samplePdfData,
        {
          officer: "A. K. Sharma",
        },
      );

      assert.equal(meta.sessionId, sampleSessionId);
      assert.equal(meta.fileType, "pdf");
      assert.equal(meta.fileSizeBytes, samplePdfData.length);
      assert.equal(meta.sha256Checksum, computeReportChecksum(samplePdfData));

      // Retrieve
      const retrieved = await storage.getReport(sampleSessionId, "pdf");
      assert.ok(retrieved !== null);
      assert.deepEqual(retrieved.buffer, samplePdfData);

      // Verify
      const verification = await storage.verifyReport(sampleSessionId, "pdf");
      assert.ok(verification.isValid);
      assert.equal(verification.actualChecksum, meta.sha256Checksum);
    });

    it("detects tampering in memory report buffer (Acceptance Criteria)", async () => {
      const storage = new MemoryReportStorage();
      await storage.saveReport(sampleSessionId, "pdf", samplePdfData);

      // Simulate bit tampering
      const tampered = storage.tamperStoredReport(sampleSessionId, "pdf");
      assert.ok(tampered);

      const verification = await storage.verifyReport(sampleSessionId, "pdf");
      assert.strictEqual(
        verification.isValid,
        false,
        "Tampered buffer must fail verification",
      );
      assert.ok(verification.mismatchReason);
      assert.notEqual(
        verification.actualChecksum,
        verification.expectedChecksum,
      );
    });

    it("deletes report cleanly from memory", async () => {
      const storage = new MemoryReportStorage();
      await storage.saveReport(
        sampleSessionId,
        "docx",
        Buffer.from("dummy docx"),
      );

      const deleted = await storage.deleteReport(sampleSessionId, "docx");
      assert.ok(deleted);

      const retrieved = await storage.getReport(sampleSessionId, "docx");
      assert.strictEqual(retrieved, null);
    });
  });

  describe("LocalFilesystemReportStorage End-to-End Integration", () => {
    let tempDir: string;
    let storage: LocalFilesystemReportStorage;

    before(async () => {
      tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), "maanak-storage-test-"),
      );
      storage = new LocalFilesystemReportStorage(tempDir);
    });

    after(async () => {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    });

    it("saves real compiled PDF, persists to disk, and verifies checksum", async () => {
      // 1. Compile official PDF report (from TASK-034)
      const { pdfBuffer } = await compileOimlPdfReport(sampleReportData);

      // 2. Save report to disk
      const meta = await storage.saveReport(
        "SESSION-PDF-001",
        "pdf",
        pdfBuffer,
        {
          reportNumber: sampleReportData.reportNumber,
        },
      );

      assert.ok(meta.fileSizeBytes > 5000);
      assert.equal(meta.sha256Checksum, computeReportChecksum(pdfBuffer));

      // 3. Retrieve from disk
      const retrieved = await storage.getReport("SESSION-PDF-001", "pdf");
      assert.ok(retrieved !== null);
      assert.equal(retrieved.buffer.length, pdfBuffer.length);
      assert.deepEqual(retrieved.buffer, pdfBuffer);

      // 4. Verify integrity on disk
      const verification = await storage.verifyReport("SESSION-PDF-001", "pdf");
      assert.ok(verification.isValid);
      assert.equal(verification.actualChecksum, meta.sha256Checksum);
    });

    it("saves real compiled DOCX, persists to disk, and verifies checksum", async () => {
      // 1. Compile official DOCX report (from TASK-035)
      const { docxBuffer } = await compileOimlDocxReport(sampleReportData);

      // 2. Save report to disk
      const meta = await storage.saveReport(
        "SESSION-DOCX-001",
        "docx",
        docxBuffer,
      );
      assert.ok(meta.fileSizeBytes > 5000);

      // 3. Verify integrity
      const verification = await storage.verifyReport(
        "SESSION-DOCX-001",
        "docx",
      );
      assert.ok(verification.isValid);
      assert.equal(verification.actualChecksum, meta.sha256Checksum);
    });

    it("detects disk tampering when file bytes are altered on disk (Acceptance Criteria)", async () => {
      const sessionId = "SESSION-TAMPER-TEST";
      const originalBuffer = Buffer.from(
        "Original uncorrupted PDF report stream",
      );

      const meta = await storage.saveReport(sessionId, "pdf", originalBuffer);

      // Directly modify the file on disk to simulate bit rot or malicious tampering
      const corruptedBuffer = Buffer.from(originalBuffer);
      corruptedBuffer[5] = corruptedBuffer[5] ^ 0xff; // Flip a single byte
      await fs.writeFile(meta.filePath, corruptedBuffer);

      // Verification must immediately detect the mismatch
      const verification = await storage.verifyReport(sessionId, "pdf");
      assert.strictEqual(
        verification.isValid,
        false,
        "Must flag altered file on disk",
      );
      assert.ok(
        verification.mismatchReason?.includes(
          "Cryptographic checksum mismatch",
        ),
      );
      assert.notEqual(verification.actualChecksum, meta.sha256Checksum);
    });

    it("deletes stored report and cleans up disk files", async () => {
      const sessionId = "SESSION-DELETE-TEST";
      await storage.saveReport(sessionId, "pdf", Buffer.from("To be deleted"));

      const deleted = await storage.deleteReport(sessionId, "pdf");
      assert.ok(deleted);

      const retrieved = await storage.getReport(sessionId, "pdf");
      assert.strictEqual(retrieved, null);
    });
  });
});
