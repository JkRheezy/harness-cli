import { Gap, TargetArchitecture, BusinessTask } from './types';
/**
 * TaskGenerator converts gaps into actionable development tasks
 */
export declare class TaskGenerator {
    /**
     * Generate BusinessTask for each gap
     */
    generate(gaps: Gap[], target: TargetArchitecture): BusinessTask[];
    /**
     * Generate a single BusinessTask from a Gap
     */
    private generateFromGap;
    /**
     * Generate a unique task ID based on the gap
     */
    private generateTaskId;
    /**
     * Generate task title based on gap type and target name
     */
    private generateTitle;
    /**
     * Generate task description based on gap type and context
     */
    private generateDescription;
    /**
     * Generate requirements from spec context
     */
    private generateRequirements;
    /**
     * Generate suggested approach for fixing the gap
     */
    private generateSuggestedApproach;
    /**
     * Map gap severity to task priority
     */
    private gapToPriority;
    /**
     * Estimate effort based on gap type
     */
    private estimateEffort;
    /**
     * Calculate maxDuration in milliseconds based on effort
     */
    private calculateMaxDuration;
    /**
     * Generate acceptance criteria from spec
     */
    private generateAcceptanceCriteria;
}
//# sourceMappingURL=TaskGenerator.d.ts.map