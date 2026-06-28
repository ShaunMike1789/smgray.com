"use client";

import { AlertTriangle, HardDriveDownload, RadioTower } from "lucide-react";

import type { ToolDefinition } from "@/lib/tools";
import { ToolNotice } from "@/components/tools/tool-primitives";

export function ToolReadinessNotice({ tool }: { tool: ToolDefinition }) {
  if (tool.executionMode === "browser") {
    return null;
  }

  if (tool.executionMode === "local-file-system") {
    return (
      <ToolNotice tone="warning">
        <div className="flex items-start gap-3">
          <HardDriveDownload className="mt-0.5 shrink-0 text-accent" size={18} />
          <div>
            <p className="font-semibold text-ink">Chrome or Edge required</p>
            <p className="mt-1">
              This tool writes directly into local folders through the File
              System Access API, so it is meant for Chromium browsers.
            </p>
          </div>
        </div>
      </ToolNotice>
    );
  }

  return (
    <ToolNotice tone="warning">
      <div className="flex items-start gap-3">
        <RadioTower className="mt-0.5 shrink-0 text-accent" size={18} />
        <div>
          <p className="font-semibold text-ink">Local helper required</p>
          <p className="mt-1">
            This tool needs the Windows audio helper running on this same
            machine. Chrome or Edge may ask you to allow localhost or local
            network access before the web UI can reach it.
          </p>
        </div>
      </div>
    </ToolNotice>
  );
}

export function UnsupportedBrowserNotice() {
  return (
    <ToolNotice tone="warning">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 shrink-0 text-[var(--warning)]" size={18} />
        <div>
          <p className="font-semibold text-ink">Local folder access unavailable</p>
          <p className="mt-1">
            Open this tool in Chrome or Edge to pick folders and write results
            back to your machine.
          </p>
        </div>
      </div>
    </ToolNotice>
  );
}
