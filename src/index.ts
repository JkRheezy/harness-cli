/**
 * Harness CLI - 无人值守 Agent 开发项目脚手架
 * 
 * 可作为库引入使用：
 * ```typescript
 * import { TemplateManager, InitCommand } from '@harness/cli';
 * ```
 */

// 导出模板系统
export { TemplateManager, TemplateConfig, TemplateContext, TemplateVariable } from './templates/TemplateManager';

// 导出命令
export { InitCommand, InitOptions } from './commands/InitCommand';

// 导出核心功能
export { LoopController, LoopConfig, LoopOptions } from './core/LoopController';
export { TaskExecutor, LLMConfig, ExecuteOptions } from './core/TaskExecutor';
export { ReviewAgent, ReviewResult, ReviewIssue } from './core/ReviewAgent';
export { PRAutomator, PRCreateOptions, PRMergeOptions } from './core/PRAutomator';

// 导出工具
export { ConfigLoader } from './utils/ConfigLoader';
export { Logger } from './utils/Logger';

// 版本信息
export const version = '2.1.0';
