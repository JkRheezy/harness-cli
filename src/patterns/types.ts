/**
 * Pattern Types
 * 
 * Type definitions for the pattern overlay system that extends
 * the six-layer foundation architecture.
 */

import { BootstrapInput, PatternChoice } from '../bootstrap/types';

/**
 * Pattern definition metadata
 */
export interface Pattern {
  name: string;
  version: string;
  description: string;
  appliesTo: string[];
}

/**
 * Pattern application context
 */
export interface PatternApplication {
  pattern: Pattern;
  targetDir: string;
  projectName: string;
  config?: Record<string, unknown>;
}

/**
 * File modification record for tracking changes
 */
export interface FileModification {
  path: string;
  type: 'create' | 'modify' | 'delete';
  description: string;
}

/**
 * Result of applying a pattern
 */
export interface PatternResult {
  pattern: string;
  success: boolean;
  filesCreated: string[];
  modifications: FileModification[];
  error?: string;
}

/**
 * Interface for pattern appliers
 */
export interface PatternApplier {
  readonly pattern: Pattern;
  canApply(input: { patterns?: PatternChoice[] | string[] }): boolean;
  apply(application: PatternApplication): Promise<PatternResult>;
}

/**
 * Agent definition for multi-agent pattern
 */
export interface AgentDefinition {
  name: string;
  role: string;
  responsibilities: string[];
  layer: 'service' | 'runtime';
}

/**
 * Multi-agent pattern configuration
 */
export interface MultiAgentConfig {
  agents: AgentDefinition[];
  orchestratorType: 'centralized' | 'decentralized' | 'hierarchical';
  communicationProtocol: 'message-bus' | 'direct' | 'event-driven';
}
