import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GridPattern } from "./grid-pattern";

describe("Magic UI GridPattern Component", () => {
  test("renders SVG with pattern and dimensions", () => {
    const html = renderToStaticMarkup(<GridPattern width={30} height={30} />);
    assert.ok(html.includes("<svg"));
    assert.ok(html.includes("<pattern"));
    assert.ok(html.includes('width="30"'));
    assert.ok(html.includes('height="30"'));
  });

  test("renders filled decorative squares when provided", () => {
    const squares: [number, number][] = [
      [4, 4],
      [5, 1],
    ];
    const html = renderToStaticMarkup(<GridPattern width={40} height={40} squares={squares} />);
    assert.ok(html.includes("<rect"));
    // x = 4 * 40 + 1 = 161, y = 4 * 40 + 1 = 161
    assert.ok(html.includes('x="161"'));
    assert.ok(html.includes('y="161"'));
  });

  test("renders strokeDasharray when configured", () => {
    const html = renderToStaticMarkup(<GridPattern strokeDasharray="4 2" />);
    assert.ok(html.includes('stroke-dasharray="4 2"'));
  });
});
