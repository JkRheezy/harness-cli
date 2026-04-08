import * as fs from 'fs';
import * as path from 'path';
import { TraceIndexEntry, TraceQuery, TraceQueryResult, CompleteTrace } from '../types';

/**
 * 索引数据结构
 */
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

    // 应用过滤器
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

    // 按开始时间降序排序（最新的在前）
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

    // 写入临时文件然后重命名，保证原子性
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
        console.warn(`[IndexManager] 未知的索引版本: ${data.version}`);
        return;
      }

      for (const entry of data.entries) {
        this.entries.set(entry.traceId, entry);
      }
    } catch (error) {
      console.error('[IndexManager] 加载索引失败:', error);
    }
  }

  /**
   * 启动自动持久化定时器
   */
  private startAutoPersist(): void {
    this.persistTimer = setInterval(() => {
      this.persist().catch(err => {
        console.error('[IndexManager] 自动持久化失败:', err);
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
