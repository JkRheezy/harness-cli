# Enhanced Telemetry Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an enhanced telemetry system with trace aggregation, indexing, and Web UI for full observability

**Architecture:** Extend existing FileAdapter to aggregate spans/metrics/logs into trace files by traceId. Add in-memory index with disk persistence for fast querying. Build lightweight HTTP server with vanilla JS frontend for trace visualization (flame graph) and filtering.

**Tech Stack:** Node.js native http module, vanilla HTML/JS/CSS, no external frontend framework

---

## File Structure Overview

```
src/telemetry/
├── types.ts                    # Extend: Add CompleteTrace interface
├── adapters/
│   ├── FileAdapter.ts          # Modify: Add trace aggregation
│   └── IndexedFileAdapter.ts   # Create: Indexed adapter with query support
├── storage/
│   ├── TraceAggregator.ts      # Create: Aggregate spans/metrics/logs by traceId
│   └── IndexManager.ts         # Create: Manage trace indices
├── server/
│   ├── TelemetryServer.ts      # Create: HTTP server
│   ├── routes.ts               # Create: API routes
│   └── static/                 # Create: Frontend assets
│       ├── index.html
│       ├── app.js
│       └── styles.css
├── dashboard/
│   └── TraceViewer.ts          # Create: CLI trace viewer (enhanced from TelemetryDashboard)
└── __tests__/                  # Tests for new components
    ├── TraceAggregator.test.ts
    ├── IndexManager.test.ts
    └── TelemetryServer.test.ts
```

---

## Task 1: Extend Telemetry Types

**Files:**
- Modify: `src/telemetry/types.ts`

**Purpose:** Add CompleteTrace interface and related types for aggregated trace storage

- [ ] **Step 1: Add CompleteTrace and related interfaces**

Add to `src/telemetry/types.ts` after line 48 (after LogEntry interface):

```typescript
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
```

- [ ] **Step 2: Commit changes**

```bash
git add src/telemetry/types.ts
git commit -m "feat(telemetry): add CompleteTrace and query types"
```

---

## Task 2: Create TraceAggregator

**Files:**
- Create: `src/telemetry/storage/TraceAggregator.ts`

**Purpose:** Aggregate spans, metrics, and logs into CompleteTrace objects

- [ ] **Step 1: Create TraceAggregator class**

```typescript
import { Span, Metric, LogEntry, CompleteTrace, TraceMetadata } from '../types';

interface PendingTrace {
  traceId: string;
  taskId?: string;
  spans: Map<string, Span>;
  metrics: Metric[];
  logs: LogEntry[];
  startTime: number;
  rootSpanName: string;
}

/**
 * 按 traceId 聚合 Telemetry 数据为完整 Trace
 * 维护内存中活跃 Trace 状态，完成后刷新到磁盘
 */
export class TraceAggregator {
  private pendingTraces: Map<string, PendingTrace> = new Map();
  private completedTraces: CompleteTrace[] = [];
  private maxPendingTraces: number = 100;
  private maxTraceAgeMs: number = 5 * 60 * 1000; // 5 minutes

  /**
   * 添加 Span 到聚合器
   * 如果 traceId 未见过，则创建新的待处理 Trace
   */
  addSpan(span: Span): void {
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

    // Check if this span has taskId in attributes
    if (span.attributes?.taskId && !pending.taskId) {
      pending.taskId = String(span.attributes.taskId);
    }

    pending.spans.set(span.spanId, span);

    // If this is a root span (no parent), update rootSpanName
    if (!span.parentSpanId && span.name !== pending.rootSpanName) {
      pending.rootSpanName = span.name;
    }

    this.enforceLimits();
  }

  /**
   * 添加 Metric 到聚合器
   * 如果包含 traceId 标签，则关联到对应 Trace
   */
  addMetric(metric: Metric): void {
    const traceId = metric.tags?.traceId as string;
    if (!traceId) return;

    const pending = this.pendingTraces.get(traceId);
    if (pending) {
      pending.metrics.push(metric);
    }
  }

  /**
   * 添加 Log 条目到聚合器
   * 如果包含 traceId，则关联到对应 Trace
   */
  addLog(log: LogEntry): void {
    if (!log.traceId) return;

    const pending = this.pendingTraces.get(log.traceId);
    if (pending) {
      pending.logs.push(log);
    }
  }

  /**
   * 当根 Span 结束时，标记 Trace 为已完成
   */
  completeTrace(traceId: string, status: 'success' | 'error'): CompleteTrace | null {
    const pending = this.pendingTraces.get(traceId);
    if (!pending) return null;

    const completeTrace = this.buildCompleteTrace(pending, status);
    this.pendingTraces.delete(traceId);
    this.completedTraces.push(completeTrace);
    
    return completeTrace;
  }

  /**
   * 获取所有已完成的 Trace 并清空缓冲区
   */
  flushCompletedTraces(): CompleteTrace[] {
    const traces = [...this.completedTraces];
    this.completedTraces = [];
    return traces;
  }

  /**
   * 获取当前待处理的 Trace ID 列表（用于调试）
   */
  getPendingTraceIds(): string[] {
    return Array.from(this.pendingTraces.keys());
  }

  /**
   * 强制完成所有待处理的 Trace（关闭时调用）
   */
  flushAll(): CompleteTrace[] {
    const traces: CompleteTrace[] = [];
    
    for (const [traceId, pending] of this.pendingTraces) {
      traces.push(this.buildCompleteTrace(pending, 'error'));
    }
    
    this.pendingTraces.clear();
    traces.push(...this.completedTraces);
    this.completedTraces = [];
    
    return traces;
  }

  private buildCompleteTrace(pending: PendingTrace, status: 'success' | 'error'): CompleteTrace {
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

  private enforceLimits(): void {
    // If too many pending traces, complete the oldest ones
    if (this.pendingTraces.size > this.maxPendingTraces) {
      const oldestTraceId = this.pendingTraces.keys().next().value;
      if (oldestTraceId) {
        this.completeTrace(oldestTraceId, 'error');
      }
    }

    // Complete traces that have been pending too long
    const now = Date.now();
    for (const [traceId, pending] of this.pendingTraces) {
      if (now - pending.startTime > this.maxTraceAgeMs) {
        this.completeTrace(traceId, 'error');
      }
    }
  }
}
```

