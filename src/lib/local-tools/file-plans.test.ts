import { describe, expect, it } from "vitest";

import {
  countDescendantDirectories,
  planContentsTxtCreation,
  planPlaylistCreation,
} from "./file-plans";
import type { LocalDirectorySnapshot } from "./types";

function createSnapshot(
  name: string,
  options: Partial<Pick<LocalDirectorySnapshot, "children" | "fileNames" | "relativePath">> = {},
): LocalDirectorySnapshot {
  return {
    children: options.children ?? [],
    fileNames: options.fileNames ?? [],
    handle: {} as FileSystemDirectoryHandle,
    name,
    relativePath: options.relativePath ?? "",
  };
}

describe("local file plans", () => {
  it("counts descendant directories recursively", () => {
    const root = createSnapshot("root", {
      children: [
        createSnapshot("alpha", { relativePath: "alpha" }),
        createSnapshot("beta", {
          relativePath: "beta",
          children: [
            createSnapshot("nested", { relativePath: "beta/nested" }),
          ],
        }),
      ],
    });

    expect(countDescendantDirectories(root)).toBe(3);
  });

  it("plans Contents.txt creation for descendant folders that do not already have one", () => {
    const root = createSnapshot("root", {
      children: [
        createSnapshot("alpha", {
          relativePath: "alpha",
          fileNames: ["cover.jpg"],
        }),
        createSnapshot("beta", {
          relativePath: "beta",
          fileNames: ["Contents.txt", "notes.md"],
        }),
        createSnapshot("gamma", {
          relativePath: "gamma",
          fileNames: [],
          children: [
            createSnapshot("nested", {
              relativePath: "gamma/nested",
              fileNames: [],
            }),
          ],
        }),
      ],
    });

    expect(planContentsTxtCreation(root)).toEqual([
      { relativePath: "alpha" },
      { relativePath: "gamma" },
      { relativePath: "gamma/nested" },
    ]);
  });

  it("plans playlist creation only for folders with MP3 files and no existing playlist", () => {
    const root = createSnapshot("root", {
      fileNames: ["Track B.mp3", "track a.mp3"],
      children: [
        createSnapshot("has-playlist", {
          relativePath: "has-playlist",
          fileNames: ["existing.m3u", "song.mp3"],
        }),
        createSnapshot("empty", {
          relativePath: "empty",
          fileNames: ["cover.jpg"],
        }),
        createSnapshot("mix", {
          relativePath: "mix",
          fileNames: ["lesson 02.mp3", "lesson 01.mp3"],
        }),
      ],
    });

    expect(planPlaylistCreation(root)).toEqual([
      {
        playlistEntries: ["track a.mp3", "Track B.mp3"],
        relativePath: "",
      },
      {
        playlistEntries: ["lesson 01.mp3", "lesson 02.mp3"],
        relativePath: "mix",
      },
    ]);
  });
});
