import { TelemetryProvider, Span, Tags, SpanContext, LogLevel, CompleteTrace, TraceQuery, TraceQueryResult } from '../types';
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
export declare class IndexedFileAdapter extends TelemetryProvider {
    private options;
    private traceDir;
    private aggregator;
    private indexManager;
    private flushInterval?;
    constructor(options: IndexedFileAdapterOptions);
    counter(name: string, value: number, tags?: Tags): void;
    gauge(name: string, value: number, tags?: Tags): void;
    histogram(name: string, value: number, tags?: Tags): void;
    timer(name: string, durationMs: number, tags?: Tags): void;
    startSpan(name: string, parentContext?: SpanContext): Span;
    endSpan(span: Span, status?: 'ok' | 'error'): void;
    addSpanEvent(span: Span, name: string, attributes?: Record<string, unknown>): void;
    log(level: LogLevel, message: string, context?: Record<string, unknown>): void;
    queryTraces(query: TraceQuery): TraceQueryResult;
    getTrace(traceId: string): CompleteTrace | null;
    getStats(): {
        totalTraces: number;
        pendingTraces: number;
    };
    flush(): Promise<void>;
    close(): Promise<void>;
    private ensureDirectories;
    private generateId;
    private saveTrace;
    private startAutoFlush;
}
export {};
//# sourceMappingURL=IndexedFileAdapter.d.ts.map