"use client";

import JSZip from "jszip";
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useReducer,
  useRef,
} from "react";

import {
  createDefaultCropSettings,
  type CropAnalysisResult,
  type CropBackend,
  type CropJob,
  type CropJobStatus,
  type CropOutputAspect,
  type CropSettings,
  type CropWorkerProgressMessage,
} from "@/lib/auto-crop/types";
import {
  createOutputFilename,
  cropFileToBlob,
  downloadBlob,
} from "@/lib/auto-crop/image";
import { createCropProcessor } from "@/lib/auto-crop/processor";

const MAX_ACTIVE_JOBS = 1;

interface CropState {
  jobs: CropJob[];
  selectedJobId: string | null;
  settings: CropSettings;
}

type CropAction =
  | { type: "clear-completed" }
  | { jobs: CropJob[]; type: "enqueue" }
  | { jobId: string; message: string; type: "error" }
  | {
      blob: Blob;
      jobId: string;
      previewUrl: string;
      result: CropAnalysisResult;
      type: "complete";
    }
  | { jobId: string; type: "remove" }
  | { jobId: string; settingsSnapshot: CropSettings; type: "retry" }
  | { jobId: string | null; type: "select" }
  | { outputAspect: CropOutputAspect; type: "set-output-aspect" }
  | {
      jobId: string;
      progress: number;
      stageLabel: string;
      status: CropJobStatus;
      type: "stage";
    }
  | { paddingPercent: number; type: "set-padding" };

function createInitialState(): CropState {
  return {
    jobs: [],
    selectedJobId: null,
    settings: createDefaultCropSettings(),
  };
}

function cropReducer(state: CropState, action: CropAction): CropState {
  switch (action.type) {
    case "enqueue":
      return {
        ...state,
        jobs: [...state.jobs, ...action.jobs],
        selectedJobId: state.selectedJobId ?? action.jobs[0]?.id ?? null,
      };

    case "set-padding":
      return {
        ...state,
        settings: {
          ...state.settings,
          paddingPercent: action.paddingPercent,
        },
      };

    case "set-output-aspect":
      return {
        ...state,
        settings: {
          ...state.settings,
          outputAspect: action.outputAspect,
        },
      };

    case "select":
      return {
        ...state,
        selectedJobId: action.jobId,
      };

    case "stage":
      return {
        ...state,
        jobs: state.jobs.map((job) =>
          job.id === action.jobId
            ? {
                ...job,
                status: action.status,
                progress: action.progress,
                stageLabel: action.stageLabel,
                error: null,
              }
            : job,
        ),
      };

    case "complete":
      return {
        ...state,
        jobs: state.jobs.map((job) =>
          job.id === action.jobId
            ? {
                ...job,
                backend: action.result.backend,
                cropBounds: action.result.cropBounds,
                croppedBlob: action.blob,
                originalSize: {
                  width: action.result.originalWidth,
                  height: action.result.originalHeight,
                },
                previewUrl: action.previewUrl,
                progress: 1,
                stageLabel: "Ready to download",
                status: "done",
                subjectBounds: action.result.subjectBounds,
              }
            : job,
        ),
      };

    case "error":
      return {
        ...state,
        jobs: state.jobs.map((job) =>
          job.id === action.jobId
            ? {
                ...job,
                error: action.message,
                progress: 0,
                stageLabel: "Needs attention",
                status: "error",
              }
            : job,
        ),
      };

    case "retry":
      return {
        ...state,
        jobs: state.jobs.map((job) =>
          job.id === action.jobId
            ? {
                ...job,
                backend: null,
                cropBounds: null,
                croppedBlob: null,
                error: null,
                originalSize: null,
                previewUrl: null,
                progress: 0,
                settingsSnapshot: action.settingsSnapshot,
                stageLabel: "Waiting to run",
                status: "queued",
                subjectBounds: null,
              }
            : job,
        ),
        selectedJobId: action.jobId,
      };

    case "remove": {
      const remainingJobs = state.jobs.filter((job) => job.id !== action.jobId);
      const selectedJobId =
        state.selectedJobId === action.jobId
          ? remainingJobs[0]?.id ?? null
          : state.selectedJobId;

      return {
        ...state,
        jobs: remainingJobs,
        selectedJobId,
      };
    }

    case "clear-completed": {
      const remainingJobs = state.jobs.filter((job) => job.status !== "done");
      const selectedJobId =
        remainingJobs.find((job) => job.id === state.selectedJobId)?.id ??
        remainingJobs[0]?.id ??
        null;

      return {
        ...state,
        jobs: remainingJobs,
        selectedJobId,
      };
    }
  }
}

