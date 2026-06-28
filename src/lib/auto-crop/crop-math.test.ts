import { describe, expect, it } from "vitest";

import {
  computeCropBounds,
  extractAlphaChannel,
  findSubjectBoundsFromAlpha,
} from "./crop-math";

function createMask(
  width: number,
  height: number,
  subject: { height: number; width: number; x: number; y: number },
  background = 0,
  foreground = 255,
) {
  const alpha = new Uint8Array(width * height).fill(background);

  for (let y = subject.y; y < subject.y + subject.height; y += 1) {
    for (let x = subject.x; x < subject.x + subject.width; x += 1) {
      alpha[y * width + x] = foreground;
    }
  }

  return alpha;
}

describe("crop math", () => {
  it("extracts the alpha channel from rgba image data", () => {
    const alpha = extractAlphaChannel(
      new Uint8ClampedArray([10, 20, 30, 40, 50, 60, 70, 80]),
      4,
    );

    expect(Array.from(alpha)).toEqual([40, 80]);
  });

  it("finds a centered subject rectangle", () => {
    const alpha = createMask(30, 20, {
      x: 8,
      y: 4,
      width: 10,
      height: 8,
    });

    expect(findSubjectBoundsFromAlpha(alpha, 30, 20)).toEqual({
      x: 8,
      y: 4,
      width: 10,
      height: 8,
    });
  });

  it("keeps the original aspect ratio while expanding around the subject", () => {
    const alpha = createMask(40, 20, {
      x: 12,
      y: 4,
      width: 10,
      height: 6,
    });

    const { cropBounds, subjectBounds } = computeCropBounds(
      alpha,
      40,
      20,
      20,
      "original",
    );

    expect(subjectBounds).toEqual({
      x: 12,
      y: 4,
      width: 10,
      height: 6,
    });
    expect(cropBounds.x).toBeLessThanOrEqual(subjectBounds.x);
    expect(cropBounds.y).toBeLessThanOrEqual(subjectBounds.y);
    expect(cropBounds.x + cropBounds.width).toBeGreaterThanOrEqual(
      subjectBounds.x + subjectBounds.width,
    );
    expect(cropBounds.y + cropBounds.height).toBeGreaterThanOrEqual(
      subjectBounds.y + subjectBounds.height,
    );
    expect(cropBounds.width / cropBounds.height).toBe(2);
  });

  it("clamps padded crops to the image edges", () => {
    const alpha = createMask(40, 20, {
      x: 1,
      y: 1,
      width: 9,
      height: 7,
    });

    const { cropBounds } = computeCropBounds(alpha, 40, 20, 30, "tight");

    expect(cropBounds.x).toBe(0);
    expect(cropBounds.y).toBe(0);
    expect(cropBounds.width).toBeLessThanOrEqual(40);
    expect(cropBounds.height).toBeLessThanOrEqual(20);
  });

  it("can return a tight crop without restoring the original aspect ratio", () => {
    const alpha = createMask(40, 20, {
      x: 12,
      y: 4,
      width: 10,
      height: 6,
    });

    const { cropBounds } = computeCropBounds(alpha, 40, 20, 20, "tight");

    expect(cropBounds.width / cropBounds.height).not.toBe(2);
    expect(cropBounds.width).toBeLessThan(40);
    expect(cropBounds.height).toBeLessThan(20);
  });
});
