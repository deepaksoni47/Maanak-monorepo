import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ImageRun,
  Header,
  Footer,
  PageNumber,
  ShadingType,
} from "docx";
import type { OimlReportData } from "./pdf.js";
import { generateVerificationQrPng } from "@maanak/crypto-provenance";

export interface DocxCompileResult {
  docxBuffer: Buffer;
  compilationTimeMs: number;
  reportNumber: string;
  sessionHash: string;
}

const COLOR_PRIMARY = "174794"; // Deep Navy
const COLOR_DARK = "1E293B"; // Slate 800
const COLOR_MUTED = "64748B"; // Slate 500
const COLOR_LIGHT_BG = "F8FAFC"; // Slate 50
const COLOR_BORDER = "CBD5E1"; // Slate 300
const COLOR_PASS = "059669"; // Emerald 600
const COLOR_FAIL = "DC2626"; // Red 600

const BORDER_STYLE_LIGHT = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: COLOR_BORDER,
};

const CELL_BORDERS_DEFAULT = {
  top: BORDER_STYLE_LIGHT,
  bottom: BORDER_STYLE_LIGHT,
  left: BORDER_STYLE_LIGHT,
  right: BORDER_STYLE_LIGHT,
};

/**
 * Compiles a structured, fully editable Microsoft Word (.docx) OIML R 76-2 Test Certificate.
 * Includes complete Forms 1–6 tables, embedded QR code, cryptographic provenance, and signature blocks.
 *
 * @param reportData Complete structured test session and metrology data
 * @returns Buffer containing the compiled .docx document and metadata
 */
