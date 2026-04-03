/**
 * Pattern Registry
 *
 * Central registry for all pattern appliers. Manages pattern registration,
 * discovery, and application to projects.
 */
import { PatternApplier, Pattern, PatternApplication, PatternResult } from './types';
import { BootstrapInput, PatternChoice } from '../bootstrap/types';
/**
 * Pattern registry for managing and applying patterns
 */
export declare class PatternRegistry {
    private appliers;
    /**
     * Register a pattern applier
     */
    register(name: string, applier: PatternApplier): void;
    /**
     * Get a registered pattern applier by name
     */
    get(name: string): PatternApplier | undefined;
    /**
     * Get all registered patterns
     */
    getAll(): Pattern[];
    /**
     * Find patterns that can be applied to the given input
     */
    findApplicable(input: {
        patterns?: PatternChoice[] | string[];
    }): PatternApplier[];
    /**
     * Check if a pattern is registered
     */
    has(name: string): boolean;
    /**
     * Unregister a pattern
     */
    unregister(name: string): boolean;
    /**
     * Clear all registered patterns
     */
    clear(): void;
    /**
     * Apply a specific pattern by name
     */
    applyPattern(name: string, application: PatternApplication): Promise<PatternResult>;
    /**
     * Apply all applicable patterns for the given input
     */
    applyAllApplicable(input: BootstrapInput, targetDir: string, projectName: string): Promise<PatternResult[]>;
    /**
     * Register default built-in patterns
     */
    registerDefaultPatterns(): void;
}
/**
 * Singleton instance of the pattern registry
 */
export declare const patternRegistry: PatternRegistry;
//# sourceMappingURL=PatternRegistry.d.ts.map