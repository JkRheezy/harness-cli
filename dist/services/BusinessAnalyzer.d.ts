import { BusinessAnalysis, SmartInitOptions } from '../commands/types';
/**
 * 业务分析器
 * 使用多轮 LLM 分析（4-phase coordinator/worker 架构）分析项目概述并生成业务架构、技术选型和初始任务
 */
export declare class BusinessAnalyzer {
    private apiKey;
    private provider;
    private baseUrl?;
    private coordinator;
    constructor(config: {
        apiKey: string;
        provider: 'openai' | 'kimi' | 'anthropic';
        baseUrl?: string;
    });
    /**
     * 分析项目概述并生成业务架构
     * 使用多轮 coordinator/worker 架构进行分析
     */
    analyze(options: SmartInitOptions): Promise<BusinessAnalysis>;
    /**
     * 根据 provider 获取模型名称
     */
    private getModelName;
    /**
     * 调用 LLM API（保留原有实现）
     */
    private callLLM;
    /**
     * 调用 OpenAI API（保留原有实现）
     */
    private callOpenAI;
    /**
     * 调用 Kimi API（保留原有实现）
     */
    private callKimi;
    /**
     * 调用 Anthropic API（保留原有实现）
     */
    private callAnthropic;
}
//# sourceMappingURL=BusinessAnalyzer.d.ts.map