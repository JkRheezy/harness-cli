"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * 管理 Trace 索引以支持快速查询
 * 维护内存索引，定期持久化到磁盘
 */
class IndexManager {
    constructor(options) {
        this.entries = new Map();
        this.dirty = false;
        this.persistIntervalMs = 5000;
        this.indexPath = options.indexPath;
        this.persistIntervalMs = options.persistIntervalMs ?? 5000;
        this.loadIndex();
        this.startAutoPersist();
    }
    /**
     * 添加或更新 Trace 索引条目
     */
    indexTrace(trace, filePath) {
        const entry = {
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
    query(query) {
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
            results = results.filter(e => e.startTime >= query.fromTime);
        }
        if (query.toTime) {
            results = results.filter(e => e.startTime <= query.toTime);
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
    getTraceEntry(traceId) {
        return this.entries.get(traceId);
    }
    /**
     * 获取已索引的 Trace 总数
     */
    getTraceCount() {
        return this.entries.size;
    }
    /**
     * 获取时间范围内的 Trace（用于清理）
     */
    getTracesBefore(timestamp) {
        return Array.from(this.entries.values())
            .filter(e => e.startTime < timestamp);
    }
    /**
     * 从索引中移除 Trace
     */
    removeTraces(traceIds) {
        for (const id of traceIds) {
            this.entries.delete(id);
        }
        this.dirty = true;
    }
    /**
     * 将索引持久化到磁盘
     */
    async persist() {
        if (!this.dirty)
            return;
        const data = {
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
    loadIndex() {
        if (!fs.existsSync(this.indexPath)) {
            return;
        }
        try {
            const data = JSON.parse(fs.readFileSync(this.indexPath, 'utf-8'));
            if (data.version !== 1) {
                console.warn(`[IndexManager] 未知的索引版本: ${data.version}`);
                return;
            }
            for (const entry of data.entries) {
                this.entries.set(entry.traceId, entry);
            }
        }
        catch (error) {
            console.error('[IndexManager] 加载索引失败:', error);
        }
    }
    /**
     * 启动自动持久化定时器
     */
    startAutoPersist() {
        this.persistTimer = setInterval(() => {
            this.persist().catch(err => {
                console.error('[IndexManager] 自动持久化失败:', err);
            });
        }, this.persistIntervalMs);
    }
    /**
     * 停止自动持久化
     */
    async close() {
        if (this.persistTimer) {
            clearInterval(this.persistTimer);
        }
        await this.persist();
    }
}
exports.IndexManager = IndexManager;
//# sourceMappingURL=IndexManager.js.map