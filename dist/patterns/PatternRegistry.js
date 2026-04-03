"use strict";
/**
 * Pattern Registry
 *
 * Central registry for all pattern appliers. Manages pattern registration,
 * discovery, and application to projects.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.patternRegistry = exports.PatternRegistry = void 0;
const MultiAgentPattern_1 = require("./MultiAgentPattern");
/**
 * Pattern registry for managing and applying patterns
 */
class PatternRegistry {
    constructor() {
        this.appliers = new Map();
    }
    /**
     * Register a pattern applier
     */
    register(name, applier) {
        this.appliers.set(name, applier);
    }
    /**
     * Get a registered pattern applier by name
     */
    get(name) {
        return this.appliers.get(name);
    }
    /**
     * Get all registered patterns
     */
    getAll() {
        return Array.from(this.appliers.values()).map(applier => applier.pattern);
    }
    /**
     * Find patterns that can be applied to the given input
     */
    findApplicable(input) {
        return Array.from(this.appliers.values()).filter(applier => applier.canApply(input));
    }
    /**
     * Check if a pattern is registered
     */
    has(name) {
        return this.appliers.has(name);
    }
    /**
     * Unregister a pattern
     */
    unregister(name) {
        return this.appliers.delete(name);
    }
    /**
     * Clear all registered patterns
     */
    clear() {
        this.appliers.clear();
    }
    /**
     * Apply a specific pattern by name
     */
    async applyPattern(name, application) {
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
    async applyAllApplicable(input, targetDir, projectName) {
        const applicable = this.findApplicable(input);
        const results = [];
        for (const applier of applicable) {
            // Find the matching pattern choice to get config
            const patternChoice = input.patterns?.find(p => p.name === applier.pattern.name);
            const application = {
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
    registerDefaultPatterns() {
        // Register multi-agent pattern
        this.register('multi-agent', new MultiAgentPattern_1.MultiAgentPattern());
    }
}
exports.PatternRegistry = PatternRegistry;
/**
 * Singleton instance of the pattern registry
 */
exports.patternRegistry = new PatternRegistry();
//# sourceMappingURL=PatternRegistry.js.map