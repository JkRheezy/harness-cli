import { CapabilityGap, GapAnalysisResult, ExecutionFailure } from './types';
/**
 * Analyzes execution failures to identify Harness framework capability gaps
 * Triggers self-improvement when the framework lacks capabilities
 */
export declare class CapabilityGapAnalyzer {
    private logger;
    constructor();
    /**
     * Analyze execution failure and identify if it's a capability gap
     */
    analyzeFailure(failure: ExecutionFailure): CapabilityGap | null;
    /**
     * Analyze multiple failures for systemic gaps
     */
    analyzeFailures(failures: ExecutionFailure[]): GapAnalysisResult;
    private matchGapPattern;
    private isDuplicateGap;
    private generateRecommendations;
}
export default CapabilityGapAnalyzer;
//# sourceMappingURL=CapabilityGapAnalyzer.d.ts.map