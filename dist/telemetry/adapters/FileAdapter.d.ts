import { TelemetryProvider, Span, Tags, SpanContext, LogLevel } from '../types';
interface FileAdapterOptions {
    outputDir: string;
    maxFileSizeMB?: number;
    retentionDays?: number;
}
export declare class FileAdapter extends TelemetryProvider {
    private options;
    private metricStream?;
    private spanStream?;
    private logStream?;
    private pendingWrites;
    constructor(options: FileAdapterOptions);
    private ensureOutputDir;
    private initializeStreams;
    private createStream;
    private generateId;
    private writeToStream;
    counter(name: string, value: number, tags?: Tags): void;
    gauge(name: string, value: number, tags?: Tags): void;
    histogram(name: string, value: number, tags?: Tags): void;
    timer(name: string, durationMs: number, tags?: Tags): void;
    startSpan(name: string, parentContext?: SpanContext): Span;
    endSpan(span: Span, status?: 'ok' | 'error'): void;
    addSpanEvent(span: Span, name: string, attributes?: Record<string, unknown>): void;
    log(level: LogLevel, message: string, context?: Record<string, unknown>): void;
    flush(): Promise<void>;
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=FileAdapter.d.ts.map