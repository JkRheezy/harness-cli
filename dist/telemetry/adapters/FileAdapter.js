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
exports.FileAdapter = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const types_1 = require("../types");
class FileAdapter extends types_1.TelemetryProvider {
    constructor(options) {
        super({ adapter: 'file' });
        this.pendingWrites = 0;
        if (!options.outputDir) {
            throw new Error('outputDir is required');
        }
        this.options = {
            outputDir: options.outputDir,
            maxFileSizeMB: options.maxFileSizeMB || 10,
            retentionDays: options.retentionDays || 7
        };
        this.ensureOutputDir();
        this.initializeStreams();
    }
    ensureOutputDir() {
        if (!fs.existsSync(this.options.outputDir)) {
            fs.mkdirSync(this.options.outputDir, { recursive: true });
        }
    }
    initializeStreams() {
        const timestamp = new Date().toISOString().split('T')[0];
        this.metricStream = this.createStream(`metrics-${timestamp}.jsonl`);
        this.spanStream = this.createStream(`spans-${timestamp}.jsonl`);
        this.logStream = this.createStream(`logs-${timestamp}.jsonl`);
    }
    createStream(filename) {
        const stream = fs.createWriteStream(path.join(this.options.outputDir, filename), { flags: 'a' });
        stream.on('error', (err) => {
            console.error(`[Telemetry] Stream error for ${filename}:`, err.message);
        });
        return stream;
    }
    generateId() {
        return (0, crypto_1.randomUUID)();
    }
    writeToStream(stream, data) {
        if (!stream)
            return false;
        this.pendingWrites++;
        const ok = stream.write(data, (err) => {
            this.pendingWrites--;
            if (err) {
                console.error('[Telemetry] Write error:', err.message);
            }
        });
        return ok;
    }
    counter(name, value, tags) {
        const metric = {
            name,
            type: 'counter',
            value,
            timestamp: Date.now(),
            tags
        };
        this.writeToStream(this.metricStream, JSON.stringify(metric) + '\n');
    }
    gauge(name, value, tags) {
        const metric = {
            name,
            type: 'gauge',
            value,
            timestamp: Date.now(),
            tags
        };
        this.writeToStream(this.metricStream, JSON.stringify(metric) + '\n');
    }
    histogram(name, value, tags) {
        const metric = {
            name,
            type: 'histogram',
            value,
            timestamp: Date.now(),
            tags
        };
        this.writeToStream(this.metricStream, JSON.stringify(metric) + '\n');
    }
    timer(name, durationMs, tags) {
        const metric = {
            name,
            type: 'timer',
            value: durationMs,
            timestamp: Date.now(),
            tags
        };
        this.writeToStream(this.metricStream, JSON.stringify(metric) + '\n');
    }
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
        return span;
    }
    endSpan(span, status = 'ok') {
        span.endTime = Date.now();
        span.status = status;
        this.writeToStream(this.spanStream, JSON.stringify(span) + '\n');
    }
    addSpanEvent(span, name, attributes) {
        span.events.push({
            name,
            timestamp: Date.now(),
            attributes
        });
    }
    log(level, message, context) {
        const entry = {
            level,
            message,
            timestamp: Date.now(),
            context
        };
        this.writeToStream(this.logStream, JSON.stringify(entry) + '\n');
    }
    async flush() {
        if (this.pendingWrites === 0)
            return;
        return new Promise((resolve) => {
            const check = () => {
                if (this.pendingWrites === 0) {
                    resolve();
                }
                else {
                    setImmediate(check);
                }
            };
            check();
        });
    }
    async close() {
        await this.flush();
        return new Promise((resolve) => {
            let closed = 0;
            const check = () => {
                closed++;
                if (closed === 3)
                    resolve();
            };
            this.metricStream?.end(check) || check();
            this.spanStream?.end(check) || check();
            this.logStream?.end(check) || check();
        });
    }
}
exports.FileAdapter = FileAdapter;
//# sourceMappingURL=FileAdapter.js.map