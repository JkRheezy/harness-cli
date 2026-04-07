#Requires -Version 5.1
param([int]$RefreshSeconds = 5)

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
        return "{0:D2}:{1:D2}:{2:D2}" -f $elapsed.Hours, $elapsed.Minutes, $elapsed.Seconds
    } catch { return "N/A" }
}

function Show-StatusPanel {
    Clear-Host
    
    # Header
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "                  HARNESS LOOP STATUS MONITOR                   " -ForegroundColor Cyan
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Read checkpoint
    $checkpoint = $null
    if (Test-Path $checkpointPath) {
        try { 
            $content = Get-Content $checkpointPath -Raw -Encoding UTF8
            $checkpoint = $content | ConvertFrom-Json -ErrorAction SilentlyContinue 
        } catch {}
    }
    
    # Current Task Section
    Write-Host "+---------------------- CURRENT TASK -------------------------+" -ForegroundColor White
    if ($checkpoint -and $checkpoint.currentTask) {
        $task = $checkpoint.currentTask
        $elapsed = Get-ElapsedTime $task.startedAt
        
        $statusColor = 'Gray'
        if ($task.status -eq 'running') { $statusColor = 'Cyan' }
        elseif ($task.status -eq 'completed') { $statusColor = 'Green' }
        elseif ($task.status -eq 'failed') { $statusColor = 'Red' }
        elseif ($task.status -eq 'pending') { $statusColor = 'Yellow' }
        
        Write-Host "| Task ID:  " -NoNewline -ForegroundColor Gray
        Write-Host "$($task.id)" -ForegroundColor White
        Write-Host "| Title:    " -NoNewline -ForegroundColor Gray
        Write-Host "$($task.title)" -ForegroundColor Yellow
        Write-Host "| Status:   " -NoNewline -ForegroundColor Gray
        Write-Host "$($task.status)" -ForegroundColor $statusColor
        Write-Host "| Runtime:  " -NoNewline -ForegroundColor Gray
        Write-Host "$elapsed" -ForegroundColor White
        Write-Host "| Started:  " -NoNewline -ForegroundColor Gray
        Write-Host "$($task.startedAt)" -ForegroundColor DarkGray
    } else {
        Write-Host "| No current task information available" -ForegroundColor Yellow
    }
    Write-Host "+-------------------------------------------------------------+" -ForegroundColor White
    Write-Host ""
    
    # Stats Section
    Write-Host "+---------------------- STATISTICS ---------------------------+" -ForegroundColor White
    if ($checkpoint -and $checkpoint.stats) {
        $s = $checkpoint.stats
        Write-Host "|  Completed: " -NoNewline -ForegroundColor Gray
        Write-Host "$($s.completed)" -NoNewline -ForegroundColor Green
        Write-Host "  Failed: " -NoNewline -ForegroundColor Gray
        Write-Host "$($s.failed)" -NoNewline -ForegroundColor Red
        Write-Host "  Escalated: " -NoNewline -ForegroundColor Gray
        Write-Host "$($s.escalated)" -ForegroundColor Yellow
    } else {
        Write-Host "| No statistics available" -ForegroundColor Gray
    }
    Write-Host "+-------------------------------------------------------------+" -ForegroundColor White
    Write-Host ""
    
    # Recent Logs Section
    Write-Host "+---------------------- RECENT LOGS --------------------------+" -ForegroundColor White
    if (Test-Path $logPath) {
        try {
            $logs = Get-Content $logPath -Tail 15 -ErrorAction SilentlyContinue -Encoding UTF8
            $logs | ForEach-Object {
                $line = $_.Substring([Math]::Max(0, $_.Length - 65))
                $color = 'Gray'
                if ($_ -match "ERROR|error|fail|Fail|Stop|failed") { $color = 'Red' }
                elseif ($_ -match "WARN|warn|warning") { $color = 'Yellow' }
                elseif ($_ -match "OK|success|completed|done|passed") { $color = 'Green' }
                elseif ($_ -match "PLAN|EXEC|start|Running|Calling LLM|generating|Creating") { $color = 'Cyan' }
                Write-Host "| $line" -ForegroundColor $color
            }
        } catch {
            Write-Host "| Error reading logs" -ForegroundColor Red
        }
    } else {
        Write-Host "| Log file not found" -ForegroundColor Yellow
    }
    Write-Host "+-------------------------------------------------------------+" -ForegroundColor White
    Write-Host ""
    
    # Git Status
    Write-Host "+---------------------- GIT STATUS ---------------------------+" -ForegroundColor White
    try {
        $gitOutput = git -C $harnessPath status --short 2>$null
        $gitCount = ($gitOutput | Measure-Object).Count
        $gitColor = 'Green'
        if ($gitCount -gt 100) { $gitColor = 'Red' }
        elseif ($gitCount -gt 0) { $gitColor = 'Yellow' }
        
        Write-Host "| Uncommitted changes: " -NoNewline -ForegroundColor Gray
        Write-Host "$gitCount files" -ForegroundColor $gitColor
        
        $lastCommit = git -C $harnessPath log -1 --oneline 2>$null
        if ($lastCommit) {
            Write-Host "| Last commit: " -NoNewline -ForegroundColor Gray
            Write-Host "$lastCommit" -ForegroundColor DarkGray
        }
    } catch {
        Write-Host "| Unable to get Git status" -ForegroundColor Yellow
    }
    Write-Host "+-------------------------------------------------------------+" -ForegroundColor White
    Write-Host ""
    
    # Footer
    $now = Get-Date -Format "HH:mm:ss"
    Write-Host "Last update: $now | Press Ctrl+C to stop monitoring" -ForegroundColor DarkGray
    Write-Host ""
}

# Main loop
while ($true) {
    Show-StatusPanel
    Start-Sleep -Seconds $RefreshSeconds
}
