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
        res.end(JSON.stringify({ error: 'Trace 未找到' }));
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
