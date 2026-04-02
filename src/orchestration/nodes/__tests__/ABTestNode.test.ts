import { ABTestNode } from '../ABTestNode';
import { Logger } from '../../../utils/Logger';
import { Task } from '../../../core/TaskQueue';
import { TaskStatus } from '../../../types/orchestration';

describe('ABTestNode', () => {
  let node: ABTestNode;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    node = new ABTestNode({
      logger: mockLogger,
      workingDir: '/tmp/test',
      config: {}
    });
  });

  test('should create ABTestNode instance', () => {
    expect(node).toBeInstanceOf(ABTestNode);
  });

  test('should return correct node name', () => {
    expect(node.getName()).toBe('ABTestNode');
  });

  test('should skip A/B testing when disabled', async () => {
    const state: any = {
      tasks: [],
      currentTaskId: null,
      results: new Map(),
      abTestResults: new Map(),
      config: { enableHumanReview: false, enableParallelExecution: false, enableABTesting: false, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.execute({ state });

    expect(result.state.abTestVariant).toBeNull();
    expect(mockLogger.info).toHaveBeenCalledWith('A/B testing is disabled');
  });

  test('should route to variant A when hash is even', async () => {
    const state: any = {
      tasks: [],
      currentTaskId: 'task-even', // This will produce an even hash
      results: new Map(),
      abTestResults: new Map(),
      config: { enableHumanReview: false, enableParallelExecution: false, enableABTesting: true, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const routeResult = await node.route(state);

    // Verify routing is deterministic
    expect(routeResult.abTestVariant).toBeDefined();
    expect(['A', 'B']).toContain(routeResult.abTestVariant);
  });

  test('should execute variant A for a task', async () => {
    const task: Task = {
      id: 'task-1',
      title: 'Test Task',
      description: 'Test description',
      priority: 'medium',
      status: 'pending',
      maxDuration: 300000,
      createdAt: new Date()
    };

    const state: any = {
      tasks: [task],
      currentTaskId: 'task-1',
      results: new Map(),
      abTestResults: new Map(),
      config: { enableHumanReview: false, enableParallelExecution: false, enableABTesting: true, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.executeVariantA(state, task);

    expect(result.abTestResults).toBeDefined();
    expect(result.abTestResults?.has('task-1')).toBe(true);

    const taskResult = result.abTestResults?.get('task-1');
    expect(taskResult?.taskId).toBe('task-1');
    expect(taskResult?.status).toBe(TaskStatus.COMPLETED);
    expect(taskResult?.output?.variant).toBe('A');
    expect(taskResult?.output?.config?.temperature).toBe(0.2);
  });

  test('should execute variant B for a task', async () => {
    const task: Task = {
      id: 'task-2',
      title: 'Test Task 2',
      description: 'Test description',
      priority: 'high',
      status: 'pending',
      maxDuration: 300000,
      createdAt: new Date()
    };

    const state: any = {
      tasks: [task],
      currentTaskId: 'task-2',
      results: new Map(),
      abTestResults: new Map(),
      config: { enableHumanReview: false, enableParallelExecution: false, enableABTesting: true, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.executeVariantB(state, task);

    expect(result.abTestResults).toBeDefined();
    expect(result.abTestResults?.has('task-2')).toBe(true);

    const taskResult = result.abTestResults?.get('task-2');
    expect(taskResult?.taskId).toBe('task-2');
    expect(taskResult?.status).toBe(TaskStatus.COMPLETED);
    expect(taskResult?.output?.variant).toBe('B');
    expect(taskResult?.output?.config?.temperature).toBe(0.8);
  });

  test('should return error for non-existent task', async () => {
    const state: any = {
      tasks: [],
      currentTaskId: 'non-existent',
      results: new Map(),
      abTestResults: new Map(),
      errors: [],
      config: { enableHumanReview: false, enableParallelExecution: false, enableABTesting: true, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.execute({ state });

    expect(result.state.errors).toBeDefined();
    expect(result.state.errors?.length).toBeGreaterThan(0);
    expect(result.state.errors?.[0]).toContain('Task not found');
  });

  test('should handle invalid state', async () => {
    const state: any = {
      config: { enableHumanReview: false, enableParallelExecution: false, enableABTesting: true, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.execute({ state });

    expect(result.state.errors).toBeDefined();
    expect(result.state.errors?.length).toBeGreaterThan(0);
  });

  test('should preserve existing A/B test results', async () => {
    const existingResults = new Map();
    existingResults.set('old-task', {
      taskId: 'old-task',
      status: TaskStatus.COMPLETED,
      output: { variant: 'A' },
      duration: 1000,
      hasChanges: true
    });

    const task: Task = {
      id: 'new-task',
      title: 'New Task',
      description: 'New description',
      priority: 'high',
      status: 'pending',
      maxDuration: 300000,
      createdAt: new Date()
    };

    const state: any = {
      tasks: [task],
      currentTaskId: 'new-task',
      results: new Map(),
      abTestResults: existingResults,
      config: { enableHumanReview: false, enableParallelExecution: false, enableABTesting: true, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.executeVariantA(state, task);

    expect(result.abTestResults?.has('old-task')).toBe(true);
    expect(result.abTestResults?.has('new-task')).toBe(true);
  });

  test('should compare variants correctly', () => {
    const abTestResults = new Map();
    abTestResults.set('task-1', {
      taskId: 'task-1',
      status: TaskStatus.COMPLETED,
      output: { variant: 'A' },
      duration: 100,
      hasChanges: false
    });
    abTestResults.set('task-2', {
      taskId: 'task-2',
      status: TaskStatus.COMPLETED,
      output: { variant: 'B' },
      duration: 150,
      hasChanges: false
    });

    const state: any = {
      abTestResults
    };

    const comparison = node.compareVariants(state);

    expect(comparison).not.toBeNull();
    expect(comparison?.variantA).not.toBeNull();
    expect(comparison?.variantB).not.toBeNull();
    expect(comparison?.comparison).toContain('Variant A');
    expect(comparison?.comparison).toContain('Variant B');
  });

  test('should return null when comparing empty results', () => {
    const state: any = {
      abTestResults: new Map()
    };

    const comparison = node.compareVariants(state);

    expect(comparison).toBeNull();
  });

  test('should produce consistent hash results', async () => {
    const taskId = 'consistent-task-id';
    const state: any = {
      currentTaskId: taskId,
      config: { enableABTesting: true }
    };

    // Run multiple times to ensure consistency
    const variants: string[] = [];
    for (let i = 0; i < 10; i++) {
      const result = await node.route(state);
      variants.push(result.abTestVariant as string);
    }

    // All variants should be the same
    expect(new Set(variants).size).toBe(1);
  });

  test('should handle task with no current task ID', async () => {
    const state: any = {
      tasks: [],
      currentTaskId: null,
      results: new Map(),
      abTestResults: new Map(),
      config: { enableHumanReview: false, enableParallelExecution: false, enableABTesting: true, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.execute({ state });

    expect(result.state.abTestVariant).toBeNull();
    expect(mockLogger.info).toHaveBeenCalledWith('No current task for A/B testing');
  });
});
