import { TelemetryProvider } from '../telemetry';
export interface LLMConfig {
    provider: 'openai' | 'anthropic' | 'kimi' | 'google' | 'local';
    model: string;
    apiKey: string;
    baseUrl?: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
}
export interface ExecuteOptions {
    dryRun?: boolean;
    onProgress?: (progress: any) => void;
}
export declare class TaskExecutor {
    private config;
    private openai?;
    private anthropic?;
    private git;
    private toolRegistry;
    private logger;
    private context;
    private workingDir;
    private devServerManager;
    private devServerUrl;
    private telemetry;
    private llmMetrics;
    constructor(config: LLMConfig, workingDir?: string, telemetry?: TelemetryProvider);
    private safeTelemetry;
    execute(task: any, options?: ExecuteOptions): Promise<any>;
    private prepareContext;
    private generatePlan;
    private executeStep;
    private validateResults;
    private detectProjectType;
    /**
     * Run browser-based validation
     */
    private runBrowserValidation;
    /**
     * StopDev server（在任务complete后调用）
     */
    stopDevServer(): Promise<void>;
    /**
     * Check if file exists
     */
    private fileExists;
    /**
     * Ensure directory exists, create if not
     */
    private ensureDirectoryExists;
    private createBranch;
    private estimateTokens;
    private callLLM;
    private getSystemPrompt;
    private buildPlanPrompt;
    private generateEditPlan;
    private extractPlanFromText;
    private generateSummary;
    private generateCode;
    private readFile;
    private writeFile;
    private editFile;
    private runCommand;
    private searchCode;
    private extractMatches;
    private findRelevantCode;
    private runTests;
    private runLinter;
    /**
     * Parse ESLint JSON output into RuleViolations
     */
    private parseLintOutput;
    private checkArchitecture;
    private canAutoFix;
    private shouldRetry;
}
//# sourceMappingURL=TaskExecutor.d.ts.map