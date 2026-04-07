import * as fs from 'fs';
import * as path from 'path';
import { FileAdapter } from '../adapters/FileAdapter';
import { LoopMetricsCollector, LLMMetricsCollector, LLMCallMetrics } from '../collectors';

describe('LoopMetricsCollector', () => {
  const testDir = path.join(__dirname, 'test-loop-metrics');
  let adapter: FileAdapter;
  let collector: LoopMetricsCollector;

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    adapter = new FileAdapter({ outputDir: testDir });
    collector = new LoopMetricsCollector(adapter);
  });

  afterEach(async () => {
    await adapter.close();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('should record task start', () => {
    collector.recordTaskStart('test-task', 'task-1');
    // Verify by checking file or mocking - implementation depends on verification approach
    expect(() => collector.recordTaskStart('test-task', 'task-1')).not.toThrow();
  });

  test('should record task complete', () => {
    collector.recordTaskComplete('test-task', 'task-1', 1500, true);
    expect(() => collector.recordTaskComplete('test-task', 'task-1', 1500, true)).not.toThrow();
  });

  test('should record queue depth', () => {
    collector.recordQueueDepth(5);
    expect(() => collector.recordQueueDepth(5)).not.toThrow();
  });
});

describe('LLMMetricsCollector', () => {
  const testDir = path.join(__dirname, 'test-llm-metrics');
  let adapter: FileAdapter;
  let collector: LLMMetricsCollector;

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    adapter = new FileAdapter({ outputDir: testDir });
    collector = new LLMMetricsCollector(adapter);
  });

  afterEach(async () => {
    await adapter.close();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('should record LLM call metrics', () => {
    const metrics: LLMCallMetrics = {
      provider: 'openai',
      model: 'gpt-4',
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      durationMs: 2000,
      success: true
    };
    collector.recordCall(metrics);
    expect(() => collector.recordCall(metrics)).not.toThrow();
  });

  test('should estimate cost correctly', () => {
    const cost = collector.estimateCost('gpt-4', 'gpt-4', 1000);
    expect(cost).toBe(0.03); // $0.03 per 1K tokens
  });
});
