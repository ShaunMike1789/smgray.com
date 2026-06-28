"use client";

import { FolderOpen, ListMusic, Music4 } from "lucide-react";
import { useState } from "react";

import { UnsupportedBrowserNotice } from "@/components/tools/browser-notice";
import {
  ToolLog,
  ToolMetricCard,
  ToolNotice,
} from "@/components/tools/tool-primitives";
import {
  canUseFileSystemAccess,
  ensureDirectoryReadWritePermission,
  getDirectoryHandleByRelativePath,
  overwriteTextFile,
  pickDirectoryHandle,
  scanDirectoryTree,
} from "@/lib/local-tools/file-system";
import {
  countDescendantDirectories,
  summarizePlaylistPlan,
} from "@/lib/local-tools/file-plans";
import type { LocalFileToolSession, PlaylistJob } from "@/lib/local-tools/types";

function createInitialSession(): LocalFileToolSession {
  return {
    descendantDirectoryCount: 0,
    directoryHandle: null,
    directoryLabel: null,
    permissionState: "prompt",
  };
}

export function PlaylistCreatorTool() {
  const [session, setSession] = useState<LocalFileToolSession>(createInitialSession);
  const [job, setJob] = useState<PlaylistJob | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const browserSupported = canUseFileSystemAccess();

  async function chooseFolder() {
    const handle = await pickDirectoryHandle();
    const permissionState = await ensureDirectoryReadWritePermission(handle);
    const snapshot = await scanDirectoryTree(handle);

    setSession({
      descendantDirectoryCount: countDescendantDirectories(snapshot),
      directoryHandle: handle,
      directoryLabel: handle.name,
      permissionState,
    });
    setJob(null);
  }

  async function createPlaylists() {
    if (!session.directoryHandle) {
      return;
    }

    setIsRunning(true);
    try {
      const snapshot = await scanDirectoryTree(session.directoryHandle);
      const summary = summarizePlaylistPlan(snapshot);
      const logEntries: string[] = [];

      for (const item of summary.items) {
        const handle = await getDirectoryHandleByRelativePath(
          session.directoryHandle,
          item.relativePath,
        );

        await overwriteTextFile(
          handle,
          "playlist.m3u",
          `${item.playlistEntries.join("\n")}\n`,
        );
        logEntries.push(
          `Playlist created in directory: ${item.relativePath || session.directoryHandle.name}`,
        );
      }

      setJob({
        createdCount: summary.items.length,
        logEntries,
        rootLabel: session.directoryHandle.name,
        scannedFolderCount: summary.scannedFolderCount,
        skippedExistingCount: summary.skippedExistingCount,
        skippedWithoutMp3Count: summary.skippedWithoutMp3Count,
      });
    } finally {
      setIsRunning(false);
    }
  }

  if (!browserSupported) {
    return <UnsupportedBrowserNotice />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_380px]">
      <div className="space-y-6">
        <section className="panel-work rounded-[32px] p-6 md:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="eyebrow">File Bench / Chromium Tool</p>
              <h1 className="mt-4 display-title text-6xl text-ink md:text-7xl">
                Playlist Creator
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/72 md:text-lg">
                Recurse through a root folder, find MP3 directories without an
                existing playlist, and write filename-only playlist.m3u files.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
              <ToolMetricCard
                label="Selected Root"
                value={session.directoryLabel ?? "Not selected"}
              />
              <ToolMetricCard
                label="Permission"
                value={session.permissionState}
              />
            </div>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="panel-plate rounded-[28px] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="eyebrow">Local Playlist Pass</p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">
                    This web version keeps the same rule set: if a folder
                    already has any .m3u file, it is skipped.
                  </p>
                </div>

                <div className="panel-shell flex size-12 items-center justify-center rounded-[18px] text-white">
                  <ListMusic size={18} />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <ToolNotice>
                  Root folder:{" "}
                  <span className="font-semibold text-ink">
                    {session.directoryLabel ?? "Nothing selected yet"}
                  </span>
                </ToolNotice>
                <ToolNotice>
                  Created playlists only contain bare file names, matching the
                  desktop tool output.
                </ToolNotice>
              </div>
            </div>

            <div className="space-y-4">
              <div className="panel-plate rounded-[28px] p-5">
                <p className="eyebrow">Actions</p>
                <div className="mt-5 grid gap-3">
                  <button
                    className="rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
                    onClick={() => {
                      void chooseFolder();
                    }}
                    type="button"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FolderOpen size={16} />
                      Select root folder
                    </span>
                  </button>

                  <button
                    className="rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!session.directoryHandle || isRunning}
                    onClick={() => {
                      void createPlaylists();
                    }}
                    type="button"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Music4 size={16} />
                      {isRunning ? "Creating playlists..." : "Create playlists"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <ToolLog
          emptyMessage="Run the playlist creator to populate this console."
          lines={job?.logEntries ?? []}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <ToolMetricCard label="Playlists Created" value={job?.createdCount ?? 0} />
          <ToolMetricCard
            label="Folders Scanned"
            value={job?.scannedFolderCount ?? 0}
          />
        </div>
      </div>
    </div>
  );
}
