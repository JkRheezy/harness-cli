/**
 * Multi-Agent Pattern
 *
 * Implements the multi-agent pattern overlay that adds agent-based
 * architecture components to the six-layer foundation.
 */
import { BasePatternApplier } from './PatternApplier';
import { Pattern, PatternApplication, PatternResult } from './types';
import { PatternChoice } from '../bootstrap/types';
/**
 * Multi-Agent pattern implementation
 */
export declare class MultiAgentPattern extends BasePatternApplier {
    readonly pattern: Pattern;
    /**
     * Default agent definitions
     */
    private readonly defaultAgents;
    /**
     * Check if this pattern should be applied
     */
    canApply(input: {
        patterns?: PatternChoice[] | string[];
    }): boolean;
    /**
     * Apply the multi-agent pattern
     */
    apply(application: PatternApplication): Promise<PatternResult>;
    /**
     * Get configuration with defaults
     */
    private getConfig;
    /**
     * Create agent type definitions
     */
    private createAgentTypes;
    /**
     * Create BaseAgent abstract class
     */
    private createBaseAgent;
    /**
     * Create orchestrator based on configuration
     */
    private createOrchestrator;
    /**
     * Create message bus based on configuration
     */
    private createMessageBus;
    /**
     * Create agent implementations
     */
    private createAgentImplementations;
    /**
     * Generate agent implementation code
     */
    private generateAgentImplementation;
}
//# sourceMappingURL=MultiAgentPattern.d.ts.map