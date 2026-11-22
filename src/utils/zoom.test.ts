import { describe, expect, it } from "vitest";
import { clampView, IDENTITY, MAX_SCALE, panBy, toggleZoom, zoomAt } from "./zoom";

const size = { width: 1000, height: 600 };

describe("zoom", () => {
  it("never pans an unzoomed image", () => {
    expect(clampView({ scale: 1, x: 50, y: -30 }, size)).toEqual(IDENTITY);
    expect(panBy(IDENTITY, 100, 100, size)).toEqual(IDENTITY);
  });

  it("keeps the point under the cursor fixed while zooming", () => {
    const point = { x: 200, y: -100 };
    const zoomed = zoomAt(IDENTITY, 2, point, size);
    expect(zoomed.scale).toBe(2);
    // The image point that was under the cursor: (point - offset) / scale stays the same.
    expect((point.x - zoomed.x) / zoomed.scale).toBeCloseTo(point.x);
    expect((point.y - zoomed.y) / zoomed.scale).toBeCloseTo(point.y);
  });

  it("limits the scale between 1 and the maximum", () => {
    expect(zoomAt(IDENTITY, 100, { x: 0, y: 0 }, size).scale).toBe(MAX_SCALE);
    expect(zoomAt({ scale: 2, x: 0, y: 0 }, 0.01, { x: 0, y: 0 }, size)).toEqual(IDENTITY);
  });

  it("stops panning at the image edges", () => {
    const view = panBy({ scale: 2, x: 0, y: 0 }, 5000, -5000, size);
    expect(view).toEqual({ scale: 2, x: 500, y: -300 });
  });

  it("toggles between fit and 2x at the tapped point", () => {
    const zoomed = toggleZoom(IDENTITY, { x: 100, y: 50 }, size);
    expect(zoomed.scale).toBe(2);
    expect(toggleZoom(zoomed, { x: 0, y: 0 }, size)).toEqual(IDENTITY);
  });
});
