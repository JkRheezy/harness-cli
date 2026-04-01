import { Rule, RuleContext, RuleViolation, RuleFix } from './types';
export interface PatternDefinition {
    pattern: string;
    message: string;
    fix?: RuleFix;
}
/**
 * Extract pattern and fix from rule markdown content
 * Looks for YAML code block like:
 * ```yaml
 * pattern: console\.log
 * message: Use logger instead
 * fix:
 *   instruction: Replace with logger
 *   replacement: logger.info()
 * ```
 */
export declare function extractPatternFromContent(content: string): PatternDefinition | null;
/**
 * Match rule pattern against file content
 * Returns violations with fix information and capture groups
 */
export declare function matchPattern(rule: Rule, context: RuleContext): RuleViolation[];
/**
 * Check if rule applies to file based on paths glob patterns
 */
export declare function shouldApplyRule(rule: Rule, filePath: string, projectRoot: string): boolean;
//# sourceMappingURL=PatternMatcher.d.ts.map