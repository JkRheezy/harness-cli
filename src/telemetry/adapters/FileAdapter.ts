import * as fs from 'fs';
import * as path from 'path';
import { TelemetryProvider, Metric, Span, LogEntry, Tags, SpanContext, LogLevel } from '../types';

interface FileAdapterOptions {
  outputDir: string;
  maxFileSizeMB: number;
  retentionDays: number;
}

export class FileAdapter extends TelemetryProvider {
  private options: FileAdapterOptions;
  private metricStream?: fs.WriteStream;
  private spanStream?: fs.WriteStream;
  private logStream?: fs.WriteStream;
  private currentTraceId?: string;

  constructor(options: { outputDir: string; maxFileSizeMB?: number; retentionDays?: number }) {
    super({ adapter: 'file' });
    this.options = {
      outputDir: options.outputDir,
      maxFileSizeMB: options.maxFileSizeMB || 10,
      retentionDays: options.retentionDays || 7
    };
    this.ensureOutputDir();
    this.initializeStreams();
  }

  private ensureOutputDir(): void {
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  private initializeStreams(): void {
    const timestamp = new Date().toISOString().split('T')[0];
    
    this.metricStream = fs.createWriteStream(
      path.join(this.options.outputDir, `metrics-${timestamp}.jsonl`),
      { flags: 'a' }
    );
    
    this.spanStream = fs.createWriteStream(
      path.join(this.options.outputDir, `spans-${timestamp}.jsonl`),
      { flags: 'a' }
    );
    
    this.logStream = fs.createWriteStream(
      path.join(this.options.outputDir, `logs-${timestamp}.jsonl`),
      { flags: 'a' }
    );
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  counter(name: string, value: number, tags?: Tags): void {
    const metric: Metric = {
      name,
      type: 'counter',
      value,
      timestamp: Date.now(),
      tags
    };
    this.metricStream?.write(JSON.stringify(metric) + '\n');
  }

  gauge(name: string, value: number, tags?: Tags): void {
    const metric: Metric = {
      name,
      type: 'gauge',
      value,
      timestamp: Date.now(),
      tags
    };
    this.metricStream?.write(JSON.stringify(metric) + '\n');
  }

  histogram(name: string, value: number, tags?: Tags): void {
    const metric: Metric = {
      name,
      type: 'histogram',
      value,
      timestamp: Date.now(),
      tags
    };
    this.metricStream?.write(JSON.stringify(metric) + '\n');
  }

  timer(name: string, durationMs: number, tags?: Tags): void {
    const metric: Metric = {
      name,
      type: 'timer',
      value: durationMs,
      timestamp: Date.now(),
      tags
    };
    this.metricStream?.write(JSON.stringify(metric) + '\n');
  }

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
    return span;
  }

  endSpan(span: Span, status: 'ok' | 'error' = 'ok'): void {
    span.endTime = Date.now();
    span.status = status;
    this.spanStream?.write(JSON.stringify(span) + '\n');
  }

  addSpanEvent(span: Span, name: string, attributes?: Record<string, unknown>): void {
    span.events.push({
      name,
      timestamp: Date.now(),
      attributes
    });
  }

  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context
    };
    this.logStream?.write(JSON.stringify(entry) + '\n');
  }

  async flush(): Promise<void> {
    return new Promise((resolve) => {
      let pending = 3;
      const check = () => {
        pending--;
        if (pending === 0) resolve();
      };
      this.metricStream?.once('drain', check) || check();
      this.spanStream?.once('drain', check) || check();
      this.logStream?.once('drain', check) || check();
    });
  }

  async close(): Promise<void> {
    await this.flush();
    this.metricStream?.end();
    this.spanStream?.end();
    this.logStream?.end();
  }
}
