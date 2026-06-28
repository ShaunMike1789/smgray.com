"use client";

import {
  AlertTriangle,
  FolderOpen,
  Gauge,
  RadioTower,
  ScissorsLineDashed,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  cancelAudioJob,
  getAudioHelperHealth,
  getAudioJob,
  openAudioFileDialog,
  openOutputFolderDialog,
  startAudioDetection,
  startAudioSplit,
} from "@/lib/audio-helper/client";
import type {
  AudioComparisonResult,
  AudioDetectionSummary,
  AudioHelperConnectionState,
  AudioJobProgress,
  AudioSplitMethod,
  ChapterPoint,
} from "@/lib/audio-helper/types";
import {
  ToolLog,
  ToolMetricCard,
  ToolNotice,
} from "@/components/tools/tool-primitives";

const pathInputClass =
  "mt-2 w-full rounded-[18px] border border-black/8 bg-white px-4 py-3 text-sm font-medium text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/40 focus:ring-2 focus:ring-accent/15";

function formatChapterCount(summary: AudioDetectionSummary | null) {
  if (!summary) {
    return 0;
  }

  if (summary.compareAll) {
    return summary.comparisonResults.reduce(
      (count, item) => count + item.chapterCount,
      0,
    );
  }

  return summary.comparisonResults[0]?.chapterCount ?? 0;
}

const helperCommand = "npm run helper:run";
const helperLauncher = "start-audio-helper.bat";

const quickStartSteps = [
  {
    detail:
      "From D:\\Dev\\SMGrayToolsWeb, either double-click start-audio-helper.bat or run npm run helper:run, then wait for the Helper card to switch to online.",
    label: "1",
    title: "Start the helper",
  },
  {
    detail:
      "Click Select audio file, then Select output folder. The helper opens the native Windows pickers for both.",
    label: "2",
    title: "Choose your files",
  },
  {
    detail:
      "Pick Detect by silence or Use embedded chapters. For silence, you can compare 2, 3, and 4 second passes before splitting.",
    label: "3",
    title: "Detect chapters",
  },
  {
    detail:
      "Once chapter points are ready, click Split audio. The helper writes 320 kbps MP3 files with desktop-style chapter names.",
    label: "4",
    title: "Split and save",
  },
] as const;

