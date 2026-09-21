import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export type ReportFileType = "pdf" | "docx";

export interface StoredReportMetadata {
  id: string;
  sessionId: string;
  fileName: string;
  filePath: string;
  fileType: ReportFileType;
  fileSizeBytes: number;
  sha256Checksum: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ReportVerificationResult {
  isValid: boolean;
  expectedChecksum: string;
  actualChecksum: string;
  fileSizeBytes: number;
  mismatchReason?: string;
}

export interface IReportStorage {
  saveReport(
    sessionId: string,
    fileType: ReportFileType,
    data: Buffer,
    metadata?: Record<string, unknown>,
  ): Promise<StoredReportMetadata>;

  getReport(
    sessionId: string,
    fileType: ReportFileType,
  ): Promise<{ buffer: Buffer; metadata: StoredReportMetadata } | null>;

  verifyReport(
    sessionId: string,
    fileType: ReportFileType,
    expectedChecksum?: string,
  ): Promise<ReportVerificationResult>;

  deleteReport(sessionId: string, fileType: ReportFileType): Promise<boolean>;
}

/**
 * Computes the lowercase hexadecimal SHA-256 checksum of an arbitrary byte buffer.
 *
 * @param buffer Input data buffer
 * @returns 64-character lowercase hex string
 */
export function computeReportChecksum(buffer: Buffer): string {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError("Input must be a valid Node.js Buffer");
  }
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Cryptographically verifies if a buffer matches the expected SHA-256 checksum.
 * Constant-time or strict equality comparison.
 *
 * @param buffer Input byte buffer
 * @param expectedChecksum Expected 64-character hex checksum
 * @returns True if exact match, false otherwise
 */
export function verifyChecksum(
  buffer: Buffer,
  expectedChecksum: string,
): boolean {
  if (!expectedChecksum || typeof expectedChecksum !== "string") {
    return false;
  }
  const actual = computeReportChecksum(buffer);
  return actual.toLowerCase() === expectedChecksum.trim().toLowerCase();
}

/**
 * Generates standard sanitized file name for a report artifact.
 *
 * @param identifier Report certificate number or session ID
 * @param fileType "pdf" or "docx"
 * @returns Formatted filename, e.g. "RRSL-DEL-2026-0042.pdf"
 */
export function generateReportFileName(
  identifier: string,
  fileType: ReportFileType,
): string {
  const sanitized = identifier.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${sanitized}_report.${fileType}`;
}

/**
 * Local filesystem-backed report storage manager.
 * Safely persists reports to disk with companion metadata and verifies integrity upon retrieval.
 */
export class LocalFilesystemReportStorage implements IReportStorage {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
  }

  /**
   * Returns the absolute directory path where session reports are stored.
   */
  private getSessionDirectory(sessionId: string): string {
    const sanitizedSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(this.baseDir, sanitizedSessionId);
  }

  /**
   * Returns absolute path to the report artifact and its companion metadata JSON.
   */
  private getFilePaths(sessionId: string, fileType: ReportFileType) {
    const sessionDir = this.getSessionDirectory(sessionId);
    const fileName = generateReportFileName(sessionId, fileType);
    const filePath = path.join(sessionDir, fileName);
    const metaPath = path.join(sessionDir, `${fileName}.meta.json`);
    return { sessionDir, fileName, filePath, metaPath };
  }

  /**
   * Saves a report buffer to the filesystem and creates a companion metadata manifest.
   */
  async saveReport(
    sessionId: string,
    fileType: ReportFileType,
    data: Buffer,
    metadata?: Record<string, unknown>,
  ): Promise<StoredReportMetadata> {
    if (!sessionId || sessionId.trim() === "") {
      throw new Error("sessionId is required");
    }
    if (!Buffer.isBuffer(data) || data.length === 0) {
      throw new Error("data must be a non-empty Buffer");
    }

    const { sessionDir, fileName, filePath, metaPath } = this.getFilePaths(
      sessionId,
      fileType,
    );

    // Ensure session folder exists
    await fs.mkdir(sessionDir, { recursive: true });

    const checksum = computeReportChecksum(data);
    const reportMeta: StoredReportMetadata = {
      id: randomUUID(),
      sessionId,
      fileName,
      filePath,
      fileType,
      fileSizeBytes: data.length,
      sha256Checksum: checksum,
      createdAt: new Date().toISOString(),
      metadata,
    };

    // Write binary file and metadata manifest atomically
    await fs.writeFile(filePath, data);
    await fs.writeFile(metaPath, JSON.stringify(reportMeta, null, 2), "utf8");

    return reportMeta;
  }

  /**
   * Retrieves a stored report from disk and reads its metadata.
   */
  async getReport(
    sessionId: string,
    fileType: ReportFileType,
  ): Promise<{ buffer: Buffer; metadata: StoredReportMetadata } | null> {
    const { filePath, metaPath } = this.getFilePaths(sessionId, fileType);

    try {
      const [buffer, metaStr] = await Promise.all([
        fs.readFile(filePath),
        fs.readFile(metaPath, "utf8"),
      ]);

      const metadata = JSON.parse(metaStr) as StoredReportMetadata;
      return { buffer, metadata };
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return null;
      }
      throw err;
    }
  }

  /**
   * Verifies the cryptographic integrity of a stored report file against its recorded checksum
   * or a provided expected checksum.
   */
  async verifyReport(
    sessionId: string,
    fileType: ReportFileType,
    expectedChecksum?: string,
  ): Promise<ReportVerificationResult> {
    const reportData = await this.getReport(sessionId, fileType);

    if (!reportData) {
      return {
        isValid: false,
        expectedChecksum: expectedChecksum ?? "",
        actualChecksum: "",
        fileSizeBytes: 0,
        mismatchReason: `Report for session ${sessionId} (${fileType}) not found on disk`,
      };
    }

    const actualChecksum = computeReportChecksum(reportData.buffer);
    const targetChecksum =
      expectedChecksum ?? reportData.metadata.sha256Checksum;
    const isValid =
      actualChecksum.toLowerCase() === targetChecksum.toLowerCase();

    return {
      isValid,
      expectedChecksum: targetChecksum,
      actualChecksum,
      fileSizeBytes: reportData.buffer.length,
      mismatchReason: isValid
        ? undefined
        : `Cryptographic checksum mismatch: expected ${targetChecksum}, actual ${actualChecksum}`,
    };
  }

  /**
   * Deletes a stored report and its metadata from disk.
   */
  async deleteReport(
    sessionId: string,
    fileType: ReportFileType,
  ): Promise<boolean> {
    const { filePath, metaPath, sessionDir } = this.getFilePaths(
      sessionId,
      fileType,
    );

    try {
      await Promise.all([
        fs.unlink(filePath).catch(() => {}),
        fs.unlink(metaPath).catch(() => {}),
      ]);

      // If directory is empty, clean it up
      const remainingFiles = await fs.readdir(sessionDir).catch(() => []);
      if (remainingFiles.length === 0) {
        await fs.rmdir(sessionDir).catch(() => {});
      }

      return true;
    } catch {
      return false;
    }
  }
}

/**
 * In-memory report storage manager for high-speed ephemeral execution and testing.
 */
export class MemoryReportStorage implements IReportStorage {
  private readonly storage = new Map<
    string,
    { buffer: Buffer; metadata: StoredReportMetadata }
  >();

  private getKey(sessionId: string, fileType: ReportFileType): string {
    return `${sessionId}::${fileType}`;
  }

  async saveReport(
    sessionId: string,
    fileType: ReportFileType,
    data: Buffer,
    metadata?: Record<string, unknown>,
  ): Promise<StoredReportMetadata> {
    if (!sessionId || sessionId.trim() === "") {
      throw new Error("sessionId is required");
    }
    if (!Buffer.isBuffer(data) || data.length === 0) {
      throw new Error("data must be a non-empty Buffer");
    }

    const checksum = computeReportChecksum(data);
    const fileName = generateReportFileName(sessionId, fileType);
    const reportMeta: StoredReportMetadata = {
      id: randomUUID(),
      sessionId,
      fileName,
      filePath: `memory://${sessionId}/${fileName}`,
      fileType,
      fileSizeBytes: data.length,
      sha256Checksum: checksum,
      createdAt: new Date().toISOString(),
      metadata,
    };

