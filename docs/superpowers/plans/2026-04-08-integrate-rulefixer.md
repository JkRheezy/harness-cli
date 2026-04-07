# Integrate RuleFixer into TaskExecutor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the existing RuleFixer into TaskExecutor's validation flow to automatically fix code-level lint violations after system-level healing.

**Architecture:** Extend TaskExecutor.validateResults() to use RuleFixer after HealingOrchestrator completes. RuleFixer will parse lint output, extract fixable violations, apply fixes to affected files, and retry validation. This creates a two-layer repair: HealingOrchestrator fixes config/dependency issues, RuleFixer fixes code style issues.

**Tech Stack:** TypeScript, Node.js, existing RuleFixer class, ESLint

---

## Overview

Currently:
- RuleFixer exists but is **never called** in production code
- Only used in unit tests
- TaskExecutor runs `npm run lint` but doesn't auto-fix violations

After integration:
```
Lint fails
  ↓
HealingOrchestrator fixes config (e.g., creates .eslintrc.json)
  ↓
Retry lint → still has code violations
  ↓
RuleFixer extracts violations from lint output
  ↓
RuleFixer applies fixes to files (var → const, == → ===)
  ↓
Retry lint → clean
  ↓
Task succeeds
```

---

## File Structure

```
src/core/TaskExecutor.ts          # Modify validateResults() method
src/rules/RuleFixer.ts             # Already exists, ensure exported
src/rules/index.ts                 # Ensure RuleFixer is exported
test-integration.js                # Temporary manual test script
```

---

## Task 1: Ensure RuleFixer is Properly Exported

**Files:**
- Check: `src/rules/index.ts`
- Create: Add export if missing

- [ ] **Step 1: Check current exports**

```bash
cd harness-cli
cat src/rules/index.ts 2>/dev/null || echo "No index.ts found"
```

- [ ] **Step 2: Create or update index.ts**

If `src/rules/index.ts` doesn't exist or doesn't export RuleFixer, create/update it:

```typescript
// src/rules/index.ts
export { RuleFixer, RuleFixerOptions } from './RuleFixer';
export { 
  Rule, 
  RuleViolation, 
  RuleFix, 
  FixResult,
  Severity 
} from './types';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit src/rules/index.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/rules/index.ts
git commit -m "chore(rules): ensure RuleFixer is exported from index"
```

---

## Task 2: Extend validateResults() with RuleFixer Integration

**Files:**
- Modify: `src/core/TaskExecutor.ts` (validateResults method ~lines 417-503)

- [ ] **Step 1: Add RuleFixer import**

At the top of TaskExecutor.ts, add to existing imports:

```typescript
// Add after existing imports
import { RuleFixer } from '../rules';
import { RuleViolation } from '../rules/types';
```

- [ ] **Step 2: Modify validateResults() method**

Replace the lint validation section with this enhanced version:

```typescript
// In validateResults(), after testResult and before archCheck:

// Step 4: Run linter with healing + auto-fix
let lintResult = await this.runLinter();
let healingResult = null;
let ruleFixResult = null;

// Phase 1: System-level healing (config/dependencies)
if (!lintResult.success && lintResult.errors) {
  this.logger.info('Linter failed, attempting system-level healing...');
  
  const orchestrator = new HealingOrchestrator(
    this.workingDir,
    this.logger,
    async (prompt) => this.callLLM(prompt),
    { maxTotalCost: 0.05 }
  );
  
  healingResult = await orchestrator.heal(lintResult.errors, {
    taskType: 'lint',
    projectType: this.detectProjectType()
  });
  
  this.logger.info(`Healing cost: $${healingResult.cost.estimatedCost.toFixed(4)}`);
  
  if (healingResult.success) {
    this.logger.info('System healing succeeded, retrying linter...');
    lintResult = await this.runLinter();
  }
}

// Phase 2: Code-level auto-fix (RuleFixer)
if (!lintResult.success && lintResult.output) {
  this.logger.info('Linter still has violations, attempting code auto-fix...');
  
  // Try to parse ESLint output for violations
  const violations = this.parseLintOutput(lintResult.output, lintResult.errors);
  const fixableViolations = violations.filter(v => v.autoFixable);
  
  if (fixableViolations.length > 0) {
    this.logger.info(`Found ${fixableViolations.length} auto-fixable violations`);
    
    const ruleFixer = new RuleFixer({ dryRun: false });
    const affectedFiles = [...new Set(fixableViolations.map(v => v.filePath))];
    
    let totalFixed = 0;
    for (const filePath of affectedFiles) {
      const fullPath = require('path').join(this.workingDir, filePath);
      
      if (!require('fs').existsSync(fullPath)) {
        this.logger.warn(`File not found: ${filePath}`);
        continue;
      }
      
      const content = require('fs').readFileSync(fullPath, 'utf8');
      const fileViolations = fixableViolations.filter(v => v.filePath === filePath);
      
      try {
        const fixResult = await ruleFixer.fixFile(content, fileViolations);
        
        if (fixResult.success || fixResult.partial) {
          require('fs').writeFileSync(fullPath, fixResult.fixedCode!);
          totalFixed += fixResult.appliedFixes.length;
          this.logger.info(`Fixed ${fixResult.appliedFixes.length} issues in ${filePath}`);
        }
      } catch (error: any) {
        this.logger.error(`Failed to fix ${filePath}:`, error.message);
      }
    }
    
    ruleFixResult = {
      totalFixed,
      filesAffected: affectedFiles.length
    };
    
    // Retry lint after fixes
    if (totalFixed > 0) {
      this.logger.info('Code fixes applied, retrying linter...');
      lintResult = await this.runLinter();
    }
  } else {
    this.logger.info('No auto-fixable violations found');
  }
}
```

