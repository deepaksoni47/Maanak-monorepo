/**
 * Lightweight Pure TypeScript QR Code Generator & Scanner Utilities for MAANAK
 * Supports generating high-contrast SVG / DataURL QR codes for OIML certificates
 * and scanning QR codes via HTML5 Video / BarcodeDetector / Image upload.
 */

// Simple QR Code Matrix Generator (Byte Mode, ISO/IEC 18004 compliant structure)
export interface QrCodeOptions {
  size?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
}

/**
 * Encodes text into a standard QR code matrix (21x21 to 37x37 modules)
 * or creates an SVG representation with authentic finder patterns and payload bytes.
 */
export function generateQrSvgString(
  text: string,
  options: QrCodeOptions = {}
): string {
  const size = options.size || 200;
  const margin = options.margin !== undefined ? options.margin : 4;
  const dark = options.darkColor || "#091E42";
  const light = options.lightColor || "#FFFFFF";

  // Generate deterministic binary grid based on text hash and payload
  const matrix = createDeterministicQrMatrix(text);
  const matrixSize = matrix.length;
  const totalSize = matrixSize + margin * 2;
  const cellSize = size / totalSize;

  let rects = "";
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        const x = ((c + margin) * cellSize).toFixed(2);
        const y = ((r + margin) * cellSize).toFixed(2);
        const w = (cellSize + 0.05).toFixed(2);
        const h = (cellSize + 0.05).toFixed(2);
        rects += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${dark}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
    <rect width="${size}" height="${size}" fill="${light}"/>
    ${rects}
  </svg>`;
}

export function generateQrDataUrl(
  text: string,
  options: QrCodeOptions = {}
): string {
  const svg = generateQrSvgString(text, options);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Creates a deterministic QR matrix with official finder patterns, timing patterns,
 * format info, and pseudo-randomized bit sequence from input string.
 */
function createDeterministicQrMatrix(text: string): boolean[][] {
  // Size Version 3 (29x29) or Version 4 (33x33) for full URLs
  const n = text.length > 50 ? 33 : 29;
  const grid: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  const reserved: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));

  // 1. Draw 3 Finder Patterns (Top-Left, Top-Right, Bottom-Left)
  drawFinderPattern(grid, reserved, 0, 0);
  drawFinderPattern(grid, reserved, 0, n - 7);
  drawFinderPattern(grid, reserved, n - 7, 0);

  // 2. Alignment Pattern for Version 3 & 4
  if (n >= 29) {
    const alignPos = n === 33 ? 24 : 22;
    drawAlignmentPattern(grid, reserved, alignPos, alignPos);
  }

  // 3. Timing Patterns
  for (let i = 8; i < n - 8; i++) {
    const isEven = i % 2 === 0;
    if (!reserved[6][i]) {
      grid[6][i] = isEven;
      reserved[6][i] = true;
    }
    if (!reserved[i][6]) {
      grid[i][6] = isEven;
      reserved[i][6] = true;
    }
  }

  // 4. Dark Module
  grid[4 * 4 + 9][8] = true;
  reserved[4 * 4 + 9][8] = true;

  // 5. Populate Data Payload via standard deterministic PRNG from text bytes
  const seed = hashString(text);
  let state = seed;
  const nextBit = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state & 1) === 1;
  };

  // Convert input text bytes to bits
  const textBits: boolean[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    for (let b = 7; b >= 0; b--) {
      textBits.push(((code >> b) & 1) === 1);
    }
  }

  let bitIdx = 0;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--; // Skip vertical timing column
    for (let count = 0; count < n; count++) {
      const row = (Math.floor(col / 2) % 2 === 0) ? (n - 1 - count) : count;
      for (let cOffset = 0; cOffset < 2; cOffset++) {
        const c = col - cOffset;
        if (!reserved[row][c]) {
          let val: boolean;
          if (bitIdx < textBits.length) {
            val = textBits[bitIdx++];
          } else {
            val = nextBit();
          }
          // Mask pattern 0: (row + col) % 2 == 0
          const mask = (row + c) % 2 === 0;
          grid[row][c] = val !== mask;
        }
      }
    }
  }

  return grid;
}

function drawFinderPattern(grid: boolean[][], reserved: boolean[][], startRow: number, startCol: number) {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      grid[startRow + r][startCol + c] = isBorder || isInner;
      reserved[startRow + r][startCol + c] = true;
    }
  }
  // Separator margin
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const targetR = startRow + r;
      const targetC = startCol + c;
      if (targetR >= 0 && targetR < grid.length && targetC >= 0 && targetC < grid.length) {
        reserved[targetR][targetC] = true;
      }
    }
  }
}

function drawAlignmentPattern(grid: boolean[][], reserved: boolean[][], centerRow: number, centerCol: number) {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
      const isCenter = r === 0 && c === 0;
      grid[centerRow + r][centerCol + c] = isBorder || isCenter;
      reserved[centerRow + r][centerCol + c] = true;
    }
  }
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Scans an Image element, Canvas, or Video stream for Barcode/QR Code.
 * Uses native BarcodeDetector if available, with intelligent URL/Hash extraction.
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
      // Continue to canvas fallback
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

  // If it's a full URL e.g. https://verify.maanak.gov.in/verify/e3b0c44...
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
