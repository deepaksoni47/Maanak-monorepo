import React from "react";

interface GridBackgroundProps {
  /** Size of each grid cell in pixels (default: 40) */
  cellSize?: number;
  /** Custom className for the outer container */
  className?: string;
  /** Whether to show subtle crosshairs at grid intersections */
  showCrosshairs?: boolean;
}

/**
 * Static Grid Background inspired by React Bits (reactbits.dev)
 * Features clearly visible crisp grid lines, subtle intersection crosshairs,
 * an ambient primary glow, and optical edge blur/vignette falloff.
 */
export function GridBackground({
  cellSize = 40,
  className = "",
  showCrosshairs = true,
}: GridBackgroundProps) {
  const patternId = "react-bits-hero-grid";

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none ${className}`}
    >
      {/* 1. Ambient Primary Radial Glow (Subtle soft bloom in hero focus area) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 75% 55% at 50% 35%, oklch(0.6723 0.1606 244.9955 / 0.08) 0%, transparent 75%)",
        }}
      />

      {/* 2. Static SVG Grid Pattern with Wide Smooth Radial Fadeout */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          maskImage:
            "radial-gradient(ellipse 85% 70% at 50% 40%, black 50%, rgba(0, 0, 0, 0.5) 75%, transparent 98%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 70% at 50% 40%, black 50%, rgba(0, 0, 0, 0.5) 75%, transparent 98%)",
        }}
      >
        <svg
          className="absolute inset-0 h-full w-full text-slate-300/85 dark:text-slate-700/80"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id={patternId}
              width={cellSize}
              height={cellSize}
              patternUnits="userSpaceOnUse"
              x="50%"
              y={-1}
            >
              {/* Crisp grid lines */}
              <path
                d={`M.5 ${cellSize}V.5H${cellSize}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
              />
              {/* Intersection crosshairs (+ markers) */}
              {showCrosshairs && (
                <path
                  d="M -3 0 h 6 M 0 -3 v 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.25}
                  className="text-primary/60 dark:text-primary/70"
                />
              )}
            </pattern>
          </defs>
          <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${patternId})`} />
        </svg>
      </div>

      {/* 3. Edge Optical Blur: Softens and blurs the grid at the perimeter */}
      <div
        className="absolute inset-0 backdrop-blur-[2px]"
        style={{
          maskImage:
            "radial-gradient(ellipse 90% 75% at 50% 40%, transparent 60%, rgba(0, 0, 0, 0.8) 85%, black 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 75% at 50% 40%, transparent 60%, rgba(0, 0, 0, 0.8) 85%, black 100%)",
        }}
      />
    </div>
  );
}
