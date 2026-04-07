#Requires -Version 5.1
<#
.SYNOPSIS
    Loop 业务+行动线分析面板
.DESCRIPTION
    清晰展示业务内容、Agent行动线和LLM交互
#>

# 设置编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$harnessPath = "$PSScriptRoot"
$logPath = "$harnessPath/logs/harness.log"
$projectPath = "D:\test\my-project"

function Show-BusinessContext {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                    📦 业务上下文 (PIN独立站)                    ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  🎯 业务类型: 自营跨境电商 (Dropshipping)" -ForegroundColor White
    Write-Host "  📌 主营类目: PIN徽章" -ForegroundColor White
    Write-Host "  🌍 目标市场: 美国青少年" -ForegroundColor White
    Write-Host "  🤖 AI核心: 选品 + 设计 + 营销 (自动化运营)" -ForegroundColor White
    Write-Host "  🏗️  技术栈: Next.js + Node.js + PostgreSQL" -ForegroundColor White
    Write-Host ""
    Write-Host "  📋 当前任务类型:" -ForegroundColor Yellow
    Write-Host "     • 代码重构 (workflow.ts 长文件拆分)" -ForegroundColor Gray
    Write-Host "     • AI Agent 架构优化" -ForegroundColor Gray
    Write-Host ""
}

function Show-ActionTimeline {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                      🎬 Agent 行动线                          ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
    if (!(Test-Path $logPath)) {
        Write-Host "  日志文件不存在" -ForegroundColor Red
        return
    }
    
    # 获取最近的关键事件
    $events = Get-Content $logPath -Tail 200 | Select-String -Pattern "任务已取出|执行计划|Calling LLM|response received|Writing file|任务执行完成|failed|error" | Select-Object -Last 15
    
    $step = 1
    foreach ($event in $events) {
        $line = $event.ToString()
        $time = if ($line -match "(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})") { $matches[1].Substring(11) } else { "" }
        
        if ($line -match "任务已取出.*:\s*(.+?)$") {
            Write-Host "  Step $($step.ToString().PadLeft(2)) [$time] " -NoNewline -ForegroundColor DarkGray
            Write-Host "📋 领取任务: $($matches[1].Substring(0, [Math]::Min(40, $matches[1].Length)))..." -ForegroundColor Cyan
            $step++
        }
        elseif ($line -match "执行计划.*(\d+) steps") {
            Write-Host "          [$time] " -NoNewline -ForegroundColor DarkGray
            Write-Host "📝 生成计划: $($matches[1]) 个步骤" -ForegroundColor Yellow
        }
        elseif ($line -match "Calling LLM.*(kimi-for-coding|gpt-4o)") {
            Write-Host "          [$time] " -NoNewline -ForegroundColor DarkGray
            Write-Host "🤖 调用LLM: anthropic/kimi-for-coding" -ForegroundColor Blue
        }
        elseif ($line -match "response received") {
            Write-Host "          [$time] " -NoNewline -ForegroundColor DarkGray
            Write-Host "✅ LLM响应: 已接收" -ForegroundColor Green
        }
        elseif ($line -match "Writing file.*:\s*(.+?)$") {
            $file = $matches[1]
            if ($file.Length -gt 35) { $file = "..." + $file.Substring($file.Length - 35) }
            Write-Host "          [$time] " -NoNewline -ForegroundColor DarkGray
            Write-Host "✏️  写入文件: $file" -ForegroundColor Magenta
        }
        elseif ($line -match "任务执行完成.*状态.*success") {
            Write-Host "  Step $($step.ToString().PadLeft(2)) [$time] " -NoNewline -ForegroundColor DarkGray
            Write-Host "✅ 任务完成" -ForegroundColor Green
            $step++
        }
        elseif ($line -match "failed|error.*ERR") {
            Write-Host "          [$time] " -NoNewline -ForegroundColor DarkGray
            Write-Host "❌ 失败/错误" -ForegroundColor Red
        }
    }
    Write-Host ""
}

function Show-LLMInteractions {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
    Write-Host "║                    🤖 LLM 请求响应详情                        ║" -ForegroundColor Blue
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
    Write-Host ""
    
    if (!(Test-Path $logPath)) { return }
    
    # 统计LLM调用
    $llmCalls = Get-Content $logPath | Select-String "Calling LLM" | Measure-Object
    $responses = Get-Content $logPath | Select-String "response received" | Measure-Object
    
    Write-Host "  📊 统计:" -ForegroundColor Yellow
    Write-Host "     LLM调用次数: $($llmCalls.Count)" -ForegroundColor White
    Write-Host "     成功响应: $($responses.Count)" -ForegroundColor White
    Write-Host ""
    
    # 最近的LLM交互
    Write-Host "  📜 最近交互:" -ForegroundColor Yellow
    $recentLogs = Get-Content $logPath -Tail 100
    $inLLMBlock = $false
    $callTime = ""
    $responseTime = ""
    $duration = ""
    
    foreach ($line in $recentLogs) {
        if ($line -match "Calling LLM.*(kimi|gpt-4o).*?(\d{2}:\d{2}:\d{2})") {
            $callTime = $matches[2]
            $inLLMBlock = $true
        }
        elseif ($line -match "response received.*?(\d{2}:\d{2}:\d{2})" -and $inLLMBlock) {
            $responseTime = $matches[1]
            $inLLMBlock = $false
            Write-Host "     [$callTime -> $responseTime] LLM调用" -ForegroundColor Gray
        }
        elseif ($line -match "LLM Response length.*?(\d+)" -and $callTime) {
            $len = $matches[1]
            Write-Host "        └─> 响应长度: $len 字符" -ForegroundColor DarkGray
            $callTime = ""
        }
    }
    Write-Host ""
}

function Show-CurrentTaskDetail {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║                    📋 当前任务详情                            ║" -ForegroundColor Magenta
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
    Write-Host ""
    
    # 获取最近任务
    $lastTaskLine = Get-Content $logPath -Tail 50 | Select-String "任务已取出" | Select-Object -Last 1
    if ($lastTaskLine) {
        $line = $lastTaskLine.ToString()
        if ($line -match "任务已取出.*:\s*(.+?)(\s+\(|$)") {
            $taskName = $matches[1]
            Write-Host "  🎯 当前任务: $taskName" -ForegroundColor White
            
            # 提取时间
            if ($line -match "(\d{2}:\d{2}:\d{2})") {
                Write-Host "  ⏰ 开始时间: $($matches[1])" -ForegroundColor Gray
            }
        }
    }
    
    # 获取计划步骤
    $planLine = Get-Content $logPath -Tail 100 | Select-String "执行计划.*steps" | Select-Object -Last 1
    if ($planLine) {
        if ($planLine -match "(\d+) steps") {
            Write-Host "  📝 计划步骤: $($matches[1]) 步" -ForegroundColor Yellow
        }
    }
    
    # 当前进度
    $progress = Get-Content $logPath -Tail 100 | Select-String "\[(\d+/\d+)\]" | Select-Object -Last 1
    if ($progress) {
        if ($progress -match "\[(\d+/\d+)\].*?:\s*(.+)$") {
            Write-Host "  ▶️  当前进度: [$($matches[1])] $($matches[2].Substring(0, [Math]::Min(50, $matches[2].Length)))" -ForegroundColor Cyan
        }
    }
    
    Write-Host ""
}

# 主程序
Clear-Host
Show-BusinessContext
Show-CurrentTaskDetail
Show-ActionTimeline
Show-LLMInteractions

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "💡 提示: 使用 Get-Content logs/harness.log -Wait -Tail 20 实时查看日志" -ForegroundColor DarkGray
Write-Host ""
