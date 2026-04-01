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
exports.ToolRegistry = void 0;
const Logger_1 = require("../utils/Logger");
class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this.logger = new Logger_1.Logger();
        this.registerDefaultTools();
    }
    register(name, tool) {
        this.tools.set(name, tool);
        this.logger.debug(`🔧 注册工具: ${name}`);
    }
    get(name) {
        return this.tools.get(name);
    }
    async execute(name, params) {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`工具不存在: ${name}`);
        }
        this.logger.info(`🔧 执行工具: ${name}`);
        return await tool.execute(params);
    }
    registerDefaultTools() {
        // 注册默认工具
        this.register('read_file', {
            name: 'read_file',
            description: '读取文件内容',
            parameters: {
                path: { type: 'string', description: '文件路径' }
            },
            execute: async (params) => {
                const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
                return await fs.readFile(params.path, 'utf-8');
            }
        });
        this.register('write_file', {
            name: 'write_file',
            description: '写入文件内容',
            parameters: {
                path: { type: 'string', description: '文件路径' },
                content: { type: 'string', description: '文件内容' }
            },
            execute: async (params) => {
                const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
                await fs.writeFile(params.path, params.content, 'utf-8');
                return { success: true };
            }
        });
        this.register('run_command', {
            name: 'run_command',
            description: '运行命令',
            parameters: {
                command: { type: 'string', description: '命令' },
                cwd: { type: 'string', description: '工作目录', optional: true }
            },
            execute: async (params) => {
                const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
                const util = await Promise.resolve().then(() => __importStar(require('util')));
                const execPromise = util.promisify(exec);
                const { stdout, stderr } = await execPromise(params.command, { cwd: params.cwd });
                return { stdout, stderr };
            }
        });
    }
}
exports.ToolRegistry = ToolRegistry;
//# sourceMappingURL=ToolRegistry.js.map