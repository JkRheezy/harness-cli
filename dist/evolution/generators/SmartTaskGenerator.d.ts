/**
 * SmartTaskGenerator - 将代码缺口转化为具体业务开发任务
 *
 * 根据 Gap 类型生成相应的 BusinessTask，包括实现步骤和验收标准
 */
import { Gap, BusinessTask } from '../types';
export declare class SmartTaskGenerator {
    private logger;
    constructor();
    /**
     * 将 Gap 转化为具体的业务任务
     * @param gap - 发现的代码缺口
     * @returns 生成的业务任务
     */
    generateFromGap(gap: Gap): BusinessTask;
    /**
     * 根据缺口类型生成实现步骤
     * @param gap - 发现的代码缺口
     * @returns 实现步骤列表
     */
    generateImplementationSteps(gap: Gap): string[];
    /**
     * 生成验收标准
     * @param gap - 发现的代码缺口
     * @returns 验收标准列表
     */
    generateAcceptanceCriteria(gap: Gap): string[];
    /**
     * 生成任务标题
     * @param gap - 发现的代码缺口
     * @returns 任务标题
     */
    private generateTitle;
    /**
     * 生成任务描述
     * @param gap - 发现的代码缺口
     * @returns 任务描述
     */
    private generateDescription;
    /**
     * 生成需求列表
     * @param gap - 发现的代码缺口
     * @returns 需求列表
     */
    private generateRequirements;
    /**
     * 估算工作量
     * @param gap - 发现的代码缺口
     * @returns 工作量估算 (small/medium/large)
     */
    private estimateEffort;
    /**
     * 从名称中提取模块名
     * @param name - 缺口名称
     * @returns 模块名或 null
     */
    private extractModuleName;
}
//# sourceMappingURL=SmartTaskGenerator.d.ts.map