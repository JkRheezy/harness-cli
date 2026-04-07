# Intelligent Self-Healing Validation System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan.

**Goal:** Build a hybrid self-healing system that uses fast code-level fixes for known issues and LLM-driven fixes for unknown issues, with cost control and fallback mechanisms.

**Architecture:** Three-layer healing strategy: (1) Code-level fixes for common/config issues, (2) LLM analysis for complex errors, (3) Human escalation for unresolvable issues. Includes cost tracking and retry limits.

**Tech Stack:** TypeScript, OpenAI/Anthropic SDK, existing harness LLM infrastructure

---

## Overview

This extends the ValidationAdapter system with intelligent self-healing capabilities:

```
┌─────────────────────────────────────────────────────────────┐
│                    Validation Flow                          │
├─────────────────────────────────────────────────────────────┤
│ 1. Check Prerequisites                                      │
│    └── Fail? → Level 1: Code Auto-Fix (deterministic)       │
│        └── Fail? → Level 2: LLM Analysis (intelligent)      │
│            └── Fail? → Level 3: Human Escalation            │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/healing/
├── types.ts                    # Healing result types, cost tracking
├── ErrorClassifier.ts          # Determines healing strategy per error
├── HealingOrchestrator.ts      # Coordinates 3-layer healing
├── llm/
│   ├── ErrorAnalyzer.ts        # LLM prompt for error analysis
│   └── FixGenerator.ts         # LLM prompt for fix generation
└── strategies/
    ├── CodeLevelStrategy.ts    # Fast deterministic fixes
    └── LLMLevelStrategy.ts     # Intelligent LLM-driven fixes

src/validation/
└── adapters/
    └── SmartValidationAdapter.ts  # Base class with healing support
```

---

## Task 1: Define Healing Types and Interfaces

**Files:**
- Create: `src/healing/types.ts`

- [ ] **Step 1: Create healing types**

```typescript
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
  strategy: string;
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
```

- [ ] **Step 2: Commit**

```bash
git add src/healing/types.ts
git commit -m "feat(healing): add healing types and cost tracking interfaces"
```

---

## Task 2: Create Error Classifier

**Files:**
- Create: `src/healing/ErrorClassifier.ts`

- [ ] **Step 1: Implement error classification**

```typescript
import { ErrorClassification, ErrorCategory, HealingLevel } from './types';

/**
 * Classifies errors to determine optimal healing strategy
 * Uses pattern matching for fast classification
 */
export class ErrorClassifier {
  /**
   * Known error patterns and their categories
   */
  private static patterns: Array<{
    category: ErrorCategory;
    level: HealingLevel;
    patterns: RegExp[];
  }> = [
    {
      category: ErrorCategory.CONFIG_MISSING,
      level: HealingLevel.CODE,
      patterns: [
        /eslint|eslintrc|\.eslintrc/i,
        /prettier|prettierrc/i,
        /tsconfig\.json|typescript config/i,
        /jest\.config|test config/i
      ]
    },
    {
      category: ErrorCategory.DEPENDENCY_MISSING,
      level: HealingLevel.CODE,
      patterns: [
        /cannot find module|module not found/i,
        /node_modules|npm install|yarn add/i,
        /package not found/i
      ]
    },
    {
      category: ErrorCategory.COMMAND_NOT_FOUND,
      level: HealingLevel.CODE,
      patterns: [
        /command not found|is not recognized/i,
        /ENOENT.*spawn/i,
        /'.+' is not installed/i
      ]
    },
    {
      category: ErrorCategory.TIMEOUT,
      level: HealingLevel.CODE,
      patterns: [
        /timeout|timed out/i,
        /ETIMEDOUT|ECONNRESET/i,
        /exceeded.*time/i
      ]
    },
    {
      category: ErrorCategory.BUILD_ERROR,
      level: HealingLevel.LLM,
      patterns: [
        /build failed|compilation error/i,
        /syntax error|parse error/i,
        /type error|typeScript error/i
      ]
    },
    {
      category: ErrorCategory.TEST_FAILURE,
      level: HealingLevel.LLM,
      patterns: [
        /test failed|assertion failed/i,
        /expect.*received/i,
        /snapshot mismatch/i
      ]
    },
    {
      category: ErrorCategory.LINT_ERROR,
      level: HealingLevel.CODE,
      patterns: [
        /eslint.*error|lint.*error/i,
        /prettier.*error/i,
        /code style/i
      ]
    }
  ];

  /**
   * Classify an error to determine healing strategy
   */
  classify(error: string | Error): ErrorClassification {
    const errorString = typeof error === 'string' 
      ? error 
      : `${error.message}\n${error.stack || ''}`;
    
    // Try pattern matching first (fast path)
    for (const { category, level, patterns } of ErrorClassifier.patterns) {
      for (const pattern of patterns) {
        if (pattern.test(errorString)) {
          return {
            category,
            severity: this.inferSeverity(category),
            suggestedStrategy: level,
            knownPattern: true,
            context: this.extractContext(category, errorString)
          };
        }
      }
    }
    
    // Unknown error - use LLM
    return {
      category: ErrorCategory.UNKNOWN,
      severity: 'warning',
      suggestedStrategy: HealingLevel.LLM,
      knownPattern: false,
      context: {}
    };
  }

  /**
   * Check if error is likely fixable at code level
   */
  isCodeLevelFixable(error: string | Error): boolean {
    const classification = this.classify(error);
    return classification.suggestedStrategy === HealingLevel.CODE;
  }

  /**
   * Infer severity from category
   */
  private inferSeverity(category: ErrorCategory): 'blocking' | 'warning' | 'info' {
    switch (category) {
      case ErrorCategory.CONFIG_MISSING:
      case ErrorCategory.DEPENDENCY_MISSING:
      case ErrorCategory.COMMAND_NOT_FOUND:
        return 'blocking';
      case ErrorCategory.LINT_ERROR:
        return 'warning';
      case ErrorCategory.TIMEOUT:
        return 'info';
      default:
        return 'blocking';
    }
  }

  /**
   * Extract relevant context from error
   */
  private extractContext(category: ErrorCategory, error: string): any {
    const context: any = {};
    
    switch (category) {
      case ErrorCategory.CONFIG_MISSING:
        const configMatch = error.match(/(['"]?)([\w.-]+\.(json|js|ts|yaml|yml))\1/);
        if (configMatch) {
          context.missingConfig = configMatch[2];
        }
        break;
        
      case ErrorCategory.DEPENDENCY_MISSING:
        const moduleMatch = error.match(/cannot find module ['"]([^'"]+)['"]/i);
        if (moduleMatch) {
          context.missingModule = moduleMatch[1];
        }
        break;
        
      case ErrorCategory.COMMAND_NOT_FOUND:
        const cmdMatch = error.match(/command not found:\s*(\w+)/i);
        if (cmdMatch) {
          context.missingCommand = cmdMatch[1];
        }
        break;
    }
    
    return context;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/healing/ErrorClassifier.ts
git commit -m "feat(healing): add error classifier with pattern matching"
```