function isQueued(job: CropJob) {
  return job.status === "queued";
}

function isProcessing(status: CropJobStatus) {
  return (
    status === "loading-model" ||
    status === "analyzing" ||
    status === "cropping"
  );
}

function mapProgressToStatus(message: CropWorkerProgressMessage) {
  if (message.stageLabel.startsWith("Loading") || message.progress < 0.4) {
    return "loading-model" as const;
  }

  return "analyzing" as const;
}

function revokeJobUrls(job: CropJob) {
  URL.revokeObjectURL(job.sourceUrl);
  if (job.previewUrl) {
    URL.revokeObjectURL(job.previewUrl);
  }
}

export function useAutoCropQueue() {
  const [state, dispatch] = useReducer(cropReducer, undefined, createInitialState);

  const processorRef = useRef<ReturnType<typeof createCropProcessor> | null>(null);
  const jobsRef = useRef<CropJob[]>(state.jobs);
  const activeJobsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    jobsRef.current = state.jobs;
  }, [state.jobs]);

  const handleProgress = useEffectEvent((message: CropWorkerProgressMessage) => {
    dispatch({
      type: "stage",
      jobId: message.jobId,
      progress: message.progress,
      stageLabel: message.stageLabel,
      status: mapProgressToStatus(message),
    });
  });

  const runJob = useEffectEvent(async (job: CropJob) => {
    if (!processorRef.current || activeJobsRef.current.has(job.id)) {
      return;
    }

    activeJobsRef.current.add(job.id);

    try {
      const result = await processorRef.current.process(
        job.id,
        job.file,
        job.settingsSnapshot,
      );

      dispatch({
        type: "stage",
        jobId: job.id,
        progress: 0.94,
        stageLabel: "Cropping image",
        status: "cropping",
      });

      const blob = await cropFileToBlob(job.file, result.cropBounds);
      const previewUrl = URL.createObjectURL(blob);

      const jobStillExists = jobsRef.current.some(
        (candidate) => candidate.id === job.id,
      );

      if (!jobStillExists) {
        URL.revokeObjectURL(previewUrl);
        return;
      }

      dispatch({
        type: "complete",
        blob,
        jobId: job.id,
        previewUrl,
        result,
      });
    } catch (error) {
      dispatch({
        type: "error",
        jobId: job.id,
        message:
          error instanceof Error
            ? error.message
            : "The selected photo could not be processed.",
      });
    } finally {
      activeJobsRef.current.delete(job.id);
    }
  });

  useEffect(() => {
    processorRef.current = createCropProcessor(handleProgress);

    return () => {
      processorRef.current?.dispose();
      processorRef.current = null;

      for (const job of jobsRef.current) {
        revokeJobUrls(job);
      }
    };
  }, []);

  useEffect(() => {
    if (activeJobsRef.current.size >= MAX_ACTIVE_JOBS) {
      return;
    }

    const nextJob = state.jobs.find(isQueued);
    if (!nextJob) {
      return;
    }

    dispatch({
      type: "stage",
      jobId: nextJob.id,
      progress: 0.02,
      stageLabel: "Preparing job",
      status: "loading-model",
    });

    void runJob(nextJob);
  }, [state.jobs]);

  async function downloadAll() {
    const completedJobs = jobsRef.current.filter(
      (job) => job.status === "done" && job.croppedBlob,
    );

    if (completedJobs.length === 0) {
      return;
    }

    const zip = new JSZip();

    for (const job of completedJobs) {
      zip.file(createOutputFilename(job.file), job.croppedBlob!);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "auto-crop-batch.zip");
  }

  function enqueueFiles(files: FileList | File[]) {
    const nextFiles = Array.from(files).filter((file) =>
      state.settings.acceptedMimeTypes.includes(file.type as never),
    );

    if (nextFiles.length === 0) {
      return;
    }

    const jobs = nextFiles.map<CropJob>((file) => ({
      backend: null,
      cropBounds: null,
      croppedBlob: null,
      error: null,
      file,
      id: crypto.randomUUID(),
      originalSize: null,
      previewUrl: null,
      progress: 0,
      settingsSnapshot: {
        ...state.settings,
      },
      sourceUrl: URL.createObjectURL(file),
      stageLabel: "Waiting to run",
      status: "queued",
      subjectBounds: null,
    }));

    startTransition(() => {
      dispatch({ type: "enqueue", jobs });
    });
  }

  function removeJob(jobId: string) {
    const job = jobsRef.current.find((candidate) => candidate.id === jobId);
    if (job) {
      revokeJobUrls(job);
    }

    dispatch({ type: "remove", jobId });
  }

  function retryJob(jobId: string) {
    const job = jobsRef.current.find((candidate) => candidate.id === jobId);
    if (job?.previewUrl) {
      URL.revokeObjectURL(job.previewUrl);
    }

    dispatch({
      type: "retry",
      jobId,
      settingsSnapshot: {
        ...state.settings,
      },
    });
  }

  function clearCompleted() {
    for (const job of jobsRef.current.filter((candidate) => candidate.status === "done")) {
      revokeJobUrls(job);
    }

    dispatch({ type: "clear-completed" });
  }

  function reprocessCompleted() {
    for (const job of jobsRef.current.filter((candidate) => candidate.status === "done")) {
      retryJob(job.id);
    }
  }

  function selectJob(jobId: string) {
    dispatch({ type: "select", jobId });
  }

  function setPaddingPercent(paddingPercent: number) {
    dispatch({ type: "set-padding", paddingPercent });
  }

  function setOutputAspect(outputAspect: CropOutputAspect) {
    dispatch({ type: "set-output-aspect", outputAspect });
  }

  function downloadJob(jobId: string) {
    const job = jobsRef.current.find((candidate) => candidate.id === jobId);
    if (!job?.croppedBlob) {
      return;
    }

    downloadBlob(job.croppedBlob, createOutputFilename(job.file));
  }

  const selectedJob =
    state.jobs.find((job) => job.id === state.selectedJobId) ?? state.jobs[0] ?? null;

  const queuedCount = state.jobs.filter((job) => job.status === "queued").length;
  const processingCount = state.jobs.filter((job) => isProcessing(job.status)).length;
  const completedCount = state.jobs.filter((job) => job.status === "done").length;
  const failedCount = state.jobs.filter((job) => job.status === "error").length;
  const readyJobs = state.jobs.filter((job) => job.status === "done");
  const readyBackends = readyJobs.reduce<Record<CropBackend, number>>(
    (counts, job) => {
      if (job.backend) {
        counts[job.backend] += 1;
      }
      return counts;
    },
    { mock: 0, wasm: 0, webgpu: 0 },
  );

  return {
    clearCompleted,
    completedCount,
    downloadAll,
    downloadJob,
    enqueueFiles,
    failedCount,
    jobs: state.jobs,
    outputAspect: state.settings.outputAspect,
    paddingPercent: state.settings.paddingPercent,
    processingCount,
    queuedCount,
    readyBackends,
    readyJobs,
    removeJob,
    reprocessCompleted,
    retryJob,
    selectJob,
    selectedJob,
    setPaddingPercent,
    setOutputAspect,
    settings: state.settings,
    totalCount: state.jobs.length,
  };
}
