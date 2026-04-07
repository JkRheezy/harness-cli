# Validation Adapter System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pluggable validation system with auto-healing capabilities and graceful degradation to replace hardcoded validation in TaskExecutor.

**Architecture:** Use Adapter pattern to encapsulate different validation types (test, lint, browser), each with prerequisite checking and optional auto-fix. A ValidationManager coordinates all adapters, collecting results and determining overall success. Non-required validations can be skipped without failing the task.

**Tech Stack:** TypeScript, Node.js, Jest for testing

---

## File Structure

```
src/validation/
├── types.ts                    # Shared interfaces and types
├── ValidationAdapter.ts        # Base adapter class
├── adapters/
│   ├── TestAdapter.ts          # npm test validation
│   ├── LintAdapter.ts          # npm run lint with ESLint auto-fix
│   └── BrowserAdapter.ts       # Browser validation
├── ValidationManager.ts        # Coordinates all adapters
└── index.ts                    # Public exports

src/core/TaskExecutor.ts        # Modify to use new system (lines 417-464)

src/validation/__tests__/
├── TestAdapter.test.ts
├── LintAdapter.test.ts
├── BrowserAdapter.test.ts
└── ValidationManager.test.ts
```

---

## Prerequisites Check

- [ ] Verify `src/core/TaskExecutor.ts` exists and has `validateResults` method at line ~417
- [ ] Verify `npm run build` compiles successfully
- [ ] Verify `npm test` passes

---

## Task 1: Create Shared Types

**Files:**
- Create: `src/validation/types.ts`

**Purpose:** Define interfaces used across the validation system.

- [ ] **Step 1: Write types file**

```typescript
/**
 * Result of a validation attempt
 */
export interface ValidationResult {
  success: boolean;
  output?: string;
  errors?: string;
  canAutoFix?: boolean;
  autoFixAttempted?: boolean;
  autoFixResult?: boolean;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Configuration for validation adapters
 */
export interface ValidationConfig {
  enabled: boolean;
  required: boolean;
  autoFix?: boolean;
  timeout?: number;
}

/**
 * Command execution result
 */
export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/validation/types.ts
git commit -m "feat(validation): add shared types for validation system"
```

---

## Task 2: Create Base Validation Adapter

**Files:**
- Create: `src/validation/ValidationAdapter.ts`
- Modify: `src/validation/types.ts` (add interface)

**Purpose:** Define the contract and base implementation for all validation adapters.

- [ ] **Step 1: Update types.ts to add interface**

Add to `src/validation/types.ts`:

```typescript
import { Logger } from '../utils/Logger';

/**
 * Validation adapter interface - all validators must implement this
 */
export interface ValidationAdapter {
  name: string;
  isRequired: boolean;
  
  /**
   * Check if prerequisites are met for this validation
   */
  checkPrerequisites(): Promise<boolean>;
  
  /**
   * Attempt to auto-fix missing prerequisites
   * Returns true if fix was successful
   */
  autoFix?(): Promise<boolean>;
  
  /**
   * Run the validation
   */
  validate(): Promise<ValidationResult>;
  
  /**
   * Run with auto-fix attempt if needed
   */
  runWithAutoFix(): Promise<ValidationResult>;
}
```

- [ ] **Step 2: Create base adapter class**

Create `src/validation/ValidationAdapter.ts`:

