# Harness Loop Status Monitor
$ErrorActionPreference = "Stop"

$harnessCliPath = "D:\work\study\Kimi_Agent_OpenAI_Harness\harness-cli"
$projectPath = "D:\test\my-project"

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "       HARNESS LOOP - STATUS SNAPSHOT" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# 1. Check Checkpoint
$checkpointPath = "$harnessCliPath\.harness\checkpoint.json"
Write-Host "CHECKPOINT STATUS" -ForegroundColor Yellow
Write-Host "-----------------" -ForegroundColor Gray

if (Test-Path $checkpointPath) {
    $checkpoint = Get-Content $checkpointPath -Raw | ConvertFrom-Json
    $checkpointTime = (Get-Date -Date "1970-01-01").AddMilliseconds($checkpoint.timestamp).ToString("yyyy-MM-dd HH:mm:ss")
    
    Write-Host "Last Update:     $checkpointTime" -ForegroundColor White
    Write-Host "Current Task:    $($checkpoint.currentTask.title)" -ForegroundColor Cyan
    
    $statusColor = switch ($checkpoint.currentTask.status) {
        "running" { "Yellow" }
        "completed" { "Green" }
        "failed" { "Red" }
        default { "Gray" }
    }
    Write-Host "Task Status:     $($checkpoint.currentTask.status)" -ForegroundColor $statusColor
    Write-Host "Queue Pending:   $($checkpoint.queueState.queue.Count)" -ForegroundColor Yellow
    Write-Host "Queue Active:    $($checkpoint.queueState.activeTasks.Count)" -ForegroundColor Cyan
    Write-Host "Completed:       $($checkpoint.stats.completed)" -ForegroundColor Green
    Write-Host "Failed:          $($checkpoint.stats.failed)" -ForegroundColor Red
} else {
    Write-Host "No checkpoint found!" -ForegroundColor Red
}

Write-Host "`n"

# 2. Check Project Changes
Write-Host "PROJECT CHANGES" -ForegroundColor Yellow
Write-Host "---------------" -ForegroundColor Gray
Set-Location $projectPath

$gitStatus = git status --short 2>$null
$modified = ($gitStatus | Select-String "^ M").Count
$newFiles = ($gitStatus | Select-String "^??").Count
$added = ($gitStatus | Select-String "^A ").Count

Write-Host "Modified files:  $modified" -ForegroundColor Yellow
Write-Host "New files:       $newFiles" -ForegroundColor Green
Write-Host "Staged files:    $added" -ForegroundColor Cyan

# Count AI files
if (Test-Path "src/lib/ai") {
    $aiFiles = (Get-ChildItem -Recurse "src/lib/ai" -Filter "*.ts" -ErrorAction SilentlyContinue).Count
    Write-Host "AI module files: $aiFiles" -ForegroundColor Cyan
}

Write-Host "`n"

# 3. Recent Commits
Write-Host "RECENT COMMITS" -ForegroundColor Yellow
Write-Host "--------------" -ForegroundColor Gray
$commits = git log --oneline -5 2>$null
if ($commits) {
    $commits | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "  No commits yet" -ForegroundColor DarkGray
}

Write-Host "`n"

# 4. Recent Logs
Write-Host "RECENT LOGS (Last 5 lines)" -ForegroundColor Yellow
Write-Host "--------------------------" -ForegroundColor Gray
$logPath = "$harnessCliPath\logs\harness.log"
if (Test-Path $logPath) {
    $lines = Get-Content $logPath -Tail 5
    $lines | ForEach-Object { 
        $line = $_
        if ($line -match "error|❌") { Write-Host "  $line" -ForegroundColor Red }
        elseif ($line -match "success|✅|写入文件") { Write-Host "  $line" -ForegroundColor Green }
        elseif ($line -match "info|🚀|📋") { Write-Host "  $line" -ForegroundColor Cyan }
        else { Write-Host "  $line" -ForegroundColor Gray }
    }
} else {
    Write-Host "  No log file found" -ForegroundColor DarkGray
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "Run this script again to refresh status" -ForegroundColor DarkGray
Write-Host "================================================`n" -ForegroundColor Cyan
