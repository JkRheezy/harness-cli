import { LLMErrorAnalysis } from '../types';
/**
 * Uses LLM to analyze complex errors that pattern matching can't handle
 */
export declare class LLMErrorAnalyzer {
    private llmCaller;
    private maxTokens;
    constructor(llmCaller: (prompt: string) => Promise<string>, maxTokens?: number);
    /**
     * Analyze an error using LLM
     */
    analyze(error: string, context?: {
        taskType?: string;
        projectType?: string;
        filesChanged?: string[];
        recentCommands?: string[];
    }): Promise<LLMErrorAnalysis>;
    /**
     * Build prompt for error analysis
     */
    private buildAnalysisPrompt;
    /**
     * Parse LLM response into structured analysis
     */
    private parseAnalysis;
}
//# sourceMappingURL=ErrorAnalyzer.d.ts.map