import winston from 'winston';

export class Logger {
  private logger: winston.Logger;

  constructor() {
    // 确保 logs 目录存在
    const fs = require('fs');
    const path = require('path');
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // 定义基础格式（始终无颜色，避免乱码）
    const baseFormat = winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    });

    // 定义时间戳格式
    const timestampFormat = winston.format.timestamp();

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      // 不设置全局 format，每个 transport 单独设置
      transports: [
        // 控制台输出（始终无颜色，避免 Windows 乱码）
        new winston.transports.Console({
          format: winston.format.combine(
            timestampFormat,
            winston.format.uncolorize(), // 禁用颜色
            baseFormat
          )
        }),
        // 文件输出（始终无颜色，UTF-8 编码）
        new winston.transports.File({
          filename: 'logs/harness.log',
          format: winston.format.combine(
            timestampFormat,
            winston.format.uncolorize(),
            baseFormat
          ),
          options: { flags: 'a', encoding: 'utf8' }
        })
      ],
      exitOnError: false
    });
  }

  info(message: string, ...meta: any[]): void {
    this.logger.info(message, ...meta);
  }

  error(message: string, ...meta: any[]): void {
    this.logger.error(message, ...meta);
  }

  warn(message: string, ...meta: any[]): void {
    this.logger.warn(message, ...meta);
  }

  debug(message: string, ...meta: any[]): void {
    this.logger.debug(message, ...meta);
  }
}
