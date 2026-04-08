#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { LoopController } from './core/LoopController';
import { TaskSubmitter, Task } from './core/TaskSubmitter';
import { PRAutomator } from './core/PRAutomator';
import { ReviewAgent } from './core/ReviewAgent';
import { ConfigLoader } from './utils/ConfigLoader';
import { Logger } from './utils/Logger';
import visualizeCommand from './commands/visualize';
import { TelemetryDashboard } from './telemetry/dashboard/TelemetryDashboard';
import { IndexedFileAdapter, TelemetryServer } from './telemetry';

const program = new Command();
const logger = new Logger();

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
  .option('--unattended', '启用无人值守模式', false)
  .option('--max-errors <number>', '最大连续错误数', '5')
  .action(async (options) => {
    try {
      logger.info('🚀 启动 Harness 无人值守 Loop...');
      
      const config = await ConfigLoader.load(options.config);
      
      // 应用无人值守配置
      if (options.unattended) {
        config.unattended = {
          enabled: true,
          maxConsecutiveErrors: parseInt(options.maxErrors),
          pauseOnHighErrorRate: true,
          errorRateThreshold: 0.5,
          autoResume: true,
          resumeDelay: 300000
        };
      }
      
      const controller = new LoopController(config);
      
      // 设置运行时长限制
      const maxDuration = parseFloat(options.duration) * 60 * 60 * 1000;
      
      // 启动 Loop
      await controller.start({
        maxDuration,
        dryRun: options.dryRun
      });
      
    } catch (error) {
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
      const submitter = new TaskSubmitter();
      
      const task: Task = {
        id: generateTaskId(),
        title: options.title,
        description: options.description,
        requirements: options.requirements?.split(',') || [],
        priority: options.priority as 'low' | 'medium' | 'high',
        maxDuration: parseFloat(options.maxDuration) * 60 * 60 * 1000,
        status: 'pending',
        createdAt: new Date()
      };
      
      logger.info('📋 提交任务:', task.title);
      const result = await submitter.submit(task);
      
      logger.info('✅ 任务已提交:', result.taskId);
      logger.info('⏱️  预计执行时间:', options.maxDuration, '小时');
      
    } catch (error) {
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
  .action(async (options: any) => {
    try {
      const automator = new PRAutomator();
      
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
      
    } catch (error) {
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
      const reviewer = new ReviewAgent({} as any);
      
      logger.info('🔍 审查 PR:', options.number);
      const result = await reviewer.review(parseInt(options.number));
      
      logger.info('📋 审查结果:');
      logger.info('  - 状态:', result.status);
      logger.info('  - 问题数:', result.issues.length);
      logger.info('  - 建议数:', result.suggestions.length);
      
      if (result.issues.length > 0) {
        logger.info('❌ 发现问题:');
        result.issues.forEach((issue: any) => {
          logger.info(`  - [${issue.severity}] ${issue.message}`);
        });
      }
      
      if (result.suggestions.length > 0) {
        logger.info('💡 改进建议:');
        result.suggestions.forEach((suggestion: any) => {
          logger.info(`  - ${suggestion}`);
        });
      }
      
      if (result.canAutoApprove && options.autoApprove) {
        logger.info('✅ 自动批准 PR');
        await reviewer.approve(parseInt(options.number));
      }
      
    } catch (error) {
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
      const automator = new PRAutomator();
      
      logger.info('🔀 合并 PR:', options.number);
      await automator.merge({
        number: parseInt(options.number),
        strategy: options.strategy,
        deleteBranch: options.deleteBranch
      });
      
      logger.info('✅ PR 已合并');
      
    } catch (error) {
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
      const controller = new LoopController({} as any);
      const status = await controller.getStatus();
      
      logger.info('📊 Harness 系统状态');
      logger.info('===================');
      logger.info('Loop 状态:', status.loopStatus);
      logger.info('活跃任务:', status.activeTasks);
      logger.info('待处理任务:', status.pendingTasks);
      logger.info('已完成任务:', status.completedTasks);
      logger.info('失败任务:', status.failedTasks);
      logger.info('运行时长:', formatDuration(status.uptime));
      
    } catch (error) {
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
  .action(async (options: any) => {
    try {
      const { InitCommand } = await import('./commands/InitCommand');
      const init = new InitCommand();
      await init.execute({
        force: options.force,
        template: options.template,
        projectName: options.name,
        skipInstall: options.skipInstall
      });
    } catch (error) {
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
  .action(async (projectName: string, options: any) => {
    try {
      const { InitCommand } = await import('./commands/InitCommand');
      const init = new InitCommand();
      await init.execute({
        template: options.template,
        projectName: projectName,
        force: options.force,
        skipInstall: options.skipInstall
      });
    } catch (error) {
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
      const { TemplateManager } = await import('./templates/TemplateManager');
      const manager = new TemplateManager();
      const templates = await manager.listTemplates();
      
      console.log('\n📦 可用模板:\n');
      templates.forEach(t => {
        console.log(`  ${t.name}`);
        console.log(`    ${t.description}`);
        console.log();
      });
    } catch (error) {
      logger.error('获取模板列表失败:', error);
      process.exit(1);
    }
  });

// 辅助函数
function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}小时${minutes}分钟`;
}

// ========== 可视化命令 ==========
program.addCommand(visualizeCommand);

// ========== Telemetry Dashboard 命令 ==========
program
  .command('telemetry')
  .description('View telemetry dashboard')
  .option('-w, --watch', 'Watch mode with auto-refresh', false)
  .option('-d, --dir <dir>', 'Telemetry directory', '.harness/telemetry')
  .action(async (options) => {
    try {
      const telemetryDir = path.resolve(options.dir);
      
      // Check if directory exists
      if (!fs.existsSync(telemetryDir)) {
        logger.error(`Telemetry directory not found: ${options.dir}`);
        logger.info('Run "harness loop" first to generate telemetry data.');
        process.exit(1);
      }
      
      const dashboard = new TelemetryDashboard({
        telemetryDir,
        refreshIntervalMs: 5000
      });
      
      if (options.watch) {
        logger.info('Starting telemetry dashboard (Ctrl+C to exit)...\n');
        await dashboard.watch();
      } else {
        const report = await dashboard.generateReport();
        console.log(report);
      }
    } catch (error) {
      logger.error('Error displaying telemetry:', error);
      process.exit(1);
    }
  });

// ========== Telemetry Web UI 命令 ==========
program
  .command('telemetry-ui')
  .description('启动 Telemetry Web UI')
  .option('-p, --port <port>', '服务器端口', '9999')
  .option('-d, --dir <directory>', 'Telemetry 数据目录', '.harness/telemetry')
  .action(async (options) => {
    const adapter = new IndexedFileAdapter({
      outputDir: options.dir,
      persistIntervalMs: 5000
    });

    const server = new TelemetryServer({
      adapter,
      port: parseInt(options.port)
    });

    await server.start();
    console.log(`Telemetry UI: http://localhost:${options.port}`);
  });

program.parse();
