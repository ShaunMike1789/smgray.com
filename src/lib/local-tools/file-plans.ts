import type {
  ContentsTxtPlanItem,
  LocalDirectorySnapshot,
  PlaylistPlanItem,
} from "@/lib/local-tools/types";

function compareFileNames(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

export interface ContentsTxtPlanSummary {
  items: ContentsTxtPlanItem[];
  scannedFolderCount: number;
  skippedExistingCount: number;
}

export interface PlaylistPlanSummary {
  items: PlaylistPlanItem[];
  scannedFolderCount: number;
  skippedExistingCount: number;
  skippedWithoutMp3Count: number;
}

export function countDescendantDirectories(root: LocalDirectorySnapshot): number {
  return root.children.reduce(
    (count, child) => count + 1 + countDescendantDirectories(child),
    0,
  );
}

export function planContentsTxtCreation(root: LocalDirectorySnapshot) {
  const items: ContentsTxtPlanItem[] = [];

  function visit(node: LocalDirectorySnapshot) {
    for (const child of node.children) {
      const hasContentsTxt = child.fileNames.some(
        (fileName) => fileName.toLowerCase() === "contents.txt",
      );

      if (!hasContentsTxt) {
        items.push({
          relativePath: child.relativePath,
        });
      }

      visit(child);
    }
  }

  visit(root);
  return items;
}

export function summarizeContentsTxtPlan(
  root: LocalDirectorySnapshot,
): ContentsTxtPlanSummary {
  const items = planContentsTxtCreation(root);
  const scannedFolderCount = countDescendantDirectories(root);

  return {
    items,
    scannedFolderCount,
    skippedExistingCount: scannedFolderCount - items.length,
  };
}

export function planPlaylistCreation(root: LocalDirectorySnapshot) {
  const items: PlaylistPlanItem[] = [];

  function visit(node: LocalDirectorySnapshot) {
    const hasPlaylist = node.fileNames.some((fileName) =>
      fileName.toLowerCase().endsWith(".m3u"),
    );
    const mp3Entries = node.fileNames
      .filter((fileName) => fileName.toLowerCase().endsWith(".mp3"))
      .sort(compareFileNames);

    if (!hasPlaylist && mp3Entries.length > 0) {
      items.push({
        playlistEntries: mp3Entries,
        relativePath: node.relativePath,
      });
    }

    for (const child of node.children) {
      visit(child);
    }
  }

  visit(root);
  return items;
}

export function summarizePlaylistPlan(
  root: LocalDirectorySnapshot,
): PlaylistPlanSummary {
  let scannedFolderCount = 0;
  let skippedExistingCount = 0;
  let skippedWithoutMp3Count = 0;

  function visit(node: LocalDirectorySnapshot) {
    scannedFolderCount += 1;

    const hasPlaylist = node.fileNames.some((fileName) =>
      fileName.toLowerCase().endsWith(".m3u"),
    );
    const hasMp3 = node.fileNames.some((fileName) =>
      fileName.toLowerCase().endsWith(".mp3"),
    );

    if (hasPlaylist) {
      skippedExistingCount += 1;
    } else if (!hasMp3) {
      skippedWithoutMp3Count += 1;
    }

    for (const child of node.children) {
      visit(child);
    }
  }

  visit(root);

  return {
    items: planPlaylistCreation(root),
    scannedFolderCount,
    skippedExistingCount,
    skippedWithoutMp3Count,
  };
}
