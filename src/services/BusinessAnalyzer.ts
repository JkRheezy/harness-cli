import { LLMAnalysisResponse, BusinessAnalysis, SmartInitOptions } from '../commands/types';
import { AnalysisCoordinator, CoordinatorConfig } from './analysis';

/**
 * 业务分析器
 * 使用多轮 LLM 分析（4-phase coordinator/worker 架构）分析项目概述并生成业务架构、技术选型和初始任务
 */
export class BusinessAnalyzer {
  private apiKey: string;
  private provider: string;
  private baseUrl?: string;
  private coordinator: AnalysisCoordinator;

  constructor(config: {
    apiKey: string;
    provider: 'openai' | 'kimi' | 'anthropic';
    baseUrl?: string;
  }) {
    this.apiKey = config.apiKey;
    this.provider = config.provider;
    this.baseUrl = config.baseUrl;
    
    // 创建 LLM 调用函数
    const llmCaller = (prompt: string, model?: string) => this.callLLM(prompt, model);
    
    // 初始化协调器
    const coordinatorConfig: Partial<CoordinatorConfig> = {
      maxRetries: 2,
      minConfidence: 0.7,
      timeout: 60000,
      models: {
        research: this.getModelName(),
        synthesis: this.getModelName(),
        implementation: this.getModelName(),
        verification: this.getModelName()
      }
    };
    
    this.coordinator = new AnalysisCoordinator(llmCaller, coordinatorConfig);
  }

  /**
   * 分析项目概述并生成业务架构
   * 使用多轮 coordinator/worker 架构进行分析
   */
  async analyze(options: SmartInitOptions): Promise<BusinessAnalysis> {
    // 委托给 coordinator 执行多阶段分析
    const analysis = await this.coordinator.execute(options);
    
    // coordinator 返回的结果中 projectName 和 overview 可能来自 LLM 输出
    // 使用用户传入的值覆盖，确保一致性
    return {
      ...analysis,
      projectName: options.projectName,
      overview: options.overview
    };
  }

  /**
   * 根据 provider 获取模型名称
   */
  private getModelName(): string {
    switch (this.provider) {
      case 'openai':
        return 'gpt-4';
      case 'kimi':
        return 'moonshot-v1-32k';
      case 'anthropic':
        return 'claude-3-sonnet-20240229';
      default:
        return 'gpt-4';
    }
  }

  /**
   * 调用 LLM API（保留原有实现）
   */
  private async callLLM(prompt: string, model?: string): Promise<string> {
    if (this.provider === 'openai') {
      return this.callOpenAI(prompt, model);
    } else if (this.provider === 'kimi') {
      return this.callKimi(prompt, model);
    } else if (this.provider === 'anthropic') {
      return this.callAnthropic(prompt, model);
    }
    throw new Error(`不支持的 LLM 提供商: ${this.provider}`);
  }

  /**
   * 调用 OpenAI API（保留原有实现）
   */
  private async callOpenAI(prompt: string, model?: string): Promise<string> {
    const response = await fetch(this.baseUrl || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4',
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
   * 调用 Kimi API（保留原有实现）
   */
  private async callKimi(prompt: string, model?: string): Promise<string> {
    const baseUrl = this.baseUrl || 'https://api.moonshot.cn/v1';
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
        model: model || 'moonshot-v1-32k',
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
   * 调用 Anthropic API（保留原有实现）
   */
  private async callAnthropic(prompt: string, model?: string): Promise<string> {
    const baseUrl = this.baseUrl || 'https://api.anthropic.com';
    const apiUrl = baseUrl.includes('/v1') 
      ? `${baseUrl}/messages` 
      : `${baseUrl}/v1/messages`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-3-sonnet-20240229',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API 错误: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }
}
