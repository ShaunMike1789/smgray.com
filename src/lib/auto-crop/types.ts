export const ACCEPTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png"] as const;
export const DEFAULT_PADDING_PERCENT = 14;

export type AcceptedImageMimeType = (typeof ACCEPTED_IMAGE_MIME_TYPES)[number];
export type CropDownloadMode = "both";
export type CropOutputAspect = "tight" | "original";
export type CropJobStatus =
  | "queued"
  | "loading-model"
  | "analyzing"
  | "cropping"
  | "done"
  | "error";
export type CropBackend = "mock" | "wasm" | "webgpu";

export interface Bounds {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface CropSettings {
  acceptedMimeTypes: readonly AcceptedImageMimeType[];
  downloadMode: CropDownloadMode;
  outputAspect: CropOutputAspect;
  paddingPercent: number;
}

export interface CropJob {
  backend: CropBackend | null;
  cropBounds: Bounds | null;
  croppedBlob: Blob | null;
  error: string | null;
  file: File;
  id: string;
  originalSize: { height: number; width: number } | null;
  previewUrl: string | null;
  progress: number;
  settingsSnapshot: CropSettings;
  sourceUrl: string;
  stageLabel: string;
  status: CropJobStatus;
  subjectBounds: Bounds | null;
}

export interface CropAnalysisResult {
  backend: CropBackend;
  cropBounds: Bounds;
  originalHeight: number;
  originalWidth: number;
  subjectBounds: Bounds;
}

export interface CropWorkerRequest {
  file: Blob;
  jobId: string;
  settings: CropSettings;
  type: "process";
}

export interface CropWorkerProgressMessage {
  jobId: string;
  progress: number;
  stageLabel: string;
  type: "progress";
}

export interface CropWorkerCompleteMessage extends CropAnalysisResult {
  jobId: string;
  type: "complete";
}

export interface CropWorkerErrorMessage {
  jobId: string;
  message: string;
  type: "error";
}

export type CropWorkerResponse =
  | CropWorkerCompleteMessage
  | CropWorkerErrorMessage
  | CropWorkerProgressMessage;

export function createDefaultCropSettings(): CropSettings {
  return {
    acceptedMimeTypes: ACCEPTED_IMAGE_MIME_TYPES,
    downloadMode: "both",
    outputAspect: "tight",
    paddingPercent: DEFAULT_PADDING_PERCENT,
  };
}
