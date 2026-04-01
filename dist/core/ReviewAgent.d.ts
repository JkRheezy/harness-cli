import { LLMConfig } from './TaskExecutor';
export interface ReviewResult {
    status: 'approved' | 'changes_requested' | 'commented';
    canAutoApprove: boolean;
    issues: ReviewIssue[];
    suggestions: string[];
    summary: string;
}
export interface ReviewIssue {
    severity: 'error' | 'warning' | 'info';
    file?: string;
    line?: number;
    message: string;
    suggestion?: string;
    rule?: string;
}
export declare class ReviewAgent {
    private config;
    private openai?;
    private anthropic?;
    private git;
    private logger;
    constructor(config: LLMConfig);
    review(prNumber: number): Promise<ReviewResult>;
    approve(prNumber: number, comment?: string): Promise<void>;
    requestChanges(prNumber: number, comment: string): Promise<void>;
    private getPRDiff;
    private runAutomatedChecks;
    private checkArchitectureConstraints;
    private checkCodeStyle;
    private checkSecurity;
    private checkTests;
    private checkPerformance;
    /**
     * Run visual regression check
     */
    private checkVisualRegression;
    /**
     * Check for browser compatibility issues
     */
    private checkBrowserCompatibility;
    private llmReview;
    private canAutoApprove;
    private generateSummary;
    private getPRFiles;
    private hasLayerViolation;
    private getFileContent;
    private parseLintOutput;
    private callLLM;
    private runCommand;
}
//# sourceMappingURL=ReviewAgent.d.ts.map