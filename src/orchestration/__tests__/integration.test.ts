import { HarnessGraph } from '../graph/HarnessGraph';
import { HarnessStateAnnotation } from '../graph/state';
import { Task } from '../../core/TaskQueue';
import { TaskStatus } from '../../types/orchestration';

describe('LangGraph Integration', () => {
  const createMockTask = (id: string): Task => ({
    id, title: `Task ${id}`, description: 'Test', requirements: [],
    priority: 'medium', status: 'pending', maxDuration: 60000, createdAt: new Date()
  });

  it('should execute full workflow without features', async () => {
    const graph = new HarnessGraph(
      { enableHumanReview: false, enableParallelExecution: false, enableABTesting: false },
      { llmConfig: {}, workingDir: '/tmp/test' }
    );
    const compiled = graph.compile();
    const result = await compiled.invoke({ tasks: [createMockTask('task-1')], currentTaskId: 'task-1' });
    expect(result).toBeDefined();
  });

  it('should generate valid mermaid diagram', () => {
    const graph = new HarnessGraph(
      { enableHumanReview: true, enableParallelExecution: true, enableABTesting: true },
      { llmConfig: {}, workingDir: '/tmp/test' }
    );
    const diagram = graph.getMermaidDiagram();
    expect(diagram).toContain('graph');
    expect(diagram).toContain('initialize');
  });

  it('should maintain state consistency', async () => {
    const graph = new HarnessGraph({ enableHumanReview: false }, { llmConfig: {}, workingDir: '/tmp/test' });
    const compiled = graph.compile();
    const result1 = await compiled.invoke({ tasks: [createMockTask('task-1')], currentTaskId: 'task-1', iterationCount: 0 });
    const result2 = await compiled.invoke({ ...result1, iterationCount: result1.iterationCount + 1 });
    expect(result2.iterationCount).toBeGreaterThan(result1.iterationCount);
  });
});
