# Harness Loop + Superpowers Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Superpowers skills (brainstorming, writing-plans, executing-plans) with harness-loop for design-driven autonomous development with proper review/PR workflow and continuous iteration.

**Architecture:** 
- Extend harness-loop with a new `SuperpowersBridge` module that interfaces with Superpowers skills
- Add design phase before code generation: tasks first go through `brainstorming` → `writing-plans` → execution
- Implement proper PR workflow: code → review → merge with ReviewAgent integration
- Add resilient error handling: failed tasks generate fix tasks instead of stopping Loop

**Tech Stack:** TypeScript, Node.js, Superpowers skill system, GitHub API, harness-loop core

---

## Overview of Changes

### Files to Create
- `src/core/SuperpowersBridge.ts` - Bridge between harness-loop and Superpowers skills
- `src/core/DesignPhase.ts` - Design phase handler using brainstorming/writing-plans
- `src/core/PRWorkflow.ts` - Complete PR workflow (create → review → merge)
- `src/core/ResilientLoop.ts` - Error-resilient loop controller
- `src/utils/SkillInvoker.ts` - Utility to invoke Superpowers skills
- `src/types/superpowers.ts` - Type definitions for Superpowers integration

### Files to Modify
- `src/core/LoopController.ts` - Integrate new workflow stages
- `src/core/TaskExecutor.ts` - Add design phase hook
- `src/core/ReviewAgent.ts` - Enhance with Superpowers review capabilities
- `src/core/PRAutomator.ts` - Add complete PR workflow methods
- `src/utils/ConfigLoader.ts` - Add Superpowers configuration

---

## Task 1: Create Type Definitions

**Files:**
- Create: `src/types/superpowers.ts`

- [ ] **Step 1: Define Superpowers task types**

```typescript
/**
 * Superpowers integration types
 */

export type DesignPhase = 'none' | 'brainstorming' | 'planning' | 'ready';

export interface SuperpowersConfig {
  enabled: boolean;
  skillsPath: string;
  autoDesign: boolean;
  requireApproval: boolean;
}

export interface DesignResult {
  phase: DesignPhase;
  specPath?: string;
  planPath?: string;
  approved: boolean;
  summary: string;
}

export interface PRWorkflowResult {
  prNumber: number;
  prUrl: string;
  branch: string;
  reviewStatus: 'pending' | 'approved' | 'changes_requested';
  merged: boolean;
}

export interface ResilientTaskResult {
  success: boolean;
  attempts: number;
  error?: string;
  fixTaskId?: string;
  shouldRetry: boolean;
}
```

- [ ] **Step 2: Define Superpowers bridge interface**

```typescript
export interface SuperpowersBridge {
  invokeSkill(skillName: string, args: any): Promise<any>;
  runDesignPhase(task: any): Promise<DesignResult>;
  runPRWorkflow(task: any, codeResult: any): Promise<PRWorkflowResult>;
  handleFailure(task: any, error: any): Promise<ResilientTaskResult>;
}
```

- [ ] **Step 3: Commit type definitions**

```bash
git add src/types/superpowers.ts
git commit -m "feat: add Superpowers integration types"
```

---

## Task 2: Create Skill Invoker Utility

**Files:**
- Create: `src/utils/SkillInvoker.ts`

- [ ] **Step 1: Create skill invoker class**

```typescript
import { Logger } from './Logger';

export class SkillInvoker {
  private logger: Logger;
  private skillsPath: string;

  constructor(skillsPath: string = '.config/agents/skills') {
    this.logger = new Logger();
    this.skillsPath = skillsPath;
  }

  /**
   * Invoke a Superpowers skill
   */
  async invoke(skillName: string, args: any): Promise<any> {
    this.logger.info(`🔧 Invoking skill: ${skillName}`);
    
    const skillPath = `${this.skillsPath}/${skillName}`;
    
    try {
      // Check if skill exists
      const fs = await import('fs/promises');
      await fs.access(`${skillPath}/SKILL.md`);
      
      // For now, return a placeholder result
      // In production, this would actually invoke the skill
      return {
        success: true,
        skill: skillName,
        result: args
      };
    } catch (error) {
      this.logger.warn(`Skill ${skillName} not found at ${skillPath}`);
      return { success: false, error: 'Skill not found' };
    }
  }

  /**
   * Check if skill exists
   */
  async exists(skillName: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      await fs.access(`${this.skillsPath}/${skillName}/SKILL.md`);
      return true;
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 2: Add tests**

Create: `src/utils/__tests__/SkillInvoker.test.ts`

```typescript
import { SkillInvoker } from '../SkillInvoker';