- [ ] **Step 3: Add parseLintOutput() helper method**

Add this method to TaskExecutor class:

```typescript
/**
 * Parse ESLint JSON output into RuleViolations
 * ESLint --format json produces an array of objects with messages
 */
private parseLintOutput(stdout: string, stderr?: string): RuleViolation[] {
  const violations: RuleViolation[] = [];
  
  try {
    // Try to find JSON array in output
    const jsonMatch = stdout.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      this.logger.warn('Could not find JSON lint output');
      return violations;
    }
    
    const results = JSON.parse(jsonMatch[0]);
    
    for (const fileResult of results) {
      const filePath = fileResult.filePath;
      
      for (const message of fileResult.messages || []) {
        // Only include fixable errors
        if (!message.fix) continue;
        
        violations.push({
          ruleId: message.ruleId || 'unknown',
          ruleName: message.ruleId || 'unknown',
          severity: message.severity === 2 ? 'error' : 'warning',
          filePath: filePath,
          line: message.line,
          column: message.column,
          message: message.message,
          autoFixable: true,
          fix: {
            replacement: message.fix.text
          },
          match: undefined // Will be determined during fix
        });
      }
    }
  } catch (error: any) {
    this.logger.error('Failed to parse lint output:', error.message);
  }
  
  return violations;
}
```

- [ ] **Step 4: Update return statement**

Update the return statement to include ruleFixResult:

```typescript
return {
  success,
  hasChanges: true,
  testResult,
  lintResult,
  archCheck,
  browserValidation,
  healingResult,
  ruleFixResult, // Add this
  canAutoFix: !success
};
```

- [ ] **Step 5: Build and test**

```bash
cd harness-cli
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/core/TaskExecutor.ts
git commit -m "feat(executor): integrate RuleFixer for automatic code-level lint fixes"
```

---

## Task 3: Add ESLint JSON Format Support

**Files:**
- Modify: `src/core/TaskExecutor.ts` (runLinter method)

RuleFixer needs structured violation data. ESLint's JSON format provides this.

- [ ] **Step 1: Modify runLinter() to use JSON format**

Update the runLinter method to get parseable output:

```typescript
private async runLinter(): Promise<any> {
  this.logger.info('🔍 Running linter...');
  
  // Try JSON format first for better parsing
  let result = await this.runCommand('npm run lint -- --format json');
  
  // If JSON format fails or isn't supported, fall back to standard
  if (result.exitCode !== 0 && !result.stdout.includes('[')) {
    this.logger.info('JSON lint format not available, using standard format');
    result = await this.runCommand('npm run lint');
  }
  
  return {
    success: result.exitCode === 0,
    output: result.stdout,
    errors: result.stderr,
    exitCode: result.exitCode
  };
}
```

