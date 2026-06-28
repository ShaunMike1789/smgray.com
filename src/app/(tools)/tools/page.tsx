import Link from "next/link";

import { ToolIcon } from "@/components/layout/tool-icon";
import { toolGroups } from "@/lib/tools";

const modeLabels = {
  browser: "Browser",
  "local-file-system": "Local folder",
  "local-helper": "Windows helper",
};

export default function ToolsIndexPage() {
  return (
    <div className="space-y-6">
      <section className="panel-shell overflow-hidden rounded-[34px] p-6 text-white md:p-8">
        <div className="max-w-4xl">
          <p className="eyebrow text-white/48">Private Workspace</p>
          <h1 className="display-title mt-3 text-5xl md:text-7xl">
            Tool Bench
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
            Pick a utility and jump into the workflow. Browser tools run fully
            in the page, folder tools use Chrome or Edge local access, and audio
            splitting talks to the Windows helper.
          </p>
        </div>
      </section>

      <div className="space-y-6">
        {Object.entries(toolGroups).map(([category, tools]) => (
          <section className="panel-work rounded-[34px] p-5 md:p-7" key={category}>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">{category}</p>
                <h2 className="mt-2 text-3xl font-black text-ink">{category}</h2>
              </div>
              <p className="rounded-full border border-ink/10 bg-white/45 px-4 py-2 text-sm font-bold text-ink-soft">
                {tools.length} {tools.length === 1 ? "tool" : "tools"}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {tools.map((tool) => (
                <Link
                  className="group flex min-h-56 flex-col justify-between rounded-[28px] border border-ink/10 bg-white/56 p-5 shadow-[0_12px_28px_rgba(24,20,15,0.07)] transition hover:-translate-y-0.5 hover:border-ink/20 hover:bg-white/72 hover:shadow-[0_18px_38px_rgba(24,20,15,0.11)]"
                  href={tool.route}
                  key={tool.id}
                >
                  <div>
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div className="flex size-14 items-center justify-center rounded-[20px] border border-accent/20 bg-accent/12 text-accent">
                        <ToolIcon icon={tool.icon} size={25} strokeWidth={1.9} />
                      </div>
                      <span className="rounded-full bg-signal/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-signal">
                        {tool.status === "live" ? "Live" : "Soon"}
                      </span>
                    </div>

                    <h3 className="text-2xl font-black text-ink">{tool.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-ink-soft">
                      {tool.description}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
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
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
