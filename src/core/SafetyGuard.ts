import { Logger } from '../utils/Logger';

export interface SafetyConfig {
  maxExecutionTime: number;
  maxErrorRate: number;
  maxComplexity: number;
}

export interface SafetyCheck {
  passed: boolean;
  action?: 'continue' | 'pause' | 'stop';
  reason?: string;
}

export interface ExecutionContext {
  startTime: number;
  currentTask?: any;
  stats: {
    completed: number;
    failed: number;
    escalated: number;
  };
  queueSize: number;
  errors: number;
  totalAttempts: number;
  actionHistory: string[];
}

export class SafetyGuard {
  private config: SafetyConfig;
  private logger: Logger;
  private errorHistory: number[] = [];

  constructor(config: SafetyConfig) {
    this.config = config;
    this.logger = new Logger();
  }

  isSafe(task: any): boolean {
    // 检查任务复杂度
    if (task.complexity && task.complexity > this.config.maxComplexity) {
      this.logger.warn(`任务复杂度 ${task.complexity} 超过限制 ${this.config.maxComplexity}`);
      return false;
    }
    
    return true;
  }

  async checkLoopHealth(context: ExecutionContext): Promise<SafetyCheck> {
    // 1. 检查执行时间
    const timeCheck = this.checkExecutionTime(context);
    if (!timeCheck.passed) return timeCheck;
    
    // 2. 检查错误率
    const errorCheck = this.checkErrorRate(context);
    if (!errorCheck.passed) return errorCheck;
    
    // 3. 检测无限循环
    const loopCheck = this.detectInfiniteLoop(context);
    if (!loopCheck.passed) return loopCheck;
    
    // 4. 检查资源使用
    const resourceCheck = await this.checkResourceUsage();
    if (!resourceCheck.passed) return resourceCheck;
    
    return { passed: true };
  }

  private checkExecutionTime(context: ExecutionContext): SafetyCheck {
    const elapsed = Date.now() - context.startTime;
    
    if (elapsed > this.config.maxExecutionTime) {
      return {
        passed: false,
        action: 'stop',
        reason: `执行时间 ${elapsed}ms 超过最大限制 ${this.config.maxExecutionTime}ms`
      };
    }
    
    // 警告：超过 80% 时间
    if (elapsed > this.config.maxExecutionTime * 0.8) {
      this.logger.warn(`执行时间即将达到限制: ${elapsed}/${this.config.maxExecutionTime}ms`);
    }
    
    return { passed: true };
  }

  private checkErrorRate(context: ExecutionContext): SafetyCheck {
    if (context.totalAttempts === 0) {
      return { passed: true };
    }
    
    const errorRate = context.errors / context.totalAttempts;
    
    if (errorRate > this.config.maxErrorRate) {
      return {
        passed: false,
        action: 'stop',
        reason: `错误率 ${(errorRate * 100).toFixed(1)}% 超过最大限制 ${(this.config.maxErrorRate * 100).toFixed(1)}%`
      };
    }
    
    // 警告：错误率超过 50%
    if (errorRate > 0.5) {
      this.logger.warn(`错误率较高: ${(errorRate * 100).toFixed(1)}%`);
    }
    
    return { passed: true };
  }

  private detectInfiniteLoop(context: ExecutionContext): SafetyCheck {
    const history = context.actionHistory.slice(-20);  // 最近 20 个动作
    
    if (history.length < 10) {
      return { passed: true };
    }
    
    // 检测重复模式
    const patterns = this.findRepeatingPatterns(history);
    
    if (patterns.length > 0) {
      return {
        passed: false,
        action: 'pause',
        reason: `检测到可能的无限循环: ${patterns.join(', ')}`
      };
    }
    
    return { passed: true };
  }

  private async checkResourceUsage(): Promise<SafetyCheck> {
    // 检查内存使用
    const memUsage = process.memoryUsage();
    const maxMemory = 2 * 1024 * 1024 * 1024;  // 2GB
    
    if (memUsage.heapUsed > maxMemory) {
      return {
        passed: false,
        action: 'stop',
        reason: `内存使用 ${(memUsage.heapUsed / 1024 / 1024).toFixed(0)}MB 超过限制 ${(maxMemory / 1024 / 1024).toFixed(0)}MB`
      };
    }
    
    // 警告：内存使用超过 80%
    if (memUsage.heapUsed > maxMemory * 0.8) {
      this.logger.warn(`内存使用较高: ${(memUsage.heapUsed / 1024 / 1024).toFixed(0)}MB`);
    }
    
    return { passed: true };
  }

  private findRepeatingPatterns(history: string[]): string[] {
    const patterns: string[] = [];
    
    // 检测简单重复（A-B-A-B）
    if (history.length >= 4) {
      const last4 = history.slice(-4);
      if (last4[0] === last4[2] && last4[1] === last4[3]) {
        patterns.push(`重复模式: ${last4[0]} -> ${last4[1]} -> ${last4[0]} -> ${last4[1]}`);
      }
    }
    
    // 检测三连重复（A-A-A）
    if (history.length >= 3) {
      const last3 = history.slice(-3);
      if (last3[0] === last3[1] && last3[1] === last3[2]) {
        patterns.push(`三连重复: ${last3[0]}`);
      }
    }
    
    // 检测循环（A-B-C-A-B-C）
    if (history.length >= 6) {
      const last6 = history.slice(-6);
      if (last6[0] === last6[3] && last6[1] === last6[4] && last6[2] === last6[5]) {
        patterns.push(`循环模式: ${last6[0]} -> ${last6[1]} -> ${last6[2]} -> ...`);
      }
    }
    
    return patterns;
  }

  recordError(): void {
    this.errorHistory.push(Date.now());
    
    // 清理 1 小时前的错误记录
    const oneHourAgo = Date.now() - 3600000;
    this.errorHistory = this.errorHistory.filter(t => t > oneHourAgo);
  }

  getErrorCount(): number {
    return this.errorHistory.length;
  }
}
