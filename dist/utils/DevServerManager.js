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
exports.DevServerManager = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const Logger_1 = require("./Logger");
class DevServerManager {
    constructor() {
        this.process = null;
        this.port = 3000;
        this.startTime = 0;
        this.logger = new Logger_1.Logger();
    }
    /**
     * 自动启动开发服务器
     */
    async start(options) {
        const targetPort = options?.port || 3000;
        const timeout = options?.timeout || 60000;
        const cwd = options?.cwd || process.cwd();
        // 1. 检查是否已有开发服务器在运行
        const existingUrl = await this.detectExistingServer(targetPort);
        if (existingUrl) {
            this.logger.info(`✅ Dev server already running at ${existingUrl}`);
            this.port = targetPort;
            return existingUrl;
        }
        // 2. 检测项目类型，确定启动命令
        const command = options?.command || (await this.detectStartCommand(cwd));
        // 3. 启动开发服务器
        this.logger.info(`🚀 Starting dev server: ${command}`);
        this.startTime = Date.now();
        this.process = (0, child_process_1.spawn)(command, {
            shell: true,
            cwd,
            env: { ...process.env, ...options?.env },
            detached: false,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        // 4. 监听输出日志
        this.setupLogHandlers();
        // 5. 等待服务器就绪
        const url = await this.waitForServer(targetPort, timeout);
        this.port = targetPort;
        return url;
    }
    /**
     * 检测项目启动命令
     */
    async detectStartCommand(cwd) {
        const packageJsonPath = path.join(cwd, 'package.json');
        try {
            if (!fs.existsSync(packageJsonPath)) {
                this.logger.warn('No package.json found, using default command');
                return 'npm run dev';
            }
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            const scripts = packageJson.scripts || {};
            // 检查常见框架的启动命令
            const devScript = scripts.dev;
            const startScript = scripts.start;
            if (devScript) {
                // 检查 dev script 内容来确定框架类型
                const devContent = devScript.toLowerCase();
                if (devContent.includes('next')) {
                    this.logger.info('Detected Next.js project');
                }
                else if (devContent.includes('vite')) {
                    this.logger.info('Detected Vite project');
                }
                else if (devContent.includes('nuxt')) {
                    this.logger.info('Detected Nuxt project');
                }
                else if (devContent.includes('vue-cli-service')) {
                    this.logger.info('Detected Vue CLI project');
                }
                else if (devContent.includes('craco')) {
                    this.logger.info('Detected CRACO project');
                }
                else if (devContent.includes('react-scripts')) {
                    this.logger.info('Detected Create React App project');
                }
                return 'npm run dev';
            }
            // 如果没有 dev script，检查 start script
            if (startScript) {
                this.logger.info('Using npm start command');
                return 'npm start';
            }
            // 根据依赖项推断
            const deps = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies
            };
            if (deps.next) {
                this.logger.info('Detected Next.js from dependencies');
                return 'npx next dev';
            }
            if (deps.vite) {
                this.logger.info('Detected Vite from dependencies');
                return 'npx vite';
            }
            if (deps.nuxt || deps['nuxt-edge']) {
                this.logger.info('Detected Nuxt from dependencies');
                return 'npx nuxt dev';
            }
            this.logger.warn('Could not detect project type, using default: npm run dev');
            return 'npm run dev';
        }
        catch (error) {
            this.logger.error(`Error detecting start command: ${error}`);
            return 'npm run dev';
        }
    }
    /**
     * 检测现有开发服务器
     */
    async detectExistingServer(preferredPort) {
        const ports = preferredPort
            ? [preferredPort, 3000, 3001, 5173, 5174, 8080]
            : [3000, 3001, 5173, 5174, 8080];
        // 去重
        const uniquePorts = [...new Set(ports)].filter((p) => p !== undefined);
        for (const port of uniquePorts) {
            try {
                const isReady = await this.checkPort(port);
                if (isReady) {
                    return `http://localhost:${port}`;
                }
            }
            catch {
                // 继续尝试下一个端口
            }
        }
        return null;
    }
    /**
     * 检查指定端口是否可访问
     */
    async checkPort(port) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const response = await fetch(`http://localhost:${port}`, {
                method: 'HEAD',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response.ok;
        }
        catch {
            return false;
        }
    }
    /**
     * 设置日志处理器
     */
    setupLogHandlers() {
        if (!this.process)
            return;
        if (this.process.stdout) {
            this.process.stdout.on('data', (data) => {
                const output = data.toString().trim();
                if (output) {
                    this.logger.debug(`[DevServer] ${output}`);
                }
            });
        }
        if (this.process.stderr) {
            this.process.stderr.on('data', (data) => {
                const output = data.toString().trim();
                if (output) {
                    // 某些框架将信息输出到 stderr，所以使用 debug 级别
                    this.logger.debug(`[DevServer:stderr] ${output}`);
                }
            });
        }
        this.process.on('error', (error) => {
            this.logger.error(`Dev server process error: ${error.message}`);
        });
        this.process.on('exit', (code, signal) => {
            if (code !== null && code !== 0) {
                this.logger.warn(`Dev server exited with code ${code}`);
            }
            else if (signal) {
                this.logger.info(`Dev server exited with signal ${signal}`);
            }
            this.process = null;
        });
    }
    /**
     * 等待服务器就绪
     */
    async waitForServer(port, timeout) {
        const startTime = Date.now();
        const pollInterval = 500; // 每 500ms 检查一次
        const url = `http://localhost:${port}`;
        this.logger.info(`⏳ Waiting for server at ${url}...`);
        return new Promise((resolve, reject) => {
            const checkServer = async () => {
                const elapsed = Date.now() - startTime;
                if (elapsed > timeout) {
                    // 超时，停止进程
                    await this.stop();
                    reject(new Error(`Timeout waiting for dev server to start (${timeout}ms)`));
                    return;
                }
                try {
                    const isReady = await this.checkPort(port);
                    if (isReady) {
                        const startupTime = Date.now() - this.startTime;
                        this.logger.info(`✅ Dev server ready at ${url} (${startupTime}ms)`);
                        resolve(url);
                        return;
                    }
                }
                catch {
                    // 服务器还未就绪，继续等待
                }
                // 继续轮询
                setTimeout(checkServer, pollInterval);
            };
            checkServer();
        });
    }
    /**
     * 停止开发服务器
     */
    async stop() {
        if (!this.process) {
            this.logger.debug('No dev server process to stop');
            return;
        }
        this.logger.info('🛑 Stopping dev server...');
        const processToKill = this.process;
        this.process = null;
        // 尝试优雅关闭
        const gracefulKill = new Promise((resolve) => {
            // 监听进程退出（如果支持 once）
            if (typeof processToKill.once === 'function') {
                processToKill.once('exit', () => {
                    resolve();
                });
            }
            // 发送 SIGTERM
            if (typeof processToKill.kill === 'function') {
                processToKill.kill('SIGTERM');
            }
            // 2秒后强制关闭
            setTimeout(() => {
                if (processToKill && !processToKill.killed && typeof processToKill.kill === 'function') {
                    processToKill.kill('SIGKILL');
                }
                resolve();
            }, 2000);
        });
        await gracefulKill;
        this.logger.info('✅ Dev server stopped');
    }
    /**
     * 获取当前进程
     */
    getProcess() {
        return this.process;
    }
    /**
     * 获取当前端口
     */
    getPort() {
        return this.port;
    }
    /**
     * 检查服务器是否正在运行
     */
    isRunning() {
        return this.process !== null && !this.process.killed;
    }
}
exports.DevServerManager = DevServerManager;
//# sourceMappingURL=DevServerManager.js.map