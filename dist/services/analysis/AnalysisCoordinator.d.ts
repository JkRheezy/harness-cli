import { SmartInitOptions, BusinessAnalysis } from '../../commands/types';
import { CoordinatorConfig, LLMCaller } from './types';
/**
 * 分析协调器 - 编排 4 阶段分析工作流
 *
 * 4 阶段工作流：
 * 1. Research Phase: 并行执行 4 个 Worker 进行多维度分析
 * 2. Synthesis Phase: 综合所有 Worker 输出，形成统一理解
 * 3. Implementation Phase: 生成 BusinessAnalysis 输出
 * 4. Verification Phase: 验证输出质量，必要时重新生成
 */
export declare class AnalysisCoordinator {
    private llmCaller;
    private config;
    private synthesizer;
    private outputGenerator;
    private verifier;
    constructor(llmCaller: LLMCaller, config?: Partial<CoordinatorConfig>);
    /**
     * 执行完整的 4 阶段分析工作流
     *
     * @param options - 智能初始化选项
     * @returns 业务分析结果
     * @throws 如果所有重试都失败
     */
    execute(options: SmartInitOptions): Promise<BusinessAnalysis>;
    /**
     * 阶段 1: 并行执行所有 Workers
     *
     * 同时启动 4 个 Worker，分别从不同维度分析项目：
     * - BusinessWorker: 业务需求分析
     * - TechWorker: 技术栈分析
     * - DomainWorker: 领域知识分析
     * - RiskWorker: 风险分析
     *
     * @param options - 智能初始化选项
     * @returns 所有 Worker 的输出结果数组
     */
    private executeResearchPhase;
    /**
     * 执行单个 Worker 并添加超时控制
     *
     * @param worker - Worker 实例
     * @param options - 智能初始化选项
     * @param workerName - Worker 名称（用于日志）
     * @returns Worker 输出结果
     */
    private executeWorkerWithTimeout;
    /**
     * 根据 Worker 名称获取 Worker 类型
     *
     * @param workerName - Worker 名称
     * @returns Worker 类型
     */
    private getWorkerType;
    /**
     * 阶段 3 & 4: 生成并验证输出
     *
     * 循环执行直到验证通过或达到最大重试次数：
     * 1. 使用 OutputGenerator 生成 BusinessAnalysis
     * 2. 使用 Verifier 验证输出质量
     * 3. 如果不通过，根据反馈重新生成
     *
     * @param synthesis - 综合结果
     * @param options - 智能初始化选项
     * @returns 验证通过的业务分析结果
     * @throws 如果达到最大重试次数仍未通过验证
     */
    private generateAndVerify;
    /**
     * 记录 Worker 执行结果
     *
     * @param outputs - Worker 输出结果数组
     */
    private logWorkerResults;
    /**
     * 记录综合结果
     *
     * @param synthesis - 综合结果
     */
    private logSynthesisResult;
}
//# sourceMappingURL=AnalysisCoordinator.d.ts.map