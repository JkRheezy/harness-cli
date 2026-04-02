import { Annotation } from '@langchain/langgraph';
import { Task } from '../../core/TaskQueue';
import { TaskResult, PendingReview, ReviewDecision, OrchestrationConfig } from '../../types/orchestration';

export const HarnessStateAnnotation = Annotation.Root({
  tasks: Annotation<Task[]>({ reducer: (c, u) => u, default: () => [] }),
  currentTaskId: Annotation<string | null>({ reducer: (c, u) => u, default: () => null }),
  results: Annotation<Map<string, TaskResult>>({ 
    reducer: (c, u) => new Map([...c, ...u]), 
    default: () => new Map() 
  }),
  pendingReview: Annotation<PendingReview | null>({ reducer: (c, u) => u, default: () => null }),
  reviewDecision: Annotation<ReviewDecision | null>({ reducer: (c, u) => u, default: () => null }),
  abTestVariant: Annotation<'A' | 'B' | null>({ reducer: (c, u) => u, default: () => null }),
  abTestResults: Annotation<Map<string, TaskResult>>({ 
    reducer: (c, u) => new Map([...c, ...u]), 
    default: () => new Map() 
  }),
  config: Annotation<OrchestrationConfig>({ 
    reducer: (c, u) => u || c, 
    default: () => ({ enableHumanReview: false, enableParallelExecution: false, enableABTesting: false, maxParallelAgents: 3, reviewTimeoutMs: 300000 })
  }),
  iterationCount: Annotation<number>({ reducer: (c, u) => u, default: () => 0 }),
  startTime: Annotation<number>({ reducer: (c, u) => u, default: () => Date.now() }),
  errors: Annotation<string[]>({ reducer: (c, u) => [...c, ...u], default: () => [] }),
  shouldStop: Annotation<boolean>({ reducer: (c, u) => u, default: () => false })
});

export type HarnessStateType = typeof HarnessStateAnnotation.State;
