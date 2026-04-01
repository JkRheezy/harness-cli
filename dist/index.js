"use strict";
/**
 * Harness CLI - 无人值守 Agent 开发项目脚手架
 *
 * 可作为库引入使用：
 * ```typescript
 * import { TemplateManager, InitCommand } from '@harness/cli';
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = exports.Logger = exports.ConfigLoader = exports.PRAutomator = exports.ReviewAgent = exports.TaskExecutor = exports.LoopController = exports.InitCommand = exports.TemplateManager = void 0;
// 导出模板系统
var TemplateManager_1 = require("./templates/TemplateManager");
Object.defineProperty(exports, "TemplateManager", { enumerable: true, get: function () { return TemplateManager_1.TemplateManager; } });
// 导出命令
var InitCommand_1 = require("./commands/InitCommand");
Object.defineProperty(exports, "InitCommand", { enumerable: true, get: function () { return InitCommand_1.InitCommand; } });
// 导出核心功能
var LoopController_1 = require("./core/LoopController");
Object.defineProperty(exports, "LoopController", { enumerable: true, get: function () { return LoopController_1.LoopController; } });
var TaskExecutor_1 = require("./core/TaskExecutor");
Object.defineProperty(exports, "TaskExecutor", { enumerable: true, get: function () { return TaskExecutor_1.TaskExecutor; } });
var ReviewAgent_1 = require("./core/ReviewAgent");
Object.defineProperty(exports, "ReviewAgent", { enumerable: true, get: function () { return ReviewAgent_1.ReviewAgent; } });
var PRAutomator_1 = require("./core/PRAutomator");
Object.defineProperty(exports, "PRAutomator", { enumerable: true, get: function () { return PRAutomator_1.PRAutomator; } });
// 导出工具
var ConfigLoader_1 = require("./utils/ConfigLoader");
Object.defineProperty(exports, "ConfigLoader", { enumerable: true, get: function () { return ConfigLoader_1.ConfigLoader; } });
var Logger_1 = require("./utils/Logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return Logger_1.Logger; } });
// 版本信息
exports.version = '2.1.0';
//# sourceMappingURL=index.js.map