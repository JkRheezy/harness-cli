import { RuleViolation, FixResult } from './types';
/**
 * Options for RuleFixer
 */
export interface RuleFixerOptions {
    /** If true, only simulate fixes without applying them */
    dryRun: boolean;
}
/**
 * RuleFixer applies automatic fixes to rule violations.
 *
 * Implements the OpenAI Harness paradigm:
 * - Error messages include fix instructions (not just WHAT is wrong, but HOW to fix)
 * - Supports capture group replacement ($1, $2, etc.)
 * - Processes fixes from bottom-to-top to preserve line numbers
 */
export declare class RuleFixer {
    private options;
    constructor(options?: RuleFixerOptions);
    /**
     * Apply fixes to file content
     * @param fileContent - The original file content
     * @param violations - List of violations to fix
     * @returns FixResult with the fixed code and applied/failed fixes
     */
    fixFile(fileContent: string, violations: RuleViolation[]): Promise<FixResult>;
    /**
     * Apply a single fix to the working lines
     * @param lines - Array of file lines (modified in place)
     * @param violation - The violation to fix
     * @returns Result of the fix operation
     */
    private applyFix;
    /**
     * Process capture group references in replacement string
     * @param replacement - The replacement string with $1, $2, etc.
     * @param match - The RegExp match array
     * @returns Processed replacement string
     */
    private processCaptureGroups;
    /**
     * Generate human-readable fix report
     * @param violations - List of violations to report
     * @returns Formatted report string
     */
    generateFixReport(violations: RuleViolation[]): string;
    /**
     * Check if all violations can be auto-fixed
     * @param violations - List of violations to check
     * @returns true if all violations are auto-fixable
     */
    canAutoFixAll(violations: RuleViolation[]): boolean;
    /**
     * Count auto-fixable vs manual fix violations
     * @param violations - List of violations to count
     * @returns Object with counts
     */
    countAutoFixable(violations: RuleViolation[]): {
        autoFixable: number;
        manualFix: number;
    };
}
//# sourceMappingURL=RuleFixer.d.ts.map