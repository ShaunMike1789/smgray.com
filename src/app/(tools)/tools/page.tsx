import { ArrowLeft, MonitorCog, MousePointer2 } from "lucide-react";

import { ToolIcon } from "@/components/layout/tool-icon";
import { toolGroups, toolRegistry } from "@/lib/tools";

const modeLabels = {
  browser: "Browser",
  "local-file-system": "Local folder",
  "local-helper": "Windows helper",
};

export default function ToolsIndexPage() {
  const browserToolCount = toolRegistry.filter(
    (tool) => tool.executionMode === "browser",
  ).length;
  const folderToolCount = toolRegistry.filter(
    (tool) => tool.executionMode === "local-file-system",
  ).length;
  const helperToolCount = toolRegistry.filter(
    (tool) => tool.executionMode === "local-helper",
  ).length;

  return (
    <div className="space-y-6">
      <section className="panel-shell overflow-hidden rounded-[34px] p-6 text-white md:p-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="max-w-4xl">
            <p className="eyebrow text-white/48">Private Workspace</p>
            <h1 className="display-title mt-3 text-5xl md:text-7xl">
              Choose a tool.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
              Use the left menu to switch between utilities. The selected tool
              opens here in the workspace, so you can move from crop work to
              folder cleanup, playlist building, audio splitting, and search
              without hunting through separate pages.
            </p>

            <div className="mt-7 hidden items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white/72 lg:flex">
              <ArrowLeft size={18} />
              Pick any tool from the left-side menu to begin.
            </div>

            <div className="mt-7 flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white/72 lg:hidden">
              <MousePointer2 size={18} />
              Tap Menu above to choose a tool.
            </div>
          </div>

          <div className="steel-inset rounded-[28px] p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-[18px] border border-white/12 bg-white/8">
                <MonitorCog size={23} />
              </div>
              <div>
                <p className="eyebrow text-white/42">Bench Status</p>
                <p className="text-2xl font-black text-white">
                  {toolRegistry.length} live tools
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2 text-sm font-semibold text-white/72">
              <div className="flex justify-between rounded-2xl bg-white/[0.06] px-4 py-3">
                <span>Browser tools</span>
                <span className="text-white">{browserToolCount}</span>
              </div>
              <div className="flex justify-between rounded-2xl bg-white/[0.06] px-4 py-3">
                <span>Folder tools</span>
                <span className="text-white">{folderToolCount}</span>
              </div>
              <div className="flex justify-between rounded-2xl bg-white/[0.06] px-4 py-3">
                <span>Helper-backed tools</span>
                <span className="text-white">{helperToolCount}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-work rounded-[34px] p-5 md:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Available Tools</p>
            <h2 className="mt-2 text-3xl font-black text-ink">Menu Map</h2>
          </div>
          <p className="rounded-full border border-ink/10 bg-white/45 px-4 py-2 text-sm font-bold text-ink-soft">
            Left side navigation
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {Object.entries(toolGroups).map(([category, tools]) => (
            <div
              className="rounded-[28px] border border-ink/10 bg-white/48 p-4 shadow-[0_12px_28px_rgba(24,20,15,0.06)]"
              key={category}
            >
              <p className="eyebrow text-ink-soft">{category}</p>
              <div className="mt-4 space-y-3">
                {tools.map((tool) => (
                  <div
                    className="flex gap-3 rounded-[22px] border border-ink/8 bg-white/54 p-4"
                    key={tool.id}
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-[17px] border border-accent/20 bg-accent/12 text-accent">
                      <ToolIcon icon={tool.icon} size={21} strokeWidth={1.9} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-2xl font-black text-ink">
                        {tool.name}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-ink-soft">
                        {tool.description}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-ink/5 px-3 py-1.5 text-xs font-bold text-ink-soft">
                          {modeLabels[tool.executionMode]}
                        </span>
                        {tool.browserSupport === "chromium" ? (
                          <span className="rounded-full bg-ink/5 px-3 py-1.5 text-xs font-bold text-ink-soft">
                            Chromium
                          </span>
                        ) : null}
                        {tool.requiresLocalHelper ? (
                          <span className="rounded-full bg-warning/10 px-3 py-1.5 text-xs font-bold text-warning">
                            Helper required
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
