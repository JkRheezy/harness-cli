import { SpecParser } from '../SpecParser';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises module
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  access: jest.fn(),
  stat: jest.fn(),
}));

describe('SpecParser', () => {
  let parser: SpecParser;
  let mockReadFile: jest.MockedFunction<typeof fs.readFile>;
  let mockAccess: jest.MockedFunction<typeof fs.access>;
  let mockStat: jest.MockedFunction<typeof fs.stat>;

  beforeEach(() => {
    jest.clearAllMocks();
    parser = new SpecParser('/test/project');
    mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
    mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
    mockStat = fs.stat as jest.MockedFunction<typeof fs.stat>;
  });

  describe('parse', () => {
    it('should parse AGENTS.md and extract agent definitions', async () => {
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
`;

      mockReadFile.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('AGENTS.md')) return Promise.resolve(agentsMd);
        if (pathStr.includes('ARCHITECTURE.md')) return Promise.resolve('# Architecture\n\nTBD');
        return Promise.reject(new Error('File not found'));
      });

      mockAccess.mockResolvedValue(undefined);
      mockStat.mockResolvedValue({ mtime: new Date('2024-01-01'), size: 100 } as any);

      const result = await parser.parse();

      expect(result.agents).toHaveLength(2);
      expect(result.agents[0].name).toBe('CoordinatorAgent');
      expect(result.agents[0].responsibilities).toContain('task-distribution');
      expect(result.agents[0].skills).toContain('llm-orchestration');
      expect(result.agents[1].name).toBe('WorkerAgent');
    });

    it('should parse ARCHITECTURE.md and extract modules', async () => {
      const architectureMd = `
# System Architecture

## Modules

### UserService

**Layer:** service

**Description:** Handles user management

**Exposed Interfaces:**
- createUser(userData: UserData): Promise<User>
- getUser(id: string): Promise<User>

**Dependencies:**
- Database
- Logger

**Acceptance Criteria:**
- All CRUD operations work
- Input validation implemented
`;

      mockReadFile.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('AGENTS.md')) return Promise.resolve('# Agents\n\nTBD');
        if (pathStr.includes('ARCHITECTURE.md')) return Promise.resolve(architectureMd);
        return Promise.reject(new Error('File not found'));
      });

      mockAccess.mockResolvedValue(undefined);
      mockStat.mockResolvedValue({ mtime: new Date('2024-01-01'), size: 100 } as any);

      const result = await parser.parse();

      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].name).toBe('UserService');
      expect(result.modules[0].layer).toBe('service');
      expect(result.modules[0].exposedInterfaces).toHaveLength(2);
      expect(result.modules[0].dependencies).toContain('Database');
    });

    it('should handle missing documentation gracefully', async () => {
      mockAccess.mockRejectedValue(new Error('File not found'));
      mockStat.mockRejectedValue(new Error('File not found'));

      const result = await parser.parse();

      expect(result.agents).toEqual([]);
      expect(result.modules).toEqual([]);
      expect(result.version).toBe('0.0.0');
    });

    it('should use cache when documents have not changed', async () => {
      mockReadFile.mockResolvedValue('# Agents\n\n## TestAgent');
      mockAccess.mockResolvedValue(undefined);
      mockStat.mockResolvedValue({ mtime: new Date('2024-01-01'), size: 100 } as any);

      // First parse - reads files
      const result1 = await parser.parse();

      // Second parse with same content - should use cache and return same result
      const result2 = await parser.parse();

      // Results should be identical (cached)
      expect(result1).toBe(result2);
      
      // Files read on each parse (2 per parse), but result is cached
      expect(mockReadFile).toHaveBeenCalledTimes(4); // 2 files x 2 parses
    });
  });

  describe('parseAgentsMd', () => {
    it('should extract agent from markdown format', async () => {
      const markdown = `
## TestAgent

Description here

**Responsibilities:**
- task-one
- task-two
`;

      const result = await (parser as any).parseAgentsMd(markdown);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('TestAgent');
      expect(result[0].responsibilities).toEqual(['task-one', 'task-two']);
    });
  });
});