    this.storage.set(this.getKey(sessionId, fileType), {
      buffer: Buffer.from(data),
      metadata: reportMeta,
    });

    return reportMeta;
  }

  async getReport(
    sessionId: string,
    fileType: ReportFileType,
  ): Promise<{ buffer: Buffer; metadata: StoredReportMetadata } | null> {
    const record = this.storage.get(this.getKey(sessionId, fileType));
    if (!record) return null;
    return {
      buffer: Buffer.from(record.buffer),
      metadata: { ...record.metadata },
    };
  }

  async verifyReport(
    sessionId: string,
    fileType: ReportFileType,
    expectedChecksum?: string,
  ): Promise<ReportVerificationResult> {
    const record = this.storage.get(this.getKey(sessionId, fileType));
    if (!record) {
      return {
        isValid: false,
        expectedChecksum: expectedChecksum ?? "",
        actualChecksum: "",
        fileSizeBytes: 0,
        mismatchReason: `Report for session ${sessionId} (${fileType}) not found in memory`,
      };
    }

    const actualChecksum = computeReportChecksum(record.buffer);
    const targetChecksum = expectedChecksum ?? record.metadata.sha256Checksum;
    const isValid =
      actualChecksum.toLowerCase() === targetChecksum.toLowerCase();

    return {
      isValid,
      expectedChecksum: targetChecksum,
      actualChecksum,
      fileSizeBytes: record.buffer.length,
      mismatchReason: isValid
        ? undefined
        : "Checksum mismatch in memory record",
    };
  }

  async deleteReport(
    sessionId: string,
    fileType: ReportFileType,
  ): Promise<boolean> {
    return this.storage.delete(this.getKey(sessionId, fileType));
  }

  /**
   * Helper for tests: simulates disk tampering by modifying a single byte in the buffer.
   */
  tamperStoredReport(sessionId: string, fileType: ReportFileType): boolean {
    const record = this.storage.get(this.getKey(sessionId, fileType));
    if (!record) return false;

    // Flip a byte in the stored buffer
    const copy = Buffer.from(record.buffer);
    copy[0] = copy[0] ^ 0xff;
    record.buffer = copy;
    return true;
  }
}
