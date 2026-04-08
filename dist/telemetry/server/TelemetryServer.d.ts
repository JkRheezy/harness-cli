import { IndexedFileAdapter } from '../adapters/IndexedFileAdapter';
interface TelemetryServerOptions {
    adapter: IndexedFileAdapter;
    port?: number;
    staticDir?: string;
}
/**
 * Telemetry Web UI 和 API 的 HTTP 服务器
 * 提供静态前端文件和 REST API 用于 Trace 查询
 */
export declare class TelemetryServer {
    private adapter;
    private port;
    private staticDir;
    private server?;
    private routes;
    constructor(options: TelemetryServerOptions);
    /**
     * 启动服务器
     */
    start(): Promise<void>;
    /**
     * 停止服务器
     */
    stop(): Promise<void>;
    private handleRequest;
    private serveStaticFile;
    private getContentType;
}
export {};
//# sourceMappingURL=TelemetryServer.d.ts.map