export function AudioSplitterTool() {
  const [helperState, setHelperState] = useState<AudioHelperConnectionState>("checking");
  const [helperVersion, setHelperVersion] = useState<string | null>(null);
  const [audioPath, setAudioPath] = useState("");
  const [outputPath, setOutputPath] = useState("D:\\New");
  const [splitMethod, setSplitMethod] = useState<AudioSplitMethod>("silence");
  const [silenceDurationSeconds, setSilenceDurationSeconds] = useState(4);
  const [job, setJob] = useState<AudioJobProgress | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function checkHealth() {
      try {
        const health = await getAudioHelperHealth();
        if (!isActive) {
          return;
        }

        setHelperState(health.ready ? "online" : "offline");
        setHelperVersion(health.version);
      } catch {
        if (!isActive) {
          return;
        }

        setHelperState("offline");
        setHelperVersion(null);
      }
    }

    void checkHealth();
    const interval = window.setInterval(() => {
      void checkHealth();
    }, 4000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!activeJobId) {
      return;
    }

    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const nextJob = await getAudioJob(activeJobId);
        if (cancelled) {
          return;
        }

        setJob(nextJob);
        if (nextJob.status !== "queued" && nextJob.status !== "running") {
          setActiveJobId(null);
        }
      } catch {
        if (cancelled) {
          return;
        }

        setActiveJobId(null);
      }
    }, 900);

    void getAudioJob(activeJobId).then((nextJob) => {
      if (cancelled) {
        return;
      }

      setJob(nextJob);
      if (nextJob.status !== "queued" && nextJob.status !== "running") {
        setActiveJobId(null);
      }
    });

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeJobId]);

  const comparisonResults = job?.detectionSummary?.comparisonResults ?? [];
  const canSplitFromCompare =
    job?.detectionSummary?.compareAll &&
    silenceDurationSeconds >= 2 &&
    silenceDurationSeconds <= 4;
  const selectedComparison = comparisonResults.find(
    (result) => result.silenceDurationSeconds === silenceDurationSeconds,
  );
  const chaptersToSplit: ChapterPoint[] =
    job?.detectionSummary?.compareAll
      ? selectedComparison?.chapters ?? []
      : comparisonResults[0]?.chapters ?? [];

  const allLogLines = useMemo(() => {
    return job?.logLines ?? [];
  }, [job]);

  async function pickAudioPath() {
    const result = await openAudioFileDialog();
    if (result.path) {
      setAudioPath(result.path);
    }
  }

  async function pickOutputPath() {
    const result = await openOutputFolderDialog();
    if (result.path) {
      setOutputPath(result.path);
    }
  }

  async function runDetection(compareAll: boolean) {
    const response = await startAudioDetection({
      audioPath,
      compareAll,
      silenceDurationSeconds,
      splitMethod,
    });

    setJob(null);
    setActiveJobId(response.jobId);
  }

  async function splitAudio() {
    const response = await startAudioSplit({
      audioPath,
      chapters: chaptersToSplit,
      outputPath,
    });

    setActiveJobId(response.jobId);
  }

  async function cancelCurrentJob() {
    if (!activeJobId) {
      return;
    }

    await cancelAudioJob(activeJobId);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
      <div className="space-y-6">
        <section className="panel-work rounded-[32px] p-6 md:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="eyebrow">Audio Bench / Local Helper Tool</p>
              <h1 className="mt-4 display-title text-6xl text-ink md:text-7xl">
                Audio Splitter
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/72 md:text-lg">
                Keep the exact desktop flow: select one audiobook, detect
                chapters by silence or embedded markers, compare 2/3/4-second
                silence thresholds, and split directly to MP3.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
              <ToolMetricCard label="Helper" value={helperState} />
              <ToolMetricCard
                label="Detected Chapters"
                value={formatChapterCount(job?.detectionSummary ?? null)}
              />
            </div>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="panel-plate rounded-[28px] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="eyebrow">Desktop Bridge</p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">
                    The web UI talks to the Windows helper on localhost so the
                    audio processing can stay native and reliable.
                  </p>
                </div>

                <div className="panel-shell flex size-12 items-center justify-center rounded-[18px] text-white">
                  <ScissorsLineDashed size={18} />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {helperState === "offline" ? (
                  <ToolNotice tone="warning">
                    <div className="flex items-start gap-3">
                      <RadioTower className="mt-0.5 shrink-0 text-[var(--warning)]" size={18} />
                      <div>
                        <p className="font-semibold text-ink">Helper offline</p>
                        <p className="mt-1">
                          Double-click <code>{helperLauncher}</code> or run <code>{helperCommand}</code> from
                          {" "}
                          <code>D:\Dev\SMGrayToolsWeb</code>, then refresh this
                          page if it does not reconnect on its own.
                        </p>
                      </div>
                    </div>
                  </ToolNotice>
                ) : (
                  <ToolNotice tone="success">
                    Helper connected{helperVersion ? ` (${helperVersion})` : ""}.
                  </ToolNotice>
                )}

                <ToolNotice>
                  Audio file:{" "}
                  <span className="font-semibold text-ink">
                    {audioPath || "Nothing selected yet"}
                  </span>
                </ToolNotice>

                <div>
                  <label
                    className="text-sm font-semibold text-ink"
                    htmlFor="audio-path"
                  >
                    Audio file path
                  </label>
                  <input
                    autoComplete="off"
                    className={pathInputClass}
                    id="audio-path"
                    onChange={(event) => setAudioPath(event.currentTarget.value)}
                    placeholder="D:\\New\\Your audiobook.m4b"
                    spellCheck={false}
                    type="text"
                    value={audioPath}
                  />
                </div>

                <ToolNotice>
                  Output folder:{" "}
                  <span className="font-semibold text-ink">
                    {outputPath || "Nothing selected yet"}
                  </span>
                </ToolNotice>

                <div>
                  <label
                    className="text-sm font-semibold text-ink"
                    htmlFor="output-path"
                  >
                    Output folder path
                  </label>
                  <input
                    autoComplete="off"
                    className={pathInputClass}
                    id="output-path"
                    onChange={(event) => setOutputPath(event.currentTarget.value)}
                    placeholder="D:\\New"
                    spellCheck={false}
                    type="text"
                    value={outputPath}
                  />
                </div>

                <ToolNotice>
                  If the Windows picker hides behind the browser, you can paste
                  the audio path and output folder here and skip the picker
                  completely.
                </ToolNotice>
              </div>
            </div>

            <div className="space-y-4">
              <div className="panel-plate rounded-[28px] p-5">
                <p className="eyebrow">Actions</p>
                <div className="mt-5 grid gap-3">
                  <button
                    className="rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={helperState !== "online"}
                    onClick={() => {
                      void pickAudioPath();
                    }}
                    type="button"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FolderOpen size={16} />
                      Select audio file
                    </span>
                  </button>

                  <button
                    className="rounded-full bg-ink/6 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={helperState !== "online"}
                    onClick={() => {
                      void pickOutputPath();
                    }}
                    type="button"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FolderOpen size={16} />
                      Select output folder
                    </span>
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  <label className="text-sm font-semibold text-ink">Split method</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                        splitMethod === "silence"
                          ? "bg-ink text-white"
                          : "bg-ink/6 text-ink hover:bg-ink/10"
                      }`}
                      onClick={() => setSplitMethod("silence")}
                      type="button"
                    >
                      Detect by silence
                    </button>
                    <button
                      className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                        splitMethod === "embeddedChapters"
                          ? "bg-ink text-white"
                          : "bg-ink/6 text-ink hover:bg-ink/10"
                      }`}
                      onClick={() => setSplitMethod("embeddedChapters")}
                      type="button"
                    >
                      Use embedded chapters
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-semibold text-ink" htmlFor="silence-seconds">
                      Silence duration
                    </label>
                    <span className="rounded-full bg-accent/12 px-3 py-1.5 text-sm font-semibold text-accent">
                      {silenceDurationSeconds} seconds
                    </span>
                  </div>

                  <input
                    className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-ink/10 accent-[var(--accent)]"
                    disabled={splitMethod !== "silence"}
                    id="silence-seconds"
                    max={10}
                    min={1}
                    onChange={(event) =>
                      setSilenceDurationSeconds(Number(event.currentTarget.value))
                    }
                    type="range"
                    value={silenceDurationSeconds}
                  />
                </div>

                <div className="mt-6 grid gap-3">
                  <button
                    className="rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!audioPath || helperState !== "online" || !!activeJobId}
                    onClick={() => {
                      void runDetection(false);
                    }}
                    type="button"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Waves size={16} />
                      {splitMethod === "silence" ? "Detect silence" : "Detect chapters"}
                    </span>
                  </button>

                  <button
                    className="rounded-full bg-ink/6 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={
                      splitMethod !== "silence" ||
                      !audioPath ||
                      helperState !== "online" ||
                      !!activeJobId
                    }
                    onClick={() => {
                      void runDetection(true);
                    }}
                    type="button"
                  >
                    Compare 2 / 3 / 4 second durations
                  </button>

                  <button
                    className="rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={
                      !audioPath ||
                      !outputPath ||
                      chaptersToSplit.length === 0 ||
                      !!activeJobId ||
                      (job?.detectionSummary?.compareAll === true && !canSplitFromCompare)
                    }
                    onClick={() => {
                      void splitAudio();
                    }}
                    type="button"
                  >
                    Split audio
                  </button>

                  <button
                    className="rounded-full bg-ink/6 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!activeJobId}
                    onClick={() => {
                      void cancelCurrentJob();
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel-work rounded-[32px] p-6 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="eyebrow">Quick Start</p>
              <h2 className="mt-4 display-title text-4xl text-ink md:text-5xl">
                How to run Audio Splitter
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/68">
                The web page is the control surface. The Windows helper does the
                actual audio work on your machine.
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-[24px] bg-ink px-5 py-4 text-white shadow-[0_18px_50px_rgba(19,16,12,0.18)]">
                <p className="eyebrow text-white/48">One-click launcher</p>
                <code className="mt-3 block text-sm font-semibold text-white">
                  {helperLauncher}
                </code>
              </div>

              <div className="rounded-[24px] border border-black/6 bg-white/68 px-5 py-4 text-ink">
                <p className="eyebrow">Terminal command</p>
                <code className="mt-3 block text-sm font-semibold text-ink">
                  {helperCommand}
                </code>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-2">
            {quickStartSteps.map((step) => (
              <article
                key={step.label}
                className="rounded-[26px] border border-black/6 bg-white/62 p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-[18px] bg-accent text-base font-semibold text-white">
                    {step.label}
                  </div>

                  <div>
                    <p className="eyebrow">Step {step.label}</p>
                    <h3 className="mt-2 text-xl font-semibold text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-ink/70">
                      {step.detail}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <ToolNotice tone="success">
              <div>
                <p className="font-semibold text-ink">Using the BAT file</p>
                <p className="mt-2">
                  Open <code>D:\Dev\SMGrayToolsWeb</code> in File Explorer,
                  double-click <code>{helperLauncher}</code>, and leave that
                  console window open while you use Audio Splitter. When the
                  Helper card on this page shows <strong>online</strong>, you
                  are ready to go.
                </p>
              </div>
            </ToolNotice>

            <ToolNotice>
              <div>
                <p className="font-semibold text-ink">Using the terminal command</p>
                <p className="mt-2">
                  If you prefer the command line, open a terminal in
                  {" "}
                  <code>D:\Dev\SMGrayToolsWeb</code>
                  {" "}
                  and run <code>{helperCommand}</code>. The result is the same
                  as the BAT file.
                </p>
              </div>
            </ToolNotice>

          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <ToolNotice tone="warning">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="mt-0.5 shrink-0 text-[var(--warning)]"
                  size={18}
                />
                <div>
                  A normal web app cannot directly launch local Windows
                  processes, so the helper has to be started by you once per
                  session.
                </div>
              </div>
            </ToolNotice>

            <ToolNotice tone="warning">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="mt-0.5 shrink-0 text-[var(--warning)]"
                  size={18}
                />
                <div>
                  Embedded chapter detection for M4B files expects
                  {" "}
                  <code>ffprobe.exe</code>
                  {" "}
                  on your PATH or beside the helper executable.
                </div>
              </div>
            </ToolNotice>

            <ToolNotice tone="success">
              If the helper is already online, you can leave this page open and
              run multiple audiobooks back to back without restarting anything.
            </ToolNotice>
          </div>
        </section>

        {job?.detectionSummary?.compareAll ? (
          <section className="panel-work rounded-[32px] p-6 md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="eyebrow">Comparison Mode</p>
                <h2 className="mt-4 display-title text-4xl text-ink md:text-5xl">
                  2 / 3 / 4 second silence comparison
                </h2>
                <p className="mt-3 text-sm leading-7 text-ink/68">
                  Keep the slider on 2, 3, or 4 seconds before splitting to
                  select which detected chapter set should be used.
                </p>
              </div>

              <div className="rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white">
                Current split source: {silenceDurationSeconds} seconds
              </div>
            </div>

            <div className="mt-8 grid gap-4 xl:grid-cols-3">
              {comparisonResults.map((result: AudioComparisonResult) => {
                const isActive = silenceDurationSeconds === result.silenceDurationSeconds;

                return (
                  <article
                    key={result.silenceDurationSeconds}
                    className={`rounded-[26px] border p-4 ${
                      isActive
                        ? "border-accent/28 bg-white"
                        : "border-black/6 bg-white/58"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="eyebrow">Comparison</p>
                        <p className="mt-3 text-2xl font-semibold text-ink">
                          {result.silenceDurationSeconds} seconds
                        </p>
                      </div>

                      <div className="rounded-full bg-accent/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-accent">
                        {result.chapterCount} chapters
                      </div>
                    </div>

                    <div className="mt-4 max-h-[260px] overflow-auto rounded-[18px] border border-black/6 bg-black/3 p-3 text-sm leading-6 text-ink/76">
                      <pre className="whitespace-pre-wrap">{result.logLines.join("\n")}</pre>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>

      <div className="space-y-6">
        <ToolLog
          emptyMessage="Pick an audio file, run detection, and the helper logs will appear here."
          lines={allLogLines}
        />

        <div className="grid gap-4">
          <ToolMetricCard
            label="Last Detection"
            value={job?.detectionSummary?.lastDetectionLabel ?? "None yet"}
          />
          <ToolMetricCard label="Job Status" value={job?.status ?? "Idle"} />
        </div>

        {job?.detectionSummary?.compareAll && !canSplitFromCompare ? (
          <ToolNotice tone="warning">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-[var(--warning)]" size={18} />
              <div>
                In comparison mode, the silence slider must be set to 2, 3, or 4
                seconds before you split, matching the desktop tool.
              </div>
            </div>
          </ToolNotice>
        ) : null}

        <ToolNotice>
          <div className="flex items-start gap-3">
            <Gauge className="mt-0.5 shrink-0 text-accent" size={18} />
            <div>
              This bridge is parity-first. It keeps the desktop chapter naming,
              minimum chapter duration, and 320 kbps MP3 output behavior.
            </div>
          </div>
        </ToolNotice>
      </div>
    </div>
  );
}