- [ ] **Step 2: Create test file for TraceAggregator**

Create `src/telemetry/__tests__/TraceAggregator.test.ts`:

```typescript
import { TraceAggregator } from '../storage/TraceAggregator';
import { Span, Metric, LogEntry } from '../types';

describe('TraceAggregator', () => {
  let aggregator: TraceAggregator;

  beforeEach(() => {
    aggregator = new TraceAggregator();
  });

  describe('addSpan', () => {
    it('should create new pending trace for new traceId', () => {
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

    it('should add span to existing trace', () => {
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

    it('should extract taskId from span attributes', () => {
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
    it('should build complete trace with all data', () => {
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

    it('should return null for non-existent trace', () => {
      const trace = aggregator.completeTrace('non-existent', 'success');
      expect(trace).toBeNull();
    });
  });

  describe('flushAll', () => {
    it('should complete all pending traces', () => {
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
```

- [ ] **Step 3: Run tests to verify**

```bash
cd harness-cli
npm test -- src/telemetry/__tests__/TraceAggregator.test.ts
```
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/telemetry/storage/TraceAggregator.ts src/telemetry/__tests__/TraceAggregator.test.ts
git commit -m "feat(telemetry): add TraceAggregator for trace aggregation"
```

---

## Task 3: Create IndexManager

**Files:**
- Create: `src/telemetry/storage/IndexManager.ts`

**Purpose:** Manage trace index for fast querying with disk persistence

- [ ] **Step 1: Create IndexManager class**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { TraceIndexEntry, TraceQuery, TraceQueryResult, CompleteTrace } from '../types';

interface IndexData {
  version: number;
  lastUpdated: number;
  entries: TraceIndexEntry[];
}

/**
 * 管理 Trace 索引以支持快速查询
 * 维护内存索引，定期持久化到磁盘
 */
export class IndexManager {
  private indexPath: string;
  private entries: Map<string, TraceIndexEntry> = new Map();
  private dirty: boolean = false;
  private persistIntervalMs: number = 5000;
  private persistTimer?: NodeJS.Timeout;

  constructor(options: { indexPath: string; persistIntervalMs?: number }) {
    this.indexPath = options.indexPath;
    this.persistIntervalMs = options.persistIntervalMs ?? 5000;
    this.loadIndex();
    this.startAutoPersist();
  }

  /**
   * 添加或更新 Trace 索引条目
   */
  indexTrace(trace: CompleteTrace, filePath: string): void {
    const entry: TraceIndexEntry = {
      traceId: trace.traceId,
      taskId: trace.taskId,
      startTime: trace.startTime,
      endTime: trace.endTime,
      status: trace.status,
      filePath,
      rootSpanName: trace.rootSpanName
    };

    this.entries.set(trace.traceId, entry);
    this.dirty = true;
  }

  /**
   * 使用过滤条件查询 Trace
   */
  query(query: TraceQuery): TraceQueryResult {
    let results = Array.from(this.entries.values());

    // Apply filters
    if (query.traceId) {
      results = results.filter(e => e.traceId === query.traceId);
    }
    if (query.taskId) {
      results = results.filter(e => e.taskId === query.taskId);
    }
    if (query.status) {
      results = results.filter(e => e.status === query.status);
    }
    if (query.fromTime) {
      results = results.filter(e => e.startTime >= query.fromTime!);
    }
    if (query.toTime) {
      results = results.filter(e => e.startTime <= query.toTime!);
    }

    // Sort by start time desc (newest first)
    results.sort((a, b) => b.startTime - a.startTime);

    const total = results.length;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;

    return {
      traces: results.slice(offset, offset + limit),
      total,
      hasMore: offset + limit < total
    };
  }

  /**
   * 根据 ID 获取单个 Trace 条目
   */
  getTraceEntry(traceId: string): TraceIndexEntry | undefined {
    return this.entries.get(traceId);
  }

  /**
   * 获取已索引的 Trace 总数
   */
  getTraceCount(): number {
    return this.entries.size;
  }

  /**
   * 获取时间范围内的 Trace（用于清理）
   */
  getTracesBefore(timestamp: number): TraceIndexEntry[] {
    return Array.from(this.entries.values())
      .filter(e => e.startTime < timestamp);
  }

  /**
   * 从索引中移除 Trace
   */
  removeTraces(traceIds: string[]): void {
    for (const id of traceIds) {
      this.entries.delete(id);
    }
    this.dirty = true;
  }

  /**
   * 将索引持久化到磁盘
   */
  async persist(): Promise<void> {
    if (!this.dirty) return;

    const data: IndexData = {
      version: 1,
      lastUpdated: Date.now(),
      entries: Array.from(this.entries.values())
    };

    const dir = path.dirname(this.indexPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to temp file then rename for atomicity
    const tempPath = `${this.indexPath}.tmp`;
    await fs.promises.writeFile(tempPath, JSON.stringify(data, null, 2));
    await fs.promises.rename(tempPath, this.indexPath);

    this.dirty = false;
  }

  /**
   * 从磁盘加载索引
   */
  private loadIndex(): void {
    if (!fs.existsSync(this.indexPath)) {
      return;
    }

    try {
      const data: IndexData = JSON.parse(fs.readFileSync(this.indexPath, 'utf-8'));
      
      if (data.version !== 1) {
        console.warn(`[IndexManager] Unknown index version: ${data.version}`);
        return;
      }

      for (const entry of data.entries) {
        this.entries.set(entry.traceId, entry);
      }
    } catch (error) {
      console.error('[IndexManager] Failed to load index:', error);
    }
  }

  /**
   * 启动自动持久化定时器
   */
  private startAutoPersist(): void {
    this.persistTimer = setInterval(() => {
      this.persist().catch(err => {
        console.error('[IndexManager] Auto-persist failed:', err);
      });
    }, this.persistIntervalMs);
  }

  /**
   * 停止自动持久化
   */
  async close(): Promise<void> {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
    }
    await this.persist();
  }
}
```

