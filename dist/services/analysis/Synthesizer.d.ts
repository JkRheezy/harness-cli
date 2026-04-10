import { WorkerOutput, SynthesisResult, LLMCaller } from './types';
/**
 * 综合器 - 汇总所有 Worker 的输出结果
 */
export declare class Synthesizer {
    private llmCaller;
    private model;
    constructor(llmCaller: LLMCaller, model: string);
    /**
     * 综合 Worker 输出为统一结果
     */
    synthesize(workerOutputs: WorkerOutput[]): Promise<SynthesisResult>;
    /**
     * 构建综合 Prompt
     */
    private buildSynthesisPrompt;
    /**
     * 格式化 Worker 输出为 XML
     */
    private formatWorkerOutput;
    /**
     * 解析综合响应
     */
    private parseSynthesisResponse;
    /**
     * 提取业务描述
     */
    private extractBusinessDescription;
    /**
     * 提取核心功能
     */
    private extractCoreFeatures;
    /**
     * 提取技术栈推荐
     */
    private extractStackRecommendation;
    /**
     * 提取风险
     */
    private extractRisks;
    /**
     * 提取待澄清问题
     */
    private extractOpenQuestions;
    /**
     * 提取 XML 标签内容
     */
    private extractXmlTag;
    /**
     * 转义 XML 特殊字符
     */
    private escapeXml;
}
//# sourceMappingURL=Synthesizer.d.ts.map