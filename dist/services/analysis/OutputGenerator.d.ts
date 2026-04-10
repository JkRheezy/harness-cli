import { SynthesisResult, LLMCaller } from './types';
import { BusinessAnalysis } from '../../commands/types';
/**
 * 输出生成器 - 生成最终的 BusinessAnalysis
 */
export declare class OutputGenerator {
    private llmCaller;
    private model;
    constructor(llmCaller: LLMCaller, model: string);
    /**
     * 从综合结果生成最终输出
     */
    generate(synthesis: SynthesisResult, projectName: string, overview: string): Promise<BusinessAnalysis>;
    /**
     * 构建生成 Prompt
     */
    private buildGenerationPrompt;
    /**
     * 解析初始任务
     */
    private parseInitialTasks;
    /**
     * 解析目录结构文本为 DirectoryNode 数组
     */
    private parseDirectoryStructure;
}
//# sourceMappingURL=OutputGenerator.d.ts.map