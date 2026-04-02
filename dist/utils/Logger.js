"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const winston_1 = __importDefault(require("winston"));
class Logger {
    constructor() {
        // 确保 logs 目录存在
        const fs = require('fs');
        const path = require('path');
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        // 定义基础格式（始终无颜色，避免乱码）
        const baseFormat = winston_1.default.format.printf(({ level, message, timestamp }) => {
            return `${timestamp} ${level}: ${message}`;
        });
        // 定义时间戳格式
        const timestampFormat = winston_1.default.format.timestamp();
        this.logger = winston_1.default.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            // 不设置全局 format，每个 transport 单独设置
            transports: [
                // 控制台输出（始终无颜色，避免 Windows 乱码）
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.combine(timestampFormat, winston_1.default.format.uncolorize(), // 禁用颜色
                    baseFormat)
                }),
                // 文件输出（始终无颜色，UTF-8 编码）
                new winston_1.default.transports.File({
                    filename: 'logs/harness.log',
                    format: winston_1.default.format.combine(timestampFormat, winston_1.default.format.uncolorize(), baseFormat),
                    options: { flags: 'a', encoding: 'utf8' }
                })
            ],
            exitOnError: false
        });
    }
    info(message, ...meta) {
        this.logger.info(message, ...meta);
    }
    error(message, ...meta) {
        this.logger.error(message, ...meta);
    }
    warn(message, ...meta) {
        this.logger.warn(message, ...meta);
    }
    debug(message, ...meta) {
        this.logger.debug(message, ...meta);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map