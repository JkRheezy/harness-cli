import { IValidationAdapter, ValidationResult } from './types';
import { Logger } from '../utils/Logger';

export abstract class BaseValidationAdapter implements IValidationAdapter {
  abstract name: string;
  abstract isRequired: boolean;
  protected logger: Logger;
  protected workingDir: string;
  protected enableAutoFix: boolean;
  
  constructor(
    logger: Logger, 
    workingDir: string,
    enableAutoFix: boolean = true
  ) {
    this.logger = logger;
    this.workingDir = workingDir;
    this.enableAutoFix = enableAutoFix;
  }
  
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
  async autoFix(): Promise<boolean> {
    return false;
  }
  
  /**
   * Run validation with auto-fix attempt
   * 
   * Flow:
   * 1. Check prerequisites
   * 2. If not ready and autoFix enabled, attempt fix
   * 3. Run validation
   * 4. If failed and not required, mark as skipped instead
   */
  async runWithAutoFix(): Promise<ValidationResult> {
    // Step 1: Check prerequisites
    const ready = await this.checkPrerequisites();
    
    if (!ready) {
      // Step 2: Try auto-fix if enabled and available
      if (this.enableAutoFix && this.autoFix) {
        this.logger.info(`[${this.name}] Prerequisites not met, attempting auto-fix...`);
        const fixed = await this.autoFix();
        
        if (!fixed) {
          const message = `Prerequisites not met and auto-fix failed`;
          this.logger.warn(`[${this.name}] ${message}`);
          
          return {
            success: false,
            skipped: !this.isRequired,
            skipReason: message,
            canAutoFix: true,
            autoFixAttempted: true,
            autoFixResult: false
          };
        }
        
        this.logger.info(`[${this.name}] Auto-fix successful`);
      } else {
        const message = `Prerequisites not met (auto-fix disabled or unavailable)`;
        this.logger.warn(`[${this.name}] ${message}`);
        
        return {
          success: false,
          skipped: !this.isRequired,
          skipReason: message,
          canAutoFix: false,
          autoFixAttempted: false
        };
      }
    }
    
    // Step 3: Run validation
    const result = await this.validate();
    
    // Step 4: If failed but not required, convert to skipped
    if (!result.success && !this.isRequired && !result.skipped) {
      this.logger.warn(`[${this.name}] Validation failed but is optional, marking as skipped`);
      return {
        ...result,
        skipped: true,
        skipReason: result.errors || 'Validation failed (optional)'
      };
    }
    
    return result;
  }
}