- [ ] **Step 2: Create test file for IndexManager**

Create `src/telemetry/__tests__/IndexManager.test.ts`:

```typescript
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
    it('should add trace to index', () => {
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

    it('should filter by traceId', () => {
      const result = indexManager.query({ traceId: 'trace-1' });
      expect(result.traces).toHaveLength(1);
      expect(result.traces[0].traceId).toBe('trace-1');
    });

    it('should filter by taskId', () => {
      const result = indexManager.query({ taskId: 'task-a' });
      expect(result.traces).toHaveLength(2);
    });

    it('should support pagination', () => {
      const result = indexManager.query({ limit: 2, offset: 0 });
      expect(result.traces).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should persist and reload index', async () => {
      const trace = createMockTrace('trace-1');
      indexManager.indexTrace(trace, '/path/to/trace.json');
      
      await indexManager.persist();
      
      // Create new instance pointing to same file
      const newManager = new IndexManager({ indexPath });
      
      expect(newManager.getTraceCount()).toBe(1);
      expect(newManager.getTraceEntry('trace-1')).toBeDefined();
      
      await newManager.close();
    });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- src/telemetry/__tests__/IndexManager.test.ts
```
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/telemetry/storage/IndexManager.ts src/telemetry/__tests__/IndexManager.test.ts
git commit -m "feat(telemetry): add IndexManager for trace indexing and querying"
```

---

## Task 4: Create IndexedFileAdapter

**Files:**
- Create: `src/telemetry/adapters/IndexedFileAdapter.ts`
- Modify: `src/telemetry/adapters/index.ts`

**Purpose:** Enhanced FileAdapter with trace aggregation and indexing

- [ ] **Step 1: Create IndexedFileAdapter**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { TelemetryProvider, Metric, Span, LogEntry, Tags, SpanContext, LogLevel, CompleteTrace, TraceQuery, TraceQueryResult } from '../types';
import { TraceAggregator } from '../storage/TraceAggregator';
import { IndexManager } from '../storage/IndexManager';

interface IndexedFileAdapterOptions {
  outputDir: string;
  maxFileSizeMB?: number;
  retentionDays?: number;
  persistIntervalMs?: number;
}

/**
 * 增强版 FileAdapter，支持 Trace 聚合和索引
 * 将完整 Trace 存储为独立 JSON 文件以便快速检索
 */
export class IndexedFileAdapter extends TelemetryProvider {
  private options: IndexedFileAdapterOptions;
  private traceDir: string;
  private aggregator: TraceAggregator;
  private indexManager: IndexManager;
  private flushInterval?: NodeJS.Timeout;

  constructor(options: IndexedFileAdapterOptions) {
    super({ adapter: 'file' } as any);
    
    this.options = {
      outputDir: options.outputDir,
      maxFileSizeMB: options.maxFileSizeMB || 10,
      retentionDays: options.retentionDays || 7,
      persistIntervalMs: options.persistIntervalMs || 5000
    };

    this.traceDir = path.join(this.options.outputDir, 'traces');
    this.ensureDirectories();

    this.aggregator = new TraceAggregator();
    this.indexManager = new IndexManager({
      indexPath: path.join(this.options.outputDir, 'index', 'traces.json'),
      persistIntervalMs: this.options.persistIntervalMs
    });

    this.startAutoFlush();
  }

  // 指标
  counter(name: string, value: number, tags?: Tags): void {
    const metric: Metric = {
      name,
      type: 'counter',
      value,
      timestamp: Date.now(),
      tags
    };
    this.aggregator.addMetric(metric);
  }

  gauge(name: string, value: number, tags?: Tags): void {
    const metric: Metric = {
      name,
      type: 'gauge',
      value,
      timestamp: Date.now(),
      tags
    };
    this.aggregator.addMetric(metric);
  }

  histogram(name: string, value: number, tags?: Tags): void {
    const metric: Metric = {
      name,
      type: 'histogram',
      value,
      timestamp: Date.now(),
      tags
    };
    this.aggregator.addMetric(metric);
  }

  timer(name: string, durationMs: number, tags?: Tags): void {
    const metric: Metric = {
      name,
      type: 'timer',
      value: durationMs,
      timestamp: Date.now(),
      tags
    };
    this.aggregator.addMetric(metric);
  }

  // 追踪
  startSpan(name: string, parentContext?: SpanContext): Span {
    const span: Span = {
      traceId: parentContext?.traceId || this.generateId(),
      spanId: this.generateId(),
      parentSpanId: parentContext?.spanId,
      name,
      startTime: Date.now(),
      status: 'in_progress',
      attributes: {},
      events: []
    };
    this.aggregator.addSpan(span);
    return span;
  }

  endSpan(span: Span, status: 'ok' | 'error' = 'ok'): void {
    span.endTime = Date.now();
    span.status = status;
    this.aggregator.addSpan(span);

    // If this is a root span, complete the trace
    if (!span.parentSpanId) {
      const completeTrace = this.aggregator.completeTrace(
        span.traceId,
        status === 'ok' ? 'success' : 'error'
      );
      if (completeTrace) {
        this.saveTrace(completeTrace);
      }
    }
  }

  addSpanEvent(span: Span, name: string, attributes?: Record<string, unknown>): void {
    span.events.push({
      name,
      timestamp: Date.now(),
      attributes
    });
  }

  // 日志
  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      traceId: context?.traceId as string,
      spanId: context?.spanId as string
    };
    this.aggregator.addLog(entry);
  }

  // 查询 API
  queryTraces(query: TraceQuery): TraceQueryResult {
    return this.indexManager.query(query);
  }

  getTrace(traceId: string): CompleteTrace | null {
    const entry = this.indexManager.getTraceEntry(traceId);
    if (!entry) return null;

    try {
      const content = fs.readFileSync(entry.filePath, 'utf-8');
      return JSON.parse(content) as CompleteTrace;
    } catch (error) {
      console.error(`[IndexedFileAdapter] Failed to load trace ${traceId}:`, error);
      return null;
    }
  }

  getStats(): { totalTraces: number; pendingTraces: number } {
    return {
      totalTraces: this.indexManager.getTraceCount(),
      pendingTraces: this.aggregator.getPendingTraceIds().length
    };
  }

  // 生命周期
  async flush(): Promise<void> {
    const traces = this.aggregator.flushCompletedTraces();
    for (const trace of traces) {
      await this.saveTrace(trace);
    }
    await this.indexManager.persist();
  }

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Flush all pending traces
    const traces = this.aggregator.flushAll();
    for (const trace of traces) {
      await this.saveTrace(trace);
    }

    await this.indexManager.close();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.traceDir)) {
      fs.mkdirSync(this.traceDir, { recursive: true });
    }
  }

  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveTrace(trace: CompleteTrace): Promise<void> {
    const dateDir = new Date(trace.startTime).toISOString().split('T')[0];
    const traceDir = path.join(this.traceDir, dateDir);
    
    if (!fs.existsSync(traceDir)) {
      fs.mkdirSync(traceDir, { recursive: true });
    }

    const filePath = path.join(traceDir, `${trace.traceId}.json`);
    
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(trace, null, 2));
      this.indexManager.indexTrace(trace, filePath);
    } catch (error) {
      console.error(`[IndexedFileAdapter] Failed to save trace ${trace.traceId}:`, error);
    }
  }

  private startAutoFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch(err => {
        console.error('[IndexedFileAdapter] Auto-flush failed:', err);
      });
    }, this.options.persistIntervalMs);
  }
}
```

