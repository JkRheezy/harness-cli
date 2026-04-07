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