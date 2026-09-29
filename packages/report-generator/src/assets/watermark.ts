import fs from "node:fs";
import path from "node:path";

let cachedWatermarkBytes: Uint8Array | null = null;

export function getMaanakWatermarkBytes(): Uint8Array | null {
  if (cachedWatermarkBytes) {
    return cachedWatermarkBytes;
  }

  try {
    const dir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
    const candidatePaths = [
      path.join(dir, "maanak-backgorund-copyright.png"),
      path.join(process.cwd(), "apps/web/public/images/maanak-backgorund-copyright.png"),
      path.join(process.cwd(), "public/images/maanak-backgorund-copyright.png"),
      path.join(process.cwd(), "packages/report-generator/src/assets/maanak-backgorund-copyright.png"),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        cachedWatermarkBytes = new Uint8Array(fs.readFileSync(p));
        return cachedWatermarkBytes;
      }
    }
  } catch (err) {
    // fallback
  }

  return null;
}
