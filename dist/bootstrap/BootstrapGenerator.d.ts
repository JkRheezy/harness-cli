/**
 * Bootstrap Generator for Six-Layer Architecture
 * Generates complete project foundation with all 6 layers
 */
import { BootstrapInput, BootstrapResult } from './types';
export declare class BootstrapGenerator {
    private templateRegistry;
    private logger;
    constructor();
    /**
     * Main method: bootstrap a new project with six-layer architecture
     */
    bootstrap(input: BootstrapInput): Promise<BootstrapResult>;
    /**
     * Rollback created files and directories on failure
     */
    private rollback;
    /**
     * Ensure target directory exists (create if not exists)
     */
    private ensureTargetDirectory;
    /**
     * Generate a single layer
     */
    private generateLayer;
    /**
     * Replace template variables with actual values
     */
    private replaceVariables;
    /**
     * Generate root configuration files (package.json, tsconfig.json, .gitignore)
     */
    private generateRootConfigFiles;
    /**
     * Generate package.json based on tech stack
     */
    private generatePackageJson;
    /**
     * Generate tsconfig.json
     */
    private generateTsConfig;
    /**
     * Generate .gitignore
     */
    private generateGitignore;
}
//# sourceMappingURL=BootstrapGenerator.d.ts.map