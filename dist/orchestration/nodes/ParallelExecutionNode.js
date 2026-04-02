"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParallelExecutionNode = void 0;
const BaseNode_1 = require("./BaseNode");
const orchestration_1 = require("../../types/orchestration");
const TaskExecutor_1 = require("../../core/TaskExecutor");
class ParallelExecutionNode extends BaseNode_1.BaseNode {
    constructor(context, options = {}) {
        super(context);
        this.maxConcurrency = options.maxConcurrency || context.config.maxParallelAgents || 3;
        // Create LLM config from node context config
        const llmConfig = {
            provider: context.config.provider || 'openai',
            model: context.config.model || 'gpt-4',
            apiKey: context.config.apiKey || '',
            baseUrl: context.config.baseUrl,
            maxTokens: context.config.maxTokens || 2000,
            temperature: context.config.temperature || 0.3,
            timeout: context.config.timeout || 60000
        };
        this.executor = new TaskExecutor_1.TaskExecutor(llmConfig, context.workingDir);
    }
    getName() {
        return 'ParallelExecutionNode';
    }
    async execute(input) {
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
        }
        catch (error) {
            return this.createErrorOutput(error);
        }
    }
    /**
     * Execute tasks in batches respecting maxConcurrency
     */
    async executeInBatches(tasks, state) {
        const results = [];
        for (let i = 0; i < tasks.length; i += this.maxConcurrency) {
            const batch = tasks.slice(i, i + this.maxConcurrency);
            this.logger.info(`Executing batch ${Math.floor(i / this.maxConcurrency) + 1}: ${batch.length} tasks`);
            const batchResults = await Promise.all(batch.map(task => this.executeTaskWithRetry(task, state)));
            results.push(...batchResults);
        }
        return results;
    }
    /**
     * Execute a single task with retry logic
     */
    async executeTaskWithRetry(task, state, maxRetries = 2) {
        const startTime = Date.now();
        let lastError;
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
                        status: execResult.status === 'success' ? orchestration_1.TaskStatus.COMPLETED : orchestration_1.TaskStatus.FAILED,
                        output: execResult,
                        error: execResult.error,
                        duration: Date.now() - startTime,
                        hasChanges: execResult.hasChanges || false
                    }
                };
            }
            catch (error) {
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
                status: orchestration_1.TaskStatus.FAILED,
                error: lastError || 'Unknown error after retries',
                duration: Date.now() - startTime,
                hasChanges: false
            }
        };
    }
    /**
     * Execute a single task (legacy method for direct execution)
     */
    async executeTask(task) {
        const startTime = Date.now();
        try {
            const execResult = await this.executor.execute(task, { dryRun: false });
            return {
                taskId: task.id,
                result: {
                    taskId: task.id,
                    status: execResult.status === 'success' ? orchestration_1.TaskStatus.COMPLETED : orchestration_1.TaskStatus.FAILED,
                    output: execResult,
                    error: execResult.error,
                    duration: Date.now() - startTime,
                    hasChanges: execResult.hasChanges || false
                }
            };
        }
        catch (error) {
            return {
                taskId: task.id,
                result: {
                    taskId: task.id,
                    status: orchestration_1.TaskStatus.FAILED,
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
    isRetryableError(errorMessage) {
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
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get current concurrency limit
     */
    getMaxConcurrency() {
        return this.maxConcurrency;
    }
    /**
     * Update max concurrency at runtime
     */
    setMaxConcurrency(maxConcurrency) {
        if (maxConcurrency < 1) {
            throw new Error('maxConcurrency must be at least 1');
        }
        this.maxConcurrency = maxConcurrency;
        this.logger.info(`Updated max concurrency to ${maxConcurrency}`);
    }
}
exports.ParallelExecutionNode = ParallelExecutionNode;
//# sourceMappingURL=ParallelExecutionNode.js.map