```typescript
import { ValidationAdapter, ValidationResult } from './types';
import { Logger } from '../utils/Logger';

export abstract class BaseValidationAdapter implements ValidationAdapter {
  abstract name: string;
  abstract isRequired: boolean;
  protected logger: Logger;
  protected workingDir: string;
  protected enableAutoFix: boolean;
  
  constructor(
    logger: Logger, 
    workingDir: string,
    enableAutoFix: boolean = true
  ) {
    this.logger = logger;
    this.workingDir = workingDir;
    this.enableAutoFix = enableAutoFix;
  }
  
  /**
   * Check if prerequisites are met
   * Subclasses must implement this
   */
  abstract checkPrerequisites(): Promise<boolean>;
  
  /**
   * Run the validation
   * Subclasses must implement this
   */
  abstract validate(): Promise<ValidationResult>;
  
  /**
   * Attempt to auto-fix missing prerequisites
   * Subclasses can override this
   */
  async autoFix(): Promise<boolean> {
    return false;
  }
  
  /**
   * Run validation with auto-fix attempt
   * 
   * Flow:
   * 1. Check prerequisites
   * 2. If not ready and autoFix enabled, attempt fix
   * 3. Run validation
   * 4. If failed and not required, mark as skipped instead
   */
  async runWithAutoFix(): Promise<ValidationResult> {
    // Step 1: Check prerequisites
    const ready = await this.checkPrerequisites();
    
    if (!ready) {
      // Step 2: Try auto-fix if enabled and available
      if (this.enableAutoFix && this.autoFix) {
        this.logger.info(`[${this.name}] 🔧 Prerequisites not met, attempting auto-fix...`);
        const fixed = await this.autoFix();
        
        if (!fixed) {
          const message = `Prerequisites not met and auto-fix failed`;
          this.logger.warn(`[${this.name}] ⚠️ ${message}`);
          
          return {
            success: false,
            skipped: !this.isRequired,
            skipReason: message,
            canAutoFix: true,
            autoFixAttempted: true,
            autoFixResult: false
          };
        }
        
        this.logger.info(`[${this.name}] ✅ Auto-fix successful`);
      } else {
        const message = `Prerequisites not met (auto-fix disabled or unavailable)`;
        this.logger.warn(`[${this.name}] ⚠️ ${message}`);
        
        return {
          success: false,
          skipped: !this.isRequired,
          skipReason: message,
          canAutoFix: false,
          autoFixAttempted: false
        };
      }
    }
    
    // Step 3: Run validation
    const result = await this.validate();
    
    // Step 4: If failed but not required, convert to skipped
    if (!result.success && !this.isRequired && !result.skipped) {
      this.logger.warn(`[${this.name}] ⚠️ Validation failed but is optional, marking as skipped`);
      return {
        ...result,
        skipped: true,
        skipReason: result.errors || 'Validation failed (optional)'
      };
    }
    
    return result;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/validation/types.ts src/validation/ValidationAdapter.ts
git commit -m "feat(validation): add base validation adapter class"
```

---

## Task 3: Create Test Adapter

**Files:**
- Create: `src/validation/adapters/TestAdapter.ts`
- Create: `src/validation/adapters/index.ts`

**Purpose:** Adapter for running `npm test` with prerequisite checking.

- [ ] **Step 1: Create TestAdapter**

Create `src/validation/adapters/TestAdapter.ts`:

```typescript
import { BaseValidationAdapter } from '../ValidationAdapter';
import { ValidationResult, CommandResult } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface TestAdapterConfig {
  testScript?: string;
  timeout?: number;
}

export class TestAdapter extends BaseValidationAdapter {
  name = 'Test';
  isRequired = true;
  private testScript: string;
  private timeout: number;
  
  constructor(
    logger: any,
    workingDir: string,
    config: TestAdapterConfig = {},
    enableAutoFix: boolean = true
  ) {
    super(logger, workingDir, enableAutoFix);
    this.testScript = config.testScript || 'npm test';
    this.timeout = config.timeout || 120000; // 2 minutes
  }
  
  /**
   * Check prerequisites:
   * - package.json exists
   * - test script is defined
   * - node_modules exists
   */
  async checkPrerequisites(): Promise<boolean> {
    try {
      const packageJsonPath = path.join(this.workingDir, 'package.json');
      
      // Check package.json exists
      if (!fs.existsSync(packageJsonPath)) {
        this.logger.warn('[TestAdapter] No package.json found');
        return false;
      }
      
      // Check node_modules exists
      const nodeModulesPath = path.join(this.workingDir, 'node_modules');
      if (!fs.existsSync(nodeModulesPath)) {
        this.logger.warn('[TestAdapter] node_modules not found, dependencies may not be installed');
        return false;
      }
      
      // Check test script exists
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (!packageJson.scripts || !packageJson.scripts.test) {
        this.logger.warn('[TestAdapter] No test script in package.json');
        return false;
      }
      
      return true;
    } catch (error: any) {
      this.logger.error('[TestAdapter] Error checking prerequisites:', error.message);
      return false;
    }
  }
  
  /**
   * Auto-fix: Install dependencies if missing
   */
  async autoFix(): Promise<boolean> {
    try {
      const nodeModulesPath = path.join(this.workingDir, 'node_modules');
      
      if (!fs.existsSync(nodeModulesPath)) {
        this.logger.info('[TestAdapter] Installing dependencies...');
        await execAsync('npm install', { 
          cwd: this.workingDir,
          timeout: 300000 // 5 minutes
        });
        this.logger.info('[TestAdapter] Dependencies installed');
      }
      
      return true;
    } catch (error: any) {
      this.logger.error('[TestAdapter] Auto-fix failed:', error.message);
      return false;
    }
  }
  
  /**
   * Run tests
   */
  async validate(): Promise<ValidationResult> {
    try {
      this.logger.info(`[TestAdapter] Running "${this.testScript}"...`);
      
      const result = await this.runCommand(this.testScript);
      
      return {
        success: result.exitCode === 0,
        output: result.stdout,
        errors: result.stderr
      };
    } catch (error: any) {
      return {
        success: false,
        errors: error.message || String(error)
      };
    }
  }
  
  private async runCommand(command: string): Promise<CommandResult> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workingDir,
        timeout: this.timeout,
        env: { ...process.env, CI: 'true' } // CI mode for consistent output
      });
      
      return {
        exitCode: 0,
        stdout: stdout || '',
        stderr: stderr || ''
      };
    } catch (error: any) {
      return {
        exitCode: error.code || 1,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message || ''
      };
    }
  }
}
```

