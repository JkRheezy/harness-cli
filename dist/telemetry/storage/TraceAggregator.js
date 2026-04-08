"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraceAggregator = void 0;
/**
 * 按 traceId 聚合 Telemetry 数据为完整 Trace
 * 维护内存中活跃 Trace 状态，完成后刷新到磁盘
 */
class TraceAggregator {
    constructor() {
        this.pendingTraces = new Map();
        this.completedTraces = [];
        this.maxPendingTraces = 100;
        this.maxCompletedTraces = 1000;
        this.maxTraceAgeMs = 5 * 60 * 1000; // 5 分钟
    }
    /**
     * 添加 Span 到聚合器
     * 如果 traceId 未见过，则创建新的待处理 Trace
     */
    addSpan(span) {
        let pending = this.pendingTraces.get(span.traceId);
        if (!pending) {
            pending = {
                traceId: span.traceId,
                spans: new Map(),
                metrics: [],
                logs: [],
                startTime: span.startTime,
                rootSpanName: span.name
            };
            this.pendingTraces.set(span.traceId, pending);
        }
        // 检查 span 属性中是否包含 taskId
        if (span.attributes?.taskId && !pending.taskId) {
            pending.taskId = String(span.attributes.taskId);
        }
        pending.spans.set(span.spanId, span);
        // 如果是根 span（无父级），更新 rootSpanName
        if (!span.parentSpanId && span.name !== pending.rootSpanName) {
            pending.rootSpanName = span.name;
        }
        this.enforceLimits();
    }
    /**
     * 添加 Metric 到聚合器
     * 如果包含 traceId 标签，则关联到对应 Trace
     */
    addMetric(metric) {
        const traceId = metric.tags?.traceId;
        if (!traceId)
            return;
        const pending = this.pendingTraces.get(traceId);
        if (pending) {
            pending.metrics.push(metric);
        }
    }
    /**
     * 添加 Log 条目到聚合器
     * 如果包含 traceId，则关联到对应 Trace
     */
    addLog(log) {
        if (!log.traceId)
            return;
        const pending = this.pendingTraces.get(log.traceId);
        if (pending) {
            pending.logs.push(log);
        }
    }
    /**
     * 当根 Span 结束时，标记 Trace 为已完成
     */
    completeTrace(traceId, status) {
        const pending = this.pendingTraces.get(traceId);
        if (!pending)
            return null;
        const completeTrace = this.buildCompleteTrace(pending, status);
        this.pendingTraces.delete(traceId);
        this.completedTraces.push(completeTrace);
        // 限制 completedTraces 大小
        if (this.completedTraces.length > this.maxCompletedTraces) {
            this.completedTraces = this.completedTraces.slice(-this.maxCompletedTraces);
        }
        return completeTrace;
    }
    /**
     * 获取所有已完成的 Trace 并清空缓冲区
     */
    flushCompletedTraces() {
        const traces = [...this.completedTraces];
        this.completedTraces = [];
        return traces;
    }
    /**
     * 获取当前待处理的 Trace ID 列表（用于调试）
     */
    getPendingTraceIds() {
        return Array.from(this.pendingTraces.keys());
    }
    /**
     * 强制完成所有待处理的 Trace（关闭时调用）
     */
    flushAll() {
        const traces = [];
        for (const [traceId, pending] of this.pendingTraces) {
            traces.push(this.buildCompleteTrace(pending, 'error'));
        }
        this.pendingTraces.clear();
        traces.push(...this.completedTraces);
        this.completedTraces = [];
        return traces;
    }
    buildCompleteTrace(pending, status) {
        const spans = Array.from(pending.spans.values());
        const rootSpan = spans.find(s => !s.parentSpanId) || spans[0];
        const endTime = rootSpan?.endTime || Date.now();
        const errorCount = spans.filter(s => s.status === 'error').length +
            pending.logs.filter(l => l.level === 'error').length;
        return {
            traceId: pending.traceId,
            taskId: pending.taskId,
            startTime: pending.startTime,
            endTime,
            durationMs: endTime - pending.startTime,
            status: status === 'success' && errorCount === 0 ? 'success' : 'error',
            rootSpanName: pending.rootSpanName,
            spans,
            metrics: pending.metrics,
            logs: pending.logs,
            metadata: {
                totalSpans: spans.length,
                totalMetrics: pending.metrics.length,
                totalLogs: pending.logs.length,
                errorCount
            }
        };
    }
    enforceLimits() {
        // 如果待处理 Trace 过多，完成最旧的
        if (this.pendingTraces.size > this.maxPendingTraces) {
            const oldestTraceId = this.pendingTraces.keys().next().value;
            if (oldestTraceId) {
                this.completeTrace(oldestTraceId, 'error');
            }
        }
        // 完成超时未完成的 Trace
        const now = Date.now();
        for (const [traceId, pending] of this.pendingTraces) {
            if (now - pending.startTime > this.maxTraceAgeMs) {
                this.completeTrace(traceId, 'error');
            }
        }
    }
}
exports.TraceAggregator = TraceAggregator;
//# sourceMappingURL=TraceAggregator.js.map