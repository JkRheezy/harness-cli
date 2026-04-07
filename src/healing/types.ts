/**
 * Result of a healing attempt
 */
export interface HealingResult {
  success: boolean;
  strategy: HealingStrategyType;
  attempts: HealingAttempt[];
  finalError?: string;
  cost: HealingCost;
  canRetry: boolean;
  escalationReason?: string;
}

/**
 * Individual healing attempt
 */
export interface HealingAttempt {
  level: HealingLevel;
  strategy: HealingStrategyType;
  success: boolean;
  durationMs: number;
  cost: HealingCost;
  error?: string;
  appliedFix?: AppliedFix;
}

/**
 * Cost tracking for healing operations
 */
export interface HealingCost {
  llmCalls: number;
  tokensUsed: number;
  estimatedCost: number; // USD
}

/**
 * Fix that was applied
 */
export interface AppliedFix {
  type: 'file' | 'command' | 'config';
  description: string;
  files?: string[];
  commands?: string[];
}

export enum HealingLevel {
  CODE = 1,    // Fast, deterministic, cheap
  LLM = 2,     // Intelligent, slower, expensive
  HUMAN = 3    // Escalation, manual intervention
}

export type HealingStrategyType = 
  | 'code-level' 
  | 'llm-analysis' 
  | 'llm-fix' 
  | 'escalation' 
  | 'none';

/**
 * Error classification result
 */
export interface ErrorClassification {
  category: ErrorCategory;
  severity: 'blocking' | 'warning' | 'info';
  suggestedStrategy: HealingLevel;
  knownPattern: boolean;
  context: {
    errorType?: string;
    missingFile?: string;
    missingConfig?: string;
    commandFailed?: string;
    missingModule?: string;
    missingCommand?: string;
  };
}

export enum ErrorCategory {
  CONFIG_MISSING = 'config_missing',
  DEPENDENCY_MISSING = 'dependency_missing',
  COMMAND_NOT_FOUND = 'command_not_found',
  BUILD_ERROR = 'build_error',
  TEST_FAILURE = 'test_failure',
  LINT_ERROR = 'lint_error',
  TIMEOUT = 'timeout',
  NETWORK_ERROR = 'network_error',
  UNKNOWN = 'unknown'
}

/**
 * LLM analysis result
 */
export interface LLMErrorAnalysis {
  rootCause: string;
  isFixable: boolean;
  confidence: number; // 0-1
  suggestedFixes: LLMSuggestedFix[];
  requiresHuman: boolean;
  reasoning: string;
}

export interface LLMSuggestedFix {
  type: 'create_file' | 'modify_file' | 'run_command' | 'install_dependency';
  description: string;
  priority: number;
  filePath?: string;
  content?: string;
  command?: string;
  packageName?: string;
}
