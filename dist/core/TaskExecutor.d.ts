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
    constructor(config: LLMConfig);
    execute(task: any, options?: ExecuteOptions): Promise<any>;
    private prepareContext;
    private generatePlan;
    private executeStep;
    private validateResults;
    private createBranch;
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
    private checkArchitecture;
    private canAutoFix;
    private shouldRetry;
}
//# sourceMappingURL=TaskExecutor.d.ts.map