- [ ] **Step 2: Update adapters index export**

Modify `src/telemetry/adapters/index.ts`:

```typescript
export { FileAdapter } from './FileAdapter';
export { IndexedFileAdapter } from './IndexedFileAdapter';
```

- [ ] **Step 3: Create test for IndexedFileAdapter**

Create `src/telemetry/__tests__/IndexedFileAdapter.test.ts`:

```typescript
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

  describe('trace lifecycle', () => {
    it('should record and complete a trace', async () => {
      const span = adapter.startSpan('test-operation');
      
      adapter.addSpanEvent(span, 'step1', { detail: 'value' });
      adapter.counter('test.counter', 1, { traceId: span.traceId });
      adapter.log('info', 'Test message', { traceId: span.traceId });
      
      adapter.endSpan(span, 'ok');
      await adapter.flush();

      const stats = adapter.getStats();
      expect(stats.totalTraces).toBe(1);
    });

    it('should support child spans', async () => {
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

    it('should query traces', async () => {
      // Create two traces
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

  describe('trace retrieval', () => {
    it('should retrieve complete trace by ID', async () => {
      const span = adapter.startSpan('test');
      adapter.timer('duration', 100, { traceId: span.traceId });
      adapter.endSpan(span, 'ok');
      
      await adapter.flush();

      const trace = adapter.getTrace(span.traceId);
      expect(trace).not.toBeNull();
      expect(trace?.rootSpanName).toBe('test');
      expect(trace?.metrics).toHaveLength(1);
    });

    it('should return null for non-existent trace', () => {
      const trace = adapter.getTrace('non-existent');
      expect(trace).toBeNull();
    });
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/telemetry/__tests__/IndexedFileAdapter.test.ts
```
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/telemetry/adapters/IndexedFileAdapter.ts src/telemetry/adapters/index.ts src/telemetry/__tests__/IndexedFileAdapter.test.ts
git commit -m "feat(telemetry): add IndexedFileAdapter with trace aggregation and querying"
```

---

## Task 5: Create Telemetry Web Server

**Files:**
- Create: `src/telemetry/server/TelemetryServer.ts`
- Create: `src/telemetry/server/routes.ts`

**Purpose:** HTTP server providing REST API for trace queries

- [ ] **Step 1: Create routes module**

Create `src/telemetry/server/routes.ts`:

```typescript
import { IncomingMessage, ServerResponse } from 'http';
import { IndexedFileAdapter } from '../adapters/IndexedFileAdapter';
import { TraceQuery } from '../types';

