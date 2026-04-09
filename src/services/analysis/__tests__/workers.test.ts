import { BaseWorker } from '../workers/BaseWorker';
import { BusinessWorker } from '../workers/BusinessWorker';
import { TechWorker } from '../workers/TechWorker';
import { DomainWorker } from '../workers/DomainWorker';
import { RiskWorker } from '../workers/RiskWorker';
import { WorkerOutput, WorkerType } from '../types';
import { SmartInitOptions } from '../../../commands/types';

// Mock implementation for testing BaseWorker
class TestWorker extends BaseWorker {
  protected readonly workerType: WorkerType = 'business';
  protected readonly roleDescription = 'Test worker';
  protected readonly researchScope = 'test_scope';

  protected getTaskDescription(): string {
    return 'Test task description';
  }

  // Expose protected methods for testing
  public testParseResponse(response: string): WorkerOutput {
    return this.parseResponse(response);
  }

  public testExtractXmlTag(xml: string, tag: string): string {
    return this.extractXmlTag(xml, tag);
  }

  public testExtractFindings(xml: string) {
    return this.extractFindings(xml);
  }

  public testExtractQuestions(xml: string) {
    return this.extractQuestions(xml);
  }

  public testBuildPrompt(options: SmartInitOptions): string {
    return this.buildPrompt(options);
  }
}

