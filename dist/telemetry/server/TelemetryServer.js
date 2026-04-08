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
exports.TelemetryServer = void 0;
const http = __importStar(require("http"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const routes_1 = require("./routes");
/**
 * Telemetry Web UI 和 API 的 HTTP 服务器
 * 提供静态前端文件和 REST API 用于 Trace 查询
 */
class TelemetryServer {
    constructor(options) {
        this.adapter = options.adapter;
        this.port = options.port || 9999;
        this.staticDir = options.staticDir || path.join(__dirname, 'static');
        this.routes = (0, routes_1.createRoutes)(this.adapter);
    }
    /**
     * 启动服务器
     */
    async start() {
        this.server = http.createServer((req, res) => this.handleRequest(req, res));
        return new Promise((resolve, reject) => {
            this.server.listen(this.port, () => {
                console.log(`[TelemetryServer] 运行于 http://localhost:${this.port}`);
                resolve();
            });
            this.server.on('error', reject);
        });
    }
    /**
     * 停止服务器
     */
    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => resolve());
            }
            else {
                resolve();
            }
        });
    }
    async handleRequest(req, res) {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const pathname = url.pathname;
        // 设置 CORS 头
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
        }
        catch (error) {
            console.error('[TelemetryServer] 请求错误:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '服务器内部错误' }));
        }
    }
    async serveStaticFile(req, res, pathname) {
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
    getContentType(filePath) {
        const ext = path.extname(filePath);
        const types = {
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
exports.TelemetryServer = TelemetryServer;
//# sourceMappingURL=TelemetryServer.js.map