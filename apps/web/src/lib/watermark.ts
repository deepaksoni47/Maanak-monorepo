/**
 * Helper to load the MAANAK copyright watermark PNG image for government PDF reports.
 * Supports both browser fetch (Next.js public assets) and Node.js filesystem fallback.
 */

let cachedWatermarkBytes: Uint8Array | null = null;

export async function getMaanakWatermarkBytes(): Promise<Uint8Array | null> {
  if (cachedWatermarkBytes) {
    return cachedWatermarkBytes;
  }

  // 1. Browser environment: fetch from public/images
  if (typeof window !== "undefined" && typeof fetch !== "undefined") {
    try {
      const res = await fetch("/images/maanak-backgorund-copyright.png");
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        cachedWatermarkBytes = new Uint8Array(arrayBuf);
        return cachedWatermarkBytes;
      }
    } catch (e) {
      console.warn("[MAANAK-PDF] Browser watermark fetch error:", e);
    }
  }

  // 2. Node.js environment: load from filesystem
  try {
    if (typeof process !== "undefined" && process.cwd) {
      // Dynamic import to avoid bundling issues in pure client builds
      const fs = await import("fs");
      const path = await import("path");
      const candidates = [
        path.join(process.cwd(), "apps/web/public/images/maanak-backgorund-copyright.png"),
        path.join(process.cwd(), "public/images/maanak-backgorund-copyright.png"),
        path.join(process.cwd(), "packages/report-generator/src/assets/maanak-backgorund-copyright.png"),
      ];

      for (const p of candidates) {
        if (fs.existsSync(p)) {
          cachedWatermarkBytes = new Uint8Array(fs.readFileSync(p));
          return cachedWatermarkBytes;
        }
      }
    }
  } catch (e) {
    // Filesystem not available
  }

  return null;
}
