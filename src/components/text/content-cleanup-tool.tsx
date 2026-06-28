"use client";

import { ClipboardCopy, Eraser, WandSparkles } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ToolLog,
  ToolMetricCard,
  ToolNotice,
} from "@/components/tools/tool-primitives";
import { cleanupBjjFanaticsContent } from "@/lib/content-cleanup";

export function ContentCleanupTool() {
  const [text, setText] = useState("");
  const [lastAction, setLastAction] = useState<string[]>([]);

  const volumeCount = useMemo(() => {
    const matches = text.match(/Volume\s0?\d/gi);
    return matches?.length ?? 0;
  }, [text]);

  function handleCleanup() {
    const cleaned = cleanupBjjFanaticsContent(text);
    setText(cleaned);
    setLastAction([
      "Applied desktop cleanup rules.",
      "Removed CHAPTER TITLE / START TIME header when present.",
      "Normalized Volume 1..9 or Volume 01..09 blocks in place.",
    ]);
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(text);
    setLastAction((previous) => ["Copied cleaned text to clipboard.", ...previous]);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.14fr)_380px]">
      <div className="space-y-6">
        <section className="panel-work rounded-[32px] p-6 md:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="eyebrow">Text Bench / Browser Tool</p>
              <h1 className="mt-4 display-title text-6xl text-ink md:text-7xl">
                Content Cleanup
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/72 md:text-lg">
                Paste the raw BJJ Fanatics contents text, then run the same
                cleanup pass your Windows tool has been using for years.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
              <ToolMetricCard label="Characters" value={text.length} />
              <ToolMetricCard label="Volume Labels" value={volumeCount} />
            </div>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="panel-plate rounded-[28px] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="eyebrow">Input + Output</p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">
                    The desktop tool edits the text in place, so this web tool
                    does the same.
                  </p>
                </div>

                <div className="panel-shell flex size-12 items-center justify-center rounded-[18px] text-white">
                  <WandSparkles size={18} />
                </div>
              </div>

              <textarea
                className="mt-6 h-[480px] w-full rounded-[24px] border border-black/8 bg-white/70 px-4 py-4 text-sm leading-7 text-ink outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
                onChange={(event) => setText(event.currentTarget.value)}
                placeholder="Paste the BJJ Fanatics contents text here..."
                value={text}
              />
            </div>

            <div className="space-y-4">
              <div className="panel-plate rounded-[28px] p-5">
                <p className="eyebrow">Actions</p>
                <div className="mt-5 grid gap-3">
                  <button
                    className="rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
                    onClick={handleCleanup}
                    type="button"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Eraser size={16} />
                      Clean Up
                    </span>
                  </button>

                  <button
                    className="rounded-full bg-ink/6 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!text}
                    onClick={() => {
                      void copyToClipboard();
                    }}
                    type="button"
                  >
                    <span className="inline-flex items-center gap-2">
                      <ClipboardCopy size={16} />
                      Copy cleaned text
                    </span>
                  </button>
                </div>
              </div>

              <ToolNotice>
                This tool is intentionally narrow. It only applies the exact
                cleanup rules from the desktop version and does not add new text
                formatting behavior.
              </ToolNotice>
            </div>
          </div>
        </section>
      </div>

      <ToolLog
        emptyMessage="Run the cleanup button to capture what happened in this pass."
        lines={lastAction}
      />
    </div>
  );
}
