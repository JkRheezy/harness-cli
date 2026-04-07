import { IValidationAdapter, ValidationResult } from './types';
import { Logger } from '../utils/Logger';
export declare abstract class BaseValidationAdapter implements IValidationAdapter {
    abstract name: string;
    abstract isRequired: boolean;
    protected logger: Logger;
    protected workingDir: string;
    protected enableAutoFix: boolean;
    constructor(logger: Logger, workingDir: string, enableAutoFix?: boolean);
    /**
     * Check if prerequisites are met
     * Subclasses must implement this
     */
    abstract checkPrerequisites(): Promise<boolean>;
    /**
     * Run the validation
     * Subclasses must implement this
     */
    abstract validate(): Promise<ValidationResult>;
    /**
     * Attempt to auto-fix missing prerequisites
     * Subclasses can override this
     */
    autoFix(): Promise<boolean>;
    /**
     * Run validation with auto-fix attempt
     *
     * Flow:
     * 1. Check prerequisites
     * 2. If not ready and autoFix enabled, attempt fix
     * 3. Run validation
     * 4. If failed and not required, mark as skipped instead
     */
    runWithAutoFix(): Promise<ValidationResult>;
}
//# sourceMappingURL=ValidationAdapter.d.ts.map