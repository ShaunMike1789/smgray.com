"use client";

import { ImagePlus, Layers3 } from "lucide-react";
import { useRef, useState } from "react";

interface CropDropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
}

export function CropDropzone({ onFilesSelected }: CropDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-dashed p-6 transition duration-200 md:p-7 ${
        isDragging
          ? "border-accent bg-accent/10"
          : "border-ink/15 bg-white/45"
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDragging(false);
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        onFilesSelected(event.dataTransfer.files);
      }}
    >
      <input
        accept="image/jpeg,image/png"
        className="hidden"
        multiple
        onChange={(event) => {
          if (event.target.files?.length) {
            onFilesSelected(event.target.files);
            event.target.value = "";
          }
        }}
        ref={inputRef}
        type="file"
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl space-y-4">
          <div className="panel-shell inline-flex size-16 items-center justify-center rounded-[22px] text-white">
            <ImagePlus size={28} strokeWidth={1.8} />
          </div>

          <div>
            <p className="display-title text-4xl text-ink md:text-5xl">
              Drop Photos Here
            </p>
            <p className="mt-2 text-sm leading-6 text-ink/70 md:text-base">
              Add one photo or a whole batch of eBay shots. The crop tool keeps
              everything in-browser and works with JPG or PNG files.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <button
            className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            Choose Photos
          </button>

          <div className="flex items-center gap-2 rounded-full bg-ink/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-ink/55">
            <Layers3 size={14} />
            Batch ready
          </div>
        </div>
      </div>
    </div>
  );
}

