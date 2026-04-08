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
        console.log(`[TelemetryServer] 运行于 http://localhost:${this.port}`);
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
    } catch (error) {
      console.error('[TelemetryServer] 请求错误:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '服务器内部错误' }));
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
