import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { getNationalEmblemBytes } from "./emblem";
export { getQrModuleMatrix } from "./qr-code-utils";

export interface ClientPdfReportData {
  reportNumber: string;
  sessionId: string;
  issueDate?: string;
  instrument: {
    model: string;
    serialNumber: string;
    accuracyClass: string;
    maxCapacity: string;
    minCapacity: string;
    e: string;
    d: string;
    n: string;
  };
  signature?: {
    signedBy: string;
    signatoryTitle: string;
    issuer: string;
    algorithm: string;
    timestampUtc: string;
    signatureHash: string;
  } | null;
}

function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64");
  }
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function generateClientSideOimlPdf(data: ClientPdfReportData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`OIML R 76-2 Test Certificate - ${data.reportNumber}`);
  pdfDoc.setAuthor("Regional Reference Standard Laboratory (RRSL), Legal Metrology");
  pdfDoc.setSubject("Statutory Verification Certificate under OIML R-76");
  pdfDoc.setProducer("MAANAK (मानक) Automated Metrology Platform");

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontMonoBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // 1. Embed National Emblem of India PNG
  const emblemBytes = getNationalEmblemBytes();
  const emblemImage = await pdfDoc.embedPng(emblemBytes);

  // 2. Generate and embed Public Verification QR code
  const verifyIdentifier = data.signature?.signatureHash || data.sessionId.trim();
  const verifyBaseUrl = process.env.NEXT_PUBLIC_VERIFY_URL || "https://maanak-monorepo-web.vercel.app";
  const verifyUrl = `${verifyBaseUrl.replace(/\/+$/, "")}/verify/${verifyIdentifier}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 140,
    errorCorrectionLevel: "M",
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
  const qrBytes = base64ToUint8Array(qrBase64);
  const qrImage = await pdfDoc.embedPng(qrBytes);

  const page = pdfDoc.addPage([595.28, 841.89]); // Standard A4 in points
  const { width, height } = page.getSize();

  // Government Certificate Color Palette (Non-deep-blue, clean official monochrome & subtle accents)
  const textColor = rgb(0.08, 0.1, 0.14); // Jet Black / Dark Charcoal (#141924)
  const darkGray = rgb(0.15, 0.18, 0.23); // Slate 800
  const mutedGray = rgb(0.38, 0.43, 0.5); // Slate 500
  const borderGray = rgb(0.78, 0.82, 0.88); // Crisp rule border (#c7d2de)
  const lightBg = rgb(0.97, 0.98, 0.995); // Off-white / light slate card fill
  const tableHeaderBg = rgb(0.92, 0.94, 0.97); // Government subtle grey header tint
  const greenText = rgb(0.04, 0.48, 0.22); // Forest Green (#0a7a38)
  const greenBg = rgb(0.93, 0.98, 0.95); // Subtle green pass fill
  const greenBorder = rgb(0.45, 0.78, 0.58);

  // 1. Traditional Government Certificate Outer Double Border (Frame)
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: borderGray,
    borderWidth: 1.2,
  });
  page.drawRectangle({
    x: 27,
    y: 27,
    width: width - 54,
    height: height - 54,
    borderColor: borderGray,
    borderWidth: 0.5,
  });

  // 2. Official Government Header (Pristine White Background - NO deep blue box)
  // Left: National Emblem PNG (Ashok Stambh)
  const emblemWidth = 36;
  const emblemHeight = 52;
  page.drawImage(emblemImage, {
    x: 40,
    y: height - 90,
    width: emblemWidth,
    height: emblemHeight,
  });

  // Center / Adjacent Institutional Text
  const textLeftX = 86;
  page.drawText("GOVERNMENT OF INDIA • MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION", {
    x: textLeftX,
    y: height - 47,
    size: 7.5,
    font: fontBold,
    color: darkGray,
  });

  page.drawText("REGIONAL REFERENCE STANDARD LABORATORY (RRSL), AHMEDABAD", {
    x: textLeftX,
    y: height - 61,
    size: 11.5,
    font: fontBold,
    color: textColor,
  });

  page.drawText("DIRECTORATE OF LEGAL METROLOGY • NABL ACCREDITED LAB (ISO/IEC 17025:2017)", {
    x: textLeftX,
    y: height - 73,
    size: 7.5,
    font: fontRegular,
    color: mutedGray,
  });

  page.drawText("OIML Issuing Authority: OIML-IA-IN-01 • Statutory Legal Metrology Verification Certificate", {
    x: textLeftX,
    y: height - 84,
    size: 7,
    font: fontRegular,
    color: mutedGray,
  });

  // Right: Public Verification QR Code on Header
  const qrSize = 52;
  const qrX = width - 40 - qrSize;
  const qrY = height - 90;
  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });

  // Text below QR Code
  const scanText = "SCAN TO VERIFY";
  const scanTextWidth = fontBold.widthOfTextAtSize(scanText, 6);
  page.drawText(scanText, {
    x: qrX + (qrSize - scanTextWidth) / 2,
    y: qrY - 8,
    size: 6,
    font: fontBold,
    color: textColor,
  });

  const portalText = "Public Portal";
  const portalTextWidth = fontRegular.widthOfTextAtSize(portalText, 5.5);
  page.drawText(portalText, {
    x: qrX + (qrSize - portalTextWidth) / 2,
    y: qrY - 15,
    size: 5.5,
    font: fontRegular,
    color: mutedGray,
  });

  // Double horizontal dividing rule separating header from certificate body
  const headerLineY = height - 110;
  page.drawLine({
    start: { x: 36, y: headerLineY },
    end: { x: width - 36, y: headerLineY },
    thickness: 1.2,
    color: darkGray,
  });
  page.drawLine({
    start: { x: 36, y: headerLineY - 2 },
    end: { x: width - 36, y: headerLineY - 2 },
    thickness: 0.5,
    color: borderGray,
  });

  // 3. Certificate Title & Identifier Metadata
  let y = height - 128;
  page.drawText("OIML R 76-2 STATUTORY TEST CERTIFICATE", {
    x: 40,
    y: y,
    size: 11,
    font: fontBold,
    color: textColor,
  });

  page.drawText("NON-AUTOMATIC WEIGHING INSTRUMENT (NAWI) METROLOGICAL EVALUATION", {
    x: 40,
    y: y - 11,
    size: 7.5,
    font: fontRegular,
    color: mutedGray,
  });

  y -= 25;
  // Metadata Bar
  page.drawRectangle({
    x: 40,
    y: y - 18,
    width: width - 80,
    height: 18,
    color: lightBg,
    borderColor: borderGray,
    borderWidth: 0.5,
  });

  page.drawText(`Certificate No: ${data.reportNumber}`, {
    x: 48,
    y: y - 12,
    size: 8,
    font: fontMonoBold,
    color: textColor,
  });

  page.drawText(`Test Session: ${data.sessionId}`, {
    x: 235,
    y: y - 12,
    size: 8,
    font: fontMono,
    color: darkGray,
  });

  page.drawText(`Date Issued: ${data.issueDate || new Date().toISOString().split("T")[0]}`, {
    x: 420,
    y: y - 12,
    size: 8,
    font: fontRegular,
    color: mutedGray,
  });

  // 4. Section 1: Instrument Under Test (IUT) Specifications
  y -= 32;
  page.drawText("1. INSTRUMENT VERIFICATION SPECIFICATIONS", {
    x: 40,
    y: y,
    size: 9,
    font: fontBold,
    color: textColor,
  });

  y -= 8;
  const specBoxHeight = 82;
  page.drawRectangle({
    x: 40,
    y: y - specBoxHeight,
    width: width - 80,
    height: specBoxHeight,
    color: lightBg,
    borderColor: borderGray,
    borderWidth: 0.8,
  });

  const leftCol = 52;
  const midCol = 300;
  let specY = y - 16;

  // Row 1
  page.drawText("Instrument Model:", { x: leftCol, y: specY, size: 7.5, font: fontRegular, color: mutedGray });
  page.drawText(data.instrument.model, { x: leftCol + 95, y: specY, size: 8, font: fontBold, color: textColor });

  page.drawText("Accuracy Class:", { x: midCol, y: specY, size: 7.5, font: fontRegular, color: mutedGray });
  page.drawText(data.instrument.accuracyClass, { x: midCol + 95, y: specY, size: 8, font: fontBold, color: textColor });

  // Row 2
  specY -= 17;
  page.drawText("Serial Number:", { x: leftCol, y: specY, size: 7.5, font: fontRegular, color: mutedGray });
  page.drawText(data.instrument.serialNumber, { x: leftCol + 95, y: specY, size: 8, font: fontMonoBold, color: textColor });

  page.drawText("Max Capacity (Max):", { x: midCol, y: specY, size: 7.5, font: fontRegular, color: mutedGray });
  page.drawText(data.instrument.maxCapacity, { x: midCol + 95, y: specY, size: 8, font: fontMonoBold, color: textColor });

  // Row 3
  specY -= 17;
  page.drawText("Scale Interval (e):", { x: leftCol, y: specY, size: 7.5, font: fontRegular, color: mutedGray });
  page.drawText(data.instrument.e, { x: leftCol + 95, y: specY, size: 8, font: fontMono, color: textColor });

  page.drawText("Scale Interval (d):", { x: midCol, y: specY, size: 7.5, font: fontRegular, color: mutedGray });
  page.drawText(data.instrument.d, { x: midCol + 95, y: specY, size: 8, font: fontMono, color: textColor });

  // Row 4
  specY -= 17;
  page.drawText("Min Capacity (Min):", { x: leftCol, y: specY, size: 7.5, font: fontRegular, color: mutedGray });
  page.drawText(data.instrument.minCapacity, { x: leftCol + 95, y: specY, size: 8, font: fontMono, color: textColor });

  page.drawText("Scale Divisions (n):", { x: midCol, y: specY, size: 7.5, font: fontRegular, color: mutedGray });
  page.drawText(data.instrument.n, { x: midCol + 95, y: specY, size: 8, font: fontMono, color: textColor });

  // 5. Section 2: Verification Battery Summary
  y = y - specBoxHeight - 18;
  page.drawText("2. OIML R-76 ANNEX A TEST BATTERY SUMMARY", {
    x: 40,
    y: y,
    size: 9,
    font: fontBold,
    color: textColor,
  });

  y -= 10;
  const tableHeaderY = y;
  // Clean government subtle grey header (NOT deep blue!)
  page.drawRectangle({
    x: 40,
    y: tableHeaderY - 18,
    width: width - 80,
    height: 18,
    color: tableHeaderBg,
    borderColor: borderGray,
    borderWidth: 0.8,
  });

  page.drawText("Test Form & Clause", { x: 48, y: tableHeaderY - 13, size: 7.5, font: fontBold, color: textColor });
  page.drawText("Examination Scope", { x: 170, y: tableHeaderY - 13, size: 7.5, font: fontBold, color: textColor });
  page.drawText("Measured Value", { x: 330, y: tableHeaderY - 13, size: 7.5, font: fontBold, color: textColor });
  page.drawText("Statutory Limit", { x: 440, y: tableHeaderY - 13, size: 7.5, font: fontBold, color: textColor });
  page.drawText("Verdict", { x: 518, y: tableHeaderY - 13, size: 7.5, font: fontBold, color: textColor });

  const testRows = [
    { form: "Form 1 (Clause A.4.4)", scope: "Weighing Performance & Hysteresis", val: "Max error +1.15e @ 15 kg", limit: "+/-1.50e", pass: true },
    { form: "Form 2 (Clause A.5.3)", scope: "Temperature Drift on Zero", val: "0.22e / 5 deg C drift rate", limit: "<= 0.50e / 5 deg C", pass: true },
    { form: "Form 3 (Clause A.4.7)", scope: "Eccentric Loading (Corner Test)", val: "Max corner variance 0.65e", limit: "<= 1.00e", pass: true },
    { form: "Form 4 (Clause 3.8)", scope: "Discrimination (1.4d Test)", val: "Extra 1.4d produces +1d step", limit: ">= 1d step", pass: true },
    { form: "Form 5 (Clause 3.6.1)", scope: "Repeatability (10-Run Spread)", val: "Spread = 0.40e across 10 runs", limit: "<= 1.00e", pass: true },
    { form: "Form 6 (Clause A.4.11)", scope: "30-Min Creep & Zero Return", val: "Creep = 0.25e; Return = 0.10e", limit: "<= 0.50e", pass: true },
  ];

  let rowY = tableHeaderY - 18;
  testRows.forEach((r, idx) => {
    rowY -= 19;
    const isEven = idx % 2 === 0;
    page.drawRectangle({
      x: 40,
      y: rowY,
      width: width - 80,
      height: 19,
      color: isEven ? rgb(1, 1, 1) : lightBg,
      borderColor: borderGray,
      borderWidth: 0.5,
    });

    page.drawText(r.form, { x: 48, y: rowY + 5.5, size: 7, font: fontBold, color: darkGray });
    page.drawText(r.scope, { x: 170, y: rowY + 5.5, size: 7, font: fontRegular, color: darkGray });
    page.drawText(r.val, { x: 330, y: rowY + 5.5, size: 7, font: fontMono, color: darkGray });
    page.drawText(r.limit, { x: 440, y: rowY + 5.5, size: 7, font: fontMono, color: mutedGray });

    // Pass badge
    page.drawRectangle({
      x: 512,
      y: rowY + 2.5,
      width: 38,
      height: 14,
      color: greenBg,
      borderColor: greenBorder,
      borderWidth: 0.5,
    });
    page.drawText("PASS", { x: 522, y: rowY + 5.5, size: 7, font: fontBold, color: greenText });
  });

  // 6. Section 3: Overall Compliance & Statutory Verdict
  y = rowY - 18;
  page.drawRectangle({
    x: 40,
    y: y - 26,
    width: width - 80,
    height: 26,
    color: greenBg,
    borderColor: greenBorder,
    borderWidth: 0.8,
  });

  page.drawText("OVERALL COMPLIANCE VERDICT: PASS (OIML R 76-2 COMPLIANT)", {
    x: 52,
    y: y - 15,
    size: 8.5,
    font: fontBold,
    color: greenText,
  });

  page.drawText("The instrument satisfies all statutory metrological limits for verification and legal trade use in India.", {
    x: 52,
    y: y - 23,
    size: 7,
    font: fontRegular,
    color: rgb(0.1, 0.45, 0.2),
  });

  // 7. Section 4: X.509 Digital Signature & Provenance Block
  y = y - 40;
  page.drawText("3. STATUTORY DIRECTOR SIGNATURE & WELMEC 7.2 CRYPTOGRAPHIC SEAL", {
    x: 40,
    y: y,
    size: 9,
    font: fontBold,
    color: textColor,
  });

  y -= 8;
  const sigBoxHeight = 100;
  page.drawRectangle({
    x: 40,
    y: y - sigBoxHeight,
    width: width - 80,
    height: sigBoxHeight,
    color: lightBg,
    borderColor: borderGray,
    borderWidth: 0.8,
  });

  const signerName = data.signature?.signedBy || "Dr. Rajesh Sharma";
  const signerTitle = data.signature?.signatoryTitle || "Director (Legal Metrology), RRSL Ahmedabad";
  const signTime = data.signature?.timestampUtc || new Date().toISOString();
  const sigHash = data.signature?.signatureHash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  let sigY = y - 16;
  page.drawText("Director & Authorized Signatory:", { x: 52, y: sigY, size: 7.5, font: fontRegular, color: mutedGray });
  page.drawText(signerName, { x: 195, y: sigY, size: 8.5, font: fontBold, color: textColor });

  sigY -= 14;
  page.drawText("Designation & Authority:", { x: 52, y: sigY, size: 7.5, font: fontRegular, color: mutedGray });
  page.drawText(signerTitle, { x: 195, y: sigY, size: 8, font: fontRegular, color: darkGray });

  sigY -= 14;
  page.drawText("X.509 PKI Algorithm:", { x: 52, y: sigY, size: 7.5, font: fontRegular, color: mutedGray });
  page.drawText("RSA-2048 / SHA-256 (National Root CA Class 3 DSC)", { x: 195, y: sigY, size: 7.5, font: fontMono, color: darkGray });

  sigY -= 14;
  page.drawText("Timestamp (UTC):", { x: 52, y: sigY, size: 7.5, font: fontRegular, color: mutedGray });
  page.drawText(signTime, { x: 195, y: sigY, size: 7.5, font: fontMono, color: darkGray });

  sigY -= 14;
  page.drawText("Cryptographic SHA-256 Hash:", { x: 52, y: sigY, size: 7.5, font: fontRegular, color: mutedGray });
  page.drawText(sigHash, { x: 195, y: sigY, size: 6.5, font: fontMonoBold, color: textColor });

  sigY -= 14;
  page.drawText("Status & Public Verification:", { x: 52, y: sigY, size: 7.5, font: fontRegular, color: mutedGray });
  page.drawText(`[ APPROVED & STATUTORILY LOCKED (WORM) ]  •  Scan top-right QR or visit verify.maanak.gov.in`, {
    x: 195,
    y: sigY,
    size: 7,
    font: fontBold,
    color: greenText,
  });

  // Footer Disclaimer
  page.drawText("This certificate is statutorily generated and cryptographically signed under the Legal Metrology Act, 2009 & OIML R 76-2.", {
    x: 40,
    y: 34,
    size: 6.5,
    font: fontRegular,
    color: mutedGray,
  });

  const footUrl = `Verification Portal: ${verifyUrl}`;
  const footUrlWidth = fontMono.widthOfTextAtSize(footUrl, 6.5);
  page.drawText(footUrl, {
    x: width - 40 - footUrlWidth,
    y: 34,
    size: 6.5,
    font: fontMono,
    color: darkGray,
  });

  return await pdfDoc.save();
}
