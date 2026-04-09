import { GapAnalysisEngine } from '../GapAnalysisEngine';
import { SpecParser } from '../SpecParser';
import { CodeScanner } from '../CodeScanner';
import { GapDetector } from '../GapDetector';
import { TaskGenerator } from '../TaskGenerator';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises module to simulate filesystem
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  access: jest.fn(),
  stat: jest.fn(),
  readdir: jest.fn(),
}));

describe('GapAnalysis Integration', () => {
  let engine: GapAnalysisEngine;
  let specParser: SpecParser;
  let codeScanner: CodeScanner;
  let gapDetector: GapDetector;
  let taskGenerator: TaskGenerator;

  let mockReadFile: jest.MockedFunction<typeof fs.readFile>;
  let mockAccess: jest.MockedFunction<typeof fs.access>;
  let mockStat: jest.MockedFunction<typeof fs.stat>;
  let mockReaddir: jest.MockedFunction<typeof fs.readdir>;

  const projectPath = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();

    // Get mocked functions
    mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
    mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
    mockStat = fs.stat as jest.MockedFunction<typeof fs.stat>;
    mockReaddir = fs.readdir as jest.MockedFunction<typeof fs.readdir>;

    // Create real instances of all components for integration testing
    specParser = new SpecParser(projectPath);
    codeScanner = new CodeScanner(projectPath);
    gapDetector = new GapDetector();
    taskGenerator = new TaskGenerator();
    engine = new GapAnalysisEngine(specParser, codeScanner, gapDetector, taskGenerator);
  });

  describe('End-to-end flow: empty project with missing agents', () => {
    it('should generate tasks for missing agents and modules', async () => {
      // Setup: Project with AGENTS.md defining agents but no implementation
      const agentsMd = `
# Project Agents

## CoordinatorAgent

**Role:** Task coordination and distribution

**Responsibilities:**
- task-distribution
- result-aggregation
- workflow-management

**Skills:**
- llm-orchestration
- state-management

## WorkerAgent

**Role:** Task execution

**Responsibilities:**
- task-execution
- error-reporting

**Skills:**
- code-generation
- file-operations
`;

      const architectureMd = `
# System Architecture

## Modules

### UserService

**Layer:** service

**Description:** Handles user management operations

**Exposed Interfaces:**
- createUser(userData: UserData): Promise<User>
- getUser(id: string): Promise<User>

**Dependencies:**
- Database
- Logger

**Acceptance Criteria:**
- All CRUD operations work correctly
- Input validation is implemented
`;

      // Mock filesystem: spec files exist but no source code
      mockStat.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('AGENTS.md') || pathStr.includes('ARCHITECTURE.md')) {
          return Promise.resolve({ mtime: new Date('2024-01-01'), size: 1000 } as any);
        }
        return Promise.reject(new Error('File not found'));
      });

      mockReadFile.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('AGENTS.md')) return Promise.resolve(agentsMd);
        if (pathStr.includes('ARCHITECTURE.md')) return Promise.resolve(architectureMd);
        return Promise.reject(new Error('File not found'));
      });

      // Mock: src directory doesn't exist (empty project)
      mockAccess.mockRejectedValue(new Error('Directory not found'));
      mockReaddir.mockRejectedValue(new Error('Directory not found'));

      // Execute the full pipeline
      const tasks = await engine.analyze(projectPath);

      // Verify: Should generate tasks for missing agents and modules
      expect(tasks.length).toBeGreaterThan(0);

      // Should have tasks for both missing agents
      const agentTasks = tasks.filter(t => 
        t.title.includes('CoordinatorAgent') || t.title.includes('WorkerAgent')
      );
      expect(agentTasks.length).toBe(2);

      // Should have task for missing module
      const moduleTasks = tasks.filter(t => t.title.includes('UserService'));
      expect(moduleTasks.length).toBe(1);

      // Verify task structure
      const coordinatorTask = tasks.find(t => t.title.includes('CoordinatorAgent'));
      expect(coordinatorTask).toBeDefined();
      expect(coordinatorTask!.priority).toBe('P0'); // blocking severity
      expect(coordinatorTask!.estimatedEffort).toBe('medium');
      expect(coordinatorTask!.sourceGap.type).toBe('missing_agent');
      expect(coordinatorTask!.sourceGap.severity).toBe('blocking');
      expect(coordinatorTask!.requirements.length).toBeGreaterThan(0);
      expect(coordinatorTask!.suggestedApproach.length).toBeGreaterThan(0);
      expect(coordinatorTask!.acceptanceCriteria.length).toBeGreaterThan(0);

      // Verify task includes spec context
      expect(coordinatorTask!.description).toContain('CoordinatorAgent');
      expect(coordinatorTask!.requirements.some(r => r.includes('task-distribution'))).toBe(true);
      expect(coordinatorTask!.requirements.some(r => r.includes('llm-orchestration'))).toBe(true);
    });

    it('should generate tasks with correct priority based on severity', async () => {
      const agentsMd = `
## TestAgent

**Responsibilities:**
- test-task

**Skills:**
- testing
`;

      mockReadFile.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('AGENTS.md')) return Promise.resolve(agentsMd);
        return Promise.resolve('');
      });

      mockStat.mockResolvedValue({ mtime: new Date(), size: 100 } as any);
      mockAccess.mockRejectedValue(new Error('Directory not found'));
      mockReaddir.mockRejectedValue(new Error('Directory not found'));

      const tasks = await engine.analyze(projectPath);

      expect(tasks.length).toBeGreaterThan(0);
      
      // All gaps for missing agents should be blocking -> P0 priority
      tasks.forEach(task => {
        if (task.sourceGap.type === 'missing_agent' || task.sourceGap.type === 'missing_module') {
          expect(task.priority).toBe('P0');
          expect(task.sourceGap.severity).toBe('blocking');
        }
      });
    });
  });

  describe('End-to-end flow: complete project', () => {
    it('should have no gaps or only minor ones when spec matches implementation', async () => {
      // Setup: Spec and implementation match
      const agentsMd = `
## ImplementedAgent

**Responsibilities:**
- task-execution

**Skills:**
- coding
`;

      const agentCode = `
export class ImplementedAgent {
  async executeTask() {
    return 'done';
  }
}
`;

      mockStat.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('AGENTS.md') || pathStr.includes('ARCHITECTURE.md')) {
          return Promise.resolve({ mtime: new Date('2024-01-01'), size: 100 } as any);
        }
        if (pathStr.includes('ImplementedAgent.ts')) {
          return Promise.resolve({ mtime: new Date('2024-01-01'), size: 200 } as any);
        }
        return Promise.reject(new Error('File not found'));
      });

      mockReadFile.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('AGENTS.md')) return Promise.resolve(agentsMd);
        if (pathStr.includes('ARCHITECTURE.md')) return Promise.resolve('');
        if (pathStr.includes('ImplementedAgent.ts')) return Promise.resolve(agentCode);
        return Promise.reject(new Error('File not found'));
      });

      mockAccess.mockResolvedValue(undefined);

      mockReaddir.mockImplementation((dirPath) => {
        const pathStr = dirPath.toString();
        if (pathStr.includes('agents')) {
          return Promise.resolve([
            { name: 'ImplementedAgent.ts', isFile: () => true, isDirectory: () => false },
          ] as any);
        }
        return Promise.resolve([]);
      });

      const tasks = await engine.analyze(projectPath);

      // Should have no blocking gaps
      const blockingGaps = tasks.filter(t => t.sourceGap.severity === 'blocking');
      expect(blockingGaps).toHaveLength(0);

      // May have minor gaps (orphan code, etc.) but no missing agents/modules
      const missingAgentGaps = tasks.filter(t => t.sourceGap.type === 'missing_agent');
      const missingModuleGaps = tasks.filter(t => t.sourceGap.type === 'missing_module');
      expect(missingAgentGaps).toHaveLength(0);
      expect(missingModuleGaps).toHaveLength(0);
    });

    it('should detect incomplete modules when interfaces are missing', async () => {
      const architectureMd = `
### UserService

**Layer:** service

**Description:** User management service

**Exposed Interfaces:**
- createUser
- getUser
- updateUser
`;

      const moduleCode = `
export class UserService {
  async createUser() {}
  // Missing getUser and updateUser
}
`;

      mockStat.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('ARCHITECTURE.md')) {
          return Promise.resolve({ mtime: new Date(), size: 200 } as any);
        }
        if (pathStr.includes('UserService.ts')) {
          return Promise.resolve({ mtime: new Date(), size: 150 } as any);
        }
        return Promise.reject(new Error('File not found'));
      });

      mockReadFile.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('AGENTS.md')) return Promise.resolve('');
        if (pathStr.includes('ARCHITECTURE.md')) return Promise.resolve(architectureMd);
        if (pathStr.includes('UserService.ts')) return Promise.resolve(moduleCode);
        return Promise.reject(new Error('File not found'));
      });

      mockAccess.mockResolvedValue(undefined);

      mockReaddir.mockImplementation((dirPath) => {
        const pathStr = dirPath.toString();
        if (pathStr.includes('services')) {
          return Promise.resolve([
            { name: 'UserService.ts', isFile: () => true, isDirectory: () => false },
          ] as any);
        }
        return Promise.resolve([]);
      });

      const tasks = await engine.analyze(projectPath);

      // Should detect incomplete module (missing interfaces)
      const incompleteModuleTasks = tasks.filter(t => t.sourceGap.type === 'incomplete_module');
      expect(incompleteModuleTasks.length).toBeGreaterThan(0);

      // Severity should be major (not blocking)
      expect(incompleteModuleTasks[0].sourceGap.severity).toBe('major');
      expect(incompleteModuleTasks[0].priority).toBe('P1');
    });

    it('should detect orphan code when implementation exists without spec', async () => {
      const orphanCode = `
export class OrphanAgent {
  async doSomething() {}
}
`;

      // No AGENTS.md content (empty spec)
      mockReadFile.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('AGENTS.md')) return Promise.resolve('');
        if (pathStr.includes('ARCHITECTURE.md')) return Promise.resolve('');
        if (pathStr.includes('OrphanAgent.ts')) return Promise.resolve(orphanCode);
        return Promise.reject(new Error('File not found'));
      });

      mockStat.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('AGENTS.md') || pathStr.includes('ARCHITECTURE.md')) {
          return Promise.resolve({ mtime: new Date(), size: 10 } as any);
        }
        if (pathStr.includes('OrphanAgent.ts')) {
          return Promise.resolve({ mtime: new Date(), size: 100 } as any);
        }
        return Promise.reject(new Error('File not found'));
      });

      mockAccess.mockResolvedValue(undefined);

      mockReaddir.mockImplementation((dirPath) => {
        const pathStr = dirPath.toString();
        if (pathStr.includes('agents')) {
          return Promise.resolve([
            { name: 'OrphanAgent.ts', isFile: () => true, isDirectory: () => false },
          ] as any);
        }
        return Promise.resolve([]);
      });

      const tasks = await engine.analyze(projectPath);

      // Should detect orphan code
      const orphanTasks = tasks.filter(t => t.sourceGap.type === 'orphan_code');
      expect(orphanTasks.length).toBeGreaterThan(0);

      // Orphan code is minor severity
      expect(orphanTasks[0].sourceGap.severity).toBe('minor');
      expect(orphanTasks[0].priority).toBe('P2');
    });
  });

  describe('Edge cases', () => {
    it('should handle project with no spec documents', async () => {
      // No spec files exist
      mockStat.mockRejectedValue(new Error('File not found'));
      mockAccess.mockRejectedValue(new Error('File not found'));
      mockReaddir.mockRejectedValue(new Error('Directory not found'));

      const tasks = await engine.analyze(projectPath);

      // Should return empty tasks (no spec = no gaps)
      expect(tasks).toEqual([]);
    });

    it('should handle project with spec but no src directory', async () => {
      const agentsMd = `
## TestAgent

**Responsibilities:**
- testing
`;

      mockReadFile.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('AGENTS.md')) return Promise.resolve(agentsMd);
        return Promise.resolve('');
      });

      mockStat.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('AGENTS.md')) {
          return Promise.resolve({ mtime: new Date(), size: 100 } as any);
        }
        return Promise.reject(new Error('File not found'));
      });

      mockAccess.mockRejectedValue(new Error('Directory not found'));
      mockReaddir.mockRejectedValue(new Error('Directory not found'));

      const tasks = await engine.analyze(projectPath);

      // Should generate tasks for missing agents
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0].sourceGap.type).toBe('missing_agent');
    });

    it('should generate correct maxDuration based on effort', async () => {
      const agentsMd = `
## TestAgent

**Responsibilities:**
- test
`;

      mockReadFile.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('AGENTS.md')) return Promise.resolve(agentsMd);
        return Promise.resolve('');
      });

      mockStat.mockResolvedValue({ mtime: new Date(), size: 100 } as any);
      mockAccess.mockRejectedValue(new Error('Directory not found'));
      mockReaddir.mockRejectedValue(new Error('Directory not found'));

      const tasks = await engine.analyze(projectPath);

      // Verify maxDuration mapping
      tasks.forEach(task => {
        switch (task.estimatedEffort) {
          case 'small':
            expect(task.maxDuration).toBe(4 * 60 * 60 * 1000); // 4 hours in ms
            break;
          case 'medium':
            expect(task.maxDuration).toBe(8 * 60 * 60 * 1000); // 8 hours in ms
            break;
          case 'large':
            expect(task.maxDuration).toBe(16 * 60 * 60 * 1000); // 16 hours in ms
            break;
        }
      });
    });
  });
});
