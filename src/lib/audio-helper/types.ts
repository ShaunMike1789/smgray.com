export type AudioSplitMethod = "silence" | "embeddedChapters";
export type AudioHelperConnectionState = "checking" | "offline" | "online";
export type AudioJobKind = "detect" | "split";
export type AudioJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface ChapterPoint {
  durationSeconds: number;
  name: string;
  startSeconds: number;
}

export interface AudioSplitJobSpec {
  audioPath: string;
  compareAll: boolean;
  outputPath: string;
  selectedComparisonDurationSeconds: number | null;
  silenceDurationSeconds: number;
  splitMethod: AudioSplitMethod;
}

export interface AudioComparisonResult {
  chapterCount: number;
  chapters: ChapterPoint[];
  label: string;
  logLines: string[];
  silenceDurationSeconds: number;
}

export interface AudioSplitSummary {
  createdFiles: string[];
  outputPath: string;
}

export interface AudioDetectionSummary {
  activeComparisonDurationSeconds: number | null;
  comparisonResults: AudioComparisonResult[];
  compareAll: boolean;
  lastDetectionLabel: string;
  logLines: string[];
}

export interface AudioJobProgress {
  canCancel: boolean;
  detectionSummary: AudioDetectionSummary | null;
  errorMessage: string | null;
  finishedAt: string | null;
  id: string;
  kind: AudioJobKind;
  logLines: string[];
  splitSummary: AudioSplitSummary | null;
  stageLabel: string;
  startedAt: string;
  status: AudioJobStatus;
}

export interface AudioHelperHealth {
  appName: string;
  ready: boolean;
  version: string;
}