- [ ] **Step 2: Create adapters index file**

Create `src/validation/adapters/index.ts`:

```typescript
export { TestAdapter, TestAdapterConfig } from './TestAdapter';
```

- [ ] **Step 3: Commit**

```bash
git add src/validation/adapters/
git commit -m "feat(validation): add TestAdapter with auto-install dependencies"
```

---

## Task 4: Create Lint Adapter with ESLint Auto-Fix

**Files:**
- Create: `src/validation/adapters/LintAdapter.ts`
- Modify: `src/validation/adapters/index.ts`

**Purpose:** Adapter for running `npm run lint` with ESLint configuration auto-creation.

- [ ] **Step 1: Create LintAdapter**

Create `src/validation/adapters/LintAdapter.ts`:

```typescript
import { BaseValidationAdapter } from '../ValidationAdapter';
import { ValidationResult, CommandResult } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface LintAdapterConfig {
  lintScript?: string;
  timeout?: number;
}

export class LintAdapter extends BaseValidationAdapter {
  name = 'Lint';
  isRequired = false; // Lint is optional - failures shouldn't block task
  private lintScript: string;
  private timeout: number;
  
  constructor(
    logger: any,
    workingDir: string,
    config: LintAdapterConfig = {},
    enableAutoFix: boolean = true
  ) {
    super(logger, workingDir, enableAutoFix);
    this.lintScript = config.lintScript || 'npm run lint';
    this.timeout = config.timeout || 60000; // 1 minute
  }
  
  /**
   * Check prerequisites:
   * - package.json exists
   * - lint script is defined
   * - ESLint config exists (for Next.js projects)
   */
  async checkPrerequisites(): Promise<boolean> {
    try {
      const packageJsonPath = path.join(this.workingDir, 'package.json');
      
      // Check package.json exists
      if (!fs.existsSync(packageJsonPath)) {
        this.logger.warn('[LintAdapter] No package.json found');
        return false;
      }
      
      // Check lint script exists
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (!packageJson.scripts || !packageJson.scripts.lint) {
        this.logger.warn('[LintAdapter] No lint script in package.json');
        return false;
      }
      
      // For Next.js projects, check for ESLint config
      if (this.isNextJsProject(packageJson)) {
        const hasEslintConfig = await this.hasEslintConfig();
        if (!hasEslintConfig) {
          this.logger.warn('[LintAdapter] Next.js project detected but no ESLint config found');
          return false;
        }
      }
      
      return true;
    } catch (error: any) {
      this.logger.error('[LintAdapter] Error checking prerequisites:', error.message);
      return false;
    }
  }
  
  /**
   * Auto-fix: Create ESLint config for Next.js projects
   */
  async autoFix(): Promise<boolean> {
    try {
      const packageJsonPath = path.join(this.workingDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Handle Next.js projects
      if (this.isNextJsProject(packageJson)) {
        const hasEslintConfig = await this.hasEslintConfig();
        
        if (!hasEslintConfig) {
          this.logger.info('[LintAdapter] Creating ESLint config for Next.js...');
          
          // Create .eslintrc.json
          const eslintConfig = {
            extends: 'next/core-web-vitals'
          };
          
          fs.writeFileSync(
            path.join(this.workingDir, '.eslintrc.json'),
            JSON.stringify(eslintConfig, null, 2) + '\n'
          );
          
          this.logger.info('[LintAdapter] Created .eslintrc.json');
        }
      }
      
      return true;
    } catch (error: any) {
      this.logger.error('[LintAdapter] Auto-fix failed:', error.message);
      return false;
    }
  }
  
  /**
   * Run linter
   */
  async validate(): Promise<ValidationResult> {
    try {
      this.logger.info(`[LintAdapter] Running "${this.lintScript}"...`);
      
      const result = await this.runCommand(this.lintScript);
      
      return {
        success: result.exitCode === 0,
        output: result.stdout,
        errors: result.stderr
      };
    } catch (error: any) {
      return {
        success: false,
        errors: error.message || String(error)
      };
    }
  }
  
  private isNextJsProject(packageJson: any): boolean {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    return 'next' in deps;
  }
  
  private async hasEslintConfig(): Promise<boolean> {
    const configFiles = [
      '.eslintrc',
      '.eslintrc.json',
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.yaml',
      '.eslintrc.yml',
      'eslint.config.js'
    ];
    
    for (const file of configFiles) {
      if (fs.existsSync(path.join(this.workingDir, file))) {
        return true;
      }
    }
    
    // Also check package.json for eslintConfig
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(this.workingDir, 'package.json'), 'utf8')
      );
      if (packageJson.eslintConfig) {
        return true;
      }
    } catch {
      // Ignore
    }
    
    return false;
  }
  
  private async runCommand(command: string): Promise<CommandResult> {
    try {
      // Set CI=true to prevent interactive prompts
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workingDir,
        timeout: this.timeout,
        env: { ...process.env, CI: 'true' }
      });
      
      return {
        exitCode: 0,
        stdout: stdout || '',
        stderr: stderr || ''
      };
    } catch (error: any) {
      return {
        exitCode: error.code || 1,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message || ''
      };
    }
  }
}
```

