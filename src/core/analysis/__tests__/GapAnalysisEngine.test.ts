import { GapAnalysisEngine } from '../GapAnalysisEngine';
import { SpecParser } from '../SpecParser';
import { CodeScanner } from '../CodeScanner';
import { GapDetector } from '../GapDetector';
import { TaskGenerator } from '../TaskGenerator';
import { TargetArchitecture, CurrentImplementation, Gap, BusinessTask } from '../types';

// Mock all dependencies
jest.mock('../SpecParser');
jest.mock('../CodeScanner');
jest.mock('../GapDetector');
jest.mock('../TaskGenerator');

describe('GapAnalysisEngine', () => {
  let engine: GapAnalysisEngine;
  let mockSpecParser: jest.Mocked<SpecParser>;
  let mockCodeScanner: jest.Mocked<CodeScanner>;
  let mockGapDetector: jest.Mocked<GapDetector>;
  let mockTaskGenerator: jest.Mocked<TaskGenerator>;

  const mockTargetArchitecture: TargetArchitecture = {
    version: '1.0.0',
    parsedAt: new Date('2024-01-01'),
    agents: [
      {
        name: 'TestAgent',
        description: 'A test agent',
        responsibilities: ['task-execution'],
        skills: ['llm-orchestration'],
        expectedFiles: ['src/agents/TestAgent.ts'],
        dependencies: []
      }
    ],
    modules: [
      {
        name: 'TestModule',
        description: 'A test module',
        layer: 'service',
        exposedInterfaces: ['testInterface'],
        dependencies: [],
        expectedFiles: ['src/modules/TestModule.ts'],
        acceptanceCriteria: ['criteria-1']
      }
    ],
    interfaces: [],
    dataModels: [],
    workflows: []
  };

  const mockCurrentImplementation: CurrentImplementation = {
    scannedAt: new Date('2024-01-01'),
    agents: [],
    modules: [],
    files: [],
    exports: []
  };

  const mockGaps: Gap[] = [
    {
      id: 'gap-1',
      type: 'missing_agent',
      severity: 'blocking',
      specRef: { document: 'AGENTS.md', section: 'TestAgent' },
      targetName: 'TestAgent',
      targetDescription: 'Missing agent implementation',
      evidence: {
        expected: 'TestAgent should exist',
        actual: 'TestAgent not found'
      },
      relatedFiles: []
    }
  ];

  const mockTasks: BusinessTask[] = [
    {
      id: 'task-1',
      title: 'Implement TestAgent',
      description: 'Create the TestAgent implementation',
      sourceGap: mockGaps[0],
      requirements: ['Implement agent class'],
      suggestedApproach: ['Create file', 'Implement methods'],
      acceptanceCriteria: ['Agent works correctly'],
      priority: 'P0',
      estimatedEffort: 'medium',
      maxDuration: 3600,
      status: 'pending',
      createdAt: new Date('2024-01-01')
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instances
    mockSpecParser = {
      parse: jest.fn()
    } as unknown as jest.Mocked<SpecParser>;

    mockCodeScanner = {
      scan: jest.fn()
    } as unknown as jest.Mocked<CodeScanner>;

    mockGapDetector = {
      detect: jest.fn()
    } as unknown as jest.Mocked<GapDetector>;

    mockTaskGenerator = {
      generate: jest.fn()
    } as unknown as jest.Mocked<TaskGenerator>;

    engine = new GapAnalysisEngine(
      mockSpecParser,
      mockCodeScanner,
      mockGapDetector,
      mockTaskGenerator
    );
  });

  describe('constructor', () => {
    it('should initialize with all required dependencies', () => {
      expect(engine).toBeDefined();
    });
  });

  describe('analyze', () => {
    it('should orchestrate full analysis pipeline', async () => {
      // Setup mock return values
      mockSpecParser.parse.mockResolvedValue(mockTargetArchitecture);
      mockCodeScanner.scan.mockResolvedValue(mockCurrentImplementation);
      mockGapDetector.detect.mockReturnValue(mockGaps);
      mockTaskGenerator.generate.mockReturnValue(mockTasks);

      const projectPath = '/test/project';
      const result = await engine.analyze(projectPath);

      // Verify the pipeline was executed in correct order
      expect(mockSpecParser.parse).toHaveBeenCalledTimes(1);
      expect(mockCodeScanner.scan).toHaveBeenCalledTimes(1);
      expect(mockGapDetector.detect).toHaveBeenCalledWith(
        mockTargetArchitecture,
        mockCurrentImplementation
      );
      expect(mockTaskGenerator.generate).toHaveBeenCalledWith(
        mockGaps,
        mockTargetArchitecture
      );

      // Verify the result
      expect(result).toEqual(mockTasks);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Implement TestAgent');
    });

    it('should handle empty gaps gracefully', async () => {
      mockSpecParser.parse.mockResolvedValue(mockTargetArchitecture);
      mockCodeScanner.scan.mockResolvedValue(mockCurrentImplementation);
      mockGapDetector.detect.mockReturnValue([]);
      mockTaskGenerator.generate.mockReturnValue([]);

      const result = await engine.analyze('/test/project');

      expect(result).toEqual([]);
      expect(mockTaskGenerator.generate).toHaveBeenCalledWith(
        [],
        mockTargetArchitecture
      );
    });

    it('should propagate errors from specParser gracefully', async () => {
      const error = new Error('Failed to parse specification');
      mockSpecParser.parse.mockRejectedValue(error);

      await expect(engine.analyze('/test/project')).rejects.toThrow('Failed to parse specification');
    });

    it('should propagate errors from codeScanner gracefully', async () => {
      mockSpecParser.parse.mockResolvedValue(mockTargetArchitecture);
      const error = new Error('Failed to scan code');
      mockCodeScanner.scan.mockRejectedValue(error);

      await expect(engine.analyze('/test/project')).rejects.toThrow('Failed to scan code');
    });

    it('should propagate errors from gapDetector gracefully', async () => {
      mockSpecParser.parse.mockResolvedValue(mockTargetArchitecture);
      mockCodeScanner.scan.mockResolvedValue(mockCurrentImplementation);
      const error = new Error('Failed to detect gaps');
      mockGapDetector.detect.mockImplementation(() => {
        throw error;
      });

      await expect(engine.analyze('/test/project')).rejects.toThrow('Failed to detect gaps');
    });

    it('should propagate errors from taskGenerator gracefully', async () => {
      mockSpecParser.parse.mockResolvedValue(mockTargetArchitecture);
      mockCodeScanner.scan.mockResolvedValue(mockCurrentImplementation);
      mockGapDetector.detect.mockReturnValue(mockGaps);
      const error = new Error('Failed to generate tasks');
      mockTaskGenerator.generate.mockImplementation(() => {
        throw error;
      });

      await expect(engine.analyze('/test/project')).rejects.toThrow('Failed to generate tasks');
    });

    it('should handle multiple gaps and tasks', async () => {
      const multipleGaps: Gap[] = [
        {
          id: 'gap-1',
          type: 'missing_agent',
          severity: 'blocking',
          specRef: { document: 'AGENTS.md' },
          targetName: 'Agent1',
          targetDescription: 'Missing agent',
          evidence: { expected: 'Agent1', actual: 'Not found' },
          relatedFiles: []
        },
        {
          id: 'gap-2',
          type: 'missing_module',
          severity: 'major',
          specRef: { document: 'ARCHITECTURE.md' },
          targetName: 'Module1',
          targetDescription: 'Missing module',
          evidence: { expected: 'Module1', actual: 'Not found' },
          relatedFiles: []
        }
      ];

      const multipleTasks: BusinessTask[] = [
        {
          id: 'task-1',
          title: 'Implement Agent1',
          description: 'Create Agent1',
          sourceGap: multipleGaps[0],
          requirements: [],
          suggestedApproach: [],
          acceptanceCriteria: [],
          priority: 'P0',
          estimatedEffort: 'medium',
          maxDuration: 3600,
          status: 'pending',
          createdAt: new Date()
        },
        {
          id: 'task-2',
          title: 'Implement Module1',
          description: 'Create Module1',
          sourceGap: multipleGaps[1],
          requirements: [],
          suggestedApproach: [],
          acceptanceCriteria: [],
          priority: 'P1',
          estimatedEffort: 'large',
          maxDuration: 7200,
          status: 'pending',
          createdAt: new Date()
        }
      ];

      mockSpecParser.parse.mockResolvedValue(mockTargetArchitecture);
      mockCodeScanner.scan.mockResolvedValue(mockCurrentImplementation);
      mockGapDetector.detect.mockReturnValue(multipleGaps);
      mockTaskGenerator.generate.mockReturnValue(multipleTasks);

      const result = await engine.analyze('/test/project');

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Implement Agent1');
      expect(result[1].title).toBe('Implement Module1');
    });
  });
});
