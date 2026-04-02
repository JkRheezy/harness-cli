import { AgentsMdManager } from './managers/AgentsMdManager';
import { EvolutionOpportunity, EvolutionConfig, EvolutionResult, BusinessContext } from './types';
export declare class OpportunityDetector {
    private logger;
    private codeAnalyzer;
    private businessAnalyzer;
    private docDriftAnalyzer;
    private requirementDiscoveryEngine;
    private agentsMdManager;
    private smartTaskGenerator;
    private config;
    private projectPath;
    constructor(config: EvolutionConfig, projectPath?: string);
    detectOpportunities(projectPath: string, context?: BusinessContext): Promise<EvolutionResult>;
    getTopOpportunities(projectPath: string, limit?: number, context?: BusinessContext): Promise<EvolutionOpportunity[]>;
    private prioritizeOpportunities;
    /**
     * Convert discovered gaps to evolution opportunities
     */
    private convertGapsToOpportunities;
    /**
     * Convert a single gap to evolution opportunity
     */
    private convertGapToOpportunity;
    /**
     * Update AGENTS.md with discovered gaps
     */
    private updateAgentsMd;
    private categorizeOpportunities;
    /**
     * Get the AgentsMdManager instance
     */
    getAgentsMdManager(): AgentsMdManager | null;
    /**
     * Set project path and initialize managers
     */
    setProjectPath(projectPath: string): void;
}
//# sourceMappingURL=OpportunityDetector.d.ts.map