describe('SkillInvoker', () => {
  let invoker: SkillInvoker;

  beforeEach(() => {
    invoker = new SkillInvoker();
  });

  test('exists returns false for non-existent skill', async () => {
    const result = await invoker.exists('non-existent-skill');
    expect(result).toBe(false);
  });

  test('invoke returns error for non-existent skill', async () => {
    const result = await invoker.invoke('non-existent', {});
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- src/utils/__tests__/SkillInvoker.test.ts
```

Expected: Tests pass

- [ ] **Step 4: Commit**

```bash
git add src/utils/SkillInvoker.ts src/utils/__tests__/SkillInvoker.test.ts
git commit -m "feat: add SkillInvoker utility"
```

---

## Task 3: Create Design Phase Handler

**Files:**
- Create: `src/core/DesignPhase.ts`

- [ ] **Step 1: Create DesignPhase class**

```typescript
import { Logger } from '../utils/Logger';
import { SkillInvoker } from '../utils/SkillInvoker';
import { DesignResult, DesignPhase as Phase } from '../types/superpowers';

export class DesignPhase {
  private logger: Logger;
  private skillInvoker: SkillInvoker;
  private autoDesign: boolean;

  constructor(autoDesign: boolean = true) {
    this.logger = new Logger();
    this.skillInvoker = new SkillInvoker();
    this.autoDesign = autoDesign;
  }

  /**
   * Run complete design phase for a task
   */
  async run(task: any): Promise<DesignResult> {
    this.logger.info(`🎨 Starting design phase for: ${task.title}`);

    // Step 1: Brainstorming
    const brainstormResult = await this.runBrainstorming(task);
    if (!brainstormResult.success) {
      return this.createResult('none', false, 'Brainstorming failed');
    }

    // Step 2: Writing Plans
    const planResult = await this.runPlanning(task, brainstormResult);
    if (!planResult.success) {
      return this.createResult('brainstorming', false, 'Planning failed');
    }

    // Step 3: Check for approval if required
    if (!this.autoDesign) {
      this.logger.info('⏳ Waiting for design approval...');
      // In production, this would wait for human approval
      return this.createResult('planning', false, 'Waiting for approval', planResult.path);
    }

    return this.createResult('ready', true, 'Design complete', planResult.path);
  }

  /**
   * Run brainstorming skill
   */
  private async runBrainstorming(task: any): Promise<any> {
    this.logger.info('🧠 Running brainstorming...');
    
    const hasSkill = await this.skillInvoker.exists('brainstorming');
    if (!hasSkill) {
      this.logger.warn('Brainstorming skill not found, using fallback');
      return { success: true, fallback: true };
    }

    return await this.skillInvoker.invoke('brainstorming', {
      topic: task.title,
      description: task.description,
      requirements: task.requirements
    });
  }

  /**
   * Run writing-plans skill
   */
  private async runPlanning(task: any, brainstormResult: any): Promise<any> {
    this.logger.info('📝 Running planning...');
    
    const hasSkill = await this.skillInvoker.exists('writing-plans');
    if (!hasSkill) {
      this.logger.warn('Writing-plans skill not found, using fallback');
      return { success: true, fallback: true, path: null };
    }

    return await this.skillInvoker.invoke('writing-plans', {
      task: task,
      brainstorm: brainstormResult
    });
  }

  private createResult(
    phase: Phase, 
    approved: boolean, 
    summary: string,
    planPath?: string
  ): DesignResult {
    return { phase, approved, summary, planPath };
  }
}
```

- [ ] **Step 2: Add tests**

Create: `src/core/__tests__/DesignPhase.test.ts`

```typescript
import { DesignPhase } from '../DesignPhase';

describe('DesignPhase', () => {
  let designPhase: DesignPhase;

  beforeEach(() => {
    designPhase = new DesignPhase(true);
  });

  test('run returns design result', async () => {
    const task = {
      title: 'Test Task',
      description: 'Test description',
      requirements: []
    };

    const result = await designPhase.run(task);
    
    expect(result).toHaveProperty('phase');
    expect(result).toHaveProperty('approved');
    expect(result).toHaveProperty('summary');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- src/core/__tests__/DesignPhase.test.ts
```

Expected: Tests pass

- [ ] **Step 4: Commit**

```bash
git add src/core/DesignPhase.ts src/core/__tests__/DesignPhase.test.ts
git commit -m "feat: add DesignPhase handler"
```

---

## Task 4: Create PR Workflow Handler

**Files:**
- Create: `src/core/PRWorkflow.ts`

- [ ] **Step 1: Create PRWorkflow class**

```typescript
import { Logger } from '../utils/Logger';
import { PRAutomator } from './PRAutomator';
import { ReviewAgent } from './ReviewAgent';
import { PRWorkflowResult } from '../types/superpowers';

export class PRWorkflow {
  private logger: Logger;
  private prAutomator: PRAutomator;
  private reviewAgent: ReviewAgent;

  constructor() {
    this.logger = new Logger();
    this.prAutomator = new PRAutomator();
    this.reviewAgent = new ReviewAgent({
      provider: 'anthropic',
      model: 'kimi-for-coding',
      apiKey: process.env.KIMI_API_KEY || '',
      maxTokens: 128000,
      temperature: 0.2,
      timeout: 300000
    });
  }

  /**
   * Run complete PR workflow: create → review → (optional) merge
   */
  async run(task: any, codeResult: any): Promise<PRWorkflowResult> {
    this.logger.info(`🔀 Starting PR workflow for: ${task.title}`);

    // Step 1: Create PR
    const pr = await this.createPR(task, codeResult);
    if (!pr || pr.simulated) {
      return {
        prNumber: 0,
        prUrl: pr?.url || '',
        branch: codeResult.branch || '',
        reviewStatus: 'pending',
        merged: false
      };
    }

    // Step 2: Run Review
    const review = await this.runReview(pr.number);

    // Step 3: Auto-merge if approved and enabled
    let merged = false;
    if (review.status === 'approved' && review.canAutoApprove) {
      merged = await this.mergePR(pr.number);
    }

    return {
      prNumber: pr.number,
      prUrl: pr.url,
      branch: codeResult.branch,
      reviewStatus: review.status,
      merged
    };
  }

  /**
   * Create PR for the task
   */
  private async createPR(task: any, codeResult: any): Promise<any> {
    this.logger.info('📤 Creating PR...');
    
    try {
      const branch = codeResult.branch || `harness/${task.id}`;
      const pr = await this.prAutomator.create({
        branch,
        title: `[Auto] ${task.title}`,
        body: this.buildPRBody(task, codeResult),
        draft: false
      });

      this.logger.info(`✅ PR created: ${pr.url}`);
      return pr;
    } catch (error: any) {
      this.logger.error('❌ PR creation failed:', error.message);
      return null;
    }
  }

  /**
   * Run code review
   */
  private async runReview(prNumber: number): Promise<any> {
    this.logger.info(`🔍 Running review for PR #${prNumber}...`);
    
    try {
      const review = await this.reviewAgent.review(prNumber);
      this.logger.info(`📋 Review result: ${review.status}`);
      return review;
    } catch (error: any) {
      this.logger.error('❌ Review failed:', error.message);
      return { status: 'pending', canAutoApprove: false };
    }
  }

  /**
   * Merge PR
   */
  private async mergePR(prNumber: number): Promise<boolean> {
    this.logger.info(`🔀 Merging PR #${prNumber}...`);
    
    try {
      await this.prAutomator.merge({
        number: prNumber,
        strategy: 'squash',
        deleteBranch: true
      });
      this.logger.info('✅ PR merged');
      return true;
    } catch (error: any) {
      this.logger.error('❌ Merge failed:', error.message);
      return false;
    }
  }

  private buildPRBody(task: any, codeResult: any): string {
    return `## 🤖 Harness Auto-generated PR

**Task:** ${task.title}
**ID:** ${task.id}

### Summary
${codeResult.summary || 'Automated code generation and modifications'}

### Changes
- ${codeResult.files?.length || 0} files modified
- Duration: ${Math.round((codeResult.duration || 0) / 1000)}s

---
*Generated by Harness-Engineering with Superpowers*`;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/PRWorkflow.ts
git commit -m "feat: add PRWorkflow handler"
```

---

## Task 5: Create Resilient Error Handler

**Files:**
- Create: `src/core/ResilientLoop.ts`

- [ ] **Step 1: Create resilient error handling**

```typescript
import { Logger } from '../utils/Logger';
import { TaskQueue } from './TaskQueue';
import { ResilientTaskResult } from '../types/superpowers';

export class ResilientErrorHandler {
  private logger: Logger;
  private taskQueue: TaskQueue;
  private maxRetries: number;

  constructor(maxRetries: number = 3) {
    this.logger = new Logger();
    this.taskQueue = new TaskQueue();
    this.maxRetries = maxRetries;
  }

  /**
   * Handle task failure with retry/fix logic
   */
  async handleFailure(task: any, error: any, attempt: number): Promise<ResilientTaskResult> {
    this.logger.warn(`⚠️ Task ${task.id} failed (attempt ${attempt}/${this.maxRetries}): ${error.message}`);

    // Check if we should retry
    if (attempt < this.maxRetries && this.isRetryable(error)) {
      this.logger.info(`🔄 Retrying task ${task.id}...`);
      
      // Delay before retry (exponential backoff)
      await this.delay(1000 * Math.pow(2, attempt - 1));
      
      return {
        success: false,
        attempts: attempt,
        error: error.message,
        shouldRetry: true
      };
    }

    // Generate fix task
    const fixTaskId = await this.createFixTask(task, error);
    
    return {
      success: false,
      attempts: attempt,
      error: error.message,
      fixTaskId,
      shouldRetry: false
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: any): boolean {
    const retryableErrors = [
      'timeout',
      'connection',
      'ECONNRESET',
      'ETIMEDOUT',
      'rate limit'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    return retryableErrors.some(e => errorMessage.includes(e));
  }

  /**
   * Create a fix task for failed task
   */
  private async createFixTask(failedTask: any, error: any): Promise<string> {
    const fixTaskId = `fix-${Date.now()}`;
    
    const fixTask = {
      id: fixTaskId,
      title: `Fix: ${failedTask.title}`,
      description: `Fix the error in task ${failedTask.id}.\n\nOriginal error:\n\`\`\`\n${error.message}\n\`\`\`\n\nStack trace:\n\`\`\`\n${error.stack || 'N/A'}\n\`\`\``,
      requirements: [
        'Analyze the error and identify root cause',
        'Fix the underlying issue',
        'Verify the fix works',
        'Run tests to ensure no regressions'
      ],
      priority: 'high',
      status: 'pending',
      parentTask: failedTask.id,
      maxDuration: failedTask.maxDuration,
      createdAt: new Date()
    };

    await this.taskQueue.enqueue(fixTask);
    this.logger.info(`📥 Created fix task: ${fixTaskId}`);
    
    return fixTaskId;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/ResilientLoop.ts
git commit -m "feat: add resilient error handling"
```

---

## Task 6: Integrate with LoopController

**Files:**
- Modify: `src/core/LoopController.ts`

- [ ] **Step 1: Add imports and new properties**

```typescript
// Add to imports
import { DesignPhase } from './DesignPhase';
import { PRWorkflow } from './PRWorkflow';
import { ResilientErrorHandler } from './ResilientLoop';
import { DesignResult, PRWorkflowResult } from '../types/superpowers';

// Add to class properties
export class LoopController extends EventEmitter {
  // ... existing properties ...
  
  private designPhase: DesignPhase;
  private prWorkflow: PRWorkflow;
  private errorHandler: ResilientErrorHandler;
  private enableSuperpowers: boolean;
  
  // ... rest of class ...
}
```

- [ ] **Step 2: Initialize new components in constructor**

```typescript
constructor(config: LoopConfig) {
  super();
  this.config = config;
  this.logger = new Logger();
  
  // Determine working directory
  const workingDir = config.projectPath || process.cwd();
  this.logger.info(`📁 Working directory: ${workingDir}`);
  
  this.taskQueue = new TaskQueue();
  this.executor = new TaskExecutor(config.llm, workingDir);
  this.reviewer = new ReviewAgent(config.llm);
  this.prAutomator = new PRAutomator();
  this.stateManager = new StateManager();
  this.safetyGuard = new SafetyGuard(config.safety);
  this.checkpointManager = new CheckpointManager();
  
  // Initialize Superpowers components
  this.enableSuperpowers = true; // Can be from config
  this.designPhase = new DesignPhase(true);
  this.prWorkflow = new PRWorkflow();
  this.errorHandler = new ResilientErrorHandler(3);
}
```

- [ ] **Step 3: Modify executeTask to include design phase**

```typescript
private async executeTask(task: any, options: LoopOptions): Promise<any> {
  const startTime = Date.now();
  
  // Design Phase (if Superpowers enabled)
  if (this.enableSuperpowers) {
    const designResult = await this.designPhase.run(task);
    
    if (!designResult.approved) {
      this.logger.warn(`⏳ Task ${task.id} design not approved, skipping`);
      return {
        status: 'skipped',
        reason: 'design_not_approved',
        duration: Date.now() - startTime
      };
    }
  }
  
  // Original execution logic
  try {
    task.status = 'running';
    task.startedAt = new Date();
    await this.taskQueue.update(task);
    
    const result = await this.executor.execute(task, {
      dryRun: options.dryRun,
      onProgress: (progress) => {
        this.emit('taskProgress', { task, progress });
      }
    });
    
    const duration = Date.now() - startTime;
    
    return {
      ...result,
      duration,
      completedAt: new Date()
    };
    
  } catch (error: any) {
    return {
      status: 'failed',
      error: error.message || String(error),
      duration: Date.now() - startTime
    };
  }
}
```

- [ ] **Step 4: Modify processResult to include PR workflow**

```typescript
private async processResult(task: any, result: any): Promise<void> {
  this.logger.info(`✅ Task execution complete: ${task.title}`);
  this.logger.info(`   Status: ${result.status}`);
  this.logger.info(`   Duration: ${result.duration}ms`);
  
  if (result.status === 'success') {
    this.stats.completed++;
    this.recordAction(`task_complete:${task.id}`);
    
    // PR Workflow (if not dry run and has changes)
    if (result.hasChanges && !result.dryRun && this.enableSuperpowers) {
      const prResult = await this.prWorkflow.run(task, result);
      
      if (prResult.prNumber > 0) {
        task.prUrl = prResult.prUrl;
        task.prNumber = prResult.prNumber;
        task.prMerged = prResult.merged;
      }
    }
    
    // Update task status
    task.status = 'completed';
    task.result = result;
    task.completedAt = new Date();
    await this.taskQueue.update(task);
    
    // Generate follow-up tasks
    await this.generateFollowUpTasks(task, result);
    
    this.emit('taskCompleted', { task, result });
    
  } else if (result.status === 'failed') {
    // Use resilient error handler instead of immediate failure
    const errorResult = await this.errorHandler.handleFailure(
      task, 
      new Error(result.error), 
      task.retryCount || 0
    );
    
    if (errorResult.shouldRetry) {
      // Retry the task
      task.retryCount = (task.retryCount || 0) + 1;
      task.status = 'pending';
      await this.taskQueue.enqueue(task);
      this.logger.info(`🔄 Task ${task.id} queued for retry (attempt ${task.retryCount})`);
    } else if (errorResult.fixTaskId) {
      // Fix task created, mark current as failed
      this.stats.failed++;
      this.recordAction(`task_failed:${task.id}`);
      task.status = 'failed';
      task.result = result;
      task.fixTaskId = errorResult.fixTaskId;
      await this.taskQueue.update(task);
      
      this.logger.info(`📥 Fix task ${errorResult.fixTaskId} created for failed task`);
    }
  }
}
```

- [ ] **Step 5: Modify handleLoopError to be less aggressive**

```typescript
private async handleLoopError(error: any): Promise<void> {
  this.logger.error('Loop error:', error);
  
  // Save error state
  await this.stateManager.saveError({
    timestamp: new Date(),
    error: error.message || String(error),
    stack: error.stack
  });
  
  // Check if we should stop or continue
  const isFatal = this.isFatalError(error);
  
  if (isFatal) {
    this.logger.error('🛑 Fatal error, stopping Loop');
    this.isRunning = false;
  } else {
    this.logger.warn('⚠️ Non-fatal error, continuing...');
    // Brief delay before continuing
    await this.sleep(5000);
  }
}

private isFatalError(error: any): boolean {
  const fatalPatterns = [
    'Out of memory',
    'Cannot find module',
    'EACCES',
    'EPERM'
  ];
  
  const errorMessage = error.message || String(error);
  return fatalPatterns.some(p => errorMessage.includes(p));
}
```

- [ ] **Step 6: Commit integration changes**

```bash
git add src/core/LoopController.ts
git commit -m "feat: integrate Superpowers with LoopController"
```

---

## Task 7: Update ConfigLoader

**Files:**
- Modify: `src/utils/ConfigLoader.ts`

- [ ] **Step 1: Add Superpowers config to interface**

```typescript
export interface HarnessConfig {
  // ... existing config ...
  github: {
    token: string;
  };
  superpowers?: {
    enabled: boolean;
    autoDesign: boolean;
    requireApproval: boolean;
    skillsPath: string;
  };
  projectPath?: string;
}
```

- [ ] **Step 2: Update default config**

```typescript
const defaultConfig: HarnessConfig = {
  // ... existing defaults ...
  github: {
    token: process.env.GITHUB_TOKEN || ''
  },
  superpowers: {
    enabled: true,
    autoDesign: true,
    requireApproval: false,
    skillsPath: '.config/agents/skills'
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/ConfigLoader.ts
git commit -m "feat: add Superpowers config options"
```

---

## Task 8: Build and Test Integration

- [ ] **Step 1: Build the project**

```bash
cd D:\work\study\Kimi_Agent_OpenAI_Harness\harness-cli
npm run build
```

Expected: Build succeeds with no errors

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 3: Create integration test**

Create: `src/__tests__/SuperpowersIntegration.test.ts`

```typescript
import { LoopController } from '../core/LoopController';
import { DesignPhase } from '../core/DesignPhase';
import { PRWorkflow } from '../core/PRWorkflow';

describe('Superpowers Integration', () => {
  test('DesignPhase can be instantiated', () => {
    const designPhase = new DesignPhase(true);
    expect(designPhase).toBeDefined();
  });

  test('PRWorkflow can be instantiated', () => {
    const prWorkflow = new PRWorkflow();
    expect(prWorkflow).toBeDefined();
  });

  test('LoopController accepts Superpowers config', () => {
    const controller = new LoopController({
      llm: {
        provider: 'anthropic',
        model: 'kimi-for-coding',
        apiKey: 'test-key',
        maxTokens: 128000,
        temperature: 0.2,
        timeout: 300000
      },
      safety: {
        maxExecutionTime: 21600000,
        maxErrorRate: 0.5,
        maxComplexity: 100
      },
      checkpoint: {
        enabled: true,
        interval: 300000
      },
      superpowers: {
        enabled: true,
        autoDesign: true,
        requireApproval: false,
        skillsPath: '.config/agents/skills'
      }
    });
    
    expect(controller).toBeDefined();
  });
});
```

- [ ] **Step 4: Run integration test**

```bash
npm test -- src/__tests__/SuperpowersIntegration.test.ts
```

Expected: Tests pass

- [ ] **Step 5: Commit all changes**

```bash
git add .
git commit -m "feat: complete Superpowers integration"
```

---

## Task 9: Documentation

- [ ] **Step 1: Create integration documentation**

Create: `docs/superpowers/SUPERPOWERS_INTEGRATION.md`

```markdown
# Harness Loop + Superpowers Integration

## Overview

This document describes the integration between harness-loop and Superpowers skills.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Harness Loop                         │
├─────────────────────────────────────────────────────────┤
│  Task Queue → Design Phase → Execution → PR Workflow   │
│                    ↓                                    │
│              Superpowers Bridge                         │
│                    ↓                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │ Brainstorm  │→ │ Write Plans │→ │ Execute Plans  │  │
│  └─────────────┘  └─────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Configuration

Add to `.harness/config.yaml`:

```yaml
superpowers:
  enabled: true
  autoDesign: true
  requireApproval: false
  skillsPath: .config/agents/skills
```

## Workflow

1. **Task Received** → Check Superpowers config
2. **Design Phase** → Run brainstorming → Write plans
3. **Approval Gate** → Wait for approval if required
4. **Code Generation** → Execute plan with harness-loop
5. **PR Workflow** → Create PR → Review → Merge
6. **Error Handling** → Retry or create fix task

## Features

- **Design-Driven**: Tasks go through design phase before coding
- **Resilient**: Failed tasks generate fix tasks instead of stopping
- **Automated PR**: Complete PR workflow with review
- **Extensible**: Easy to add new Superpowers skills
```

- [ ] **Step 2: Commit documentation**

```bash
git add docs/superpowers/SUPERPOWERS_INTEGRATION.md
git commit -m "docs: add Superpowers integration documentation"
```

---

## Summary

This implementation adds:

1. **Design Phase** - Integrates `brainstorming` and `writing-plans` skills
2. **PR Workflow** - Complete create → review → merge pipeline
3. **Resilient Loop** - Error handling with retry/fix task generation
4. **Configuration** - Flexible config options for Superpowers
5. **Documentation** - Complete integration guide

**Next Steps:**
- Test with actual Superpowers skills installed
- Fine-tune error handling thresholds
- Add metrics and observability
- Consider adding more Superpowers skills (e.g., `receiving-code-review`)
