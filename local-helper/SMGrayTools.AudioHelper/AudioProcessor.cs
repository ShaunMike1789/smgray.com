using NAudio.Wave;
using System.Diagnostics;
using TagLib;
using File = System.IO.File;
using TagFile = TagLib.File;

namespace SMGrayTools.AudioHelper;

public sealed class ChapterPoint
{
    public TimeSpan Duration { get; set; }
    public required string Name { get; set; }
    public TimeSpan Start { get; set; }

    public override string ToString()
    {
        return $"{Name} - Start: {Start:hh\\:mm\\:ss}, Duration: {Duration:hh\\:mm\\:ss}";
    }
}

public sealed class AudioProcessor
{
    private const int HighQualityBitrate = 320;
    private readonly TimeSpan _minChapterDuration;
    private readonly TimeSpan _minSilenceDuration;
    private readonly float _silenceThreshold;
    private readonly string _sourcePath;

    public AudioProcessor(string sourcePath, float silenceThreshold, TimeSpan minSilenceDuration)
    {
        _sourcePath = sourcePath;
        _silenceThreshold = silenceThreshold;
        _minSilenceDuration = minSilenceDuration;
        _minChapterDuration = TimeSpan.FromSeconds(30);
    }

    public async Task<List<ChapterPoint>> DetectEmbeddedChapters(IProgress<string>? progress, CancellationToken cancellationToken)
    {
        return await Task.Run(async () =>
        {
            var chapters = new List<ChapterPoint>();
            try
            {
                var ffprobePath = FindFFprobe();
                if (string.IsNullOrEmpty(ffprobePath))
                {
                    progress?.Report("ffprobe not found. Please ensure FFmpeg is installed or ffprobe.exe is next to the helper.");
                    return chapters;
                }

                if (Path.GetExtension(_sourcePath).ToLowerInvariant() == ".m4b")
                {
                    progress?.Report("Reading M4B chapters using ffprobe...");
                    chapters = await DetectM4BChapters(ffprobePath, progress, cancellationToken);
                }

                if (chapters.Count == 0)
                {
                    progress?.Report("Checking for ID3v2 chapters...");
                    using var file = TagFile.Create(_sourcePath);
                    if (file.Tag != null)
                    {
                        progress?.Report("No standard embedded chapter format was detected.");
                    }
                }
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception exception)
            {
                progress?.Report($"Error reading chapters: {exception.Message}");
                throw;
            }

            if (chapters.Count == 0)
            {
                progress?.Report("No embedded chapters found. Try using silence detection instead.");
            }

            return chapters;
        }, cancellationToken);
    }

    public async Task<List<ChapterPoint>> DetectChapters(IProgress<string>? progress, CancellationToken cancellationToken)
    {
        var chapters = new List<ChapterPoint>();

        await Task.Run(() =>
        {
            using var reader = new MediaFoundationReader(_sourcePath);
            var format = reader.WaveFormat;
            var buffer = new byte[format.AverageBytesPerSecond];
            var currentPosition = TimeSpan.Zero;
            var silenceStarted = TimeSpan.Zero;
            var lastChapterStart = TimeSpan.Zero;
            var inSilence = false;
            int bytesRead;

            while ((bytesRead = reader.Read(buffer, 0, buffer.Length)) > 0)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var isCurrentlySilent = IsSilent(buffer, bytesRead);

                if (isCurrentlySilent && !inSilence)
                {
                    silenceStarted = currentPosition;
                    inSilence = true;
                }
                else if (!isCurrentlySilent && inSilence)
                {
                    var silenceDuration = currentPosition - silenceStarted;
                    if (silenceDuration >= _minSilenceDuration)
                    {
                        var chapterDuration = silenceStarted - lastChapterStart;
                        if (chapterDuration >= _minChapterDuration)
                        {
                            var chapter = new ChapterPoint
                            {
                                Duration = chapterDuration,
                                Name = StandardizeChapterName(null, chapters.Count + 1),
                                Start = lastChapterStart,
                            };

                            chapters.Add(chapter);
                            lastChapterStart = currentPosition;
                            progress?.Report($"Detected chapter point at {silenceStarted:hh\\:mm\\:ss}");
                        }
                    }

                    inSilence = false;
                }

                currentPosition += TimeSpan.FromSeconds((double)bytesRead / format.AverageBytesPerSecond);
            }

            var finalDuration = currentPosition - lastChapterStart;
            if (finalDuration >= _minChapterDuration)
            {
                chapters.Add(new ChapterPoint
                {
                    Duration = finalDuration,
                    Name = StandardizeChapterName(null, chapters.Count + 1),
                    Start = lastChapterStart,
                });
            }
        }, cancellationToken);

