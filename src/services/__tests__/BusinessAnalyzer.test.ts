import { BusinessAnalyzer } from '../BusinessAnalyzer';

describe('BusinessAnalyzer', () => {
  let analyzer: BusinessAnalyzer;
  const originalFetch = global.fetch;

  beforeEach(() => {
    analyzer = new BusinessAnalyzer({
      apiKey: 'test-key',
      provider: 'openai'
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('analyze', () => {
    it('应抛出错误当 API 返回错误时', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401
      } as Response);

      await expect(analyzer.analyze({
        projectName: 'test',
        overview: 'test project',
        template: 'node-ts'
      })).rejects.toThrow('OpenAI API 错误: 401');
    });

    it('应返回分析结果当 API 调用成功时', async () => {
      const mockLLMResponse = {
        businessDescription: '这是一个测试项目',
        coreFeatures: ['功能1', '功能2'],
        techStack: {
          backend: 'Node.js',
          database: 'MongoDB',
          other: ['Redis']
        },
        directoryStructure: [],
        initialTasks: []
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify(mockLLMResponse)
            }
          }]
        })
      } as Response);

      const result = await analyzer.analyze({
        projectName: 'test',
        overview: 'test project',
        template: 'node-ts'
      });

      expect(result.projectName).toBe('test');
      expect(result.businessDescription).toBe('这是一个测试项目');
      expect(result.coreFeatures).toHaveLength(2);
    });
  });

  describe('parseResponse', () => {
    it('应正确解析有效的 JSON 响应', () => {
      const validResponse = JSON.stringify({
        businessDescription: '这是一个测试项目',
        coreFeatures: ['功能1', '功能2'],
        techStack: {
          backend: 'Node.js',
          database: 'MongoDB',
          other: ['Redis']
        },
        directoryStructure: [],
        initialTasks: []
      });

      const result = (analyzer as any).parseResponse(validResponse);
      expect(result.businessDescription).toBe('这是一个测试项目');
      expect(result.coreFeatures).toHaveLength(2);
    });

    it('应移除 markdown 代码块标记', () => {
      const responseWithMarkdown = '```json\n{"businessDescription":"test","coreFeatures":["f1"],"techStack":{"backend":"Node","database":"MongoDB","other":[]},"directoryStructure":[],"initialTasks":[]}\n```';
      const result = (analyzer as any).parseResponse(responseWithMarkdown);
      expect(result.businessDescription).toBe('test');
    });

    it('应抛出错误当响应缺少必需字段时', () => {
      const invalidResponse = JSON.stringify({
        businessDescription: 'test'
        // missing coreFeatures and techStack
      });

      expect(() => {
        (analyzer as any).parseResponse(invalidResponse);
      }).toThrow('LLM 响应缺少必需字段');
    });
  });
});
