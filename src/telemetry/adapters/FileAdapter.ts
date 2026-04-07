import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { TelemetryProvider, Metric, Span, LogEntry, Tags, SpanContext, LogLevel } from '../types';

interface FileAdapterOptions {
  outputDir: string;
  maxFileSizeMB?: number;
  retentionDays?: number;
}

export class FileAdapter extends TelemetryProvider {
  private options: FileAdapterOptions;
  private metricStream?: fs.WriteStream;
  private spanStream?: fs.WriteStream;
  private logStream?: fs.WriteStream;
  private pendingWrites: number = 0;

  constructor(options: FileAdapterOptions) {
    super({ adapter: 'file' } as any);
    if (!options.outputDir) {
      throw new Error('outputDir is required');
    }
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
    
    this.metricStream = this.createStream(`metrics-${timestamp}.jsonl`);
    this.spanStream = this.createStream(`spans-${timestamp}.jsonl`);
    this.logStream = this.createStream(`logs-${timestamp}.jsonl`);
  }

  private createStream(filename: string): fs.WriteStream {
    const stream = fs.createWriteStream(
      path.join(this.options.outputDir, filename),
      { flags: 'a' }
    );
    
    stream.on('error', (err) => {
      console.error(`[Telemetry] Stream error for ${filename}:`, err.message);
    });
    
    return stream;
  }

  private generateId(): string {
    return randomUUID();
  }

  private writeToStream(stream: fs.WriteStream | undefined, data: string): boolean {
    if (!stream) return false;
    this.pendingWrites++;
    const ok = stream.write(data, (err) => {
      this.pendingWrites--;
      if (err) {
        console.error('[Telemetry] Write error:', err.message);
      }
    });
    return ok;
  }

  counter(name: string, value: number, tags?: Tags): void {
    const metric: Metric = {
      name,
      type: 'counter',
      value,
      timestamp: Date.now(),
      tags
    };
    this.writeToStream(this.metricStream, JSON.stringify(metric) + '\n');
  }

  gauge(name: string, value: number, tags?: Tags): void {
    const metric: Metric = {
      name,
      type: 'gauge',
      value,
      timestamp: Date.now(),
      tags
    };
    this.writeToStream(this.metricStream, JSON.stringify(metric) + '\n');
  }

  histogram(name: string, value: number, tags?: Tags): void {
    const metric: Metric = {
      name,
      type: 'histogram',
      value,
      timestamp: Date.now(),
      tags
    };
    this.writeToStream(this.metricStream, JSON.stringify(metric) + '\n');
  }

  timer(name: string, durationMs: number, tags?: Tags): void {
    const metric: Metric = {
      name,
      type: 'timer',
      value: durationMs,
      timestamp: Date.now(),
      tags
    };
    this.writeToStream(this.metricStream, JSON.stringify(metric) + '\n');
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
    this.writeToStream(this.spanStream, JSON.stringify(span) + '\n');
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
    this.writeToStream(this.logStream, JSON.stringify(entry) + '\n');
  }

  async flush(): Promise<void> {
    if (this.pendingWrites === 0) return;
    
    return new Promise((resolve) => {
      const check = () => {
        if (this.pendingWrites === 0) {
          resolve();
        } else {
          setImmediate(check);
        }
      };
      check();
    });
  }

  async close(): Promise<void> {
    await this.flush();
    
    return new Promise((resolve) => {
      let closed = 0;
      const check = () => {
        closed++;
        if (closed === 3) resolve();
      };
      
      this.metricStream?.end(check) || check();
      this.spanStream?.end(check) || check();
      this.logStream?.end(check) || check();
    });
  }
}
