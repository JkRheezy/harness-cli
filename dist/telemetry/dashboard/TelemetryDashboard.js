"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryDashboard = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
class TelemetryDashboard {
    constructor(config) {
        this.config = {
            refreshIntervalMs: 5000,
            ...config
        };
    }
    async generateReport() {
        const metrics = await this.loadMetrics();
        const spans = await this.loadSpans();
        const taskSummary = this.summarizeTasks(metrics);
        const llmSummary = this.summarizeLLM(metrics);
        return this.formatReport(taskSummary, llmSummary, spans);
    }
    async loadJsonlFiles(prefix) {
        if (!fs.existsSync(this.config.telemetryDir)) {
            return [];
        }
        const files = fs.readdirSync(this.config.telemetryDir)
            .filter(f => f.startsWith(prefix));
        const results = [];
        for (const file of files.slice(-3)) { // Last 3 days
            const filePath = path.join(this.config.telemetryDir, file);
            try {
                const stats = fs.statSync(filePath);
                if (stats.size > MAX_FILE_SIZE) {
                    console.warn(`[Dashboard] Skipping large file ${file} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
                    continue;
                }
                const content = fs.readFileSync(filePath, 'utf-8');
                content.split('\n').filter(line => line).forEach((line, lineIndex) => {
                    try {
                        results.push(JSON.parse(line));
                    }
                    catch (error) {
                        console.error(`[Dashboard] Error parsing JSON in ${file}:${lineIndex + 1}:`, error);
                    }
                });
            }
            catch (error) {
                console.error(`[Dashboard] Error loading ${file}:`, error);
            }
        }
        return results;
    }
    async loadMetrics() {
        return this.loadJsonlFiles('metrics-');
    }
    async loadSpans() {
        return this.loadJsonlFiles('spans-');
    }
    summarizeTasks(metrics) {
        const taskMetrics = metrics.filter(m => m.name.startsWith('loop.task.'));
        const success = taskMetrics
            .filter(m => m.name === 'loop.task.success')
            .reduce((sum, m) => sum + m.value, 0);
        const failed = taskMetrics
            .filter(m => m.name === 'loop.task.failure')
            .reduce((sum, m) => sum + m.value, 0);
        const durations = taskMetrics
            .filter(m => m.name === 'loop.task.duration')
            .map(m => m.value);
        return {
            total: success + failed,
            success,
            failed,
            avgDuration: durations.length > 0
                ? durations.reduce((a, b) => a + b, 0) / durations.length
                : 0
        };
    }
    summarizeLLM(metrics) {
        const llmMetrics = metrics.filter(m => m.name.startsWith('llm.'));
        const calls = llmMetrics
            .filter(m => m.name === 'llm.call.success' || m.name === 'llm.call.failure')
            .reduce((sum, m) => sum + m.value, 0);
        const tokens = llmMetrics
            .filter(m => m.name === 'llm.tokens.total')
            .reduce((sum, m) => sum + m.value, 0);
        const cost = llmMetrics
            .filter(m => m.name === 'llm.cost.estimated')
            .reduce((sum, m) => sum + m.value, 0);
        const latencies = llmMetrics
            .filter(m => m.name === 'llm.call.duration')
            .map(m => m.value);
        return {
            totalCalls: calls,
            totalTokens: tokens,
            estimatedCost: cost,
            avgLatency: latencies.length > 0
                ? latencies.reduce((a, b) => a + b, 0) / latencies.length
                : 0
        };
    }
    formatReport(tasks, llm, spans) {
        const successRate = tasks.total > 0 ? (tasks.success / tasks.total * 100).toFixed(1) : '0.0';
        const failureRate = tasks.total > 0 ? (tasks.failed / tasks.total * 100).toFixed(1) : '0.0';
        const lines = [
            '╔════════════════════════════════════════════════════════════╗',
            '║            Harness Telemetry Dashboard                     ║',
            '╚════════════════════════════════════════════════════════════╝',
            '',
            'Task Execution Summary',
            `  Total Tasks:    ${tasks.total}`,
            `  Success:        ${tasks.success} (${successRate}%)`,
            `  Failed:         ${tasks.failed} (${failureRate}%)`,
            `  Avg Duration:   ${(tasks.avgDuration / 1000).toFixed(2)}s`,
            '',
            'LLM Usage Summary',
            `  Total Calls:    ${llm.totalCalls}`,
            `  Total Tokens:   ${llm.totalTokens.toLocaleString()}`,
            `  Est. Cost:      $${llm.estimatedCost.toFixed(4)}`,
            `  Avg Latency:    ${llm.avgLatency.toFixed(0)}ms`,
            '',
            `Active Spans:     ${spans.filter(s => s.status === 'in_progress').length}`,
            `Completed Spans:  ${spans.filter(s => s.status !== 'in_progress').length}`,
            ''
        ];
        return lines.join('\n');
    }
    async watch() {
        console.log('Starting telemetry dashboard (Ctrl+C to exit)...\n');
        while (true) {
            console.clear();
            const report = await this.generateReport();
            console.log(report);
            console.log(`\nLast updated: ${new Date().toLocaleTimeString()}`);
            console.log('Press Ctrl+C to exit');
            await new Promise(resolve => setTimeout(resolve, this.config.refreshIntervalMs));
        }
    }
}
exports.TelemetryDashboard = TelemetryDashboard;
//# sourceMappingURL=TelemetryDashboard.js.map