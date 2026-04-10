import { WorkerType, WorkerOutput, WorkerFinding, LLMCaller } from '../types';
import { SmartInitOptions } from '../../../commands/types';
export declare abstract class BaseWorker {
    protected llmCaller: LLMCaller;
    protected model: string;
    protected abstract readonly workerType: WorkerType;
    protected abstract readonly roleDescription: string;
    protected abstract readonly researchScope: string;
    constructor(llmCaller: LLMCaller, model: string);
    /**
     * 执行 Worker 分析
     */
    execute(options: SmartInitOptions): Promise<WorkerOutput>;
    /**
     * 构建包含完整上下文的 Prompt（Claude Code 风格）
     */
    protected buildPrompt(options: SmartInitOptions): string;
    /**
     * 获取 Worker 特定的任务描述
     */
    protected abstract getTaskDescription(): string;
    /**
     * 解析 XML 响应为 WorkerOutput
     */
    protected parseResponse(response: string): WorkerOutput;
    /**
     * 提取 XML 标签内容
     */
    protected extractXmlTag(xml: string, tag: string): string;
    /**
     * 从 XML 提取 findings
     */
    protected extractFindings(xml: string): WorkerFinding[];
    /**
     * 从 XML 提取 questions
     */
    protected extractQuestions(xml: string): string[];
    /**
     * 转义 XML 特殊字符
     */
    protected escapeXml(text: string): string;
}
//# sourceMappingURL=BaseWorker.d.ts.map