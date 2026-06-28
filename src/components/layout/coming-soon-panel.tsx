import { ArrowRight, Hourglass } from "lucide-react";

import { ToolIcon } from "@/components/layout/tool-icon";
import type { ToolDefinition } from "@/lib/tools";

interface ComingSoonPanelProps {
  tool: ToolDefinition;
}

export function ComingSoonPanel({ tool }: ComingSoonPanelProps) {
  return (
    <section className="panel-work rounded-[32px] p-6 md:p-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-5">
          <p className="eyebrow">{tool.category}</p>
          <div className="flex items-center gap-4">
            <div className="panel-shell flex size-16 items-center justify-center rounded-[22px] text-white">
              <ToolIcon icon={tool.icon} size={28} strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="display-title text-5xl text-ink md:text-6xl">
                {tool.name}
              </h1>
              <p className="mt-2 max-w-2xl text-base text-ink/70 md:text-lg">
                {tool.description}
              </p>
            </div>
          </div>
        </div>

        <div className="panel-shell flex items-center gap-3 rounded-full px-4 py-3 text-sm text-white">
          <Hourglass size={16} />
          <span>Queued behind Auto Crop</span>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <article className="panel-plate rounded-[24px] p-5">
          <p className="eyebrow">Run Mode</p>
          <p className="mt-4 text-2xl font-semibold text-ink">
            {tool.executionMode === "browser"
              ? "Browser First"
              : tool.executionMode === "local-file-system"
                ? "Chromium Local"
                : "Desktop Bridge"}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            The route, metadata, and shell entry already exist so this tool can
            slide into the bench without another navigation refactor.
          </p>
        </article>

        <article className="panel-plate rounded-[24px] p-5">
          <p className="eyebrow">What Happens Next</p>
          <p className="mt-4 text-2xl font-semibold text-ink">
            Shared bench patterns stay reusable
          </p>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            Upload flows, status framing, and tool routing are all built to
            expand from the first release instead of being one-off screens.
          </p>
        </article>

        <article className="panel-plate rounded-[24px] p-5">
          <p className="eyebrow">Route</p>
          <p className="mt-4 text-2xl font-semibold text-ink">{tool.route}</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-ink/65">
            The slot is reserved and ready.
            <ArrowRight size={14} />
          </p>
        </article>
      </div>
    </section>
  );
}
