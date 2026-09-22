"use client";

import React from "react";

export interface ErrorPoint {
  load: number; // in kg
  errorEc: number; // in units of e (verification scale interval)
  type: "ascending" | "descending";
}

export interface VectorErrorCurveProps {
  maxCapacity?: number; // e.g. 15 kg
  eVal?: number; // e.g. 5 g = 0.005 kg
  points?: ErrorPoint[];
  className?: string;
}

const DEFAULT_POINTS: ErrorPoint[] = [
  { load: 0, errorEc: 0.0, type: "ascending" },
  { load: 1.0, errorEc: 0.12, type: "ascending" },
  { load: 2.5, errorEc: 0.28, type: "ascending" },
  { load: 5.0, errorEc: 0.42, type: "ascending" },
  { load: 7.5, errorEc: 0.65, type: "ascending" },
  { load: 10.0, errorEc: 0.84, type: "ascending" },
  { load: 12.5, errorEc: 0.95, type: "ascending" },
  { load: 15.0, errorEc: 1.15, type: "ascending" },
  { load: 10.0, errorEc: 0.78, type: "descending" },
  { load: 5.0, errorEc: 0.38, type: "descending" },
  { load: 0, errorEc: 0.04, type: "descending" },
];

export function VectorErrorCurve({
  maxCapacity = 15,
  points = DEFAULT_POINTS,
  className = "",
}: VectorErrorCurveProps) {
  // SVG dimensions
  const width = 700;
  const height = 300;
  const padding = { top: 30, right: 30, bottom: 45, left: 55 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // X range: 0 to maxCapacity (15 kg)
  // Y range: -2.0e to +2.0e (verification intervals)
  const yMin = -2.0;
  const yMax = 2.0;

  const xScale = (load: number) =>
    padding.left + (load / maxCapacity) * plotWidth;

  const yScale = (error: number) =>
    padding.top + ((yMax - error) / (yMax - yMin)) * plotHeight;

  // Table 6 Class III MPE envelope steps:
  // 0 to 500e (2.5 kg) -> ±0.5e
  // 500e to 2000e (10.0 kg) -> ±1.0e
  // 2000e to 3000e (15.0 kg) -> ±1.5e
  const mpeStepsUpper = [
    { x: 0, y: 0.5 },
    { x: 2.5, y: 0.5 },
    { x: 2.5, y: 1.0 },
    { x: 10.0, y: 1.0 },
    { x: 10.0, y: 1.5 },
    { x: 15.0, y: 1.5 },
  ];

  const mpeStepsLower = [
    { x: 0, y: -0.5 },
    { x: 2.5, y: -0.5 },
    { x: 2.5, y: -1.0 },
    { x: 10.0, y: -1.0 },
    { x: 10.0, y: -1.5 },
    { x: 15.0, y: -1.5 },
  ];

  const makePath = (coords: { x: number; y: number }[]) =>
    coords
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${xScale(pt.x)} ${yScale(pt.y)}`)
      .join(" ");

  const upperMpePath = makePath(mpeStepsUpper);
  const lowerMpePath = makePath(mpeStepsLower);

  // Separate ascending and descending points
  const ascendingPoints = points.filter((p) => p.type === "ascending");
  const descendingPoints = points.filter((p) => p.type === "descending");

  const ascendingPath = ascendingPoints
    .map(
      (p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.load)} ${yScale(p.errorEc)}`
    )
    .join(" ");

  const descendingPath = descendingPoints
    .map(
      (p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.load)} ${yScale(p.errorEc)}`
    )
    .join(" ");

  return (
    <div
      className={`rounded-2xl border border-border/80 bg-card/60 p-4 font-sans ${className}`}
      data-testid="vector-error-curve"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>OIML R 76-2 Clause 3.5.1 Vector Error Curve (Ec vs Load)</span>
          </h4>
          <p className="text-xs text-muted-foreground">
            Stepped Table 6 MPE envelopes (±0.5e, ±1.0e, ±1.5e) with hysteresis loop
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" />
            <span className="text-muted-foreground">Ascending (▲)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
            <span className="text-muted-foreground">Descending (▼)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1 w-4 bg-rose-500/80 inline-block border-t border-dashed border-rose-500" />
            <span className="text-muted-foreground">±MPE Bound</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px]"
          aria-label="OIML R 76-2 Vector Error Curve"
        >
          {/* Grid lines */}
          {[-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5].map((yVal) => (
            <line
              key={yVal}
              x1={padding.left}
              y1={yScale(yVal)}
              x2={width - padding.right}
              y2={yScale(yVal)}
              stroke="currentColor"
              strokeOpacity={yVal === 0 ? 0.3 : 0.1}
              strokeDasharray={yVal === 0 ? "none" : "3,3"}
              className="text-border"
            />
          ))}

          {[0, 2.5, 5.0, 7.5, 10.0, 12.5, 15.0].map((xVal) => (
            <line
              key={xVal}
              x1={xScale(xVal)}
              y1={padding.top}
              x2={xScale(xVal)}
              y2={height - padding.bottom}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeDasharray="3,3"
              className="text-border"
            />
          ))}

          {/* Upper MPE stepped envelope */}
          <path
            d={upperMpePath}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="1.75"
            strokeDasharray="4,3"
          />

          {/* Lower MPE stepped envelope */}
          <path
            d={lowerMpePath}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="1.75"
            strokeDasharray="4,3"
          />

          {/* Safe MPE Area fill */}
          <polygon
            points={`
              ${xScale(0)},${yScale(0.5)}
              ${xScale(2.5)},${yScale(0.5)}
              ${xScale(2.5)},${yScale(1.0)}
              ${xScale(10.0)},${yScale(1.0)}
              ${xScale(10.0)},${yScale(1.5)}
              ${xScale(15.0)},${yScale(1.5)}
              ${xScale(15.0)},${yScale(-1.5)}
              ${xScale(10.0)},${yScale(-1.5)}
              ${xScale(10.0)},${yScale(-1.0)}
              ${xScale(2.5)},${yScale(-1.0)}
              ${xScale(2.5)},${yScale(-0.5)}
              ${xScale(0)},${yScale(-0.5)}
            `}
            fill="#10b981"
            fillOpacity="0.04"
          />

          {/* Zero reference axis */}
          <line
            x1={padding.left}
            y1={yScale(0)}
            x2={width - padding.right}
            y2={yScale(0)}
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-muted-foreground/60"
          />

          {/* Ascending error path */}
          <path
            d={ascendingPath}
            fill="none"
            stroke="var(--primary, #0284c7)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Descending error path */}
          <path
            d={descendingPath}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeDasharray="5,4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Ascending data points */}
          {ascendingPoints.map((pt, i) => (
            <g key={`asc-${i}`}>
              <circle
                cx={xScale(pt.load)}
                cy={yScale(pt.errorEc)}
                r="4.5"
                fill="var(--primary, #0284c7)"
                stroke="#fff"
                strokeWidth="1.5"
              />
            </g>
          ))}

          {/* Descending data points */}
          {descendingPoints.map((pt, i) => (
            <g key={`desc-${i}`}>
              <polygon
                points={`
                  ${xScale(pt.load)},${yScale(pt.errorEc) - 4}
                  ${xScale(pt.load) - 4},${yScale(pt.errorEc) + 4}
                  ${xScale(pt.load) + 4},${yScale(pt.errorEc) + 4}
                `}
                fill="#fbbf24"
                stroke="#fff"
                strokeWidth="1"
              />
            </g>
          ))}

          {/* Y Axis Labels */}
          {[-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5].map((yVal) => (
            <text
              key={`y-lbl-${yVal}`}
              x={padding.left - 8}
              y={yScale(yVal) + 4}
              textAnchor="end"
              className="text-[10px] font-mono fill-muted-foreground"
            >
              {yVal > 0 ? `+${yVal.toFixed(1)}e` : `${yVal.toFixed(1)}e`}
            </text>
          ))}

          {/* X Axis Labels */}
          {[0, 2.5, 5.0, 7.5, 10.0, 12.5, 15.0].map((xVal) => (
            <text
              key={`x-lbl-${xVal}`}
              x={xScale(xVal)}
              y={height - padding.bottom + 18}
              textAnchor="middle"
              className="text-[10px] font-mono fill-muted-foreground"
            >
              {xVal} kg
            </text>
          ))}

          {/* Axis Titles */}
          <text
            x={padding.left - 10}
            y={padding.top - 10}
            textAnchor="start"
            className="text-[10px] font-bold fill-foreground"
          >
            Ec (units of e)
          </text>
          <text
            x={width - padding.right}
            y={height - 12}
            textAnchor="end"
            className="text-[10px] font-bold fill-foreground"
          >
            Nominal Test Load (L) →
          </text>
        </svg>
      </div>
    </div>
  );
}
