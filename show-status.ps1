#Requires -Version 5.1
param()

# Set UTF-8 encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$harnessPath = "$PSScriptRoot"
$checkpointPath = "$harnessPath/.harness/checkpoint.json"
$logPath = "$harnessPath/logs/harness.log"

function Get-ElapsedTime {
    param([string]$startTime)
    try {
        $start = [datetime]::Parse($startTime)
        $elapsed = [datetime]::UtcNow - $start
        return "{0:D2}h {1:D2}m {2:D2}s" -f $elapsed.Hours, $elapsed.Minutes, $elapsed.Seconds
    } catch { return "N/A" }
}

# Header
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "              HARNESS LOOP CURRENT STATUS                    " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Read checkpoint
$checkpoint = $null
if (Test-Path $checkpointPath) {
    try { 
        $content = Get-Content $checkpointPath -Raw -Encoding UTF8
        $checkpoint = $content | ConvertFrom-Json -ErrorAction SilentlyContinue 
    } catch {
        Write-Host "Error reading checkpoint: $_" -ForegroundColor Red
    }
}

# Current Task
Write-Host "[CURRENT TASK]" -ForegroundColor Yellow
if ($checkpoint -and $checkpoint.currentTask) {
    $task = $checkpoint.currentTask
    $elapsed = Get-ElapsedTime $task.startedAt
    
    $statusColor = 'Gray'
    if ($task.status -eq 'running') { $statusColor = 'Cyan' }
    elseif ($task.status -eq 'completed') { $statusColor = 'Green' }
    elseif ($task.status -eq 'failed') { $statusColor = 'Red' }
    elseif ($task.status -eq 'pending') { $statusColor = 'Yellow' }
    
    Write-Host "  Task ID:   $($task.id)" -ForegroundColor White
    Write-Host "  Title:     $($task.title)" -ForegroundColor White
    Write-Host "  Status:    $($task.status)" -ForegroundColor $statusColor
    Write-Host "  Runtime:   $elapsed" -ForegroundColor White
    Write-Host "  Started:   $($task.startedAt)" -ForegroundColor Gray
} else {
    Write-Host "  No active task" -ForegroundColor Yellow
}
Write-Host ""

# Statistics
Write-Host "[STATISTICS]" -ForegroundColor Yellow
if ($checkpoint -and $checkpoint.stats) {
    $s = $checkpoint.stats
    Write-Host "  Completed: $($s.completed)  Failed: $($s.failed)  Escalated: $($s.escalated)"
} else {
    Write-Host "  No statistics available" -ForegroundColor Gray
}
Write-Host ""

# Queue Status
Write-Host "[QUEUE STATUS]" -ForegroundColor Yellow
if ($checkpoint -and $checkpoint.queueState) {
    $activeCount = ($checkpoint.queueState.activeTasks | Measure-Object).Count
    $queueCount = ($checkpoint.queueState.queue | Measure-Object).Count
    Write-Host "  Active tasks: $activeCount" -ForegroundColor White
    Write-Host "  Pending tasks: $queueCount" -ForegroundColor White
} else {
    Write-Host "  Queue information not available" -ForegroundColor Gray
}
Write-Host ""

# Git Status
Write-Host "[GIT STATUS]" -ForegroundColor Yellow
try {
    $gitOutput = git -C $harnessPath status --short 2>$null
    $gitCount = ($gitOutput | Measure-Object).Count
    
    $gitColor = 'Green'
    if ($gitCount -gt 100) { $gitColor = 'Red' }
    elseif ($gitCount -gt 0) { $gitColor = 'Yellow' }
    
    Write-Host "  Uncommitted changes: $gitCount files" -ForegroundColor $gitColor
    
    $lastCommit = git -C $harnessPath log -1 --oneline 2>$null
    if ($lastCommit) {
        Write-Host "  Last commit: $lastCommit" -ForegroundColor Gray
    }
} catch {
    Write-Host "  Unable to get Git status" -ForegroundColor Yellow
}
Write-Host ""

# Recent Activity
Write-Host "[RECENT ACTIVITY - Last 8 lines]" -ForegroundColor Yellow
if (Test-Path $logPath) {
    try {
        $logs = Get-Content $logPath -Tail 8 -ErrorAction SilentlyContinue -Encoding UTF8
        $logs | ForEach-Object {
            $displayLine = $_
            if ($displayLine.Length -gt 70) {
                $displayLine = $displayLine.Substring($displayLine.Length - 70)
            }
            
            $color = 'Gray'
            if ($_ -match "ERROR|error|fail|Fail|failed|Stop") { $color = 'Red' }
            elseif ($_ -match "WARN|warn|warning") { $color = 'Yellow' }
            elseif ($_ -match "OK|success|completed|done|passed|Bootstrap completed") { $color = 'Green' }
            elseif ($_ -match "PLAN|EXEC|start|Running|Calling LLM|generating|Creating|Executing") { $color = 'Cyan' }
            
            Write-Host "  $displayLine" -ForegroundColor $color
        }
    } catch {
        Write-Host "  Error reading logs: $_" -ForegroundColor Red
    }
} else {
    Write-Host "  Log file not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
