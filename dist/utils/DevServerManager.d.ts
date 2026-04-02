import { ChildProcess } from 'child_process';
export interface DevServerOptions {
    command?: string;
    port?: number;
    timeout?: number;
    env?: Record<string, string>;
    cwd?: string;
}
export declare class DevServerManager {
    private logger;
    private process;
    private port;
    private startTime;
    constructor();
    /**
     * 自动启动开发服务器
     */
    start(options?: DevServerOptions): Promise<string>;
    /**
     * 检测项目启动命令
     */
    private detectStartCommand;
    /**
     * 检测现有开发服务器
     */
    private detectExistingServer;
    /**
     * 检查指定端口是否可访问
     */
    private checkPort;
    /**
     * 设置日志处理器
     */
    private setupLogHandlers;
    /**
     * 等待服务器就绪
     */
    private waitForServer;
    /**
     * 停止开发服务器
     */
    stop(): Promise<void>;
    /**
     * 获取当前进程
     */
    getProcess(): ChildProcess | null;
    /**
     * 获取当前端口
     */
    getPort(): number;
    /**
     * 检查服务器是否正在运行
     */
    isRunning(): boolean;
}
//# sourceMappingURL=DevServerManager.d.ts.map