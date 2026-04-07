/**
 * Types for Self-Improvement System
 * Framework capability gap analysis and evolution
 */
export interface CapabilityGap {
    id: string;
    category: 'bootstrap' | 'documentation' | 'loop' | 'pattern' | 'integration';
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    evidence: string;
    suggestedFix: string;
    estimatedEffort: 'small' | 'medium' | 'large';
}
export interface GapAnalysisResult {
    gaps: CapabilityGap[];
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    recommendations: string[];
}
export interface ExecutionFailure {
    taskId: string;
    taskName: string;
    error: string;
    context: string;
    timestamp: Date;
}
export interface ImprovementTask {
    id: string;
    gapId: string;
    title: string;
    description: string;
    filesToModify: string[];
    filesToCreate: string[];
    acceptanceCriteria: string[];
    priority: 'critical' | 'high' | 'medium' | 'low';
    status: 'pending' | 'in-progress' | 'completed';
}
//# sourceMappingURL=types.d.ts.map