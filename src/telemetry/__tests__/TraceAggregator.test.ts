import { TraceAggregator } from '../storage/TraceAggregator';
import { Span, Metric, LogEntry } from '../types';

describe('TraceAggregator', () => {
  let aggregator: TraceAggregator;

  beforeEach(() => {
    aggregator = new TraceAggregator();
  });

  describe('addSpan', () => {
    it('应为新 traceId 创建新的待处理 Trace', () => {
      const span: Span = {
        traceId: 'trace-1',
        spanId: 'span-1',
        name: 'root',
        startTime: Date.now(),
        status: 'in_progress',
        attributes: {},
        events: []
      };

      aggregator.addSpan(span);
      
      expect(aggregator.getPendingTraceIds()).toContain('trace-1');
    });

    it('应将 Span 添加到现有 Trace', () => {
      const traceId = 'trace-1';
      const span1: Span = {
        traceId,
        spanId: 'span-1',
        name: 'root',
        startTime: Date.now(),
        status: 'in_progress',
        attributes: {},
        events: []
      };
      const span2: Span = {
        traceId,
        spanId: 'span-2',
        parentSpanId: 'span-1',
        name: 'child',
        startTime: Date.now(),
        status: 'in_progress',
        attributes: {},
        events: []
      };

      aggregator.addSpan(span1);
      aggregator.addSpan(span2);
      
      const trace = aggregator.completeTrace(traceId, 'success');
      expect(trace?.metadata.totalSpans).toBe(2);
    });

    it('应从 span 属性中提取 taskId', () => {
      const span: Span = {
        traceId: 'trace-1',
        spanId: 'span-1',
        name: 'root',
        startTime: Date.now(),
        status: 'in_progress',
        attributes: { taskId: 'task-123' },
        events: []
      };

      aggregator.addSpan(span);
      const trace = aggregator.completeTrace('trace-1', 'success');
      
      expect(trace?.taskId).toBe('task-123');
    });
  });

  describe('completeTrace', () => {
    it('应构建包含所有数据的完整 Trace', () => {
      const traceId = 'trace-1';
      const now = Date.now();
      
      const span: Span = {
        traceId,
        spanId: 'span-1',
        name: 'test-span',
        startTime: now,
        endTime: now + 100,
        status: 'ok',
        attributes: { taskId: 'task-1' },
        events: [{ name: 'event', timestamp: now }]
      };

      const metric: Metric = {
        name: 'test.metric',
        type: 'counter',
        value: 1,
        timestamp: now,
        tags: { traceId }
      };

      const log: LogEntry = {
        level: 'info',
        message: 'test log',
        timestamp: now,
        traceId
      };

      aggregator.addSpan(span);
      aggregator.addMetric(metric);
      aggregator.addLog(log);

      const trace = aggregator.completeTrace(traceId, 'success');

      expect(trace).toMatchObject({
        traceId: 'trace-1',
        taskId: 'task-1',
        rootSpanName: 'test-span',
        status: 'success',
        metadata: {
          totalSpans: 1,
          totalMetrics: 1,
          totalLogs: 1,
          errorCount: 0
        }
      });
      expect(trace?.durationMs).toBe(100);
    });

    it('不存在的 Trace 应返回 null', () => {
      const trace = aggregator.completeTrace('non-existent', 'success');
      expect(trace).toBeNull();
    });
  });

  describe('flushAll', () => {
    it('应完成所有待处理的 Trace', () => {
      aggregator.addSpan({
        traceId: 'trace-1',
        spanId: 'span-1',
        name: 'root',
        startTime: Date.now(),
        status: 'in_progress',
        attributes: {},
        events: []
      });
      
      aggregator.addSpan({
        traceId: 'trace-2',
        spanId: 'span-2',
        name: 'root',
        startTime: Date.now(),
        status: 'in_progress',
        attributes: {},
        events: []
      });

      const traces = aggregator.flushAll();

      expect(traces).toHaveLength(2);
      expect(aggregator.getPendingTraceIds()).toHaveLength(0);
    });
  });
});
