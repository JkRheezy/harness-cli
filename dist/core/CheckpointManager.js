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
exports.CheckpointManager = void 0;
const Logger_1 = require("../utils/Logger");
class CheckpointManager {
    constructor() {
        this.checkpointPath = './.harness/checkpoint.json';
        this.logger = new Logger_1.Logger();
    }
    async save(checkpoint) {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            // 确保目录存在
            const dir = path.dirname(this.checkpointPath);
            await fs.mkdir(dir, { recursive: true });
            // 保存检查点
            await fs.writeFile(this.checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf-8');
            this.logger.debug('💾 检查点已保存');
        }
        catch (error) {
            this.logger.warn('检查点保存失败:', error);
        }
    }
    async load() {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const content = await fs.readFile(this.checkpointPath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            // 文件不存在或读取失败
            return null;
        }
    }
}
exports.CheckpointManager = CheckpointManager;
//# sourceMappingURL=CheckpointManager.js.map