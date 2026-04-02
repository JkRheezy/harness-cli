import { ParallelExecutionNode } from '../ParallelExecutionNode';
import { Logger } from '../../../utils/Logger';
import { Task } from '../../../core/TaskQueue';
import { TaskStatus } from '../../../types/orchestration';

// Mock TaskExecutor
jest.mock('../../../core/TaskExecutor', () => {
  return {
    TaskExecutor: jest.fn().mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue({
        status: 'success',
        hasChanges: true,
        output: { result: 'test' }
      })
    })),
    LLMConfig: jest.fn()
  };
});

describe('ParallelExecutionNode', () => {
  let node: ParallelExecutionNode;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    node = new ParallelExecutionNode({
      logger: mockLogger,
      workingDir: '/tmp/test',
      config: {
        maxParallelAgents: 3,
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key'
      }
    });

    jest.clearAllMocks();
  });

  test('should create ParallelExecutionNode instance', () => {
    expect(node).toBeInstanceOf(ParallelExecutionNode);
  });

  test('should return correct node name', () => {
    expect(node.getName()).toBe('ParallelExecutionNode');
  });

  test('should use default maxConcurrency from config', () => {
    const nodeWithDefault = new ParallelExecutionNode({
      logger: mockLogger,
      workingDir: '/tmp/test',
      config: {
        maxParallelAgents: 5,
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key'
      }
    });

    expect(nodeWithDefault.getMaxConcurrency()).toBe(5);
  });

  test('should use custom maxConcurrency from options', () => {
    const nodeWithCustom = new ParallelExecutionNode({
      logger: mockLogger,
      workingDir: '/tmp/test',
      config: { maxParallelAgents: 3 }
    }, { maxConcurrency: 7 });

    expect(nodeWithCustom.getMaxConcurrency()).toBe(7);
  });

  test('should skip execution when disabled', async () => {
    const state: any = {
      tasks: [],
      results: new Map(),
      iterationCount: 0,
      config: { enableHumanReview: false, enableParallelExecution: false, enableABTesting: false, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.execute({ state });

    expect(result.state).toEqual({});
    expect(mockLogger.info).toHaveBeenCalledWith('Parallel execution is disabled');
  });

  test('should handle no pending tasks', async () => {
    const state: any = {
      tasks: [
        { id: 'task-1', status: 'completed' },
        { id: 'task-2', status: 'running' }
      ],
      results: new Map(),
      iterationCount: 0,
      config: { enableHumanReview: false, enableParallelExecution: true, enableABTesting: false, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.execute({ state });

    expect(result.state).toEqual({});
    expect(mockLogger.info).toHaveBeenCalledWith('No pending tasks for parallel execution');
  });

  test('should execute single pending task', async () => {
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
      results: new Map(),
      iterationCount: 0,
      errors: [],
      config: { enableHumanReview: false, enableParallelExecution: true, enableABTesting: false, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.execute({ state });

    expect(result.state.results).toBeDefined();
    expect(result.state.results?.has('task-1')).toBe(true);
    expect(result.state.iterationCount).toBe(1);

    const taskResult = result.state.results?.get('task-1');
    expect(taskResult?.taskId).toBe('task-1');
    expect(taskResult?.status).toBe(TaskStatus.COMPLETED);
    expect(taskResult?.hasChanges).toBe(true);
  });

  test('should execute multiple pending tasks in parallel', async () => {
    const tasks: Task[] = [
      {
        id: 'task-1',
        title: 'Task 1',
        description: 'Description 1',
        priority: 'high',
        status: 'pending',
        maxDuration: 300000,
        createdAt: new Date()
      },
      {
        id: 'task-2',
        title: 'Task 2',
        description: 'Description 2',
        priority: 'medium',
        status: 'pending',
        maxDuration: 300000,
        createdAt: new Date()
      },
      {
        id: 'task-3',
        title: 'Task 3',
        description: 'Description 3',
        priority: 'low',
        status: 'pending',
        maxDuration: 300000,
        createdAt: new Date()
      }
    ];

    const state: any = {
      tasks,
      results: new Map(),
      iterationCount: 0,
      errors: [],
      config: { enableHumanReview: false, enableParallelExecution: true, enableABTesting: false, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.execute({ state });

    expect(result.state.results).toBeDefined();
    expect(result.state.results?.size).toBe(3);
    expect(result.state.iterationCount).toBe(1);

    tasks.forEach(task => {
      expect(result.state.results?.has(task.id)).toBe(true);
      const taskResult = result.state.results?.get(task.id);
      expect(taskResult?.status).toBe(TaskStatus.COMPLETED);
    });
  });

  test('should preserve existing results', async () => {
    const existingResults = new Map();
    existingResults.set('old-task', {
      taskId: 'old-task',
      status: TaskStatus.COMPLETED,
      duration: 1000,
      hasChanges: true
    });

    const newTask: Task = {
      id: 'new-task',
      title: 'New Task',
      description: 'New description',
      priority: 'high',
      status: 'pending',
      maxDuration: 300000,
      createdAt: new Date()
    };

    const state: any = {
      tasks: [newTask],
      results: existingResults,
      iterationCount: 0,
      errors: [],
      config: { enableHumanReview: false, enableParallelExecution: true, enableABTesting: false, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.execute({ state });

    expect(result.state.results?.has('old-task')).toBe(true);
    expect(result.state.results?.has('new-task')).toBe(true);
  });

  test('should handle task execution failure', async () => {
    const { TaskExecutor } = require('../../../core/TaskExecutor');
    TaskExecutor.mockImplementation(() => ({
      execute: jest.fn().mockRejectedValue(new Error('Execution failed'))
    }));

    const failingNode = new ParallelExecutionNode({
      logger: mockLogger,
      workingDir: '/tmp/test',
      config: { maxParallelAgents: 3 }
    });

    const task: Task = {
      id: 'failing-task',
      title: 'Failing Task',
      description: 'This task will fail',
      priority: 'high',
      status: 'pending',
      maxDuration: 300000,
      createdAt: new Date()
    };

    const state: any = {
      tasks: [task],
      results: new Map(),
      iterationCount: 0,
      errors: [],
      config: { enableHumanReview: false, enableParallelExecution: true, enableABTesting: false, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await failingNode.execute({ state });

    expect(result.state.results?.has('failing-task')).toBe(true);
    const taskResult = result.state.results?.get('failing-task');
    expect(taskResult?.status).toBe(TaskStatus.FAILED);
    expect(taskResult?.error).toContain('Execution failed');
  });

  test('should handle invalid state', async () => {
    const state: any = {
      config: { enableHumanReview: false, enableParallelExecution: true, enableABTesting: false, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.execute({ state });

    expect(result.state.errors).toBeDefined();
    expect(result.state.errors?.length).toBeGreaterThan(0);
  });

  test('should update max concurrency', () => {
    expect(node.getMaxConcurrency()).toBe(3);

    node.setMaxConcurrency(5);

    expect(node.getMaxConcurrency()).toBe(5);
    expect(mockLogger.info).toHaveBeenCalledWith('Updated max concurrency to 5');
  });

  test('should reject invalid max concurrency', () => {
    expect(() => node.setMaxConcurrency(0)).toThrow('maxConcurrency must be at least 1');
    expect(() => node.setMaxConcurrency(-1)).toThrow('maxConcurrency must be at least 1');
  });

  test('should handle mixed task statuses', async () => {
    const tasks: Task[] = [
      {
        id: 'pending-1',
        title: 'Pending 1',
        description: 'Description',
        priority: 'high',
        status: 'pending',
        maxDuration: 300000,
        createdAt: new Date()
      },
      {
        id: 'completed-1',
        title: 'Completed 1',
        description: 'Description',
        priority: 'medium',
        status: 'completed',
        maxDuration: 300000,
        createdAt: new Date()
      },
      {
        id: 'pending-2',
        title: 'Pending 2',
        description: 'Description',
        priority: 'low',
        status: 'pending',
        maxDuration: 300000,
        createdAt: new Date()
      }
    ];

    const state: any = {
      tasks,
      results: new Map(),
      iterationCount: 0,
      errors: [],
      config: { enableHumanReview: false, enableParallelExecution: true, enableABTesting: false, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.execute({ state });

    // Should only execute pending tasks
    expect(result.state.results?.has('pending-1')).toBe(true);
    expect(result.state.results?.has('pending-2')).toBe(true);
    expect(result.state.results?.has('completed-1')).toBe(false);
  });

  test('should handle batch execution with more tasks than concurrency limit', async () => {
    const tasks: Task[] = Array.from({ length: 10 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      description: `Description ${i}`,
      priority: 'medium',
      status: 'pending',
      maxDuration: 300000,
      createdAt: new Date()
    }));

    const state: any = {
      tasks,
      results: new Map(),
      iterationCount: 0,
      errors: [],
      config: { enableHumanReview: false, enableParallelExecution: true, enableABTesting: false, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.execute({ state });

    expect(result.state.results?.size).toBe(10);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Executing batch'));
  });
});
