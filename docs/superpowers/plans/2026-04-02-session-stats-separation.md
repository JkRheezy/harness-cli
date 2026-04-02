# Session Stats Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate historical stats (accumulated) from session stats (reset on restart) to preserve execution history while ensuring clean error rate calculation for each loop session.

**Architecture:** 
- Maintain two stat objects: `stats` (historical, from checkpoint) and `sessionStats` (current session, reset on restart)
- `stats` tracks lifetime metrics for reporting and analysis
- `sessionStats` tracks current session metrics for safety checks (error rate)
- Checkpoint saves both; loading preserves `stats` but resets `sessionStats`

**Tech Stack:** TypeScript, harness-loop core

---

## Overview

Current design mixes historical and session metrics in one `stats` object, causing:
- Error rate calculation polluted by historical failures
- Checkpoint restart becomes impossible after failures
- Loss of ability to distinguish "current session health" vs "lifetime performance"

This implementation separates concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    Stats Separation                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  stats (Historical)          sessionStats (Current)     │
│  ├── completed: 100          ├── completed: 5           │
│  ├── failed: 10              ├── failed: 0  ← reset    │
│  └── escalated: 2            └── escalated: 0          │
│                                                          │
│  Purpose:                    Purpose:                   │
│  - Reports                   - Safety checks            │
│  - Analysis                  - Error rate calc          │
│  - Trends                    - Current health           │
│                                                          │
│  Persistence:                Persistence:               │
│  - Saved to checkpoint       - Saved but reset on load │
│                                                              │
└─────────────────────────────────────────────────────────┘
```

---

## Task 1: Add SessionStats Interface

**Files:**
- Modify: `src/core/LoopController.ts`

- [ ] **Step 1: Add SessionStats interface**

Add after existing interface definitions (around line 43):

```typescript
export interface SessionStats {
  completed: number;
  failed: number;
  escalated: number;
  startTime: number;  // Session start timestamp
}
```

- [ ] **Step 2: Update LoopController class properties**

Add after existing `stats` property (around line 62):

```typescript
  private stats = {
    completed: 0,
    failed: 0,
    escalated: 0
  };
  
  private sessionStats: SessionStats = {
    completed: 0,
    failed: 0,
    escalated: 0,
    startTime: Date.now()
  };
