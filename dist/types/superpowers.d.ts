/**
 * Superpowers integration types
 */
export type DesignPhase = 'none' | 'brainstorming' | 'planning' | 'ready';
export interface SuperpowersConfig {
    enabled: boolean;
    skillsPath: string;
    autoDesign: boolean;
    requireApproval: boolean;
}
export interface DesignResult {
    phase: DesignPhase;
    specPath?: string;
    planPath?: string;
    approved: boolean;
    summary: string;
}
export interface PRWorkflowResult {
    prNumber: number;
    prUrl: string;
    branch: string;
    reviewStatus: 'pending' | 'approved' | 'changes_requested';
    merged: boolean;
}
export interface ResilientTaskResult {
    success: boolean;
    attempts: number;
    error?: string;
    fixTaskId?: string;
    shouldRetry: boolean;
}
export interface SuperpowersBridge {
    invokeSkill(skillName: string, args: any): Promise<any>;
    runDesignPhase(task: any): Promise<DesignResult>;
    runPRWorkflow(task: any, codeResult: any): Promise<PRWorkflowResult>;
    handleFailure(task: any, error: any): Promise<ResilientTaskResult>;
}
//# sourceMappingURL=superpowers.d.ts.map