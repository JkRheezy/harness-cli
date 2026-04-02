import { HarnessState, TaskStatus, ReviewDecision } from '../orchestration';

describe('orchestration types', () => {
  it('should create valid HarnessState', () => {
    const state: HarnessState = {
      tasks: [],
      currentTaskId: null,
      results: new Map(),
      pendingReview: null,
      reviewDecision: null,
      abTestVariant: null,
      abTestResults: new Map(),
      config: {
        enableHumanReview: false,
        enableParallelExecution: false,
        enableABTesting: false,
        maxParallelAgents: 1,
        reviewTimeoutMs: 300000
      },
      metadata: {
        startTime: Date.now(),
        iterationCount: 0,
        lastCheckpoint: Date.now()
      },
      errors: [],
      shouldStop: false
    };
    expect(state.tasks).toEqual([]);
    expect(state.currentTaskId).toBeNull();
  });

  it('should have correct TaskStatus values', () => {
    expect(TaskStatus.PENDING).toBe('pending');
    expect(TaskStatus.RUNNING).toBe('running');
    expect(TaskStatus.COMPLETED).toBe('completed');
    expect(TaskStatus.FAILED).toBe('failed');
    expect(TaskStatus.WAITING_REVIEW).toBe('waiting_review');
  });

  it('should have correct ReviewDecision values', () => {
    expect(ReviewDecision.APPROVE).toBe('approve');
    expect(ReviewDecision.REJECT).toBe('reject');
    expect(ReviewDecision.MODIFY).toBe('modify');
  });
});