```

- [ ] **Step 3: Commit**

```bash
git add src/core/LoopController.ts
git commit -m "feat: add SessionStats interface and property"
```

---

## Task 2: Update SafetyGuard to Use SessionStats

**Files:**
- Modify: `src/core/SafetyGuard.ts`

- [ ] **Step 1: Update ExecutionContext interface**

Replace the existing interface (around line 15-27):

```typescript
export interface ExecutionContext {
  startTime: number;
  currentTask?: any;
  stats: {
    completed: number;
    failed: number;
    escalated: number;
  };
  sessionStats: {
    completed: number;
    failed: number;
    escalated: number;
  };
  queueSize: number;
  errors: number;
  totalAttempts: number;
  actionHistory: string[];
}
```

- [ ] **Step 2: Update checkErrorRate to use sessionStats**

Replace the method (around line 88-109):

```typescript
  private checkErrorRate(context: ExecutionContext): SafetyCheck {
    // Use sessionStats for error rate calculation (not cumulative stats)
    const sessionAttempts = context.sessionStats.completed + 
                           context.sessionStats.failed + 
                           context.sessionStats.escalated;
    
    // Need minimum sample size
    if (sessionAttempts < 5) {
      return { passed: true };
    }
    
    const errorRate = context.sessionStats.failed / sessionAttempts;
    
    if (errorRate > this.config.maxErrorRate) {
      return {
        passed: false,
        action: 'stop',
        reason: `Session error rate ${(errorRate * 100).toFixed(1)}% (${context.sessionStats.failed}/${sessionAttempts}) exceeds limit ${(this.config.maxErrorRate * 100).toFixed(1)}%`
      };
    }
    
    // Warning: error rate over 50%
    if (errorRate > 0.5) {
      this.logger.warn(`Session error rate high: ${(errorRate * 100).toFixed(1)}% (${context.sessionStats.failed}/${sessionAttempts})`);
    }
    
    return { passed: true };
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/core/SafetyGuard.ts
git commit -m "feat: SafetyGuard uses sessionStats for error rate calculation"
```

---

## Task 3: Update LoopController to Track Both Stats

**Files:**
- Modify: `src/core/LoopController.ts`

- [ ] **Step 1: Initialize sessionStats in constructor**

Add to constructor (after line 91):

```typescript
    // Initialize session stats
    this.sessionStats = {
      completed: 0,
      failed: 0,
      escalated: 0,
      startTime: Date.now()
    };
```

- [ ] **Step 2: Update task success handling**

Find success handling in `processResult` (around line 572-574):

```typescript
    if (result.status === 'success') {
      // Update both stats
      this.stats.completed++;
      this.sessionStats.completed++;
      this.recordAction(`task_complete:${task.id}`);
```

- [ ] **Step 3: Update task failure handling**

Find failure handling (around line 619):

```typescript
      } else if (errorResult.fixTaskId) {
        // Fix task created, mark current as failed
        // Update both stats
        this.stats.failed++;
        this.sessionStats.failed++;
        this.recordAction(`task_failed:${task.id}`);
```

- [ ] **Step 4: Update task escalation handling**

Find escalation handling (around line 793):

```typescript
  private async escalateTask(task: any, result: any): Promise<void> {
    // Update both stats
    this.stats.escalated++;
    this.sessionStats.escalated++;
    this.recordAction(`task_escalated:${task.id}`);
```

- [ ] **Step 5: Update getContext for SafetyGuard**

Find getContext method (around line 842-851):

```typescript
  private getContext(): ExecutionContext {
    return {
      startTime: this.startTime,
      currentTask: this.currentTask,
      stats: this.stats,
      sessionStats: this.sessionStats,  // Add this
      queueSize: this.taskQueue.getPendingCount(),
      actionHistory: this.actionHistory,
      errors: this.stats.failed,
      totalAttempts: this.stats.completed + this.stats.failed + this.stats.escalated
    };
  }
```

- [ ] **Step 6: Commit**

```bash
git add src/core/LoopController.ts
git commit -m "feat: LoopController tracks both stats and sessionStats"
```

---

## Task 4: Update Checkpoint Save/Load

**Files:**
- Modify: `src/core/LoopController.ts`

- [ ] **Step 1: Update saveCheckpoint**

Find saveCheckpoint (around line 867-877):

```typescript
  private async saveCheckpoint(): Promise<void> {
    const checkpoint = {
      timestamp: Date.now(),
      currentTask: this.currentTask,
      stats: this.stats,
      sessionStats: this.sessionStats,  // Add this
      queueState: await this.taskQueue.getState(),
      hasGeneratedInitialTasks: this.hasGeneratedInitialTasks
    };
    
    await this.checkpointManager.save(checkpoint);
    this.logger.debug('💾 Checkpoint saved');
  }
```

- [ ] **Step 2: Update loadCheckpoint**

Replace loadCheckpoint (around line 880-898):

```typescript
  private async loadCheckpoint(): Promise<void> {
    const checkpoint = await this.checkpointManager.load();
    
    if (checkpoint) {
      this.logger.info('📂 Loading checkpoint');
      
      // Load historical stats (never reset)
      if (checkpoint.stats) {
        this.stats = checkpoint.stats;
        this.logger.info(`📊 Historical stats: completed=${this.stats.completed}, failed=${this.stats.failed}`);
      }
      
      // Reset session stats for new session
      this.sessionStats = {
        completed: 0,
        failed: 0,
        escalated: 0,
        startTime: Date.now()
      };
      this.logger.info('🔄 Session stats reset for new session');
      
      if (checkpoint.queueState) {
        await this.taskQueue.restoreState(checkpoint.queueState);
      }
      
      if (checkpoint.hasGeneratedInitialTasks) {
        this.hasGeneratedInitialTasks = checkpoint.hasGeneratedInitialTasks;
      }
    }
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/core/LoopController.ts
git commit -m "feat: checkpoint saves both stats, resets sessionStats on load"
```

---

## Task 5: Update Reporting and Status

**Files:**
- Modify: `src/core/LoopController.ts`

- [ ] **Step 1: Update final stats log**

Find the final log in run() method (around line 204):

```typescript
    this.logger.info('🏁 Loop stopped');
    this.logger.info(`📊 Session stats: completed=${this.sessionStats.completed}, failed=${this.sessionStats.failed}`);
    this.logger.info(`📊 Lifetime stats: completed=${this.stats.completed}, failed=${this.stats.failed}, escalated=${this.stats.escalated}`);
```

- [ ] **Step 2: Update getStatus method**

Find getStatus (around line 220-226):

```typescript
  async getStatus(): Promise<any> {
    return {
      loopStatus: this.isRunning ? 'running' : 'stopped',
      activeTasks: this.currentTask ? 1 : 0,
      pendingTasks: await this.taskQueue.getPendingCount(),
      sessionStats: this.sessionStats,  // Add this
      lifetimeStats: this.stats,        // Rename for clarity
      uptime: Date.now() - this.startTime
    };
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/core/LoopController.ts
git commit -m "feat: update reporting to show both session and lifetime stats"
```

---

## Task 6: Build and Test

- [ ] **Step 1: Build project**

```bash
npm run build
```

Expected: No TypeScript errors

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete session stats separation

- Add SessionStats interface with startTime tracking
- SafetyGuard uses sessionStats for error rate (not cumulative)
- LoopController tracks both stats and sessionStats
- Checkpoint saves both but resets sessionStats on load
- Historical stats preserved for reporting
- Session stats give clean slate for error rate calculation"
```

---

## Summary

### Behavior Changes

| Scenario | Before | After |
|----------|--------|-------|
| Restart after 10 failures | Error rate=100%, stops immediately | Session stats reset, fresh start |
| 100 success, then 1 failure | Error rate=1%, continues | Session error rate depends on session size |
| Report lifetime performance | N/A | `stats` shows complete history |
| Current session health | N/A | `sessionStats` shows recent performance |

### Checkpoint Structure

```json
{
  "timestamp": 1234567890,
  "stats": {              // Lifetime (never reset)
    "completed": 100,
    "failed": 10,
    "escalated": 2
  },
  "sessionStats": {       // Current (reset on load)
    "completed": 5,
    "failed": 0,
    "escalated": 0,
    "startTime": 1234567890
  },
  "currentTask": {...},
  "queueState": {...}
}
```

**Plan complete and saved to `docs/superpowers/plans/2026-04-02-session-stats-separation.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach would you like to use?