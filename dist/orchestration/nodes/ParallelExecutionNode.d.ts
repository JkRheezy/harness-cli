import { BaseNode, NodeContext, NodeInput, NodeOutput } from './BaseNode';
export interface ParallelExecutionOptions {
    maxConcurrency?: number;
}
export declare class ParallelExecutionNode extends BaseNode {
    private maxConcurrency;
    private executor;
    constructor(context: NodeContext, options?: ParallelExecutionOptions);
    getName(): string;
    execute(input: NodeInput): Promise<NodeOutput>;
    /**
     * Execute tasks in batches respecting maxConcurrency
     */
    private executeInBatches;
    /**
     * Execute a single task with retry logic
     */
    private executeTaskWithRetry;
    /**
     * Execute a single task (legacy method for direct execution)
     */
    private executeTask;
    /**
     * Check if an error is retryable
     */
    private isRetryableError;
    /**
     * Delay helper for retry backoff
     */
    private delay;
    /**
     * Get current concurrency limit
     */
    getMaxConcurrency(): number;
    /**
     * Update max concurrency at runtime
     */
    setMaxConcurrency(maxConcurrency: number): void;
}
//# sourceMappingURL=ParallelExecutionNode.d.ts.map