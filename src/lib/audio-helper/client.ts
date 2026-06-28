import type {
  AudioHelperHealth,
  AudioJobProgress,
  AudioSplitMethod,
  ChapterPoint,
} from "@/lib/audio-helper/types";

const AUDIO_HELPER_BASE_URL =
  process.env.NEXT_PUBLIC_AUDIO_HELPER_URL ?? "http://127.0.0.1:43127";

async function requestJson<T>(path: string, init?: RequestInit) {
  let response: Response;

  try {
    response = await fetch(`${AUDIO_HELPER_BASE_URL}${path}`, {
      cache: "no-store",
      ...init,
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error(
      "Audio helper is offline or blocked. Start the Windows helper on this same machine, then allow localhost/local-network access if your browser asks.",
    );
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Helper request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getAudioHelperHealth() {
  return requestJson<AudioHelperHealth>(`/api/health?t=${Date.now()}`);
}

export async function openAudioFileDialog() {
  return requestJson<{ path: string | null }>("/api/dialogs/audio-file", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function openOutputFolderDialog() {
  return requestJson<{ path: string | null }>("/api/dialogs/output-folder", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function startAudioDetection(request: {
  audioPath: string;
  compareAll: boolean;
  silenceDurationSeconds: number;
  splitMethod: AudioSplitMethod;
}) {
  return requestJson<{ jobId: string }>("/api/jobs/detect", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function startAudioSplit(request: {
  audioPath: string;
  chapters: ChapterPoint[];
  outputPath: string;
}) {
  return requestJson<{ jobId: string }>("/api/jobs/split", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getAudioJob(jobId: string) {
  return requestJson<AudioJobProgress>(`/api/jobs/${jobId}?t=${Date.now()}`);
}

export async function cancelAudioJob(jobId: string) {
  return requestJson<{ cancelled: boolean }>(`/api/jobs/${jobId}/cancel`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
