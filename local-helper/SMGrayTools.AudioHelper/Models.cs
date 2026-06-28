namespace SMGrayTools.AudioHelper;

public enum AudioSplitMethod
{
    Silence,
    EmbeddedChapters,
}

public enum AudioJobKind
{
    Detect,
    Split,
}

public enum AudioJobStatus
{
    Queued,
    Running,
    Completed,
    Failed,
    Cancelled,
}

public sealed class DetectRequest
{
    public required string AudioPath { get; init; }
    public bool CompareAll { get; init; }
    public int SilenceDurationSeconds { get; init; }
    public AudioSplitMethod SplitMethod { get; init; }
}

public sealed class SplitRequest
{
    public required string AudioPath { get; init; }
    public required List<ChapterPointDto> Chapters { get; init; }
    public required string OutputPath { get; init; }
}

public sealed class AudioHelperHealth
{
    public required string AppName { get; init; }
    public bool Ready { get; init; }
    public required string Version { get; init; }
}

public sealed class ChapterPointDto
{
    public double DurationSeconds { get; init; }
    public required string Name { get; init; }
    public double StartSeconds { get; init; }

    public static ChapterPointDto FromModel(ChapterPoint chapter)
    {
        return new ChapterPointDto
        {
            DurationSeconds = chapter.Duration.TotalSeconds,
            Name = chapter.Name,
            StartSeconds = chapter.Start.TotalSeconds,
        };
    }

    public ChapterPoint ToModel()
    {
        return new ChapterPoint
        {
            Duration = TimeSpan.FromSeconds(DurationSeconds),
            Name = Name,
            Start = TimeSpan.FromSeconds(StartSeconds),
        };
    }
}

public sealed class AudioComparisonResult
{
    public int ChapterCount { get; set; }
    public required List<ChapterPointDto> Chapters { get; set; }
    public required string Label { get; set; }
    public required List<string> LogLines { get; set; }
    public int SilenceDurationSeconds { get; set; }
}

public sealed class AudioDetectionSummary
{
    public int? ActiveComparisonDurationSeconds { get; set; }
    public required List<AudioComparisonResult> ComparisonResults { get; set; }
    public bool CompareAll { get; set; }
    public required string LastDetectionLabel { get; set; }
    public required List<string> LogLines { get; set; }
}

public sealed class AudioSplitSummary
{
    public required List<string> CreatedFiles { get; set; }
    public required string OutputPath { get; set; }
}

public sealed class AudioJobProgress
{
    public bool CanCancel { get; set; }
    public AudioDetectionSummary? DetectionSummary { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset? FinishedAt { get; set; }
    public required string Id { get; set; }
    public AudioJobKind Kind { get; set; }
    public required List<string> LogLines { get; set; }
    public AudioSplitSummary? SplitSummary { get; set; }
    public required string StageLabel { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public AudioJobStatus Status { get; set; }
}
