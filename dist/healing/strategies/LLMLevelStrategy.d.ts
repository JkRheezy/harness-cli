import { HealingAttempt } from '../types';
/**
 * Intelligent healing using LLM analysis
 * More flexible but slower and more expensive
 */
export declare class LLMLevelStrategy {
    private analyzer;
    private workingDir;
    private logger;
    private maxAttempts;
    constructor(llmCaller: (prompt: string) => Promise<string>, workingDir: string, logger: any, maxAttempts?: number);
    /**
     * Attempt to heal using LLM analysis
     */
    heal(error: string | Error, context?: any): Promise<HealingAttempt>;
    /**
     * Apply a single LLM-suggested fix
     */
    private applyFix;
    private createFile;
    private modifyFile;
    private runCommand;
    private installDependency;
}
//# sourceMappingURL=LLMLevelStrategy.d.ts.map