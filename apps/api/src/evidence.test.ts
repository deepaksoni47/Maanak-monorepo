import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createHash, randomUUID } from "node:crypto";
import { createApp } from "./app.js";

describe("TASK-077: Backend Multipart Evidence Upload API (/api/v1/evidence/upload)", () => {
  let app: any;
  let mockPrisma: any;
  let storedEvidence: any[] = [];

  const mockSessionId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const mockUserId = "usr-insp-001";

  beforeEach(() => {
    storedEvidence = [];

    mockPrisma = {
      evidenceAttachment: {
        create: async ({ data }: any) => {
          const record = {
            ...data,
            id: data.id || randomUUID(),
            createdAt: data.createdAt || new Date(),
          };
          storedEvidence.push(record);
          return record;
        },
        findMany: async ({ where }: any) => {
          return storedEvidence.filter((e) => e.testSessionId === where.testSessionId);
        },
        findUnique: async ({ where }: any) => {
          return storedEvidence.find((e) => e.id === where.id) || null;
        },
      },
    };

    app = createApp({ db: mockPrisma as any });
  });

  it("uploads a valid PNG nameplate photo and computes deterministic SHA-256 fingerprint", async () => {
    const fakeImageBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG header
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    ]);

    const expectedHash = createHash("sha256").update(fakeImageBuffer).digest("hex");

    const res = await request(app)
      .post("/api/v1/evidence/upload")
      .field("testSessionId", mockSessionId)
      .field("category", "NAMEPLATE_PHOTO")
      .field("uploadedByUserId", mockUserId)
      .attach("file", fakeImageBuffer, {
        filename: "scale_nameplate_sn2026.png",
        contentType: "image/png",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, "success");
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.testSessionId, mockSessionId);
    assert.equal(res.body.data.category, "NAMEPLATE_PHOTO");
    assert.equal(res.body.data.fileName, "scale_nameplate_sn2026.png");
    assert.equal(res.body.data.mimeType, "image/png");
    assert.equal(res.body.data.fileHashSha256, expectedHash);
    assert.ok(res.body.data.fileStoragePath);
    assert.ok(res.body.data.storageProvider === "local" || res.body.data.storageProvider === "cloudinary");

    // Verify stored in mock database
    assert.equal(storedEvidence.length, 1);
    assert.equal(storedEvidence[0].fileHashSha256, expectedHash);
  });

  it("uploads a valid PDF schematic and stores evidence attachment record", async () => {
    const fakePdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
    const expectedHash = createHash("sha256").update(fakePdfBuffer).digest("hex");

    const res = await request(app)
      .post("/api/v1/evidence/upload")
      .field("testSessionId", mockSessionId)
      .field("evidenceType", "CIRCUIT_SCHEMATIC")
      .attach("file", fakePdfBuffer, {
        filename: "loadcell_schematic.pdf",
        contentType: "application/pdf",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, "success");
    assert.equal(res.body.data.category, "CIRCUIT_SCHEMATIC");
    assert.equal(res.body.data.mimeType, "application/pdf");
    assert.equal(res.body.data.fileHashSha256, expectedHash);
  });

  it("rejects unsupported MIME types with 400 Bad Request", async () => {
    const fakeScriptBuffer = Buffer.from("console.log('malicious');");

    const res = await request(app)
      .post("/api/v1/evidence/upload")
      .field("testSessionId", mockSessionId)
      .attach("file", fakeScriptBuffer, {
        filename: "script.js",
        contentType: "application/javascript",
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.status, "error");
    assert.ok(res.body.message.includes("Unsupported file type"));
  });

  it("returns 400 Bad Request when file field is omitted", async () => {
    const res = await request(app)
      .post("/api/v1/evidence/upload")
      .field("testSessionId", mockSessionId)
      .field("category", "NAMEPLATE_PHOTO");

    assert.equal(res.status, 400);
    assert.equal(res.body.status, "error");
    assert.ok(res.body.message.includes("No file was provided"));
  });

  it("retrieves list of evidence attachments for a test session", async () => {
    const buffer1 = Buffer.from("image1");
    const buffer2 = Buffer.from("image2");

    await request(app)
      .post("/api/v1/evidence/upload")
      .field("testSessionId", mockSessionId)
      .field("category", "NAMEPLATE_PHOTO")
      .attach("file", buffer1, { filename: "photo1.png", contentType: "image/png" });

    await request(app)
      .post("/api/v1/evidence/upload")
      .field("testSessionId", mockSessionId)
      .field("category", "SEALING_DIAGRAM")
      .attach("file", buffer2, { filename: "photo2.png", contentType: "image/png" });

    const res = await request(app).get(`/api/v1/evidence/session/${mockSessionId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "success");
    assert.equal(res.body.data.length, 2);
  });

  it("retrieves specific evidence record by ID, or 404 if not found", async () => {
    const buffer = Buffer.from("image_test");

    const createRes = await request(app)
      .post("/api/v1/evidence/upload")
      .field("testSessionId", mockSessionId)
      .attach("file", buffer, { filename: "test.png", contentType: "image/png" });

    const createdId = createRes.body.data.id;

    const getRes = await request(app).get(`/api/v1/evidence/${createdId}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.data.id, createdId);

    const notFoundRes = await request(app).get("/api/v1/evidence/non-existent-id");
    assert.equal(notFoundRes.status, 404);
  });
});
