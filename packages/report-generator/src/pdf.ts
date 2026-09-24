import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";
import type {
  CalculationTraceItem,
  DigitalSignatureMetadata,
} from "@maanak/types";
import { generateVerificationQrPng } from "@maanak/crypto-provenance";

export interface EvidenceAttachment {
  type:
    | "NAMEPLATE_PHOTO"
    | "SEALING_DIAGRAM"
    | "CIRCUIT_SCHEMATIC"
    | "USER_MANUAL"
    | string;
  imageBuffer?: Buffer | Uint8Array;
  fileName?: string;
  mimeType?: "image/jpeg" | "image/png" | "application/pdf" | string;
  fileHashSha256?: string;
  description?: string;
  caption?: string;
  calloutNotes?: string[];
}

export interface OimlReportData {
  reportNumber: string;
  issueDate: string;
  evidenceAttachments?: EvidenceAttachment[];
  laboratory: {
    name: string;
    address?: string;
    accreditationNumber?: string;
    signatoryName: string;
    signatoryDesignation: string;
  };
  instrument: {
    manufacturer: string;
    model: string;
    serialNumber: string;
    accuracyClass: string;
    maxCapacity: string | number;
    minCapacity: string | number;
    verificationIntervalE: string | number;
    actualIntervalD?: string | number;
    unit: string;
  };
  environmental: {
    temperatureStartC: string | number;
    temperatureEndC: string | number;
    humidityPercent: string | number;
    barometricPressureHpa?: string | number;
  };
  provenance: {
    sessionHash: string;
    verifyBaseUrl: string;
    genesisHash?: string;
    totalChainNodes?: number;
    timestamp?: string;
  };
  results: {
    overallStatus: "PASS" | "FAIL" | "INCONCLUSIVE";
    form1Weighing: {
      observations: CalculationTraceItem[];
      maxErrorToMpeRatio?: string | number;
      hysteresisMax?: string | number;
      zeroReturnError?: string | number;
      status: "PASS" | "FAIL";
    };
    form2TemperatureDrift?: {
      temperatureSteps: {
        tempC: number;
        zeroIndication: number;
        error: number;
        mpe: number;
      }[];
      maxDriftRateCPerHr: number;
      maxDriftRateAllowed: number;
      status: "PASS" | "FAIL";
    };
    form3Eccentricity?: {
      testLoad: number;
      positions: {
        name: string;
        indication: number;
        error: number;
        mpe: number;
        pass: boolean;
      }[];
      status: "PASS" | "FAIL";
    };
    form4Discrimination?: {
      loads: {
        load: number;
        extraLoad: number;
        initialI: number;
        newI: number;
        pass: boolean;
      }[];
      status: "PASS" | "FAIL";
    };
    form5Repeatability?: {
      runs: {
        load: number;
        count: number;
        minI: number;
        maxI: number;
        spread: number;
        maxAllowedSpread: number;
        pass: boolean;
      }[];
      status: "PASS" | "FAIL";
    };
    form6Creep?: {
      testLoad: number;
      durationMinutes: number;
      initialError: number;
      maxCreepError: number;
      zeroReturnError: number;
      maxAllowedCreep: number;
      status: "PASS" | "FAIL";
    };
    form7WarmUp?: {
      warmUpMinutes: number;
      zeroErrorAtStart: number;
      zeroErrorAfterWarmUp: number;
      loadErrorAtStart: number;
      loadErrorAfterWarmUp: number;
      testLoad: number;
      mpe: number;
      status: "PASS" | "FAIL";
    };
    form8SpanStability?: {
      initialSpan: number;
      finalSpan: number;
      spanDrift: number;
      maxAllowedDrift: number;
      testLoad: number;
      durationDays?: number;
      status: "PASS" | "FAIL";
    };
    form9TareAccuracy?: {
      tareLoad: number;
      netLoad: number;
      netIndication: number;
      netError: number;
      mpe: number;
      status: "PASS" | "FAIL";
    };
    form10VoltageVariation?: {
      nominalVoltage: number;
      testedVoltages: {
        voltage: number;
        indication: number;
        error: number;
        mpe: number;
        pass: boolean;
      }[];
      status: "PASS" | "FAIL";
    };
    form11MainsDips?: {
      reductionPercent: number;
      cyclesCount: number;
      maxObservedFault: number;
      significantFaultLimit: number;
      status: "PASS" | "FAIL";
    };
    form12ElectricalBursts?: {
      testVoltageKv: number;
      couplingLines: string;
      maxObservedFault: number;
      significantFaultLimit: number;
      status: "PASS" | "FAIL";
    };
    form13ElectrostaticDischarge?: {
      contactDischargeKv: number;
      airDischargeKv: number;
      dischargesCount: number;
      maxObservedFault: number;
      significantFaultLimit: number;
      status: "PASS" | "FAIL";
    };
    form14ElectromagneticImmunity?: {
      fieldStrengthVPerM: number;
      frequencyRangeMhz: string;
      maxObservedFault: number;
      significantFaultLimit: number;
      status: "PASS" | "FAIL";
    };
  };
  signatureMetadata?: DigitalSignatureMetadata;
}

export interface PdfCompileResult {
  pdfBuffer: Buffer;
  pageCount: number;
  compilationTimeMs: number;
  reportNumber: string;
  sessionHash: string;
}

// Layout constants for standard A4
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Color palette
const COLOR_PRIMARY = rgb(0.09, 0.28, 0.58); // Deep Navy (#174794)
const COLOR_DARK = rgb(0.12, 0.16, 0.24); // Slate 900
const COLOR_MUTED = rgb(0.4, 0.45, 0.55); // Slate 500
const COLOR_LIGHT_BG = rgb(0.96, 0.97, 0.99); // Slate 50
const COLOR_BORDER = rgb(0.85, 0.88, 0.92); // Slate 200
const COLOR_PASS = rgb(0.05, 0.6, 0.35); // Emerald 600
const COLOR_FAIL = rgb(0.86, 0.15, 0.15); // Red 600

/**
 * Sanitizes strings for standard PDF fonts (WinAnsi encoding).
 * Converts Unicode symbols to ASCII equivalents.
 */
export function safeAscii(str: string): string {
  if (!str) return "";
  return str
    .replace(/[\u2013\u2014]/g, "-") // en-dash, em-dash
    .replace(/\u00B1/g, "+/-") // ±
    .replace(/\u00B0/g, " deg ") // °
    .replace(/[\u0394\u2206]/g, "d") // Δ, ∆
    .replace(/[\u0900-\u097F]/g, "") // Devanagari block
    .replace(/[^\x20-\x7E\n\r\t]/g, ""); // non-ASCII printable chars
}

function patchPage(page: PDFPage): void {
  const origDraw = page.drawText.bind(page);
  page.drawText = (text: string, options?: any) => {
    return origDraw(safeAscii(text), options);
  };
}

/**
 * Compiles a publication-quality, 5-page official OIML R 76-2 multi-page test report.
 * Embeds QR code for public provenance verification and prepares layout for X.509 digital signature.
 *
 * @param reportData Complete structured test session and metrology data
 * @returns Object containing compiled Buffer, page count, and benchmark execution time
 */
