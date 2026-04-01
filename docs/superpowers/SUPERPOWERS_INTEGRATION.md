# Harness Loop + Superpowers Integration

## Overview

This document describes the integration between harness-loop and Superpowers skills, enabling design-driven autonomous development with proper review/PR workflow and continuous iteration.

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

## Components

### 1. DesignPhase (`src/core/DesignPhase.ts`)

Handles the design phase of task execution:
- **Brainstorming**: Invokes `brainstorming` skill to explore approaches
- **Planning**: Invokes `writing-plans` skill to create implementation plans
- **Approval Gate**: Optionally waits for human approval before proceeding

```typescript
const designPhase = new DesignPhase(autoDesign: boolean);
const result = await designPhase.run(task);
// result.phase: 'none' | 'brainstorming' | 'planning' | 'ready'
// result.approved: boolean
```

### 2. PRWorkflow (`src/core/PRWorkflow.ts`)

Manages the complete PR lifecycle:
- **Create PR**: Automatically creates PR with formatted description
- **Code Review**: Runs ReviewAgent for automated code review
- **Auto-merge**: Merges PR if review passes and auto-merge enabled

```typescript
const prWorkflow = new PRWorkflow();
const result = await prWorkflow.run(task, codeResult);
// result.prNumber, result.prUrl, result.merged
```

### 3. ResilientErrorHandler (`src/core/ResilientLoop.ts`)

Provides resilient error handling:
- **Retry Logic**: Exponential backoff for retryable errors (network, timeout)
- **Fix Task Generation**: Creates fix tasks for non-retryable errors
- **Loop Continuity**: Prevents Loop from stopping on task failures

```typescript
const errorHandler = new ResilientErrorHandler(maxRetries: 3);
const result = await errorHandler.handleFailure(task, error, attempt);
// result.shouldRetry or result.fixTaskId
```

### 4. SkillInvoker (`src/utils/SkillInvoker.ts`)

Utility for invoking Superpowers skills:
- Checks if skill exists
- Invokes skill with arguments
- Handles missing skills gracefully (fallback mode)

## Configuration

Add to `.harness/config.yaml`:

```yaml
# Superpowers integration configuration
superpowers:
  enabled: true              # Enable Superpowers integration
  autoDesign: true           # Auto-approve design phase
  requireApproval: false     # Require human approval for designs
  skillsPath: .config/agents/skills  # Path to Superpowers skills

# Project path for file operations
projectPath: D:\test\my-project
```

## Workflow

### 1. Task Received
- Task added to queue
- LoopController checks Superpowers config

### 2. Design Phase (if enabled)
```
Task → DesignPhase.run()
  → Brainstorming skill → Planning skill
  → Check approval → Return DesignResult
```

### 3. Code Generation
```
DesignResult (approved) → TaskExecutor.execute()
  → LLM generates plan
  → Execute steps (read/write/edit files)
  → Return execution result
```

### 4. PR Workflow (if enabled and has changes)
```
Execution Result → PRWorkflow.run()
  → Create PR → Run Review → Auto-merge (if approved)
  → Return PRWorkflowResult
```

### 5. Error Handling
```
Failure → ResilientErrorHandler.handleFailure()
  → Check retryable → Retry with backoff
  → Or create fix task → Continue Loop
```

## Features

### Design-Driven Development
- Tasks go through design phase before coding
- Uses `brainstorming` skill to explore approaches
- Uses `writing-plans` skill to create detailed plans

### Automated PR Workflow
- Automatic PR creation with formatted descriptions
- Automated code review using ReviewAgent
- Auto-merge on approval

### Resilient Execution
- Retry with exponential backoff for transient errors
- Fix task generation for persistent errors
- Loop continues despite individual task failures

### Fallback Mode
When Superpowers skills are not available:
- DesignPhase falls back to direct code generation
- Skills not found → warning logged, continues execution

## Integration with Existing Components

### LoopController
- Initializes Superpowers components if enabled
- Calls DesignPhase before TaskExecutor
- Calls PRWorkflow after successful execution
- Uses ResilientErrorHandler for failures

### TaskExecutor
- Receives design results (if design phase enabled)
- Generates code based on design/plan
- Returns result with hasChanges flag

### PRAutomator & ReviewAgent
- PRAutomator: Creates and merges PRs
- ReviewAgent: Automated code review
- Both integrated into PRWorkflow

## Example Usage

```typescript
import { LoopController } from './core/LoopController';

const controller = new LoopController({
  llm: { /* LLM config */ },
  safety: { /* Safety config */ },
  checkpoint: { enabled: true },
  superpowers: {
    enabled: true,
    autoDesign: true,
    requireApproval: false,
    skillsPath: '.config/agents/skills'
  },
  projectPath: 'D:\\test\\my-project'
});

await controller.start({ maxDuration: 6 * 60 * 60 * 1000 });
```

## Testing

Run integration tests:
```bash
npm test -- src/__tests__/SuperpowersIntegration.test.ts
```

## Future Enhancements

1. **More Superpowers Skills**: Integrate additional skills like `receiving-code-review`, `systematic-debugging`
2. **Metrics & Observability**: Track design phase success rates, PR merge rates
3. **Human-in-the-Loop**: Enhanced approval workflows for critical changes
4. **Skill Discovery**: Auto-discover available Superpowers skills

## Migration Guide

### From Legacy harness-loop:
1. Update config to include `superpowers` section
2. Set `projectPath` for correct file operations
3. No code changes needed - backward compatible

### Disabling Superpowers:
```yaml
superpowers:
  enabled: false
```
Loop will fall back to legacy behavior (direct code generation, no PR workflow).
