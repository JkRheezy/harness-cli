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
exports.InitCommand = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const inquirer_1 = __importDefault(require("inquirer"));
const ora_1 = __importDefault(require("ora"));
const TemplateManager_1 = require("../templates/TemplateManager");
const Logger_1 = require("../utils/Logger");
class InitCommand {
    constructor() {
        this.logger = new Logger_1.Logger();
        this.templateManager = new TemplateManager_1.TemplateManager();
    }
    async execute(options) {
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
                const { selectedTemplate } = await inquirer_1.default.prompt([
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
            }
            else {
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
                const { inputName } = await inquirer_1.default.prompt([
                    {
                        type: 'input',
                        name: 'inputName',
                        message: '项目名称:',
                        validate: (input) => input.trim() !== '' || '项目名称不能为空'
                    }
                ]);
                projectName = inputName;
            }
            else {
                console.error('❌ 非交互模式需要提供项目名称');
                return;
            }
        }
        // 4. 收集模板变量
        const context = {
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
                const { value } = await inquirer_1.default.prompt([
                    {
                        type: 'input',
                        name: 'value',
                        message: variable.description + ':',
                        default: variable.default || undefined
                    }
                ]);
                context[variable.name] = value;
            }
            else {
                // 非交互模式：使用默认值
                context[variable.name] = variable.default || '';
            }
        }
        // 5. 确认目标目录
        const targetDir = path_1.default.isAbsolute(context.projectName)
            ? context.projectName
            : path_1.default.join(process.cwd(), context.projectName);
        try {
            await fs_1.promises.access(targetDir);
            if (!options.force) {
                if (isInteractive) {
                    const { overwrite } = await inquirer_1.default.prompt([
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
                }
                else {
                    // 非交互模式：如果目录存在且没有 --force，直接报错
                    console.error(`❌ 目录 ${context.projectName} 已存在，使用 --force 覆盖`);
                    return;
                }
            }
        }
        catch {
            // 目录不存在，继续
        }
        // 6. 创建项目
        const spinner = (0, ora_1.default)('正在创建项目...').start();
        try {
            await this.templateManager.scaffold(templateName, targetDir, context);
            spinner.succeed('项目创建成功!');
            // 7. 安装依赖（可选）
            if (!options.skipInstall && isInteractive) {
                const { install } = await inquirer_1.default.prompt([
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
                    }
                    catch (error) {
                        spinner.fail('依赖安装失败，请手动安装');
                    }
                }
            }
            // 8. 显示后续步骤
            console.log('\n✅ 项目初始化完成!\n');
            console.log('后续步骤:');
            console.log(`  cd ${context.projectName}`);
            if (options.skipInstall) {
                console.log(`  ${this.getInstallCommand(templateName)}`);
            }
            console.log('  编辑 .harness/config.yaml，配置 LLM API 密钥');
            console.log('  编辑 AGENTS.md，完善项目信息');
            console.log('  运行: harness loop\n');
        }
        catch (error) {
            spinner.fail(`项目创建失败: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async installDependencies(targetDir, templateName) {
        const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const util = await Promise.resolve().then(() => __importStar(require('util')));
        const execPromise = util.promisify(exec);
        const command = this.getInstallCommand(templateName);
        await execPromise(command, { cwd: targetDir });
    }
    getInstallCommand(templateName) {
        switch (templateName) {
            case 'node-ts':
                return 'npm install';
            case 'python':
                return 'pip install -e ".[dev]"';
            default:
                return 'npm install';
        }
    }
}
exports.InitCommand = InitCommand;
//# sourceMappingURL=InitCommand.js.map