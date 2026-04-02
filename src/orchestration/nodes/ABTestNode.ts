import { BaseNode, NodeContext, NodeInput, NodeOutput } from './BaseNode';
import { HarnessStateType } from '../graph/state';
import { Task } from '../../core/TaskQueue';
import { TaskResult, TaskStatus } from '../../types/orchestration';

export interface ABTestResult {
  variant: 'A' | 'B';
  result: TaskResult;
  metrics: { duration: number; qualityScore?: number };
}

export class ABTestNode extends BaseNode {
  constructor(context: NodeContext) {
    super(context);
  }

  getName(): string {
    return 'ABTestNode';
  }

  async execute(input: NodeInput): Promise<NodeOutput> {
    const { state } = input;

    this.logger.info(`Executing ${this.getName()}`);

    try {
      // Check if A/B testing is enabled
      if (!state.config.enableABTesting) {
        this.logger.info('A/B testing is disabled');
        return { state: { abTestVariant: null } };
      }

      // Validate state
      if (!this.validateState(state, ['tasks', 'currentTaskId'])) {
        return this.createErrorOutput('Invalid state: missing required fields');
      }

      // Route to variant
      const routeResult = await this.route(state);

      // Get the current task
      const currentTaskId = state.currentTaskId;
      if (!currentTaskId) {
        this.logger.info('No current task for A/B testing');
        return { state: { abTestVariant: null } };
      }

      const task = state.tasks.find(t => t.id === currentTaskId);
      if (!task) {
        return this.createErrorOutput(`Task not found: ${currentTaskId}`);
      }

      // Execute based on variant
      const variant = routeResult.abTestVariant;
      this.logger.info(`A/B test variant selected: ${variant}`);

      let executionResult: Partial<HarnessStateType>;
      if (variant === 'A') {
        executionResult = await this.executeVariantA(state, task);
      } else {
        executionResult = await this.executeVariantB(state, task);
      }

      return {
        state: {
          abTestVariant: variant,
          ...executionResult
        }
      };

    } catch (error) {
      return this.createErrorOutput(error as Error);
    }
  }

  /**
   * Route the task to variant A or B based on task ID hash
   */
  async route(state: HarnessStateType): Promise<Partial<HarnessStateType>> {
    if (!state.config.enableABTesting) {
      return { abTestVariant: null };
    }

    const taskId = state.currentTaskId || '';
    const variant: 'A' | 'B' = this.simpleHash(taskId) % 2 === 0 ? 'A' : 'B';

    return { abTestVariant: variant };
  }

  /**
   * Execute with variant A config (lower temperature for more deterministic results)
   */
  async executeVariantA(state: HarnessStateType, task: Task): Promise<Partial<HarnessStateType>> {
    this.logger.info(`Executing variant A for task: ${task.id}`);

    const startTime = Date.now();

    try {
      // Simulate execution with lower temperature config
      const result: TaskResult = {
        taskId: task.id,
        status: TaskStatus.COMPLETED,
        output: {
          variant: 'A',
          config: { temperature: 0.2 },
          message: `Task ${task.id} executed with variant A (deterministic)`
        },
        duration: Date.now() - startTime,
        hasChanges: false
      };

      // Store in abTestResults
      const newAbTestResults = new Map(state.abTestResults);
      newAbTestResults.set(task.id, result);

      return { abTestResults: newAbTestResults };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Variant A execution failed: ${errorMessage}`);

      const result: TaskResult = {
        taskId: task.id,
        status: TaskStatus.FAILED,
        error: errorMessage,
        duration: Date.now() - startTime,
        hasChanges: false
      };

      const newAbTestResults = new Map(state.abTestResults);
      newAbTestResults.set(task.id, result);

      return { abTestResults: newAbTestResults };
    }
  }

  /**
   * Execute with variant B config (higher temperature for more creative results)
   */
  async executeVariantB(state: HarnessStateType, task: Task): Promise<Partial<HarnessStateType>> {
    this.logger.info(`Executing variant B for task: ${task.id}`);

    const startTime = Date.now();

    try {
      // Simulate execution with higher temperature config
      const result: TaskResult = {
        taskId: task.id,
        status: TaskStatus.COMPLETED,
        output: {
          variant: 'B',
          config: { temperature: 0.8 },
          message: `Task ${task.id} executed with variant B (creative)`
        },
        duration: Date.now() - startTime,
        hasChanges: false
      };

      // Store in abTestResults
      const newAbTestResults = new Map(state.abTestResults);
      newAbTestResults.set(task.id, result);

      return { abTestResults: newAbTestResults };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Variant B execution failed: ${errorMessage}`);

      const result: TaskResult = {
        taskId: task.id,
        status: TaskStatus.FAILED,
        error: errorMessage,
        duration: Date.now() - startTime,
        hasChanges: false
      };

      const newAbTestResults = new Map(state.abTestResults);
      newAbTestResults.set(task.id, result);

      return { abTestResults: newAbTestResults };
    }
  }

  /**
   * Simple hash function for deterministic variant assignment
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Compare results from both variants for analysis
   */
  compareVariants(state: HarnessStateType): { variantA: TaskResult | null; variantB: TaskResult | null; comparison: string } | null {
    const results = state.abTestResults;
    if (!results || results.size === 0) {
      return null;
    }

    let variantA: TaskResult | null = null;
    let variantB: TaskResult | null = null;

    for (const [, result] of results) {
      if (result.output?.variant === 'A') {
        variantA = result;
      } else if (result.output?.variant === 'B') {
        variantB = result;
      }
    }

    if (!variantA && !variantB) {
      return null;
    }

    let comparison = '';
    if (variantA && variantB) {
      const durationDiff = variantB.duration - variantA.duration;
      comparison = `Variant A: ${variantA.duration}ms, Variant B: ${variantB.duration}ms (diff: ${durationDiff}ms)`;
    } else if (variantA) {
      comparison = 'Only variant A result available';
    } else {
      comparison = 'Only variant B result available';
    }

    return { variantA, variantB, comparison };
  }
}
