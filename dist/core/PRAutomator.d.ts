export interface PRCreateOptions {
    branch: string;
    title: string;
    body: string;
    draft?: boolean;
    autoMerge?: boolean;
}
export interface PRMergeOptions {
    number: number;
    strategy?: 'merge' | 'squash' | 'rebase';
    deleteBranch?: boolean;
}
export declare class PRAutomator {
    private git;
    private logger;
    private githubToken;
    private repo;
    private hasGhCLI;
    private ghPath;
    constructor();
    private checkGhCLI;
    private initRepo;
    create(options: PRCreateOptions): Promise<any>;
    private createWithGhCLI;
    private createWithAPI;
    private getDefaultBranch;
    merge(options: PRMergeOptions): Promise<void>;
    getPR(number: number): Promise<any>;
    listPRs(options?: {
        state?: string;
        author?: string;
    }): Promise<any[]>;
    approve(number: number, comment?: string): Promise<void>;
    requestChanges(number: number, comment: string): Promise<void>;
    addComment(number: number, comment: string): Promise<void>;
    checkStatus(number: number): Promise<any>;
    waitForChecks(number: number, timeout?: number): Promise<boolean>;
    private buildPRCreateCommand;
    private extractPRNumber;
    private escapeShellArg;
    private runCommand;
    private sleep;
}
//# sourceMappingURL=PRAutomator.d.ts.map