"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoutes = createRoutes;
function createRoutes(adapter) {
    return {
        // GET /api/traces - 查询 Trace 列表
        async listTraces(req, res) {
            const url = new URL(req.url || '/', `http://${req.headers.host}`);
            const query = {
                traceId: url.searchParams.get('traceId') || undefined,
                taskId: url.searchParams.get('taskId') || undefined,
                status: url.searchParams.get('status') || undefined,
                fromTime: url.searchParams.get('from') ? parseInt(url.searchParams.get('from')) : undefined,
                toTime: url.searchParams.get('to') ? parseInt(url.searchParams.get('to')) : undefined,
                limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')) : 20,
                offset: url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')) : 0
            };
            const result = adapter.queryTraces(query);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        },
        // GET /api/traces/:id - 获取单个 Trace
        async getTrace(req, res, traceId) {
            const trace = adapter.getTrace(traceId);
            if (!trace) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Trace 未找到' }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(trace));
        },
        // GET /api/stats - 获取 Telemetry 统计
        async getStats(req, res) {
            const stats = adapter.getStats();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(stats));
        },
        // GET /health - 健康检查
        async health(req, res) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        }
    };
}
//# sourceMappingURL=routes.js.map