---

## Task 3: Create LLM Error Analyzer

**Files:**
- Create: `src/healing/llm/ErrorAnalyzer.ts`

- [ ] **Step 1: Implement LLM-based error analysis**

```typescript
import { LLMErrorAnalysis, LLMSuggestedFix } from '../types';

/**
 * Uses LLM to analyze complex errors that pattern matching can't handle
 */
export class LLMErrorAnalyzer {
  private llmCaller: (prompt: string) => Promise<string>;
  private maxTokens: number;

  constructor(llmCaller: (prompt: string) => Promise<string>, maxTokens: number = 2000) {
    this.llmCaller = llmCaller;
    this.maxTokens = maxTokens;
  }

  /**
   * Analyze an error using LLM
   */
  async analyze(error: string, context: {
    taskType?: string;
    projectType?: string;
    filesChanged?: string[];
    recentCommands?: string[];
  } = {}): Promise<LLMErrorAnalysis> {
    const prompt = this.buildAnalysisPrompt(error, context);
    const response = await this.llmCaller(prompt);
    
    return this.parseAnalysis(response);
  }

  /**
   * Build prompt for error analysis
   */
  private buildAnalysisPrompt(error: string, context: any): string {
    return `You are a DevOps expert analyzing build/test errors. 

Analyze this error and suggest fixes:

