import { IndexManager } from '../storage/IndexManager';
import { CompleteTrace } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('IndexManager', () => {
  let indexManager: IndexManager;
  let tempDir: string;
  let indexPath: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-test-'));
    indexPath = path.join(tempDir, 'index.json');
    indexManager = new IndexManager({ indexPath, persistIntervalMs: 100 });
  });

  afterEach(async () => {
    await indexManager.close();
    fs.rmSync(tempDir, { recursive: true });
  });

  const createMockTrace = (id: string, taskId?: string): CompleteTrace => ({
    traceId: id,
    taskId,
    startTime: Date.now(),
    endTime: Date.now() + 1000,
    durationMs: 1000,
    status: 'success',
    rootSpanName: 'test',
    spans: [],
    metrics: [],
    logs: [],
    metadata: { totalSpans: 0, totalMetrics: 0, totalLogs: 0, errorCount: 0 }
  });

  describe('indexTrace', () => {
    it('应将 Trace 添加到索引', () => {
      const trace = createMockTrace('trace-1', 'task-1');
      indexManager.indexTrace(trace, '/path/to/trace.json');

      expect(indexManager.getTraceCount()).toBe(1);
    });
  });

  describe('query', () => {
    beforeEach(() => {
      indexManager.indexTrace(createMockTrace('trace-1', 'task-a'), '/path/1.json');
      indexManager.indexTrace(createMockTrace('trace-2', 'task-a'), '/path/2.json');
      indexManager.indexTrace(createMockTrace('trace-3', 'task-b'), '/path/3.json');
    });

    it('应按 traceId 过滤', () => {
      const result = indexManager.query({ traceId: 'trace-1' });
      expect(result.traces).toHaveLength(1);
      expect(result.traces[0].traceId).toBe('trace-1');
    });

    it('应按 taskId 过滤', () => {
      const result = indexManager.query({ taskId: 'task-a' });
      expect(result.traces).toHaveLength(2);
    });

    it('应支持分页', () => {
      const result = indexManager.query({ limit: 2, offset: 0 });
      expect(result.traces).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('persistence', () => {
    it('应持久化并重新加载索引', async () => {
      const trace = createMockTrace('trace-1');
      indexManager.indexTrace(trace, '/path/to/trace.json');
      
      await indexManager.persist();
      
      // 创建指向相同文件的新实例
      const newManager = new IndexManager({ indexPath });
      
      expect(newManager.getTraceCount()).toBe(1);
      expect(newManager.getTraceEntry('trace-1')).toBeDefined();
      
      await newManager.close();
    });
  });
});
