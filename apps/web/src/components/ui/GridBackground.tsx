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
 * Features crisp vector lines, subtle intersection crosshairs,
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
      {/* 1. Ambient Primary Radial Bloom (Warm developer aesthetic glow) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 40%, oklch(0.6723 0.1606 244.9955 / 0.08) 0%, transparent 75%)",
        }}
      />

      {/* 2. Static SVG Grid Pattern with Radial Gradient Falloff Mask */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, black 25%, rgba(0, 0, 0, 0.4) 65%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, black 25%, rgba(0, 0, 0, 0.4) 65%, transparent 90%)",
        }}
      >
        <svg
          className="absolute inset-0 h-full w-full stroke-primary/[0.12] dark:stroke-primary/[0.22]"
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
              {/* Grid cell lines */}
              <path
                d={`M.5 ${cellSize}V.5H${cellSize}`}
                fill="none"
                strokeWidth={1}
              />
              {/* Optional intersection crosshairs (+ markers) */}
              {showCrosshairs && (
                <path
                  d="M -3 0 h 6 M 0 -3 v 6"
                  fill="none"
                  strokeWidth={1}
                  className="stroke-primary/[0.28] dark:stroke-primary/[0.40]"
                />
              )}
            </pattern>
          </defs>
          <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${patternId})`} />
        </svg>
      </div>

      {/* 3. Edge Blur Overlay: Progressively blurs grid lines at perimeter */}
      <div
        className="absolute inset-0 backdrop-blur-[1.5px]"
        style={{
          maskImage:
            "radial-gradient(ellipse 75% 65% at 50% 45%, transparent 35%, black 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 65% at 50% 45%, transparent 35%, black 85%)",
        }}
      />
    </div>
  );
}
