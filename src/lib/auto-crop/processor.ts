"use client";

import {
  expandBoundsWithPadding,
  fitBoundsToAspectRatio,
} from "@/lib/auto-crop/crop-math";
import type {
  CropAnalysisResult,
  CropSettings,
  CropWorkerRequest,
  CropWorkerResponse,
} from "@/lib/auto-crop/types";

type ProgressListener = (message: Extract<CropWorkerResponse, { type: "progress" }>) => void;

interface CropProcessor {
  dispose(): void;
  process(
    jobId: string,
    file: File,
    settings: CropSettings,
  ): Promise<CropAnalysisResult>;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function readImageDimensions(file: File) {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    try {
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  }

  const url = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Unable to decode image."));
      nextImage.src = url;
    });

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

class MockCropProcessor implements CropProcessor {
  constructor(private readonly onProgress: ProgressListener) {}

  dispose() {}

  async process(
    jobId: string,
    file: File,
    settings: CropSettings,
  ): Promise<CropAnalysisResult> {
    this.onProgress({
      type: "progress",
      jobId,
      progress: 0.14,
      stageLabel: "Mock model warmup",
    });
    await wait(60);

    const { width, height } = await readImageDimensions(file);
    const subjectBounds = {
      x: Math.round(width * 0.1),
      y: Math.round(height * 0.08),
      width: Math.round(width * 0.8),
      height: Math.round(height * 0.84),
    };

    this.onProgress({
      type: "progress",
      jobId,
      progress: 0.72,
      stageLabel: "Mock subject analysis",
    });
    await wait(40);

    const paddedBounds = expandBoundsWithPadding(
      subjectBounds,
      width,
      height,
      settings.paddingPercent,
    );
    const originalRatioBounds = fitBoundsToAspectRatio(
      paddedBounds,
      width,
      height,
      width / height,
    );

    return {
      backend: "mock" as const,
      cropBounds:
        settings.outputAspect === "original"
          ? originalRatioBounds
          : paddedBounds,
      originalHeight: height,
      originalWidth: width,
      subjectBounds,
    };
  }
}

class WorkerCropProcessor implements CropProcessor {
  private readonly pending = new Map<
    string,
    {
      reject: (error: Error) => void;
      resolve: (result: CropAnalysisResult) => void;
    }
  >();

  private readonly worker: Worker;

  constructor(private readonly onProgress: ProgressListener) {
    this.worker = new Worker(
      new URL("../../workers/auto-crop.worker.ts", import.meta.url),
      { type: "module" },
    );
    this.worker.addEventListener(
      "message",
      this.handleMessage as EventListener,
    );
  }

  dispose() {
    this.worker.removeEventListener(
      "message",
      this.handleMessage as EventListener,
    );

    for (const { reject } of this.pending.values()) {
      reject(new Error("The crop processor was disposed before completion."));
    }

    this.pending.clear();
    this.worker.terminate();
  }

  process(jobId: string, file: File, settings: CropSettings) {
    return new Promise<CropAnalysisResult>((resolve, reject) => {
      this.pending.set(jobId, { resolve, reject });

      const message: CropWorkerRequest = {
        type: "process",
        file,
        jobId,
        settings,
      };

      this.worker.postMessage(message);
    });
  }

  private handleMessage = (event: MessageEvent<CropWorkerResponse>) => {
    const message = event.data;

    if (message.type === "progress") {
      this.onProgress(message);
      return;
    }

    const request = this.pending.get(message.jobId);
    if (!request) {
      return;
    }

    this.pending.delete(message.jobId);

    if (message.type === "error") {
      request.reject(new Error(message.message));
      return;
    }

    request.resolve({
      backend: message.backend,
      cropBounds: message.cropBounds,
      originalHeight: message.originalHeight,
      originalWidth: message.originalWidth,
      subjectBounds: message.subjectBounds,
    });
  };
}

export function createCropProcessor(onProgress: ProgressListener): CropProcessor {
  if (process.env.NEXT_PUBLIC_ENABLE_MOCK_CROP === "1") {
    return new MockCropProcessor(onProgress);
  }

  return new WorkerCropProcessor(onProgress);
}