export function createRoutes(adapter: IndexedFileAdapter) {
  return {
    // GET /api/traces - 查询 Trace 列表
    async listTraces(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const query: TraceQuery = {
        traceId: url.searchParams.get('traceId') || undefined,
        taskId: url.searchParams.get('taskId') || undefined,
        status: url.searchParams.get('status') as any || undefined,
        fromTime: url.searchParams.get('from') ? parseInt(url.searchParams.get('from')!) : undefined,
        toTime: url.searchParams.get('to') ? parseInt(url.searchParams.get('to')!) : undefined,
        limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 20,
        offset: url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : 0
      };

      const result = adapter.queryTraces(query);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    },

    // GET /api/traces/:id - 获取单个 Trace
    async getTrace(req: IncomingMessage, res: ServerResponse, traceId: string): Promise<void> {
      const trace = adapter.getTrace(traceId);
      
      if (!trace) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Trace not found' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(trace));
    },

    // GET /api/stats - 获取 Telemetry 统计
    async getStats(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const stats = adapter.getStats();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
    },

    // GET /health - 健康检查
    async health(req: IncomingMessage, res: ServerResponse): Promise<void> {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    }
  };
}

export type Routes = ReturnType<typeof createRoutes>;
```

- [ ] **Step 2: Create TelemetryServer**

Create `src/telemetry/server/TelemetryServer.ts`:

```typescript
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { IndexedFileAdapter } from '../adapters/IndexedFileAdapter';
import { createRoutes } from './routes';

interface TelemetryServerOptions {
  adapter: IndexedFileAdapter;
  port?: number;
  staticDir?: string;
}

/**
 * Telemetry Web UI 和 API 的 HTTP 服务器
 * 提供静态前端文件和 REST API 用于 Trace 查询
 */
export class TelemetryServer {
  private adapter: IndexedFileAdapter;
  private port: number;
  private staticDir: string;
  private server?: http.Server;
  private routes: ReturnType<typeof createRoutes>;

  constructor(options: TelemetryServerOptions) {
    this.adapter = options.adapter;
    this.port = options.port || 9999;
    this.staticDir = options.staticDir || path.join(__dirname, 'static');
    this.routes = createRoutes(this.adapter);
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
    
    return new Promise((resolve, reject) => {
      this.server!.listen(this.port, () => {
        console.log(`[TelemetryServer] Running at http://localhost:${this.port}`);
        resolve();
      });
      
      this.server!.on('error', reject);
    });
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // API 路由
      if (pathname === '/api/traces') {
        await this.routes.listTraces(req, res);
        return;
      }

      if (pathname.startsWith('/api/traces/')) {
        const traceId = pathname.replace('/api/traces/', '');
        await this.routes.getTrace(req, res, traceId);
        return;
      }

      if (pathname === '/api/stats') {
        await this.routes.getStats(req, res);
        return;
      }

      if (pathname === '/health') {
        await this.routes.health(req, res);
        return;
      }

      // 静态文件
      await this.serveStaticFile(req, res, pathname);
    } catch (error) {
      console.error('[TelemetryServer] Request error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  private async serveStaticFile(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    pathname: string
  ): Promise<void> {
    // 默认为 index.html
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(this.staticDir, filePath);

    // 安全：防止目录遍历
    if (!filePath.startsWith(this.staticDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const contentType = this.getContentType(filePath);
    const content = await fs.promises.readFile(filePath);

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath);
    const types: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };
    return types[ext] || 'application/octet-stream';
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/telemetry/server/routes.ts src/telemetry/server/TelemetryServer.ts
git commit -m "feat(telemetry): add HTTP server with REST API for trace queries"
```

---

## Task 6: Create Web UI Frontend

**Files:**
- Create: `src/telemetry/server/static/index.html`
- Create: `src/telemetry/server/static/styles.css`
- Create: `src/telemetry/server/static/app.js`

**Purpose:** Vanilla JS frontend for trace visualization

- [ ] **Step 1: Create HTML**

Create `src/telemetry/server/static/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Harness Telemetry</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>🔍 Harness Telemetry</h1>
      <div id="stats" class="stats">Loading...</div>
    </header>

    <div class="filters">
      <input type="text" id="traceIdFilter" placeholder="Trace ID">
      <input type="text" id="taskIdFilter" placeholder="Task ID">
      <select id="statusFilter">
        <option value="">All Status</option>
        <option value="success">Success</option>
        <option value="error">Error</option>
        <option value="in_progress">In Progress</option>
      </select>
      <input type="datetime-local" id="fromTime">
      <input type="datetime-local" id="toTime">
      <button id="searchBtn">Search</button>
      <button id="refreshBtn">Refresh</button>
    </div>

    <div class="content">
      <div id="traceList" class="trace-list">
        <div class="loading">Loading traces...</div>
      </div>
      
      <div id="traceDetail" class="trace-detail hidden">
        <div class="detail-header">
          <h2>Trace Detail</h2>
          <button id="closeDetail">×</button>
        </div>
        <div id="detailContent"></div>
      </div>
    </div>

    <div class="pagination">
      <button id="prevBtn" disabled>← Previous</button>
      <span id="pageInfo">Page 1</span>
      <button id="nextBtn" disabled>Next →</button>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create CSS**

Create `src/telemetry/server/static/styles.css`:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
  min-height: 100vh;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #334155;
}

header h1 {
  font-size: 24px;
  font-weight: 600;
}

.stats {
  font-size: 14px;
  color: #94a3b8;
}

.filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  padding: 15px;
  background: #1e293b;
  border-radius: 8px;
}

.filters input,
.filters select {
  padding: 8px 12px;
  background: #334155;
  border: 1px solid #475569;
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 14px;
}

.filters input::placeholder {
  color: #64748b;
}

.filters button {
  padding: 8px 16px;
  background: #3b82f6;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.filters button:hover {
  background: #2563eb;
}

.content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 1024px) {
  .content {
    grid-template-columns: 400px 1fr;
  }
}

