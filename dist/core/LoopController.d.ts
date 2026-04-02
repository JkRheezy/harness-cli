import { EventEmitter } from 'events';
import { EvolutionConfig, BusinessContext } from '../evolution/types';
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
    projectPath?: string;
    evolution?: EvolutionConfig;
}
export interface LoopOptions {
    maxDuration: number;
    dryRun?: boolean;
}
export interface SessionStats {
    completed: number;
    failed: number;
    escalated: number;
    startTime: number;
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
    private sessionStats;
    private actionHistory;
    private hasGeneratedInitialTasks;
    private designPhase;
    private prWorkflow;
    private errorHandler;
    private enableSuperpowers;
    private autoEvolution;
    private evolutionConfig;
    private businessContext?;
    constructor(config: LoopConfig);
    start(options: LoopOptions): Promise<void>;
    stop(): Promise<void>;
    getStatus(): Promise<any>;
    private generateTasksFromProject;
    private createTasksFromCodeStatus;
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
    private isFatalError;
    /**
     * Set business context for evolution analysis
     */
    setBusinessContext(context: BusinessContext): void;
}
//# sourceMappingURL=LoopController.d.ts.map