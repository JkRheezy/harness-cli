import { LLMAnalysisResponse, BusinessAnalysis, SmartInitOptions } from '../commands/types';

/**
 * 业务分析器
 * 使用 LLM 分析项目概述并生成业务架构、技术选型和初始任务
 */
export class BusinessAnalyzer {
  private apiKey: string;
  private provider: string;
  private baseUrl?: string;

  constructor(config: {
    apiKey: string;
    provider: 'openai' | 'kimi' | 'anthropic';
    baseUrl?: string;
  }) {
    this.apiKey = config.apiKey;
    this.provider = config.provider;
    this.baseUrl = config.baseUrl;
  }

  /**
   * 分析项目概述并生成业务架构
   */
  async analyze(options: SmartInitOptions): Promise<BusinessAnalysis> {
    const prompt = this.buildAnalysisPrompt(options);
    
    const response = await this.callLLM(prompt);
    const analysis = this.parseResponse(response);

    return {
      projectName: options.projectName,
      overview: options.overview,
      ...analysis
    };
  }

  /**
   * 构建分析提示词
   */
  private buildAnalysisPrompt(options: SmartInitOptions): string {
    return `你是一个资深软件架构师，请根据以下项目概述进行业务分析和技术设计。

## 项目信息
- 项目名称: ${options.projectName}
- 技术模板: ${options.template}
- 项目概述: ${options.overview}

## 请提供以下分析结果（JSON格式）

1. **businessDescription**: 详细的业务描述（200-300字）
2. **coreFeatures**: 核心功能列表（5-8个）
3. **techStack**: 技术栈建议
   - backend: 后端技术
   - frontend: 前端技术（如有）
   - database: 数据库
   - other: 其他技术数组
4. **directoryStructure**: 项目目录结构建议（树形，包含文件说明）
5. **initialTasks**: 初始开发任务（3-5个）
   - 每个任务包含: id, name, description, priority(high/medium/low), acceptanceCriteria(数组)

## 输出格式要求
必须是有效的 JSON，不要包含 markdown 代码块标记，直接返回 JSON 对象。`;
  }

  /**
   * 调用 LLM API
   */
  private async callLLM(prompt: string): Promise<string> {
    if (this.provider === 'openai') {
      return this.callOpenAI(prompt);
    } else if (this.provider === 'kimi') {
      return this.callKimi(prompt);
    }
    throw new Error(`不支持的 LLM 提供商: ${this.provider}`);
  }

  /**
   * 调用 OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch(this.baseUrl || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 错误: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * 调用 Kimi API
   */
  private async callKimi(prompt: string): Promise<string> {
    const baseUrl = this.baseUrl || 'https://api.moonshot.cn/v1';
    // 确保 baseUrl 不以 /chat/completions 结尾
    const apiUrl = baseUrl.endsWith('/chat/completions') 
      ? baseUrl 
      : `${baseUrl}/chat/completions`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'moonshot-v1-32k',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`Kimi API 错误: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * 解析 LLM 响应
   */
  private parseResponse(response: string): LLMAnalysisResponse {
    // 清理可能的 markdown 代码块
    const cleanResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      const parsed = JSON.parse(cleanResponse);
      
      // 验证必需字段
      if (!parsed.businessDescription || !parsed.coreFeatures || !parsed.techStack) {
        throw new Error('LLM 响应缺少必需字段');
      }

      return parsed as LLMAnalysisResponse;
    } catch (error) {
      throw new Error(`解析 LLM 响应失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