describe('BaseWorker', () => {
  const mockLlmCaller = jest.fn();
  const worker = new TestWorker(mockLlmCaller, 'gpt-4');

  beforeEach(() => {
    mockLlmCaller.mockClear();
  });

  describe('XML parsing', () => {
    it('should parse valid worker output XML', () => {
      const xml = `<worker_output>
  <worker_id>business</worker_id>
  <confidence>0.85</confidence>
  <findings>
    <finding priority="high">
      <category>user_analysis</category>
      <content>Target users are developers</content>
    </finding>
    <finding priority="medium">
      <category>business_model</category>
      <content>SaaS subscription model</content>
    </finding>
  </findings>
  <questions>
    <question>What is the expected user volume?</question>
  </questions>
  <raw_notes>Some analysis notes</raw_notes>
</worker_output>`;

      const result = worker.testParseResponse(xml);

      expect(result.worker).toBe('business');
      expect(result.confidence).toBe(0.85);
      expect(result.findings).toHaveLength(2);
      expect(result.findings[0]).toEqual({
        category: 'user_analysis',
        content: 'Target users are developers',
        priority: 'high'
      });
      expect(result.findings[1]).toEqual({
        category: 'business_model',
        content: 'SaaS subscription model',
        priority: 'medium'
      });
      expect(result.questions).toEqual(['What is the expected user volume?']);
      expect(result.rawNotes).toBe('Some analysis notes');
    });

    it('should handle missing confidence with default value', () => {
      const xml = `<worker_output>
  <worker_id>tech</worker_id>
  <findings>
    <finding priority="low">
      <category>general</category>
      <content>Some finding</content>
    </finding>
  </findings>
  <questions></questions>
</worker_output>`;

      const result = worker.testParseResponse(xml);

      expect(result.confidence).toBe(0.5);
    });

    it('should handle invalid confidence value', () => {
      const xml = `<worker_output>
  <worker_id>business</worker_id>
  <confidence>invalid</confidence>
  <findings></findings>
  <questions></questions>
</worker_output>`;

      const result = worker.testParseResponse(xml);

      expect(result.confidence).toBe(0.5);
    });

    it('should clamp confidence to valid range', () => {
      const xmlHigh = `<worker_output>
  <worker_id>business</worker_id>
  <confidence>1.5</confidence>
  <findings></findings>
  <questions></questions>
</worker_output>`;

      const xmlLow = `<worker_output>
  <worker_id>business</worker_id>
  <confidence>-0.5</confidence>
  <findings></findings>
  <questions></questions>
</worker_output>`;

      expect(worker.testParseResponse(xmlHigh).confidence).toBe(1);
      expect(worker.testParseResponse(xmlLow).confidence).toBe(0);
    });

    it('should handle empty findings', () => {
      const xml = `<worker_output>
  <worker_id>domain</worker_id>
  <confidence>0.7</confidence>
  <findings></findings>
  <questions></questions>
</worker_output>`;

      const result = worker.testParseResponse(xml);

      expect(result.findings).toEqual([]);
    });

    it('should handle multiple questions', () => {
      const xml = `<worker_output>
  <worker_id>risk</worker_id>
  <confidence>0.6</confidence>
  <findings></findings>
  <questions>
    <question>Question 1?</question>
    <question>Question 2?</question>
    <question>Question 3?</question>
  </questions>
</worker_output>`;

      const result = worker.testParseResponse(xml);

      expect(result.questions).toEqual(['Question 1?', 'Question 2?', 'Question 3?']);
    });

    it('should handle invalid XML gracefully with fallback', () => {
      const invalidXml = 'This is not valid XML at all';

      const result = worker.testParseResponse(invalidXml);

      expect(result.worker).toBe('business'); // falls back to worker's type
      expect(result.confidence).toBe(0.5);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].category).toBe('parse_error');
      expect(result.findings[0].priority).toBe('medium');
      expect(result.questions).toEqual(['Response format was invalid, need to retry']);
      expect(result.rawNotes).toBe(invalidXml.slice(0, 500));
    });

    it('should handle malformed XML gracefully with fallback', () => {
      const malformedXml = `<worker_output>
  <worker_id>tech
  <confidence>0.8</confidence>
</worker_output>`;

      const result = worker.testParseResponse(malformedXml);

      // Malformed XML without findings should return fallback result
      expect(result.worker).toBe('business');
      expect(result.confidence).toBe(0.5);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].category).toBe('parse_error');
      expect(result.questions).toEqual(['Response format was invalid, need to retry']);
    });
  });

  describe('extractXmlTag', () => {
    it('should extract tag content correctly', () => {
      const xml = '<root><name>Test Value</name></root>';
      expect(worker.testExtractXmlTag(xml, 'name')).toBe('Test Value');
    });

    it('should be case insensitive', () => {
      const xml = '<ROOT><NAME>Test</NAME></ROOT>';
      expect(worker.testExtractXmlTag(xml, 'name')).toBe('Test');
    });

    it('should handle multiline content', () => {
      const xml = `<root>
  <description>
    Line 1
    Line 2
    Line 3
  </description>
</root>`;
      const result = worker.testExtractXmlTag(xml, 'description');
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
      expect(result).toContain('Line 3');
    });

    it('should return empty string for missing tag', () => {
      const xml = '<root><other>value</other></root>';
      expect(worker.testExtractXmlTag(xml, 'missing')).toBe('');
    });

    it('should handle empty tag content', () => {
      const xml = '<root><empty></empty></root>';
      expect(worker.testExtractXmlTag(xml, 'empty')).toBe('');
    });

    it('should extract first occurrence only', () => {
      const xml = '<root><item>First</item><item>Second</item></root>';
      expect(worker.testExtractXmlTag(xml, 'item')).toBe('First');
    });
  });

  describe('extractFindings', () => {
    it('should extract findings with all priorities', () => {
      const xml = `<findings>
        <finding priority="high"><category>A</category><content>High priority</content></finding>
        <finding priority="medium"><category>B</category><content>Medium priority</content></finding>
        <finding priority="low"><category>C</category><content>Low priority</content></finding>
      </findings>`;

      const findings = worker.testExtractFindings(xml);

      expect(findings).toHaveLength(3);
      expect(findings[0].priority).toBe('high');
      expect(findings[1].priority).toBe('medium');
      expect(findings[2].priority).toBe('low');
    });

    it('should use default category when missing', () => {
      const xml = `<findings>
        <finding priority="high"><content>Just content</content></finding>
      </findings>`;

      const findings = worker.testExtractFindings(xml);

      expect(findings[0].category).toBe('general');
    });

    it('should use trimmed content when category tags missing', () => {
      const xml = `<findings>
        <finding priority="medium">Raw content without tags</finding>
      </findings>`;

      const findings = worker.testExtractFindings(xml);

      expect(findings[0].content).toBe('Raw content without tags');
      expect(findings[0].category).toBe('general');
    });

    it('should return empty array for no findings', () => {
      const xml = '<findings></findings>';
      expect(worker.testExtractFindings(xml)).toEqual([]);
    });
  });

  describe('extractQuestions', () => {
    it('should extract questions correctly', () => {
      const xml = `<questions>
        <question>Question one?</question>
        <question>Question two?</question>
      </questions>`;

      const questions = worker.testExtractQuestions(xml);

      expect(questions).toEqual(['Question one?', 'Question two?']);
    });

    it('should skip empty questions', () => {
      const xml = `<questions>
        <question>Valid question</question>
        <question>   </question>
        <question>Another valid</question>
      </questions>`;

      const questions = worker.testExtractQuestions(xml);

      expect(questions).toEqual(['Valid question', 'Another valid']);
    });

    it('should return empty array for empty questions section', () => {
      const xml = '<questions></questions>';
      expect(worker.testExtractQuestions(xml)).toEqual([]);
    });

    it('should return empty array when questions section missing', () => {
      const xml = '<worker_output></worker_output>';
      expect(worker.testExtractQuestions(xml)).toEqual([]);
    });
  });

  describe('execute', () => {
    it('should call LLM and parse response', async () => {
      const mockResponse = `<worker_output>
  <worker_id>business</worker_id>
  <confidence>0.9</confidence>
  <findings>
    <finding priority="high">
      <category>test</category>
      <content>Test finding</content>
    </finding>
  </findings>
  <questions></questions>
</worker_output>`;

      mockLlmCaller.mockResolvedValue(mockResponse);

      const options: SmartInitOptions = {
        projectName: 'Test Project',
        overview: 'Test overview',
        template: 'node'
      };

      const result = await worker.execute(options);

      expect(mockLlmCaller).toHaveBeenCalledTimes(1);
      expect(mockLlmCaller).toHaveBeenCalledWith(expect.any(String), 'gpt-4');
      expect(result.worker).toBe('business');
      expect(result.confidence).toBe(0.9);
      expect(result.findings).toHaveLength(1);
    });

    it('should handle LLM call failure', async () => {
      mockLlmCaller.mockRejectedValue(new Error('LLM API Error'));

      const options: SmartInitOptions = {
        projectName: 'Test Project',
        overview: 'Test overview',
        template: 'node'
      };

      await expect(worker.execute(options)).rejects.toThrow('LLM API Error');
    });
  });

  describe('buildPrompt', () => {
    it('should include all required sections', () => {
      const options: SmartInitOptions = {
        projectName: 'My Project',
        overview: 'Project overview text',
        template: 'python'
      };

      const prompt = worker.testBuildPrompt(options);

      expect(prompt).toContain('Test worker');
      expect(prompt).toContain('My Project');
      expect(prompt).toContain('python');
      expect(prompt).toContain('Project overview text');
      expect(prompt).toContain('<analysis_context>');
      expect(prompt).toContain('<worker_output>');
      expect(prompt).toContain('Test task description');
    });

    it('should escape XML special characters', () => {
      const options: SmartInitOptions = {
        projectName: 'Project <Test>',
        overview: 'Overview with "quotes" & special chars',
        template: 'node'
      };

      const prompt = worker.testBuildPrompt(options);

      expect(prompt).toContain('&lt;Test&gt;');
      expect(prompt).toContain('&quot;quotes&quot;');
      expect(prompt).toContain('&amp;');
    });
  });
});

