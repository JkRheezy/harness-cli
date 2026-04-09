import { CodeScanner } from '../CodeScanner';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises module
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  access: jest.fn(),
  stat: jest.fn(),
  readdir: jest.fn(),
}));

describe('CodeScanner', () => {
  let scanner: CodeScanner;
  let mockReadFile: jest.MockedFunction<typeof fs.readFile>;
  let mockAccess: jest.MockedFunction<typeof fs.access>;
  let mockStat: jest.MockedFunction<typeof fs.stat>;
  let mockReaddir: jest.MockedFunction<typeof fs.readdir>;

  beforeEach(() => {
    jest.clearAllMocks();
    scanner = new CodeScanner('/test/project');
    mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
    mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
    mockStat = fs.stat as jest.MockedFunction<typeof fs.stat>;
    mockReaddir = fs.readdir as jest.MockedFunction<typeof fs.readdir>;
  });

  describe('scan', () => {
    it('should return empty implementation for empty project', async () => {
      mockAccess.mockRejectedValue(new Error('Directory not found'));
      mockReaddir.mockRejectedValue(new Error('Directory not found'));

      const result = await scanner.scan();

      expect(result.agents).toEqual([]);
      expect(result.modules).toEqual([]);
      expect(result.files).toEqual([]);
      expect(result.exports).toEqual([]);
      expect(result.scannedAt).toBeInstanceOf(Date);
    });

    it('should detect agents from src/lib/ai/agents directory', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockImplementation((dirPath) => {
        const pathStr = dirPath.toString();
        if (pathStr.includes('agents')) {
          return Promise.resolve([
            { name: 'CoordinatorAgent.ts', isFile: () => true, isDirectory: () => false },
            { name: 'WorkerAgent.ts', isFile: () => true, isDirectory: () => false },
          ] as any);
        }
        return Promise.resolve([]);
      });

      mockStat.mockResolvedValue({ size: 1000 } as any);
      mockReadFile.mockResolvedValue(`
export class CoordinatorAgent {
  async execute() { return 'done'; }
}
export interface CoordinatorConfig {
  maxTasks: number;
}
      `);

      const result = await scanner.scan();

      expect(result.agents).toHaveLength(2);
      expect(result.agents[0].name).toBe('CoordinatorAgent');
      expect(result.agents[0].files.length).toBeGreaterThan(0);
      expect(result.agents[0].completeness).toBeGreaterThan(0);
    });

    it('should scan common module directories', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockImplementation((dirPath) => {
        const pathStr = dirPath.toString();
        if (pathStr.endsWith('src') || pathStr.endsWith('src\\')) {
          return Promise.resolve([
            { name: 'services', isFile: () => false, isDirectory: () => true },
            { name: 'components', isFile: () => false, isDirectory: () => true },
          ] as any);
        }
        if (pathStr.includes('services')) {
          return Promise.resolve([
            { name: 'UserService.ts', isFile: () => true, isDirectory: () => false },
          ] as any);
        }
        if (pathStr.includes('components')) {
          return Promise.resolve([
            { name: 'Button.tsx', isFile: () => true, isDirectory: () => false },
          ] as any);
        }
        return Promise.resolve([]);
      });

      mockStat.mockResolvedValue({ size: 500 } as any);
      mockReadFile.mockResolvedValue(`
export class UserService {
  async getUser() { return {}; }
}
export function validateUser() { return true; }
      `);

      const result = await scanner.scan();

      expect(result.modules.length).toBeGreaterThan(0);
      expect(result.exports.length).toBeGreaterThan(0);
    });

    it('should extract exports from TypeScript files', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'TestFile.ts', isFile: () => true, isDirectory: () => false },
      ] as any);
      mockStat.mockResolvedValue({ size: 500 } as any);
      
      mockReadFile.mockResolvedValue(`
export class MyClass {}
export interface MyInterface {}
export type MyType = string;
export const myConst = 42;
export function myFunction() {}
export default class DefaultClass {}
      `);

      const result = await scanner.scan();

      expect(result.exports).toContainEqual(expect.objectContaining({ name: 'MyClass', type: 'class' }));
      expect(result.exports).toContainEqual(expect.objectContaining({ name: 'MyInterface', type: 'interface' }));
      expect(result.exports).toContainEqual(expect.objectContaining({ name: 'MyType', type: 'type' }));
      expect(result.exports).toContainEqual(expect.objectContaining({ name: 'myConst', type: 'const' }));
      expect(result.exports).toContainEqual(expect.objectContaining({ name: 'myFunction', type: 'function' }));
    });

    it('should calculate completeness score based on code structure', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockImplementation((dirPath) => {
        const pathStr = dirPath.toString();
        if (pathStr.includes('agents')) {
          return Promise.resolve([
            { name: 'SimpleAgent.ts', isFile: () => true, isDirectory: () => false },
          ] as any);
        }
        return Promise.resolve([]);
      });

      mockStat.mockResolvedValue({ size: 100 } as any);
      mockReadFile.mockResolvedValue(`
export class SimpleAgent {
  // Minimal implementation
}
      `);

      const result = await scanner.scan();

      expect(result.agents[0].completeness).toBeGreaterThanOrEqual(0);
      expect(result.agents[0].completeness).toBeLessThanOrEqual(100);
    });
  });

  describe('scanAgents', () => {
    it('should return empty array when agents directory does not exist', async () => {
      mockAccess.mockRejectedValue(new Error('Directory not found'));
      mockReaddir.mockRejectedValue(new Error('Directory not found'));

      const result = await scanner.scanAgents();

      expect(result).toEqual([]);
    });

    it('should detect agent responsibilities from method names', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'TaskAgent.ts', isFile: () => true, isDirectory: () => false },
      ] as any);
      mockStat.mockResolvedValue({ size: 1000 } as any);
      mockReadFile.mockResolvedValue(`
export class TaskAgent {
  async distributeTask() {}
  async aggregateResults() {}
  async manageWorkflow() {}
}
      `);

      const result = await scanner.scanAgents();

      expect(result[0].detectedResponsibilities.length).toBeGreaterThan(0);
    });
  });

  describe('extractExports', () => {
    it('should extract class exports', async () => {
      const content = 'export class TestClass {}';
      const result = await (scanner as any).extractExports(content);
      
      expect(result).toContainEqual({ name: 'TestClass', type: 'class' });
    });

    it('should extract function exports', async () => {
      const content = 'export function testFunction() {}';
      const result = await (scanner as any).extractExports(content);
      
      expect(result).toContainEqual({ name: 'testFunction', type: 'function' });
    });

    it('should extract interface exports', async () => {
      const content = 'export interface TestInterface {}';
      const result = await (scanner as any).extractExports(content);
      
      expect(result).toContainEqual({ name: 'TestInterface', type: 'interface' });
    });

    it('should extract type exports', async () => {
      const content = "export type TestType = string;";
      const result = await (scanner as any).extractExports(content);
      
      expect(result).toContainEqual({ name: 'TestType', type: 'type' });
    });

    it('should extract const exports', async () => {
      const content = 'export const TEST_CONST = 42;';
      const result = await (scanner as any).extractExports(content);
      
      expect(result).toContainEqual({ name: 'TEST_CONST', type: 'const' });
    });

    it('should handle multiple exports', async () => {
      const content = `
export class ClassA {}
export class ClassB {}
export function funcA() {}
      `;
      const result = await (scanner as any).extractExports(content);
      
      expect(result).toHaveLength(3);
    });

    it('should handle empty content', async () => {
      const result = await (scanner as any).extractExports('');
      
      expect(result).toEqual([]);
    });
  });

  describe('calculateCompleteness', () => {
    it('should return 0 for empty content', () => {
      const result = (scanner as any).calculateCompleteness('');
      
      expect(result).toBe(0);
    });

    it('should return higher score for files with methods', () => {
      const withMethods = `
export class Agent {
  async method1() {}
  async method2() {}
  async method3() {}
}
      `;
      const withoutMethods = 'export class Agent {}';
      
      const scoreWith = (scanner as any).calculateCompleteness(withMethods);
      const scoreWithout = (scanner as any).calculateCompleteness(withoutMethods);
      
      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });

    it('should return score between 0 and 100', () => {
      const content = 'export class Test {}';
      const result = (scanner as any).calculateCompleteness(content);
      
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });
});
