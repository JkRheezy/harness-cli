import * as fs from 'fs';
import * as path from 'path';
import { FileAdapter } from '../adapters/FileAdapter';

describe('FileAdapter', () => {
  const testDir = path.join(__dirname, 'test-telemetry');
  let adapter: FileAdapter;

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    adapter = new FileAdapter({ outputDir: testDir });
  });

  afterEach(async () => {
    await adapter.close();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('should write counter metric to file', async () => {
    adapter.counter('test.counter', 1, { tag: 'value' });
    await adapter.flush();

    const files = fs.readdirSync(testDir).filter(f => f.startsWith('metrics-'));
    expect(files.length).toBeGreaterThan(0);

    const content = fs.readFileSync(path.join(testDir, files[0]), 'utf-8');
    const metric = JSON.parse(content.trim());
    expect(metric.name).toBe('test.counter');
    expect(metric.type).toBe('counter');
    expect(metric.value).toBe(1);
    expect(metric.tags).toEqual({ tag: 'value' });
  });

  test('should write gauge metric to file', async () => {
    adapter.gauge('test.gauge', 42);
    await adapter.flush();

    const files = fs.readdirSync(testDir).filter(f => f.startsWith('metrics-'));
    const content = fs.readFileSync(path.join(testDir, files[0]), 'utf-8');
    const lines = content.trim().split('\n');
    const metric = JSON.parse(lines[0]);
    expect(metric.name).toBe('test.gauge');
    expect(metric.type).toBe('gauge');
    expect(metric.value).toBe(42);
  });

  test('should write timer metric to file', async () => {
    adapter.timer('test.timer', 1500);
    await adapter.flush();

    const files = fs.readdirSync(testDir).filter(f => f.startsWith('metrics-'));
    const content = fs.readFileSync(path.join(testDir, files[0]), 'utf-8');
    const metric = JSON.parse(content.trim());
    expect(metric.name).toBe('test.timer');
    expect(metric.type).toBe('timer');
    expect(metric.value).toBe(1500);
  });

  test('should create and end span', async () => {
    const span = adapter.startSpan('test-operation');
    expect(span.name).toBe('test-operation');
    expect(span.status).toBe('in_progress');
    expect(span.traceId).toBeDefined();
    expect(span.spanId).toBeDefined();

    adapter.addSpanEvent(span, 'test-event', { key: 'value' });
    adapter.endSpan(span, 'ok');
    await adapter.flush();

    const files = fs.readdirSync(testDir).filter(f => f.startsWith('spans-'));
    expect(files.length).toBeGreaterThan(0);
    
    const content = fs.readFileSync(path.join(testDir, files[0]), 'utf-8');
    const savedSpan = JSON.parse(content.trim());
    expect(savedSpan.name).toBe('test-operation');
    expect(savedSpan.status).toBe('ok');
    expect(savedSpan.events).toHaveLength(1);
    expect(savedSpan.events[0].name).toBe('test-event');
  });

  test('should write log entry', async () => {
    adapter.log('info', 'Test message', { key: 'value' });
    await adapter.flush();

    const files = fs.readdirSync(testDir).filter(f => f.startsWith('logs-'));
    expect(files.length).toBeGreaterThan(0);
    
    const content = fs.readFileSync(path.join(testDir, files[0]), 'utf-8');
    const entry = JSON.parse(content.trim());
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('Test message');
    expect(entry.context).toEqual({ key: 'value' });
  });

  test('should handle error span status', async () => {
    const span = adapter.startSpan('error-operation');
    adapter.endSpan(span, 'error');
    await adapter.flush();

    const files = fs.readdirSync(testDir).filter(f => f.startsWith('spans-'));
    const content = fs.readFileSync(path.join(testDir, files[0]), 'utf-8');
    const savedSpan = JSON.parse(content.trim());
    expect(savedSpan.status).toBe('error');
  });

  test('should create output directory if not exists', () => {
    const newDir = path.join(testDir, 'nested', 'dir');
    const newAdapter = new FileAdapter({ outputDir: newDir });
    
    expect(fs.existsSync(newDir)).toBe(true);
    newAdapter.close();
  });
});