describe('BusinessWorker', () => {
  const mockLlmCaller = jest.fn();

  beforeEach(() => {
    mockLlmCaller.mockClear();
  });

  it('should create BusinessWorker with correct type', () => {
    const worker = new BusinessWorker(mockLlmCaller, 'gpt-4');
    expect(worker).toBeDefined();
  });

  it('should build prompt with business focus', () => {
    const worker = new BusinessWorker(mockLlmCaller, 'gpt-4') as unknown as TestWorker;
    const options: SmartInitOptions = {
      projectName: 'Biz App',
      overview: 'Business application',
      template: 'node'
    };

    // Access protected method via type assertion
    const prompt = (worker as any).buildPrompt(options);

    expect(prompt).toContain('业务分析师');
    expect(prompt).toContain('目标用户分析');
    expect(prompt).toContain('business_model_user_analysis');
  });

  it('should execute and return business output', async () => {
    const worker = new BusinessWorker(mockLlmCaller, 'gpt-4');
    const mockResponse = `<worker_output>
  <worker_id>business</worker_id>
  <confidence>0.88</confidence>
  <findings>
    <finding priority="high">
      <category>target_users</category>
      <content>Enterprise customers</content>
    </finding>
  </findings>
  <questions>
    <question>Budget range?</question>
  </questions>
</worker_output>`;

    mockLlmCaller.mockResolvedValue(mockResponse);

    const result = await worker.execute({
      projectName: 'Test',
      overview: 'Test',
      template: 'node'
    });

    expect(result.worker).toBe('business');
    expect(result.confidence).toBe(0.88);
  });
});

