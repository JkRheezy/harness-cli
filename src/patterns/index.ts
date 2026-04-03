/**
 * Patterns Module
 * 
 * Pattern overlay system for extending the six-layer foundation architecture.
 * Patterns provide reusable architectural extensions like multi-agent systems.
 */

// Export types
export * from './types';

// Export pattern appliers
export { BasePatternApplier } from './PatternApplier';
export { MultiAgentPattern } from './MultiAgentPattern';

// Export registry
export { PatternRegistry, patternRegistry } from './PatternRegistry';