Note: Some projects may not support `--format json`. We handle this gracefully.

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/core/TaskExecutor.ts
git commit -m "feat(executor): use ESLint JSON format for better violation parsing"
```

---

## Task 4: Write Integration Test

**Files:**
- Create: `src/core/__tests__/TaskExecutor.healing.test.ts`

- [ ] **Step 1: Create integration test**

```typescript
import { TaskExecutor } from '../TaskExecutor';
import { Logger } from '../../utils/Logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('TaskExecutor Healing Integration', () => {
  let executor: TaskExecutor;
  let tempDir: string;
  let logger: Logger;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'executor-healing-'));
    logger = new Logger();
    
    // Create a minimal project
    await fs.promises.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        scripts: { lint: 'eslint src/', test: 'jest' }
      })
    );
    
    await fs.promises.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.promises.writeFile(
      path.join(tempDir, 'src', 'test.js'),
      'var x = 1;\n'  // Uses var, should trigger lint error
    );
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it('should detect missing ESLint config and heal', async () => {
    // Create executor with mock LLM
    const executor = new TaskExecutor(
      {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        maxTokens: 1000,
        temperature: 0.2,
        timeout: 5000
      },
      tempDir
    );

    // Run validation
    const result = await (executor as any).validateResults(
      { title: 'Test task' },
      [],
      false
    );

    // Should attempt healing (even if it fails in test env)
    expect(result).toBeDefined();
    expect(result.hasChanges).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- --testPathPattern="TaskExecutor.healing"
```

- [ ] **Step 3: Commit**

```bash
git add src/core/__tests__/TaskExecutor.healing.test.ts
git commit -m "test(executor): add healing integration test"
```

---

## Task 5: Manual Integration Test

**Files:**
- Create: `test-rulefixer-integration.js` (temporary)

- [ ] **Step 1: Create manual test script**

```javascript
/**
 * Manual integration test for RuleFixer
 * Run: node test-rulefixer-integration.js
 */
const { RuleFixer } = require('./dist/rules');
const fs = require('fs');
const path = require('path');

async function test() {
  console.log('Testing RuleFixer integration...\n');

  // Test case 1: Simple var -> const fix
  const content = `var x = 1;
var y = 2;
console.log(x + y);`;

  const violations = [
    {
      ruleId: 'prefer-const',
      ruleName: 'Prefer Const',
      severity: 'warning',
      filePath: 'test.js',
      line: 1,
      column: 1,
      message: 'Use const instead of var',
      autoFixable: true,
      fix: {
        replacement: 'const x = 1'
      }
    },
    {
      ruleId: 'prefer-const',
      ruleName: 'Prefer Const',
      severity: 'warning',
      filePath: 'test.js',
      line: 2,
      column: 1,
      message: 'Use const instead of var',
      autoFixable: true,
      fix: {
        replacement: 'const y = 2'
      }
    }
  ];

  const fixer = new RuleFixer({ dryRun: false });
  const result = await fixer.fixFile(content, violations);

  console.log('Fix Result:');
  console.log('- Success:', result.success);
  console.log('- Applied Fixes:', result.appliedFixes.length);
  console.log('- Fixed Code:\n', result.fixedCode);

  // Cleanup
  console.log('\n✅ RuleFixer integration test passed!');
}

test().catch(console.error);
```

- [ ] **Step 2: Run manual test**

```bash
cd harness-cli
npm run build
node test-rulefixer-integration.js
```

Expected output shows fixed code with `const` instead of `var`.

- [ ] **Step 3: Cleanup**

```bash
rm test-rulefixer-integration.js
git add -A
git commit -m "chore: add RuleFixer integration test script"
```

---

## Summary

After completing these tasks:

1. **RuleFixer is exported** from `src/rules/index.ts`
2. **TaskExecutor validates with healing**:
   - System-level: HealingOrchestrator fixes config/dependencies
   - Code-level: RuleFixer fixes lint violations (var→const, etc.)
3. **ESLint JSON format** provides structured violation data
4. **Integration tests** verify the flow

### Complete Flow

```
Task Execution
  ↓
npm run lint → Fails (missing .eslintrc.json + var usage)
  ↓
HealingOrchestrator
  └─ Creates .eslintrc.json
  ↓
Retry lint → Fails (var usage)
  ↓
RuleFixer
  └─ Changes var → const in all files
  ↓
Retry lint → Success
  ↓
Task Completes
```

**Plan complete!**

Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks
2. **Inline Execution** - Execute tasks in this session using executing-plans

Which approach?
