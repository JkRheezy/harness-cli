#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const LoopController_1 = require("./core/LoopController");
const TaskSubmitter_1 = require("./core/TaskSubmitter");
const PRAutomator_1 = require("./core/PRAutomator");
const ReviewAgent_1 = require("./core/ReviewAgent");
const ConfigLoader_1 = require("./utils/ConfigLoader");
const Logger_1 = require("./utils/Logger");
const visualize_1 = __importDefault(require("./commands/visualize"));
const program = new commander_1.Command();
const logger = new Logger_1.Logger();
program
    .name('harness')
    .description('Harness-Engineering CLI - 无人值守Agent开发工具')
    .version('2.1.0');
// ========== 无人值守 Loop 命令 ==========
program
    .command('loop')
    .description('启动无人值守开发 Loop')
    .option('-c, --config <path>', '配置文件路径', '.harness/config.yaml')
    .option('-d, --duration <hours>', '最大运行时长(小时)', '6')
    .option('--dry-run', '模拟运行，不实际执行')
    .action(async (options) => {
    try {
        logger.info('🚀 启动 Harness 无人值守 Loop...');
        const config = await ConfigLoader_1.ConfigLoader.load(options.config);
        const controller = new LoopController_1.LoopController(config);
        // 设置运行时长限制
        const maxDuration = parseInt(options.duration) * 60 * 60 * 1000;
        // 启动 Loop
        await controller.start({
            maxDuration,
            dryRun: options.dryRun
        });
    }
    catch (error) {
        logger.error('Loop 启动失败:', error);
        process.exit(1);
    }
});
// ========== 任务提交命令 ==========
program
    .command('task')
    .description('提交开发任务')
    .requiredOption('-t, --title <title>', '任务标题')
    .requiredOption('-d, --description <desc>', '任务描述')
    .option('-r, --requirements <items>', '需求列表(逗号分隔)')
    .option('-p, --priority <level>', '优先级', 'medium')
    .option('--max-duration <hours>', '最大执行时长(小时)', '4')
    .action(async (options) => {
    try {
        const submitter = new TaskSubmitter_1.TaskSubmitter();
        const task = {
            id: generateTaskId(),
            title: options.title,
            description: options.description,
            requirements: options.requirements?.split(',') || [],
            priority: options.priority,
            maxDuration: parseInt(options.maxDuration) * 60 * 60 * 1000,
            status: 'pending',
            createdAt: new Date()
        };
        logger.info('📋 提交任务:', task.title);
        const result = await submitter.submit(task);
        logger.info('✅ 任务已提交:', result.taskId);
        logger.info('⏱️  预计执行时间:', options.maxDuration, '小时');
    }
    catch (error) {
        logger.error('任务提交失败:', error);
        process.exit(1);
    }
});
// ========== PR 自动化命令 ==========
program
    .command('pr-create')
    .description('自动创建 PR')
    .requiredOption('-b, --branch <branch>', '分支名')
    .requiredOption('-t, --title <title>', 'PR 标题')
    .option('-m, --message <message>', 'PR 描述')
    .option('--auto-merge', '自动合并（通过审查后）')
    .action(async (options) => {
    try {
        const automator = new PRAutomator_1.PRAutomator();
        logger.info('🔀 创建 PR:', options.title);
        const pr = await automator.create({
            branch: options.branch,
            title: options.title,
            body: options.message || options.title,
            autoMerge: options.autoMerge
        });
        logger.info('✅ PR 已创建:', pr.url);
        logger.info('📊 PR 编号:', pr.number);
        if (options.autoMerge) {
            logger.info('🤖 已启用自动合并');
        }
    }
    catch (error) {
        logger.error('PR 创建失败:', error);
        process.exit(1);
    }
});
program
    .command('pr-review')
    .description('自动审查 PR')
    .requiredOption('-n, --number <number>', 'PR 编号')
    .option('--auto-approve', '自动批准（通过检查时）')
    .action(async (options) => {
    try {
        const reviewer = new ReviewAgent_1.ReviewAgent({});
        logger.info('🔍 审查 PR:', options.number);
        const result = await reviewer.review(parseInt(options.number));
        logger.info('📋 审查结果:');
        logger.info('  - 状态:', result.status);
        logger.info('  - 问题数:', result.issues.length);
        logger.info('  - 建议数:', result.suggestions.length);
        if (result.issues.length > 0) {
            logger.info('❌ 发现问题:');
            result.issues.forEach((issue) => {
                logger.info(`  - [${issue.severity}] ${issue.message}`);
            });
        }
        if (result.suggestions.length > 0) {
            logger.info('💡 改进建议:');
            result.suggestions.forEach((suggestion) => {
                logger.info(`  - ${suggestion}`);
            });
        }
        if (result.canAutoApprove && options.autoApprove) {
            logger.info('✅ 自动批准 PR');
            await reviewer.approve(parseInt(options.number));
        }
    }
    catch (error) {
        logger.error('PR 审查失败:', error);
        process.exit(1);
    }
});
program
    .command('pr-merge')
    .description('自动合并 PR')
    .requiredOption('-n, --number <number>', 'PR 编号')
    .option('-s, --strategy <strategy>', '合并策略', 'squash')
    .option('--delete-branch', '删除分支')
    .action(async (options) => {
    try {
        const automator = new PRAutomator_1.PRAutomator();
        logger.info('🔀 合并 PR:', options.number);
        await automator.merge({
            number: parseInt(options.number),
            strategy: options.strategy,
            deleteBranch: options.deleteBranch
        });
        logger.info('✅ PR 已合并');
    }
    catch (error) {
        logger.error('PR 合并失败:', error);
        process.exit(1);
    }
});
// ========== 状态查询命令 ==========
program
    .command('status')
    .description('查询系统状态')
    .action(async () => {
    try {
        const controller = new LoopController_1.LoopController({});
        const status = await controller.getStatus();
        logger.info('📊 Harness 系统状态');
        logger.info('===================');
        logger.info('Loop 状态:', status.loopStatus);
        logger.info('活跃任务:', status.activeTasks);
        logger.info('待处理任务:', status.pendingTasks);
        logger.info('已完成任务:', status.completedTasks);
        logger.info('失败任务:', status.failedTasks);
        logger.info('运行时长:', formatDuration(status.uptime));
    }
    catch (error) {
        logger.error('状态查询失败:', error);
        process.exit(1);
    }
});
// ========== 配置初始化命令 ==========
program
    .command('init')
    .description('初始化 Harness 项目（交互式）')
    .option('-f, --force', '强制覆盖现有配置')
    .option('-t, --template <name>', '指定模板')
    .option('-n, --name <name>', '项目名称')
    .option('--skip-install', '跳过依赖安装')
    .action(async (options) => {
    try {
        const { InitCommand } = await Promise.resolve().then(() => __importStar(require('./commands/InitCommand')));
        const init = new InitCommand();
        await init.execute({
            force: options.force,
            template: options.template,
            projectName: options.name,
            skipInstall: options.skipInstall
        });
    }
    catch (error) {
        logger.error('初始化失败:', error);
        process.exit(1);
    }
});
// ========== 快速创建项目命令 ==========
program
    .command('create <project-name>')
    .description('快速创建新项目')
    .option('-t, --template <name>', '指定模板', 'node-ts')
    .option('-f, --force', '强制覆盖')
    .option('--skip-install', '跳过依赖安装')
    .action(async (projectName, options) => {
    try {
        const { InitCommand } = await Promise.resolve().then(() => __importStar(require('./commands/InitCommand')));
        const init = new InitCommand();
        await init.execute({
            template: options.template,
            projectName: projectName,
            force: options.force,
            skipInstall: options.skipInstall
        });
    }
    catch (error) {
        logger.error('创建失败:', error);
        process.exit(1);
    }
});
// ========== 模板列表命令 ==========
program
    .command('list-templates')
    .alias('templates')
    .description('列出可用模板')
    .action(async () => {
    try {
        const { TemplateManager } = await Promise.resolve().then(() => __importStar(require('./templates/TemplateManager')));
        const manager = new TemplateManager();
        const templates = await manager.listTemplates();
        console.log('\n📦 可用模板:\n');
        templates.forEach(t => {
            console.log(`  ${t.name}`);
            console.log(`    ${t.description}`);
            console.log();
        });
    }
    catch (error) {
        logger.error('获取模板列表失败:', error);
        process.exit(1);
    }
});
// 辅助函数
function generateTaskId() {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function formatDuration(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}小时${minutes}分钟`;
}
// ========== 可视化命令 ==========
program.addCommand(visualize_1.default);
program.parse();
//# sourceMappingURL=cli.js.map