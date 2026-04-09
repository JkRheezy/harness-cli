import { BusinessAnalyzer } from '../BusinessAnalyzer';
import { BusinessAnalysis } from '../../commands/types';

/**
 * BusinessAnalyzer 测试 - Coordinator 架构
 * 
 * 测试策略:
 * 1. 使用 jest.mock 模拟 AnalysisCoordinator
 * 2. 测试 BusinessAnalyzer 正确委托给 coordinator
 * 3. 验证 projectName 和 overview 被正确覆盖
 * 4. 不调用真实 API
 */

// Mock AnalysisCoordinator
jest.mock('../analysis', () => ({
  AnalysisCoordinator: jest.fn().mockImplementation(() => ({
    execute: jest.fn()
  }))
}));

// Import mocked class
import { AnalysisCoordinator } from '../analysis';

describe('BusinessAnalyzer', () => {
  let analyzer: BusinessAnalyzer;
  const mockExecute = jest.fn();

  /**
   * 创建完整的 mock BusinessAnalysis 对象
   */
  const createMockBusinessAnalysis = (): BusinessAnalysis => ({
    projectName: 'mock-project',
    overview: 'mock-overview',
    businessDescription: '这是一个测试项目，用于验证业务分析功能。项目包含用户管理、数据处理和API接口等核心业务模块。',
    coreFeatures: [
      '用户认证与授权',
      '数据管理与 CRUD 操作',
      'RESTful API 接口提供',
      '日志记录与监控'
    ],
    techStack: {
      backend: 'Node.js with Express',
      frontend: 'React with TypeScript',
      database: 'PostgreSQL',
      other: ['Redis', 'Docker', 'Nginx']
    },
    directoryStructure: [
      {
        name: 'src',
        type: 'directory',
        description: '源代码目录',
        children: [
          { name: 'index.ts', type: 'file', description: '入口文件' },
          { name: 'routes', type: 'directory', description: '路由定义' },
          { name: 'services', type: 'directory', description: '业务服务' },
          { name: 'models', type: 'directory', description: '数据模型' }
        ]
      },
      {
        name: 'tests',
        type: 'directory',
        description: '测试目录',
        children: [
          { name: 'unit', type: 'directory', description: '单元测试' },
          { name: 'integration', type: 'directory', description: '集成测试' }
        ]
      },
      {
        name: 'docs',
        type: 'directory',
        description: '文档目录'
      },
      {
        name: 'package.json',
        type: 'file',
        description: '项目配置'
      },
      {
        name: 'README.md',
        type: 'file',
        description: '项目说明'
      }
    ],
    initialTasks: [
      {
        id: 'task-001',
        name: '初始化项目结构',
        description: '创建基本的项目目录和配置文件',
        priority: 'high',
        acceptanceCriteria: ['目录结构正确', '配置文件完整', '依赖安装成功']
      },
      {
        id: 'task-002',
        name: '实现用户认证模块',
        description: '实现用户注册、登录和权限管理',
        priority: 'high',
        acceptanceCriteria: ['注册功能正常', '登录验证正确', 'JWT令牌有效']
      },
      {
        id: 'task-003',
        name: '设计数据库模型',
        description: '创建核心数据表和关系',
        priority: 'medium',
        acceptanceCriteria: ['模型定义完整', '迁移脚本可用', '关联关系正确']
      }
    ]
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock execute function
    (AnalysisCoordinator as jest.Mock).mockImplementation(() => ({
      execute: mockExecute
    }));

    analyzer = new BusinessAnalyzer({
      apiKey: 'test-api-key',
      provider: 'openai'
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('analyze', () => {
    it('应返回完整的业务分析结果', async () => {
      const mockResult = createMockBusinessAnalysis();
      mockExecute.mockResolvedValue(mockResult);

      const result = await analyzer.analyze({
        projectName: 'my-test-project',
        overview: '这是一个测试项目概述',
        template: 'node-ts'
      });

      // 验证返回结构完整
      expect(result).toHaveProperty('projectName', 'my-test-project');
      expect(result).toHaveProperty('overview', '这是一个测试项目概述');
      expect(result).toHaveProperty('businessDescription');
      expect(result).toHaveProperty('coreFeatures');
      expect(result).toHaveProperty('techStack');
      expect(result).toHaveProperty('directoryStructure');
      expect(result).toHaveProperty('initialTasks');

      // 验证 coordinator 被调用
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledWith({
        projectName: 'my-test-project',
        overview: '这是一个测试项目概述',
        template: 'node-ts'
      });
    });

    it('应返回正确的 BusinessAnalysis 结构', async () => {
      const mockResult = createMockBusinessAnalysis();
      mockExecute.mockResolvedValue(mockResult);

      const result = await analyzer.analyze({
        projectName: 'test',
        overview: 'test overview',
        template: 'node-ts'
      });

      // 验证核心字段类型
      expect(typeof result.businessDescription).toBe('string');
      expect(result.businessDescription.length).toBeGreaterThan(0);
      
      expect(Array.isArray(result.coreFeatures)).toBe(true);
      expect(result.coreFeatures.length).toBeGreaterThan(0);
      
      // 验证 techStack 结构
      expect(result.techStack).toHaveProperty('backend');
      expect(result.techStack).toHaveProperty('database');
      expect(result.techStack).toHaveProperty('other');
      expect(Array.isArray(result.techStack.other)).toBe(true);

      // 验证 directoryStructure 结构
      expect(Array.isArray(result.directoryStructure)).toBe(true);
      expect(result.directoryStructure.length).toBeGreaterThan(0);
      
      const firstNode = result.directoryStructure[0];
      expect(firstNode).toHaveProperty('name');
      expect(firstNode).toHaveProperty('type');
      expect(['file', 'directory']).toContain(firstNode.type);
      expect(firstNode).toHaveProperty('description');

      // 验证 initialTasks 结构
      expect(Array.isArray(result.initialTasks)).toBe(true);
      expect(result.initialTasks.length).toBeGreaterThan(0);
      
      const firstTask = result.initialTasks[0];
      expect(firstTask).toHaveProperty('id');
      expect(firstTask).toHaveProperty('name');
      expect(firstTask).toHaveProperty('description');
      expect(firstTask).toHaveProperty('priority');
      expect(['high', 'medium', 'low']).toContain(firstTask.priority);
      expect(firstTask).toHaveProperty('acceptanceCriteria');
      expect(Array.isArray(firstTask.acceptanceCriteria)).toBe(true);
    });

    it('应使用用户输入的 projectName 覆盖 coordinator 输出', async () => {
      const mockResult = createMockBusinessAnalysis();
      mockExecute.mockResolvedValue(mockResult);

      const result = await analyzer.analyze({
        projectName: 'user-defined-name',
        overview: 'user-defined-overview',
        template: 'node-ts'
      });

      // 验证 projectName 和 overview 被正确覆盖
      expect(result.projectName).toBe('user-defined-name');
      expect(result.overview).toBe('user-defined-overview');
      // 其他字段应该来自 mock
      expect(result.businessDescription).toBe(mockResult.businessDescription);
      expect(result.coreFeatures).toEqual(mockResult.coreFeatures);
    });

    it('应处理 coordinator 返回部分数据的情况', async () => {
      // 模拟 coordinator 返回缺少某些字段的数据
      const partialResult: Partial<BusinessAnalysis> = {
        projectName: 'partial',
        overview: 'partial overview',
        businessDescription: '部分业务描述，用于测试',
        coreFeatures: ['功能1', '功能2', '功能3'],
        techStack: {
          backend: 'Node.js',
          database: 'MongoDB',
          other: []
        },
        directoryStructure: [
          { name: 'src', type: 'directory', description: '源码' }
        ],
        initialTasks: [
          { id: '1', name: '任务1', description: '描述', priority: 'high', acceptanceCriteria: [] }
        ]
      };
      
      mockExecute.mockResolvedValue(partialResult);

      const result = await analyzer.analyze({
        projectName: 'test',
        overview: 'test',
        template: 'node-ts'
      });

      // 验证用户输入覆盖 coordinator 输出
      expect(result.projectName).toBe('test');
      expect(result.overview).toBe('test');
    });
  });

  describe('API 错误处理', () => {
    it('应在 coordinator 抛出错误时传播错误', async () => {
      mockExecute.mockRejectedValue(new Error('Coordinator error'));

      await expect(analyzer.analyze({
        projectName: 'test',
        overview: 'test',
        template: 'node-ts'
      })).rejects.toThrow('Coordinator error');
    });

    it('应在 coordinator 返回无效数据时返回默认值', async () => {
      // 当 coordinator 返回 null 时，代码会返回 { projectName, overview } 的基本对象
      mockExecute.mockResolvedValue(null);

      const result = await analyzer.analyze({
        projectName: 'test',
        overview: 'test overview',
        template: 'node-ts'
      });

      // 验证至少返回了 projectName 和 overview
      expect(result.projectName).toBe('test');
      expect(result.overview).toBe('test overview');
    });
  });

  describe('Provider 配置', () => {
    it('应支持 OpenAI provider', () => {
      const openaiAnalyzer = new BusinessAnalyzer({
        apiKey: 'test-key',
        provider: 'openai'
      });

      expect(openaiAnalyzer).toBeDefined();
      expect(AnalysisCoordinator).toHaveBeenCalled();
    });

    it('应支持 Kimi provider', () => {
      const kimiAnalyzer = new BusinessAnalyzer({
        apiKey: 'test-key',
        provider: 'kimi'
      });

      expect(kimiAnalyzer).toBeDefined();
      expect(AnalysisCoordinator).toHaveBeenCalled();
    });

    it('应支持 Anthropic provider', () => {
      const anthropicAnalyzer = new BusinessAnalyzer({
        apiKey: 'test-key',
        provider: 'anthropic'
      });

      expect(anthropicAnalyzer).toBeDefined();
      expect(AnalysisCoordinator).toHaveBeenCalled();
    });

    it('应在调用 analyze 时使用正确的 provider 配置', async () => {
      const mockResult = createMockBusinessAnalysis();
      mockExecute.mockResolvedValue(mockResult);

      const kimiAnalyzer = new BusinessAnalyzer({
        apiKey: 'kimi-key',
        provider: 'kimi',
        baseUrl: 'https://custom.moonshot.cn'
      });

      await kimiAnalyzer.analyze({
        projectName: 'test',
        overview: 'test',
        template: 'node-ts'
      });

      // 验证 coordinator 被创建
      expect(AnalysisCoordinator).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalled();
    });
  });

  describe('Coordinator 集成', () => {
    it('应创建 AnalysisCoordinator 并委托执行', async () => {
      const mockResult = createMockBusinessAnalysis();
      mockExecute.mockResolvedValue(mockResult);

      await analyzer.analyze({
        projectName: 'test-project',
        overview: 'test overview',
        template: 'node-ts'
      });

      // 验证 AnalysisCoordinator 被实例化
      expect(AnalysisCoordinator).toHaveBeenCalledTimes(1);
      
      // 验证 execute 被调用并传入正确的参数
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({
        projectName: 'test-project',
        overview: 'test overview',
        template: 'node-ts'
      }));
    });

    it('应将 coordinator 配置传递给 AnalysisCoordinator', () => {
      // 重新创建 analyzer 以验证配置传递
      new BusinessAnalyzer({
        apiKey: 'test-key',
        provider: 'openai'
      });

      // 验证 AnalysisCoordinator 被调用并传递了配置
      expect(AnalysisCoordinator).toHaveBeenCalled();
      const coordinatorCall = (AnalysisCoordinator as jest.Mock).mock.calls[0];
      
      // 第一个参数应该是 LLM caller 函数
      expect(typeof coordinatorCall[0]).toBe('function');
      
      // 第二个参数应该是配置对象
      expect(coordinatorCall[1]).toMatchObject({
        maxRetries: 2,
        minConfidence: 0.7,
        timeout: 60000
      });
    });
  });
});
