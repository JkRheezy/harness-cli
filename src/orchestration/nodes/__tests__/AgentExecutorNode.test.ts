import { AgentExecutorNode } from '../AgentExecutorNode';
import { Logger } from '../../../utils/Logger';
import { Task } from '../../../core/TaskQueue';
import { TaskStatus } from '../../../types/orchestration';

describe('AgentExecutorNode', () => {
  let node: AgentExecutorNode;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    node = new AgentExecutorNode({
      logger: mockLogger,
      workingDir: '/tmp/test',
      config: {}
    });
  });

  test('should create AgentExecutorNode instance', () => {
    expect(node).toBeInstanceOf(AgentExecutorNode);
  });

  test('should return correct node name', () => {
    expect(node.getName()).toBe('AgentExecutorNode');
  });

  test('should execute with no current task', async () => {
    const state: any = {
      tasks: [],
      currentTaskId: null,
      results: new Map(),
      config: { enableHumanReview: false, enableParallelExecution: false, enableABTesting: false, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.execute({ state });

    expect(result.state).toEqual({});
    expect(mockLogger.info).toHaveBeenCalledWith('No current task to execute');
  });

  test('should execute task and return result', async () => {
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
      config: { enableHumanReview: false, enableParallelExecution: false, enableABTesting: false, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.execute({ state });

    expect(result.state.results).toBeDefined();
    expect(result.state.results?.has('task-1')).toBe(true);
    
    const taskResult = result.state.results?.get('task-1');
    expect(taskResult?.taskId).toBe('task-1');
    expect(taskResult?.status).toBe(TaskStatus.COMPLETED);
    expect(taskResult?.hasChanges).toBe(false);
  });

  test('should return error for non-existent task', async () => {
    const state: any = {
      tasks: [],
      currentTaskId: 'non-existent',
      results: new Map(),
      errors: [],
      config: { enableHumanReview: false, enableParallelExecution: false, enableABTesting: false, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.execute({ state });

    expect(result.state.errors).toBeDefined();
    expect(result.state.errors?.length).toBeGreaterThan(0);
    expect(result.state.errors?.[0]).toContain('Task not found');
  });

  test('should handle invalid state', async () => {
    const state: any = {};

    const result = await node.execute({ state });

    expect(result.state.errors).toBeDefined();
    expect(result.state.errors?.length).toBeGreaterThan(0);
  });

  test('should preserve existing results', async () => {
    const existingResults = new Map();
    existingResults.set('old-task', {
      taskId: 'old-task',
      status: TaskStatus.COMPLETED,
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
      results: existingResults,
      config: { enableHumanReview: false, enableParallelExecution: false, enableABTesting: false, maxParallelAgents: 3, reviewTimeoutMs: 300000 }
    };

    const result = await node.execute({ state });

    expect(result.state.results?.has('old-task')).toBe(true);
    expect(result.state.results?.has('new-task')).toBe(true);
  });
});
