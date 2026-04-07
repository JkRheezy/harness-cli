import { BaseValidationAdapter } from '../ValidationAdapter';
import { ValidationResult } from '../types';
import { HealingOrchestrator } from '../../healing/HealingOrchestrator';
import { Logger } from '../../utils/Logger';
export interface SmartAdapterConfig {
    enableHealing?: boolean;
    maxHealingCost?: number;
    llmCaller?: (prompt: string) => Promise<string>;
}
/**
 * Base class for adapters with intelligent self-healing
 */
export declare abstract class SmartValidationAdapter extends BaseValidationAdapter {
    protected healingOrchestrator: HealingOrchestrator | null;
    protected enableHealing: boolean;
    constructor(logger: Logger, workingDir: string, config?: SmartAdapterConfig);
    /**
     * Run validation with intelligent healing
     */
    validateWithHealing(): Promise<ValidationResult>;
    /**
     * Detect project type for better healing context
     */
    protected detectProjectType(): string;
    /**
     * Override runWithAutoFix to use healing
     */
    runWithAutoFix(): Promise<ValidationResult>;
}
//# sourceMappingURL=SmartValidationAdapter.d.ts.map