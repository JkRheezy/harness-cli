import { Logger } from '../utils/Logger';

export interface Escalation {
  taskId: string;
  taskTitle: string;
  error: string;
  attempts: number;
  timestamp: Date;
  logs: string[];
}

export interface ErrorRecord {
  error: string;
  stack?: string;
  timestamp: Date;
}

export class StateManager {
  private logger: Logger;
  private escalations: Map<string, Escalation> = new Map();
  private errors: ErrorRecord[] = [];

  constructor() {
    this.logger = new Logger();
  }

  async saveEscalation(escalation: Escalation): Promise<void> {
    this.logger.info(`👤 保存升级请求: ${escalation.taskId}`);
    this.escalations.set(escalation.taskId, escalation);
    
    // 这里可以实现持久化到数据库或文件
    // 例如：写入 JSON 文件、数据库等
  }

  async saveError(record: ErrorRecord): Promise<void> {
    this.logger.error(`💾 保存错误记录: ${record.error}`);
    this.errors.push(record);
    
    // 保留最近的100条错误记录
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }
  }

  async close(): Promise<void> {
    this.logger.info('🔒 StateManager 已关闭');
  }
}
