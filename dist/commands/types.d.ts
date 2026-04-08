/**
 * 智能初始化命令相关类型定义
 */
/**
 * 项目业务分析结果
 */
export interface BusinessAnalysis {
    /** 项目名称 */
    projectName: string;
    /** 项目概述 */
    overview: string;
    /** 详细业务描述 */
    businessDescription: string;
    /** 核心功能列表 */
    coreFeatures: string[];
    /** 技术栈建议 */
    techStack: {
        backend: string;
        frontend?: string;
        database: string;
        other: string[];
    };
    /** 项目结构建议 */
    directoryStructure: DirectoryNode[];
    /** 初始任务列表 */
    initialTasks: InitialTask[];
}
/**
 * 目录节点
 */
export interface DirectoryNode {
    name: string;
    type: 'file' | 'directory';
    description: string;
    children?: DirectoryNode[];
}
/**
 * 初始任务
 */
export interface InitialTask {
    id: string;
    name: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    acceptanceCriteria: string[];
}
/**
 * LLM 分析响应
 */
export interface LLMAnalysisResponse {
    businessDescription: string;
    coreFeatures: string[];
    techStack: {
        backend: string;
        frontend?: string;
        database: string;
        other: string[];
    };
    directoryStructure: DirectoryNode[];
    initialTasks: InitialTask[];
}
/**
 * 智能初始化选项
 */
export interface SmartInitOptions {
    /** 项目名称 */
    projectName: string;
    /** 项目概述 */
    overview: string;
    /** 技术栈模板 */
    template: string;
    /** 是否跳过业务分析 */
    skipAnalysis?: boolean;
    /** 是否立即启动 loop */
    autoStart?: boolean;
}
//# sourceMappingURL=types.d.ts.map