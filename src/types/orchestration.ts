import { Task } from '../core/TaskQueue';

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  WAITING_REVIEW = 'waiting_review'
}

export enum ReviewDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
  MODIFY = 'modify'
}

export interface TaskResult {
  taskId: string;
  status: TaskStatus;
  output?: any;
  error?: string;
  duration: number;
  hasChanges: boolean;
}

export interface PendingReview {
  taskId: string;
  task: Task;
  result: TaskResult;
  submittedAt: number;
}

export interface OrchestrationConfig {
  enableHumanReview: boolean;
  enableParallelExecution: boolean;
  enableABTesting: boolean;
  maxParallelAgents: number;
  reviewTimeoutMs: number;
}

export interface HarnessState {
  tasks: Task[];
  currentTaskId: string | null;
  results: Map<string, TaskResult>;
  pendingReview: PendingReview | null;
  reviewDecision: ReviewDecision | null;
  abTestVariant: 'A' | 'B' | null;
  abTestResults: Map<string, TaskResult>;
  config: OrchestrationConfig;
  metadata: {
    startTime: number;
    iterationCount: number;
    lastCheckpoint: number;
  };
  errors: string[];
  shouldStop: boolean;
}

export interface AgentNodeInput {
  state: HarnessState;
  task: Task;
}

export interface AgentNodeOutput {
  state: Partial<HarnessState>;
  next: string;
}
