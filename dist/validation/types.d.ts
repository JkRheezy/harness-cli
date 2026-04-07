/**
 * Result of a validation attempt
 */
export interface ValidationResult {
    success: boolean;
    output?: string;
    errors?: string;
    canAutoFix?: boolean;
    autoFixAttempted?: boolean;
    autoFixResult?: boolean;
    skipped?: boolean;
    skipReason?: string;
    healingAttempted?: boolean;
    healingSucceeded?: boolean;
    healingCost?: {
        llmCalls: number;
        tokensUsed: number;
        estimatedCost: number;
    };
}
/**
 * Configuration for validation adapters
 */
export interface ValidationConfig {
    enabled: boolean;
    required: boolean;
    autoFix?: boolean;
    timeout?: number;
}
/**
 * Command execution result
 */
export interface CommandResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}
/**
 * Validation adapter interface - all validators must implement this
 */
export interface IValidationAdapter {
    name: string;
    isRequired: boolean;
    /**
     * Check if prerequisites are met for this validation
     */
    checkPrerequisites(): Promise<boolean>;
    /**
     * Attempt to auto-fix missing prerequisites
     * Returns true if fix was successful
     */
    autoFix?(): Promise<boolean>;
    /**
     * Run the validation
     */
    validate(): Promise<ValidationResult>;
    /**
     * Run with auto-fix attempt if needed
     */
    runWithAutoFix(): Promise<ValidationResult>;
}
//# sourceMappingURL=types.d.ts.map