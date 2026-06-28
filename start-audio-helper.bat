@echo off
setlocal

cd /d "%~dp0"

echo Starting SM Gray Audio Helper...
echo.
echo This window needs to stay open while you use Audio Splitter.
echo.

dotnet run --project local-helper\SMGrayTools.AudioHelper\SMGrayTools.AudioHelper.csproj

if errorlevel 1 (
  echo.
  echo Audio helper failed to start.
  echo Make sure the .NET SDK is installed, then try again.
  pause
)
