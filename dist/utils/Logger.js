"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const winston_1 = __importDefault(require("winston"));
class Logger {
    constructor() {
        this.logger = winston_1.default.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.colorize(), winston_1.default.format.printf(({ level, message, timestamp }) => {
                return `${timestamp} ${level}: ${message}`;
            })),
            transports: [
                new winston_1.default.transports.Console(),
                new winston_1.default.transports.File({ filename: 'logs/harness.log' })
            ]
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