import { Synthesizer } from '../Synthesizer';
import { WorkerOutput, SynthesisResult, LLMCaller } from '../types';

describe('Synthesizer', () => {
  let mockLlmCaller: jest.MockedFunction<LLMCaller>;
  let synthesizer: Synthesizer;

  beforeEach(() => {
    mockLlmCaller = jest.fn();
    synthesizer = new Synthesizer(mockLlmCaller, 'gpt-4');
  });

  describe('synthesize', () => {
    it('should synthesize worker outputs into unified result', async () => {
      const mockWorkerOutputs: WorkerOutput[] = [
        {
          worker: 'business',
          confidence: 0.85,
          findings: [
            {
              category: '业务需求',
              content: '这是一个电商平台项目',
              priority: 'high'
            }
          ],
          questions: ['需要支持哪些支付方式？']
        },
        {
          worker: 'tech',
          confidence: 0.9,
          findings: [
            {
              category: '技术架构',
              content: '推荐使用微服务架构',
              priority: 'high'
            }
          ],
          questions: []
        }
      ];

      const mockLLMResponse = `<synthesis_result>
  <summary>这是一个电商平台项目，采用微服务架构</summary>
  <business>
    <description>这是一个全功能的电商平台，支持商品管理、订单处理、支付集成等核心业务。</description>
    <core_features>
      <feature priority="high">
        <name>商品管理</name>
        <description>支持商品的增删改查，库存管理</description>
      </feature>
      <feature priority="medium">
        <name>订单处理</name>
        <description>订单创建、支付、发货全流程管理</description>
      </feature>
    </core_features>
  </business>
  <technical>
    <stack_recommendation>
      <backend>Node.js + Express</backend>
      <frontend>React + TypeScript</frontend>
      <database>PostgreSQL</database>
      <others>
        <item>Redis</item>
        <item>Docker</item>
      </others>
    </stack_recommendation>
    <architecture_notes>采用微服务架构，前后端分离</architecture_notes>
    <directory_structure>
src/
  api/
  services/
  models/
  utils/
    </directory_structure>
  </technical>
  <risks>
    <risk severity="high">
      <description>支付系统集成复杂</description>
      <mitigation>使用成熟的第三方支付SDK</mitigation>
    </risk>
    <risk severity="medium">
      <description>高并发性能挑战</description>
      <mitigation>引入缓存和消息队列</mitigation>
    </risk>
  </risks>
  <confidence>0.88</confidence>
  <open_questions>
需要确认目标用户群体
需要明确支持的国际市场
  </open_questions>
</synthesis_result>`;

      mockLlmCaller.mockResolvedValue(mockLLMResponse);

      const result = await synthesizer.synthesize(mockWorkerOutputs);

      // 验证 LLM 被调用
      expect(mockLlmCaller).toHaveBeenCalledTimes(1);
      expect(mockLlmCaller).toHaveBeenCalledWith(
        expect.stringContaining('<worker_outputs>'),
        'gpt-4'
      );

      // 验证输出结构
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('business');
      expect(result).toHaveProperty('technical');
      expect(result).toHaveProperty('risks');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('openQuestions');

      // 验证具体值
      expect(result.summary).toBe('这是一个电商平台项目，采用微服务架构');
      expect(result.confidence).toBe(0.88);
      expect(result.business.description).toContain('全功能的电商平台');
      expect(result.business.coreFeatures).toHaveLength(2);
      expect(result.business.coreFeatures[0]).toEqual({
        name: '商品管理',
        priority: 'high',
        description: '支持商品的增删改查，库存管理'
      });
    });

    it('should handle empty worker outputs', async () => {
      const mockLLMResponse = `<synthesis_result>
  <summary>暂无分析结果</summary>
  <business>
    <description>暂无业务描述</description>
    <core_features>
    </core_features>
  </business>
  <technical>
    <stack_recommendation>
      <others>
      </others>
    </stack_recommendation>
    <architecture_notes></architecture_notes>
    <directory_structure></directory_structure>
  </technical>
  <risks>
  </risks>
  <confidence>0.5</confidence>
  <open_questions>
  </open_questions>
</synthesis_result>`;

      mockLlmCaller.mockResolvedValue(mockLLMResponse);

      const result = await synthesizer.synthesize([]);

      expect(result.summary).toBe('暂无分析结果');
      expect(result.business.coreFeatures).toHaveLength(0);
      expect(result.risks).toHaveLength(0);
      expect(result.confidence).toBe(0.5);
    });

    it('should handle special XML characters in worker outputs', async () => {
      const mockWorkerOutputs: WorkerOutput[] = [
        {
          worker: 'business',
          confidence: 0.8,
          findings: [
            {
              category: '业务需求',
              content: '需要支持 <script> 标签过滤 & XSS 防护',
              priority: 'high'
            }
          ],
          questions: ['是否需要支持 "双引号" 和 \'单引号\' ?']
        }
      ];

      mockLlmCaller.mockResolvedValue(`<synthesis_result>
  <summary>安全关键项目</summary>
  <business>
    <description>需要XSS防护</description>
    <core_features>
    </core_features>
  </business>
  <technical>
    <stack_recommendation>
      <others>
      </others>
    </stack_recommendation>
    <architecture_notes></architecture_notes>
    <directory_structure></directory_structure>
  </technical>
  <risks>
    <risk severity="high">
      <description>XSS攻击风险</description>
      <mitigation>输入验证和输出编码</mitigation>
    </risk>
  </risks>
  <confidence>0.75</confidence>
  <open_questions>
  </open_questions>
</synthesis_result>`);

      await synthesizer.synthesize(mockWorkerOutputs);

      // 验证 prompt 中包含转义的 XML 字符
      const prompt = mockLlmCaller.mock.calls[0][0];
      expect(prompt).toContain('&lt;script&gt;');
      expect(prompt).toContain('&amp;');
    });

    it('should throw error when LLM call fails', async () => {
      mockLlmCaller.mockRejectedValue(new Error('Network error'));

      const mockWorkerOutputs: WorkerOutput[] = [
        {
          worker: 'business',
          confidence: 0.8,
          findings: [],
          questions: []
        }
      ];

      await expect(synthesizer.synthesize(mockWorkerOutputs)).rejects.toThrow('Network error');
    });

    it('should return default values when response parsing fails', async () => {
      mockLlmCaller.mockResolvedValue('invalid xml response');

      const mockWorkerOutputs: WorkerOutput[] = [
        {
          worker: 'business',
          confidence: 0.8,
          findings: [],
          questions: []
        }
      ];

      // When XML parsing fails, it should return default values instead of throwing
      const result = await synthesizer.synthesize(mockWorkerOutputs);
      expect(result.summary).toBe('');
      expect(result.confidence).toBe(0.5);
      expect(result.business.coreFeatures).toHaveLength(0);
      expect(result.risks).toHaveLength(0);
    });
  });

  describe('parseSynthesisResponse', () => {
    it('should parse complete synthesis result correctly', () => {
      const xmlResponse = `<synthesis_result>
  <summary>项目总结</summary>
  <business>
    <description>详细业务描述</description>
    <core_features>
      <feature priority="high">
        <name>核心功能</name>
        <description>重要功能说明</description>
      </feature>
    </core_features>
  </business>
  <technical>
    <stack_recommendation>
      <backend>Node.js</backend>
      <frontend>React</frontend>
      <database>MongoDB</database>
      <others>
        <item>Redis</item>
      </others>
    </stack_recommendation>
    <architecture_notes>微服务架构</architecture_notes>
    <directory_structure>
src/
  app.ts
    </directory_structure>
  </technical>
  <risks>
    <risk severity="high">
      <description>性能风险</description>
      <mitigation>优化方案</mitigation>
    </risk>
  </risks>
  <confidence>0.85</confidence>
  <open_questions>
问题1
问题2
  </open_questions>
</synthesis_result>`;

      mockLlmCaller.mockResolvedValue(xmlResponse);

      const result = (synthesizer as any).parseSynthesisResponse(xmlResponse);

      expect(result.summary).toBe('项目总结');
      expect(result.business.description).toBe('详细业务描述');
      expect(result.business.coreFeatures).toHaveLength(1);
      expect(result.business.coreFeatures[0]).toEqual({
        name: '核心功能',
        priority: 'high',
        description: '重要功能说明'
      });
      expect(result.technical.stackRecommendation.backend).toBe('Node.js');
      expect(result.technical.stackRecommendation.frontend).toBe('React');
      expect(result.technical.stackRecommendation.database).toBe('MongoDB');
      expect(result.technical.stackRecommendation.other).toEqual(['Redis']);
      expect(result.technical.architectureNotes).toBe('微服务架构');
      expect(result.technical.directoryStructure).toBe('src/\n  app.ts');
      expect(result.risks).toHaveLength(1);
      expect(result.risks[0]).toEqual({
        description: '性能风险',
        severity: 'high',
        mitigation: '优化方案'
      });
      expect(result.confidence).toBe(0.85);
      expect(result.openQuestions).toEqual(['问题1', '问题2']);
    });

    it('should handle missing optional fields gracefully', () => {
      const xmlResponse = `<synthesis_result>
  <summary>最小结果</summary>
  <business>
    <description></description>
    <core_features>
    </core_features>
  </business>
  <technical>
    <stack_recommendation>
      <others>
      </others>
    </stack_recommendation>
    <architecture_notes></architecture_notes>
    <directory_structure></directory_structure>
  </technical>
  <risks>
  </risks>
  <confidence>invalid</confidence>
  <open_questions>
  </open_questions>
</synthesis_result>`;

      const result = (synthesizer as any).parseSynthesisResponse(xmlResponse);

      expect(result.summary).toBe('最小结果');
      expect(result.business.description).toBe('');
      expect(result.business.coreFeatures).toHaveLength(0);
      expect(result.technical.stackRecommendation.backend).toBeUndefined();
      expect(result.confidence).toBe(0.5); // default value when invalid
      expect(result.openQuestions).toHaveLength(0);
    });

    it('should clamp confidence value to [0, 1]', () => {
      const xmlResponse1 = `<synthesis_result>
  <summary>高置信度</summary>
  <business>
    <description></description>
    <core_features></core_features>
  </business>
  <technical>
    <stack_recommendation><others></others></stack_recommendation>
    <architecture_notes></architecture_notes>
    <directory_structure></directory_structure>
  </technical>
  <risks></risks>
  <confidence>1.5</confidence>
  <open_questions></open_questions>
</synthesis_result>`;

      const result1 = (synthesizer as any).parseSynthesisResponse(xmlResponse1);
      expect(result1.confidence).toBe(1);

      const xmlResponse2 = `<synthesis_result>
  <summary>低置信度</summary>
  <business>
    <description></description>
    <core_features></core_features>
  </business>
  <technical>
    <stack_recommendation><others></others></stack_recommendation>
    <architecture_notes></architecture_notes>
    <directory_structure></directory_structure>
  </technical>
  <risks></risks>
  <confidence>-0.5</confidence>
  <open_questions></open_questions>
</synthesis_result>`;

      const result2 = (synthesizer as any).parseSynthesisResponse(xmlResponse2);
      expect(result2.confidence).toBe(0);
    });

    it('should extract multiple features with different priorities', () => {
      const xmlResponse = `<synthesis_result>
  <summary>多功能项目</summary>
  <business>
    <description></description>
    <core_features>
      <feature priority="high">
        <name>高优先级功能</name>
        <description>最重要的功能</description>
      </feature>
      <feature priority="medium">
        <name>中优先级功能</name>
        <description>次要功能</description>
      </feature>
      <feature priority="low">
        <name>低优先级功能</name>
        <description>可选功能</description>
      </feature>
    </core_features>
  </business>
  <technical>
    <stack_recommendation><others></others></stack_recommendation>
    <architecture_notes></architecture_notes>
    <directory_structure></directory_structure>
  </technical>
  <risks></risks>
  <confidence>0.7</confidence>
  <open_questions></open_questions>
</synthesis_result>`;

      const result = (synthesizer as any).parseSynthesisResponse(xmlResponse);

      expect(result.business.coreFeatures).toHaveLength(3);
      expect(result.business.coreFeatures[0].priority).toBe('high');
      expect(result.business.coreFeatures[1].priority).toBe('medium');
      expect(result.business.coreFeatures[2].priority).toBe('low');
    });

    it('should extract multiple risks with different severities', () => {
      const xmlResponse = `<synthesis_result>
  <summary>多风险项目</summary>
  <business>
    <description></description>
    <core_features></core_features>
  </business>
  <technical>
    <stack_recommendation><others></others></stack_recommendation>
    <architecture_notes></architecture_notes>
    <directory_structure></directory_structure>
  </technical>
  <risks>
    <risk severity="high">
      <description>高风险</description>
      <mitigation>缓解措施1</mitigation>
    </risk>
    <risk severity="medium">
      <description>中风险</description>
      <mitigation>缓解措施2</mitigation>
    </risk>
    <risk severity="low">
      <description>低风险</description>
      <mitigation>缓解措施3</mitigation>
    </risk>
  </risks>
  <confidence>0.6</confidence>
  <open_questions></open_questions>
</synthesis_result>`;

      const result = (synthesizer as any).parseSynthesisResponse(xmlResponse);

      expect(result.risks).toHaveLength(3);
      expect(result.risks[0].severity).toBe('high');
      expect(result.risks[1].severity).toBe('medium');
      expect(result.risks[2].severity).toBe('low');
    });

    it('should extract multiple other technologies', () => {
      const xmlResponse = `<synthesis_result>
  <summary>复杂技术栈</summary>
  <business>
    <description></description>
    <core_features></core_features>
  </business>
  <technical>
    <stack_recommendation>
      <backend>Node.js</backend>
      <others>
        <item>Redis</item>
        <item>Kafka</item>
        <item>Elasticsearch</item>
      </others>
    </stack_recommendation>
    <architecture_notes></architecture_notes>
    <directory_structure></directory_structure>
  </technical>
  <risks></risks>
  <confidence>0.75</confidence>
  <open_questions></open_questions>
</synthesis_result>`;

      const result = (synthesizer as any).parseSynthesisResponse(xmlResponse);

      expect(result.technical.stackRecommendation.other).toEqual([
        'Redis',
        'Kafka',
        'Elasticsearch'
      ]);
    });

    it('should handle feature with missing name or description', () => {
      const xmlResponse = `<synthesis_result>
  <summary>不完整功能</summary>
  <business>
    <description></description>
    <core_features>
      <feature priority="high">
        <name></name>
        <description></description>
      </feature>
    </core_features>
  </business>
  <technical>
    <stack_recommendation><others></others></stack_recommendation>
    <architecture_notes></architecture_notes>
    <directory_structure></directory_structure>
  </technical>
  <risks></risks>
  <confidence>0.5</confidence>
  <open_questions></open_questions>
</synthesis_result>`;

      const result = (synthesizer as any).parseSynthesisResponse(xmlResponse);

      expect(result.business.coreFeatures[0].name).toBe('未命名功能');
      expect(result.business.coreFeatures[0].description).toBe('');
    });
  });
});
