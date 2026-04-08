import { BusinessAnalysis, SmartInitOptions } from '../commands/types';
/**
 * 业务分析器
 * 使用 LLM 分析项目概述并生成业务架构、技术选型和初始任务
 */
export declare class BusinessAnalyzer {
    private apiKey;
    private provider;
    private baseUrl?;
    constructor(config: {
        apiKey: string;
        provider: 'openai' | 'kimi' | 'anthropic';
        baseUrl?: string;
    });
    /**
     * 分析项目概述并生成业务架构
     */
    analyze(options: SmartInitOptions): Promise<BusinessAnalysis>;
    /**
     * 构建分析提示词
     */
    private buildAnalysisPrompt;
    /**
     * 调用 LLM API
     */
    private callLLM;
    /**
     * 调用 OpenAI API
     */
    private callOpenAI;
    /**
     * 调用 Kimi API
     */
    private callKimi;
    /**
     * 解析 LLM 响应
     */
    private parseResponse;
}
//# sourceMappingURL=BusinessAnalyzer.d.ts.map