describe('TechWorker', () => {
  const mockLlmCaller = jest.fn();

  beforeEach(() => {
    mockLlmCaller.mockClear();
  });

  it('should create TechWorker with correct type', () => {
    const worker = new TechWorker(mockLlmCaller, 'gpt-4');
    expect(worker).toBeDefined();
  });

  it('should build prompt with tech focus', () => {
    const worker = new TechWorker(mockLlmCaller, 'gpt-4');
    const options: SmartInitOptions = {
      projectName: 'Tech App',
      overview: 'Technical application',
      template: 'python'
    };

    const prompt = (worker as any).buildPrompt(options);

    expect(prompt).toContain('技术架构师');
    expect(prompt).toContain('技术栈分析');
    expect(prompt).toContain('tech_stack_architecture');
  });

  it('should execute and return tech output', async () => {
    const worker = new TechWorker(mockLlmCaller, 'gpt-4');
    const mockResponse = `<worker_output>
  <worker_id>tech</worker_id>
  <confidence>0.92</confidence>
  <findings>
    <finding priority="high">
      <category>backend</category>
      <content>Recommend FastAPI</content>
    </finding>
  </findings>
  <questions></questions>
</worker_output>`;

    mockLlmCaller.mockResolvedValue(mockResponse);

    const result = await worker.execute({
      projectName: 'Test',
      overview: 'Test',
      template: 'python'
    });

    expect(result.worker).toBe('tech');
    expect(result.confidence).toBe(0.92);
    expect(result.findings[0].category).toBe('backend');
  });
});

describe('DomainWorker', () => {
  const mockLlmCaller = jest.fn();

  beforeEach(() => {
    mockLlmCaller.mockClear();
  });

  it('should create DomainWorker with correct type', () => {
    const worker = new DomainWorker(mockLlmCaller, 'gpt-4');
    expect(worker).toBeDefined();
  });

  it('should build prompt with domain focus', () => {
    const worker = new DomainWorker(mockLlmCaller, 'gpt-4');
    const options: SmartInitOptions = {
      projectName: 'Domain App',
      overview: 'Domain specific application',
      template: 'node'
    };

    const prompt = (worker as any).buildPrompt(options);

    expect(prompt).toContain('行业专家');
    expect(prompt).toContain('领域分析');
    expect(prompt).toContain('domain_knowledge_industry_practices');
  });

  it('should execute and return domain output', async () => {
    const worker = new DomainWorker(mockLlmCaller, 'gpt-4');
    const mockResponse = `<worker_output>
  <worker_id>domain</worker_id>
  <confidence>0.75</confidence>
  <findings>
    <finding priority="medium">
      <category>industry_standards</category>
      <content>Follow ISO 27001</content>
    </finding>
  </findings>
  <questions></questions>
</worker_output>`;

    mockLlmCaller.mockResolvedValue(mockResponse);

    const result = await worker.execute({
      projectName: 'Test',
      overview: 'Test',
      template: 'node'
    });

    expect(result.worker).toBe('domain');
    expect(result.confidence).toBe(0.75);
  });
});

