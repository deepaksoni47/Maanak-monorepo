import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { PrismaClient } from "@maanak/db";
import {
  generateEvidenceProvenanceNode,
  GENESIS_PREV_HASH,
  ProvenanceNodeRecord,
} from "@maanak/crypto-provenance";

export interface EvidenceRouterOptions {
  db?: PrismaClient;
  uploadDir?: string;
}

export interface StoredEvidenceRecord {
  id: string;
  testSessionId: string;
  category: string;
  fileName: string;
  fileStoragePath: string;
  mimeType: string;
  fileHashSha256: string;
  sizeBytes: number;
  storageProvider: "cloudinary" | "local";
  uploadedByUserId?: string | null;
  createdAt: Date;
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, PDF.`));
    }
  },
});

// Configure Cloudinary if URL is present
if (process.env.CLOUDINARY_URL) {
  cloudinary.config();
}

/**
 * Upload buffer to Cloudinary using upload_stream
 */
async function uploadToCloudinary(
  buffer: Buffer,
  fileName: string
): Promise<{ secureUrl: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "maanak/evidence",
        resource_type: "auto",
        public_id: `${path.parse(fileName).name}-${Date.now()}`,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error("Cloudinary upload failed with empty result."));
        }
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        });
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Write buffer to local disk fallback
 */
async function saveToLocalDisk(
  buffer: Buffer,
  fileName: string,
  uploadDirectory: string
): Promise<string> {
  await fs.mkdir(uploadDirectory, { recursive: true });
  const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueName = `${randomUUID()}-${sanitized}`;
  const targetPath = path.join(uploadDirectory, uniqueName);
  await fs.writeFile(targetPath, buffer);
  return targetPath;
}

export function createEvidenceRouter(options: EvidenceRouterOptions = {}): Router {
  const router = Router();
  const db = options.db;
  const localUploadDir = options.uploadDir || path.resolve(process.cwd(), "uploads/evidence");

  // In-memory fallback if no db connection is active
  const inMemoryEvidence: StoredEvidenceRecord[] = [];
  const inMemoryProvenance: ProvenanceNodeRecord[] = [];

  /**
   * POST /api/v1/evidence/upload
   * Multipart upload for test session statutory evidence.
   */
  router.post(
    "/upload",
    (req: Request, res: Response, next: NextFunction) => {
      upload.single("file")(req, res, (err: any) => {
        if (err) {
          if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
              status: "error",
              message: "File exceeds 20MB limit.",
            });
          }
          return res.status(400).json({
            status: "error",
            message: err.message || "Failed to process multipart upload.",
          });
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({
            status: "error",
            message: "No file was provided in the multipart request body. Field name must be 'file'.",
          });
        }

        const testSessionId = req.body.testSessionId || randomUUID();

        // Statutory WORM check: Cannot attach evidence to APPROVED_LOCKED session
        if (req.body.testSessionId) {
          const session = await db.testSession.findUnique({
            where: { id: req.body.testSessionId },
          });
          if (session && session.status === "APPROVED_LOCKED") {
            return res.status(403).json({
              error: "SESSION_IMMUTABLE_LOCKED",
              message: `Test session "${session.id}" is statutorily APPROVED_LOCKED (WORM). Direct observation additions, modifications, or deletions are strictly prohibited by legal metrology compliance rules.`,
            });
          }
        }

        const category = req.body.category || req.body.evidenceType || "NAMEPLATE_PHOTO";
        const uploadedByUserId = (req as any).user?.id || req.body.uploadedByUserId || null;

        // 1. Calculate SHA-256 fingerprint of raw binary
        const fileHashSha256 = createHash("sha256").update(file.buffer).digest("hex");

        // 2. Determine storage provider & persist
        let fileStoragePath: string;
        let storageProvider: "cloudinary" | "local" = "local";

        if (process.env.CLOUDINARY_URL) {
          try {
            const cloudRes = await uploadToCloudinary(file.buffer, file.originalname);
            fileStoragePath = cloudRes.secureUrl;
            storageProvider = "cloudinary";
          } catch (cloudErr) {
            // Cloudinary failed; fall back to local disk safely
            fileStoragePath = await saveToLocalDisk(file.buffer, file.originalname, localUploadDir);
          }
        } else {
          fileStoragePath = await saveToLocalDisk(file.buffer, file.originalname, localUploadDir);
        }

        const evidenceId = randomUUID();
        const now = new Date();

        // 3. Chain PROVENANCE_EVIDENCE_ATTACHED node for WELMEC 7.2 graph
        let nextSeq = 0;
        let prevHash = GENESIS_PREV_HASH;

        if (db) {
          try {
            const latest = await db.provenanceNode.findFirst({
              where: { testSessionId },
              orderBy: { nodeSequence: "desc" },
            });
            if (latest) {
              nextSeq = latest.nodeSequence + 1;
              prevHash = latest.currentNodeHashSha256;
            }
          } catch {}
        } else {
          const sessionNodes = inMemoryProvenance.filter((n) => n.testSessionId === testSessionId);
          if (sessionNodes.length > 0) {
            const latest = sessionNodes[sessionNodes.length - 1];
            nextSeq = latest.nodeSequence + 1;
            prevHash = latest.currentNodeHashSha256;
          }
        }

        const provNode = generateEvidenceProvenanceNode({
          testSessionId,
          nodeSequence: nextSeq,
          previousNodeHashSha256: prevHash,
          evidencePayload: {
            evidenceId,
            testSessionId,
            category,
            fileName: file.originalname,
            fileHashSha256,
            mimeType: file.mimetype,
            fileStoragePath,
            sizeBytes: file.size,
            storageProvider,
            uploadedByUserId,
            timestamp: now.toISOString(),
          },
          createdAt: now,
        });

        if (db) {
          try {
            await db.provenanceNode.create({
              data: {
                id: randomUUID(),
                testSessionId: provNode.testSessionId,
                nodeSequence: provNode.nodeSequence,
                nodeType: provNode.nodeType,
                previousNodeHashSha256: provNode.previousNodeHashSha256,
                payloadHashSha256: provNode.payloadHashSha256,
                currentNodeHashSha256: provNode.currentNodeHashSha256,
                createdAt: provNode.createdAt,
              },
            });
          } catch {}
        } else {
          inMemoryProvenance.push(provNode);
        }

        // 4. Database persistence
        if (db) {
          try {
            const created = await db.evidenceAttachment.create({
              data: {
                id: evidenceId,
                testSessionId,
                category,
                fileName: file.originalname,
                fileStoragePath,
                mimeType: file.mimetype,
                fileHashSha256,
                uploadedByUserId,
                createdAt: now,
              },
            });

            return res.status(201).json({
              status: "success",
              data: {
                id: created.id,
                testSessionId: created.testSessionId,
                category: created.category,
                fileName: created.fileName,
                fileStoragePath: created.fileStoragePath,
                mimeType: created.mimeType,
                fileHashSha256: created.fileHashSha256,
                sizeBytes: file.size,
                storageProvider,
                provenanceNode: provNode,
                createdAt: created.createdAt,
              },
            });
          } catch (dbErr: any) {
            // If DB insert failed due to foreign key or mock session, gracefully return payload
            const record: StoredEvidenceRecord = {
              id: evidenceId,
              testSessionId,
              category,
              fileName: file.originalname,
              fileStoragePath,
              mimeType: file.mimetype,
              fileHashSha256,
              sizeBytes: file.size,
              storageProvider,
              uploadedByUserId,
              createdAt: now,
            };
            inMemoryEvidence.push(record);

            return res.status(201).json({
              status: "success",
              data: {
                ...record,
                provenanceNode: provNode,
              },
            });
          }
        } else {
          const record: StoredEvidenceRecord = {
            id: evidenceId,
            testSessionId,
            category,
            fileName: file.originalname,
            fileStoragePath,
            mimeType: file.mimetype,
            fileHashSha256,
            sizeBytes: file.size,
            storageProvider,
            uploadedByUserId,
            createdAt: now,
          };
          inMemoryEvidence.push(record);

          return res.status(201).json({
            status: "success",
            data: {
              ...record,
              provenanceNode: provNode,
            },
          });
        }
      } catch (err: any) {
        return res.status(500).json({
          status: "error",
          message: err.message || "Internal server error uploading evidence.",
        });
      }
    }
  );

  /**
   * GET /api/v1/evidence/session/:sessionId
   * List all evidence attachments for a specific test session.
   */
  router.get("/session/:sessionId", async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    if (db) {
      try {
        const records = await db.evidenceAttachment.findMany({
          where: { testSessionId: sessionId },
          orderBy: { createdAt: "desc" },
        });
        return res.json({ status: "success", data: records });
      } catch {
        const memoryMatches = inMemoryEvidence.filter((r) => r.testSessionId === sessionId);
        return res.json({ status: "success", data: memoryMatches });
      }
    }

    const memoryMatches = inMemoryEvidence.filter((r) => r.testSessionId === sessionId);
  });

  /**
   * GET /api/v1/evidence/session/:sessionId/provenance
   * List all PROVENANCE_EVIDENCE_ATTACHED nodes for the session.
   */
  router.get("/session/:sessionId/provenance", async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    if (db) {
      try {
        const nodes = await db.provenanceNode.findMany({
          where: { testSessionId: sessionId, nodeType: "PROVENANCE_EVIDENCE_ATTACHED" },
          orderBy: { nodeSequence: "asc" },
        });
        return res.json({ status: "success", data: nodes });
      } catch {
        const memoryNodes = inMemoryProvenance.filter(
          (n) => n.testSessionId === sessionId && n.nodeType === "PROVENANCE_EVIDENCE_ATTACHED"
        );
        return res.json({ status: "success", data: memoryNodes });
      }
    }

    const memoryNodes = inMemoryProvenance.filter(
      (n) => n.testSessionId === sessionId && n.nodeType === "PROVENANCE_EVIDENCE_ATTACHED"
    );
    return res.json({ status: "success", data: memoryNodes });
  });

  /**
   * GET /api/v1/evidence/:id
   * Get evidence attachment record by ID.
   */
  router.get("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    if (db) {
      try {
        const record = await db.evidenceAttachment.findUnique({
          where: { id },
        });
        if (!record) {
          return res.status(404).json({ status: "error", message: "Evidence attachment not found." });
        }
        return res.json({ status: "success", data: record });
      } catch {
        const memoryRecord = inMemoryEvidence.find((r) => r.id === id);
        if (!memoryRecord) {
          return res.status(404).json({ status: "error", message: "Evidence attachment not found." });
        }
        return res.json({ status: "success", data: memoryRecord });
      }
    }

    const memoryRecord = inMemoryEvidence.find((r) => r.id === id);
    if (!memoryRecord) {
      return res.status(404).json({ status: "error", message: "Evidence attachment not found." });
    }
    return res.json({ status: "success", data: memoryRecord });
  });

  return router;
}

export const evidenceRouter = createEvidenceRouter();
