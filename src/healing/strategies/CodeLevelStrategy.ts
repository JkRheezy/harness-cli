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
