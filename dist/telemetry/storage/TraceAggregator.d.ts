import { Span, Metric, LogEntry, CompleteTrace } from '../types';
/**
 * 按 traceId 聚合 Telemetry 数据为完整 Trace
 * 维护内存中活跃 Trace 状态，完成后刷新到磁盘
 */
export declare class TraceAggregator {
    private pendingTraces;
    private completedTraces;
    private maxPendingTraces;
    private maxCompletedTraces;
    private maxTraceAgeMs;
    /**
     * 添加 Span 到聚合器
     * 如果 traceId 未见过，则创建新的待处理 Trace
     */
    addSpan(span: Span): void;
    /**
     * 添加 Metric 到聚合器
     * 如果包含 traceId 标签，则关联到对应 Trace
     */
    addMetric(metric: Metric): void;
    /**
     * 添加 Log 条目到聚合器
     * 如果包含 traceId，则关联到对应 Trace
     */
    addLog(log: LogEntry): void;
    /**
     * 当根 Span 结束时，标记 Trace 为已完成
     */
    completeTrace(traceId: string, status: 'success' | 'error'): CompleteTrace | null;
    /**
     * 获取所有已完成的 Trace 并清空缓冲区
     */
    flushCompletedTraces(): CompleteTrace[];
    /**
     * 获取当前待处理的 Trace ID 列表（用于调试）
     */
    getPendingTraceIds(): string[];
    /**
     * 强制完成所有待处理的 Trace（关闭时调用）
     */
    flushAll(): CompleteTrace[];
    private buildCompleteTrace;
    private enforceLimits;
}
//# sourceMappingURL=TraceAggregator.d.ts.map