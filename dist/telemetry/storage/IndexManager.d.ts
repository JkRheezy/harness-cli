import { TraceIndexEntry, TraceQuery, TraceQueryResult, CompleteTrace } from '../types';
/**
 * 管理 Trace 索引以支持快速查询
 * 维护内存索引，定期持久化到磁盘
 */
export declare class IndexManager {
    private indexPath;
    private entries;
    private dirty;
    private persistIntervalMs;
    private persistTimer?;
    constructor(options: {
        indexPath: string;
        persistIntervalMs?: number;
    });
    /**
     * 添加或更新 Trace 索引条目
     */
    indexTrace(trace: CompleteTrace, filePath: string): void;
    /**
     * 使用过滤条件查询 Trace
     */
    query(query: TraceQuery): TraceQueryResult;
    /**
     * 根据 ID 获取单个 Trace 条目
     */
    getTraceEntry(traceId: string): TraceIndexEntry | undefined;
    /**
     * 获取已索引的 Trace 总数
     */
    getTraceCount(): number;
    /**
     * 获取时间范围内的 Trace（用于清理）
     */
    getTracesBefore(timestamp: number): TraceIndexEntry[];
    /**
     * 从索引中移除 Trace
     */
    removeTraces(traceIds: string[]): void;
    /**
     * 将索引持久化到磁盘
     */
    persist(): Promise<void>;
    /**
     * 从磁盘加载索引
     */
    private loadIndex;
    /**
     * 启动自动持久化定时器
     */
    private startAutoPersist;
    /**
     * 停止自动持久化
     */
    close(): Promise<void>;
}
//# sourceMappingURL=IndexManager.d.ts.map