describe('RiskWorker', () => {
  const mockLlmCaller = jest.fn();

  beforeEach(() => {
    mockLlmCaller.mockClear();
  });

  it('should create RiskWorker with correct type', () => {
    const worker = new RiskWorker(mockLlmCaller, 'gpt-4');
    expect(worker).toBeDefined();
  });

  it('should build prompt with risk focus', () => {
    const worker = new RiskWorker(mockLlmCaller, 'gpt-4');
    const options: SmartInitOptions = {
      projectName: 'Risk App',
      overview: 'Risk assessment needed',
      template: 'java'
    };

    const prompt = (worker as any).buildPrompt(options);

    expect(prompt).toContain('风险管理专家');
    expect(prompt).toContain('技术风险');
    expect(prompt).toContain('risk_assessment_mitigation');
  });

  it('should execute and return risk output', async () => {
    const worker = new RiskWorker(mockLlmCaller, 'gpt-4');
    const mockResponse = `<worker_output>
  <worker_id>risk</worker_id>
  <confidence>0.8</confidence>
  <findings>
    <finding priority="high">
      <category>security</category>
      <content>Data encryption required</content>
    </finding>
    <finding priority="medium">
      <category>scalability</category>
      <content>Consider caching layer</content>
    </finding>
  </findings>
  <questions></questions>
</worker_output>`;

    mockLlmCaller.mockResolvedValue(mockResponse);

    const result = await worker.execute({
      projectName: 'Test',
      overview: 'Test',
      template: 'node'
    });

    expect(result.worker).toBe('risk');
    expect(result.confidence).toBe(0.8);
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0].priority).toBe('high');
  });

  it('should handle multiple risk findings with different severities', async () => {
    const worker = new RiskWorker(mockLlmCaller, 'gpt-4');
    const mockResponse = `<worker_output>
  <worker_id>risk</worker_id>
  <confidence>0.85</confidence>
  <findings>
    <finding priority="high"><category>compliance</category><content>GDPR compliance needed</content></finding>
    <finding priority="high"><category>security</category><content>SQL injection risk</content></finding>
    <finding priority="medium"><category>performance</category><content>Query optimization needed</content></finding>
    <finding priority="low"><category>maintenance</category><content>Documentation gaps</content></finding>
  </findings>
  <questions></questions>
</worker_output>`;

    mockLlmCaller.mockResolvedValue(mockResponse);

    const result = await worker.execute({
      projectName: 'Test',
      overview: 'Test',
      template: 'node'
    });

    expect(result.findings).toHaveLength(4);
    const highRisks = result.findings.filter(f => f.priority === 'high');
    expect(highRisks).toHaveLength(2);
  });
});

describe('Worker integration scenarios', () => {
  const mockLlmCaller = jest.fn();

  beforeEach(() => {
    mockLlmCaller.mockClear();
  });

  it('should handle complex real-world XML response', async () => {
    const worker = new BusinessWorker(mockLlmCaller, 'gpt-4o');
    const complexResponse = `I'll analyze this project for you.

<worker_output>
  <worker_id>business</worker_id>
  <confidence>0.87</confidence>
  <findings>
    <finding priority="high">
      <category>target_audience</category>
      <content>Primary users: software developers aged 25-45
Secondary users: technical project managers</content>
    </finding>
    <finding priority="high">
      <category>value_proposition</category>
      <content>Automates repetitive coding tasks, saving 5-10 hours per week</content>
    </finding>
    <finding priority="medium">
      <category>monetization</category>
      <content>Freemium model with pro features at $29/month</content>
    </finding>
    <finding priority="low">
      <category>market_position</category>
      <content>Competing with GitHub Copilot and similar tools</content>
    </finding>
  </findings>
  <questions>
    <question>What is the expected monthly active user target for year 1?</question>
    <question>Will there be team/enterprise pricing tiers?</question>
    <question>What regions should be supported at launch?</question>
  </questions>
  <raw_notes>
Initial analysis suggests this is a developer productivity tool. 
The market is competitive but there's room for differentiation.
Need to clarify go-to-market strategy and funding situation.
  </raw_notes>
</worker_output>

Hope this helps!`;

    mockLlmCaller.mockResolvedValue(complexResponse);

    const result = await worker.execute({
      projectName: 'DevHelper AI',
      overview: 'AI coding assistant for developers',
      template: 'node'
    });

    expect(result.worker).toBe('business');
    expect(result.confidence).toBe(0.87);
    expect(result.findings).toHaveLength(4);
    expect(result.questions).toHaveLength(3);
    expect(result.rawNotes).toContain('Initial analysis suggests');
  });

  it('should handle XML with extra whitespace and formatting', async () => {
    const worker = new TechWorker(mockLlmCaller, 'gpt-4');
    const formattedResponse = `
    
<worker_output>
  <worker_id>
    tech
  </worker_id>
  <confidence>
    0.95
  </confidence>
  <findings>
    
    <finding priority="high">
      <category>
        architecture
      </category>
      <content>
        Microservices pattern recommended for scalability
      </content>
    </finding>
    
  </findings>
  <questions>
  </questions>
  <raw_notes>
    Consider using Kubernetes for orchestration
  </raw_notes>
</worker_output>
    
    `;

    mockLlmCaller.mockResolvedValue(formattedResponse);

    const result = await worker.execute({
      projectName: 'Test',
      overview: 'Test',
      template: 'node'
    });

    expect(result.worker).toBe('tech');
    expect(result.confidence).toBe(0.95);
    expect(result.findings[0].category).toBe('architecture');
    expect(result.findings[0].content).toContain('Microservices');
  });
});
