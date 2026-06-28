using System.Collections.Concurrent;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.Json.Serialization;
using System.Windows.Forms;
using Microsoft.AspNetCore.Http.Json;
using SMGrayTools.AudioHelper;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://127.0.0.1:43127");
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
            {
                return false;
            }

            return uri.Host is "localhost" or "127.0.0.1";
        });
        policy.AllowAnyHeader();
        policy.AllowAnyMethod();
    });
});
builder.Services.Configure<JsonOptions>(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(System.Text.Json.JsonNamingPolicy.CamelCase));
});
builder.Services.AddSingleton<AudioJobStore>();

var app = builder.Build();
app.UseCors();
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.Headers.CacheControl = "no-store, no-cache, max-age=0";
        context.Response.Headers.Pragma = "no-cache";
        context.Response.Headers.Expires = "0";
    }

    await next();
});

app.MapGet("/api/health", () =>
{
    return Results.Ok(new AudioHelperHealth
    {
        AppName = "SMGrayTools Audio Helper",
        Ready = true,
        Version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "0.1.0",
    });
});

app.MapPost("/api/dialogs/audio-file", async () =>
{
    var path = await ShowAudioFileDialogAsync();
    return Results.Ok(new { path });
});

app.MapPost("/api/dialogs/output-folder", async () =>
{
    var path = await ShowOutputFolderDialogAsync();
    return Results.Ok(new { path });
});

app.MapPost("/api/jobs/detect", (DetectRequest request, AudioJobStore jobStore) =>
{
    if (string.IsNullOrWhiteSpace(request.AudioPath) || !File.Exists(request.AudioPath))
    {
        return Results.BadRequest("A valid audio file path is required.");
    }

    var (jobId, cancellationToken) = jobStore.CreateJob(AudioJobKind.Detect, "Queued for analysis");
    _ = Task.Run(() => RunDetectionJobAsync(jobStore, jobId, request, cancellationToken), cancellationToken);

    return Results.Ok(new { jobId });
});

app.MapPost("/api/jobs/split", (SplitRequest request, AudioJobStore jobStore) =>
{
    if (string.IsNullOrWhiteSpace(request.AudioPath) || !File.Exists(request.AudioPath))
    {
        return Results.BadRequest("A valid audio file path is required.");
    }

    if (string.IsNullOrWhiteSpace(request.OutputPath))
    {
        return Results.BadRequest("A valid output folder is required.");
    }

    if (request.Chapters.Count == 0)
    {
        return Results.BadRequest("At least one chapter is required before splitting.");
    }

    var (jobId, cancellationToken) = jobStore.CreateJob(AudioJobKind.Split, "Queued for split");
    _ = Task.Run(() => RunSplitJobAsync(jobStore, jobId, request, cancellationToken), cancellationToken);

    return Results.Ok(new { jobId });
});

app.MapGet("/api/jobs/{jobId}", (string jobId, AudioJobStore jobStore) =>
{
    var job = jobStore.GetJob(jobId);
    return job is null ? Results.NotFound() : Results.Ok(job);
});

app.MapPost("/api/jobs/{jobId}/cancel", (string jobId, AudioJobStore jobStore) =>
{
    var cancelled = jobStore.Cancel(jobId);
    return cancelled ? Results.Ok(new { cancelled = true }) : Results.NotFound();
});

app.Run();