        return chapters;
    }

    public async Task SplitAudio(List<ChapterPoint> chapters, string outputPath, IProgress<string>? progress, CancellationToken cancellationToken)
    {
        await Task.Run(() =>
        {
            Directory.CreateDirectory(outputPath);

            foreach (var chapter in chapters)
            {
                cancellationToken.ThrowIfCancellationRequested();

                using var reader = new MediaFoundationReader(_sourcePath);
                var outputFile = Path.Combine(outputPath, $"{chapter.Name.Trim()}.mp3");
                progress?.Report($"Creating {chapter.Name}...");

                using (var writer = new NAudio.Lame.LameMP3FileWriter(outputFile, reader.WaveFormat, HighQualityBitrate))
                {
                    reader.CurrentTime = chapter.Start;

                    var buffer = new byte[reader.WaveFormat.AverageBytesPerSecond];
                    var remainingTime = chapter.Duration;

                    while (remainingTime > TimeSpan.Zero)
                    {
                        cancellationToken.ThrowIfCancellationRequested();

                        var bytesToRead = (int)Math.Min(
                            buffer.Length,
                            remainingTime.TotalSeconds * reader.WaveFormat.AverageBytesPerSecond);
                        var bytesRead = reader.Read(buffer, 0, bytesToRead);
                        if (bytesRead == 0)
                        {
                            break;
                        }

                        writer.Write(buffer, 0, bytesRead);
                        remainingTime -= TimeSpan.FromSeconds((double)bytesRead / reader.WaveFormat.AverageBytesPerSecond);
                    }
                }

                try
                {
                    using var tagFile = TagFile.Create(outputFile);
                    tagFile.Tag.Title = chapter.Name;
                    tagFile.Save();
                }
                catch (Exception exception)
                {
                    progress?.Report($"Warning: Could not set metadata for {chapter.Name}: {exception.Message}");
                }
            }
        }, cancellationToken);
    }

    private async Task<List<ChapterPoint>> DetectM4BChapters(string ffprobePath, IProgress<string>? progress, CancellationToken cancellationToken)
    {
        var chapters = new List<ChapterPoint>();
        var processStartInfo = new ProcessStartInfo
        {
            Arguments = $"-i \"{_sourcePath}\" -print_format json -show_chapters -loglevel error",
            CreateNoWindow = true,
            FileName = ffprobePath,
            RedirectStandardError = true,
            RedirectStandardOutput = true,
            UseShellExecute = false,
        };

        using var process = new Process { StartInfo = processStartInfo };
        process.Start();
        var outputTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var errorTask = process.StandardError.ReadToEndAsync(cancellationToken);
        await process.WaitForExitAsync(cancellationToken);

        var output = await outputTask;
        _ = await errorTask;

        if (string.IsNullOrWhiteSpace(output))
        {
            return chapters;
        }

        try
        {
            using var jsonDocument = System.Text.Json.JsonDocument.Parse(output);
            if (!jsonDocument.RootElement.TryGetProperty("chapters", out var chaptersElement))
            {
                return chapters;
            }

            foreach (var chapter in chaptersElement.EnumerateArray())
            {
                cancellationToken.ThrowIfCancellationRequested();

                var tags = chapter.TryGetProperty("tags", out var tagsElement)
                    ? tagsElement
                    : default;
                var title = tags.ValueKind != System.Text.Json.JsonValueKind.Undefined &&
                            tags.TryGetProperty("title", out var titleElement)
                    ? titleElement.GetString()
                    : null;

                var startTime = ParseFFmpegTime(chapter.GetProperty("start_time").GetString());
                var endTime = ParseFFmpegTime(chapter.GetProperty("end_time").GetString());

                chapters.Add(new ChapterPoint
                {
                    Duration = endTime - startTime,
                    Name = StandardizeChapterName(title, chapters.Count + 1),
                    Start = startTime,
                });
            }
        }
        catch (Exception exception)
        {
            progress?.Report($"Error parsing ffprobe output: {exception.Message}");
        }

        return chapters;
    }

    private string? FindFFprobe()
    {
        var localPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ffprobe.exe");
        if (File.Exists(localPath))
        {
            return localPath;
        }

        var paths = Environment.GetEnvironmentVariable("PATH")?.Split(Path.PathSeparator);
        if (paths == null)
        {
            return null;
        }

        foreach (var path in paths)
        {
            var fullPath = Path.Combine(path, "ffprobe.exe");
            if (File.Exists(fullPath))
            {
                return fullPath;
            }
        }

        return null;
    }

    private bool IsSilent(byte[] buffer, int bytesRead)
    {
        float maxAmplitude = 0;

        for (var index = 0; index < bytesRead - 1; index += 2)
        {
            var sample = Math.Abs(BitConverter.ToInt16(buffer, index) / 32768f);
            maxAmplitude = Math.Max(maxAmplitude, sample);
        }

        return maxAmplitude < _silenceThreshold;
    }

    private static TimeSpan ParseFFmpegTime(string? timeValue)
    {
        return double.TryParse(timeValue, out var seconds)
            ? TimeSpan.FromSeconds(seconds)
            : TimeSpan.Zero;
    }

    private static string StandardizeChapterName(string? originalName, int fallbackNumber)
    {
        if (string.IsNullOrWhiteSpace(originalName))
        {
            return $"Chapter {fallbackNumber:000}";
        }

        var nextName = originalName.Trim();
        var dashIndex = nextName.IndexOf(" - ", StringComparison.Ordinal);
        if (dashIndex > 0)
        {
            var potentialTimestamp = nextName[(dashIndex + 3)..];
            if (potentialTimestamp.Contains(':'))
            {
                nextName = nextName[..dashIndex].Trim();
            }
        }

        if (nextName.StartsWith("Chapter ", StringComparison.OrdinalIgnoreCase))
        {
            var numberPart = nextName[8..].Trim();
            var spaceIndex = numberPart.IndexOf(' ');
            if (spaceIndex > 0)
            {
                numberPart = numberPart[..spaceIndex];
            }

            if (int.TryParse(numberPart, out var chapterNumber))
            {
                return $"Chapter {chapterNumber:000}";
            }
        }

        var sanitized = nextName;
        foreach (var invalidCharacter in Path.GetInvalidFileNameChars())
        {
            sanitized = sanitized.Replace(invalidCharacter, '-');
        }

        return sanitized;
    }
}