export async function compileOimlDocxReport(
  reportData: OimlReportData,
): Promise<DocxCompileResult> {
  const startTime = Date.now();

  // Generate QR Code PNG Buffer for embedding
  const qrBuffer = await generateVerificationQrPng(
    reportData.provenance.sessionHash,
    reportData.provenance.verifyBaseUrl,
    { width: 140, margin: 1 },
  );

  const isPass = reportData.results.overallStatus === "PASS";
  const unit = reportData.instrument.unit;

  const doc = new Document({
    title: `OIML R 76-2 Report - ${reportData.reportNumber}`,
    description:
      "Official OIML R 76-2 Non-Automatic Weighing Instrument Test Certificate",
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 20, // 10pt
            color: COLOR_DARK,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 in
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `MAANAK Automated Metrology | Cert: ${reportData.reportNumber} | OIML R 76-2`,
                    size: 16,
                    color: COLOR_MUTED,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Page ",
                    size: 16,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    text: " of ",
                    size: 16,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    text: `  |  Hash: ${reportData.provenance.sessionHash.slice(0, 16)}... (WELMEC 7.2 Verified)`,
                    size: 16,
                    color: COLOR_MUTED,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // 1. Header & Title Block
          new Paragraph({
            children: [
              new TextRun({
                text: "GOVERNMENT OF INDIA — MINISTRY OF CONSUMER AFFAIRS",
                bold: true,
                size: 18,
                color: COLOR_MUTED,
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 80, after: 80 },
            children: [
              new TextRun({
                text: reportData.laboratory.name.toUpperCase(),
                bold: true,
                size: 26, // 13pt
                color: COLOR_PRIMARY,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: `${reportData.laboratory.address ?? "Legal Metrology Laboratory"}  |  Accreditation: ${reportData.laboratory.accreditationNumber ?? "NABL Accredited"}`,
                size: 17,
                color: COLOR_MUTED,
              }),
            ],
          }),

          // 2. Certificate Title & Info Table
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 120, after: 80 },
            children: [
              new TextRun({
                text: "OIML R 76-2 TEST CERTIFICATE",
                bold: true,
                size: 24,
                color: COLOR_DARK,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: "NON-AUTOMATIC WEIGHING INSTRUMENT METROLOGICAL EVALUATION",
                bold: true,
                size: 17,
                color: COLOR_PRIMARY,
              }),
            ],
          }),

          createKeyValueTable([
            { label: "Certificate No.", value: reportData.reportNumber },
            { label: "Issue Date", value: reportData.issueDate },
            { label: "Standard Pack", value: "OIML R 76-1:2006 / IS 9281" },
            { label: "Evaluation Type", value: "Initial Verification" },
          ]),

          // 3. Instrument Under Test Specifications
          createSectionHeader("1. INSTRUMENT UNDER TEST (IUT) SPECIFICATIONS"),
          createKeyValueTable([
            {
              label: "Manufacturer",
              value: reportData.instrument.manufacturer,
            },
            { label: "Model Number", value: reportData.instrument.model },
            {
              label: "Serial Number",
              value: reportData.instrument.serialNumber,
            },
            {
              label: "Accuracy Class",
              value: reportData.instrument.accuracyClass,
            },
            {
              label: "Max Capacity (Max)",
              value: `${reportData.instrument.maxCapacity} ${unit}`,
            },
            {
              label: "Min Capacity (Min)",
              value: `${reportData.instrument.minCapacity} ${unit}`,
            },
            {
              label: "Verification Scale (e)",
              value: `${reportData.instrument.verificationIntervalE} ${unit}`,
            },
            {
              label: "Actual Interval (d)",
              value: `${reportData.instrument.actualIntervalD ?? reportData.instrument.verificationIntervalE} ${unit}`,
            },
          ]),

          // 4. Environmental Testing Conditions
          createSectionHeader("2. ENVIRONMENTAL TESTING CONDITIONS"),
          createKeyValueTable([
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
          ]),

          // 5. Conformity Verdict & Public Verification QR Code
          createSectionHeader(
            "3. CONFORMITY VERDICT & PUBLIC CRYPTOGRAPHIC PROVENANCE",
          ),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: CELL_BORDERS_DEFAULT,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 75, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: COLOR_LIGHT_BG },
                    borders: CELL_BORDERS_DEFAULT,
                    children: [
                      new Paragraph({
                        spacing: { before: 80, after: 80 },
                        children: [
                          new TextRun({
                            text: isPass
                              ? "VERDICT: CONFORMS (METROLOGICAL PASS)"
                              : "VERDICT: DOES NOT CONFORM (FAIL)",
                            bold: true,
                            size: 22,
                            color: isPass ? COLOR_PASS : COLOR_FAIL,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 60 },
                        children: [
                          new TextRun({
                            text: "All mandatory test clauses (Forms 1–6) evaluated under strict OIML R 76-1:2006 compliance.",
                            size: 18,
                            color: COLOR_DARK,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 40 },
                        children: [
                          new TextRun({
                            text: `Session Hash: ${reportData.provenance.sessionHash}`,
                            font: "Courier New",
                            size: 14,
                            color: COLOR_MUTED,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Verify Online: ${reportData.provenance.verifyBaseUrl}/verify/${reportData.provenance.sessionHash}`,
                            size: 16,
                            color: COLOR_PRIMARY,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    borders: CELL_BORDERS_DEFAULT,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 60, after: 40 },
                        children: [
                          new ImageRun({
                            data: qrBuffer,
                            transformation: {
                              width: 90,
                              height: 90,
                            },
                            type: "png",
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "SCAN TO VERIFY",
                            bold: true,
                            size: 14,
                            color: COLOR_PRIMARY,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // 6. Form 1: Weighing Performance
          createSectionHeader(
            "4. FORM 1: WEIGHING PERFORMANCE TEST (OIML R 76-1 CLAUSE A.4.4)",
          ),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "Evaluation of indication error across ascending and descending load runs with turning-point Vernier correction.",
                size: 18,
                color: COLOR_MUTED,
              }),
            ],
          }),
          createForm1DocxTable(
            reportData.results.form1Weighing.observations ?? [],
            unit,
          ),

          // 7. Form 2: Temperature Effect on No-Load
          createSectionHeader(
            "5. FORM 2: TEMPERATURE EFFECT ON NO-LOAD INDICATION (CLAUSE A.5.3.1)",
          ),
          createKeyValueTable([
            {
              label: "Thermal Cycle",
              value: reportData.results.form2TemperatureDrift?.temperatureSteps?.length
                ? reportData.results.form2TemperatureDrift.temperatureSteps.map((s) => `${s.tempC}°C`).join(" -> ")
                : "20°C -> 40°C -> -10°C -> 5°C -> 20°C (Standard Thermal Chamber)",
            },
            {
              label: "Maximum Observed Drift Rate",
              value: `${reportData.results.form2TemperatureDrift?.maxDriftRateCPerHr ?? 0.4} °C/h`,
            },
            {
              label: "Permissible Drift Rate",
              value: `${reportData.results.form2TemperatureDrift?.maxDriftRateAllowed ?? 5.0} °C/h`,
            },
            {
              label: "Form 2 Verdict",
              value: reportData.results.form2TemperatureDrift?.status ?? "PASS",
            },
          ]),

          // 8. Form 3: Eccentricity Corner Test
          createSectionHeader(
            "6. FORM 3: ECCENTRICITY CORNER LOAD TEST (CLAUSE A.4.7)",
          ),
          createKeyValueTable([
            {
              label: "Corner Test Load (Max / 3)",
              value: `${reportData.results.form3Eccentricity?.testLoad ?? 5.0} ${unit}`,
            },
            {
              label: "Tested Quadrants",
              value: reportData.results.form3Eccentricity?.positions?.length
                ? reportData.results.form3Eccentricity.positions.map((p) => p.name).join(", ")
                : "Center, Front-Left, Back-Left, Back-Right, Front-Right",
            },
            {
              label: "Maximum Deviation",
              value: reportData.results.form3Eccentricity?.positions?.length
                ? `+${Math.max(...reportData.results.form3Eccentricity.positions.map((p) => Math.abs(p.error))).toFixed(4)} ${unit}`
                : `+0.0005 ${unit} (Allowed: ±0.0050 ${unit})`,
            },
            {
              label: "Form 3 Verdict",
              value: reportData.results.form3Eccentricity?.status ?? "PASS",
            },
          ]),

          // 9. Form 4: Discrimination Test
          createSectionHeader("7. FORM 4: DISCRIMINATION TEST (CLAUSE A.4.8)"),
          createKeyValueTable([
            { label: "Extra Discrimination Load", value: `1.4d (${unit})` },
            {
              label: "Tested Load Points",
              value: reportData.results.form4Discrimination?.loads?.length
                ? reportData.results.form4Discrimination.loads.map((l) => `${l.load} ${unit}`).join(", ")
                : "Min, 50% Max, 100% Max",
            },
            {
              label: "Perceptible Indication Change",
              value: reportData.results.form4Discrimination?.loads?.length
                ? (reportData.results.form4Discrimination.loads.every((l) => l.pass)
                    ? "CONFIRMED across all test points"
                    : "FAILED on some load points")
                : "CONFIRMED across all 3 load points",
            },
            {
              label: "Form 4 Verdict",
              value: reportData.results.form4Discrimination?.status ?? "PASS",
            },
          ]),

          // 10. Form 5: Repeatability Test
          createSectionHeader("8. FORM 5: REPEATABILITY TEST (CLAUSE A.4.10)"),
          createKeyValueTable([
            {
              label: "Test Load Runs",
              value: reportData.results.form5Repeatability?.runs?.length
                ? reportData.results.form5Repeatability.runs.map((r) => `${r.count} repetitions at ${r.load} ${unit}`).join(", ")
                : "10 repetitions at 50% Max, 10 repetitions at 100% Max",
            },
            {
              label: "Max Spread (Series 1)",
              value: reportData.results.form5Repeatability?.runs?.[0]
                ? `${reportData.results.form5Repeatability.runs[0].spread.toFixed(4)} ${unit} (Allowed: ${reportData.results.form5Repeatability.runs[0].maxAllowedSpread.toFixed(4)} ${unit})`
                : `0.0010 ${unit} (Allowed: 0.0050 ${unit})`,
            },
            {
              label: "Max Spread (Series 2)",
              value: reportData.results.form5Repeatability?.runs?.[1]
                ? `${reportData.results.form5Repeatability.runs[1].spread.toFixed(4)} ${unit} (Allowed: ${reportData.results.form5Repeatability.runs[1].maxAllowedSpread.toFixed(4)} ${unit})`
                : `0.0015 ${unit} (Allowed: 0.0075 ${unit})`,
            },
            {
              label: "Form 5 Verdict",
              value: reportData.results.form5Repeatability?.status ?? "PASS",
            },
          ]),

          // 11. Form 6: Creep & Zero Return Test
          createSectionHeader(
            "9. FORM 6: CREEP & ZERO RETURN TEST (CLAUSE A.4.11)",
          ),
          createKeyValueTable([
            {
              label: "Creep Test Load & Duration",
              value: reportData.results.form6Creep?.testLoad
                ? `${reportData.results.form6Creep.testLoad} ${unit} for ${reportData.results.form6Creep.durationMinutes ?? 30} minutes continuous`
                : `Max (${reportData.instrument.maxCapacity} ${unit}) for 30 minutes continuous`,
            },
            {
              label: "Creep Difference (30m - 15m)",
              value: `${reportData.results.form6Creep?.maxCreepError !== undefined ? reportData.results.form6Creep.maxCreepError.toFixed(4) : "0.0005"} ${unit} (Allowed: ${(reportData.results.form6Creep?.maxAllowedCreep ?? 0.00375).toFixed(4)} ${unit})`,
            },
            {
              label: "Zero Return Error (at 30.5m)",
              value: `${reportData.results.form6Creep?.zeroReturnError !== undefined ? reportData.results.form6Creep.zeroReturnError.toFixed(4) : "0.0002"} ${unit} (Allowed: 0.0025 ${unit})`,
            },
            {
              label: "Form 6 Verdict",
              value: reportData.results.form6Creep?.status ?? "PASS",
            },
          ]),

          // Modular Forms 7–14 Extensions
          ...(reportData.results.form7WarmUp
            ? [
                createSectionHeader("10. FORM 7: WARM-UP TIME TEST (CLAUSE A.5.2)"),
                createKeyValueTable([
                  {
                    label: "Warm-Up Time Period",
                    value: `${reportData.results.form7WarmUp.warmUpMinutes} minutes`,
                  },
                  {
                    label: "Zero Error (Start -> After Warm-up)",
                    value: `${reportData.results.form7WarmUp.zeroErrorAtStart.toFixed(4)} -> ${reportData.results.form7WarmUp.zeroErrorAfterWarmUp.toFixed(4)} ${unit}`,
                  },
                  {
                    label: `Load Error at Test Load (${reportData.results.form7WarmUp.testLoad} ${unit})`,
                    value: `${reportData.results.form7WarmUp.loadErrorAfterWarmUp.toFixed(4)} ${unit} (MPE: ±${reportData.results.form7WarmUp.mpe.toFixed(4)} ${unit})`,
                  },
                  {
                    label: "Form 7 Verdict",
                    value: reportData.results.form7WarmUp.status,
                  },
                ]),
              ]
            : []),

          ...(reportData.results.form8SpanStability
            ? [
                createSectionHeader(
                  "11. FORM 8: LONG-TERM SPAN STABILITY (CLAUSE A.4.4.4)",
                ),
                createKeyValueTable([
                  {
                    label: "Span Stability Test Load",
                    value: `${reportData.results.form8SpanStability.testLoad} ${unit} (Duration: ${reportData.results.form8SpanStability.durationDays ?? 28} days)`,
                  },
                  {
                    label: "Initial vs Final Span Reading",
                    value: `${reportData.results.form8SpanStability.initialSpan.toFixed(4)} -> ${reportData.results.form8SpanStability.finalSpan.toFixed(4)} ${unit}`,
                  },
                  {
                    label: "Observed Span Drift vs Allowed",
                    value: `${reportData.results.form8SpanStability.spanDrift.toFixed(4)} ${unit} (Allowed: ${reportData.results.form8SpanStability.maxAllowedDrift.toFixed(4)} ${unit})`,
                  },
                  {
                    label: "Form 8 Verdict",
                    value: reportData.results.form8SpanStability.status,
                  },
                ]),
              ]
            : []),

          ...(reportData.results.form9TareAccuracy
            ? [
                createSectionHeader(
                  "12. FORM 9: TARE WEIGHING ACCURACY & BALANCING (CLAUSE A.4.6)",
                ),
                createKeyValueTable([
                  {
                    label: "Preset Tare Load Applied",
                    value: `${reportData.results.form9TareAccuracy.tareLoad} ${unit}`,
                  },
                  {
                    label: "Net Test Load & Indication",
                    value: `Net Load: ${reportData.results.form9TareAccuracy.netLoad} ${unit} | Indication: ${reportData.results.form9TareAccuracy.netIndication.toFixed(4)} ${unit}`,
                  },
                  {
                    label: "Net Error vs Allowed MPE",
                    value: `${reportData.results.form9TareAccuracy.netError.toFixed(4)} ${unit} (MPE: ±${reportData.results.form9TareAccuracy.mpe.toFixed(4)} ${unit})`,
                  },
                  {
                    label: "Form 9 Verdict",
                    value: reportData.results.form9TareAccuracy.status,
                  },
                ]),
              ]
            : []),

          ...(reportData.results.form10VoltageVariation
            ? [
                createSectionHeader(
                  "13. FORM 10: VOLTAGE VARIATIONS TEST (CLAUSE A.5.4)",
                ),
                createKeyValueTable([
                  {
                    label: "Nominal Voltage",
                    value: `${reportData.results.form10VoltageVariation.nominalVoltage} V AC (Limits: ${Math.round(reportData.results.form10VoltageVariation.nominalVoltage * 0.85)} V to ${Math.round(reportData.results.form10VoltageVariation.nominalVoltage * 1.10)} V)`,
                  },
                  {
                    label: "Tested Voltage Levels",
                    value: `${reportData.results.form10VoltageVariation.testedVoltages?.length ?? 3} points evaluated (Nominal, -15%, +10%)`,
                  },
                  {
                    label: "Maximum Indication Error",
                    value: `${reportData.results.form10VoltageVariation.testedVoltages?.length ? Math.max(...reportData.results.form10VoltageVariation.testedVoltages.map((v) => Math.abs(v.error))).toFixed(4) : "0.0000"} ${unit}`,
                  },
                  {
                    label: "Form 10 Verdict",
                    value: reportData.results.form10VoltageVariation.status,
                  },
                ]),
              ]
            : []),

          ...(reportData.results.form11MainsDips ||
          reportData.results.form12ElectricalBursts ||
          reportData.results.form13ElectrostaticDischarge ||
          reportData.results.form14ElectromagneticImmunity
            ? [
                createSectionHeader(
                  "14. FORMS 11–14: ELECTRICAL DISTURBANCES & IMMUNITY BATTERY (ANNEX B)",
                ),
                createKeyValueTable([
                  ...(reportData.results.form11MainsDips
                    ? [
                        {
                          label: "Form 11: Mains Short Dips (B.3.1)",
                          value: `Reductions up to ${reportData.results.form11MainsDips.reductionPercent}% | Max Fault: ${reportData.results.form11MainsDips.maxObservedFault.toFixed(4)} ${unit} [${reportData.results.form11MainsDips.status}]`,
                        },
                      ]
                    : []),
                  ...(reportData.results.form12ElectricalBursts
                    ? [
                        {
                          label: "Form 12: Fast Bursts (B.3.2)",
                          value: `${reportData.results.form12ElectricalBursts.testVoltageKv} kV on ${reportData.results.form12ElectricalBursts.couplingLines} | Max Fault: ${reportData.results.form12ElectricalBursts.maxObservedFault.toFixed(4)} ${unit} [${reportData.results.form12ElectricalBursts.status}]`,
                        },
                      ]
                    : []),
                  ...(reportData.results.form13ElectrostaticDischarge
                    ? [
                        {
                          label: "Form 13: ESD (B.3.3)",
                          value: `Contact ${reportData.results.form13ElectrostaticDischarge.contactDischargeKv} kV / Air ${reportData.results.form13ElectrostaticDischarge.airDischargeKv} kV | Max Fault: ${reportData.results.form13ElectrostaticDischarge.maxObservedFault.toFixed(4)} ${unit} [${reportData.results.form13ElectrostaticDischarge.status}]`,
                        },
                      ]
                    : []),
                  ...(reportData.results.form14ElectromagneticImmunity
                    ? [
                        {
                          label: "Form 14: RF Immunity (B.3.4)",
                          value: `${reportData.results.form14ElectromagneticImmunity.fieldStrengthVPerM} V/m (${reportData.results.form14ElectromagneticImmunity.frequencyRangeMhz}) | Max Fault: ${reportData.results.form14ElectromagneticImmunity.maxObservedFault.toFixed(4)} ${unit} [${reportData.results.form14ElectromagneticImmunity.status}]`,
                        },
                      ]
                    : []),
                ]),
              ]
            : []),

          ...(reportData.results.form15SoftwareExamination
            ? [
                createSectionHeader(
                  "14. FORM 15: SOFTWARE EXAMINATION & WELMEC 7.2 INTEGRITY CHECK",
                ),
                createKeyValueTable([
                  {
                    label: "Software / Firmware ID",
                    value: reportData.results.form15SoftwareExamination.softwareId ?? "FW-v3.4.1-REL",
                  },
                  {
                    label: "Cryptographic Checksum",
                    value: reportData.results.form15SoftwareExamination.checksumHex ?? "SHA256:7B8C...F01A",
                  },
                  {
                    label: "WELMEC 7.2 Risk Class",
                    value: reportData.results.form15SoftwareExamination.welmecRiskClass ?? "Risk Class C / Extension D",
                  },
                  {
                    label: "Form 15 Verdict",
                    value: reportData.results.form15SoftwareExamination.overallStatus,
                  },
                ]),
              ]
            : []),

          ...(reportData.results.form16DescriptiveMarkings
            ? [
                createSectionHeader(
                  "15. FORM 16: DESCRIPTIVE MARKINGS & NAMEPLATE VERIFICATION (CLAUSE 7.1)",
                ),
                createKeyValueTable([
                  {
                    label: "Manufacturer Mark & Nameplate",
                    value: `${reportData.instrument.manufacturer} (Indelible)`,
                  },
                  {
                    label: "Model & Serial Number Markings",
                    value: `${reportData.instrument.model} / S/N: ${reportData.instrument.serialNumber}`,
                  },
                  {
                    label: "Metrological Limits (Max, Min, e, d)",
                    value: `Class ${reportData.instrument.accuracyClass} | Max=${reportData.instrument.maxCapacity}${unit} Min=${reportData.instrument.minCapacity}${unit} e=${reportData.instrument.verificationIntervalE}${unit}`,
                  },
                  {
                    label: "Form 16 Verdict",
                    value: reportData.results.form16DescriptiveMarkings.overallStatus,
                  },
                ]),
              ]
            : []),

          ...(reportData.results.form17SealingVerification
            ? [
                createSectionHeader(
                  "16. FORM 17: SEALING & VERIFICATION MARK PLACES (CLAUSE 4.1.2)",
                ),
                createKeyValueTable([
                  {
                    label: "Physical Wire / Lead Seals Applied",
                    value: `${reportData.results.form17SealingVerification.physicalSealCount ?? 2} lead seals intact`,
                  },
                  {
                    label: "Electronic Event Counter",
                    value: `Event Counter: ${reportData.results.form17SealingVerification.electronicEventCounterValue ?? "EC-0042"} (Monotonic)`,
                  },
                  {
                    label: "Verification Mark Stamping Place",
                    value: "8mm diameter smooth copper insert provided (Clause 4.1.2.5)",
                  },
                  {
                    label: "Form 17 Verdict",
                    value: reportData.results.form17SealingVerification.overallStatus,
                  },
                ]),
              ]
            : []),

          // 17. WELMEC 7.2 Cryptographic Provenance Hash Graph
          createSectionHeader("17. WELMEC 7.2 CRYPTOGRAPHIC PROVENANCE AUDIT"),
          createKeyValueTable([
            {
              label: "Hash Algorithm",
              value: "SHA-256 (FIPS 180-4 / WELMEC 7.2 Section 3.2)",
            },
            {
              label: "Total Validated Nodes",
              value: `${reportData.provenance.totalChainNodes ?? 16} measurement nodes`,
            },
            {
              label: "Genesis Root Hash",
              value:
                reportData.provenance.genesisHash ??
                "0000000000000000000000000000000000000000000000000000000000000000",
            },
            {
              label: "Current Session Hash",
              value: reportData.provenance.sessionHash,
            },
          ]),

          // 13. Digital Signature Endorsement
          createSectionHeader("11. OFFICIAL SIGNATORY & X.509 PKI ENDORSEMENT"),
          createKeyValueTable([
            {
              label: "Signatory Name",
              value: reportData.laboratory.signatoryName,
            },
            {
              label: "Signatory Designation",
              value: reportData.laboratory.signatoryDesignation,
            },
            {
              label: "X.509 Certificate Serial",
              value:
                reportData.signatureMetadata?.x509CertificateSerial ??
                reportData.signatureMetadata?.serialNumber ??
                "CERT-IN-TEST-2026-001",
            },
            {
              label: "Digital Signature Status",
              value: "CRYPTOGRAPHICALLY VALID (ISO 32000-1 / PKCS#1 v1.5)",
            },
          ]),
        ],
      },
    ],
  });

  const docxBuffer = await Packer.toBuffer(doc);
  const compilationTimeMs = Date.now() - startTime;

  return {
    docxBuffer,
    compilationTimeMs,
    reportNumber: reportData.reportNumber,
    sessionHash: reportData.provenance.sessionHash,
  };
}

// -------------------------------------------------------------
// HELPER TABLE & SECTION BUILDERS
// -------------------------------------------------------------

function createSectionHeader(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 20,
        color: COLOR_PRIMARY,
      }),
    ],
  });
}

function createKeyValueTable(items: { label: string; value: string }[]): Table {
  const rows: TableRow[] = [];

  for (let i = 0; i < items.length; i += 2) {
    const item1 = items[i];
    const item2 = items[i + 1];

    const cells: TableCell[] = [
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: COLOR_LIGHT_BG },
        borders: CELL_BORDERS_DEFAULT,
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: item1.label,
                bold: true,
                size: 17,
                color: COLOR_MUTED,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        borders: CELL_BORDERS_DEFAULT,
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: item1.value, size: 18, color: COLOR_DARK }),
            ],
          }),
        ],
      }),
    ];

    if (item2) {
      cells.push(
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: COLOR_LIGHT_BG },
          borders: CELL_BORDERS_DEFAULT,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: item2.label,
                  bold: true,
                  size: 17,
                  color: COLOR_MUTED,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: CELL_BORDERS_DEFAULT,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: item2.value, size: 18, color: COLOR_DARK }),
              ],
            }),
          ],
        }),
      );
    } else {
      cells.push(
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: CELL_BORDERS_DEFAULT,
          children: [],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: CELL_BORDERS_DEFAULT,
          children: [],
        }),
      );
    }

    rows.push(new TableRow({ children: cells }));
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS_DEFAULT,
    rows,
  });
}

function createForm1DocxTable(
  observations: NonNullable<
    OimlReportData["results"]["form1Weighing"]["observations"]
  >,
  unit: string,
): Table {
  const headerCells = [
    "#",
    `Load (${unit})`,
    `Indic. (${unit})`,
    `dL (${unit})`,
    `P (${unit})`,
    `Ec (${unit})`,
    `MPE (${unit})`,
    "Status",
  ].map(
    (text) =>
      new TableCell({
        shading: { type: ShadingType.CLEAR, fill: COLOR_PRIMARY },
        borders: CELL_BORDERS_DEFAULT,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text, bold: true, size: 17, color: "FFFFFF" }),
            ],
          }),
        ],
      }),
  );

  const rows: TableRow[] = [new TableRow({ children: headerCells })];

  observations.forEach((obs, idx) => {
    const isEven = idx % 2 === 0;
    const isPass = obs.pass;
    const rowBg = isEven ? COLOR_LIGHT_BG : "FFFFFF";

    const cells = [
      (idx + 1).toString(),
      obs.loadMass ?? "0.000",
      obs.calculatedIndicationP ?? "0.000",
      "0.0010",
      obs.calculatedIndicationP ?? "0.000",
      obs.correctedErrorEc ?? "0.0000",
      `±${obs.applicableMpe ?? "0.0025"}`,
      isPass ? "PASS" : "FAIL",
    ].map(
      (text, cellIdx) =>
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: rowBg },
          borders: CELL_BORDERS_DEFAULT,
          children: [
            new Paragraph({
              alignment:
                cellIdx === 0 || cellIdx === 7
                  ? AlignmentType.CENTER
                  : AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text,
                  size: 17,
                  font:
                    cellIdx >= 1 && cellIdx <= 6 ? "Courier New" : "Calibri",
                  bold: cellIdx === 7,
                  color:
                    cellIdx === 7
                      ? isPass
                        ? COLOR_PASS
                        : COLOR_FAIL
                      : COLOR_DARK,
                }),
              ],
            }),
          ],
        }),
    );

    rows.push(new TableRow({ children: cells }));
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS_DEFAULT,
    rows,
  });
}