- [ ] **Step 2: Update adapters index**

Add to `src/validation/adapters/index.ts`:

```typescript
export { LintAdapter, LintAdapterConfig } from './LintAdapter';
```

- [ ] **Step 3: Commit**

```bash
git add src/validation/adapters/
git commit -m "feat(validation): add LintAdapter with ESLint auto-config for Next.js"
```

---

## Task 5: Create Browser Adapter

**Files:**
- Create: `src/validation/adapters/BrowserAdapter.ts`
- Modify: `src/validation/adapters/index.ts`

**Purpose:** Adapter for browser-based validation with Playwright.

- [ ] **Step 1: Create BrowserAdapter**

Create `src/validation/adapters/BrowserAdapter.ts`:

```typescript
import { BaseValidationAdapter } from '../ValidationAdapter';
import { ValidationResult } from '../types';
import { BrowserValidator } from '../../browser/BrowserValidator';
import { DevServerManager } from '../../utils/DevServerManager';
import * as fs from 'fs';
import * as path from 'path';

export interface BrowserAdapterConfig {
  devServerTimeout?: number;
  port?: number;
  takeScreenshot?: boolean;
  checkAccessibility?: boolean;
  checkPerformance?: boolean;
}

export class BrowserAdapter extends BaseValidationAdapter {
  name = 'Browser';
  isRequired = false; // Browser validation is optional
  private config: BrowserAdapterConfig;
  private devServerManager: DevServerManager;
  private devServerUrl: string | null = null;
  
  constructor(
    logger: any,
    workingDir: string,
    config: BrowserAdapterConfig = {},
    enableAutoFix: boolean = true
  ) {
    super(logger, workingDir, enableAutoFix);
    this.config = {
      devServerTimeout: 120000,
      port: 3000,
      takeScreenshot: true,
      checkAccessibility: true,
      checkPerformance: true,
      ...config
    };
    this.devServerManager = new DevServerManager();
  }
  
  /**
   * Check prerequisites:
   * - package.json exists
   * - playwright is available (via @anthropic-ai/sdk dependency)
   * - dev script is defined
   */
  async checkPrerequisites(): Promise<boolean> {
    // Skip if explicitly disabled
    if (process.env.SKIP_BROWSER_VALIDATION === 'true') {
      this.logger.info('[BrowserAdapter] Skipped (SKIP_BROWSER_VALIDATION=true)');
      return false;
    }
    
    try {
      const packageJsonPath = path.join(this.workingDir, 'package.json');
      
      // Check package.json exists
      if (!fs.existsSync(packageJsonPath)) {
        this.logger.warn('[BrowserAdapter] No package.json found');
        return false;
      }
      
      // Check for dev script
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (!packageJson.scripts || !packageJson.scripts.dev) {
        this.logger.warn('[BrowserAdapter] No dev script in package.json');
        return false;
      }
      
      return true;
    } catch (error: any) {
      this.logger.error('[BrowserAdapter] Error checking prerequisites:', error.message);
      return false;
    }
  }
  
  /**
   * No auto-fix for browser validation - requires project setup
   */
  async autoFix(): Promise<boolean> {
    // Browser validation can't be auto-fixed
    return false;
  }
  
  /**
   * Run browser validation
   */
  async validate(): Promise<ValidationResult> {
    try {
      this.logger.info('[BrowserAdapter] Starting browser validation...');
      
      // Start dev server
      const devServerUrl = await this.devServerManager.start({
        timeout: this.config.devServerTimeout!,
        port: this.config.port!
      });
      
      this.logger.info(`[BrowserAdapter] Dev server ready at ${devServerUrl}`);
      
      // Run browser validation
      const validator = new BrowserValidator();
      const result = await validator.validate({
        url: devServerUrl,
        takeScreenshot: this.config.takeScreenshot,
        checkAccessibility: this.config.checkAccessibility,
        checkPerformance: this.config.checkPerformance,
        expectedSelectors: [],
        expectedText: []
      });
      
      this.logger.info(`[BrowserAdapter] Validation: ${result.success ? 'PASSED' : 'FAILED'}`);
      
      return {
        success: result.success,
        output: JSON.stringify({
          consoleErrors: result.consoleErrors.length,
          accessibilityIssues: result.accessibilityIssues.length,
          performanceMetrics: result.performanceMetrics
        }),
        errors: result.consoleErrors.join('\n') || undefined
      };
    } catch (error: any) {
      return {
        success: false,
        errors: error.message || String(error)
      };
    }
  }
  
  /**
   * Clean up dev server
   */
  async cleanup(): Promise<void> {
    await this.devServerManager.stop();
  }
}
```

