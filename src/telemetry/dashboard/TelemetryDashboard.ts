import * as fs from 'fs';
import * as path from 'path';
import { Metric, Span } from '../types';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface DashboardConfig {
  telemetryDir: string;
  refreshIntervalMs?: number;
}

interface TaskSummary {
  total: number;
  success: number;
  failed: number;
  avgDuration: number;
}

interface LLMSummary {
  totalCalls: number;
  totalTokens: number;
  estimatedCost: number;
  avgLatency: number;
}

export class TelemetryDashboard {
  private config: DashboardConfig;

  constructor(config: DashboardConfig) {
    this.config = {
      refreshIntervalMs: 5000,
      ...config
    };
  }

  async generateReport(): Promise<string> {
    const metrics = await this.loadMetrics();
    const spans = await this.loadSpans();
    
    const taskSummary = this.summarizeTasks(metrics);
    const llmSummary = this.summarizeLLM(metrics);
    
    return this.formatReport(taskSummary, llmSummary, spans);
  }

  private async loadJsonlFiles<T>(prefix: string): Promise<T[]> {
    if (!fs.existsSync(this.config.telemetryDir)) {
      return [];
    }

    const files = fs.readdirSync(this.config.telemetryDir)
      .filter(f => f.startsWith(prefix));

    const results: T[] = [];
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
          } catch (error) {
            console.error(`[Dashboard] Error parsing JSON in ${file}:${lineIndex + 1}:`, error);
          }
        });
      } catch (error) {
        console.error(`[Dashboard] Error loading ${file}:`, error);
      }
    }
    return results;
  }

  private async loadMetrics(): Promise<Metric[]> {
    return this.loadJsonlFiles<Metric>('metrics-');
  }

  private async loadSpans(): Promise<Span[]> {
    return this.loadJsonlFiles<Span>('spans-');
  }

  private summarizeTasks(metrics: Metric[]): TaskSummary {
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

  private summarizeLLM(metrics: Metric[]): LLMSummary {
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

  private formatReport(tasks: TaskSummary, llm: LLMSummary, spans: Span[]): string {
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
      `  Avg Duration:   ${(tasks.avgDuration/1000).toFixed(2)}s`,
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

  async watch(): Promise<void> {
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
