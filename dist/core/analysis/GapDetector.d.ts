/**
 * GapDetector - Compares target architecture with current implementation to identify gaps
 */
import { TargetArchitecture, CurrentImplementation, Gap } from './types';
export declare class GapDetector {
    private gapCounter;
    /**
     * Main entry point to detect all gaps between target and current implementation
     */
    detect(target: TargetArchitecture, current: CurrentImplementation): Gap[];
    /**
     * Detect agents defined in spec but not implemented
     */
    private detectMissingAgents;
    /**
     * Detect modules defined in spec but not implemented
     */
    private detectMissingModules;
    /**
     * Detect modules that exist but are missing expected interfaces
     */
    private detectIncompleteModules;
    /**
     * Detect individual missing interfaces
     */
    private detectMissingInterfaces;
    /**
     * Detect code that exists but is not defined in the spec (orphan code)
     */
    private detectOrphanCode;
    /**
     * Calculate severity based on gap type and target name
     */
    private calculateSeverity;
    /**
     * Helper to create a Gap object with common fields
     */
    private createGap;
}
//# sourceMappingURL=GapDetector.d.ts.map