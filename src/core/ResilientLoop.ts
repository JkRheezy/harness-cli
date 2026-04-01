import { Logger } from '../utils/Logger';
import { TaskQueue } from './TaskQueue';
import { ResilientTaskResult } from '../types/superpowers';

export class ResilientErrorHandler {
  private logger: Logger;
  private taskQueue: TaskQueue;
  private maxRetries: number;

  constructor(maxRetries: number = 3) {
    this.logger = new Logger();
    this.taskQueue = new TaskQueue();
    this.maxRetries = maxRetries;
  }

  /**
   * Handle task failure with retry/fix logic
   */
  async handleFailure(task: any, error: any, attempt: number): Promise<ResilientTaskResult> {
    this.logger.warn(`⚠️ Task ${task.id} failed (attempt ${attempt}/${this.maxRetries}): ${error.message}`);

    // Check if we should retry
    if (attempt < this.maxRetries && this.isRetryable(error)) {
      this.logger.info(`🔄 Retrying task ${task.id}...`);
      
      // Delay before retry (exponential backoff)
      await this.delay(1000 * Math.pow(2, attempt - 1));
      
      return {
        success: false,
        attempts: attempt,
        error: error.message,
        shouldRetry: true
      };
    }

    // Generate fix task
    const fixTaskId = await this.createFixTask(task, error);
    
    return {
      success: false,
      attempts: attempt,
      error: error.message,
      fixTaskId,
      shouldRetry: false
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: any): boolean {
    const retryableErrors = [
      'timeout',
      'connection',
      'ECONNRESET',
      'ETIMEDOUT',
      'rate limit'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    return retryableErrors.some(e => errorMessage.includes(e));
  }

  /**
   * Create a fix task for failed task
   */
  private async createFixTask(failedTask: any, error: any): Promise<string> {
    const fixTaskId = `fix-${Date.now()}`;
    
    const fixTask: import('./TaskQueue').Task = {
      id: fixTaskId,
      title: `Fix: ${failedTask.title}`,
      description: `Fix the error in task ${failedTask.id}.\n\nOriginal error:\n\`\`\`\n${error.message}\n\`\`\`\n\nStack trace:\n\`\`\`\n${error.stack || 'N/A'}\n\`\`\``,
      requirements: [
        'Analyze the error and identify root cause',
        'Fix the underlying issue',
        'Verify the fix works',
        'Run tests to ensure no regressions'
      ],
      priority: 'high',
      status: 'pending',
      // parentTask: failedTask.id,  // Not in Task interface
      maxDuration: failedTask.maxDuration,
      createdAt: new Date()
    };

    await this.taskQueue.enqueue(fixTask);
    this.logger.info(`📥 Created fix task: ${fixTaskId}`);
    
    return fixTaskId;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