static async Task RunDetectionJobAsync(
    AudioJobStore jobStore,
    string jobId,
    DetectRequest request,
    CancellationToken cancellationToken)
{
    try
    {
        var processor = new AudioProcessor(
            request.AudioPath,
            0.02f,
            TimeSpan.FromSeconds(request.SilenceDurationSeconds));

        if (request.SplitMethod == AudioSplitMethod.EmbeddedChapters)
        {
            jobStore.SetRunning(jobId, "Reading embedded chapters");
            jobStore.AppendLog(jobId, "Reading embedded chapters from audio file...");

            var panelLogs = new List<string>();
            var progress = new Progress<string>(message =>
            {
                panelLogs.Add(message);
                jobStore.AppendLog(jobId, message);
            });

            var chapters = await processor.DetectEmbeddedChapters(progress, cancellationToken);
            foreach (var line in BuildDetectedChapterLogLines(chapters))
            {
                panelLogs.Add(line);
                jobStore.AppendLog(jobId, line);
            }

            var comparisonResult = new AudioComparisonResult
            {
                ChapterCount = chapters.Count,
                Chapters = chapters.Select(ChapterPointDto.FromModel).ToList(),
                Label = "Embedded Chapters",
                LogLines = panelLogs,
                SilenceDurationSeconds = request.SilenceDurationSeconds,
            };

            jobStore.SetDetectionSummary(jobId, new AudioDetectionSummary
            {
                ActiveComparisonDurationSeconds = null,
                ComparisonResults = [comparisonResult],
                CompareAll = false,
                LastDetectionLabel = chapters.Count > 0
                    ? $"Last Detection: Embedded Chapters ({chapters.Count} chapters)"
                    : "Last Detection: No embedded chapters found",
                LogLines = panelLogs.ToList(),
            }, "Detection results ready");
            jobStore.SetCompleted(jobId, "Detection complete");
            return;
        }

        if (request.CompareAll)
        {
            jobStore.SetRunning(jobId, "Comparing silence durations");
            var generalLogs = new ConcurrentQueue<string>();
            generalLogs.Enqueue("Starting 2 / 3 / 4 second silence comparison...");

            var tasks = Enumerable.Range(2, 3).Select(async durationSeconds =>
            {
                var comparisonLogs = new List<string>
                {
                    $"Analyzing with {durationSeconds} second silence threshold..."
                };
                var comparisonProcessor = new AudioProcessor(
                    request.AudioPath,
                    0.02f,
                    TimeSpan.FromSeconds(durationSeconds));
                var progress = new Progress<string>(message =>
                {
                    comparisonLogs.Add(message);
                    jobStore.AppendLog(jobId, $"[{durationSeconds}s] {message}");
                });

                var chapters = await comparisonProcessor.DetectChapters(progress, cancellationToken);
                generalLogs.Enqueue($"Finished {durationSeconds}s comparison with {chapters.Count} chapter points.");

                return new AudioComparisonResult
                {
                    ChapterCount = chapters.Count,
                    Chapters = chapters.Select(ChapterPointDto.FromModel).ToList(),
                    Label = $"{durationSeconds} Second Silence",
                    LogLines = comparisonLogs,
                    SilenceDurationSeconds = durationSeconds,
                };
            });

            var comparisonResults = (await Task.WhenAll(tasks))
                .OrderBy(result => result.SilenceDurationSeconds)
                .ToList();

            foreach (var entry in generalLogs)
            {
                jobStore.AppendLog(jobId, entry);
            }

            jobStore.SetDetectionSummary(jobId, new AudioDetectionSummary
            {
                ActiveComparisonDurationSeconds = request.SilenceDurationSeconds,
                ComparisonResults = comparisonResults,
                CompareAll = true,
                LastDetectionLabel = "Last Detection: Silence comparison ready",
                LogLines = generalLogs.ToList(),
            }, "Comparison results ready");
            jobStore.SetCompleted(jobId, "Detection complete");
            return;
        }

        jobStore.SetRunning(jobId, "Analyzing audio for silence");
        var logLines = new List<string> { "Analyzing audio file for silence..." };
        var detectProgress = new Progress<string>(message =>
        {
            logLines.Add(message);
            jobStore.AppendLog(jobId, message);
        });

        var detectedChapters = await processor.DetectChapters(detectProgress, cancellationToken);
        logLines.Add($"Found {detectedChapters.Count} potential chapter points.");
        foreach (var line in BuildDetectedChapterLogLines(detectedChapters))
        {
            logLines.Add(line);
            jobStore.AppendLog(jobId, line);
        }

        jobStore.SetDetectionSummary(jobId, new AudioDetectionSummary
        {
            ActiveComparisonDurationSeconds = request.SilenceDurationSeconds,
            ComparisonResults =
            [
                new AudioComparisonResult
                {
                    ChapterCount = detectedChapters.Count,
                    Chapters = detectedChapters.Select(ChapterPointDto.FromModel).ToList(),
                    Label = $"{request.SilenceDurationSeconds} Second Silence",
                    LogLines = logLines,
                    SilenceDurationSeconds = request.SilenceDurationSeconds,
                }
            ],
            CompareAll = false,
            LastDetectionLabel = $"Last Detection: Silence-based ({detectedChapters.Count} chapters)",
            LogLines = logLines,
        }, "Detection results ready");
        jobStore.SetCompleted(jobId, "Detection complete");
    }
    catch (OperationCanceledException)
    {
        jobStore.SetCancelled(jobId);
    }
    catch (Exception exception)
    {
        jobStore.SetFailed(jobId, exception.Message);
    }
}

