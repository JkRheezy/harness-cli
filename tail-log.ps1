#Requires -Version 5.1
<#
.SYNOPSIS
    Tail log file with color highlighting
.DESCRIPTION
    Monitor harness.log in real-time with color-coded output
.PARAMETER Lines
    Number of lines to show initially (default: 50)
.PARAMETER Follow
    Keep monitoring for new lines (default: true)
.EXAMPLE
    .\tail-log.ps1
    .\tail-log.ps1 -Lines 100
#>
param(
    [int]$Lines = 50,
    [switch]$Follow = $true
)

# Set encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$logPath = "$PSScriptRoot\logs\harness.log"

# Color scheme
$colors = @{
    'ERROR'   = 'Red'
    'WARN'    = 'Yellow'
    'OK'      = 'Green'
    'PLAN'    = 'Cyan'
    'EDIT'    = 'Magenta'
    'EXEC'    = 'Blue'
    'STAT'    = 'White'
    'default' = 'Gray'
}

function Get-LogColor {
    param([string]$line)
    foreach ($key in $colors.Keys) {
        if ($line -match "\[$key\]" -or $line -match "^\s*$key") {
            return $colors[$key]
        }
    }
    if ($line -match "error|fail|exception" -or $line -match "Stop|stopped") {
        return 'Red'
    }
    if ($line -match "warn|warning") {
        return 'Yellow'
    }
    if ($line -match "success|completed|done|pass") {
        return 'Green'
    }
    if ($line -match "start|begin|running") {
        return 'Cyan'
    }
    return $colors['default']
}

function Show-LogLine {
    param([string]$line)
    $color = Get-LogColor $line
    Write-Host $line -ForegroundColor $color
}

# Check log file
if (!(Test-Path $logPath)) {
    Write-Host "Log file not found: $logPath" -ForegroundColor Red
    exit 1
}

# Show header
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Harness Log Monitor                   " -ForegroundColor Cyan
Write-Host "  File: $logPath                       " -ForegroundColor Gray
Write-Host "  Press Ctrl+C to stop                  " -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Show initial lines
try {
    $initialLines = Get-Content $logPath -Tail $Lines -ErrorAction Stop
    foreach ($line in $initialLines) {
        Show-LogLine $line
    }
    
    if ($Follow) {
        Write-Host ""
        Write-Host "--- Waiting for new lines... ---" -ForegroundColor DarkGray
        
        # Monitor for new lines
        $lastPosition = (Get-Item $logPath).Length
        
        while ($true) {
            Start-Sleep -Milliseconds 500
            
            $currentSize = (Get-Item $logPath).Length
            if ($currentSize -gt $lastPosition) {
                $stream = [System.IO.StreamReader]::new($logPath)
                $stream.BaseStream.Seek($lastPosition, [System.IO.SeekOrigin]::Begin) | Out-Null
                
                while ($null -ne ($line = $stream.ReadLine())) {
                    Show-LogLine $line
                }
                
                $stream.Close()
                $lastPosition = $currentSize
            }
            elseif ($currentSize -lt $lastPosition) {
                # Log rotated
                $lastPosition = 0
            }
        }
    }
} catch {
    Write-Host "Error reading log: $_" -ForegroundColor Red
}
