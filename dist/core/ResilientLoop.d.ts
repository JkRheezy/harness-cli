import { ResilientTaskResult } from '../types/superpowers';
export declare class ResilientErrorHandler {
    private logger;
    private taskQueue;
    private maxRetries;
    constructor(maxRetries?: number);
    /**
     * Handle task failure with retry/fix logic
     */
    handleFailure(task: any, error: any, attempt: number): Promise<ResilientTaskResult>;
    /**
     * Check if error is retryable
     */
    private isRetryable;
    /**
     * Create a fix task for failed task
     */
    private createFixTask;
    private delay;
}
//# sourceMappingURL=ResilientLoop.d.ts.map