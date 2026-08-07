import { describe, expect, it } from "vitest";

import { extractRegions } from "./useAvatarLandmarks";

// Builds a sparse 468-point MediaPipe FaceMesh array with only the indices
// extractRegions actually reads populated -- the rest are irrelevant zeros.
function fakeFaceMesh(overrides: Record<number, { x: number; y: number }>) {
  const points = Array.from({ length: 468 }, () => ({ x: 0, y: 0 }));
  for (const [index, point] of Object.entries(overrides)) {
    points[Number(index)] = point;
  }
  return points;
}

describe("extractRegions", () => {
  it("computes the mouth center and width as percentages of image dimensions", () => {
    const points = fakeFaceMesh({
      61: { x: 0.4, y: 0.7 }, // mouth left corner
      291: { x: 0.6, y: 0.7 }, // mouth right corner
      13: { x: 0.5, y: 0.68 }, // upper lip
      14: { x: 0.5, y: 0.72 }, // lower lip
      33: { x: 0.3, y: 0.4 },
      133: { x: 0.35, y: 0.4 },
      159: { x: 0.325, y: 0.38 },
      145: { x: 0.325, y: 0.42 },
      362: { x: 0.65, y: 0.4 },
      263: { x: 0.7, y: 0.4 },
      386: { x: 0.675, y: 0.38 },
      374: { x: 0.675, y: 0.42 },
    });

    const result = extractRegions(points);

    // Mouth center = midpoint(upper lip, lower lip); width = |right - left| corner x.
    expect(result.mouth.xPct).toBeCloseTo(50, 5);
    expect(result.mouth.yPct).toBeCloseTo(70, 5);
    expect(result.mouth.widthPct).toBeCloseTo(20, 5);
  });

  it("computes each eye's center and width independently, anchored to its own landmarks", () => {
    const points = fakeFaceMesh({
      61: { x: 0, y: 0 },
      291: { x: 0, y: 0 },
      13: { x: 0, y: 0 },
      14: { x: 0, y: 0 },
      33: { x: 0.3, y: 0.4 }, // left eye outer corner
      133: { x: 0.35, y: 0.4 }, // left eye inner corner
      159: { x: 0.325, y: 0.38 }, // left eye top lid
      145: { x: 0.325, y: 0.42 }, // left eye bottom lid
      362: { x: 0.65, y: 0.4 }, // right eye inner corner
      263: { x: 0.7, y: 0.4 }, // right eye outer corner
      386: { x: 0.675, y: 0.38 }, // right eye top lid
      374: { x: 0.675, y: 0.42 }, // right eye bottom lid
    });

    const result = extractRegions(points);

    expect(result.leftEye.xPct).toBeCloseTo(32.5, 5);
    expect(result.leftEye.yPct).toBeCloseTo(40, 5);
    expect(result.leftEye.widthPct).toBeCloseTo(5, 5);

    expect(result.rightEye.xPct).toBeCloseTo(67.5, 5);
    expect(result.rightEye.yPct).toBeCloseTo(40, 5);
    expect(result.rightEye.widthPct).toBeCloseTo(5, 5);
  });
});
