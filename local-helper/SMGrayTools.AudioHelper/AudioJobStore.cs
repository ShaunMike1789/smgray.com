using System.Collections.Concurrent;
using System.Text.Json;

namespace SMGrayTools.AudioHelper;

public sealed class AudioJobStore
{
    private sealed class AudioJobRecord
    {
        public required CancellationTokenSource CancellationTokenSource { get; init; }
        public required AudioJobProgress Progress { get; init; }
        public required object SyncRoot { get; init; }
    }

    private readonly ConcurrentDictionary<string, AudioJobRecord> _jobs = new();

    public (string JobId, CancellationToken CancellationToken) CreateJob(AudioJobKind kind, string stageLabel)
    {
        var jobId = Guid.NewGuid().ToString("N");
        var cancellationTokenSource = new CancellationTokenSource();
        var progress = new AudioJobProgress
        {
            CanCancel = true,
            DetectionSummary = null,
            ErrorMessage = null,
            FinishedAt = null,
            Id = jobId,
            Kind = kind,
            LogLines = [],
            SplitSummary = null,
            StageLabel = stageLabel,
            StartedAt = DateTimeOffset.UtcNow,
            Status = AudioJobStatus.Queued,
        };

        _jobs[jobId] = new AudioJobRecord
        {
            CancellationTokenSource = cancellationTokenSource,
            Progress = progress,
            SyncRoot = new object(),
        };

        return (jobId, cancellationTokenSource.Token);
    }

    public void SetRunning(string jobId, string stageLabel)
    {
        Update(jobId, progress =>
        {
            progress.StageLabel = stageLabel;
            progress.Status = AudioJobStatus.Running;
        });
    }

    public void SetDetectionSummary(string jobId, AudioDetectionSummary summary, string stageLabel)
    {
        Update(jobId, progress =>
        {
            progress.DetectionSummary = summary;
            progress.StageLabel = stageLabel;
        });
    }

    public void AppendDetectionLog(string jobId, string message)
    {
        Update(jobId, progress =>
        {
            progress.LogLines.Add(message);
            progress.DetectionSummary ??= new AudioDetectionSummary
            {
                ActiveComparisonDurationSeconds = null,
                ComparisonResults = [],
                CompareAll = false,
                LastDetectionLabel = "",
                LogLines = [],
            };

            progress.DetectionSummary.LogLines.Add(message);
        });
    }

    public void AppendLog(string jobId, string message)
    {
        Update(jobId, progress =>
        {
            progress.LogLines.Add(message);
        });
    }

    public void SetSplitSummary(string jobId, AudioSplitSummary summary, string stageLabel)
    {
        Update(jobId, progress =>
        {
            progress.SplitSummary = summary;
            progress.StageLabel = stageLabel;
        });
    }

    public void SetCompleted(string jobId, string stageLabel)
    {
        Update(jobId, progress =>
        {
            progress.CanCancel = false;
            progress.FinishedAt = DateTimeOffset.UtcNow;
            progress.StageLabel = stageLabel;
            progress.Status = AudioJobStatus.Completed;
        });
    }

    public void SetFailed(string jobId, string message)
    {
        Update(jobId, progress =>
        {
            progress.CanCancel = false;
            progress.ErrorMessage = message;
            progress.FinishedAt = DateTimeOffset.UtcNow;
            progress.StageLabel = "Failed";
            progress.Status = AudioJobStatus.Failed;
        });
    }

    public void SetCancelled(string jobId)
    {
        Update(jobId, progress =>
        {
            progress.CanCancel = false;
            progress.FinishedAt = DateTimeOffset.UtcNow;
            progress.StageLabel = "Cancelled";
            progress.Status = AudioJobStatus.Cancelled;
        });
    }

    public bool Cancel(string jobId)
    {
        if (!_jobs.TryGetValue(jobId, out var record))
        {
            return false;
        }

        record.CancellationTokenSource.Cancel();
        return true;
    }

    public AudioJobProgress? GetJob(string jobId)
    {
        if (!_jobs.TryGetValue(jobId, out var record))
        {
            return null;
        }

        lock (record.SyncRoot)
        {
            var json = JsonSerializer.Serialize(record.Progress);
            return JsonSerializer.Deserialize<AudioJobProgress>(json);
        }
    }

    private void Update(string jobId, Action<AudioJobProgress> mutate)
    {
        if (!_jobs.TryGetValue(jobId, out var record))
        {
            return;
        }

        lock (record.SyncRoot)
        {
            mutate(record.Progress);
        }
    }
}