.trace-list {
  background: #1e293b;
  border-radius: 8px;
  max-height: 70vh;
  overflow-y: auto;
}

.trace-item {
  padding: 15px;
  border-bottom: 1px solid #334155;
  cursor: pointer;
  transition: background 0.2s;
}

.trace-item:hover {
  background: #334155;
}

.trace-item:last-child {
  border-bottom: none;
}

.trace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.trace-id {
  font-family: monospace;
  font-size: 12px;
  color: #60a5fa;
}

.trace-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.trace-status.success {
  background: #166534;
  color: #86efac;
}

.trace-status.error {
  background: #991b1b;
  color: #fca5a5;
}

.trace-status.in_progress {
  background: #854d0e;
  color: #fde047;
}

.trace-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.trace-meta {
  font-size: 12px;
  color: #94a3b8;
}

.trace-detail {
  background: #1e293b;
  border-radius: 8px;
  padding: 20px;
}

.trace-detail.hidden {
  display: none;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #334155;
}

.detail-header h2 {
  font-size: 18px;
}

.detail-header button {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 24px;
  cursor: pointer;
}

.detail-header button:hover {
  color: #e2e8f0;
}

/* Flame Graph */
.flame-graph {
  margin-top: 20px;
}

.flame-row {
  display: flex;
  align-items: center;
  height: 28px;
  margin-bottom: 2px;
}

.flame-bar {
  height: 100%;
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 12px;
  color: white;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
}

.flame-bar:hover {
  filter: brightness(1.2);
}

.flame-bar.ok {
  background: #059669;
}

.flame-bar.error {
  background: #dc2626;
}

.flame-bar.in_progress {
  background: #d97706;
}

/* Metrics & Logs */
.section {
  margin-top: 20px;
}

.section h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #94a3b8;
}

.metric-item,
.log-item {
  padding: 8px 12px;
  background: #0f172a;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 13px;
  font-family: monospace;
}

.log-item.error {
  border-left: 3px solid #dc2626;
}

.log-item.warn {
  border-left: 3px solid #d97706;
}

.log-item.info {
  border-left: 3px solid #3b82f6;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
}

.pagination button {
  padding: 8px 16px;
  background: #334155;
  border: none;
  border-radius: 4px;
  color: #e2e8f0;
  cursor: pointer;
}

.pagination button:hover:not(:disabled) {
  background: #475569;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading,
.empty {
  padding: 40px;
  text-align: center;
  color: #64748b;
}
```

- [ ] **Step 3: Create JavaScript**

Create `src/telemetry/server/static/app.js`:

```javascript
// Telemetry Web UI
const API_BASE = '/api';

let currentPage = 0;
let currentQuery = {};
let hasMorePages = false;

// DOM 元素
const traceListEl = document.getElementById('traceList');
const traceDetailEl = document.getElementById('traceDetail');
const detailContentEl = document.getElementById('detailContent');
const statsEl = document.getElementById('stats');
const pageInfoEl = document.getElementById('pageInfo');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadTraces();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('searchBtn').addEventListener('click', () => {
    currentPage = 0;
    currentQuery = buildQuery();
    loadTraces();
  });

  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadStats();
    loadTraces();
  });

  document.getElementById('closeDetail').addEventListener('click', () => {
    traceDetailEl.classList.add('hidden');
  });

  prevBtn.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      loadTraces();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (hasMorePages) {
      currentPage++;
      loadTraces();
    }
  });
}

function buildQuery() {
  const traceId = document.getElementById('traceIdFilter').value;
  const taskId = document.getElementById('taskIdFilter').value;
  const status = document.getElementById('statusFilter').value;
  const fromTime = document.getElementById('fromTime').value;
  const toTime = document.getElementById('toTime').value;

  const query = {};
  if (traceId) query.traceId = traceId;
  if (taskId) query.taskId = taskId;
  if (status) query.status = status;
  if (fromTime) query.from = new Date(fromTime).getTime();
  if (toTime) query.to = new Date(toTime).getTime();

  return query;
}

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const stats = await res.json();
    statsEl.textContent = `${stats.totalTraces} traces | ${stats.pendingTraces} pending`;
  } catch (err) {
    statsEl.textContent = 'Failed to load stats';
  }
}

