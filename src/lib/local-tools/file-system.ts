"use client";

import type { LocalDirectorySnapshot } from "@/lib/local-tools/types";

function isDirectoryHandle(
  handle: FileSystemHandle,
): handle is FileSystemDirectoryHandle {
  return handle.kind === "directory";
}

async function getPermissionState(
  handle: FileSystemDirectoryHandle,
  mode: FileSystemPermissionMode,
) {
  if (!("queryPermission" in handle) || !("requestPermission" in handle)) {
    return "unsupported" as const;
  }

  const permission = await handle.queryPermission({ mode });
  if (permission === "granted") {
    return permission;
  }

  return handle.requestPermission({ mode });
}

export function canUseFileSystemAccess() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickDirectoryHandle() {
  if (!canUseFileSystemAccess()) {
    throw new Error("This browser does not support local folder access.");
  }

  return window.showDirectoryPicker({ mode: "readwrite" });
}

export async function ensureDirectoryReadWritePermission(
  handle: FileSystemDirectoryHandle,
) {
  return getPermissionState(handle, "readwrite");
}

export async function scanDirectoryTree(
  handle: FileSystemDirectoryHandle,
  relativePath = "",
): Promise<LocalDirectorySnapshot> {
  const children: LocalDirectorySnapshot[] = [];
  const fileNames: string[] = [];

  for await (const entry of handle.values()) {
    if (entry.kind === "file") {
      fileNames.push(entry.name);
      continue;
    }

    if (!isDirectoryHandle(entry)) {
      continue;
    }

    const nextRelativePath = relativePath
      ? `${relativePath}/${entry.name}`
      : entry.name;

    children.push(await scanDirectoryTree(entry, nextRelativePath));
  }

  children.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath, undefined, {
      sensitivity: "base",
    }),
  );
  fileNames.sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" }),
  );

  return {
    children,
    fileNames,
    handle,
    name: handle.name,
    relativePath,
  };
}

export async function getDirectoryHandleByRelativePath(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string,
) {
  if (!relativePath) {
    return rootHandle;
  }

  const parts = relativePath.split("/").filter(Boolean);
  let currentHandle = rootHandle;

  for (const part of parts) {
    currentHandle = await currentHandle.getDirectoryHandle(part);
  }

  return currentHandle;
}

export async function createTextFileIfMissing(
  directoryHandle: FileSystemDirectoryHandle,
  fileName: string,
  contents: string,
) {
  try {
    await directoryHandle.getFileHandle(fileName);
    return false;
  } catch {
    const fileHandle = await directoryHandle.getFileHandle(fileName, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();
    return true;
  }
}

export async function overwriteTextFile(
  directoryHandle: FileSystemDirectoryHandle,
  fileName: string,
  contents: string,
) {
  const fileHandle = await directoryHandle.getFileHandle(fileName, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
}