- [ ] **Step 2: Update adapters index**

Update `src/validation/adapters/index.ts`:

```typescript
export { TestAdapter, TestAdapterConfig } from './TestAdapter';
export { LintAdapter, LintAdapterConfig } from './LintAdapter';
export { BrowserAdapter, BrowserAdapterConfig } from './BrowserAdapter';
```

- [ ] **Step 3: Commit**

```bash
git add src/validation/adapters/
git commit -m "feat(validation): add BrowserAdapter for browser-based validation"
```

---

## Task 6: Create Validation Manager

**Files:**
- Create: `src/validation/ValidationManager.ts`
- Modify: `src/validation/index.ts`

**Purpose:** Coordinates all validation adapters and aggregates results.

- [ ] **Step 1: Create ValidationManager**

Create `src/validation/ValidationManager.ts`:

```typescript
import { ValidationAdapter, ValidationResult } from './types';
import { Logger } from '../utils/Logger';

export interface ValidationSummary {
  success: boolean;
  hasChanges: boolean;
  results: Map<string, ValidationResult>;
  requiredPassed: boolean;
  optionalSkipped: number;
  optionalFailed: number;
  canAutoFix: boolean;
}

export class ValidationManager {
  private adapters: ValidationAdapter[] = [];
  private logger: Logger;
  
  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
  }
  
  /**
   * Register a validation adapter
   */
  register(adapter: ValidationAdapter): void {
    this.adapters.push(adapter);
    this.logger.info(`[ValidationManager] Registered adapter: ${adapter.name} (required: ${adapter.isRequired})`);
  }
  
  /**
   * Register multiple adapters
   */
  registerAll(adapters: ValidationAdapter[]): void {
    for (const adapter of adapters) {
      this.register(adapter);
    }
  }
  
  /**
   * Run all validations with auto-fix
   */
  async runAllValidations(): Promise<ValidationSummary> {
    this.logger.info(`[ValidationManager] Running ${this.adapters.length} validations...`);
    
    const results = new Map<string, ValidationResult>();
    let requiredPassed = true;
    let optionalSkipped = 0;
    let optionalFailed = 0;
    let canAutoFix = false;
    
    for (const adapter of this.adapters) {
      this.logger.info(`[ValidationManager] Running ${adapter.name}...`);
      
      const result = await adapter.runWithAutoFix();
      results.set(adapter.name, result);
      
      if (adapter.isRequired) {
        if (!result.success && !result.skipped) {
          requiredPassed = false;
          this.logger.error(`[ValidationManager] ❌ Required validation failed: ${adapter.name}`);
        } else if (result.skipped) {
          // Required validations shouldn't be skipped
          requiredPassed = false;
          this.logger.error(`[ValidationManager] ❌ Required validation skipped: ${adapter.name}`);
        }
      } else {
        if (result.skipped) {
          optionalSkipped++;
          this.logger.warn(`[ValidationManager] ⚠️ Optional validation skipped: ${adapter.name} - ${result.skipReason}`);
        } else if (!result.success) {
          optionalFailed++;
          this.logger.warn(`[ValidationManager] ⚠️ Optional validation failed: ${adapter.name}`);
        }
      }
      
      if (result.canAutoFix && !result.autoFixAttempted) {
        canAutoFix = true;
      }
    }
    
    // Success if all required validations passed
    const success = requiredPassed;
    
    this.logger.info(`[ValidationManager] Validation complete:`);
    this.logger.info(`  Success: ${success}`);
    this.logger.info(`  Required passed: ${requiredPassed}`);
    this.logger.info(`  Optional skipped: ${optionalSkipped}`);
    this.logger.info(`  Optional failed: ${optionalFailed}`);
    
    return {
      success,
      hasChanges: true, // This is determined by git status outside
      results,
      requiredPassed,
      optionalSkipped,
      optionalFailed,
      canAutoFix
    };
  }
  
  /**
   * Get results for a specific adapter
   */
  getResult(name: string): ValidationResult | undefined {
    return this.adapters.find(a => a.name === name)?.runWithAutoFix();
  }
  
  /**
   * Clear all registered adapters
   */
  clear(): void {
    this.adapters = [];
  }
}
```

