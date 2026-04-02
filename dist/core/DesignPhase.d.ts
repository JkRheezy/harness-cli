import { DesignResult } from '../types/superpowers';
export declare class DesignPhase {
    private logger;
    private skillInvoker;
    private autoDesign;
    constructor(autoDesign?: boolean, skillsPath?: string);
    /**
     * Run complete design phase for a task
     */
    run(task: any): Promise<DesignResult>;
    /**
     * Run brainstorming skill
     */
    private runBrainstorming;
    /**
     * Run writing-plans skill
     */
    private runPlanning;
    private createResult;
}
//# sourceMappingURL=DesignPhase.d.ts.map