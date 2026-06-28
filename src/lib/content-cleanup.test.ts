import { describe, expect, it } from "vitest";

import { cleanupBjjFanaticsContent } from "./content-cleanup";

describe("cleanupBjjFanaticsContent", () => {
  it("normalizes single-digit volume headings with the desktop rules", () => {
    const input = "Volume 1\nVolume 2\nVolume 3\nCHAPTER TITLE\nSTART TIME";

    expect(cleanupBjjFanaticsContent(input)).toBe(
      "Volume 1\nVolume 2\nVolume 3",
    );
  });

  it("normalizes zero-padded volume headings with the desktop rules", () => {
    const input = "Volume 01\nVolume 02\nVolume 03\nCHAPTER TITLE\nSTART TIME";

    expect(cleanupBjjFanaticsContent(input)).toBe(
      "Volume 01\nVolume 02\nVolume 03",
    );
  });

  it("removes the chapter title header exactly as the desktop tool does", () => {
    const input = "CHAPTER TITLE\nSTART TIME\nArmbar from closed guard";

    expect(cleanupBjjFanaticsContent(input)).toBe(
      "\nArmbar from closed guard",
    );
  });
});
