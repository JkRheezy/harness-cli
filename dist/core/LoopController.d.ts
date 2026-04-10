import { EventEmitter } from 'events';
import { EvolutionConfig, BusinessContext } from '../evolution/types';
import { OrchestrationConfig } from '../types/orchestration';
import { TelemetryProvider } from '../telemetry';
export interface UnattendedConfig {
    enabled: boolean;
    maxConsecutiveErrors: number;
    pauseOnHighErrorRate: boolean;
    errorRateThreshold: number;
    autoResume: boolean;
    resumeDelay: number;
}
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
    orchestration?: OrchestrationConfig;
    superpowers?: {
        enabled?: boolean;
        skillsPath?: string;
    };
    unattended?: UnattendedConfig;
}
export interface LoopOptions {
    maxDuration: number;
    dryRun?: boolean;
    telemetry?: TelemetryProvider;
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
    private projectPath;
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
    private useLangGraph;
    private harnessGraph?;
    private healthStats;
    private telemetry;
    private loopMetrics;
    private currentTaskSpan?;
    constructor(config: LoopConfig, options?: {
        telemetry?: TelemetryProvider;
    });
    private setupProcessHandlers;
    private gracefulShutdown;
    private checkHealth;
    private recordTaskStatus;
    private waitForResume;
    private initializeLangGraph;
    getArchitectureDiagram(): Promise<string>;
    saveArchitectureDiagram(outputPath: string): Promise<void>;
    private getLegacyArchitectureDescription;
    start(options: LoopOptions): Promise<void>;
    stop(): Promise<void>;
    getStatus(): Promise<any>;
    private generateTasksFromProject;
    /**
     * Map BusinessTask priority to Task priority
     */
    private mapPriority;
    /**
     * @deprecated Use GapAnalysisEngine via analyzeCodebase() instead
     * This method is kept for backwards compatibility but no longer used.
     */
    private createTasksFromCodeStatus;
    private readAgentsMd;
    private findDevelopmentPlans;
    private extractTasksFromPlan;
    private analyzeCodebase;
    /**
     * @deprecated Use GapAnalysisEngine via analyzeCodebase() instead
     * This method is kept for backwards compatibility but no longer used.
     */
    private createTasksFromPlans;
    private executeTask;
    private processResult;
    private classifyError;
    private handleTransientError;
    private handleFileNotFoundError;
    private handleDependencyError;
    private handlePermanentError;
    private createEmptyFile;
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
    /**
     * Safely execute telemetry call without affecting main flow.
     */
    private safeTelemetry;
    private isFatalError;
    /**
     * Set business context for evolution analysis
     */
    setBusinessContext(context: BusinessContext): void;
}
//# sourceMappingURL=LoopController.d.ts.map