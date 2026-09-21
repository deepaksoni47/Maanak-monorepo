import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GridBackground } from "./GridBackground";

describe("React Bits Static GridBackground Component", () => {
  test("renders static SVG grid with correct pattern ID and attributes", () => {
    const html = renderToStaticMarkup(<GridBackground cellSize={40} />);
    assert.ok(html.includes('aria-hidden="true"'));
    assert.ok(html.includes("pattern"));
    assert.ok(html.includes("react-bits-hero-grid"));
    assert.ok(html.includes('width="40"'));
    assert.ok(html.includes('height="40"'));
  });

  test("includes blurred edge masks and backdrop blur overlay", () => {
    const html = renderToStaticMarkup(<GridBackground />);
    // Verify radial gradient mask for edge falloff
    assert.ok(html.includes("radial-gradient"));
    assert.ok(html.includes("backdrop-blur"));
  });

  test("renders intersection crosshairs when showCrosshairs is true", () => {
    const htmlWithCrosshairs = renderToStaticMarkup(<GridBackground showCrosshairs={true} />);
    assert.ok(htmlWithCrosshairs.includes("M -3 0 h 6 M 0 -3 v 6"));

    const htmlWithoutCrosshairs = renderToStaticMarkup(<GridBackground showCrosshairs={false} />);
    assert.ok(!htmlWithoutCrosshairs.includes("M -3 0 h 6 M 0 -3 v 6"));
  });
});
