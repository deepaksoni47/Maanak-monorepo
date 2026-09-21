import type { CalculationTraceItem } from "@maanak/types";

export interface ChartTheme {
  background?: string;
  axisColor?: string;
  gridColor?: string;
  textColor?: string;
  zeroLineColor?: string;
  passPointColor?: string;
  failPointColor?: string;
  envelopeLineColor?: string;
  envelopeFillColor?: string;
  curveColor?: string;
  descendingCurveColor?: string;
}

export interface ErrorCurveOptions {
  /**
   * Total SVG canvas width in points/pixels.
   * Default: 800
   */
  width?: number;

  /**
   * Total SVG canvas height in points/pixels.
   * Default: 460
   */
  height?: number;

  /**
   * Chart main header title.
   * Default: "OIML R 76-2 Weighing Performance Error Curve"
   */
  title?: string;

  /**
   * Subtitle text with instrument details or test conditions.
   */
  subtitle?: string;

  /**
   * Mass unit for the X-axis (e.g. "kg", "g", "mg").
   * Default: "kg"
   */
  unit?: string;

  /**
   * Verification scale interval e (with unit or value).
   */
  verificationIntervalE?: string | number;

  /**
   * Accuracy Class (e.g. "Class I", "Class II", "Class III", "Class IIII").
   */
  accuracyClass?: string;

  /**
   * Whether to render the shaded ±MPE tolerance envelope region.
   * Default: true
   */
  includeToleranceArea?: boolean;

  /**
   * Whether to render faint background grid lines.
   * Default: true
   */
  includeGrid?: boolean;

  /**
   * Custom theme color overrides.
   */
  theme?: ChartTheme;
}

export interface PlottedErrorPoint {
  index: number;
  load: number;
  indication: number;
  rawError: number;
  correctedError: number;
  mpe: number;
  pass: boolean;
  direction: "ASCENDING" | "DESCENDING";
}

const DEFAULT_THEME: Required<ChartTheme> = {
  background: "#ffffff",
  axisColor: "#475569", // slate-600
  gridColor: "#e2e8f0", // slate-200
  textColor: "#1e293b", // slate-800
  zeroLineColor: "#0f172a", // slate-900 (prominent baseline)
  passPointColor: "#059669", // emerald-600
  failPointColor: "#dc2626", // red-600
  envelopeLineColor: "#e11d48", // rose-600 (distinct tolerance boundary)
  envelopeFillColor: "rgba(244, 63, 94, 0.08)", // subtle translucent rose fill
  curveColor: "#2563eb", // blue-600 (loading series)
  descendingCurveColor: "#7c3aed", // violet-600 (unloading series)
};

/**
 * Parses and sanitizes a list of CalculationTraceItems into clean numeric plotted points,
 * detecting load direction (ascending vs descending).
 */
export function extractErrorCurveData(
  observations: CalculationTraceItem[],
): PlottedErrorPoint[] {
  let prevLoad = -1;
  let isDescending = false;

  return observations.map((obs, idx) => {
    const load = parseFloat(obs.loadMass ?? "0");
    const indication = parseFloat(obs.calculatedIndicationP ?? "0");
    const rawError = parseFloat(obs.rawErrorE ?? "0");
    const correctedError = parseFloat(obs.correctedErrorEc ?? "0");
    const mpe = Math.abs(parseFloat(obs.applicableMpe ?? "0"));
    const pass = obs.pass ?? Math.abs(correctedError) <= mpe + 1e-9;

    if (idx > 0 && load < prevLoad) {
      isDescending = true;
    }
    prevLoad = load;

    return {
      index: idx + 1,
      load: isNaN(load) ? 0 : load,
      indication: isNaN(indication) ? 0 : indication,
      rawError: isNaN(rawError) ? 0 : rawError,
      correctedError: isNaN(correctedError) ? 0 : correctedError,
      mpe: isNaN(mpe) ? 0 : mpe,
      pass,
      direction: isDescending ? "DESCENDING" : "ASCENDING",
    };
  });
}