async function loadTraces() {
  traceListEl.innerHTML = '<div class="loading">Loading...</div>';

  const params = new URLSearchParams({
    limit: '20',
    offset: String(currentPage * 20),
    ...currentQuery
  });

  try {
    const res = await fetch(`${API_BASE}/traces?${params}`);
    const data = await res.json();

    hasMorePages = data.hasMore;
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = !hasMorePages;
    pageInfoEl.textContent = `Page ${currentPage + 1}`;

    renderTraceList(data.traces);
  } catch (err) {
    traceListEl.innerHTML = '<div class="empty">Failed to load traces</div>';
  }
}

function renderTraceList(traces) {
  if (traces.length === 0) {
    traceListEl.innerHTML = '<div class="empty">No traces found</div>';
    return;
  }

  traceListEl.innerHTML = traces.map(trace => `
    <div class="trace-item" onclick="showTraceDetail('${trace.traceId}')">
      <div class="trace-header">
        <span class="trace-id">${trace.traceId.slice(0, 16)}...</span>
        <span class="trace-status ${trace.status}">${trace.status}</span>
      </div>
      <div class="trace-name">${trace.rootSpanName}</div>
      <div class="trace-meta">
        ${formatTime(trace.startTime)} | 
        ${trace.durationMs ? (trace.durationMs / 1000).toFixed(2) + 's' : 'in progress'}
      </div>
    </div>
  `).join('');
}

async function showTraceDetail(traceId) {
  detailContentEl.innerHTML = '<div class="loading">Loading...</div>';
  traceDetailEl.classList.remove('hidden');

  try {
    const res = await fetch(`${API_BASE}/traces/${traceId}`);
    const trace = await res.json();
    renderTraceDetail(trace);
  } catch (err) {
    detailContentEl.innerHTML = '<div class="empty">Failed to load trace</div>';
  }
}

function renderTraceDetail(trace) {
  const duration = trace.durationMs ? (trace.durationMs / 1000).toFixed(3) + 's' : 'N/A';

  detailContentEl.innerHTML = `
    <div class="trace-info">
      <p><strong>Trace ID:</strong> <code>${trace.traceId}</code></p>
      <p><strong>Task ID:</strong> ${trace.taskId || 'N/A'}</p>
      <p><strong>Status:</strong> <span class="trace-status ${trace.status}">${trace.status}</span></p>
      <p><strong>Duration:</strong> ${duration}</p>
      <p><strong>Start:</strong> ${new Date(trace.startTime).toLocaleString()}</p>
    </div>

    <div class="section">
      <h3>🔥 Flame Graph (${trace.metadata.totalSpans} spans)</h3>
      ${renderFlameGraph(trace.spans)}
    </div>

    ${trace.metrics.length > 0 ? `
    <div class="section">
      <h3>📊 Metrics (${trace.metrics.length})</h3>
      ${trace.metrics.map(m => `
        <div class="metric-item">${m.name}: ${m.value}</div>
      `).join('')}
    </div>
    ` : ''}

    ${trace.logs.length > 0 ? `
    <div class="section">
      <h3>📝 Logs (${trace.logs.length})</h3>
      ${trace.logs.map(l => `
        <div class="log-item ${l.level}">[${l.level.toUpperCase()}] ${l.message}</div>
      `).join('')}
    </div>
    ` : ''}
  `;
}

function renderFlameGraph(spans) {
  if (spans.length === 0) return '<p>No spans</p>';

  // Find root spans and build hierarchy
  const rootSpans = spans.filter(s => !s.parentSpanId);
  const spanMap = new Map(spans.map(s => [s.spanId, s]));
  const childrenMap = new Map();

  for (const span of spans) {
    if (span.parentSpanId) {
      if (!childrenMap.has(span.parentSpanId)) {
        childrenMap.set(span.parentSpanId, []);
      }
      childrenMap.get(span.parentSpanId).push(span);
    }
  }

  // Calculate time range
  const startTimes = spans.map(s => s.startTime);
  const endTimes = spans.map(s => s.endTime || Date.now());
  const minTime = Math.min(...startTimes);
  const maxTime = Math.max(...endTimes);
  const totalDuration = maxTime - minTime;

  function renderSpan(span, depth = 0) {
    const start = span.startTime - minTime;
    const duration = (span.endTime || Date.now()) - span.startTime;
    const leftPct = (start / totalDuration) * 100;
    const widthPct = (duration / totalDuration) * 100;
    const children = childrenMap.get(span.spanId) || [];

    return `
      <div class="flame-row" style="padding-left: ${depth * 20}px">
        <div class="flame-bar ${span.status}" 
             style="margin-left: ${leftPct}%; width: ${widthPct}%"
             title="${span.name} (${duration}ms)">
          ${span.name}
        </div>
      </div>
      ${children.map(c => renderSpan(c, depth + 1)).join('')}
    `;
  }

  return `<div class="flame-graph">${rootSpans.map(s => renderSpan(s)).join('')}</div>`;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}
```

- [ ] **Step 4: Commit**

```bash
git add src/telemetry/server/static/
git commit -m "feat(telemetry): add Web UI for trace visualization with flame graphs"
```

---

## Task 7: Update Telemetry Index Export

**Files:**
- Modify: `src/telemetry/index.ts`

**Purpose:** Export new components from telemetry module

- [ ] **Step 1: Update index.ts**

```typescript
export * from './types';
export { FileAdapter } from './adapters/FileAdapter';
export { IndexedFileAdapter } from './adapters/IndexedFileAdapter';
export { LoopMetricsCollector, LLMMetricsCollector } from './collectors';
export { TelemetryDashboard } from './dashboard/TelemetryDashboard';
export { TelemetryServer } from './server/TelemetryServer';
export { TraceAggregator } from './storage/TraceAggregator';
export { IndexManager } from './storage/IndexManager';
```

- [ ] **Step 2: Commit**

```bash
git add src/telemetry/index.ts
git commit -m "chore(telemetry): export new IndexedFileAdapter, TelemetryServer and storage classes"
```

---

## Task 8: Create CLI Command for Telemetry UI

**Files:**
- Modify: `src/cli.ts` (find existing command setup)

**Purpose:** Add CLI command to launch telemetry web UI

- [ ] **Step 1: Add telemetry command to CLI**

Find where commands are registered in `src/cli.ts` and add:

```typescript
import { IndexedFileAdapter, TelemetryServer } from './telemetry';

