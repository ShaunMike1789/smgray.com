"use client";

import {
  CheckCircle2,
  Download,
  Gauge,
  Images,
  RefreshCcw,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { useDeferredValue } from "react";

import { CropDropzone } from "@/components/auto-crop/crop-dropzone";
import { CropJobCard } from "@/components/auto-crop/crop-job-card";
import { formatFileSize } from "@/lib/auto-crop/image";
import type { CropJob } from "@/lib/auto-crop/types";
import { useAutoCropQueue } from "@/hooks/use-auto-crop-queue";

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="panel-plate rounded-[22px] px-4 py-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function AspectModeButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
        isActive
          ? "bg-ink text-white"
          : "bg-ink/6 text-ink hover:bg-ink/10"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function cropBoxStyle(job: CropJob) {
  if (!job.originalSize || !job.cropBounds) {
    return undefined;
  }

  return {
    left: `${(job.cropBounds.x / job.originalSize.width) * 100}%`,
    top: `${(job.cropBounds.y / job.originalSize.height) * 100}%`,
    width: `${(job.cropBounds.width / job.originalSize.width) * 100}%`,
    height: `${(job.cropBounds.height / job.originalSize.height) * 100}%`,
  };
}

function PreviewPanel({
  job,
  onDownload,
  onRetry,
}: {
  job: CropJob | null;
  onDownload: (jobId: string) => void;
  onRetry: (jobId: string) => void;
}) {
  if (!job) {
    return (
      <section className="panel-work rounded-[32px] p-6 md:p-8">
        <p className="eyebrow">Workbench Preview</p>
        <h2 className="mt-4 display-title text-4xl text-ink md:text-5xl">
          Nothing loaded yet
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/70 md:text-base">
          Add a photo and the bench will show the original frame, the computed
          crop window, and the finished export side by side.
        </p>
      </section>
    );
  }

  const cropOverlay = cropBoxStyle(job);

  return (
    <section className="panel-work rounded-[32px] p-6 md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Workbench Preview</p>
          <h2 className="mt-4 display-title text-4xl text-ink md:text-5xl">
            {job.file.name}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/70 md:text-base">
            Review the crop window before you download. The overlay shows the
            final frame the tool will export.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {job.backend ? (
            <span className="rounded-full bg-ink px-3 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white">
              {job.backend}
            </span>
          ) : null}

          {job.status === "done" ? (
            <button
              className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90"
              data-testid="preview-download"
              onClick={() => onDownload(job.id)}
              type="button"
            >
              <span className="inline-flex items-center gap-2">
                <Download size={16} />
                Download crop
              </span>
            </button>
          ) : null}

          {job.status === "done" || job.status === "error" ? (
            <button
              className="rounded-full bg-ink/6 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/10"
              onClick={() => onRetry(job.id)}
              type="button"
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCcw size={16} />
                Re-run
              </span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        <article className="panel-plate rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Original</p>
              <p className="mt-2 text-sm text-ink/65">
                {job.originalSize
                  ? `${job.originalSize.width} x ${job.originalSize.height}`
                  : "Waiting for analysis"}
              </p>
            </div>

            <span className="rounded-full bg-accent/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-accent">
              Crop frame
            </span>
          </div>

          <div className="relative mt-5 overflow-hidden rounded-[24px] bg-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`${job.file.name} original`}
              className="h-[340px] w-full object-contain md:h-[420px]"
              src={job.sourceUrl}
            />

            {cropOverlay ? (
              <div
                className="pointer-events-none absolute rounded-[18px] border-[3px] border-accent shadow-[0_0_0_999px_rgba(0,0,0,0.18)]"
                style={cropOverlay}
              />
            ) : null}
          </div>
        </article>

        <article className="panel-plate rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Output</p>
              <p className="mt-2 text-sm text-ink/65">{job.stageLabel}</p>
            </div>

            {job.status === "done" ? (
              <span className="rounded-full bg-signal/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-signal">
                Ready
              </span>
            ) : null}
          </div>

          <div className="mt-5 overflow-hidden rounded-[24px] bg-black/10">
            {job.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={`${job.file.name} cropped`}
                className="h-[340px] w-full object-contain md:h-[420px]"
                src={job.previewUrl}
              />
            ) : job.status === "error" ? (
              <div className="flex h-[340px] flex-col items-center justify-center gap-4 px-6 text-center md:h-[420px]">
                <TriangleAlert className="text-red-500" size={30} />
                <div>
                  <p className="text-lg font-semibold text-ink">
                    This photo needs another pass
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">
                    {job.error}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-[340px] flex-col items-center justify-center gap-4 px-6 text-center md:h-[420px]">
                <Sparkles className="text-accent" size={28} />
                <div>
                  <p className="text-lg font-semibold text-ink">
                    Building the crop
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">
                    The worker is loading the model, locating the main subject,
                    and locking in the final frame.
                  </p>
                </div>
                <div className="w-full max-w-sm">
                  <div className="h-2 overflow-hidden rounded-full bg-ink/8">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${Math.max(job.progress * 100, 6)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </article>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <MetricCard label="File Size" value={formatFileSize(job.file.size)} />
        <MetricCard
          label="Crop Width"
          value={job.cropBounds ? `${job.cropBounds.width}px` : "Pending"}
        />
        <MetricCard
          label="Crop Height"
          value={job.cropBounds ? `${job.cropBounds.height}px` : "Pending"}
        />
        <MetricCard label="Status" value={job.status.toUpperCase()} />
      </div>
    </section>
  );
}

export function AutoCropTool() {
  const {
    clearCompleted,
    completedCount,
    downloadAll,
    downloadJob,
    enqueueFiles,
    failedCount,
    jobs,
    outputAspect,
    paddingPercent,
    processingCount,
    queuedCount,
    readyBackends,
    reprocessCompleted,
    removeJob,
    retryJob,
    selectJob,
    selectedJob,
    setPaddingPercent,
    setOutputAspect,
    totalCount,
  } = useAutoCropQueue();

  const deferredJobs = useDeferredValue(jobs);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
      <div className="space-y-6">
        <section className="panel-work rounded-[32px] p-6 md:p-8">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="eyebrow">Image Lab / Live Tool</p>
                <h1 className="mt-4 display-title text-6xl text-ink md:text-7xl">
                  Auto Crop
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/72 md:text-lg">
                  Drop in one product photo or a full batch. The tool isolates
                  the dominant subject, keeps the original aspect ratio, and
                  exports a tighter frame that is easier to list fast.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
                <MetricCard label="Queued" value={queuedCount} />
                <MetricCard label="Completed" value={completedCount} />
                <MetricCard label="Running" value={processingCount} />
                <MetricCard label="Errors" value={failedCount} />
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <CropDropzone onFilesSelected={enqueueFiles} />

              <div className="panel-plate rounded-[28px] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="eyebrow">Crop Settings</p>
                    <p className="mt-2 text-sm leading-6 text-ink/68">
                      Settings affect newly added or retried crops.
                    </p>
                  </div>

                  <div className="panel-shell flex size-12 items-center justify-center rounded-[18px] text-white">
                    <SlidersHorizontal size={18} />
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">
                      Crop mode
                    </span>
                    <span className="rounded-full bg-accent/12 px-3 py-1.5 text-sm font-semibold text-accent">
                      {outputAspect === "tight" ? "Tight" : "Original ratio"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <AspectModeButton
                      isActive={outputAspect === "tight"}
                      label="Tight subject"
                      onClick={() => setOutputAspect("tight")}
                    />
                    <AspectModeButton
                      isActive={outputAspect === "original"}
                      label="Keep original ratio"
                      onClick={() => setOutputAspect("original")}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-semibold text-ink" htmlFor="padding">
                      Subject padding
                    </label>
                    <span className="rounded-full bg-accent/12 px-3 py-1.5 text-sm font-semibold text-accent">
                      {paddingPercent}%
                    </span>
                  </div>

                  <input
                    className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-ink/10 accent-[var(--accent)]"
                    id="padding"
                    max={30}
                    min={0}
                    onChange={(event) =>
                      setPaddingPercent(Number(event.currentTarget.value))
                    }
                    type="range"
                    value={paddingPercent}
                  />
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    className="w-full rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/20"
                    data-testid="download-all"
                    disabled={completedCount === 0}
                    onClick={() => {
                      void downloadAll();
                    }}
                    type="button"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Download size={16} />
                      Download all as ZIP
                    </span>
                  </button>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      className="rounded-full bg-ink/6 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={completedCount === 0}
                      onClick={reprocessCompleted}
                      type="button"
                    >
                      <span className="inline-flex items-center gap-2">
                        <RefreshCcw size={16} />
                        Re-run ready
                      </span>
                    </button>

                    <button
                      className="rounded-full bg-ink/6 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={completedCount === 0}
                      onClick={clearCompleted}
                      type="button"
                    >
                      Clear ready
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  <div className="flex items-center gap-3 rounded-[20px] bg-white/55 px-4 py-3 text-sm text-ink/72">
                    <Gauge className="text-accent" size={16} />
                    {readyBackends.wasm > 0
                      ? `${readyBackends.wasm} crop${
                          readyBackends.wasm === 1 ? "" : "s"
                        } finished with the browser-safe WASM model`
                      : "The tool uses a browser-safe WASM model for consistent cropping."}
                  </div>

                  <div className="flex items-center gap-3 rounded-[20px] bg-white/55 px-4 py-3 text-sm text-ink/72">
                    <Images className="text-accent" size={16} />
                    Supports JPG and PNG uploads for single-photo or batch runs.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PreviewPanel job={selectedJob} onDownload={downloadJob} onRetry={retryJob} />
      </div>

      <aside className="panel-shell flex min-h-[520px] flex-col rounded-[32px] p-4 text-white">
        <div className="flex items-center justify-between gap-3 p-2">
          <div>
            <p className="eyebrow text-white/45">Queue</p>
            <h2 className="display-title text-4xl">Jobs</h2>
          </div>

          <div className="rounded-full bg-white/8 px-3 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
            <span data-testid="queue-total">{totalCount} total</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="steel-inset rounded-[20px] px-4 py-3">
            <p className="eyebrow text-white/42">Ready</p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {completedCount}
            </p>
          </div>

          <div className="steel-inset rounded-[20px] px-4 py-3">
            <p className="eyebrow text-white/42">Active</p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {processingCount + queuedCount}
            </p>
          </div>
        </div>

        <div className="mt-5 flex-1 overflow-y-auto pr-1 bench-scroll">
          {deferredJobs.length === 0 ? (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-white/8 bg-white/[0.03] px-6 text-center">
              <Sparkles className="text-accent" size={28} />
              <p className="mt-4 text-lg font-semibold text-white">
                Queue is clear
              </p>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Add a photo to start the first crop run. Each image keeps its own
                retry and download controls once it finishes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {deferredJobs.map((job) => (
                <CropJobCard
                  isSelected={job.id === selectedJob?.id}
                  job={job}
                  key={job.id}
                  onDownload={downloadJob}
                  onRemove={removeJob}
                  onRetry={retryJob}
                  onSelect={selectJob}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3">
          <div className="steel-inset rounded-[20px] px-4 py-3 text-sm leading-6 text-white/62">
            <div className="inline-flex items-center gap-2 text-white">
              <Zap size={16} />
              Worker-backed processing
            </div>
            <p className="mt-2">
              The queue stays responsive by running subject detection in a worker
              and handling one image at a time.
            </p>
          </div>

          <div className="steel-inset rounded-[20px] px-4 py-3 text-sm leading-6 text-white/62">
            <div className="inline-flex items-center gap-2 text-white">
              <CheckCircle2 size={16} />
              Original ratio preserved
            </div>
            <p className="mt-2">
              Crops stay rectangular and keep the original photo ratio while
              tightening around the detected subject.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
