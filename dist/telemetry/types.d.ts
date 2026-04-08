export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';
export interface Tags {
    [key: string]: string | number | boolean;
}
export interface Metric {
    name: string;
    type: MetricType;
    value: number;
    timestamp: number;
    tags?: Tags;
}
export interface SpanContext {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
}
export interface Span {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    name: string;
    startTime: number;
    endTime?: number;
    status: 'ok' | 'error' | 'in_progress';
    attributes: Record<string, unknown>;
    events: SpanEvent[];
}
export interface SpanEvent {
    name: string;
    timestamp: number;
    attributes?: Record<string, unknown>;
}
export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: number;
    context?: Record<string, unknown>;
    traceId?: string;
    spanId?: string;
}
/**
 * 完整 Trace，包含所有关联的 spans、metrics 和 logs
 * 每个 Trace 存储为单个文件，便于原子读取
 */
export interface CompleteTrace {
    traceId: string;
    taskId?: string;
    startTime: number;
    endTime?: number;
    durationMs?: number;
    status: 'in_progress' | 'success' | 'error';
    rootSpanName: string;
    spans: Span[];
    metrics: Metric[];
    logs: LogEntry[];
    metadata: {
        totalSpans: number;
        totalMetrics: number;
        totalLogs: number;
        errorCount: number;
    };
}
/**
 * Trace 索引条目，用于快速查找
 */
export interface TraceIndexEntry {
    traceId: string;
    taskId?: string;
    startTime: number;
    endTime?: number;
    status: 'in_progress' | 'success' | 'error';
    filePath: string;
    rootSpanName: string;
}
/**
 * Trace 查询过滤条件
 */
export interface TraceQuery {
    traceId?: string;
    taskId?: string;
    fromTime?: number;
    toTime?: number;
    status?: 'success' | 'error' | 'in_progress';
    limit?: number;
    offset?: number;
}
/**
 * 查询结果，包含分页信息
 */
export interface TraceQueryResult {
    traces: TraceIndexEntry[];
    total: number;
    hasMore: boolean;
}
export interface TelemetryConfig {
    adapter: 'file' | 'memory' | 'langsmith';
    fileAdapter?: {
        outputDir: string;
        maxFileSizeMB: number;
        retentionDays: number;
    };
    langSmithAdapter?: {
        apiKey: string;
        projectName: string;
    };
}
export declare abstract class TelemetryProvider {
    protected config: TelemetryConfig;
    constructor(config: TelemetryConfig);
    abstract counter(name: string, value: number, tags?: Tags): void;
    abstract gauge(name: string, value: number, tags?: Tags): void;
    abstract histogram(name: string, value: number, tags?: Tags): void;
    abstract timer(name: string, durationMs: number, tags?: Tags): void;
    abstract startSpan(name: string, parentContext?: SpanContext): Span;
    abstract endSpan(span: Span, status?: 'ok' | 'error'): void;
    abstract addSpanEvent(span: Span, name: string, attributes?: Record<string, unknown>): void;
    abstract log(level: LogLevel, message: string, context?: Record<string, unknown>): void;
    abstract flush(): Promise<void>;
    abstract close(): Promise<void>;
}
//# sourceMappingURL=types.d.ts.map