// Add new command
program
  .command('telemetry')
  .description('Launch telemetry Web UI')
  .option('-p, --port <port>', 'Server port', '9999')
  .option('-d, --dir <directory>', 'Telemetry data directory', '.harness/telemetry')
  .action(async (options) => {
    const adapter = new IndexedFileAdapter({
      outputDir: options.dir,
      persistIntervalMs: 5000
    });

    const server = new TelemetryServer({
      adapter,
      port: parseInt(options.port)
    });

    await server.start();
    console.log(`Telemetry UI: http://localhost:${options.port}`);
  });
```

- [ ] **Step 2: Commit**

```bash
git add src/cli.ts
git commit -m "feat(cli): add 'telemetry' command to launch Web UI"
```

---

## Task 9: Integration Test

**Files:**
- Create: `src/telemetry/__tests__/integration.test.ts`

**Purpose:** End-to-end test of the complete telemetry system

- [ ] **Step 1: Create integration test**

```typescript
import { IndexedFileAdapter, TelemetryServer } from '../';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Telemetry System Integration', () => {
  let adapter: IndexedFileAdapter;
  let server: TelemetryServer;
  let tempDir: string;
  const PORT = 19999;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-int-'));
    adapter = new IndexedFileAdapter({
      outputDir: tempDir,
      persistIntervalMs: 100
    });
    server = new TelemetryServer({ adapter, port: PORT });
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
    await adapter.close();
    fs.rmSync(tempDir, { recursive: true });
  });

  function httpGet(url: string): Promise<{ status: number; data: any }> {
    return new Promise((resolve, reject) => {
      http.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            data: data ? JSON.parse(data) : null
          });
        });
      }).on('error', reject);
    });
  }

  it('should record traces and serve via API', async () => {
    // Record a trace
    const span = adapter.startSpan('integration-test');
    adapter.counter('test.counter', 5, { traceId: span.traceId });
    adapter.log('info', 'Test log', { traceId: span.traceId });
    adapter.endSpan(span, 'ok');
    
    await adapter.flush();

    // Query via API
    const listRes = await httpGet(`http://localhost:${PORT}/api/traces`);
    expect(listRes.status).toBe(200);
    expect(listRes.data.total).toBe(1);

    const traceId = listRes.data.traces[0].traceId;
    const detailRes = await httpGet(`http://localhost:${PORT}/api/traces/${traceId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.data.rootSpanName).toBe('integration-test');
    expect(detailRes.data.metrics).toHaveLength(1);
  });

  it('should filter traces by status', async () => {
    // Success trace
    const span1 = adapter.startSpan('success-op');
    adapter.endSpan(span1, 'ok');

    // Error trace
    const span2 = adapter.startSpan('error-op');
    adapter.endSpan(span2, 'error');

    await adapter.flush();

    const successRes = await httpGet(`http://localhost:${PORT}/api/traces?status=success`);
    expect(successRes.data.total).toBe(1);
    expect(successRes.data.traces[0].rootSpanName).toBe('success-op');

    const errorRes = await httpGet(`http://localhost:${PORT}/api/traces?status=error`);
    expect(errorRes.data.total).toBe(1);
    expect(errorRes.data.traces[0].rootSpanName).toBe('error-op');
  });

  it('should serve static files', async () => {
    const res = await httpGet(`http://localhost:${PORT}/`);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run integration test**

```bash
npm test -- src/telemetry/__tests__/integration.test.ts
```
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/telemetry/__tests__/integration.test.ts
git commit -m "test(telemetry): add end-to-end integration test"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run all telemetry tests**

```bash
npm test -- --testPathPattern="telemetry"
```
Expected: All tests pass

- [ ] **Step 2: Build project**

```bash
npm run build
```
Expected: No TypeScript errors

- [ ] **Step 3: Commit any remaining changes**

```bash
git status
git add -A
git commit -m "feat(telemetry): complete enhanced observability system with Web UI" || echo "No changes to commit"
```

---

## Usage Guide

After implementation, the telemetry system can be used as follows:

```bash
# Start telemetry Web UI
npx harness telemetry
npx harness telemetry --port 8888 --dir ./my-telemetry

# In code - use IndexedFileAdapter for enhanced observability
import { IndexedFileAdapter, TelemetryServer } from '@harness/cli/telemetry';

const adapter = new IndexedFileAdapter({
  outputDir: '.harness/telemetry'
});

// Traces are automatically aggregated and indexed
const span = adapter.startSpan('my-operation');
adapter.endSpan(span, 'ok');

// Query traces programmatically
const result = adapter.queryTraces({ 
  status: 'error',
  limit: 10 
});
```

Visit http://localhost:9999 to view:
- Trace list with filtering
- Flame graph visualization
- Metrics and logs per trace
- Real-time stats
