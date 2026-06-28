export type ToolStatus = "live" | "coming-soon";
export type ToolExecutionMode =
  | "browser"
  | "local-file-system"
  | "local-helper";
export type ToolBrowserSupport = "all" | "chromium";
export type ToolIcon =
  | "audio"
  | "cleanup"
  | "crop"
  | "folder"
  | "playlist";

export interface ToolDefinition {
  browserSupport: ToolBrowserSupport;
  category: string;
  description: string;
  icon: ToolIcon;
  id: string;
  name: string;
  requiresFileSystemAccess: boolean;
  requiresLocalHelper: boolean;
  route: string;
  executionMode: ToolExecutionMode;
  slug: string;
  status: ToolStatus;
}

export const toolRegistry: ToolDefinition[] = [
  {
    id: "auto-crop",
    slug: "auto-crop",
    name: "Auto Crop",
    category: "Image Lab",
    description:
      "Find the dominant subject, crop tightly around it, and export one photo or a full batch.",
    icon: "crop",
    browserSupport: "all",
    executionMode: "browser",
    requiresFileSystemAccess: false,
    requiresLocalHelper: false,
    route: "/tools/auto-crop",
    status: "live",
  },
  {
    id: "content-cleanup",
    slug: "content-cleanup",
    name: "Content Cleanup",
    category: "Text Bench",
    description:
      "Clean up pasted BJJ Fanatics contents text with the exact desktop rules you already use.",
    icon: "cleanup",
    browserSupport: "all",
    executionMode: "browser",
    requiresFileSystemAccess: false,
    requiresLocalHelper: false,
    route: "/tools/content-cleanup",
    status: "live",
  },
  {
    id: "contents-txt-creator",
    slug: "contents-txt-creator",
    name: "Contents.txt Creator",
    category: "File Bench",
    description:
      "Walk a chosen folder tree, confirm larger runs, and create missing empty Contents.txt files.",
    icon: "folder",
    browserSupport: "chromium",
    executionMode: "local-file-system",
    requiresFileSystemAccess: true,
    requiresLocalHelper: false,
    route: "/tools/contents-txt-creator",
    status: "live",
  },
  {
    id: "playlist-creator",
    slug: "playlist-creator",
    name: "Playlist Creator",
    category: "File Bench",
    description:
      "Create filename-only playlist.m3u files in folders that contain MP3s and no existing playlist.",
    icon: "playlist",
    browserSupport: "chromium",
    executionMode: "local-file-system",
    requiresFileSystemAccess: true,
    requiresLocalHelper: false,
    route: "/tools/playlist-creator",
    status: "live",
  },
  {
    id: "audio-splitter",
    slug: "audio-splitter",
    name: "Audio Splitter",
    category: "Audio Bench",
    description:
      "Detect chapters, compare silence durations, and split M4B or MP3 files through a local helper.",
    icon: "audio",
    browserSupport: "chromium",
    executionMode: "local-helper",
    requiresFileSystemAccess: false,
    requiresLocalHelper: true,
    route: "/tools/audio-splitter",
    status: "live",
  },
];

export const toolGroups = toolRegistry.reduce<Record<string, ToolDefinition[]>>(
  (groups, tool) => {
    const existing = groups[tool.category] ?? [];
    existing.push(tool);
    groups[tool.category] = existing;
    return groups;
  },
  {},
);

export function getToolBySlug(slug: string) {
  return toolRegistry.find((tool) => tool.slug === slug);
}
