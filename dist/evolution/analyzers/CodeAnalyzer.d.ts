import { EvolutionOpportunity } from '../types';
export declare class CodeAnalyzer {
    private logger;
    constructor();
    analyze(projectPath: string): Promise<EvolutionOpportunity[]>;
    private findTODOs;
    private findTestCoverageGaps;
    private findCodeSmells;
}
//# sourceMappingURL=CodeAnalyzer.d.ts.map