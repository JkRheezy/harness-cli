import { HealingResult, HealingCost } from './types';
export interface OrchestratorConfig {
    maxCodeAttempts: number;
    maxLLMAttempts: number;
    maxTotalCost: number;
    enableLLM: boolean;
}
/**
 * Orchestrates multi-level healing with cost control
 */
export declare class HealingOrchestrator {
    private classifier;
    private codeStrategy;
    private llmStrategy;
    private config;
    private logger;
    constructor(workingDir: string, logger: any, llmCaller?: (prompt: string) => Promise<string>, config?: Partial<OrchestratorConfig>);
    /**
     * Main healing entry point
     * Implements 3-layer healing with cost tracking
     */
    heal(error: string | Error, context?: any): Promise<HealingResult>;
    /**
     * Quick check if healing is likely to succeed
     */
    canProbablyHeal(error: string | Error): boolean;
    /**
     * Estimate healing cost before attempting
     */
    estimateCost(error: string | Error): HealingCost;
    private buildResult;
}
//# sourceMappingURL=HealingOrchestrator.d.ts.map