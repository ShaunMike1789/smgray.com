"use client";

import { FolderOpen, HardDriveDownload, NotebookPen } from "lucide-react";
import { useMemo, useState } from "react";

import { UnsupportedBrowserNotice } from "@/components/tools/browser-notice";
import {
  ToolLog,
  ToolMetricCard,
  ToolNotice,
} from "@/components/tools/tool-primitives";
import {
  canUseFileSystemAccess,
  createTextFileIfMissing,
  ensureDirectoryReadWritePermission,
  getDirectoryHandleByRelativePath,
  pickDirectoryHandle,
  scanDirectoryTree,
} from "@/lib/local-tools/file-system";
import {
  countDescendantDirectories,
  summarizeContentsTxtPlan,
} from "@/lib/local-tools/file-plans";
import type { ContentsTxtJob, LocalFileToolSession } from "@/lib/local-tools/types";

function createInitialSession(): LocalFileToolSession {
  return {
    descendantDirectoryCount: 0,
    directoryHandle: null,
    directoryLabel: null,
    permissionState: "prompt",
  };
}

export function ContentsTxtTool() {
  const [session, setSession] = useState<LocalFileToolSession>(createInitialSession);
  const [job, setJob] = useState<ContentsTxtJob | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const browserSupported = canUseFileSystemAccess();

  const planSummary = useMemo(
    () => ({
      rootLabel: session.directoryLabel ?? "Not selected",
      scannedFolderCount: session.descendantDirectoryCount,
    }),
    [session],
  );

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

  async function createContentsTxtFiles() {
    if (!session.directoryHandle) {
      return;
    }

    setIsRunning(true);
    try {
      const snapshot = await scanDirectoryTree(session.directoryHandle);
      const descendants = countDescendantDirectories(snapshot);

      if (
        descendants > 10 &&
        !window.confirm(
          "You selected a folder with more than 10 subfolders. Continue creating missing Contents.txt files?",
        )
      ) {
        return;
      }

      const summary = summarizeContentsTxtPlan(snapshot);
      const logEntries: string[] = [];
      let createdCount = 0;

      for (const item of summary.items) {
        const handle = await getDirectoryHandleByRelativePath(
          session.directoryHandle,
          item.relativePath,
        );
        const created = await createTextFileIfMissing(handle, "Contents.txt", "");

        if (created) {
          createdCount += 1;
          logEntries.push(`Created Contents.txt in: ${item.relativePath}`);
        }
      }

      setJob({
        createdCount,
        logEntries,
        rootLabel: session.directoryHandle.name,
        scannedFolderCount: summary.scannedFolderCount,
        skippedExistingCount: summary.skippedExistingCount,
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
                Contents.txt Creator
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/72 md:text-lg">
                Pick a top folder, recurse through every descendant, confirm
                larger runs, and create missing empty Contents.txt files.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
              <ToolMetricCard label="Selected Root" value={planSummary.rootLabel} />
              <ToolMetricCard
                label="Descendant Folders"
                value={planSummary.scannedFolderCount}
              />
            </div>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="panel-plate rounded-[28px] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="eyebrow">Local Workspace</p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">
                    The web tool writes directly into the chosen folder tree on
                    your machine.
                  </p>
                </div>

                <div className="panel-shell flex size-12 items-center justify-center rounded-[18px] text-white">
                  <NotebookPen size={18} />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <ToolNotice>
                  Current root:{" "}
                  <span className="font-semibold text-ink">
                    {session.directoryLabel ?? "Nothing selected yet"}
                  </span>
                </ToolNotice>

                <ToolNotice tone="success">
                  Permission state:{" "}
                  <span className="font-semibold text-ink">
                    {session.permissionState}
                  </span>
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
                      Select top folder
                    </span>
                  </button>

                  <button
                    className="rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!session.directoryHandle || isRunning}
                    onClick={() => {
                      void createContentsTxtFiles();
                    }}
                    type="button"
                  >
                    <span className="inline-flex items-center gap-2">
                      <HardDriveDownload size={16} />
                      {isRunning ? "Creating files..." : "Create Contents.txt files"}
                    </span>
                  </button>
                </div>
              </div>

              <ToolNotice>
                Runs with more than 10 descendant folders will ask for
                confirmation before anything is written.
              </ToolNotice>
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <ToolLog
          emptyMessage="Pick a folder and create the files to populate the run log."
          lines={job?.logEntries ?? []}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <ToolMetricCard label="Created" value={job?.createdCount ?? 0} />
          <ToolMetricCard
            label="Skipped Existing"
            value={job?.skippedExistingCount ?? 0}
          />
        </div>
      </div>
    </div>
  );
}
