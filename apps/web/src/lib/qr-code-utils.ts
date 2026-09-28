import QRCode from "qrcode";

export interface QrCodeOptions {
  size?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

/**
 * Generates an authentic, standard-compliant ISO/IEC 18004 SVG QR code string.
 * Fully readable by any smartphone camera (iOS / Android), barcode scanner, or vision model.
 */
export async function generateQrSvgString(
  text: string,
  options: QrCodeOptions = {}
): Promise<string> {
  const margin = options.margin !== undefined ? options.margin : 2;
  const dark = options.darkColor || "#091E42";
  const light = options.lightColor || "#FFFFFF";

  return await QRCode.toString(text, {
    type: "svg",
    margin,
    errorCorrectionLevel: options.errorCorrectionLevel || "M",
    color: {
      dark,
      light,
    },
    width: options.size || 200,
  });
}

/**
 * Generates an authentic PNG Data URL (`data:image/png;base64,...`) for inline images.
 */
export async function generateQrDataUrl(
  text: string,
  options: QrCodeOptions = {}
): Promise<string> {
  const margin = options.margin !== undefined ? options.margin : 2;
  const dark = options.darkColor || "#091E42";
  const light = options.lightColor || "#FFFFFF";

  return await QRCode.toDataURL(text, {
    margin,
    errorCorrectionLevel: options.errorCorrectionLevel || "M",
    color: {
      dark,
      light,
    },
    width: options.size || 200,
  });
}

/**
 * Generates the raw QR 2D boolean module matrix and module size from standard QRCode engine.
 * Useful for drawing vector modules directly onto canvas or PDF document.
 */
export function getQrModuleMatrix(
  text: string,
  errorCorrectionLevel: "L" | "M" | "Q" | "H" = "M"
): { modules: boolean[][]; size: number } {
  const qr = QRCode.create(text, { errorCorrectionLevel });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const matrix: boolean[][] = [];

  for (let row = 0; row < size; row++) {
    const rowData: boolean[] = [];
    for (let col = 0; col < size; col++) {
      // qr.modules.data is a Uint8Array where 1 = dark, 0 = light
      rowData.push(Boolean(data[row * size + col]));
    }
    matrix.push(rowData);
  }

  return { modules: matrix, size };
}

/**
 * Scans an Image element, Canvas, or Video stream for Barcode/QR Code.
 * Uses native BarcodeDetector if available.
 */
export async function decodeQrFromMedia(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement | ImageBitmap
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  // 1. Try native Web BarcodeDetector API (modern Android Chrome, iOS Safari, Edge, Desktop Chrome)
  if ("BarcodeDetector" in window) {
    try {
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      const detector = new BarcodeDetectorClass({ formats: ["qr_code", "data_matrix"] });
      const barcodes = await detector.detect(source);
      if (barcodes && barcodes.length > 0) {
        return barcodes[0].rawValue || barcodes[0].displayValue || null;
      }
    } catch {
      // Continue
    }
  }

  return null;
}

/**
 * Parses any decoded QR string or URL to extract the verification hash or session ID.
 */
export function extractVerificationHash(decodedText: string): string {
  if (!decodedText) return "";
  const trimmed = decodedText.trim();

  // If it's a full URL e.g. https://verify.maanak.gov.in/verify/e3b0c44... or http://localhost:3000/verify/...
  if (trimmed.includes("/verify/")) {
    const parts = trimmed.split("/verify/");
    if (parts.length > 1) {
      return decodeURIComponent(parts[1].split("?")[0].split("#")[0].trim());
    }
  }

  // If it's a URL query param e.g. ?hash=...
  try {
    const url = new URL(trimmed);
    const hashParam = url.searchParams.get("hash") || url.searchParams.get("id");
    if (hashParam) return hashParam.trim();
  } catch {
    // Not a full URL
  }

  return trimmed;
}
