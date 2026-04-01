import { EventEmitter } from 'events';
export interface LoopConfig {
    llm: {
        provider: 'openai' | 'anthropic' | 'kimi' | 'google' | 'local';
        model: string;
        apiKey: string;
        baseUrl?: string;
        maxTokens: number;
        temperature: number;
        timeout: number;
    };
    safety: {
        maxExecutionTime: number;
        maxErrorRate: number;
        maxComplexity: number;
    };
    checkpoint: {
        enabled: boolean;
        interval: number;
    };
}
export interface LoopOptions {
    maxDuration: number;
    dryRun?: boolean;
}
export declare class LoopController extends EventEmitter {
    private config;
    private taskQueue;
    private executor;
    private reviewer;
    private prAutomator;
    private stateManager;
    private safetyGuard;
    private checkpointManager;
    private logger;
    private isRunning;
    private startTime;
    private currentTask;
    private stats;
    private actionHistory;
    private hasGeneratedInitialTasks;
    constructor(config: LoopConfig);
    start(options: LoopOptions): Promise<void>;
    stop(): Promise<void>;
    getStatus(): Promise<any>;
    private generateTasksFromProject;
    private readAgentsMd;
    private findDevelopmentPlans;
    private extractTasksFromPlan;
    private analyzeCodebase;
    private createTasksFromPlans;
    private executeTask;
    private processResult;
    private generateFollowUpTasks;
    private generateFixTask;
    private createPR;
    private buildPRBody;
    private generateReviewFixTask;
    private shouldEscalate;
    private escalateTask;
    private handleSafetyViolation;
    private handleLoopError;
    private shouldStop;
    private getContext;
    private recordAction;
    private startCheckpointTimer;
    private saveCheckpoint;
    private loadCheckpoint;
    private cleanup;
    private sleep;
}
//# sourceMappingURL=LoopController.d.ts.map