\`\`\`
${error}
\`\`\`

Context:
- Task type: ${context.taskType || 'unknown'}
- Project type: ${context.projectType || 'unknown'}
${context.filesChanged ? `- Files changed: ${context.filesChanged.join(', ')}` : ''}
${context.recentCommands ? `- Recent commands: ${context.recentCommands.join(', ')}` : ''}

Respond in this JSON format:
{
  "rootCause": "Clear explanation of what caused the error",
  "isFixable": true/false,
  "confidence": 0.0-1.0,
  "requiresHuman": true/false,
  "reasoning": "Step-by-step reasoning",
  "suggestedFixes": [
    {
      "type": "create_file|modify_file|run_command|install_dependency",
      "description": "Human-readable description",
      "priority": 1-10,
      "filePath": "path if applicable",
      "content": "file content if creating/modifying",
      "command": "shell command if applicable",
      "packageName": "npm package if applicable"
    }
  ]
}

Guidelines:
1. Only suggest fixes you're confident about (confidence > 0.7)
2. Prioritize file creation over modification
3. For missing dependencies, check if it's a devDependency or dependency
4. Set "requiresHuman" if the fix might be risky or ambiguous
5. Keep fixes minimal and focused`;
  }

  /**
   * Parse LLM response into structured analysis
   */
  private parseAnalysis(response: string): LLMErrorAnalysis {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        rootCause: parsed.rootCause || 'Unknown',
        isFixable: parsed.isFixable ?? false,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
        requiresHuman: parsed.requiresHuman ?? true,
        reasoning: parsed.reasoning || '',
        suggestedFixes: (parsed.suggestedFixes || []).map((fix: any) => ({
          type: fix.type || 'run_command',
          description: fix.description || 'Unknown fix',
          priority: fix.priority || 5,
          filePath: fix.filePath,
          content: fix.content,
          command: fix.command,
          packageName: fix.packageName
        }))
      };
    } catch (error) {
      // Fallback: treat as unfixable
      return {
        rootCause: 'Failed to parse LLM analysis',
        isFixable: false,
        confidence: 0,
        requiresHuman: true,
        reasoning: `Parse error: ${error}`,
        suggestedFixes: []
      };
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/healing/llm/
git commit -m "feat(healing): add LLM-based error analyzer"
```

---

## Task 4: Create Code-Level Healing Strategy

**Files:**
- Create: `src/healing/strategies/CodeLevelStrategy.ts`

- [ ] **Step 1: Implement fast code-level fixes**

```typescript
import { HealingAttempt, HealingCost, AppliedFix, ErrorClassification, ErrorCategory } from '../types';
import { ErrorClassifier } from '../ErrorClassifier';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

/**
 * Fast, deterministic healing for common issues
 * No LLM calls - pure code logic
 */
export class CodeLevelStrategy {
  private workingDir: string;
  private logger: any;

  constructor(workingDir: string, logger: any) {
    this.workingDir = workingDir;
    this.logger = logger;
  }

  /**
   * Attempt to heal using code-level fixes
   */
  async heal(error: string | Error, classification: ErrorClassification): Promise<HealingAttempt> {
    const startTime = Date.now();
    const attempt: HealingAttempt = {
      level: 1,
      strategy: 'code-level',
      success: false,
      durationMs: 0,
      cost: { llmCalls: 0, tokensUsed: 0, estimatedCost: 0 }
    };

    try {
      switch (classification.category) {
        case ErrorCategory.CONFIG_MISSING:
          attempt.success = await this.fixMissingConfig(classification);
          break;
          
        case ErrorCategory.DEPENDENCY_MISSING:
          attempt.success = await this.fixMissingDependency(classification);
          break;
          
        case ErrorCategory.COMMAND_NOT_FOUND:
          attempt.success = await this.fixMissingCommand(classification);
          break;
          
        case ErrorCategory.TIMEOUT:
          attempt.success = await this.handleTimeout(classification);
          break;
          
        default:
          attempt.error = 'No code-level fix available for this error type';
          return attempt;
      }

      if (attempt.success) {
        attempt.appliedFix = {
          type: 'config',
          description: `Fixed ${classification.category}`
        };
      }

    } catch (e: any) {
      attempt.error = e.message;
    }

    attempt.durationMs = Date.now() - startTime;
    return attempt;
  }

  /**
   * Fix missing configuration files
   */
  private async fixMissingConfig(classification: ErrorClassification): Promise<boolean> {
    const config = classification.context.missingConfig;
    
    // Check if it's a known config type
    if (!config || config.includes('.eslintrc')) {
      return this.createEslintConfig();
    }
    
    if (config.includes('tsconfig')) {
      return this.createTsConfig();
    }
    
    if (config.includes('jest')) {
      return this.createJestConfig();
    }
    
    this.logger.warn(`[CodeLevelStrategy] Unknown config type: ${config}`);
    return false;
  }

  /**
   * Create ESLint config for Next.js projects
   */
  private async createEslintConfig(): Promise<boolean> {
    try {
      const packageJsonPath = path.join(this.workingDir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return false;
      }
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Next.js project
      if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
        const eslintConfig = { extends: 'next/core-web-vitals' };
        fs.writeFileSync(
          path.join(this.workingDir, '.eslintrc.json'),
          JSON.stringify(eslintConfig, null, 2) + '\n'
        );
        this.logger.info('[CodeLevelStrategy] Created .eslintrc.json for Next.js');
        return true;
      }
      
      // Generic TypeScript project
      if (fs.existsSync(path.join(this.workingDir, 'tsconfig.json'))) {
        const eslintConfig = {
          parser: '@typescript-eslint/parser',
          extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
          parserOptions: { ecmaVersion: 2020, sourceType: 'module' }
        };
        fs.writeFileSync(
          path.join(this.workingDir, '.eslintrc.json'),
          JSON.stringify(eslintConfig, null, 2) + '\n'
        );
        this.logger.info('[CodeLevelStrategy] Created .eslintrc.json for TypeScript');
        return true;
      }
      
      // Basic JavaScript project
      const eslintConfig = { extends: 'eslint:recommended' };
      fs.writeFileSync(
        path.join(this.workingDir, '.eslintrc.json'),
        JSON.stringify(eslintConfig, null, 2) + '\n'
      );
      this.logger.info('[CodeLevelStrategy] Created basic .eslintrc.json');
      return true;
      
    } catch (error: any) {
      this.logger.error('[CodeLevelStrategy] Failed to create ESLint config:', error.message);
      return false;
    }
  }

  /**
   * Create basic tsconfig.json
   */
  private async createTsConfig(): Promise<boolean> {
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        outDir: './dist',
        rootDir: './src'
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist']
    };
    
    fs.writeFileSync(
      path.join(this.workingDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2) + '\n'
    );
    this.logger.info('[CodeLevelStrategy] Created tsconfig.json');
    return true;
  }

  /**
   * Create basic Jest config
   */
  private async createJestConfig(): Promise<boolean> {
    const jestConfig = {
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testMatch: ['**/__tests__/**/*.test.ts']
    };
    
    fs.writeFileSync(
      path.join(this.workingDir, 'jest.config.js'),
      `module.exports = ${JSON.stringify(jestConfig, null, 2)};\n`
    );
    this.logger.info('[CodeLevelStrategy] Created jest.config.js');
    return true;
  }

  /**
   * Fix missing dependencies by running npm install
   */
  private async fixMissingDependency(classification: ErrorClassification): Promise<boolean> {
    const moduleName = classification.context.missingModule;
    
    try {
      this.logger.info('[CodeLevelStrategy] Installing dependencies...');
      await execAsync('npm install', { 
        cwd: this.workingDir,
        timeout: 300000 
      });
      this.logger.info('[CodeLevelStrategy] Dependencies installed');
      return true;
    } catch (error: any) {
      this.logger.error('[CodeLevelStrategy] npm install failed:', error.message);
      return false;
    }
  }

  /**
   * Handle command not found
   */
  private async fixMissingCommand(classification: ErrorClassification): Promise<boolean> {
    const command = classification.context.missingCommand;
    
    // For now, we can't auto-install system commands
    // But we can suggest it in the logs
    this.logger.warn(`[CodeLevelStrategy] Missing system command: ${command}`);
    return false;
  }

  /**
   * Handle timeout - retry with longer timeout (conceptual)
   */
  private async handleTimeout(classification: ErrorClassification): Promise<boolean> {
    this.logger.info('[CodeLevelStrategy] Timeout detected, will retry with extended timeout');
    // The actual retry happens at a higher level
    return true;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/healing/strategies/
git commit -m "feat(healing): add code-level healing strategy for common issues"
```

---

## Task 5: Create LLM-Level Healing Strategy

**Files:**
- Create: `src/healing/strategies/LLMLevelStrategy.ts`

- [ ] **Step 1: Implement LLM-driven healing**

```typescript
import { HealingAttempt, HealingCost, LLMSuggestedFix } from '../types';
import { LLMErrorAnalyzer } from '../llm/ErrorAnalyzer';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

/**
 * Intelligent healing using LLM analysis
 * More flexible but slower and more expensive
 */
export class LLMLevelStrategy {
  private analyzer: LLMErrorAnalyzer;
  private workingDir: string;
  private logger: any;
  private maxAttempts: number;
  
  constructor(
    llmCaller: (prompt: string) => Promise<string>,
    workingDir: string,
    logger: any,
    maxAttempts: number = 3
  ) {
    this.analyzer = new LLMErrorAnalyzer(llmCaller);
    this.workingDir = workingDir;
    this.logger = logger;
    this.maxAttempts = maxAttempts;
  }

  /**
   * Attempt to heal using LLM analysis
   */
  async heal(error: string | Error, context: any = {}): Promise<HealingAttempt> {
    const startTime = Date.now();
    const attempt: HealingAttempt = {
      level: 2,
      strategy: 'llm-analysis',
      success: false,
      durationMs: 0,
      cost: { llmCalls: 0, tokensUsed: 0, estimatedCost: 0 }
    };

    try {
      // Step 1: Analyze error with LLM
      this.logger.info('[LLMLevelStrategy] Analyzing error with LLM...');
      const analysis = await this.analyzer.analyze(
        typeof error === 'string' ? error : error.message,
        context
      );
      
      // Track cost (rough estimate)
      attempt.cost.llmCalls = 1;
      attempt.cost.tokensUsed = 1500; // Approximate
      attempt.cost.estimatedCost = 0.03; // $0.03 per analysis
      
      this.logger.info(`[LLMLevelStrategy] Root cause: ${analysis.rootCause}`);
      this.logger.info(`[LLMLevelStrategy] Confidence: ${analysis.confidence}`);
      
      // Step 2: Check if fixable
      if (!analysis.isFixable || analysis.confidence < 0.6) {
        attempt.error = `LLM confidence too low (${analysis.confidence}) or not fixable`;
        if (analysis.requiresHuman) {
          attempt.error += ' - requires human intervention';
        }
        attempt.durationMs = Date.now() - startTime;
        return attempt;
      }
      
      // Step 3: Apply fixes
      let anyFixApplied = false;
      
      for (const fix of analysis.suggestedFixes.slice(0, this.maxAttempts)) {
        this.logger.info(`[LLMLevelStrategy] Applying fix: ${fix.description}`);
        
        const applied = await this.applyFix(fix);
        if (applied) {
          anyFixApplied = true;
          attempt.appliedFix = {
            type: fix.type === 'run_command' ? 'command' : 
                  fix.type === 'install_dependency' ? 'command' : 'file',
            description: fix.description,
            files: fix.filePath ? [fix.filePath] : undefined,
            commands: fix.command ? [fix.command] : 
                      fix.packageName ? [`npm install ${fix.packageName}`] : undefined
          };
          break; // Only apply one fix at a time
        }
      }
      
      attempt.success = anyFixApplied;
      
    } catch (e: any) {
      attempt.error = `LLM healing failed: ${e.message}`;
    }

    attempt.durationMs = Date.now() - startTime;
    return attempt;
  }

  /**
   * Apply a single LLM-suggested fix
   */
  private async applyFix(fix: LLMSuggestedFix): Promise<boolean> {
    try {
      switch (fix.type) {
        case 'create_file':
          return await this.createFile(fix.filePath!, fix.content!);
          
        case 'modify_file':
          return await this.modifyFile(fix.filePath!, fix.content!);
          
        case 'run_command':
          return await this.runCommand(fix.command!);
          
        case 'install_dependency':
          return await this.installDependency(fix.packageName!);
          
        default:
          this.logger.warn(`[LLMLevelStrategy] Unknown fix type: ${fix.type}`);
          return false;
      }
    } catch (error: any) {
      this.logger.error(`[LLMLevelStrategy] Fix failed:`, error.message);
      return false;
    }
  }

  private async createFile(filePath: string, content: string): Promise<boolean> {
    const fullPath = path.join(this.workingDir, filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content);
    this.logger.info(`[LLMLevelStrategy] Created file: ${filePath}`);
    return true;
  }

  private async modifyFile(filePath: string, content: string): Promise<boolean> {
    const fullPath = path.join(this.workingDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
      this.logger.warn(`[LLMLevelStrategy] File not found for modification: ${filePath}`);
      return false;
    }
    
    fs.writeFileSync(fullPath, content);
    this.logger.info(`[LLMLevelStrategy] Modified file: ${filePath}`);
    return true;
  }

  private async runCommand(command: string): Promise<boolean> {
    this.logger.info(`[LLMLevelStrategy] Running command: ${command}`);
    await execAsync(command, { cwd: this.workingDir, timeout: 60000 });
    return true;
  }

  private async installDependency(packageName: string): Promise<boolean> {
    this.logger.info(`[LLMLevelStrategy] Installing dependency: ${packageName}`);
    await execAsync(`npm install ${packageName}`, { 
      cwd: this.workingDir, 
      timeout: 120000 
    });
    return true;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/healing/strategies/
git commit -m "feat(healing): add LLM-level healing strategy for complex errors"
```

---

## Task 6: Create Healing Orchestrator

**Files:**
- Create: `src/healing/HealingOrchestrator.ts`
- Create: `src/healing/index.ts`

- [ ] **Step 1: Implement orchestrator**

```typescript
import { 
  HealingResult, 
  HealingAttempt, 
  HealingLevel, 
  HealingCost,
  ErrorClassification 
} from './types';
import { ErrorClassifier } from './ErrorClassifier';
import { CodeLevelStrategy } from './strategies/CodeLevelStrategy';
import { LLMLevelStrategy } from './strategies/LLMLevelStrategy';

export interface OrchestratorConfig {
  maxCodeAttempts: number;
  maxLLMAttempts: number;
  maxTotalCost: number; // USD
  enableLLM: boolean;
}

/**
 * Orchestrates multi-level healing with cost control
 */
export class HealingOrchestrator {
  private classifier: ErrorClassifier;
  private codeStrategy: CodeLevelStrategy;
  private llmStrategy: LLMLevelStrategy | null;
  private config: OrchestratorConfig;
  private logger: any;
  
  constructor(
    workingDir: string,
    logger: any,
    llmCaller?: (prompt: string) => Promise<string>,
    config: Partial<OrchestratorConfig> = {}
  ) {
    this.classifier = new ErrorClassifier();
    this.codeStrategy = new CodeLevelStrategy(workingDir, logger);
    this.config = {
      maxCodeAttempts: 2,
      maxLLMAttempts: 1,
      maxTotalCost: 0.10, // $0.10 max per healing session
      enableLLM: true,
      ...config
    };
    this.logger = logger;
    
    // Only create LLM strategy if caller provided and enabled
    if (llmCaller && this.config.enableLLM) {
      this.llmStrategy = new LLMLevelStrategy(llmCaller, workingDir, logger);
    } else {
      this.llmStrategy = null;
    }
  }

  /**
   * Main healing entry point
   * Implements 3-layer healing with cost tracking
   */
  async heal(error: string | Error, context: any = {}): Promise<HealingResult> {
    const attempts: HealingAttempt[] = [];
    let totalCost: HealingCost = { llmCalls: 0, tokensUsed: 0, estimatedCost: 0 };
    
    this.logger.info('[HealingOrchestrator] Starting healing process...');
    
    // Step 1: Classify error
    const classification = this.classifier.classify(error);
    this.logger.info(`[HealingOrchestrator] Error classified as: ${classification.category}`);
    this.logger.info(`[HealingOrchestrator] Suggested strategy: Level ${classification.suggestedStrategy}`);
    
    // Step 2: Try code-level healing first (if applicable)
    if (classification.suggestedStrategy <= HealingLevel.CODE) {
      for (let i = 0; i < this.config.maxCodeAttempts; i++) {
        this.logger.info(`[HealingOrchestrator] Code-level attempt ${i + 1}/${this.config.maxCodeAttempts}`);
        
        const attempt = await this.codeStrategy.heal(error, classification);
        attempts.push(attempt);
        
        if (attempt.success) {
          this.logger.info('[HealingOrchestrator] ✓ Code-level healing succeeded');
          return this.buildResult(true, attempts, totalCost);
        }
        
        this.logger.warn(`[HealingOrchestrator] ✗ Code-level attempt failed: ${attempt.error}`);
      }
    }
    
    // Step 3: Try LLM-level healing (if enabled and not too expensive)
    if (this.llmStrategy && classification.suggestedStrategy <= HealingLevel.LLM) {
      if (totalCost.estimatedCost >= this.config.maxTotalCost) {
        this.logger.warn(`[HealingOrchestrator] Cost limit reached ($${totalCost.estimatedCost}), skipping LLM`);
      } else {
        for (let i = 0; i < this.config.maxLLMAttempts; i++) {
          this.logger.info(`[HealingOrchestrator] LLM-level attempt ${i + 1}/${this.config.maxLLMAttempts}`);
          
          const attempt = await this.llmStrategy.heal(error, context);
          attempts.push(attempt);
          
          // Track cost
          totalCost.llmCalls += attempt.cost.llmCalls;
          totalCost.tokensUsed += attempt.cost.tokensUsed;
          totalCost.estimatedCost += attempt.cost.estimatedCost;
          
          if (attempt.success) {
            this.logger.info('[HealingOrchestrator] ✓ LLM-level healing succeeded');
            return this.buildResult(true, attempts, totalCost);
          }
          
          this.logger.warn(`[HealingOrchestrator] ✗ LLM-level attempt failed: ${attempt.error}`);
          
          // Check cost after each LLM attempt
          if (totalCost.estimatedCost >= this.config.maxTotalCost) {
            this.logger.warn(`[HealingOrchestrator] Cost limit reached, stopping LLM attempts`);
            break;
          }
        }
      }
    }
    
    // Step 4: Escalation - all healing failed
    this.logger.error('[HealingOrchestrator] All healing attempts failed, escalating to human');
    
    return this.buildResult(false, attempts, totalCost, true);
  }

  /**
   * Quick check if healing is likely to succeed
   */
  canProbablyHeal(error: string | Error): boolean {
    const classification = this.classifier.classify(error);
    return classification.suggestedStrategy <= HealingLevel.LLM;
  }

  /**
   * Estimate healing cost before attempting
   */
  estimateCost(error: string | Error): HealingCost {
    const classification = this.classifier.classify(error);
    
    if (classification.suggestedStrategy === HealingLevel.CODE) {
      return { llmCalls: 0, tokensUsed: 0, estimatedCost: 0 };
    }
    
    if (classification.suggestedStrategy === HealingLevel.LLM && this.llmStrategy) {
      return { 
        llmCalls: 1, 
        tokensUsed: 1500, 
        estimatedCost: 0.03 
      };
    }
    
    return { llmCalls: 0, tokensUsed: 0, estimatedCost: 0 };
  }

  private buildResult(
    success: boolean, 
    attempts: HealingAttempt[], 
    cost: HealingCost,
    escalated: boolean = false
  ): HealingResult {
    return {
      success,
      strategy: success ? attempts[attempts.length - 1].strategy : 'escalation',
      attempts,
      cost,
      canRetry: !success && !escalated,
      escalationReason: escalated ? 'All healing strategies exhausted' : undefined
    };
  }
}
```

- [ ] **Step 2: Create healing index**

```typescript
// src/healing/index.ts
export * from './types';
export { ErrorClassifier } from './ErrorClassifier';
export { HealingOrchestrator } from './HealingOrchestrator';
export { CodeLevelStrategy } from './strategies/CodeLevelStrategy';
export { LLMLevelStrategy } from './strategies/LLMLevelStrategy';
```

- [ ] **Step 3: Commit**

```bash
git add src/healing/
git commit -m "feat(healing): add healing orchestrator with 3-layer strategy and cost control"
```

---

## Task 7: Integrate Smart Validation Adapter

**Files:**
- Create: `src/validation/adapters/SmartValidationAdapter.ts`
- Modify: `src/validation/adapters/index.ts`

- [ ] **Step 1: Create smart adapter base class**

```typescript
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
export abstract class SmartValidationAdapter extends BaseValidationAdapter {
  protected healingOrchestrator: HealingOrchestrator | null;
  protected enableHealing: boolean;

  constructor(
    logger: Logger,
    workingDir: string,
    config: SmartAdapterConfig = {}
  ) {
    super(logger, workingDir, config.enableHealing ?? true);
    this.enableHealing = config.enableHealing ?? true;
    
    if (this.enableHealing) {
      this.healingOrchestrator = new HealingOrchestrator(
        workingDir,
        logger,
        config.llmCaller,
        { maxTotalCost: config.maxHealingCost ?? 0.10 }
      );
    } else {
      this.healingOrchestrator = null;
    }
  }

  /**
   * Run validation with intelligent healing
   */
  async validateWithHealing(): Promise<ValidationResult> {
    // First attempt
    let result = await this.validate();
    
    // If failed and healing enabled, try to heal
    if (!result.success && this.healingOrchestrator && result.errors) {
      this.logger.info(`[${this.name}] Validation failed, attempting healing...`);
      
      const healingResult = await this.healingOrchestrator.heal(result.errors, {
        taskType: this.name,
        projectType: this.detectProjectType()
      });
      
      // Log healing results
      this.logger.info(`[${this.name}] Healing attempts: ${healingResult.attempts.length}`);
      this.logger.info(`[${this.name}] Healing cost: $${healingResult.cost.estimatedCost.toFixed(4)}`);
      
      if (healingResult.success) {
        this.logger.info(`[${this.name}] Healing succeeded, retrying validation...`);
        
        // Retry validation after healing
        result = await this.validate();
        
        // Add healing info to result
        result.healingAttempted = true;
        result.healingSucceeded = true;
        result.healingCost = healingResult.cost;
      } else {
        this.logger.warn(`[${this.name}] Healing failed: ${healingResult.escalationReason}`);
        result.healingAttempted = true;
        result.healingSucceeded = false;
        result.healingCost = healingResult.cost;
      }
    }
    
    return result;
  }

  /**
   * Detect project type for better healing context
   */
  protected detectProjectType(): string {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const packageJsonPath = path.join(this.workingDir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return 'unknown';
      }
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      if (packageJson.dependencies?.next) return 'nextjs';
      if (packageJson.dependencies?.react) return 'react';
      if (packageJson.dependencies?.vue) return 'vue';
      if (packageJson.dependencies?.express) return 'express';
      if (packageJson.devDependencies?.typescript) return 'typescript';
      
      return 'nodejs';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Override runWithAutoFix to use healing
   */
  async runWithAutoFix(): Promise<ValidationResult> {
    const ready = await this.checkPrerequisites();
    
    if (!ready) {
      // Try standard auto-fix first
      if (this.enableAutoFix && this.autoFix) {
        this.logger.info(`[${this.name}] Prerequisites not met, attempting standard auto-fix...`);
        const fixed = await this.autoFix();
        
        if (!fixed && this.healingOrchestrator) {
          // Try intelligent healing for prerequisites
          const error = `Prerequisites not met for ${this.name}`;
          const healingResult = await this.healingOrchestrator.heal(error);
          
          if (!healingResult.success) {
            return {
              success: false,
              skipped: !this.isRequired,
              skipReason: `Prerequisites not met and healing failed`,
              canAutoFix: healingResult.canRetry
            };
          }
        } else if (!fixed) {
          return {
            success: false,
            skipped: !this.isRequired,
            skipReason: `Prerequisites not met`,
            canAutoFix: false
          };
        }
      }
    }
    
    // Run validation with healing
    return await this.validateWithHealing();
  }
}
```

- [ ] **Step 2: Update exports**

Add to `src/validation/adapters/index.ts`:

```typescript
export { 
  SmartValidationAdapter, 
  SmartAdapterConfig 
} from './SmartValidationAdapter';
```

- [ ] **Step 3: Commit**

```bash
git add src/validation/adapters/
git commit -m "feat(validation): add SmartValidationAdapter with integrated healing"
```

---

## Task 8: Write Tests

**Files:**
- Create: `src/healing/__tests__/ErrorClassifier.test.ts`
- Create: `src/healing/__tests__/HealingOrchestrator.test.ts`

- [ ] **Step 1: Test error classifier**

```typescript
import { ErrorClassifier } from '../ErrorClassifier';
import { ErrorCategory, HealingLevel } from '../types';

describe('ErrorClassifier', () => {
  let classifier: ErrorClassifier;

  beforeEach(() => {
    classifier = new ErrorClassifier();
  });

  it('should classify ESLint config missing as CODE level', () => {
    const error = 'Error: Cannot find .eslintrc.json';
    const result = classifier.classify(error);
    
    expect(result.category).toBe(ErrorCategory.CONFIG_MISSING);
    expect(result.suggestedStrategy).toBe(HealingLevel.CODE);
    expect(result.knownPattern).toBe(true);
  });

  it('should classify module not found as CODE level', () => {
    const error = "Error: Cannot find module 'express'";
    const result = classifier.classify(error);
    
    expect(result.category).toBe(ErrorCategory.DEPENDENCY_MISSING);
    expect(result.suggestedStrategy).toBe(HealingLevel.CODE);
  });

  it('should classify build errors as LLM level', () => {
    const error = 'TypeScript compilation error: Type string is not assignable to type number';
    const result = classifier.classify(error);
    
    expect(result.category).toBe(ErrorCategory.BUILD_ERROR);
    expect(result.suggestedStrategy).toBe(HealingLevel.LLM);
  });

  it('should classify unknown errors as LLM level', () => {
    const error = 'Something weird happened';
    const result = classifier.classify(error);
    
    expect(result.category).toBe(ErrorCategory.UNKNOWN);
    expect(result.suggestedStrategy).toBe(HealingLevel.LLM);
    expect(result.knownPattern).toBe(false);
  });
});
```

- [ ] **Step 2: Test orchestrator**

```typescript
import { HealingOrchestrator } from '../HealingOrchestrator';
import { Logger } from '../../utils/Logger';

describe('HealingOrchestrator', () => {
  let orchestrator: HealingOrchestrator;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    orchestrator = new HealingOrchestrator('/tmp', logger);
  });

  it('should estimate zero cost for code-level fixes', () => {
    const error = 'Cannot find module';
    const cost = orchestrator.estimateCost(error);
    
    expect(cost.llmCalls).toBe(0);
    expect(cost.estimatedCost).toBe(0);
  });

  it('should estimate cost for unknown errors', () => {
    const error = 'Something weird';
    const cost = orchestrator.estimateCost(error);
    
    expect(cost.llmCalls).toBe(1);
    expect(cost.estimatedCost).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run tests and commit**

```bash
cd harness-cli
npm test -- --testPathPattern="healing"
git add src/healing/__tests__/
git commit -m "test(healing): add unit tests for error classifier and orchestrator"
```

---

## Summary

This hybrid self-healing system provides:

| Layer | Speed | Cost | Intelligence | Use Case |
|-------|-------|------|--------------|----------|
| **Code-Level** | ⚡ Fast | Free | Deterministic | Config missing, dependencies |
| **LLM-Level** | 🐢 Slow | $0.03/call | Intelligent | Complex build errors |
| **Escalation** | 👤 Manual | Human time | Expert | Unresolvable issues |

### Key Features

1. **Cost Control**: Max $0.10 per healing session
2. **Fallback Chain**: Code → LLM → Human
3. **Smart Classification**: Pattern matching decides strategy
4. **Transparent**: Logs all attempts and costs

### Integration with ValidationAdapter

```typescript
// Usage in TaskExecutor
const adapter = new SmartTestAdapter(logger, workingDir, {
  enableHealing: true,
  maxHealingCost: 0.05, // $0.05 limit
  llmCaller: (prompt) => llmService.call(prompt)
});

const result = await adapter.runWithAutoFix();
// Automatically heals if validation fails
```

---

**Plan complete!** Two execution options:

1. **Subagent-Driven** - Fresh subagent per task, review between
2. **Inline Execution** - Batch execution in this session

Which approach?
