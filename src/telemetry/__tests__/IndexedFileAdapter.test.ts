import { IndexedFileAdapter } from '../adapters/IndexedFileAdapter';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('IndexedFileAdapter', () => {
  let adapter: IndexedFileAdapter;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-test-'));
    adapter = new IndexedFileAdapter({
      outputDir: tempDir,
      persistIntervalMs: 100
    });
  });

  afterEach(async () => {
    await adapter.close();
    fs.rmSync(tempDir, { recursive: true });
  });

  describe('trace 生命周期', () => {
    it('应记录并完成 trace', async () => {
      const span = adapter.startSpan('test-operation');
      
      adapter.addSpanEvent(span, 'step1', { detail: 'value' });
      adapter.counter('test.counter', 1, { traceId: span.traceId });
      adapter.log('info', '测试消息', { traceId: span.traceId });
      
      adapter.endSpan(span, 'ok');
      await adapter.flush();

      const stats = adapter.getStats();
      expect(stats.totalTraces).toBe(1);
    });

    it('应支持子 span', async () => {
      const rootSpan = adapter.startSpan('root');
      const childSpan = adapter.startSpan('child', { 
        traceId: rootSpan.traceId, 
        spanId: rootSpan.spanId 
      });

      adapter.endSpan(childSpan, 'ok');
      adapter.endSpan(rootSpan, 'ok');
      
      await adapter.flush();

      const trace = adapter.getTrace(rootSpan.traceId);
      expect(trace).not.toBeNull();
      expect(trace?.spans).toHaveLength(2);
      expect(trace?.metadata.totalSpans).toBe(2);
    });

    it('应查询 traces', async () => {
      // 创建两个 trace
      const span1 = adapter.startSpan('op1');
      span1.attributes = { taskId: 'task-a' };
      adapter.endSpan(span1, 'ok');

      const span2 = adapter.startSpan('op2');
      span2.attributes = { taskId: 'task-b' };
      adapter.endSpan(span2, 'error');

      await adapter.flush();

      const allTraces = adapter.queryTraces({});
      expect(allTraces.total).toBe(2);

      const successTraces = adapter.queryTraces({ status: 'success' });
      expect(successTraces.total).toBe(1);
    });
  });

  describe('trace 检索', () => {
    it('应根据 ID 检索完整 trace', async () => {
      const span = adapter.startSpan('test');
      adapter.timer('duration', 100, { traceId: span.traceId });
      adapter.endSpan(span, 'ok');
      
      await adapter.flush();

      const trace = adapter.getTrace(span.traceId);
      expect(trace).not.toBeNull();
      expect(trace?.rootSpanName).toBe('test');
      expect(trace?.metrics).toHaveLength(1);
    });

    it('不存在的 trace 应返回 null', () => {
      const trace = adapter.getTrace('non-existent');
      expect(trace).toBeNull();
    });
  });
});
