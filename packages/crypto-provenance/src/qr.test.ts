import { describe, it } from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import jsQR from "jsqr";
import {
  buildVerificationUrl,
  generateVerificationQrSvg,
  generateVerificationQrDataUrl,
  generateVerificationQrPng,
} from "./qr.js";

describe("TASK-032: Public Verification QR Code SVG Generator", () => {
  const sampleHash =
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const baseUrl = "https://maanak.gov.in";
  const expectedUrl = `https://maanak.gov.in/verify/${sampleHash}`;

  describe("Canonical URL Construction", () => {
    it("constructs canonical verification URL correctly", () => {
      const url = buildVerificationUrl(sampleHash, baseUrl);
      assert.equal(url, expectedUrl);
    });

    it("strips trailing slashes from verifyBaseUrl", () => {
      const url = buildVerificationUrl(sampleHash, "https://maanak.gov.in///");
      assert.equal(url, expectedUrl);
    });

    it("trims leading/trailing whitespace from inputs", () => {
      const url = buildVerificationUrl(
        `  ${sampleHash}  `,
        "  https://maanak.gov.in  ",
      );
      assert.equal(url, expectedUrl);
    });

    it("throws when sessionHash is missing or blank", () => {
      assert.throws(
        () => buildVerificationUrl("", baseUrl),
        /sessionHash is required/,
      );
      assert.throws(
        () => buildVerificationUrl("   ", baseUrl),
        /sessionHash is required/,
      );
    });

    it("throws when verifyBaseUrl is missing or blank", () => {
      assert.throws(
        () => buildVerificationUrl(sampleHash, ""),
        /verifyBaseUrl is required/,
      );
      assert.throws(
        () => buildVerificationUrl(sampleHash, "   "),
        /verifyBaseUrl is required/,
      );
    });
  });

  describe("SVG Generation (generateVerificationQrSvg)", () => {
    it("generates valid SVG markup containing xml namespace and svg tags", async () => {
      const svg = await generateVerificationQrSvg(sampleHash, baseUrl);

      assert.ok(typeof svg === "string");
      assert.ok(svg.startsWith("<svg") || svg.includes("<svg"));
      assert.ok(svg.includes("</svg>"));
      assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
      assert.ok(svg.includes("viewBox="));
      // Default light color is transparent (#00000000) for clean PDF overlay
      assert.ok(svg.includes("#000000"));
    });

    it("applies custom colors and margins to SVG", async () => {
      const svg = await generateVerificationQrSvg(sampleHash, baseUrl, {
        margin: 4,
        color: {
          dark: "#1d4ed8", // blue-700
          light: "#f8fafc", // slate-50
        },
      });

      assert.ok(svg.includes("#1d4ed8"));
      assert.ok(svg.includes("#f8fafc"));
    });

    it("supports custom error correction levels (L, M, Q, H)", async () => {
      const svgL = await generateVerificationQrSvg(sampleHash, baseUrl, {
        errorCorrectionLevel: "L",
      });
      const svgH = await generateVerificationQrSvg(sampleHash, baseUrl, {
        errorCorrectionLevel: "H",
      });

      assert.ok(svgL.includes("</svg>"));
      assert.ok(svgH.includes("</svg>"));
      // Higher error correction level 'H' requires more dense grid / modules than 'L'
      assert.notEqual(svgL, svgH);
    });
  });

  describe("Data URL and PNG Generation", () => {
    it("generates valid PNG base64 Data URL", async () => {
      const dataUrl = await generateVerificationQrDataUrl(sampleHash, baseUrl);

      assert.ok(typeof dataUrl === "string");
      assert.ok(dataUrl.startsWith("data:image/png;base64,"));

      const base64Data = dataUrl.replace("data:image/png;base64,", "");
      const buffer = Buffer.from(base64Data, "base64");
      // PNG header magic bytes: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
      assert.equal(buffer[0], 0x89);
      assert.equal(buffer[1], 0x50); // 'P'
      assert.equal(buffer[2], 0x4e); // 'N'
      assert.equal(buffer[3], 0x47); // 'G'
    });

    it("generates valid PNG binary Buffer", async () => {
      const pngBuffer = await generateVerificationQrPng(sampleHash, baseUrl, {
        width: 256,
      });

      assert.ok(Buffer.isBuffer(pngBuffer));
      assert.ok(pngBuffer.length > 0);
      assert.equal(pngBuffer[0], 0x89);
      assert.equal(pngBuffer[1], 0x50);
      assert.equal(pngBuffer[2], 0x4e);
      assert.equal(pngBuffer[3], 0x47);
    });
  });

  describe("Acceptance Criteria: QR Code Decodability back to URL", () => {
    it("decodes QR module matrix directly back to the exact canonical verification URL", async () => {
      const url = buildVerificationUrl(sampleHash, baseUrl);
      const qr = QRCode.create(url, { errorCorrectionLevel: "M" });

      const moduleCount = qr.modules.size;
      const data = qr.modules.data; // Uint8Array of module values: 1 = dark, 0 = light

      // Render module bit matrix to RGBA pixel buffer for jsQR
      // Scale each module to 4x4 pixels for reliable optical sampling
      const scale = 4;
      const width = moduleCount * scale;
      const height = moduleCount * scale;
      const rgba = new Uint8ClampedArray(width * height * 4);

      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          const isDark = Boolean(data[r * moduleCount + c]);
          const pixelVal = isDark ? 0 : 255;

          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const px = c * scale + dx;
              const py = r * scale + dy;
              const offset = (py * width + px) * 4;

              rgba[offset] = pixelVal; // R
              rgba[offset + 1] = pixelVal; // G
              rgba[offset + 2] = pixelVal; // B
              rgba[offset + 3] = 255; // Alpha
            }
          }
        }
      }

      const decoded = jsQR(rgba, width, height);
      assert.ok(
        decoded !== null,
        "jsQR must successfully decode the generated QR code",
      );
      assert.equal(decoded.data, expectedUrl);
    });

    it("decodes QR with various session hashes and error correction levels", async () => {
      const testCases = [
        {
          hash: "0000000000000000000000000000000000000000000000000000000000000000",
          ec: "L" as const,
        },
        {
          hash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
          ec: "H" as const,
        },
        {
          hash: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
          ec: "Q" as const,
        },
      ];

      for (const tc of testCases) {
        const url = buildVerificationUrl(tc.hash, baseUrl);
        const qr = QRCode.create(url, { errorCorrectionLevel: tc.ec });

        const moduleCount = qr.modules.size;
        const data = qr.modules.data;
        const scale = 4;
        const width = moduleCount * scale;
        const height = moduleCount * scale;
        const rgba = new Uint8ClampedArray(width * height * 4);

        for (let r = 0; r < moduleCount; r++) {
          for (let c = 0; c < moduleCount; c++) {
            const isDark = Boolean(data[r * moduleCount + c]);
            const pixelVal = isDark ? 0 : 255;

            for (let dy = 0; dy < scale; dy++) {
              for (let dx = 0; dx < scale; dx++) {
                const px = c * scale + dx;
                const py = r * scale + dy;
                const offset = (py * width + px) * 4;

                rgba[offset] = pixelVal;
                rgba[offset + 1] = pixelVal;
                rgba[offset + 2] = pixelVal;
                rgba[offset + 3] = 255;
              }
            }
          }
        }

        const decoded = jsQR(rgba, width, height);
        assert.ok(decoded !== null, `jsQR failed on hash ${tc.hash}`);
        assert.equal(decoded.data, url);
      }
    });
  });
});
