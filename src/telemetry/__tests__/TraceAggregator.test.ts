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

  describe('enforceLimits', () => {
    it('应限制最大待处理 Trace 数量', () => {
      // 添加超过 100 个 trace，验证最旧的被自动完成
      for (let i = 0; i < 105; i++) {
        aggregator.addSpan({
          traceId: `trace-${i}`,
          spanId: `span-${i}`,
          name: 'root',
          startTime: Date.now(),
          status: 'in_progress',
          attributes: {},
          events: []
        });
      }
      
      // 最多保留 100 个待处理
      expect(aggregator.getPendingTraceIds().length).toBeLessThanOrEqual(100);
    });
  });

  describe('flushCompletedTraces', () => {
    it('应获取已完成的 Trace 并清空缓冲区', () => {
      const traceId = 'trace-1';
      const span: Span = {
        traceId,
        spanId: 'span-1',
        name: 'test',
        startTime: Date.now(),
        endTime: Date.now() + 100,
        status: 'ok',
        attributes: {},
        events: []
      };

      aggregator.addSpan(span);
      aggregator.completeTrace(traceId, 'success');
      
      const completed = aggregator.flushCompletedTraces();
      expect(completed).toHaveLength(1);
      
      // 再次获取应为空
      const empty = aggregator.flushCompletedTraces();
      expect(empty).toHaveLength(0);
    });
  });

  describe('错误状态计算', () => {
    it('应正确计算错误数量', () => {
      const traceId = 'trace-1';
      const now = Date.now();
      
      // 添加 error span
      aggregator.addSpan({
        traceId,
        spanId: 'span-1',
        name: 'error-span',
        startTime: now,
        endTime: now + 100,
        status: 'error',
        attributes: {},
        events: []
      });
      
      // 添加 error log
      aggregator.addLog({
        level: 'error',
        message: 'error log',
        timestamp: now,
        traceId
      });

      const trace = aggregator.completeTrace(traceId, 'success');
      expect(trace?.metadata.errorCount).toBe(2);
      expect(trace?.status).toBe('error');
    });
  });
});
