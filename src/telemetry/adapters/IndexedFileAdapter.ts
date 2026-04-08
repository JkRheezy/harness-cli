import * as fs from 'fs';
import * as path from 'path';
import { TelemetryProvider, Metric, Span, LogEntry, Tags, SpanContext, LogLevel, CompleteTrace, TraceQuery, TraceQueryResult } from '../types';
import { TraceAggregator } from '../storage/TraceAggregator';
import { IndexManager } from '../storage/IndexManager';

/**
 * IndexedFileAdapter 配置选项
 */
interface IndexedFileAdapterOptions {
  outputDir: string;
  maxFileSizeMB?: number;
  retentionDays?: number;
  persistIntervalMs?: number;
}

/**
 * 增强版 FileAdapter，支持 Trace 聚合和索引
 * 将完整 Trace 存储为独立 JSON 文件以便快速检索
 */
export class IndexedFileAdapter extends TelemetryProvider {
  private options: IndexedFileAdapterOptions;
  private traceDir: string;
  private aggregator: TraceAggregator;
  private indexManager: IndexManager;
  private flushInterval?: NodeJS.Timeout;

  constructor(options: IndexedFileAdapterOptions) {
    super({ adapter: 'file' } as any);
    
    this.options = {
      outputDir: options.outputDir,
      maxFileSizeMB: options.maxFileSizeMB || 10,
      retentionDays: options.retentionDays || 7,
      persistIntervalMs: options.persistIntervalMs || 5000
    };

    this.traceDir = path.join(this.options.outputDir, 'traces');
    this.ensureDirectories();

    this.aggregator = new TraceAggregator();
    this.indexManager = new IndexManager({
      indexPath: path.join(this.options.outputDir, 'index', 'traces.json'),
      persistIntervalMs: this.options.persistIntervalMs
    });

    this.startAutoFlush();
  }

  // 指标方法
  counter(name: string, value: number, tags?: Tags): void {
    const metric: Metric = {
      name,
      type: 'counter',
      value,
      timestamp: Date.now(),
      tags
    };
    this.aggregator.addMetric(metric);
  }

  gauge(name: string, value: number, tags?: Tags): void {
    const metric: Metric = {
      name,
      type: 'gauge',
      value,
      timestamp: Date.now(),
      tags
    };
    this.aggregator.addMetric(metric);
  }

  histogram(name: string, value: number, tags?: Tags): void {
    const metric: Metric = {
      name,
      type: 'histogram',
      value,
      timestamp: Date.now(),
      tags
    };
    this.aggregator.addMetric(metric);
  }

  timer(name: string, durationMs: number, tags?: Tags): void {
    const metric: Metric = {
      name,
      type: 'timer',
      value: durationMs,
      timestamp: Date.now(),
      tags
    };
    this.aggregator.addMetric(metric);
  }

  // 追踪方法
  startSpan(name: string, parentContext?: SpanContext): Span {
    const span: Span = {
      traceId: parentContext?.traceId || this.generateId(),
      spanId: this.generateId(),
      parentSpanId: parentContext?.spanId,
      name,
      startTime: Date.now(),
      status: 'in_progress',
      attributes: {},
      events: []
    };
    this.aggregator.addSpan(span);
    return span;
  }

  endSpan(span: Span, status: 'ok' | 'error' = 'ok'): void {
    span.endTime = Date.now();
    span.status = status;
    this.aggregator.addSpan(span);

    // 如果是根 span，完成整个 trace
    if (!span.parentSpanId) {
      const completeTrace = this.aggregator.completeTrace(
        span.traceId,
        status === 'ok' ? 'success' : 'error'
      );
      if (completeTrace) {
        this.saveTrace(completeTrace);
      }
    }
  }

  addSpanEvent(span: Span, name: string, attributes?: Record<string, unknown>): void {
    span.events.push({
      name,
      timestamp: Date.now(),
      attributes
    });
  }

  // 日志方法
  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      traceId: context?.traceId as string,
      spanId: context?.spanId as string
    };
    this.aggregator.addLog(entry);
  }

  // 查询 API
  queryTraces(query: TraceQuery): TraceQueryResult {
    return this.indexManager.query(query);
  }

  getTrace(traceId: string): CompleteTrace | null {
    const entry = this.indexManager.getTraceEntry(traceId);
    if (!entry) return null;

    try {
      const content = fs.readFileSync(entry.filePath, 'utf-8');
      return JSON.parse(content) as CompleteTrace;
    } catch (error) {
      console.error(`[IndexedFileAdapter] 加载 Trace ${traceId} 失败:`, error);
      return null;
    }
  }

  getStats(): { totalTraces: number; pendingTraces: number } {
    return {
      totalTraces: this.indexManager.getTraceCount(),
      pendingTraces: this.aggregator.getPendingTraceIds().length
    };
  }

  // 生命周期方法
  async flush(): Promise<void> {
    const traces = this.aggregator.flushCompletedTraces();
    for (const trace of traces) {
      await this.saveTrace(trace);
    }
    await this.indexManager.persist();
  }

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // 刷新所有待处理的 trace
    const traces = this.aggregator.flushAll();
    for (const trace of traces) {
      await this.saveTrace(trace);
    }

    await this.indexManager.close();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.traceDir)) {
      fs.mkdirSync(this.traceDir, { recursive: true });
    }
  }

  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveTrace(trace: CompleteTrace): Promise<void> {
    const dateDir = new Date(trace.startTime).toISOString().split('T')[0];
    const traceDir = path.join(this.traceDir, dateDir);
    
    if (!fs.existsSync(traceDir)) {
      fs.mkdirSync(traceDir, { recursive: true });
    }

    const filePath = path.join(traceDir, `${trace.traceId}.json`);
    
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(trace, null, 2));
      this.indexManager.indexTrace(trace, filePath);
    } catch (error) {
      console.error(`[IndexedFileAdapter] 保存 Trace ${trace.traceId} 失败:`, error);
    }
  }

  private startAutoFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch(err => {
        console.error('[IndexedFileAdapter] 自动刷新失败:', err);
      });
    }, this.options.persistIntervalMs);
  }
}