static async Task RunSplitJobAsync(
    AudioJobStore jobStore,
    string jobId,
    SplitRequest request,
    CancellationToken cancellationToken)
{
    try
    {
        jobStore.SetRunning(jobId, "Starting split");
        jobStore.AppendLog(jobId, "Starting audio split...");

        var processor = new AudioProcessor(request.AudioPath, 0.02f, TimeSpan.FromSeconds(4));
        var progress = new Progress<string>(message =>
        {
            jobStore.AppendLog(jobId, message);
        });

        var chapters = request.Chapters.Select(chapter => chapter.ToModel()).ToList();
        await processor.SplitAudio(chapters, request.OutputPath, progress, cancellationToken);

        var createdFiles = chapters
            .Select(chapter => $"{chapter.Name.Trim()}.mp3")
            .ToList();

        jobStore.SetSplitSummary(jobId, new AudioSplitSummary
        {
            CreatedFiles = createdFiles,
            OutputPath = request.OutputPath,
        }, "Split results ready");
        jobStore.AppendLog(jobId, "Split complete!");
        jobStore.SetCompleted(jobId, "Split complete");
    }
    catch (OperationCanceledException)
    {
        jobStore.SetCancelled(jobId);
    }
    catch (Exception exception)
    {
        jobStore.SetFailed(jobId, exception.Message);
    }
}

static Task<string?> ShowAudioFileDialogAsync()
{
    return RunStaDialogAsync(owner =>
    {
        const string dialogTitle = "Select Audio File";
        using var dialog = new OpenFileDialog
        {
            Filter = "Audio Files (*.m4b;*.mp3)|*.m4b;*.mp3|M4B files (*.m4b)|*.m4b|MP3 files (*.mp3)|*.mp3|All files (*.*)|*.*",
            Title = dialogTitle,
        };

        return ShowDialogInForeground(owner, dialogTitle, dialog.ShowDialog) == DialogResult.OK
            ? dialog.FileName
            : null;
    });
}

static Task<string?> ShowOutputFolderDialogAsync()
{
    return RunStaDialogAsync(owner =>
    {
        const string dialogTitle = "Select Output Folder";
        using var dialog = new FolderBrowserDialog
        {
            Description = dialogTitle,
            UseDescriptionForTitle = true,
        };

        return ShowDialogInForeground(owner, dialogTitle, dialog.ShowDialog) == DialogResult.OK
            ? dialog.SelectedPath
            : null;
    });
}

static Task<T?> RunStaDialogAsync<T>(Func<IWin32Window, T?> callback)
{
    var completion = new TaskCompletionSource<T?>(TaskCreationOptions.RunContinuationsAsynchronously);
    var thread = new Thread(() =>
    {
        try
        {
            using var owner = CreateDialogOwnerWindow();
            completion.SetResult(callback(owner));
        }
        catch (Exception exception)
        {
            completion.SetException(exception);
        }
    });

    thread.SetApartmentState(ApartmentState.STA);
    thread.Start();
    return completion.Task;
}

