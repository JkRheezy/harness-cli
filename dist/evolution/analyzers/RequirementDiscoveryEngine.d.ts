/**
 * RequirementDiscoveryEngine - 自主发现代码缺口的引擎
 *
 * 该引擎分析项目结构，自动发现缺失的模块、API、用户流程和数据模型
 */
import { Gap, ModuleRequirement, RequirementDiscoveryResult, ArchitecturePattern } from '../types';
/**
 * 电商模块预定义要求
 */
export declare const MODULE_REQUIREMENTS: Record<string, ModuleRequirement>;
/**
 * 电商架构模式
 */
export declare const E_COMMERCE_PATTERN: ArchitecturePattern;
/**
 * 用户购物流程定义
 */
export declare const USER_SHOPPING_FLOW: {
    name: string;
    steps: ({
        name: string;
        label: string;
        pagePattern: string;
        componentPattern?: undefined;
    } | {
        name: string;
        label: string;
        componentPattern: string;
        pagePattern?: undefined;
    })[];
};
/**
 * API 依赖关系图
 * 用于检查 API 闭环
 */
export declare const API_DEPENDENCIES: Record<string, string[]>;
export declare class RequirementDiscoveryEngine {
    private logger;
    private projectPath;
    constructor(projectPath: string);
    /**
     * 主分析方法 - 发现所有缺口
     */
    analyze(): Promise<RequirementDiscoveryResult>;
    /**
     * 分析架构完整性 - 检查必需模块是否存在
     */
    analyzeArchitectureCompleteness(): Promise<Gap[]>;
    /**
     * 分析 API 完整性 - 检查 API 是否形成闭环
     */
    analyzeApiCompleteness(): Promise<Gap[]>;
    /**
     * 分析用户流程 - 检查购物流程是否完整
     */
    analyzeUserFlows(): Promise<Gap[]>;
    /**
     * 分析数据模型 - 检查 Prisma schema 中的数据模型完整性
     */
    analyzeDataModels(): Promise<Gap[]>;
    /**
     * 检查模块是否存在
     */
    private checkModuleExists;
    /**
     * 检查文件模式是否存在
     */
    private checkFilePatternExists;
    /**
     * 检测已存在的 API 模块
     */
    private detectExistingApiModules;
    /**
     * 检查 Prisma 模型是否存在
     */
    private checkModelExists;
    /**
     * 从缺口中提取已存在的模块
     */
    private getExistingModules;
    /**
     * 从缺口中提取缺失的模块
     */
    private getMissingModules;
    /**
     * 生成模块实现范围
     */
    private generateModuleScope;
    /**
     * 生成 API 实现范围
     */
    private generateApiScope;
    /**
     * 生成用户流程实现范围
     */
    private generateFlowScope;
    /**
     * 生成数据模型实现范围
     */
    private generateModelScope;
}
export default RequirementDiscoveryEngine;
//# sourceMappingURL=RequirementDiscoveryEngine.d.ts.map