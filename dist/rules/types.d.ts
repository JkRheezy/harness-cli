/**
 * Severity levels for rule violations
 */
export type Severity = 'error' | 'warning' | 'info';
/**
 * RuleFix provides instructions for automatically or manually fixing a rule violation.
 * This implements the OpenAI Harness paradigm of "error messages with fix instructions".
 */
export interface RuleFix {
    /** Human-readable instructions on how to fix the issue */
    instruction?: string;
    /** Replacement text to apply (supports $1, $2 capture group references) */
    replacement?: string;
    /** Example of code before the fix */
    example_before?: string;
    /** Example of code after the fix */
    example_after?: string;
    /** AI prompt for LLM-based transformation (for complex fixes) */
    transform_prompt?: string;
}
/**
 * Rule defines a linting/evolvable rule with fix support
 */
export interface Rule {
    /** Unique identifier for the rule */
    id: string;
    /** Human-readable name */
    name: string;
    /** Description of what the rule checks */
    description: string;
    /** Severity level */
    severity: Severity;
    /** Rule content/pattern (e.g., regex or rule logic) */
    content: string;
    /** Path to the rule definition file */
    sourcePath?: string;
    /** File paths/patterns this rule applies to */
    paths?: string[];
    /** Whether this rule can be auto-fixed */
    autoFixable: boolean;
    /** Fix instructions if auto-fixable */
    fix?: RuleFix;
    /** Whether this rule is disabled */
    disabled: boolean;
    /** Rule version for tracking evolution */
    version: string;
    /** Tags for categorization */
    tags: string[];
}
/**
 * RuleViolation represents a specific instance of a rule violation
 */
export interface RuleViolation {
    /** ID of the violated rule */
    ruleId: string;
    /** Name of the violated rule */
    ruleName: string;
    /** Severity of the violation */
    severity: Severity;
    /** File path where violation occurred */
    filePath: string;
    /** Line number (1-based) */
    line?: number;
    /** Column number (1-based) */
    column?: number;
    /** Human-readable error message */
    message: string;
    /** Fix instructions specific to this violation */
    fix?: RuleFix;
    /** Whether this violation can be auto-fixed */
    autoFixable: boolean;
    /** Code snippet showing the violation context */
    codeSnippet?: string;
    /** RegExp match array for capture group replacement */
    match?: RegExpMatchArray;
}
/**
 * FixResult contains the outcome of applying fixes to a file
 */
export interface FixResult {
    /** Whether the fix operation was successful */
    success: boolean;
    /** true if some fixes applied but others failed */
    partial: boolean;
    /** The fixed code (if successful) */
    fixedCode?: string;
    /** List of successfully applied fixes */
    appliedFixes: Array<{
        line: number;
        ruleId: string;
        original: string;
        replacement: string;
    }>;
    /** List of failed fixes with reasons */
    failedFixes: Array<{
        line: number;
        ruleId: string;
        reason: string;
    }>;
    /** Error message if the operation failed */
    error?: string;
}
/**
 * RuleContext provides context for rule checking
 */
export interface RuleContext {
    /** Root directory of the project */
    projectRoot: string;
    /** Path to the file being checked */
    filePath: string;
    /** Content of the file being checked */
    fileContent: string;
}
/**
 * BuiltInRuleChecker interface for built-in rule implementations
 */
export interface BuiltInRuleChecker {
    /** Unique identifier for the rule */
    id: string;
    /** Check method that returns violations */
    check(context: RuleContext): Promise<RuleViolation[]>;
}
//# sourceMappingURL=types.d.ts.map