- [ ] **Step 2: Update main index**

Create `src/validation/index.ts`:

```typescript
// Types
export {
  ValidationResult,
  ValidationConfig,
  CommandResult,
  ValidationAdapter
} from './types';

// Base class
export { BaseValidationAdapter } from './ValidationAdapter';

// Adapters
export {
  TestAdapter,
  TestAdapterConfig,
  LintAdapter,
  LintAdapterConfig,
  BrowserAdapter,
  BrowserAdapterConfig
} from './adapters';

// Manager
export {
  ValidationManager,
  ValidationSummary
} from './ValidationManager';
```

- [ ] **Step 3: Commit**

```bash
git add src/validation/
git commit -m "feat(validation): add ValidationManager to coordinate all adapters"
```

---

## Task 7: Update TaskExecutor to Use New System

**Files:**
- Modify: `src/core/TaskExecutor.ts` (lines 417-464)

**Purpose:** Replace hardcoded validation logic with the new adapter system.

- [ ] **Step 1: Update imports in TaskExecutor.ts**

At the top of `src/core/TaskExecutor.ts`, add imports:

```typescript
// Add these imports after existing ones (around line 9)
import { 
  ValidationManager, 
  TestAdapter, 
  LintAdapter, 
  BrowserAdapter 
} from '../validation';
```

- [ ] **Step 2: Replace validateResults method**

Replace the entire `validateResults` method (lines 417-464) with:

```typescript
  private async validateResults(task: any, results: any[], dryRun?: boolean): Promise<any> {
    // Check if there are code changes (with timeout)
    let hasChanges = false;
    try {
      const status = await Promise.race([
        this.git.status(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Git timeout')), 5000))
      ]) as any;
      hasChanges = status.files.length > 0;
      this.logger.info(`Git status: ${status.files.length} files changed`);
    } catch (error) {
      this.logger.warn('Git status check failed or timeout, assuming no changes');
      hasChanges = false;
    }
    
    // Dry run mode or no changes - skip validation
    if (dryRun || !hasChanges) {
      this.logger.info(dryRun ? 'Dry run mode - skipping validation' : 'No code changes - skipping validation');
      return {
        success: true,
        hasChanges: dryRun && hasChanges,
        message: dryRun ? 'Dry run completed' : 'No code changes generated'
      };
    }
    
    // Create validation manager
    const validationManager = new ValidationManager(this.logger);
    
    // Register adapters
    validationManager.register(new TestAdapter(
      this.logger,
      this.workingDir,
      { timeout: 120000 }
    ));
    
    validationManager.register(new LintAdapter(
      this.logger,
      this.workingDir,
      { timeout: 60000 }
    ));
    
    validationManager.register(new BrowserAdapter(
      this.logger,
      this.workingDir,
      { devServerTimeout: 120000, port: 3000 }
    ));
    
    // Run all validations
    const summary = await validationManager.runAllValidations();
    
    // Extract individual results for backward compatibility
    const testResult = summary.results.get('Test') || { success: true, skipped: true };
    const lintResult = summary.results.get('Lint') || { success: true, skipped: true };
    const archCheck = { success: true }; // Architecture check is always true for now
    const browserValidation = summary.results.get('Browser') || { success: true, skipped: true };
    
    return {
      success: summary.success,
      hasChanges: true,
      testResult,
      lintResult,
      archCheck,
      browserValidation,
      canAutoFix: summary.canAutoFix
    };
  }
```

