import { EvolutionOpportunity, BusinessContext } from '../types';
export declare class BusinessAnalyzer {
    private logger;
    constructor();
    analyze(projectPath: string, context: BusinessContext): Promise<EvolutionOpportunity[]>;
    private analyzeUserFlows;
    private findFeatureGaps;
    private analyzeDomainCompleteness;
}
//# sourceMappingURL=BusinessAnalyzer.d.ts.map