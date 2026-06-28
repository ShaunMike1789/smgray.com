/// <reference lib="webworker" />

import { env, pipeline } from "@huggingface/transformers";

import { computeCropBounds, extractAlphaChannel } from "@/lib/auto-crop/crop-math";
import type {
  CropBackend,
  CropWorkerCompleteMessage,
  CropWorkerErrorMessage,
  CropWorkerProgressMessage,
  CropWorkerRequest,
} from "@/lib/auto-crop/types";

declare const self: DedicatedWorkerGlobalScope;

env.allowLocalModels = false;
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

type ExecutionBackend = Exclude<CropBackend, "mock">;
const CROP_MODEL_ID = "briaai/RMBG-1.4";

let activeBackend: ExecutionBackend | null = null;
const disabledBackends = new Set<ExecutionBackend>();
type RawSegmentedImage = {
  channels: number;
  data: Uint8ClampedArray;
  height: number;
  width: number;
};

type BackgroundRemovalSegmenter = (
  image: Blob,
) => Promise<RawSegmentedImage[]>;

let segmenterPromise: Promise<BackgroundRemovalSegmenter> | null = null;
const createBackgroundRemovalPipeline = pipeline as (
  task: "background-removal",
  model: string,
  options: { device: ExecutionBackend },
) => Promise<BackgroundRemovalSegmenter>;

function postProgress(
  jobId: string,
  progress: number,
  stageLabel: string,
) {
  const message: CropWorkerProgressMessage = {
    type: "progress",
    jobId,
    progress,
    stageLabel,
  };

  self.postMessage(message);
}

function resetSegmenter(backend?: ExecutionBackend) {
  if (backend) {
    disabledBackends.add(backend);
  }

  activeBackend = null;
  segmenterPromise = null;
}

function getPreferredBackends() {
  // RMBG-1.4 is our stability-first browser path, so keep v1 on WASM.
  const preferredBackends: ExecutionBackend[] = ["wasm"];

  return preferredBackends.filter((backend) => !disabledBackends.has(backend));
}

function shouldRetryWithWasm(error: unknown) {
  if (activeBackend !== "webgpu") {
    return false;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const normalized = message.toLowerCase();

  return (
    normalized.includes("not yet supported") ||
    normalized.includes("maxpool") ||
    normalized.includes("shape computation") ||
    normalized.includes("webgpu")
  );
}

async function createSegmenter(jobId: string, backend: ExecutionBackend) {
  postProgress(
    jobId,
    backend === "webgpu" ? 0.08 : 0.1,
    backend === "webgpu"
      ? "Loading WebGPU crop model"
      : "Loading WASM crop model",
  );

  const nextSegmenter = await createBackgroundRemovalPipeline(
    "background-removal",
    CROP_MODEL_ID,
    { device: backend },
  );

  activeBackend = backend;
  return nextSegmenter;
}

async function loadSegmenter(jobId: string) {
  if (segmenterPromise) {
    return segmenterPromise;
  }

  segmenterPromise = (async () => {
    const preferredBackends = getPreferredBackends();

    if (preferredBackends.length === 0) {
      throw new Error("No supported crop backends are available.");
    }

    for (const backend of preferredBackends) {
      try {
        return await createSegmenter(jobId, backend);
      } catch (error) {
        resetSegmenter(backend);

        if (backend === preferredBackends.at(-1)) {
          throw error;
        }
      }
    }

    throw new Error("Unable to initialize the background removal model.");
  })();

  try {
    return await segmenterPromise;
  } catch (error) {
    segmenterPromise = null;
    throw error;
  }
}

async function runSegmentation(jobId: string, file: Blob) {
  const segmenter = await loadSegmenter(jobId);

  postProgress(jobId, 0.42, "Running subject segmentation");

  try {
    return await segmenter(file);
  } catch (error) {
    if (!shouldRetryWithWasm(error)) {
      throw error;
    }

    postProgress(jobId, 0.38, "WebGPU hit a model limit, switching to WASM");
    resetSegmenter("webgpu");

    const fallbackSegmenter = await loadSegmenter(jobId);
    postProgress(jobId, 0.46, "Running subject segmentation in WASM");
    return fallbackSegmenter(file);
  }
}

async function processPhoto(message: CropWorkerRequest) {
  postProgress(message.jobId, 0.03, "Queued for analysis");
  const output = await runSegmentation(message.jobId, message.file);
  const segmented = output[0];
  const alpha = extractAlphaChannel(segmented.data, segmented.channels);

  postProgress(message.jobId, 0.7, "Finding dominant subject");
  const { cropBounds, subjectBounds } = computeCropBounds(
    alpha,
    segmented.width,
    segmented.height,
    message.settings.paddingPercent,
    message.settings.outputAspect,
  );

  postProgress(message.jobId, 0.88, "Finalizing crop window");

  const response: CropWorkerCompleteMessage = {
    type: "complete",
    backend: activeBackend ?? "wasm",
    cropBounds,
    jobId: message.jobId,
    originalHeight: segmented.height,
    originalWidth: segmented.width,
    subjectBounds,
  };

  self.postMessage(response);
}

self.addEventListener("message", async (event: MessageEvent<CropWorkerRequest>) => {
  const message = event.data;

  if (message.type !== "process") {
    return;
  }

  try {
    await processPhoto(message);
  } catch (error) {
    const response: CropWorkerErrorMessage = {
      type: "error",
      jobId: message.jobId,
      message:
        error instanceof Error
          ? error.message
          : "The crop worker failed to process this photo.",
    };

    self.postMessage(response);
  }
});

export {};