- [ ] **Step 3: Remove old validation methods**

Remove the following methods from TaskExecutor.ts:
- `runTests()` (lines 1183-1192)
- `runLinter()` (lines 1194-1203)
- `checkArchitecture()` (lines 1205-1208)
- `canAutoFix()` (lines 1211-1213) - but keep this one, it's still needed

Also remove the `runBrowserValidation` method (lines 469-516) as it's now handled by BrowserAdapter.

- [ ] **Step 4: Build and test**

```bash
cd harness-cli
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/core/TaskExecutor.ts
git commit -m "refactor(validation): integrate ValidationAdapter system into TaskExecutor"
```

---

## Task 8: Write Tests for Validation System

**Files:**
- Create: `src/validation/__tests__/TestAdapter.test.ts`
- Create: `src/validation/__tests__/LintAdapter.test.ts`
- Create: `src/validation/__tests__/ValidationManager.test.ts`

- [ ] **Step 1: Write TestAdapter tests**

Create `src/validation/__tests__/TestAdapter.test.ts`:

```typescript
import { TestAdapter } from '../adapters/TestAdapter';
import { Logger } from '../../utils/Logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('TestAdapter', () => {
  let adapter: TestAdapter;
  let tempDir: string;
  let logger: Logger;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'test-adapter-'));
    logger = new Logger();
    adapter = new TestAdapter(logger, tempDir);
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it('should fail prerequisites when package.json is missing', async () => {
    const ready = await adapter.checkPrerequisites();
    expect(ready).toBe(false);
  });

  it('should fail prerequisites when test script is missing', async () => {
    await fs.promises.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test', scripts: {} })
    );
    
    const ready = await adapter.checkPrerequisites();
    expect(ready).toBe(false);
  });

  it('should pass prerequisites when everything is in place', async () => {
    await fs.promises.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test', scripts: { test: 'jest' } })
    );
    await fs.promises.mkdir(path.join(tempDir, 'node_modules'));
    
    const ready = await adapter.checkPrerequisites();
    expect(ready).toBe(true);
  });
});
```

- [ ] **Step 2: Write LintAdapter tests**

Create `src/validation/__tests__/LintAdapter.test.ts`:

```typescript
import { LintAdapter } from '../adapters/LintAdapter';
import { Logger } from '../../utils/Logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('LintAdapter', () => {
  let adapter: LintAdapter;
  let tempDir: string;
  let logger: Logger;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'lint-adapter-'));
    logger = new Logger();
    adapter = new LintAdapter(logger, tempDir);
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it('should fail prerequisites when package.json is missing', async () => {
    const ready = await adapter.checkPrerequisites();
    expect(ready).toBe(false);
  });

  it('should detect Next.js project', async () => {
    await fs.promises.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test',
        scripts: { lint: 'next lint' },
        dependencies: { next: '^14.0.0' }
      })
    );
    
    const ready = await adapter.checkPrerequisites();
    expect(ready).toBe(false); // Fails because no ESLint config
  });

  it('should auto-fix ESLint config for Next.js', async () => {
    await fs.promises.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test',
        scripts: { lint: 'next lint' },
        dependencies: { next: '^14.0.0' }
      })
    );
    
    const fixed = await adapter.autoFix();
    expect(fixed).toBe(true);
    
    const configExists = fs.existsSync(path.join(tempDir, '.eslintrc.json'));
    expect(configExists).toBe(true);
    
    const config = JSON.parse(await fs.promises.readFile(
      path.join(tempDir, '.eslintrc.json'),
      'utf8'
    ));
    expect(config.extends).toBe('next/core-web-vitals');
  });
});
```

