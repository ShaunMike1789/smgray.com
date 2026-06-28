"use client";

import {
  Download,
  LoaderCircle,
  RefreshCcw,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { formatFileSize } from "@/lib/auto-crop/image";
import type { CropJob } from "@/lib/auto-crop/types";

interface CropJobCardProps {
  isSelected: boolean;
  job: CropJob;
  onDownload: (jobId: string) => void;
  onRemove: (jobId: string) => void;
  onRetry: (jobId: string) => void;
  onSelect: (jobId: string) => void;
}

function statusLabel(job: CropJob) {
  switch (job.status) {
    case "queued":
      return "Queued";
    case "loading-model":
      return "Loading";
    case "analyzing":
      return "Analyzing";
    case "cropping":
      return "Cropping";
    case "done":
      return "Ready";
    case "error":
      return "Error";
  }
}

function statusClass(job: CropJob) {
  switch (job.status) {
    case "done":
      return "bg-signal/18 text-signal";
    case "error":
      return "bg-red-500/16 text-red-300";
    case "queued":
      return "bg-white/8 text-white/55";
    default:
      return "bg-accent/18 text-accent";
  }
}

export function CropJobCard({
  isSelected,
  job,
  onDownload,
  onRemove,
  onRetry,
  onSelect,
}: CropJobCardProps) {
  const isBusy =
    job.status === "loading-model" ||
    job.status === "analyzing" ||
    job.status === "cropping";

  return (
    <div
      className={`w-full rounded-[24px] border p-3 text-left transition duration-200 ${
        isSelected
          ? "border-white/20 bg-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
          : "border-white/8 bg-white/[0.04] hover:border-white/14 hover:bg-white/[0.06]"
      }`}
      data-file-name={job.file.name}
      onClick={() => onSelect(job.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(job.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[18px] border border-white/8 bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={job.file.name}
            className="h-full w-full object-contain p-1"
            src={job.previewUrl ?? job.sourceUrl}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {job.file.name}
              </p>
              <p className="mt-1 text-xs text-white/45">
                {formatFileSize(job.file.size)}
              </p>
            </div>

            <span
              className={`rounded-full px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.28em] ${statusClass(
                job,
              )}`}
            >
              {statusLabel(job)}
            </span>
          </div>

          <p className="mt-3 text-xs leading-5 text-white/56">{job.stageLabel}</p>

          {isBusy ? (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${Math.max(job.progress * 100, 8)}%` }}
                />
              </div>
            </div>
          ) : null}

          {job.error ? (
            <div className="mt-3 flex items-start gap-2 rounded-[16px] bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
              <TriangleAlert className="mt-0.5 shrink-0" size={14} />
              <span>{job.error}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {job.status === "done" ? (
          <button
            className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/16"
            onClick={(event) => {
              event.stopPropagation();
              onDownload(job.id);
            }}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <Download size={14} />
              Download
            </span>
          </button>
        ) : null}

        {job.status === "error" || job.status === "done" ? (
          <button
            className="rounded-full bg-white/8 px-3 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/12"
            onClick={(event) => {
              event.stopPropagation();
              onRetry(job.id);
            }}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCcw size={14} />
              Retry
            </span>
          </button>
        ) : null}

        {isBusy ? (
          <div className="rounded-full bg-white/8 px-3 py-2 text-xs font-semibold text-white/65">
            <span className="inline-flex items-center gap-2">
              <LoaderCircle className="animate-spin" size={14} />
              Working
            </span>
          </div>
        ) : null}

        <button
          className="rounded-full bg-white/8 px-3 py-2 text-xs font-semibold text-white/65 transition hover:bg-white/12"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(job.id);
          }}
          type="button"
        >
          <span className="inline-flex items-center gap-2">
            <Trash2 size={14} />
            Remove
          </span>
        </button>
      </div>
    </div>
  );
}