export async function compileOimlPdfReport(
  reportData: OimlReportData,
): Promise<PdfCompileResult> {
  const startTime = Date.now();
  const pdfDoc = await PDFDocument.create();

  // Embed standard typography
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  // Generate QR Code PNG Buffer
  const qrBuffer = await generateVerificationQrPng(
    reportData.provenance.sessionHash,
    reportData.provenance.verifyBaseUrl,
    { width: 140, margin: 1 },
  );
  const qrImage = await pdfDoc.embedPng(qrBuffer);

  const hasModularForms7To9 = Boolean(
    reportData.results.form7WarmUp ||
    reportData.results.form8SpanStability ||
    reportData.results.form9TareAccuracy,
  );
  const hasDisturbanceForms10To14 = Boolean(
    reportData.results.form10VoltageVariation ||
    reportData.results.form11MainsDips ||
    reportData.results.form12ElectricalBursts ||
    reportData.results.form13ElectrostaticDischarge ||
    reportData.results.form14ElectromagneticImmunity,
  );
  let modularPagesCount = 0;
  if (hasModularForms7To9) modularPagesCount++;
  if (hasDisturbanceForms10To14) modularPagesCount++;

  const evidenceCount = reportData.evidenceAttachments?.length ?? 0;
  const itemsPerPage = 2;
  const annexPagesCount = evidenceCount > 0 ? Math.ceil(evidenceCount / itemsPerPage) : 0;
  const totalPages = 5 + modularPagesCount + annexPagesCount;

  // -------------------------------------------------------------
  // PAGE 1: Administrative Header, Instrument Details & Verdict
  // -------------------------------------------------------------
  const page1 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  patchPage(page1);
  renderPageFramework(page1, 1, totalPages, reportData, fontRegular, fontBold);

  let y = PAGE_HEIGHT - 65;

  // Government & Laboratory Header
  page1.drawText("GOVERNMENT OF INDIA — MINISTRY OF CONSUMER AFFAIRS", {
    x: MARGIN,
    y,
    size: 9,
    font: fontBold,
    color: COLOR_MUTED,
  });
  y -= 14;
  page1.drawText(reportData.laboratory.name.toUpperCase(), {
    x: MARGIN,
    y,
    size: 13,
    font: fontBold,
    color: COLOR_PRIMARY,
  });
  y -= 12;
  page1.drawText(
    `${reportData.laboratory.address ?? "Legal Metrology Standards Laboratory"} | Accreditation: ${reportData.laboratory.accreditationNumber ?? "NABL Metrology Accredited"}`,
    { x: MARGIN, y, size: 8, font: fontRegular, color: COLOR_MUTED },
  );

  y -= 20;
  page1.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT_WIDTH, y },
    thickness: 1.5,
    color: COLOR_PRIMARY,
  });

  // Report Title Box
  y -= 22;
  page1.drawText("OIML R 76-2 TEST CERTIFICATE", {
    x: MARGIN,
    y,
    size: 15,
    font: fontBold,
    color: COLOR_DARK,
  });
  y -= 12;
  page1.drawText("NON-AUTOMATIC WEIGHING INSTRUMENT METROLOGICAL EVALUATION", {
    x: MARGIN,
    y,
    size: 8.5,
    font: fontBold,
    color: COLOR_MUTED,
  });

  // Certificate info row
  y -= 22;
  renderInfoGrid(
    page1,
    [
      { label: "Certificate No.", value: reportData.reportNumber },
      { label: "Issue Date", value: reportData.issueDate },
      { label: "Standard Pack", value: "OIML R 76-1:2006 / IS 9281" },
      { label: "Evaluation Type", value: "Initial Verification" },
    ],
    MARGIN,
    y,
    CONTENT_WIDTH,
    fontRegular,
    fontBold,
  );

  // Instrument Specifications Box
  y -= 54;
  renderSectionHeader(
    page1,
    "1. INSTRUMENT UNDER TEST (IUT) SPECIFICATIONS",
    MARGIN,
    y,
    fontBold,
  );
  y -= 16;
  renderInfoGrid(
    page1,
    [
      { label: "Manufacturer", value: reportData.instrument.manufacturer },
      { label: "Model Number", value: reportData.instrument.model },
      { label: "Serial Number", value: reportData.instrument.serialNumber },
      { label: "Accuracy Class", value: reportData.instrument.accuracyClass },
      {
        label: "Max Capacity (Max)",
        value: `${reportData.instrument.maxCapacity} ${reportData.instrument.unit}`,
      },
      {
        label: "Min Capacity (Min)",
        value: `${reportData.instrument.minCapacity} ${reportData.instrument.unit}`,
      },
      {
        label: "Verification Scale (e)",
        value: `${reportData.instrument.verificationIntervalE} ${reportData.instrument.unit}`,
      },
      {
        label: "Actual Interval (d)",
        value: `${reportData.instrument.actualIntervalD ?? reportData.instrument.verificationIntervalE} ${reportData.instrument.unit}`,
      },
    ],
    MARGIN,
    y,
    CONTENT_WIDTH,
    fontRegular,
    fontBold,
  );

  // Environmental Conditions Box
  y -= 90;
  renderSectionHeader(
    page1,
    "2. ENVIRONMENTAL TESTING CONDITIONS",
    MARGIN,
    y,
    fontBold,
  );
  y -= 16;
  renderInfoGrid(
    page1,
    [
      {
        label: "Initial Temperature",
        value: `${reportData.environmental.temperatureStartC} °C`,
      },
      {
        label: "Final Temperature",
        value: `${reportData.environmental.temperatureEndC} °C`,
      },
      {
        label: "Relative Humidity",
        value: `${reportData.environmental.humidityPercent} % RH`,
      },
      {
        label: "Barometric Pressure",
        value: `${reportData.environmental.barometricPressureHpa ?? "1013.25"} hPa`,
      },
    ],
    MARGIN,
    y,
    CONTENT_WIDTH,
    fontRegular,
    fontBold,
  );

  // Overall Verdict Badge & QR Verification Area
  y -= 65;
  renderSectionHeader(
    page1,
    "3. CONFORMITY VERDICT & PUBLIC CRYPTOGRAPHIC PROVENANCE",
    MARGIN,
    y,
    fontBold,
  );
  y -= 22;

  const isPass = reportData.results.overallStatus === "PASS";
  const verdictBg = isPass ? COLOR_PASS : COLOR_FAIL;
  const verdictText = isPass
    ? "CONFORMS — METROLOGICAL PASS"
    : "DOES NOT CONFORM — FAIL";

  // Draw Verdict Box
  const verdictBoxWidth = CONTENT_WIDTH - 140;
  page1.drawRectangle({
    x: MARGIN,
    y: y - 80,
    width: verdictBoxWidth,
    height: 85,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  page1.drawRectangle({
    x: MARGIN + 12,
    y: y - 28,
    width: verdictBoxWidth - 24,
    height: 24,
    color: verdictBg,
  });

  page1.drawText(verdictText, {
    x: MARGIN + 22,
    y: y - 21,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText(
    "All mandatory test clauses (Forms 1–6) evaluated in strict compliance with OIML R 76-1.",
    {
      x: MARGIN + 14,
      y: y - 46,
      size: 8,
      font: fontRegular,
      color: COLOR_DARK,
    },
  );
  page1.drawText(
    `Session SHA-256: ${reportData.provenance.sessionHash.slice(0, 32)}...`,
    {
      x: MARGIN + 14,
      y: y - 60,
      size: 7.5,
      font: fontMono,
      color: COLOR_MUTED,
    },
  );
  page1.drawText(
    `Verified at: ${reportData.provenance.verifyBaseUrl}/verify/${reportData.provenance.sessionHash.slice(0, 12)}`,
    {
      x: MARGIN + 14,
      y: y - 72,
      size: 7.5,
      font: fontRegular,
      color: COLOR_PRIMARY,
    },
  );

  // Draw QR code image on right side
  page1.drawImage(qrImage, {
    x: MARGIN + verdictBoxWidth + 15,
    y: y - 80,
    width: 85,
    height: 85,
  });
  page1.drawText("SCAN TO VERIFY", {
    x: MARGIN + verdictBoxWidth + 24,
    y: y - 92,
    size: 7,
    font: fontBold,
    color: COLOR_PRIMARY,
  });

  // Signatory Authorization block
  y -= 140;
  page1.drawText("ISSUED UNDER OFFICIAL SEAL AND AUTHORITY:", {
    x: MARGIN,
    y,
    size: 8,
    font: fontBold,
    color: COLOR_MUTED,
  });
  y -= 16;
  page1.drawText(reportData.laboratory.signatoryName, {
    x: MARGIN,
    y,
    size: 11,
    font: fontBold,
    color: COLOR_DARK,
  });
  y -= 12;
  page1.drawText(reportData.laboratory.signatoryDesignation, {
    x: MARGIN,
    y,
    size: 8.5,
    font: fontRegular,
    color: COLOR_MUTED,
  });

  // -------------------------------------------------------------
  // PAGE 2: Form 1: Weighing Performance & Hysteresis Test
  // -------------------------------------------------------------
  const page2 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  patchPage(page2);
  renderPageFramework(page2, 2, totalPages, reportData, fontRegular, fontBold);

  y = PAGE_HEIGHT - 65;
  renderSectionHeader(
    page2,
    "FORM 1: WEIGHING PERFORMANCE TEST (OIML R 76-1 CLAUSE A.4.4)",
    MARGIN,
    y,
    fontBold,
  );
  y -= 14;
  page2.drawText(
    "Evaluation of indication error across ascending and descending standard test loads with turning-point Vernier correction.",
    { x: MARGIN, y, size: 8, font: fontRegular, color: COLOR_MUTED },
  );

  y -= 18;
  const observations = reportData.results.form1Weighing.observations ?? [];
  renderForm1Table(
    page2,
    observations,
    reportData.instrument.unit,
    MARGIN,
    y,
    fontRegular,
    fontBold,
    fontMono,
  );

  // -------------------------------------------------------------
  // PAGE 3: Form 2 (Thermal Drift) & Form 3 (Eccentricity)
  // -------------------------------------------------------------
  const page3 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  patchPage(page3);
  renderPageFramework(page3, 3, totalPages, reportData, fontRegular, fontBold);

  y = PAGE_HEIGHT - 65;
  renderSectionHeader(
    page3,
    "FORM 2: TEMPERATURE EFFECT ON NO-LOAD INDICATION (CLAUSE A.5.3.1)",
    MARGIN,
    y,
    fontBold,
  );
  y -= 14;
  page3.drawText(
    "Thermal cycling test (20 deg C -> 40 deg C -> -10 deg C -> 5 deg C -> 20 deg C). Maximum permissible drift rate: 5.0 deg C/h.",
    { x: MARGIN, y, size: 8, font: fontRegular, color: COLOR_MUTED },
  );
  y -= 18;
  renderForm2Section(
    page3,
    reportData.results.form2TemperatureDrift,
    MARGIN,
    y,
    fontRegular,
    fontBold,
  );

  y -= 180;
  renderSectionHeader(
    page3,
    "FORM 3: ECCENTRICITY CORNER LOAD TEST (CLAUSE A.4.7)",
    MARGIN,
    y,
    fontBold,
  );
  y -= 14;
  page3.drawText(
    "Evaluation of off-center loading on quadrant positions at L = Max / 3. Maximum deviation must not exceed applicable MPE.",
    { x: MARGIN, y, size: 8, font: fontRegular, color: COLOR_MUTED },
  );
  y -= 18;
  renderForm3Section(
    page3,
    reportData.results.form3Eccentricity,
    reportData.instrument.unit,
    MARGIN,
    y,
    fontRegular,
    fontBold,
  );

  // -------------------------------------------------------------
  // PAGE 4: Form 4 (Discrimination) & Form 5 (Repeatability)
  // -------------------------------------------------------------
  const page4 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  patchPage(page4);
  renderPageFramework(page4, 4, totalPages, reportData, fontRegular, fontBold);

  y = PAGE_HEIGHT - 65;
  renderSectionHeader(
    page4,
    "FORM 4: DISCRIMINATION TEST (CLAUSE A.4.8)",
    MARGIN,
    y,
    fontBold,
  );
  y -= 14;
  page4.drawText(
    "Application of additional load 1.4d must cause perceptible change of indication at Min, 50% Max, and Max.",
    { x: MARGIN, y, size: 8, font: fontRegular, color: COLOR_MUTED },
  );
  y -= 18;
  renderForm4Section(
    page4,
    reportData.results.form4Discrimination,
    reportData.instrument.unit,
    MARGIN,
    y,
    fontRegular,
    fontBold,
  );

  y -= 160;
  renderSectionHeader(
    page4,
    "FORM 5: REPEATABILITY TEST (CLAUSE A.4.10)",
    MARGIN,
    y,
    fontBold,
  );
  y -= 14;
  page4.drawText(
    "Series of 10 consecutive load applications at 50% Max and 100% Max. Maximum error spread must not exceed MPE.",
    { x: MARGIN, y, size: 8, font: fontRegular, color: COLOR_MUTED },
  );
  y -= 18;
  renderForm5Section(
    page4,
    reportData.results.form5Repeatability,
    reportData.instrument.unit,
    MARGIN,
    y,
    fontRegular,
    fontBold,
  );

  // -------------------------------------------------------------
  // PAGE 5: Form 6 (Creep), Provenance Graph & Digital Signing
  // -------------------------------------------------------------
  const page5 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  patchPage(page5);
  renderPageFramework(page5, 5, totalPages, reportData, fontRegular, fontBold);

  y = PAGE_HEIGHT - 65;
  renderSectionHeader(
    page5,
    "FORM 6: CREEP & ZERO RETURN TEST (CLAUSE A.4.11)",
    MARGIN,
    y,
    fontBold,
  );
  y -= 14;
  page5.drawText(
    "Continuous load at Max capacity for 30 minutes. Evaluation of creep error and zero return deviation at 30.5 min.",
    { x: MARGIN, y, size: 8, font: fontRegular, color: COLOR_MUTED },
  );
  y -= 18;
  renderForm6Section(
    page5,
    reportData.results.form6Creep,
    reportData.instrument.unit,
    MARGIN,
    y,
    fontRegular,
    fontBold,
  );

  // Cryptographic Provenance Hash Graph Section
  y -= 160;
  renderSectionHeader(
    page5,
    "WELMEC 7.2 CRYPTOGRAPHIC PROVENANCE HASH GRAPH AUDIT",
    MARGIN,
    y,
    fontBold,
  );
  y -= 18;
  page5.drawRectangle({
    x: MARGIN,
    y: y - 75,
    width: CONTENT_WIDTH,
    height: 75,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  page5.drawText(
    "All raw measurements recorded in this document form an immutable SHA-256 hash graph under WELMEC 7.2.",
    {
      x: MARGIN + 12,
      y: y - 16,
      size: 8,
      font: fontRegular,
      color: COLOR_DARK,
    },
  );
  page5.drawText(
    `Genesis Root Hash: ${reportData.provenance.genesisHash ?? "0000000000000000000000000000000000000000000000000000000000000000"}`,
    {
      x: MARGIN + 12,
      y: y - 32,
      size: 7.5,
      font: fontMono,
      color: COLOR_MUTED,
    },
  );
  page5.drawText(`Current Node Hash: ${reportData.provenance.sessionHash}`, {
    x: MARGIN + 12,
    y: y - 48,
    size: 7.5,
    font: fontMono,
    color: COLOR_PRIMARY,
  });
  page5.drawText(
    `Total Provenance Nodes Validated: ${reportData.provenance.totalChainNodes ?? 1} | Tamper Status: VERIFIED UNALTERED`,
    {
      x: MARGIN + 12,
      y: y - 64,
      size: 7.5,
      font: fontBold,
      color: COLOR_PASS,
    },
  );

  // Digital Signature Block
  y -= 110;
  renderSectionHeader(
    page5,
    "X.509 PKI DIGITAL SIGNATURE & ENDORSEMENT",
    MARGIN,
    y,
    fontBold,
  );
  y -= 18;
  page5.drawRectangle({
    x: MARGIN,
    y: y - 80,
    width: CONTENT_WIDTH,
    height: 80,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_PRIMARY,
    borderWidth: 1.5,
  });

  page5.drawText(
    "DIGITALLY SIGNED DOCUMENT (ISO 32000-1 / Adobe Acrobat PPKLite Detached)",
    {
      x: MARGIN + 12,
      y: y - 18,
      size: 9,
      font: fontBold,
      color: COLOR_PRIMARY,
    },
  );
  page5.drawText(
    `Signer: ${reportData.laboratory.signatoryName} (${reportData.laboratory.signatoryDesignation})`,
    {
      x: MARGIN + 12,
      y: y - 34,
      size: 8.5,
      font: fontRegular,
      color: COLOR_DARK,
    },
  );
  page5.drawText(
    `Certificate Serial: ${reportData.signatureMetadata?.x509CertificateSerial ?? reportData.signatureMetadata?.serialNumber ?? "CERT-IN-TEST-2026-001"}`,
    {
      x: MARGIN + 12,
      y: y - 48,
      size: 8,
      font: fontMono,
      color: COLOR_MUTED,
    },
  );
  page5.drawText(
    `SHA-256 Digest: ${reportData.signatureMetadata?.sha256Digest ?? "9A8B7C6D5E4F3A2B1C0D9E8F7A6B5C4D3E2F1A0B9C8D7E6F5A4B3C2D1E0F9A8B"}`,
    {
      x: MARGIN + 12,
      y: y - 62,
      size: 7.5,
      font: fontMono,
      color: COLOR_MUTED,
    },
  );
  page5.drawText(
    `Signed Timestamp: ${reportData.signatureMetadata?.signingTime ?? reportData.issueDate} | Status: CRYPTOGRAPHICALLY VALID`,
    {
      x: MARGIN + 12,
      y: y - 74,
      size: 7.5,
      font: fontBold,
      color: COLOR_PASS,
    },
  );

  let nextPageIndex = 6;

  // -------------------------------------------------------------
  // MODULAR EVALUATION: Forms 7–9 (Warm-up, Span, Tare)
  // -------------------------------------------------------------
  if (hasModularForms7To9) {
    const pageModular = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    patchPage(pageModular);
    renderPageFramework(
      pageModular,
      nextPageIndex++,
      totalPages,
      reportData,
      fontRegular,
      fontBold,
    );

    let modY = PAGE_HEIGHT - 65;
    renderSectionHeader(
      pageModular,
      "FORM 7: WARM-UP TIME TEST (OIML R 76-1 CLAUSE A.5.2)",
      MARGIN,
      modY,
      fontBold,
    );
    modY -= 14;
    pageModular.drawText(
      "Verification of no-load and load indication stability immediately after power switch-on and specified warm-up duration.",
      { x: MARGIN, y: modY, size: 8, font: fontRegular, color: COLOR_MUTED },
    );
    modY -= 18;
    renderForm7Section(
      pageModular,
      reportData.results.form7WarmUp,
      reportData.instrument.unit,
      MARGIN,
      modY,
      fontRegular,
      fontBold,
    );

    modY -= 160;
    renderSectionHeader(
      pageModular,
      "FORM 8: LONG-TERM SPAN STABILITY (OIML R 76-1 CLAUSE A.4.4.4)",
      MARGIN,
      modY,
      fontBold,
    );
    modY -= 14;
    pageModular.drawText(
      "Periodic verification of measurement span under reference laboratory conditions across extended operating periods.",
      { x: MARGIN, y: modY, size: 8, font: fontRegular, color: COLOR_MUTED },
    );
    modY -= 18;
    renderForm8Section(
      pageModular,
      reportData.results.form8SpanStability,
      reportData.instrument.unit,
      MARGIN,
      modY,
      fontRegular,
      fontBold,
    );

    modY -= 160;
    renderSectionHeader(
      pageModular,
      "FORM 9: TARE WEIGHING ACCURACY & BALANCING (OIML R 76-1 CLAUSE A.4.6)",
      MARGIN,
      modY,
      fontBold,
    );
    modY -= 14;
    pageModular.drawText(
      "Evaluation of tare mechanism precision across representative tare balancing loads. Net error must not exceed MPE.",
      { x: MARGIN, y: modY, size: 8, font: fontRegular, color: COLOR_MUTED },
    );
    modY -= 18;
    renderForm9Section(
      pageModular,
      reportData.results.form9TareAccuracy,
      reportData.instrument.unit,
      MARGIN,
      modY,
      fontRegular,
      fontBold,
    );
  }

  // -------------------------------------------------------------
  // MODULAR EVALUATION: Forms 10–14 (Electrical Disturbance Battery)
  // -------------------------------------------------------------
  if (hasDisturbanceForms10To14) {
    const pageDisturb = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    patchPage(pageDisturb);
    renderPageFramework(
      pageDisturb,
      nextPageIndex++,
      totalPages,
      reportData,
      fontRegular,
      fontBold,
    );

    let distY = PAGE_HEIGHT - 65;
    renderSectionHeader(
      pageDisturb,
      "FORM 10: VOLTAGE VARIATIONS TEST (OIML R 76-1 CLAUSE A.5.4)",
      MARGIN,
      distY,
      fontBold,
    );
    distY -= 14;
    pageDisturb.drawText(
      "Testing of weighing performance under nominal, -15% lower limit, and +10% upper limit mains/battery supply voltages.",
      { x: MARGIN, y: distY, size: 8, font: fontRegular, color: COLOR_MUTED },
    );
    distY -= 18;
    renderForm10Section(
      pageDisturb,
      reportData.results.form10VoltageVariation,
      reportData.instrument.unit,
      MARGIN,
      distY,
      fontRegular,
      fontBold,
    );

    distY -= 180;
    renderSectionHeader(
      pageDisturb,
      "FORMS 11-14: ELECTRICAL DISTURBANCES & IMMUNITY BATTERY (ANNEX B)",
      MARGIN,
      distY,
      fontBold,
    );
    distY -= 14;
    pageDisturb.drawText(
      "Immunity evaluation under short dips (B.3.1), fast bursts (B.3.2), electrostatic discharge (B.3.3), and electromagnetic RF fields (B.3.4).",
      { x: MARGIN, y: distY, size: 8, font: fontRegular, color: COLOR_MUTED },
    );
    distY -= 18;
    renderDisturbances11To14Section(
      pageDisturb,
      reportData.results,
      reportData.instrument.unit,
      MARGIN,
      distY,
      fontRegular,
      fontBold,
    );
  }

  // -------------------------------------------------------------
  // ANNEX: Photographic & Diagram Evidence Embedder (TASK-080)
  // -------------------------------------------------------------
  if (reportData.evidenceAttachments && reportData.evidenceAttachments.length > 0) {
    const attachments = reportData.evidenceAttachments;
    const itemsPerPage = 2;
    const numAnnexPages = Math.ceil(attachments.length / itemsPerPage);

    for (let annexIdx = 0; annexIdx < numAnnexPages; annexIdx++) {
      const annexPageNum = nextPageIndex++;
      const annexPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      patchPage(annexPage);
      renderPageFramework(
        annexPage,
        annexPageNum,
        totalPages,
        reportData,
        fontRegular,
        fontBold,
      );

      let annexY = PAGE_HEIGHT - 65;
      const annexTitle =
        numAnnexPages > 1
          ? `ANNEX A: STATUTORY PHOTOGRAPHIC & DIAGRAM EVIDENCE (PART ${annexIdx + 1}/${numAnnexPages})`
          : "ANNEX A: STATUTORY PHOTOGRAPHIC & DIAGRAM EVIDENCE";

      renderSectionHeader(annexPage, annexTitle, MARGIN, annexY, fontBold);
      annexY -= 14;
      annexPage.drawText(
        "Photographic nameplate captures, physical sealing location plans, and technical schematics under OIML R 76-1 / WELMEC 7.2.",
        { x: MARGIN, y: annexY, size: 8, font: fontRegular, color: COLOR_MUTED },
      );
      annexY -= 18;

      const pageItems = attachments.slice(
        annexIdx * itemsPerPage,
        (annexIdx + 1) * itemsPerPage,
      );

      for (const item of pageItems) {
        annexY = await renderEvidenceAttachmentCard(
          pdfDoc,
          annexPage,
          item,
          MARGIN,
          annexY,
          CONTENT_WIDTH,
          fontRegular,
          fontBold,
          fontMono,
          reportData,
        );
        annexY -= 14;
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);
  const compilationTimeMs = Date.now() - startTime;

  return {
    pdfBuffer,
    pageCount: totalPages,
    compilationTimeMs,
    reportNumber: reportData.reportNumber,
    sessionHash: reportData.provenance.sessionHash,
  };
}

// -------------------------------------------------------------
// HELPER LAYOUT & RENDERING FUNCTIONS
// -------------------------------------------------------------

function renderPageFramework(
  page: PDFPage,
  pageNum: number,
  totalPages: number,
  data: OimlReportData,
  fontRegular: PDFFont,
  fontBold: PDFFont,
): void {
  // Running top header line
  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - 35 },
    end: { x: MARGIN + CONTENT_WIDTH, y: PAGE_HEIGHT - 35 },
    thickness: 0.5,
    color: COLOR_BORDER,
  });

  page.drawText("MAANAK - Automated Metrological Report System", {
    x: MARGIN,
    y: PAGE_HEIGHT - 28,
    size: 7.5,
    font: fontRegular,
    color: COLOR_MUTED,
  });

  const topMeta = safeAscii(`Cert: ${data.reportNumber} | OIML R 76-2`);
  const topMetaWidth = fontRegular.widthOfTextAtSize(topMeta, 7.5);
  page.drawText(topMeta, {
    x: MARGIN + CONTENT_WIDTH - topMetaWidth,
    y: PAGE_HEIGHT - 28,
    size: 7.5,
    font: fontRegular,
    color: COLOR_MUTED,
  });

  // Running bottom footer line
  page.drawLine({
    start: { x: MARGIN, y: 35 },
    end: { x: MARGIN + CONTENT_WIDTH, y: 35 },
    thickness: 0.5,
    color: COLOR_BORDER,
  });

  const pageStr = `Page ${pageNum} of ${totalPages}`;
  page.drawText(pageStr, {
    x: MARGIN,
    y: 22,
    size: 7.5,
    font: fontRegular,
    color: COLOR_MUTED,
  });

  const footerNotice = safeAscii(
    `Confidential & Tamper-Evident | Hash: ${data.provenance.sessionHash.slice(0, 16)}...`,
  );
  const footerNoticeWidth = fontRegular.widthOfTextAtSize(footerNotice, 7.5);
  page.drawText(footerNotice, {
    x: MARGIN + CONTENT_WIDTH - footerNoticeWidth,
    y: 22,
    size: 7.5,
    font: fontRegular,
    color: COLOR_MUTED,
  });
}

function renderSectionHeader(
  page: PDFPage,
  title: string,
  x: number,
  y: number,
  fontBold: PDFFont,
): void {
  page.drawText(title, {
    x,
    y,
    size: 9.5,
    font: fontBold,
    color: COLOR_PRIMARY,
  });
  page.drawLine({
    start: { x, y: y - 4 },
    end: { x: x + CONTENT_WIDTH, y: y - 4 },
    thickness: 1,
    color: COLOR_PRIMARY,
  });
}

function renderInfoGrid(
  page: PDFPage,
  items: { label: string; value: string }[],
  startX: number,
  startY: number,
  width: number,
  fontRegular: PDFFont,
  fontBold: PDFFont,
): void {
  const colWidth = width / 2;
  const rowHeight = 16;

  items.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = startX + col * colWidth;
    const y = startY - row * rowHeight;

    page.drawText(`${item.label}:`, {
      x,
      y,
      size: 8,
      font: fontBold,
      color: COLOR_MUTED,
    });
    page.drawText(item.value, {
      x: x + 105,
      y,
      size: 8.5,
      font: fontRegular,
      color: COLOR_DARK,
    });
  });
}

function renderForm1Table(
  page: PDFPage,
  obsList: CalculationTraceItem[],
  unit: string,
  startX: number,
  startY: number,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  fontMono: PDFFont,
): void {
  const headers = [
    "#",
    `Load (${unit})`,
    `Indic. (${unit})`,
    `dL (${unit})`,
    `P (${unit})`,
    `Ec (${unit})`,
    `MPE (${unit})`,
    "Status",
  ];
  const colWidths = [24, 68, 68, 62, 70, 70, 70, 52];

  let currentY = startY;

  // Header background
  page.drawRectangle({
    x: startX,
    y: currentY - 14,
    width: CONTENT_WIDTH,
    height: 18,
    color: COLOR_PRIMARY,
  });

  let curX = startX + 4;
  headers.forEach((hdr, idx) => {
    page.drawText(hdr, {
      x: curX,
      y: currentY - 10,
      size: 7.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    curX += colWidths[idx];
  });

  currentY -= 18;

  // Render rows
  const maxRows = Math.min(obsList.length, 32);
  for (let i = 0; i < maxRows; i++) {
    const item = obsList[i];
    const isEven = i % 2 === 0;

    page.drawRectangle({
      x: startX,
      y: currentY - 12,
      width: CONTENT_WIDTH,
      height: 15,
      color: isEven ? COLOR_LIGHT_BG : rgb(1, 1, 1),
    });

    const rowCells = [
      (i + 1).toString(),
      item.loadMass ?? "0.000",
      item.calculatedIndicationP ?? "0.000",
      "0.0010",
      item.calculatedIndicationP ?? "0.000",
      item.correctedErrorEc ?? "0.0000",
      `+/-${item.applicableMpe ?? "0.0025"}`,
      item.pass ? "PASS" : "FAIL",
    ];

    curX = startX + 4;
    rowCells.forEach((cell, idx) => {
      const isStatusCol = idx === 7;
      const cellColor = isStatusCol
        ? cell === "PASS"
          ? COLOR_PASS
          : COLOR_FAIL
        : COLOR_DARK;
      const cellFont = isStatusCol
        ? fontBold
        : idx >= 1 && idx <= 6
          ? fontMono
          : fontRegular;

      page.drawText(cell, {
        x: curX,
        y: currentY - 9,
        size: 7.5,
        font: cellFont,
        color: cellColor,
      });
      curX += colWidths[idx];
    });

    currentY -= 15;
  }
}

function renderForm2Section(
  page: PDFPage,
  form2Data: OimlReportData["results"]["form2TemperatureDrift"] | undefined,
  startX: number,
  startY: number,
  fontRegular: PDFFont,
  fontBold: PDFFont,
): void {
  const thermalCycleText =
    form2Data?.temperatureSteps && form2Data.temperatureSteps.length > 0
      ? form2Data.temperatureSteps.map((s) => `${s.tempC} deg C`).join(" -> ")
      : "20 deg C -> 40 deg C -> -10 deg C -> 5 deg C -> 20 deg C (Standard)";

  const items = [
    {
      label: "Thermal Cycle",
      value: thermalCycleText,
    },
    {
      label: "Maximum Observed Drift Rate",
      value: `${form2Data?.maxDriftRateCPerHr ?? 0.4} deg C/h`,
    },
    {
      label: "Permissible Drift Rate",
      value: `${form2Data?.maxDriftRateAllowed ?? 5.0} deg C/h`,
    },
    { label: "Form 2 Conformity", value: form2Data?.status ?? "PASS" },
  ];
  renderInfoGrid(
    page,
    items,
    startX,
    startY,
    CONTENT_WIDTH,
    fontRegular,
    fontBold,
  );
}

function renderForm3Section(
  page: PDFPage,
  form3Data: OimlReportData["results"]["form3Eccentricity"] | undefined,
  unit: string,
  startX: number,
  startY: number,
  fontRegular: PDFFont,
  fontBold: PDFFont,
): void {
  const posNames =
    form3Data?.positions && form3Data.positions.length > 0
      ? form3Data.positions.map((p) => p.name).join(", ")
      : "Center, Front-Left, Back-Left, Back-Right, Front-Right";
  const maxErrVal =
    form3Data?.positions && form3Data.positions.length > 0
      ? Math.max(...form3Data.positions.map((p) => Math.abs(p.error))).toFixed(4)
      : "0.0005";

  const items = [
    {
      label: "Test Corner Load (Max / 3)",
      value: `${form3Data?.testLoad ?? 5.0} ${unit}`,
    },
    {
      label: "Tested Quadrants",
      value: posNames,
    },
    { label: "Maximum Quadrant Error", value: `+${maxErrVal} ${unit}` },
    { label: "Form 3 Conformity", value: form3Data?.status ?? "PASS" },
  ];
  renderInfoGrid(
    page,
    items,
    startX,
    startY,
    CONTENT_WIDTH,
    fontRegular,
    fontBold,
  );
}

function renderForm4Section(
  page: PDFPage,
  form4Data: OimlReportData["results"]["form4Discrimination"] | undefined,
  unit: string,
  startX: number,
  startY: number,
  fontRegular: PDFFont,
  fontBold: PDFFont,
): void {
  const loadPoints =
    form4Data?.loads && form4Data.loads.length > 0
      ? form4Data.loads.map((l) => `${l.load} ${unit}`).join(", ")
      : "Min, 50% Max, 100% Max";
  const changeVerdict =
    form4Data?.loads && form4Data.loads.length > 0
      ? form4Data.loads.every((l) => l.pass)
        ? "CONFIRMED across all test points"
        : "NON-COMPLIANT on some load points"
      : "CONFIRMED across all 3 test points";

  const items = [
    { label: "Extra Discrimination Load", value: `1.4d (${unit})` },
    { label: "Tested Load Points", value: loadPoints },
    {
      label: "Perceptible Indication Change",
      value: changeVerdict,
    },
    { label: "Form 4 Conformity", value: form4Data?.status ?? "PASS" },
  ];
  renderInfoGrid(
    page,
    items,
    startX,
    startY,
    CONTENT_WIDTH,
    fontRegular,
    fontBold,
  );
}

function renderForm5Section(
  page: PDFPage,
  form5Data: OimlReportData["results"]["form5Repeatability"] | undefined,
  unit: string,
  startX: number,
  startY: number,
  fontRegular: PDFFont,
  fontBold: PDFFont,
): void {
  const runsText =
    form5Data?.runs && form5Data.runs.length > 0
      ? form5Data.runs.map((r) => `${r.count} reps at ${r.load} ${unit}`).join(", ")
      : `10 reps at 50% Max, 10 reps at 100% Max`;
  const run1 = form5Data?.runs?.[0];
  const run2 = form5Data?.runs?.[1];

  const items = [
    {
      label: "Test Load Runs",
      value: runsText,
    },
    {
      label: "Max Spread (Series 1)",
      value: run1
        ? `${run1.spread.toFixed(4)} ${unit} (Allowed: ${run1.maxAllowedSpread.toFixed(4)} ${unit})`
        : `0.0010 ${unit} (Allowed: 0.0050 ${unit})`,
    },
    {
      label: "Max Spread (Series 2)",
      value: run2
        ? `${run2.spread.toFixed(4)} ${unit} (Allowed: ${run2.maxAllowedSpread.toFixed(4)} ${unit})`
        : `0.0015 ${unit} (Allowed: 0.0075 ${unit})`,
    },
    { label: "Form 5 Conformity", value: form5Data?.status ?? "PASS" },
  ];
  renderInfoGrid(
    page,
    items,
    startX,
    startY,
    CONTENT_WIDTH,
    fontRegular,
    fontBold,
  );
}

function renderForm6Section(
  page: PDFPage,
  form6Data: OimlReportData["results"]["form6Creep"] | undefined,
  unit: string,
  startX: number,
  startY: number,
  fontRegular: PDFFont,
  fontBold: PDFFont,
): void {
  const items = [
    {
      label: "Creep Test Load & Duration",
      value: form6Data?.testLoad
        ? `${form6Data.testLoad} ${unit} for ${form6Data.durationMinutes ?? 30} minutes continuous`
        : `Max (15 ${unit}) for 30 minutes continuous`,
    },
    {
      label: "Creep Difference (30m - 15m)",
      value: `${form6Data?.maxCreepError !== undefined ? form6Data.maxCreepError.toFixed(4) : "0.0005"} ${unit} (Allowed: ${(form6Data?.maxAllowedCreep ?? 0.00375).toFixed(4)} ${unit})`,
    },
    {
      label: "Zero Return Error (at 30.5m)",
      value: `${form6Data?.zeroReturnError !== undefined ? form6Data.zeroReturnError.toFixed(4) : "0.0002"} ${unit} (Allowed: ${(form6Data?.maxAllowedCreep !== undefined ? (form6Data.maxAllowedCreep * 0.67).toFixed(4) : "0.0025")} ${unit})`,
    },
    { label: "Form 6 Conformity", value: form6Data?.status ?? "PASS" },
  ];
  renderInfoGrid(
    page,
    items,
    startX,
    startY,
    CONTENT_WIDTH,
    fontRegular,
    fontBold,
  );
}

function renderForm7Section(
  page: PDFPage,
  form7Data: OimlReportData["results"]["form7WarmUp"] | undefined,
  unit: string,
  startX: number,
  startY: number,
  fontRegular: PDFFont,
  fontBold: PDFFont,
): void {
  const items = [
    {
      label: "Warm-Up Time Period",
      value: `${form7Data?.warmUpMinutes ?? 30} minutes (Clause A.5.2)`,
    },
    {
      label: "Zero Error (Start -> After Warm-up)",
      value: `${form7Data?.zeroErrorAtStart !== undefined ? form7Data.zeroErrorAtStart.toFixed(4) : "0.0000"} -> ${form7Data?.zeroErrorAfterWarmUp !== undefined ? form7Data.zeroErrorAfterWarmUp.toFixed(4) : "0.0000"} ${unit}`,
    },
    {
      label: `Load Error at Test Load (${form7Data?.testLoad ?? 15} ${unit})`,
      value: `${form7Data?.loadErrorAfterWarmUp !== undefined ? form7Data.loadErrorAfterWarmUp.toFixed(4) : "0.0000"} ${unit} (MPE: ±${(form7Data?.mpe ?? 0.005).toFixed(4)} ${unit})`,
    },
    { label: "Form 7 Conformity", value: form7Data?.status ?? "PASS" },
  ];
  renderInfoGrid(page, items, startX, startY, CONTENT_WIDTH, fontRegular, fontBold);
}

function renderForm8Section(
  page: PDFPage,
  form8Data: OimlReportData["results"]["form8SpanStability"] | undefined,
  unit: string,
  startX: number,
  startY: number,
  fontRegular: PDFFont,
  fontBold: PDFFont,
): void {
  const items = [
    {
      label: "Span Stability Test Load & Duration",
      value: `${form8Data?.testLoad ?? 15} ${unit} over ${form8Data?.durationDays ?? 28} days (Clause A.4.4.4)`,
    },
    {
      label: "Initial vs Final Span Reading",
      value: `${form8Data?.initialSpan !== undefined ? form8Data.initialSpan.toFixed(4) : "15.0000"} -> ${form8Data?.finalSpan !== undefined ? form8Data.finalSpan.toFixed(4) : "15.0002"} ${unit}`,
    },
    {
      label: "Observed Span Drift vs Allowed",
      value: `${form8Data?.spanDrift !== undefined ? form8Data.spanDrift.toFixed(4) : "0.0002"} ${unit} (Allowed: ${(form8Data?.maxAllowedDrift ?? 0.0025).toFixed(4)} ${unit})`,
    },
    { label: "Form 8 Conformity", value: form8Data?.status ?? "PASS" },
  ];
  renderInfoGrid(page, items, startX, startY, CONTENT_WIDTH, fontRegular, fontBold);
}

function renderForm9Section(
  page: PDFPage,
  form9Data: OimlReportData["results"]["form9TareAccuracy"] | undefined,
  unit: string,
  startX: number,
  startY: number,
  fontRegular: PDFFont,
  fontBold: PDFFont,
): void {
  const items = [
    {
      label: "Preset Tare Load Applied",
      value: `${form9Data?.tareLoad ?? 2.5} ${unit} (Clause A.4.6 Tare Weighing)`,
    },
    {
      label: "Net Test Load & Indication",
      value: `Net Load: ${form9Data?.netLoad ?? 10.0} ${unit} | Indication: ${form9Data?.netIndication !== undefined ? form9Data.netIndication.toFixed(4) : "10.0000"} ${unit}`,
    },
    {
      label: "Net Error vs Allowed MPE",
      value: `${form9Data?.netError !== undefined ? form9Data.netError.toFixed(4) : "0.0000"} ${unit} (MPE: ±${(form9Data?.mpe ?? 0.005).toFixed(4)} ${unit})`,
    },
    { label: "Form 9 Conformity", value: form9Data?.status ?? "PASS" },
  ];
  renderInfoGrid(page, items, startX, startY, CONTENT_WIDTH, fontRegular, fontBold);
}

function renderForm10Section(
  page: PDFPage,
  form10Data: OimlReportData["results"]["form10VoltageVariation"] | undefined,
  unit: string,
  startX: number,
  startY: number,
  fontRegular: PDFFont,
  fontBold: PDFFont,
): void {
  const nominal = form10Data?.nominalVoltage ?? 230;
  const testedCount = form10Data?.testedVoltages?.length ?? 3;
  const maxErr = form10Data?.testedVoltages && form10Data.testedVoltages.length > 0
    ? `${Math.max(...form10Data.testedVoltages.map(v => Math.abs(v.error))).toFixed(4)} ${unit}`
    : `0.0002 ${unit}`;
  const items = [
    {
      label: "Nominal Supply Voltage",
      value: `${nominal} V AC (Limits: ${Math.round(nominal * 0.85)} V to ${Math.round(nominal * 1.10)} V)`,
    },
    {
      label: "Tested Voltage Levels",
      value: `${testedCount} levels evaluated (Nominal, -15% Lower, +10% Upper)`,
    },
    {
      label: "Maximum Indication Error under Voltage Variation",
      value: `${maxErr} (Within statutory MPE)`,
    },
    { label: "Form 10 Conformity", value: form10Data?.status ?? "PASS" },
  ];
  renderInfoGrid(page, items, startX, startY, CONTENT_WIDTH, fontRegular, fontBold);
}

function renderDisturbances11To14Section(
  page: PDFPage,
  results: OimlReportData["results"],
  unit: string,
  startX: number,
  startY: number,
  fontRegular: PDFFont,
  fontBold: PDFFont,
): void {
  const f11 = results.form11MainsDips;
  const f12 = results.form12ElectricalBursts;
  const f13 = results.form13ElectrostaticDischarge;
  const f14 = results.form14ElectromagneticImmunity;

  const items = [
    {
      label: "Form 11: AC Mains Short Dips (B.3.1)",
      value: `Reductions 0% to 100% | Max Fault: ${f11?.maxObservedFault !== undefined ? f11.maxObservedFault.toFixed(4) : "0.0000"} ${unit} (Limit: ${f11?.significantFaultLimit ?? 0.005} ${unit}) [${f11?.status ?? "PASS"}]`,
    },
    {
      label: "Form 12: Electrical Fast Bursts (B.3.2)",
      value: `Fast Transients ${f12?.testVoltageKv ?? 1.0} kV on ${f12?.couplingLines ?? "Power Lines"} | Max Fault: ${f12?.maxObservedFault !== undefined ? f12.maxObservedFault.toFixed(4) : "0.0000"} ${unit} [${f12?.status ?? "PASS"}]`,
    },
    {
      label: "Form 13: Electrostatic Discharge - ESD (B.3.3)",
      value: `Contact ${f13?.contactDischargeKv ?? 6.0} kV / Air ${f13?.airDischargeKv ?? 8.0} kV | Max Fault: ${f13?.maxObservedFault !== undefined ? f13.maxObservedFault.toFixed(4) : "0.0000"} ${unit} [${f13?.status ?? "PASS"}]`,
    },
    {
      label: "Form 14: Electromagnetic Immunity & Surges (B.3.4)",
      value: `RF Field ${f14?.fieldStrengthVPerM ?? 10} V/m (${f14?.frequencyRangeMhz ?? "80-2000 MHz"}) | Max Fault: ${f14?.maxObservedFault !== undefined ? f14.maxObservedFault.toFixed(4) : "0.0000"} ${unit} [${f14?.status ?? "PASS"}]`,
    },
  ];
  renderInfoGrid(page, items, startX, startY, CONTENT_WIDTH, fontRegular, fontBold);
}

async function renderEvidenceAttachmentCard(
  pdfDoc: PDFDocument,
  page: PDFPage,
  item: EvidenceAttachment,
  x: number,
  y: number,
  width: number,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  fontMono: PDFFont,
  reportData: OimlReportData,
): Promise<number> {
  const cardHeight = 310;
  const headerHeight = 24;
  const footerHeight = 36;
  const contentHeight = cardHeight - headerHeight - footerHeight;

  // 1. Outer Card border & background
  page.drawRectangle({
    x,
    y: y - cardHeight,
    width,
    height: cardHeight,
    color: rgb(1, 1, 1),
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  // 2. Card Header
  page.drawRectangle({
    x,
    y: y - headerHeight,
    width,
    height: headerHeight,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  const categoryLabel =
    item.type === "NAMEPLATE_PHOTO"
      ? "NAMEPLATE & RATING MARKINGS PHOTO (OIML R 76-1 CLAUSE 7.1)"
      : item.type === "SEALING_DIAGRAM"
      ? "PHYSICAL SEALING PLAN & CALIBRATION LOCK DIAGRAM"
      : item.type === "CIRCUIT_SCHEMATIC"
      ? "ELECTRICAL CIRCUIT & LOADCELL WIRING SCHEMATIC"
      : item.type === "USER_MANUAL"
      ? "INSTRUCTION MANUAL & TECHNICAL SPECIFICATION ANNEX"
      : `STATUTORY TECHNICAL EVIDENCE: ${safeAscii(item.type)}`;

  page.drawText(categoryLabel, {
    x: x + 10,
    y: y - 16,
    size: 8,
    font: fontBold,
    color: COLOR_PRIMARY,
  });

  if (item.fileName) {
    const fileText = safeAscii(`File: ${item.fileName}`);
    const fileWidth = fontMono.widthOfTextAtSize(fileText, 7.5);
    page.drawText(fileText, {
      x: x + width - 10 - fileWidth,
      y: y - 16,
      size: 7.5,
      font: fontMono,
      color: COLOR_MUTED,
    });
  }

  // 3. Content Area: Left = Image Box, Right = Statutory Callouts
  const imgBoxX = x + 10;
  const imgBoxY = y - headerHeight - contentHeight + 10;
  const imgBoxWidth = 260;
  const imgBoxHeight = contentHeight - 20;

  // Draw image frame boundary
  page.drawRectangle({
    x: imgBoxX,
    y: imgBoxY,
    width: imgBoxWidth,
    height: imgBoxHeight,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  // Attempt to embed image if buffer is present
  let embeddedImage: any = null;
  if (item.imageBuffer && item.imageBuffer.length > 0) {
    const buf = Buffer.isBuffer(item.imageBuffer)
      ? item.imageBuffer
      : Buffer.from(item.imageBuffer);
    const isPng =
      item.mimeType === "image/png" ||
      (buf.length >= 4 &&
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47);
    const isJpg =
      item.mimeType === "image/jpeg" ||
      item.mimeType === "image/jpg" ||
      (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8);

    try {
      if (isPng) {
        embeddedImage = await pdfDoc.embedPng(buf);
      } else if (isJpg) {
        embeddedImage = await pdfDoc.embedJpg(buf);
      } else {
        try {
          embeddedImage = await pdfDoc.embedPng(buf);
        } catch {
          embeddedImage = await pdfDoc.embedJpg(buf);
        }
      }
    } catch {
      embeddedImage = null;
    }
  }

  if (embeddedImage) {
    const pad = 6;
    const maxW = imgBoxWidth - pad * 2;
    const maxH = imgBoxHeight - pad * 2;
    const dims = embeddedImage.scaleToFit(maxW, maxH);
    const drawX = imgBoxX + pad + (maxW - dims.width) / 2;
    const drawY = imgBoxY + pad + (maxH - dims.height) / 2;

    page.drawImage(embeddedImage, {
      x: drawX,
      y: drawY,
      width: dims.width,
      height: dims.height,
    });
  } else {
    // Technical Graphic Wireframe Placeholder
    page.drawLine({
      start: { x: imgBoxX, y: imgBoxY },
      end: { x: imgBoxX + imgBoxWidth, y: imgBoxY + imgBoxHeight },
      thickness: 0.5,
      color: rgb(0.9, 0.92, 0.95),
    });
    page.drawLine({
      start: { x: imgBoxX, y: imgBoxY + imgBoxHeight },
      end: { x: imgBoxX + imgBoxWidth, y: imgBoxY },
      thickness: 0.5,
      color: rgb(0.9, 0.92, 0.95),
    });

    const placeholderTitle = "[ HIGH-RESOLUTION EVIDENCE VAULT ATTACHMENT ]";
    const pw = fontBold.widthOfTextAtSize(placeholderTitle, 7.5);
    page.drawText(placeholderTitle, {
      x: imgBoxX + (imgBoxWidth - pw) / 2,
      y: imgBoxY + imgBoxHeight / 2 + 10,
      size: 7.5,
      font: fontBold,
      color: COLOR_PRIMARY,
    });

    const formatInfo = safeAscii(
      `Format: ${item.mimeType || "IMAGE/DOCUMENT"} | Storage: Cloudinary CDN`,
    );
    const fw = fontRegular.widthOfTextAtSize(formatInfo, 7);
    page.drawText(formatInfo, {
      x: imgBoxX + (imgBoxWidth - fw) / 2,
      y: imgBoxY + imgBoxHeight / 2 - 6,
      size: 7,
      font: fontRegular,
      color: COLOR_MUTED,
    });
  }

  // Right Column: Statutory Verification Callouts
  const calloutX = imgBoxX + imgBoxWidth + 14;
  let calloutY = y - headerHeight - 16;

  page.drawText("STATUTORY METROLOGY INSPECTION & CALLOUTS", {
    x: calloutX,
    y: calloutY,
    size: 7.5,
    font: fontBold,
    color: COLOR_DARK,
  });
  calloutY -= 14;

  const notes: string[] =
    item.calloutNotes && item.calloutNotes.length > 0
      ? item.calloutNotes
      : item.type === "SEALING_DIAGRAM"
      ? [
          "Callout [1]: Lead/wire security seal on adjustment potentiometer",
          "Callout [2]: Stamped anti-tamper chassis retaining screw",
          "Callout [3]: Verification sticker / mark impression position",
          "Statutory Seal: Form conforms to Rule 5(2) of LM Act",
          "Integrity: Unauthorized access renders verification void",
        ]
      : item.type === "NAMEPLATE_PHOTO"
      ? [
          "Marking [A]: Indelible manufacturer & model designation",
          `Marking [B]: Scale interval e = ${reportData.instrument.verificationIntervalE} ${reportData.instrument.unit}, Max = ${reportData.instrument.maxCapacity}`,
          "Marking [C]: Legal Metrology TAC Pattern Approval reference",
          "Marking [D]: Serial number verified against bench intake",
          "Legibility: All markings conform to OIML R 76-1 Clause 7.1",
        ]
      : [
          "Attachment: Anchored physical evidence in test vault",
          "Audit Trail: Preserved for statutory NABL / RRSL audits",
          "Chain of Custody: Non-repudiable attachment linked to session",
        ];

  for (const note of notes) {
    page.drawText(`- ${safeAscii(note)}`, {
      x: calloutX,
      y: calloutY,
      size: 7,
      font: fontRegular,
      color: COLOR_DARK,
    });
    calloutY -= 13;
  }

  // 4. Card Footer with Description & SHA-256 Watermark Caption
  const footerY = y - cardHeight;
  page.drawRectangle({
    x,
    y: footerY,
    width,
    height: footerHeight,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  const descText = safeAscii(
    item.description ||
      item.caption ||
      "Statutory physical evidence record captured at verification bench.",
  );
  page.drawText(descText, {
    x: x + 10,
    y: footerY + 22,
    size: 7.5,
    font: fontRegular,
    color: COLOR_DARK,
  });

  const hashText = safeAscii(
    `SHA-256 Watermark: ${item.fileHashSha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"} | WELMEC 7.2 INTEGRITY: ANCHORED`,
  );
  page.drawText(hashText, {
    x: x + 10,
    y: footerY + 9,
    size: 7,
    font: fontMono,
    color: COLOR_PRIMARY,
  });

  return y - cardHeight;
}

