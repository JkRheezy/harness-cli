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
export declare class SafetyGuard {
    private config;
    private logger;
    private errorHistory;
    constructor(config: SafetyConfig);
    isSafe(task: any): boolean;
    checkLoopHealth(context: ExecutionContext): Promise<SafetyCheck>;
    private checkExecutionTime;
    private checkErrorRate;
    private detectInfiniteLoop;
    private checkResourceUsage;
    private findRepeatingPatterns;
    recordError(): void;
    getErrorCount(): number;
}
//# sourceMappingURL=SafetyGuard.d.ts.map