import { BaseNode, NodeContext, NodeInput, NodeOutput } from './BaseNode';
import { HarnessStateType } from '../graph/state';
import { Task } from '../../core/TaskQueue';
import { TaskResult, TaskStatus } from '../../types/orchestration';
import { TaskExecutor, LLMConfig } from '../../core/TaskExecutor';

export interface ParallelExecutionOptions {
  maxConcurrency?: number;
}

export class ParallelExecutionNode extends BaseNode {
  private maxConcurrency: number;
  private executor: TaskExecutor;

  constructor(context: NodeContext, options: ParallelExecutionOptions = {}) {
    super(context);
    this.maxConcurrency = options.maxConcurrency || context.config.maxParallelAgents || 3;

    // Create LLM config from node context config
    const llmConfig: LLMConfig = {
      provider: context.config.provider || 'openai',
      model: context.config.model || 'gpt-4',
      apiKey: context.config.apiKey || '',
      baseUrl: context.config.baseUrl,
      maxTokens: context.config.maxTokens || 2000,
      temperature: context.config.temperature || 0.3,
      timeout: context.config.timeout || 60000
    };

    this.executor = new TaskExecutor(llmConfig, context.workingDir);
  }

  getName(): string {
    return 'ParallelExecutionNode';
  }

  async execute(input: NodeInput): Promise<NodeOutput> {
    const { state } = input;

    this.logger.info(`Executing ${this.getName()}`);

    try {
      // Check if parallel execution is enabled
      if (!state.config.enableParallelExecution) {
        this.logger.info('Parallel execution is disabled');
        return { state: {} };
      }

      // Validate state
      if (!this.validateState(state, ['tasks'])) {
        return this.createErrorOutput('Invalid state: missing required fields');
      }

      // Get pending tasks
      const pendingTasks = state.tasks.filter(t => t.status === 'pending');
      if (pendingTasks.length === 0) {
        this.logger.info('No pending tasks for parallel execution');
        return { state: {} };
      }

      this.logger.info(`Executing ${pendingTasks.length} tasks in parallel (concurrency: ${this.maxConcurrency})`);

      // Execute tasks in batches
      const results = await this.executeInBatches(pendingTasks, state);

      // Update results map
      const newResults = new Map(state.results);
      results.forEach(({ taskId, result }) => {
        newResults.set(taskId, result);
      });

      this.logger.info(`Parallel execution completed: ${results.length} tasks processed`);

      return {
        state: {
          results: newResults,
          iterationCount: state.iterationCount + 1
        }
      };

    } catch (error) {
      return this.createErrorOutput(error as Error);
    }
  }

  /**
   * Execute tasks in batches respecting maxConcurrency
   */
  private async executeInBatches(
    tasks: Task[],
    state: HarnessStateType
  ): Promise<Array<{ taskId: string; result: TaskResult }>> {
    const results: Array<{ taskId: string; result: TaskResult }> = [];

    for (let i = 0; i < tasks.length; i += this.maxConcurrency) {
      const batch = tasks.slice(i, i + this.maxConcurrency);
      this.logger.info(`Executing batch ${Math.floor(i / this.maxConcurrency) + 1}: ${batch.length} tasks`);

      const batchResults = await Promise.all(
        batch.map(task => this.executeTaskWithRetry(task, state))
      );

      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Execute a single task with retry logic
   */
  private async executeTaskWithRetry(
    task: Task,
    state: HarnessStateType,
    maxRetries: number = 2
  ): Promise<{ taskId: string; result: TaskResult }> {
    const startTime = Date.now();
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        this.logger.info(`Retrying task ${task.id}, attempt ${attempt}/${maxRetries}`);
        await this.delay(1000 * attempt); // Exponential backoff
      }

      try {
        const execResult = await this.executor.execute(task, { dryRun: false });

        return {
          taskId: task.id,
          result: {
            taskId: task.id,
            status: execResult.status === 'success' ? TaskStatus.COMPLETED : TaskStatus.FAILED,
            output: execResult,
            error: execResult.error,
            duration: Date.now() - startTime,
            hasChanges: execResult.hasChanges || false
          }
        };
      } catch (error: any) {
        lastError = error.message || String(error);
        this.logger.warn(`Task ${task.id} execution failed (attempt ${attempt + 1}): ${lastError}`);

        // Don't retry if it's not a retryable error
        if (lastError && !this.isRetryableError(lastError)) {
          break;
        }
      }
    }

    // All retries exhausted
    return {
      taskId: task.id,
      result: {
        taskId: task.id,
        status: TaskStatus.FAILED,
        error: lastError || 'Unknown error after retries',
        duration: Date.now() - startTime,
        hasChanges: false
      }
    };
  }

  /**
   * Execute a single task (legacy method for direct execution)
   */
  private async executeTask(task: Task): Promise<{ taskId: string; result: TaskResult }> {
    const startTime = Date.now();

    try {
      const execResult = await this.executor.execute(task, { dryRun: false });

      return {
        taskId: task.id,
        result: {
          taskId: task.id,
          status: execResult.status === 'success' ? TaskStatus.COMPLETED : TaskStatus.FAILED,
          output: execResult,
          error: execResult.error,
          duration: Date.now() - startTime,
          hasChanges: execResult.hasChanges || false
        }
      };
    } catch (error: any) {
      return {
        taskId: task.id,
        result: {
          taskId: task.id,
          status: TaskStatus.FAILED,
          error: error.message || String(error),
          duration: Date.now() - startTime,
          hasChanges: false
        }
      };
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(errorMessage: string): boolean {
    const retryablePatterns = [
      'timeout',
      'rate limit',
      'network',
      'connection',
      'econnreset',
      'etimedout'
    ];

    const lowerError = errorMessage.toLowerCase();
    return retryablePatterns.some(pattern => lowerError.includes(pattern));
  }

  /**
   * Delay helper for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current concurrency limit
   */
  getMaxConcurrency(): number {
    return this.maxConcurrency;
  }

  /**
   * Update max concurrency at runtime
   */
  setMaxConcurrency(maxConcurrency: number): void {
    if (maxConcurrency < 1) {
      throw new Error('maxConcurrency must be at least 1');
    }
    this.maxConcurrency = maxConcurrency;
    this.logger.info(`Updated max concurrency to ${maxConcurrency}`);
  }
}