static Form CreateDialogOwnerWindow()
{
    var owner = new Form
    {
        FormBorderStyle = FormBorderStyle.FixedToolWindow,
        Opacity = 0.01,
        ShowInTaskbar = false,
        Size = new System.Drawing.Size(1, 1),
        StartPosition = FormStartPosition.CenterScreen,
        TopMost = true,
    };

    owner.Show();
    owner.Activate();
    NativeMethods.BringWindowToTop(owner.Handle);
    NativeMethods.SetForegroundWindow(owner.Handle);
    return owner;
}

static DialogResult ShowDialogInForeground(
    IWin32Window owner,
    string dialogTitle,
    Func<IWin32Window, DialogResult> showDialog)
{
    using var cancellationTokenSource = new CancellationTokenSource();
    var foregroundTask = Task.Run(async () =>
    {
        while (!cancellationTokenSource.Token.IsCancellationRequested)
        {
            var dialogHandle = NativeMethods.FindWindow(null, dialogTitle);
            if (dialogHandle != IntPtr.Zero)
            {
                NativeMethods.ShowWindow(dialogHandle, NativeMethods.SW_RESTORE);
                NativeMethods.SetWindowPos(
                    dialogHandle,
                    NativeMethods.HWND_TOPMOST,
                    0,
                    0,
                    0,
                    0,
                    NativeMethods.SWP_NOMOVE | NativeMethods.SWP_NOSIZE | NativeMethods.SWP_SHOWWINDOW);
                NativeMethods.BringWindowToTop(dialogHandle);
                NativeMethods.SetForegroundWindow(dialogHandle);
                NativeMethods.SetWindowPos(
                    dialogHandle,
                    NativeMethods.HWND_NOTOPMOST,
                    0,
                    0,
                    0,
                    0,
                    NativeMethods.SWP_NOMOVE | NativeMethods.SWP_NOSIZE | NativeMethods.SWP_SHOWWINDOW);
                break;
            }

            try
            {
                await Task.Delay(50, cancellationTokenSource.Token);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    });

    try
    {
        return showDialog(owner);
    }
    finally
    {
        cancellationTokenSource.Cancel();
        try
        {
            foregroundTask.Wait(250);
        }
        catch
        {
            // Best-effort foregrounding only. The dialog itself is already open.
        }
    }
}

static List<string> BuildDetectedChapterLogLines(List<ChapterPoint> chapters)
{
    if (chapters.Count == 0)
    {
        return ["No chapters were detected."];
    }

    var lines = new List<string>
    {
        $"Detected {chapters.Count} chapters:"
    };

    lines.AddRange(chapters.Select(chapter =>
        $"{chapter.Name} | Start {chapter.Start:hh\\:mm\\:ss} | Duration {chapter.Duration:hh\\:mm\\:ss}"));

    return lines;
}

static class NativeMethods
{
    internal static readonly IntPtr HWND_NOTOPMOST = new(-2);
    internal static readonly IntPtr HWND_TOPMOST = new(-1);
    internal const uint SWP_NOMOVE = 0x0002;
    internal const uint SWP_NOSIZE = 0x0001;
    internal const uint SWP_SHOWWINDOW = 0x0040;
    internal const int SW_RESTORE = 9;

    [DllImport("user32.dll")]
    internal static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    internal static extern IntPtr FindWindow(string? lpClassName, string lpWindowName);

    [DllImport("user32.dll")]
    internal static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    internal static extern bool SetWindowPos(
        IntPtr hWnd,
        IntPtr hWndInsertAfter,
        int X,
        int Y,
        int cx,
        int cy,
        uint uFlags);

    [DllImport("user32.dll")]
    internal static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
