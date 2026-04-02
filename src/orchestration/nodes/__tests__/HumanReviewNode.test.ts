import { HumanReviewNode } from '../HumanReviewNode';
import { Logger } from '../../../utils/Logger';
import { TaskStatus, ReviewDecision } from '../../../types/orchestration';

describe('HumanReviewNode', () => {
  let node: HumanReviewNode;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    node = new HumanReviewNode({
      logger: mockLogger,
      workingDir: '/tmp/test',
      config: {}
    });
  });

  test('should create HumanReviewNode instance', () => {
    expect(node).toBeInstanceOf(HumanReviewNode);
  });

  test('should return correct node name', () => {
    expect(node.getName()).toBe('HumanReviewNode');
  });

  test('should skip review when disabled', async () => {
    const state: any = {
      config: { enableHumanReview: false }
    };

    const result = await node.execute({ state });

    expect(result.state.reviewDecision).toBe(ReviewDecision.APPROVE);
    expect(mockLogger.info).toHaveBeenCalledWith('Human review is disabled, skipping');
  });

  test('should handle no current task', async () => {
    const state: any = {
      config: { enableHumanReview: true },
      currentTaskId: null,
      results: new Map()
    };

    const result = await node.execute({ state });

    expect(result.state).toEqual({});
    expect(mockLogger.info).toHaveBeenCalledWith('No current task for review');
  });

  test('should resume from pending review', async () => {
    const state: any = {
      config: { enableHumanReview: true, reviewTimeoutMs: 300000 },
      currentTaskId: 'task-1',
      results: new Map(),
      tasks: [],
      pendingReview: {
        taskId: 'task-1',
        task: { id: 'task-1', title: 'Test' },
        result: { taskId: 'task-1', status: TaskStatus.WAITING_REVIEW },
        submittedAt: Date.now()
      },
      reviewDecision: null
    };

    const result = await node.execute({ state });

    expect(mockLogger.info).toHaveBeenCalledWith('Resuming from pending review for task task-1');
  });

  test('should create pending review for completed task', async () => {
    const state: any = {
      config: { enableHumanReview: true, reviewTimeoutMs: 300000 },
      currentTaskId: 'task-1',
      results: new Map([['task-1', {
        taskId: 'task-1',
        status: TaskStatus.COMPLETED,
        duration: 1000,
        hasChanges: true
      }]]),
      tasks: [{
        id: 'task-1',
        title: 'Test Task',
        description: 'Test Description'
      }],
      pendingReview: null,
      errors: []
    };

    const result = await node.execute({ state });

    expect(result.state.pendingReview).toBeDefined();
    expect(result.state.pendingReview?.taskId).toBe('task-1');
  });

  test('should return error when no result found', async () => {
    const state: any = {
      config: { enableHumanReview: true },
      currentTaskId: 'task-1',
      results: new Map(),
      tasks: [],
      pendingReview: null,
      errors: []
    };

    const result = await node.execute({ state });

    expect(result.state.errors).toBeDefined();
    expect(result.state.errors?.length).toBeGreaterThan(0);
  });

  test('should handle review timeout', async () => {
    const state: any = {
      config: { enableHumanReview: true, reviewTimeoutMs: 1000 },
      currentTaskId: 'task-1',
      results: new Map(),
      tasks: [],
      pendingReview: {
        taskId: 'task-1',
        task: { id: 'task-1', title: 'Test' },
        result: { taskId: 'task-1', status: TaskStatus.WAITING_REVIEW },
        submittedAt: Date.now() - 2000 // 2 seconds ago, timeout is 1 second
      },
      reviewDecision: null,
      errors: []
    };

    const result = await node.execute({ state });

    expect(result.state.pendingReview).toBeNull();
    expect(result.state.reviewDecision).toBe(ReviewDecision.APPROVE);
    expect(result.state.errors?.[0]).toContain('timeout');
  });

  test('should process review decision', async () => {
    const state: any = {
      config: { enableHumanReview: true, reviewTimeoutMs: 300000 },
      currentTaskId: 'task-1',
      results: new Map(),
      tasks: [],
      pendingReview: {
        taskId: 'task-1',
        task: { id: 'task-1', title: 'Test' },
        result: { taskId: 'task-1', status: TaskStatus.WAITING_REVIEW },
        submittedAt: Date.now()
      },
      reviewDecision: ReviewDecision.APPROVE
    };

    const result = await node.execute({ state });

    expect(result.state.pendingReview).toBeNull();
  });

  test('should check if should wait for review', () => {
    const state: any = {
      config: { enableHumanReview: true, reviewTimeoutMs: 300000 },
      pendingReview: {
        taskId: 'task-1',
        task: { id: 'task-1', title: 'Test' },
        result: {},
        submittedAt: Date.now()
      }
    };

    expect(node.shouldWaitForReview(state)).toBe(true);
  });

  test('should not wait for review when disabled', () => {
    const state: any = {
      config: { enableHumanReview: false }
    };

    expect(node.shouldWaitForReview(state)).toBe(false);
  });

  test('should not wait when no pending review', () => {
    const state: any = {
      config: { enableHumanReview: true },
      pendingReview: null
    };

    expect(node.shouldWaitForReview(state)).toBe(false);
  });

  test('should not wait when review decision exists', () => {
    const state: any = {
      config: { enableHumanReview: true, reviewTimeoutMs: 300000 },
      pendingReview: {
        taskId: 'task-1',
        task: { id: 'task-1', title: 'Test' },
        result: {},
        submittedAt: Date.now()
      },
      reviewDecision: ReviewDecision.APPROVE
    };

    expect(node.shouldWaitForReview(state)).toBe(false);
  });

  test('should not wait when timeout exceeded', () => {
    const state: any = {
      config: { enableHumanReview: true, reviewTimeoutMs: 1000 },
      pendingReview: {
        taskId: 'task-1',
        task: { id: 'task-1', title: 'Test' },
        result: {},
        submittedAt: Date.now() - 2000 // 2 seconds ago
      }
    };

    expect(node.shouldWaitForReview(state)).toBe(false);
  });

  test('submitReview static method should return correct output', () => {
    const result = HumanReviewNode.submitReview(ReviewDecision.REJECT, 'Needs more work');

    expect(result.state?.reviewDecision).toBe(ReviewDecision.REJECT);
    expect(result.state?.pendingReview).toBeNull();
  });
});
