import { promises as fs } from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import ora from 'ora';
import { TemplateManager, TemplateContext } from '../templates/TemplateManager';
import { Logger } from '../utils/Logger';
import { BusinessAnalyzer } from '../services/BusinessAnalyzer';
import { BusinessAnalysis } from './types';
import * as Handlebars from 'handlebars';

export interface InitOptions {
  force?: boolean;
  template?: string;
  projectName?: string;
  skipInstall?: boolean;
  skipAnalysis?: boolean;  // 新增
  autoStart?: boolean;     // 新增
}

export class InitCommand {
  private logger: Logger;
  private templateManager: TemplateManager;

  constructor() {
    this.logger = new Logger();
    this.templateManager = new TemplateManager();
  }

  async execute(options: InitOptions): Promise<void> {
    console.log('🚀 Harness 项目初始化\n');

    // 1. 列出可用模板
    const templates = await this.templateManager.listTemplates();
    if (templates.length === 0) {
      console.error('❌ 没有找到可用模板');
      return;
    }

    // 检测是否在 TTY 环境（交互式终端）
    const isInteractive = process.stdin.isTTY && process.stdout.isTTY;

    // 2. 选择模板
    let templateName = options.template || '';
    if (!templateName) {
      if (isInteractive) {
        const { selectedTemplate } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedTemplate',
            message: '选择项目模板:',
            choices: templates.map(t => ({
              name: `${t.name} - ${t.description}`,
              value: t.name
            }))
          }
        ]);
        templateName = selectedTemplate;
      } else {
        // 非交互模式：使用第一个模板
        templateName = templates[0].name;
        console.log(`使用默认模板: ${templateName}`);
      }
    }

    const template = await this.templateManager.getTemplate(templateName);
    if (!template) {
      console.error(`❌ 模板不存在: ${templateName}`);
      return;
    }

    // 3. 输入项目信息
    let projectName = options.projectName || '';
    if (!projectName) {
      if (isInteractive) {
        const { inputName } = await inquirer.prompt([
          {
            type: 'input',
            name: 'inputName',
            message: '项目名称:',
            validate: (input: string) => input.trim() !== '' || '项目名称不能为空'
          }
        ]);
        projectName = inputName;
      } else {
        console.error('❌ 非交互模式需要提供项目名称');
        return;
      }
    }

    // 4. 收集模板变量
    const context: TemplateContext = {
      projectName: projectName.trim(),
      projectDescription: '',
      author: '',
      version: '1.0.0'
    };

    for (const variable of template.variables) {
      if (variable.name === 'projectName') {
        context[variable.name] = context.projectName;
        continue;
      }

      if (isInteractive) {
        // 交互模式：提示用户输入
        const { value } = await inquirer.prompt([
          {
            type: 'input',
            name: 'value',
            message: variable.description + ':',
            default: variable.default || undefined
          }
        ]);
        context[variable.name] = value;
      } else {
        // 非交互模式：使用默认值
        context[variable.name] = variable.default || '';
      }
    }

    // 4.5 智能业务分析（如果未跳过）
    let businessAnalysis: BusinessAnalysis | undefined;
    if (!options.skipAnalysis && isInteractive) {
      const { enableSmartAnalysis } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'enableSmartAnalysis',
          message: '是否启用智能业务分析（推荐）?',
          default: true
        }
      ]);

      if (enableSmartAnalysis) {
        // 输入项目概述
        const { overview } = await inquirer.prompt([
          {
            type: 'input',
            name: 'overview',
            message: '项目概述（一句话描述业务目标）:',
            validate: (input: string) => input.trim().length > 10 || '请提供更详细的描述（至少10个字符）'
          }
        ]);

        // 获取 LLM 配置
        const llmConfig = await this.loadLLMConfig();
        if (llmConfig) {
          const analyzer = new BusinessAnalyzer(llmConfig);
          
          const spinner = ora('正在进行业务分析...').start();
          try {
            businessAnalysis = await analyzer.analyze({
              projectName: context.projectName,
              overview,
              template: templateName
            });
            spinner.succeed('业务分析完成!');
          } catch (error) {
            spinner.fail('业务分析失败，使用基础模板');
            console.error(error);
          }
        } else {
          console.log('⚠️ 未配置 LLM API Key，跳过智能分析');
        }
      }
    }

    // 5. 确认目标目录
    const targetDir = path.isAbsolute(context.projectName) 
      ? context.projectName 
      : path.join(process.cwd(), context.projectName);
    
    try {
      await fs.access(targetDir);
      if (!options.force) {
        if (isInteractive) {
          const { overwrite } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overwrite',
              message: `目录 ${context.projectName} 已存在，是否覆盖?`,
              default: false
            }
          ]);
          if (!overwrite) {
            console.log('❌ 已取消');
            return;
          }
        } else {
          // 非交互模式：如果目录存在且没有 --force，直接报错
          console.error(`❌ 目录 ${context.projectName} 已存在，使用 --force 覆盖`);
          return;
        }
      }
    } catch {
      // 目录不存在，继续
    }

    // 6. 创建项目
    const spinner = ora('正在创建项目...').start();
    
    try {
      await this.templateManager.scaffold(templateName, targetDir, context);
      spinner.succeed('项目创建成功!');

      // 生成智能文档
      if (businessAnalysis) {
        const docSpinner = ora('正在生成智能文档...').start();
        try {
          await this.generateSmartDocs(targetDir, businessAnalysis);
          docSpinner.succeed('智能文档生成完成!');
        } catch (error) {
          docSpinner.fail('智能文档生成失败');
          console.error(error);
        }
      }

      // 7. 询问是否立即启动自动化开发
      if (!options.autoStart && isInteractive && businessAnalysis) {
        const { startLoop } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'startLoop',
            message: '是否立即启动自动化开发 (harness loop)?',
            default: true
          }
        ]);

        if (startLoop) {
          console.log('\n🚀 正在启动自动化开发...\n');
          const { LoopController } = await import('../core/LoopController');
          const { ConfigLoader } = await import('../utils/ConfigLoader');
          
          const config = await ConfigLoader.load(path.join(targetDir, '.harness/config.yaml'));
          const controller = new LoopController(config);
          
          // 在新目录中启动 loop
          process.chdir(targetDir);
          await controller.start({ maxDuration: 6 * 60 * 60 * 1000 });
          return; // 不显示后续步骤
        }
      }

      // 如果指定了 --auto-start 参数
      if (options.autoStart && businessAnalysis) {
        console.log('\n🚀 正在启动自动化开发...\n');
        const { LoopController } = await import('../core/LoopController');
        const { ConfigLoader } = await import('../utils/ConfigLoader');
        
        const config = await ConfigLoader.load(path.join(targetDir, '.harness/config.yaml'));
        const controller = new LoopController(config);
        
        process.chdir(targetDir);
        await controller.start({ maxDuration: 6 * 60 * 60 * 1000 });
        return;
      }

      // 8. 安装依赖（可选）
      if (!options.skipInstall && isInteractive) {
        const { install } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'install',
            message: '是否立即安装依赖?',
            default: true
          }
        ]);

        if (install) {
          spinner.start('安装依赖中...');
          try {
            await this.installDependencies(targetDir, templateName);
            spinner.succeed('依赖安装完成!');
          } catch (error) {
            spinner.fail('依赖安装失败，请手动安装');
          }
        }
      }

      // 9. 显示后续步骤
      console.log('\n✅ 项目初始化完成!\n');
      console.log('后续步骤:');
      console.log(`  cd ${context.projectName}`);
      if (options.skipInstall) {
        console.log(`  ${this.getInstallCommand(templateName)}`);
      }
      console.log('  编辑 .harness/config.yaml，配置 LLM API 密钥');
      console.log('  编辑 AGENTS.md，完善项目信息');
      console.log('  运行: harness loop\n');

    } catch (error) {
      spinner.fail(`项目创建失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async installDependencies(targetDir: string, templateName: string): Promise<void> {
    const { exec } = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(exec);

    const command = this.getInstallCommand(templateName);
    await execPromise(command, { cwd: targetDir });
  }

  private getInstallCommand(templateName: string): string {
    switch (templateName) {
      case 'node-ts':
        return 'npm install';
      case 'python':
        return 'pip install -e ".[dev]"';
      default:
        return 'npm install';
    }
  }

  /**
   * 加载 LLM 配置
   */
  private async loadLLMConfig(): Promise<{ apiKey: string; provider: 'openai' | 'kimi' | 'anthropic'; baseUrl?: string } | null> {
    try {
      // 从环境变量读取
      const openaiKey = process.env.OPENAI_API_KEY;
      const kimiKey = process.env.KIMI_API_KEY;
      const anthropicKey = process.env.ANTHROPIC_API_KEY;

      // 优先检测 OpenAI
      if (openaiKey) {
        return {
          apiKey: openaiKey,
          provider: 'openai',
          baseUrl: process.env.OPENAI_BASE_URL
        };
      }

      // 检测 Anthropic（兼容 Kimi Coding 等）
      if (anthropicKey) {
        return {
          apiKey: anthropicKey,
          provider: 'anthropic',
          baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.kimi.com/coding'
        };
      }

      // 原生 Kimi
      if (kimiKey) {
        return {
          apiKey: kimiKey,
          provider: 'kimi',
          baseUrl: process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1'
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 生成智能文档
   */
  private async generateSmartDocs(targetDir: string, analysis: BusinessAnalysis): Promise<void> {
    // 注册 Handlebars 辅助函数
    Handlebars.registerHelper('eq', (a, b) => a === b);

    // 读取模板
    const agentsTemplatePath = path.join(__dirname, '../templates/smart-agents.md.hbs');
    const businessTemplatePath = path.join(__dirname, '../templates/business.md.hbs');
    const architectureTemplatePath = path.join(__dirname, '../templates/architecture.md.hbs');
    const taskTemplatePath = path.join(__dirname, '../templates/initial-task.yaml.hbs');

    const agentsTemplateSource = await fs.readFile(agentsTemplatePath, 'utf-8');
    const businessTemplateSource = await fs.readFile(businessTemplatePath, 'utf-8');
    const architectureTemplateSource = await fs.readFile(architectureTemplatePath, 'utf-8');
    const taskTemplateSource = await fs.readFile(taskTemplatePath, 'utf-8');

    // 编译模板
    const agentsTemplate = Handlebars.compile(agentsTemplateSource);
    const businessTemplate = Handlebars.compile(businessTemplateSource);
    const architectureTemplate = Handlebars.compile(architectureTemplateSource);
    const taskTemplate = Handlebars.compile(taskTemplateSource);

    // 生成简洁的 AGENTS.md（80-120行）
    const agentsContent = agentsTemplate(analysis);
    await fs.writeFile(path.join(targetDir, 'AGENTS.md'), agentsContent, 'utf-8');

    // 创建 docs 目录
    const docsDir = path.join(targetDir, 'docs');
    await fs.mkdir(docsDir, { recursive: true });

    // 生成详细的业务描述文档
    const businessContent = businessTemplate(analysis);
    await fs.writeFile(path.join(docsDir, 'BUSINESS.md'), businessContent, 'utf-8');

    // 生成架构文档
    const architectureContent = architectureTemplate(analysis);
    await fs.writeFile(path.join(docsDir, 'ARCHITECTURE.md'), architectureContent, 'utf-8');

    // 创建任务目录
    const tasksDir = path.join(targetDir, '.harness', 'tasks');
    await fs.mkdir(tasksDir, { recursive: true });

    // 生成初始任务文件
    const tasksContent = taskTemplate(analysis);
    await fs.writeFile(path.join(tasksDir, '001-initial-tasks.yaml'), tasksContent, 'utf-8');
  }
}
