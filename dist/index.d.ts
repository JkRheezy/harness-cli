/**
 * Harness CLI - 无人值守 Agent 开发项目脚手架
 *
 * 可作为库引入使用：
 * ```typescript
 * import { TemplateManager, InitCommand } from '@harness/cli';
 * ```
 */
export { TemplateManager, TemplateConfig, TemplateContext, TemplateVariable } from './templates/TemplateManager';
export { InitCommand, InitOptions } from './commands/InitCommand';
export { LoopController, LoopConfig, LoopOptions } from './core/LoopController';
export { TaskExecutor, LLMConfig, ExecuteOptions } from './core/TaskExecutor';
export { ReviewAgent, ReviewResult, ReviewIssue } from './core/ReviewAgent';
export { PRAutomator, PRCreateOptions, PRMergeOptions } from './core/PRAutomator';
export { ConfigLoader } from './utils/ConfigLoader';
export { Logger } from './utils/Logger';
export declare const version = "2.1.0";
//# sourceMappingURL=index.d.ts.map