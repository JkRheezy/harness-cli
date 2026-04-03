/**
 * Pattern Registry
 * 
 * Central registry for all pattern appliers. Manages pattern registration,
 * discovery, and application to projects.
 */

import { PatternApplier, Pattern, PatternApplication, PatternResult } from './types';
import { MultiAgentPattern } from './MultiAgentPattern';
import { BootstrapInput, PatternChoice } from '../bootstrap/types';

/**
 * Pattern registry for managing and applying patterns
 */
export class PatternRegistry {
  private appliers: Map<string, PatternApplier> = new Map();

  /**
   * Register a pattern applier
   */
  register(name: string, applier: PatternApplier): void {
    this.appliers.set(name, applier);
  }

  /**
   * Get a registered pattern applier by name
   */
  get(name: string): PatternApplier | undefined {
    return this.appliers.get(name);
  }

  /**
   * Get all registered patterns
   */
  getAll(): Pattern[] {
    return Array.from(this.appliers.values()).map(applier => applier.pattern);
  }

  /**
   * Find patterns that can be applied to the given input
   */
  findApplicable(input: { patterns?: PatternChoice[] | string[] }): PatternApplier[] {
    return Array.from(this.appliers.values()).filter(applier => 
      applier.canApply(input)
    );
  }

  /**
   * Check if a pattern is registered
   */
  has(name: string): boolean {
    return this.appliers.has(name);
  }

  /**
   * Unregister a pattern
   */
  unregister(name: string): boolean {
    return this.appliers.delete(name);
  }

  /**
   * Clear all registered patterns
   */
  clear(): void {
    this.appliers.clear();
  }

  /**
   * Apply a specific pattern by name
   */
  async applyPattern(
    name: string, 
    application: PatternApplication
  ): Promise<PatternResult> {
    const applier = this.appliers.get(name);
    if (!applier) {
      return {
        pattern: name,
        success: false,
        filesCreated: [],
        modifications: [],
        error: `Pattern '${name}' not found in registry`
      };
    }

    return applier.apply(application);
  }

  /**
   * Apply all applicable patterns for the given input
   */
  async applyAllApplicable(
    input: BootstrapInput,
    targetDir: string,
    projectName: string
  ): Promise<PatternResult[]> {
    const applicable = this.findApplicable(input);
    const results: PatternResult[] = [];

    for (const applier of applicable) {
      // Find the matching pattern choice to get config
      const patternChoice = input.patterns?.find(
        p => p.name === applier.pattern.name
      );

      const application: PatternApplication = {
        pattern: applier.pattern,
        targetDir,
        projectName,
        config: patternChoice?.config
      };

      const result = await applier.apply(application);
      results.push(result);
    }

    return results;
  }

  /**
   * Register default built-in patterns
   */
  registerDefaultPatterns(): void {
    // Register multi-agent pattern
    this.register('multi-agent', new MultiAgentPattern());
  }
}

/**
 * Singleton instance of the pattern registry
 */
export const patternRegistry = new PatternRegistry();
