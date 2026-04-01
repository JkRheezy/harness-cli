import { PRWorkflowResult } from '../types/superpowers';
export declare class PRWorkflow {
    private logger;
    private prAutomator;
    private reviewAgent;
    constructor();
    /**
     * Run complete PR workflow: create → review → (optional) merge
     */
    run(task: any, codeResult: any): Promise<PRWorkflowResult>;
    /**
     * Create PR for the task
     */
    private createPR;
    /**
     * Run code review
     */
    private runReview;
    /**
     * Merge PR
     */
    private mergePR;
    private buildPRBody;
}
//# sourceMappingURL=PRWorkflow.d.ts.map