- [ ] **Step 3: Write ValidationManager tests**

Create `src/validation/__tests__/ValidationManager.test.ts`:

```typescript
import { ValidationManager } from '../ValidationManager';
import { BaseValidationAdapter } from '../ValidationAdapter';
import { ValidationResult } from '../types';
import { Logger } from '../../utils/Logger';

// Mock adapter for testing
class MockAdapter extends BaseValidationAdapter {
  name: string;
  isRequired: boolean;
  private shouldPass: boolean;
  private shouldBeReady: boolean;

  constructor(
    name: string,
    isRequired: boolean,
    shouldPass: boolean,
    shouldBeReady: boolean = true,
    logger?: Logger
  ) {
    super(logger || new Logger(), '/tmp');
    this.name = name;
    this.isRequired = isRequired;
    this.shouldPass = shouldPass;
    this.shouldBeReady = shouldBeReady;
  }

  async checkPrerequisites(): Promise<boolean> {
    return this.shouldBeReady;
  }

  async validate(): Promise<ValidationResult> {
    return {
      success: this.shouldPass,
      output: this.shouldPass ? 'Passed' : 'Failed'
    };
  }
}

describe('ValidationManager', () => {
  let manager: ValidationManager;

  beforeEach(() => {
    manager = new ValidationManager();
  });

  it('should pass when all required validations pass', async () => {
    manager.register(new MockAdapter('Test1', true, true));
    manager.register(new MockAdapter('Test2', true, true));
    
    const summary = await manager.runAllValidations();
    expect(summary.success).toBe(true);
    expect(summary.requiredPassed).toBe(true);
  });

  it('should fail when a required validation fails', async () => {
    manager.register(new MockAdapter('Test1', true, true));
    manager.register(new MockAdapter('Test2', true, false));
    
    const summary = await manager.runAllValidations();
    expect(summary.success).toBe(false);
    expect(summary.requiredPassed).toBe(false);
  });

  it('should pass when optional validation fails', async () => {
    manager.register(new MockAdapter('Required', true, true));
    manager.register(new MockAdapter('Optional', false, false));
    
    const summary = await manager.runAllValidations();
    expect(summary.success).toBe(true);
    expect(summary.optionalFailed).toBe(1);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
cd harness-cli
npm test -- --testPathPattern="validation"
```

Expected: All new tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/validation/__tests__/
git commit -m "test(validation): add unit tests for validation adapters and manager"
```

---

## Task 9: Final Integration Test

**Files:**
- None (manual verification)

**Purpose:** Verify the entire validation system works end-to-end.

- [ ] **Step 1: Build project**

```bash
cd harness-cli
npm run build
```

Expected: Build succeeds.

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Create integration test script**

Create `test-validation.js` (temporary test script):

```javascript
const { ValidationManager, TestAdapter, LintAdapter } = require('./dist/validation');
const { Logger } = require('./dist/utils/Logger');

async function test() {
  const logger = new Logger();
  const manager = new ValidationManager(logger);
  
  // Note: This will fail if not run in a real project
  // It's just to verify the module loads correctly
  console.log('✅ Validation module loaded successfully');
  console.log('Adapters available:', Object.keys(require('./dist/validation')));
}

test().catch(console.error);
```

Run:
```bash
node test-validation.js
```

Expected: Module loads successfully, shows available exports.

Cleanup:
```bash
rm test-validation.js
```

- [ ] **Step 4: Commit final changes**

```bash
git add -A
git commit -m "feat(validation): complete validation adapter system with tests"
```

---

## Summary

This implementation plan creates a flexible, extensible validation system:

1. **TestAdapter** - Runs `npm test` with dependency auto-install
2. **LintAdapter** - Runs `npm run lint` with ESLint config auto-creation for Next.js
3. **BrowserAdapter** - Runs browser validation (optional)
4. **ValidationManager** - Coordinates all adapters with graceful degradation

### Key Features:
- **Prerequisite checking**: Each adapter checks if it can run
- **Auto-fix**: Attempts to fix missing prerequisites
- **Graceful degradation**: Optional validations can fail without failing the task
- **Extensible**: Easy to add new validation types

### Integration:
- Replaces hardcoded validation in TaskExecutor
- Maintains backward compatibility with existing result format
- No breaking changes to external APIs

---

**Plan complete!**

Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints for review

Which approach would you prefer?
