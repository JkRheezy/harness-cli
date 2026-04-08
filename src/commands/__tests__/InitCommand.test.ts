// Mock inquirer and ora before importing InitCommand
jest.mock('inquirer', () => ({
  prompt: jest.fn().mockResolvedValue({}),
}));

jest.mock('ora', () => {
  return jest.fn().mockReturnValue({
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    warn: jest.fn().mockReturnThis(),
    info: jest.fn().mockReturnThis(),
  });
});

import { InitCommand } from '../InitCommand';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('InitCommand Smart Features', () => {
  let command: InitCommand;
  let tempDir: string;

  beforeEach(() => {
    command = new InitCommand();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  describe('loadLLMConfig', () => {
    it('应从环境变量读取 OpenAI 配置', async () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      
      const config = await (command as any).loadLLMConfig();
      
      expect(config).not.toBeNull();
      expect(config?.provider).toBe('openai');
      expect(config?.apiKey).toBe('test-openai-key');
      
      delete process.env.OPENAI_API_KEY;
    });

    it('应从环境变量读取 Kimi 配置', async () => {
      // Clear OPENAI_API_KEY first to ensure kimi is selected
      delete process.env.OPENAI_API_KEY;
      process.env.KIMI_API_KEY = 'test-kimi-key';
      
      const config = await (command as any).loadLLMConfig();
      
      expect(config).not.toBeNull();
      expect(config?.provider).toBe('kimi');
      
      delete process.env.KIMI_API_KEY;
    });

    it('没有配置时应返回 null', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.KIMI_API_KEY;
      
      const config = await (command as any).loadLLMConfig();
      
      expect(config).toBeNull();
    });
  });

  describe('generateSmartDocs', () => {
    it('应生成 AGENTS.md 和任务文件', async () => {
      const analysis = {
        projectName: 'test-project',
        overview: '测试项目概述',
        businessDescription: '详细业务描述',
        coreFeatures: ['功能1', '功能2'],
        techStack: {
          backend: 'Node.js',
          database: 'MongoDB',
          other: ['Redis']
        },
        directoryStructure: [],
        initialTasks: [
          {
            id: 'task-1',
            name: '初始化项目',
            description: '创建基础结构',
            priority: 'high' as const,
            acceptanceCriteria: ['标准1', '标准2']
          }
        ]
      };

      await (command as any).generateSmartDocs(tempDir, analysis);

      // 验证 AGENTS.md 生成
      const agentsPath = path.join(tempDir, 'AGENTS.md');
      expect(fs.existsSync(agentsPath)).toBe(true);
      
      const agentsContent = fs.readFileSync(agentsPath, 'utf-8');
      expect(agentsContent).toContain('test-project');
      expect(agentsContent).toContain('功能1');
      expect(agentsContent).toContain('Node.js');

      // 验证任务文件生成
      const tasksPath = path.join(tempDir, '.harness', 'tasks', '001-initial-tasks.yaml');
      expect(fs.existsSync(tasksPath)).toBe(true);
      
      const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
      expect(tasksContent).toContain('task-1');
      expect(tasksContent).toContain('初始化项目');
    });
  });
});
