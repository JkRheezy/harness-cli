import { EvolutionOpportunity, EvolutionConfig, EvolutionResult, BusinessContext } from './types';
export declare class OpportunityDetector {
    private logger;
    private codeAnalyzer;
    private businessAnalyzer;
    private docDriftAnalyzer;
    private config;
    constructor(config: EvolutionConfig);
    detectOpportunities(projectPath: string, context?: BusinessContext): Promise<EvolutionResult>;
    getTopOpportunities(projectPath: string, limit?: number, context?: BusinessContext): Promise<EvolutionOpportunity[]>;
    private prioritizeOpportunities;
    private categorizeOpportunities;
}
//# sourceMappingURL=OpportunityDetector.d.ts.map