import QRCode from "qrcode";

export interface QrOptions {
  /**
   * QR Code error correction level.
   * L: ~7%, M: ~15%, Q: ~25%, H: ~30% recovery capability.
   * Default: 'M' (robust balance between density and print resilience)
   */
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";

  /**
   * Quiet zone margin in modules.
   * Default: 2
   */
  margin?: number;

  /**
   * Module width/size in pixels or points.
   */
  width?: number;

  /**
   * Color configuration for dark/light modules.
   */
  color?: {
    dark?: string;
    light?: string;
  };
}

export interface QrSvgOptions extends QrOptions {
  /**
   * Include XML declaration in SVG output.
   * Default: false
   */
  xmlDeclaration?: boolean;
}

export interface QrPngOptions extends QrOptions {
  /**
   * Output scale factor for PNG generation.
   */
  scale?: number;
}

/**
 * Builds the canonical public verification URL from a session SHA-256 hash and base URL.
 *
 * @param sessionHash 64-character SHA-256 hash or session identifier
 * @param verifyBaseUrl Base URL of the verification portal (e.g. "https://verify.maanak.gov.in")
 * @returns Canonical URL: `${verifyBaseUrl}/verify/${sessionHash}`
 */
export function buildVerificationUrl(
  sessionHash: string,
  verifyBaseUrl: string,
): string {
  if (
    !sessionHash ||
    typeof sessionHash !== "string" ||
    sessionHash.trim() === ""
  ) {
    throw new Error("sessionHash is required and must not be empty");
  }
  if (
    !verifyBaseUrl ||
    typeof verifyBaseUrl !== "string" ||
    verifyBaseUrl.trim() === ""
  ) {
    throw new Error("verifyBaseUrl is required and must not be empty");
  }

  const normalizedBase = verifyBaseUrl.trim().replace(/\/+$/, "");
  const normalizedHash = sessionHash.trim();

  return `${normalizedBase}/verify/${normalizedHash}`;
}

/**
 * Generates an SVG string representation of the public verification QR code.
 * Suitable for embedding directly into PDF documents or rendering inline in Web UI.
 *
 * @param sessionHash 64-character SHA-256 session hash or identifier
 * @param verifyBaseUrl Base URL for the public verification portal
 * @param options Styling and error-correction options
 * @returns Complete SVG markup string
 */
export async function generateVerificationQrSvg(
  sessionHash: string,
  verifyBaseUrl: string,
  options: QrSvgOptions = {},
): Promise<string> {
  const url = buildVerificationUrl(sessionHash, verifyBaseUrl);

  const svgString = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: options.errorCorrectionLevel ?? "M",
    margin: options.margin ?? 2,
    width: options.width,
    color: {
      dark: options.color?.dark ?? "#000000",
      light: options.color?.light ?? "#00000000", // transparent default for clean PDF overlay
    },
  });

  return svgString;
}

/**
 * Generates a Base64-encoded Data URL (image/png) of the public verification QR code.
 *
 * @param sessionHash 64-character SHA-256 session hash or identifier
 * @param verifyBaseUrl Base URL for the public verification portal
 * @param options Styling and error-correction options
 * @returns Data URL string (`data:image/png;base64,...`)
 */
export async function generateVerificationQrDataUrl(
  sessionHash: string,
  verifyBaseUrl: string,
  options: QrOptions = {},
): Promise<string> {
  const url = buildVerificationUrl(sessionHash, verifyBaseUrl);

  const dataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: options.errorCorrectionLevel ?? "M",
    margin: options.margin ?? 2,
    width: options.width,
    color: {
      dark: options.color?.dark ?? "#000000",
      light: options.color?.light ?? "#ffffff",
    },
  });

  return dataUrl;
}

/**
 * Generates a raw PNG Buffer of the public verification QR code.
 *
 * @param sessionHash 64-character SHA-256 session hash or identifier
 * @param verifyBaseUrl Base URL for the public verification portal
 * @param options Styling and error-correction options
 * @returns Node.js Buffer containing raw PNG bytes
 */
export async function generateVerificationQrPng(
  sessionHash: string,
  verifyBaseUrl: string,
  options: QrPngOptions = {},
): Promise<Buffer> {
  const url = buildVerificationUrl(sessionHash, verifyBaseUrl);

  const buffer = await QRCode.toBuffer(url, {
    type: "png",
    errorCorrectionLevel: options.errorCorrectionLevel ?? "M",
    margin: options.margin ?? 2,
    width: options.width,
    scale: options.scale,
    color: {
      dark: options.color?.dark ?? "#000000",
      light: options.color?.light ?? "#ffffff",
    },
  });

  return buffer;
}
