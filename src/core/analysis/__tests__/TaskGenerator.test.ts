import { TaskGenerator } from '../TaskGenerator';
import { Gap, TargetArchitecture, BusinessTask } from '../types';

describe('TaskGenerator', () => {
  let generator: TaskGenerator;

  const mockTarget: TargetArchitecture = {
    version: '1.0.0',
    parsedAt: new Date('2024-01-01'),
    agents: [
      {
        name: 'DataProcessor',
        description: 'Processes data streams',
        responsibilities: ['data-parsing', 'data-transformation'],
        skills: ['stream-processing'],
        expectedFiles: ['src/agents/DataProcessor.ts'],
        dependencies: []
      }
    ],
    modules: [
      {
        name: 'AnalyticsModule',
        description: 'Provides analytics capabilities',
        layer: 'service',
        exposedInterfaces: ['calculateMetrics()'],
        dependencies: ['Database'],
        expectedFiles: ['src/modules/AnalyticsModule.ts'],
        acceptanceCriteria: ['Metrics calculated correctly']
      }
    ],
    interfaces: [],
    dataModels: [],
    workflows: []
  };

  beforeEach(() => {
    generator = new TaskGenerator();
  });

  describe('generate', () => {
    it('should generate task for missing agent gap', () => {
      const gap: Gap = {
        id: 'gap-1',
        type: 'missing_agent',
        severity: 'major',
        specRef: { document: 'AGENTS.md', section: 'DataProcessor', line: 10 },
        targetName: 'DataProcessor',
        targetDescription: 'Processes data streams with transformation capabilities',
        evidence: {
          expected: 'src/agents/DataProcessor.ts',
          actual: 'File not found'
        },
        relatedFiles: []
      };

      const tasks = generator.generate([gap], mockTarget);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toContain('DataProcessor');
      expect(tasks[0].title).toContain('agent');
      expect(tasks[0].description).toContain('DataProcessor');
      expect(tasks[0].description).toContain('agent');
      expect(tasks[0].sourceGap).toBe(gap);
    });

    it('should generate task for missing module gap', () => {
      const gap: Gap = {
        id: 'gap-2',
        type: 'missing_module',
        severity: 'blocking',
        specRef: { document: 'ARCHITECTURE.md', section: 'AnalyticsModule', line: 20 },
        targetName: 'AnalyticsModule',
        targetDescription: 'Provides analytics capabilities for the system',
        evidence: {
          expected: 'src/modules/AnalyticsModule.ts',
          actual: 'File not found'
        },
        relatedFiles: []
      };

      const tasks = generator.generate([gap], mockTarget);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toContain('AnalyticsModule');
      expect(tasks[0].title).toContain('module');
      expect(tasks[0].description).toContain('AnalyticsModule');
      expect(tasks[0].description).toContain('module');
      expect(tasks[0].sourceGap).toBe(gap);
    });

    it('should map severity to priority correctly', () => {
      const blockingGap: Gap = {
        id: 'gap-blocking',
        type: 'missing_agent',
        severity: 'blocking',
        specRef: { document: 'AGENTS.md', section: 'Test', line: 1 },
        targetName: 'BlockingAgent',
        targetDescription: 'Test',
        evidence: { expected: 'test', actual: 'none' },
        relatedFiles: []
      };

      const majorGap: Gap = {
        id: 'gap-major',
        type: 'missing_agent',
        severity: 'major',
        specRef: { document: 'AGENTS.md', section: 'Test', line: 2 },
        targetName: 'MajorAgent',
        targetDescription: 'Test',
        evidence: { expected: 'test', actual: 'none' },
        relatedFiles: []
      };

      const minorGap: Gap = {
        id: 'gap-minor',
        type: 'missing_agent',
        severity: 'minor',
        specRef: { document: 'AGENTS.md', section: 'Test', line: 3 },
        targetName: 'MinorAgent',
        targetDescription: 'Test',
        evidence: { expected: 'test', actual: 'none' },
        relatedFiles: []
      };

      const [blockingTask] = generator.generate([blockingGap], mockTarget);
      const [majorTask] = generator.generate([majorGap], mockTarget);
      const [minorTask] = generator.generate([minorGap], mockTarget);

      expect(blockingTask.priority).toBe('P0');
      expect(majorTask.priority).toBe('P1');
      expect(minorTask.priority).toBe('P2');
    });

    it('should include source gap reference in task', () => {
      const gap: Gap = {
        id: 'gap-ref-test',
        type: 'missing_agent',
        severity: 'major',
        specRef: { document: 'AGENTS.md', section: 'ReferenceTest', line: 42 },
        targetName: 'ReferenceAgent',
        targetDescription: 'Test reference',
        evidence: { expected: 'file.ts', actual: 'not found' },
        relatedFiles: ['src/other.ts']
      };

      const [task] = generator.generate([gap], mockTarget);

      expect(task.sourceGap.id).toBe('gap-ref-test');
      expect(task.sourceGap.type).toBe('missing_agent');
      expect(task.sourceGap.severity).toBe('major');
    });

    it('should estimate effort based on gap type', () => {
      const missingAgentGap: Gap = {
        id: 'gap-agent',
        type: 'missing_agent',
        severity: 'major',
        specRef: { document: 'AGENTS.md', section: 'Test', line: 1 },
        targetName: 'TestAgent',
        targetDescription: 'Test',
        evidence: { expected: 'test', actual: 'none' },
        relatedFiles: []
      };

      const missingModuleGap: Gap = {
        id: 'gap-module',
        type: 'missing_module',
        severity: 'major',
        specRef: { document: 'ARCHITECTURE.md', section: 'Test', line: 1 },
        targetName: 'TestModule',
        targetDescription: 'Test',
        evidence: { expected: 'test', actual: 'none' },
        relatedFiles: []
      };

      const incompleteModuleGap: Gap = {
        id: 'gap-incomplete',
        type: 'incomplete_module',
        severity: 'minor',
        specRef: { document: 'ARCHITECTURE.md', section: 'Test', line: 1 },
        targetName: 'TestModule',
        targetDescription: 'Test',
        evidence: { expected: 'full', actual: 'partial', missingItems: ['method1'] },
        relatedFiles: ['src/TestModule.ts']
      };

      const [agentTask] = generator.generate([missingAgentGap], mockTarget);
      const [moduleTask] = generator.generate([missingModuleGap], mockTarget);
      const [incompleteTask] = generator.generate([incompleteModuleGap], mockTarget);

      expect(['small', 'medium', 'large']).toContain(agentTask.estimatedEffort);
      expect(['small', 'medium', 'large']).toContain(moduleTask.estimatedEffort);
      expect(['small', 'medium', 'large']).toContain(incompleteTask.estimatedEffort);
    });

    it('should generate requirements from spec context', () => {
      const gap: Gap = {
        id: 'gap-req',
        type: 'missing_agent',
        severity: 'major',
        specRef: { document: 'AGENTS.md', section: 'DataProcessor', line: 10 },
        targetName: 'DataProcessor',
        targetDescription: 'Agent for data processing',
        evidence: {
          expected: 'src/agents/DataProcessor.ts',
          actual: 'File not found'
        },
        relatedFiles: []
      };

      const [task] = generator.generate([gap], mockTarget);

      expect(task.requirements).toBeInstanceOf(Array);
      expect(task.requirements.length).toBeGreaterThan(0);
    });

    it('should set maxDuration based on effort estimate', () => {
      const gap: Gap = {
        id: 'gap-duration',
        type: 'missing_module',
        severity: 'major',
        specRef: { document: 'ARCHITECTURE.md', section: 'Test', line: 1 },
        targetName: 'TestModule',
        targetDescription: 'Test',
        evidence: { expected: 'test', actual: 'none' },
        relatedFiles: []
      };

      const [task] = generator.generate([gap], mockTarget);

      expect(typeof task.maxDuration).toBe('number');
      expect(task.maxDuration).toBeGreaterThan(0);
    });

    it('should generate tasks for multiple gaps', () => {
      const gaps: Gap[] = [
        {
          id: 'gap-1',
          type: 'missing_agent',
          severity: 'major',
          specRef: { document: 'AGENTS.md', section: 'Agent1', line: 1 },
          targetName: 'Agent1',
          targetDescription: 'First agent',
          evidence: { expected: 'file1.ts', actual: 'none' },
          relatedFiles: []
        },
        {
          id: 'gap-2',
          type: 'missing_module',
          severity: 'blocking',
          specRef: { document: 'ARCHITECTURE.md', section: 'Module1', line: 10 },
          targetName: 'Module1',
          targetDescription: 'First module',
          evidence: { expected: 'file2.ts', actual: 'none' },
          relatedFiles: []
        }
      ];

      const tasks = generator.generate(gaps, mockTarget);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].sourceGap.id).toBe('gap-1');
      expect(tasks[1].sourceGap.id).toBe('gap-2');
    });

    it('should generate acceptance criteria from spec', () => {
      const gap: Gap = {
        id: 'gap-acceptance',
        type: 'missing_module',
        severity: 'major',
        specRef: { document: 'ARCHITECTURE.md', section: 'AnalyticsModule', line: 20 },
        targetName: 'AnalyticsModule',
        targetDescription: 'Provides analytics capabilities',
        evidence: { expected: 'AnalyticsModule.ts', actual: 'not found' },
        relatedFiles: []
      };

      const [task] = generator.generate([gap], mockTarget);

      expect(task.acceptanceCriteria).toBeInstanceOf(Array);
    });

    it('should set initial status to pending', () => {
      const gap: Gap = {
        id: 'gap-status',
        type: 'missing_agent',
        severity: 'major',
        specRef: { document: 'AGENTS.md', section: 'Test', line: 1 },
        targetName: 'StatusAgent',
        targetDescription: 'Test',
        evidence: { expected: 'test', actual: 'none' },
        relatedFiles: []
      };

      const [task] = generator.generate([gap], mockTarget);

      expect(task.status).toBe('pending');
    });

    it('should set createdAt to current date', () => {
      const beforeTest = new Date();
      const gap: Gap = {
        id: 'gap-date',
        type: 'missing_agent',
        severity: 'major',
        specRef: { document: 'AGENTS.md', section: 'Test', line: 1 },
        targetName: 'DateAgent',
        targetDescription: 'Test',
        evidence: { expected: 'test', actual: 'none' },
        relatedFiles: []
      };

      const [task] = generator.generate([gap], mockTarget);
      const afterTest = new Date();

      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.createdAt.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(task.createdAt.getTime()).toBeLessThanOrEqual(afterTest.getTime());
    });
  });

  describe('edge cases', () => {
    it('should handle empty gaps array', () => {
      const tasks = generator.generate([], mockTarget);

      expect(tasks).toEqual([]);
    });

    it('should handle orphan_code gap type', () => {
      const gap: Gap = {
        id: 'gap-orphan',
        type: 'orphan_code',
        severity: 'minor',
        specRef: { document: 'CODE', section: 'orphan', line: 1 },
        targetName: 'OrphanCode',
        targetDescription: 'Unused code detected',
        evidence: { expected: 'used', actual: 'unused', existingItems: ['orphan.ts'] },
        relatedFiles: ['src/orphan.ts']
      };

      const [task] = generator.generate([gap], mockTarget);

      expect(task).toBeDefined();
      expect(task.sourceGap.type).toBe('orphan_code');
    });

    it('should handle missing_interface gap type', () => {
      const gap: Gap = {
        id: 'gap-interface',
        type: 'missing_interface',
        severity: 'major',
        specRef: { document: 'ARCHITECTURE.md', section: 'Interface', line: 30 },
        targetName: 'calculateMetrics',
        targetDescription: 'Missing interface method',
        evidence: { expected: 'method defined', actual: 'method missing' },
        relatedFiles: []
      };

      const [task] = generator.generate([gap], mockTarget);

      expect(task).toBeDefined();
      expect(task.sourceGap.type).toBe('missing_interface');
    });

    it('should generate unique task IDs', () => {
      const gaps: Gap[] = [
        {
          id: 'gap-1',
          type: 'missing_agent',
          severity: 'major',
          specRef: { document: 'AGENTS.md', section: 'Agent1', line: 1 },
          targetName: 'Agent1',
          targetDescription: 'Test',
          evidence: { expected: 'test', actual: 'none' },
          relatedFiles: []
        },
        {
          id: 'gap-2',
          type: 'missing_agent',
          severity: 'major',
          specRef: { document: 'AGENTS.md', section: 'Agent2', line: 2 },
          targetName: 'Agent2',
          targetDescription: 'Test',
          evidence: { expected: 'test', actual: 'none' },
          relatedFiles: []
        }
      ];

      const tasks = generator.generate(gaps, mockTarget);

      expect(tasks[0].id).not.toBe(tasks[1].id);
    });
  });
});
