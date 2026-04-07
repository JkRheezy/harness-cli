import { HealingAttempt, ErrorClassification } from '../types';
/**
 * Fast, deterministic healing for common issues
 * No LLM calls - pure code logic
 */
export declare class CodeLevelStrategy {
    private workingDir;
    private logger;
    constructor(workingDir: string, logger: any);
    /**
     * Attempt to heal using code-level fixes
     */
    heal(error: string | Error, classification: ErrorClassification): Promise<HealingAttempt>;
    /**
     * Fix missing configuration files
     */
    private fixMissingConfig;
    /**
     * Create ESLint config for Next.js projects
     */
    private createEslintConfig;
    /**
     * Create basic tsconfig.json
     */
    private createTsConfig;
    /**
     * Create basic Jest config
     */
    private createJestConfig;
    /**
     * Fix missing dependencies by running npm install
     */
    private fixMissingDependency;
    /**
     * Handle command not found
     */
    private fixMissingCommand;
    /**
     * Handle timeout - retry with longer timeout (conceptual)
     */
    private handleTimeout;
}
//# sourceMappingURL=CodeLevelStrategy.d.ts.map