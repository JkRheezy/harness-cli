# Harness Loop Monitor
# 实时监控工作流状态

param(
    [int]$RefreshSeconds = 5,
    [int]$MaxIterations = 100
)

# 设置 UTF-8 编码，避免乱码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$harnessCliPath = "D:\work\study\Kimi_Agent_OpenAI_Harness\harness-cli"
$projectPath = "D:\test\my-project"

function Clear-Screen {
    # Clear screen properly in different environments
    if ($Host.Name -eq "ConsoleHost") {
        Clear-Host
    } else {
        # For remote/SSH sessions
        Write-Host ("`n" * 50)
    }
}

function Get-LoopStatus {
    $status = @{}
    
    # Read checkpoint
    $checkpointPath = "$harnessCliPath\.harness\checkpoint.json"
    if (Test-Path $checkpointPath) {
        try {
            $checkpoint = Get-Content $checkpointPath -Raw | ConvertFrom-Json
            $status.CheckpointTime = (Get-Date -Date "1970-01-01").AddMilliseconds($checkpoint.timestamp).ToString("HH:mm:ss")
            $status.CurrentTask = $checkpoint.currentTask.title
            $status.TaskStatus = $checkpoint.currentTask.status
            $status.Completed = $checkpoint.stats.completed
            $status.Failed = $checkpoint.stats.failed
            $status.Pending = $checkpoint.queueState.queue.Count
            $status.Active = $checkpoint.queueState.activeTasks.Count
        } catch {
            $status.Error = "Failed to read checkpoint"
        }
    } else {
        $status.Error = "No checkpoint found"
    }
    
    return $status
}

function Get-ProjectChanges {
    $changes = @{}
    
    # Get git status
    Set-Location $projectPath
    $gitStatus = git status --short 2>$null
    $changes.Modified = ($gitStatus | Select-String "^ M").Count
    $changes.New = ($gitStatus | Select-String "^??").Count
    $changes.Added = ($gitStatus | Select-String "^A ").Count
    
    # Count files in key directories
    if (Test-Path "src/lib/ai") {
        $changes.AIFiles = (Get-ChildItem -Recurse "src/lib/ai" -Filter "*.ts" -ErrorAction SilentlyContinue).Count
    }
    
    # Get recent commits
    $changes.RecentCommits = git log --oneline -5 2>$null
    
    return $changes
}

function Get-LogTail {
    $logPath = "$harnessCliPath\logs\harness.log"
    if (Test-Path $logPath) {
        $lines = Get-Content $logPath -Tail 10
        return $lines | ForEach-Object {
            # Colorize log levels
            $line = $_
            if ($line -match "error|\[ERR\]|failed") {
                return "[RED]$line[RESET]"
            } elseif ($line -match "warn|\[WARN\]") {
                return "[YELLOW]$line[RESET]"
            } elseif ($line -match "success|\[OK\]|completed") {
                return "[GREEN]$line[RESET]"
            } elseif ($line -match "info|\[INFO\]|\[PLAN\]|\[AI\]") {
                return "[CYAN]$line[RESET]"
            }
            return $line
        }
    }
    return @("No log file found")
}

function Show-Dashboard {
    $status = Get-LoopStatus
    $changes = Get-ProjectChanges
    $logs = Get-LogTail
    
    Clear-Screen
    
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "           HARNESS LOOP - REAL-TIME MONITOR                 " -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Task Status Section
    Write-Host "TASK STATUS" -ForegroundColor Yellow
    Write-Host "------------------------------------------------------------" -ForegroundColor Gray
    if ($status.Error) {
        Write-Host "   Status: $($status.Error)" -ForegroundColor Red
    } else {
        Write-Host "   Current Task:  $($status.CurrentTask)" -ForegroundColor White
        
        $taskColor = switch ($status.TaskStatus) {
            "running" { "Yellow" }
            "completed" { "Green" }
            "failed" { "Red" }
            default { "Gray" }
        }
        Write-Host "   Task Status:   $($status.TaskStatus)" -ForegroundColor $taskColor
        Write-Host "   Checkpoint:    $($status.CheckpointTime)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   [OK] Completed:  $($status.Completed)" -ForegroundColor Green
        Write-Host "   [ERR] Failed:     $($status.Failed)" -ForegroundColor Red
        Write-Host "   [WAIT] Pending:    $($status.Pending)" -ForegroundColor Yellow
        Write-Host "   [LOOP] Active:     $($status.Active)" -ForegroundColor Cyan
    }
    Write-Host ""
    
    # Project Changes Section
    Write-Host "PROJECT CHANGES (Target: $projectPath)" -ForegroundColor Yellow
    Write-Host "------------------------------------------------------------" -ForegroundColor Gray
    Write-Host "   [EDIT] Modified:   $($changes.Modified)" -ForegroundColor Yellow
    Write-Host "   [NEW] New Files:  $($changes.New)" -ForegroundColor Green
    Write-Host "   [AI] AI Files:   $($changes.AIFiles)" -ForegroundColor Cyan
    Write-Host ""
    
    # Recent commits
    if ($changes.RecentCommits) {
        Write-Host "   Recent Commits:" -ForegroundColor Gray
        $changes.RecentCommits | ForEach-Object { 
            Write-Host "      $_" -ForegroundColor DarkGray
        }
    }
    Write-Host ""
    
    # Recent Logs Section
    Write-Host "RECENT LOGS (Last 10 lines)" -ForegroundColor Yellow
    Write-Host "------------------------------------------------------------" -ForegroundColor Gray
    $logs | ForEach-Object {
        $line = $_ -replace "\[RED\]", "" -replace "\[YELLOW\]", "" -replace "\[GREEN\]", "" -replace "\[CYAN\]", "" -replace "\[RESET\]", ""
        
        if ($_ -match "\[RED\]") {
            Write-Host "   $line" -ForegroundColor Red
        } elseif ($_ -match "\[YELLOW\]") {
            Write-Host "   $line" -ForegroundColor Yellow
        } elseif ($_ -match "\[GREEN\]") {
            Write-Host "   $line" -ForegroundColor Green
        } elseif ($_ -match "\[CYAN\]") {
            Write-Host "   $line" -ForegroundColor Cyan
        } else {
            Write-Host "   $line" -ForegroundColor Gray
        }
    }
    Write-Host ""
    
    # Footer
    Write-Host "------------------------------------------------------------" -ForegroundColor Gray
    Write-Host "Refresh: ${RefreshSeconds}s | Press Ctrl+C to exit" -ForegroundColor DarkGray
    Write-Host ""
}

# Main loop
Write-Host "Starting Harness Loop Monitor..." -ForegroundColor Green
Write-Host "   Harness CLI: $harnessCliPath" -ForegroundColor Gray
Write-Host "   Project:     $projectPath" -ForegroundColor Gray
Write-Host "   Refresh:     ${RefreshSeconds}s" -ForegroundColor Gray
Write-Host ""
Start-Sleep -Seconds 2

$iteration = 0
while ($iteration -lt $MaxIterations) {
    Show-Dashboard
    Start-Sleep -Seconds $RefreshSeconds
    $iteration++
}

Write-Host "Monitor stopped after $MaxIterations iterations" -ForegroundColor Yellow