/**
 * Generates an official OIML R 76-2 vector error curve SVG graph.
 * Displays corrected error Ec versus Load mass, with stepped ±MPE tolerance envelopes.
 *
 * @param observations Array of CalculationTraceItem from weighing test (Form 1)
 * @param maxCapacity Maximum instrument capacity Max (number or string)
 * @param options Styling and layout customization options
 * @returns Clean, accessible SVG string with XML namespace
 */
export function generateErrorCurveSvg(
  observations: CalculationTraceItem[],
  maxCapacity?: string | number,
  options: ErrorCurveOptions = {},
): string {
  const width = options.width ?? 800;
  const height = options.height ?? 460;
  const unit = options.unit ?? "kg";
  const includeToleranceArea = options.includeToleranceArea ?? true;
  const includeGrid = options.includeGrid ?? true;
  const theme = { ...DEFAULT_THEME, ...options.theme };

  const parsedPoints = extractErrorCurveData(observations);

  // Determine Max capacity for X-axis scaling
  let maxCapNum =
    typeof maxCapacity === "string"
      ? parseFloat(maxCapacity)
      : (maxCapacity ?? 0);
  if (isNaN(maxCapNum) || maxCapNum <= 0) {
    const highestObsLoad = Math.max(0, ...parsedPoints.map((p) => p.load));
    maxCapNum = highestObsLoad > 0 ? highestObsLoad : 15;
  }

  // Margins and plotting bounds
  const marginLeft = 80;
  const marginRight = 40;
  const marginTop = options.subtitle ? 85 : 65;
  const marginBottom = 65;
  const plotWidth = Math.max(width - marginLeft - marginRight, 100);
  const plotHeight = Math.max(height - marginTop - marginBottom, 100);

  // Determine Y-axis bounds: error scale must be symmetric around zero (Ec = 0)
  let maxAbsError = 0;
  let maxMpe = 0;
  for (const p of parsedPoints) {
    if (Math.abs(p.correctedError) > maxAbsError)
      maxAbsError = Math.abs(p.correctedError);
    if (p.mpe > maxMpe) maxMpe = p.mpe;
  }
  const yCeiling = Math.max(maxAbsError, maxMpe * 1.15, 0.001);
  // Round up to a pleasant tick magnitude
  const yAbsMax = parseFloat(yCeiling.toPrecision(2));
  const yMin = -yAbsMax;
  const yMax = yAbsMax;

  // Coordinate mapper functions
  const toScreenX = (loadVal: number): number => {
    const ratio = Math.max(0, Math.min(loadVal / maxCapNum, 1.05));
    return marginLeft + ratio * plotWidth;
  };

  const toScreenY = (errVal: number): number => {
    const clamped = Math.max(yMin * 1.1, Math.min(yMax * 1.1, errVal));
    const ratio = (yMax - clamped) / (yMax - yMin);
    return marginTop + ratio * plotHeight;
  };

  const zeroY = toScreenY(0);

  // Build SVG elements
  const svgParts: string[] = [];

  // 1. Root container and styles
  svgParts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="OIML R 76-2 Weighing Error Curve Chart">`,
    `  <defs>`,
    `    <style>`,
    `      .chart-title { font-family: system-ui, -apple-system, sans-serif; font-size: 16px; font-weight: 700; fill: ${theme.textColor}; }`,
    `      .chart-subtitle { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; fill: ${theme.axisColor}; }`,
    `      .axis-label { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 600; fill: ${theme.textColor}; }`,
    `      .tick-label { font-family: system-ui, -apple-system, sans-serif; font-size: 10px; fill: ${theme.axisColor}; text-anchor: middle; }`,
    `      .legend-text { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; fill: ${theme.textColor}; }`,
    `    </style>`,
    `  </defs>`,
    `  <rect width="${width}" height="${height}" fill="${theme.background}" rx="6" />`,
  );

  // 2. Chart Titles & Metadata
  const mainTitle =
    options.title ?? "OIML R 76-2 Weighing Performance Error Curve";
  svgParts.push(
    `  <!-- Title & Metadata -->`,
    `  <text x="${marginLeft}" y="28" class="chart-title">${escapeXml(mainTitle)}</text>`,
  );

  const subDetails: string[] = [];
  if (options.accuracyClass) subDetails.push(`Class: ${options.accuracyClass}`);
  subDetails.push(`Max: ${maxCapNum} ${unit}`);
  if (options.verificationIntervalE)
    subDetails.push(`e: ${options.verificationIntervalE}`);
  subDetails.push(`Points: ${parsedPoints.length}`);

  const subText = options.subtitle
    ? `${options.subtitle} | ${subDetails.join(" | ")}`
    : subDetails.join(" | ");

  svgParts.push(
    `  <text x="${marginLeft}" y="48" class="chart-subtitle">${escapeXml(subText)}</text>`,
  );

  // 3. Background Grid
  if (includeGrid) {
    svgParts.push(`  <!-- Grid Lines -->`);
    // Vertical grid lines (5 subdivisions)
    for (let i = 1; i <= 5; i++) {
      const loadVal = (maxCapNum / 5) * i;
      const x = toScreenX(loadVal);
      svgParts.push(
        `  <line x1="${x.toFixed(1)}" y1="${marginTop}" x2="${x.toFixed(1)}" y2="${marginTop + plotHeight}" stroke="${theme.gridColor}" stroke-width="1" stroke-dasharray="3 3" />`,
      );
    }
    // Horizontal grid lines (4 intervals across yMin..yMax)
    const ySteps = [-yAbsMax, -yAbsMax * 0.5, yAbsMax * 0.5, yAbsMax];
    for (const yStep of ySteps) {
      const y = toScreenY(yStep);
      svgParts.push(
        `  <line x1="${marginLeft}" y1="${y.toFixed(1)}" x2="${marginLeft + plotWidth}" y2="${y.toFixed(1)}" stroke="${theme.gridColor}" stroke-width="1" stroke-dasharray="3 3" />`,
      );
    }
  }

  // 4. MPE Tolerance Envelopes (Shaded region & boundary stepped lines)
  if (includeToleranceArea && parsedPoints.length > 0) {
    svgParts.push(`  <!-- MPE Tolerance Envelopes (Stepped Brackets) -->`);

    // Sort unique points by load to construct stepped envelopes
    const sortedPoints = [...parsedPoints].sort((a, b) => a.load - b.load);

    // Build upper points (+MPE) and lower points (-MPE)
    const upperPoints: { x: number; y: number }[] = [];
    const lowerPoints: { x: number; y: number }[] = [];

    // Anchor at zero load
    const firstMpe = sortedPoints[0]?.mpe ?? 0;
    upperPoints.push({ x: toScreenX(0), y: toScreenY(firstMpe) });
    lowerPoints.push({ x: toScreenX(0), y: toScreenY(-firstMpe) });

    for (let i = 0; i < sortedPoints.length; i++) {
      const pt = sortedPoints[i];
      const prevMpe = i > 0 ? sortedPoints[i - 1].mpe : firstMpe;
      const screenX = toScreenX(pt.load);

      // Step transition at load point
      if (pt.mpe !== prevMpe) {
        upperPoints.push({ x: screenX, y: toScreenY(prevMpe) });
        lowerPoints.push({ x: screenX, y: toScreenY(-prevMpe) });
      }
      upperPoints.push({ x: screenX, y: toScreenY(pt.mpe) });
      lowerPoints.push({ x: screenX, y: toScreenY(-pt.mpe) });
    }

    // Extend envelope to Max capacity if needed
    const lastPt = sortedPoints[sortedPoints.length - 1];
    if (lastPt && lastPt.load < maxCapNum) {
      const maxX = toScreenX(maxCapNum);
      upperPoints.push({ x: maxX, y: toScreenY(lastPt.mpe) });
      lowerPoints.push({ x: maxX, y: toScreenY(-lastPt.mpe) });
    }

    // Assemble filled polygon: Upper points left-to-right, then Lower points right-to-left
    const polygonPath = [
      ...upperPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
      ...[...lowerPoints]
        .reverse()
        .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    ].join(" ");

    svgParts.push(
      `  <polygon points="${polygonPath}" fill="${theme.envelopeFillColor}" />`,
    );

    // Stepped upper and lower envelope lines
    const upperLineD = upperPoints
      .map(
        (p, idx) =>
          `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
      )
      .join(" ");
    const lowerLineD = lowerPoints
      .map(
        (p, idx) =>
          `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
      )
      .join(" ");

    svgParts.push(
      `  <path d="${upperLineD}" stroke="${theme.envelopeLineColor}" stroke-width="1.5" stroke-dasharray="4 3" fill="none" />`,
      `  <path d="${lowerLineD}" stroke="${theme.envelopeLineColor}" stroke-width="1.5" stroke-dasharray="4 3" fill="none" />`,
    );
  }

  // 5. Zero Error Baseline (Ec = 0)
  svgParts.push(
    `  <!-- Zero Baseline (Ec = 0) -->`,
    `  <line x1="${marginLeft}" y1="${zeroY.toFixed(1)}" x2="${marginLeft + plotWidth}" y2="${zeroY.toFixed(1)}" stroke="${theme.zeroLineColor}" stroke-width="1.5" />`,
  );

  // 6. Primary Axes (X and Y)
  svgParts.push(
    `  <!-- Axes -->`,
    `  <line x1="${marginLeft}" y1="${marginTop}" x2="${marginLeft}" y2="${marginTop + plotHeight}" stroke="${theme.axisColor}" stroke-width="1.5" />`,
    `  <line x1="${marginLeft}" y1="${marginTop + plotHeight}" x2="${marginLeft + plotWidth}" y2="${marginTop + plotHeight}" stroke="${theme.axisColor}" stroke-width="1.5" />`,
  );

  // 7. Y-Axis Ticks & Labels
  const yTickValues = [yAbsMax, yAbsMax * 0.5, 0, -yAbsMax * 0.5, -yAbsMax];
  for (const tickVal of yTickValues) {
    const y = toScreenY(tickVal);
    const formatted =
      tickVal > 0 ? `+${formatNumber(tickVal)}` : formatNumber(tickVal);
    svgParts.push(
      `  <line x1="${marginLeft - 5}" y1="${y.toFixed(1)}" x2="${marginLeft}" y2="${y.toFixed(1)}" stroke="${theme.axisColor}" stroke-width="1.5" />`,
      `  <text x="${marginLeft - 10}" y="${(y + 3.5).toFixed(1)}" class="tick-label" style="text-anchor: end;">${formatted}</text>`,
    );
  }
  // Y-axis title
  const yLabelX = 22;
  const yLabelY = marginTop + plotHeight / 2;
  svgParts.push(
    `  <text x="${yLabelX}" y="${yLabelY}" class="axis-label" transform="rotate(-90 ${yLabelX} ${yLabelY})" style="text-anchor: middle;">Corrected Error Ec (${unit})</text>`,
  );

  // 8. X-Axis Ticks & Labels
  for (let i = 0; i <= 5; i++) {
    const loadVal = (maxCapNum / 5) * i;
    const x = toScreenX(loadVal);
    svgParts.push(
      `  <line x1="${x.toFixed(1)}" y1="${marginTop + plotHeight}" x2="${x.toFixed(1)}" y2="${marginTop + plotHeight + 5}" stroke="${theme.axisColor}" stroke-width="1.5" />`,
      `  <text x="${x.toFixed(1)}" y="${marginTop + plotHeight + 18}" class="tick-label">${formatNumber(loadVal)}</text>`,
    );
  }
  // X-axis title
  svgParts.push(
    `  <text x="${marginLeft + plotWidth / 2}" y="${marginTop + plotHeight + 38}" class="axis-label" style="text-anchor: middle;">Applied Test Load L (${unit})</text>`,
  );

  // 9. Plotted Error Curves (Ascending & Descending)
  const ascendingPoints = parsedPoints.filter(
    (p) => p.direction === "ASCENDING",
  );
  const descendingPoints = parsedPoints.filter(
    (p) => p.direction === "DESCENDING",
  );

  if (ascendingPoints.length > 1) {
    const ascPathD = ascendingPoints
      .map((p, idx) => {
        const x = toScreenX(p.load).toFixed(1);
        const y = toScreenY(p.correctedError).toFixed(1);
        return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
    svgParts.push(
      `  <!-- Ascending Loading Curve -->`,
      `  <path d="${ascPathD}" fill="none" stroke="${theme.curveColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`,
    );
  }

  if (descendingPoints.length > 1) {
    const descPathD = descendingPoints
      .map((p, idx) => {
        const x = toScreenX(p.load).toFixed(1);
        const y = toScreenY(p.correctedError).toFixed(1);
        return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
    svgParts.push(
      `  <!-- Descending Unloading Curve -->`,
      `  <path d="${descPathD}" fill="none" stroke="${theme.descendingCurveColor}" stroke-width="2" stroke-dasharray="4 2" stroke-linecap="round" stroke-linejoin="round" />`,
    );
  }

  // 10. Data Point Markers (<circle> with interactive <title> tooltips)
  svgParts.push(`  <!-- Plotted Observation Points -->`);
  for (const pt of parsedPoints) {
    const cx = toScreenX(pt.load).toFixed(1);
    const cy = toScreenY(pt.correctedError).toFixed(1);
    const fill = pt.pass ? theme.passPointColor : theme.failPointColor;
    const sign = pt.correctedError > 0 ? "+" : "";
    const tooltip = `Point #${pt.index} (${pt.direction})\nLoad: ${pt.load} ${unit}\nIndication: ${pt.indication}\nEc: ${sign}${pt.correctedError} ${unit}\nMPE: ±${pt.mpe} ${unit}\nStatus: ${pt.pass ? "PASS" : "FAIL"}`;

    svgParts.push(
      `  <circle cx="${cx}" cy="${cy}" r="4.5" fill="${fill}" stroke="#ffffff" stroke-width="1.5">`,
      `    <title>${escapeXml(tooltip)}</title>`,
      `  </circle>`,
    );
  }

  // 11. Chart Legend (Bottom right or below title)
  const legendY = marginTop - 16;
  const legendStartX = marginLeft + plotWidth - 360;

  svgParts.push(
    `  <!-- Chart Legend -->`,
    `  <g transform="translate(${legendStartX}, ${legendY})">`,
    `    <!-- Loading Curve Legend -->`,
    `    <line x1="0" y1="0" x2="18" y2="0" stroke="${theme.curveColor}" stroke-width="2.5" />`,
    `    <circle cx="9" cy="0" r="3" fill="${theme.passPointColor}" stroke="#ffffff" stroke-width="1" />`,
    `    <text x="24" y="3.5" class="legend-text">Loading (Ec)</text>`,

    `    <!-- MPE Envelope Legend -->`,
    `    <line x1="125" y1="0" x2="145" y2="0" stroke="${theme.envelopeLineColor}" stroke-width="1.5" stroke-dasharray="3 2" />`,
    `    <text x="151" y="3.5" class="legend-text">±MPE Envelope</text>`,

    `    <!-- Zero Line Legend -->`,
    `    <line x1="260" y1="0" x2="278" y2="0" stroke="${theme.zeroLineColor}" stroke-width="1.5" />`,
    `    <text x="284" y="3.5" class="legend-text">Zero (Ec=0)</text>`,
    `  </g>`,
  );

  svgParts.push(`</svg>`);

  return svgParts.join("\n");
}

/**
 * Cleanly formats a floating point number for chart ticks and labels.
 */
function formatNumber(num: number): string {
  if (Number.isInteger(num)) return num.toString();
  if (Math.abs(num) >= 1) return num.toFixed(2).replace(/\.?0+$/, "");
  return num.toFixed(4).replace(/\.?0+$/, "");
}

/**
 * Escapes XML/SVG special characters in text nodes and attribute values.
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
