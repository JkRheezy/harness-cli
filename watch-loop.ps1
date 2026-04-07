# Harness Loop Watcher
# 实时滚动监控 Loop 进度

param(
    [int]$TailLines = 30,
    [switch]$Highlight
)

$logPath = "$PSScriptRoot\logs\harness.log"

# 颜色映射函数
function Write-ColoredLine($line) {
    if ($line -match "error|ERROR|\[ERR\]|\[STOP\]|") {
        Write-Host $line -ForegroundColor Red
    } elseif ($line -match "warn|WARN|\[WARN\]") {
        Write-Host $line -ForegroundColor Yellow
    } elseif ($line -match "success|SUCCESS|\[OK\]|completed|Writing file") {
        Write-Host $line -ForegroundColor Green
    } elseif ($line -match "info|INFO|\[INFO\]|Calling LLM") {
        Write-Host $line -ForegroundColor Cyan
    } elseif ($line -match "Executing plan|steps|Sending|Response received") {
        Write-Host $line -ForegroundColor White
    } else {
        Write-Host $line -ForegroundColor Gray
    }
}

# 清屏函数
function Clear-ScreenSafe {
    if ($Host.Name -eq "ConsoleHost") {
        Clear-Host
    }
}

# 显示头部
function Show-Header {
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "       HARNESS LOOP - LIVE LOG WATCHER         " -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Controls:" -ForegroundColor Yellow
    Write-Host "  Ctrl+C : Stop watching" -ForegroundColor Gray
    Write-Host "  Ctrl+S : Pause/Resume" -ForegroundColor Gray
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
}

# 显示最近的日志
function Show-RecentLogs($lines) {
    if (Test-Path $logPath) {
        $recent = Get-Content $logPath -Tail $lines
        foreach ($line in $recent) {
            if ($Highlight) {
                Write-ColoredLine $line
            } else {
                Write-Host $line
            }
        }
    }
}

# 主程序
Clear-ScreenSafe
Show-Header
Show-RecentLogs $TailLines

Write-Host ""
Write-Host "--- Waiting for new logs (Ctrl+C to stop) ---" -ForegroundColor DarkGray
Write-Host ""

if (Test-Path $logPath) {
    try {
        Get-Content $logPath -Wait -Tail 0 | ForEach-Object {
            if ($Highlight) {
                Write-ColoredLine $_
            } else {
                Write-Host $_
            }
        }
    } catch {
        Write-Host ""
        Write-Host "Log watching stopped" -ForegroundColor Yellow
    }
} else {
    Write-Host "Log file not found: $logPath" -ForegroundColor Red
}
