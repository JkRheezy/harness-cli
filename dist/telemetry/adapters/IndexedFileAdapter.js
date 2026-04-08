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
exports.IndexedFileAdapter = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("../types");
const TraceAggregator_1 = require("../storage/TraceAggregator");
const IndexManager_1 = require("../storage/IndexManager");
/**
 * 增强版 FileAdapter，支持 Trace 聚合和索引
 * 将完整 Trace 存储为独立 JSON 文件以便快速检索
 */
class IndexedFileAdapter extends types_1.TelemetryProvider {
    constructor(options) {
        super({ adapter: 'file' });
        this.options = {
            outputDir: options.outputDir,
            maxFileSizeMB: options.maxFileSizeMB || 10,
            retentionDays: options.retentionDays || 7,
            persistIntervalMs: options.persistIntervalMs || 5000
        };
        this.traceDir = path.join(this.options.outputDir, 'traces');
        this.ensureDirectories();
        this.aggregator = new TraceAggregator_1.TraceAggregator();
        this.indexManager = new IndexManager_1.IndexManager({
            indexPath: path.join(this.options.outputDir, 'index', 'traces.json'),
            persistIntervalMs: this.options.persistIntervalMs
        });
        this.startAutoFlush();
    }
    // 指标方法
    counter(name, value, tags) {
        const metric = {
            name,
            type: 'counter',
            value,
            timestamp: Date.now(),
            tags
        };
        this.aggregator.addMetric(metric);
    }
    gauge(name, value, tags) {
        const metric = {
            name,
            type: 'gauge',
            value,
            timestamp: Date.now(),
            tags
        };
        this.aggregator.addMetric(metric);
    }
    histogram(name, value, tags) {
        const metric = {
            name,
            type: 'histogram',
            value,
            timestamp: Date.now(),
            tags
        };
        this.aggregator.addMetric(metric);
    }
    timer(name, durationMs, tags) {
        const metric = {
            name,
            type: 'timer',
            value: durationMs,
            timestamp: Date.now(),
            tags
        };
        this.aggregator.addMetric(metric);
    }
    // 追踪方法
    startSpan(name, parentContext) {
        const span = {
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
    endSpan(span, status = 'ok') {
        span.endTime = Date.now();
        span.status = status;
        this.aggregator.addSpan(span);
        // 如果是根 span，完成整个 trace
        if (!span.parentSpanId) {
            const completeTrace = this.aggregator.completeTrace(span.traceId, status === 'ok' ? 'success' : 'error');
            if (completeTrace) {
                this.saveTrace(completeTrace);
            }
        }
    }
    addSpanEvent(span, name, attributes) {
        span.events.push({
            name,
            timestamp: Date.now(),
            attributes
        });
    }
    // 日志方法
    log(level, message, context) {
        const entry = {
            level,
            message,
            timestamp: Date.now(),
            context,
            traceId: context?.traceId,
            spanId: context?.spanId
        };
        this.aggregator.addLog(entry);
    }
    // 查询 API
    queryTraces(query) {
        return this.indexManager.query(query);
    }
    getTrace(traceId) {
        const entry = this.indexManager.getTraceEntry(traceId);
        if (!entry)
            return null;
        try {
            const content = fs.readFileSync(entry.filePath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            console.error(`[IndexedFileAdapter] 加载 Trace ${traceId} 失败:`, error);
            return null;
        }
    }
    getStats() {
        return {
            totalTraces: this.indexManager.getTraceCount(),
            pendingTraces: this.aggregator.getPendingTraceIds().length
        };
    }
    // 生命周期方法
    async flush() {
        const traces = this.aggregator.flushCompletedTraces();
        for (const trace of traces) {
            await this.saveTrace(trace);
        }
        await this.indexManager.persist();
    }
    async close() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }
        // 刷新所有待处理的 trace
        const traces = this.aggregator.flushAll();
        for (const trace of traces) {
            await this.saveTrace(trace);
        }
        await this.indexManager.close();
    }
    ensureDirectories() {
        if (!fs.existsSync(this.traceDir)) {
            fs.mkdirSync(this.traceDir, { recursive: true });
        }
    }
    generateId() {
        return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
    }
    async saveTrace(trace) {
        const dateDir = new Date(trace.startTime).toISOString().split('T')[0];
        const traceDir = path.join(this.traceDir, dateDir);
        if (!fs.existsSync(traceDir)) {
            fs.mkdirSync(traceDir, { recursive: true });
        }
        const filePath = path.join(traceDir, `${trace.traceId}.json`);
        try {
            await fs.promises.writeFile(filePath, JSON.stringify(trace, null, 2));
            this.indexManager.indexTrace(trace, filePath);
        }
        catch (error) {
            console.error(`[IndexedFileAdapter] 保存 Trace ${trace.traceId} 失败:`, error);
        }
    }
    startAutoFlush() {
        this.flushInterval = setInterval(() => {
            this.flush().catch(err => {
                console.error('[IndexedFileAdapter] 自动刷新失败:', err);
            });
        }, this.options.persistIntervalMs);
    }
}
exports.IndexedFileAdapter = IndexedFileAdapter;
//# sourceMappingURL=IndexedFileAdapter.js.map