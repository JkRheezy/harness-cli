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
exports.AgentsMdGenerator = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const handlebars_1 = __importDefault(require("handlebars"));
const Logger_1 = require("../utils/Logger");
class AgentsMdGenerator {
    constructor() {
        this.logger = new Logger_1.Logger();
        this.registerHelpers();
    }
    async loadTemplate() {
        try {
            const templatePath = path.join(__dirname, 'templates', 'agents-md.hbs');
            const templateContent = await fs.readFile(templatePath, 'utf-8');
            this.template = handlebars_1.default.compile(templateContent);
        }
        catch (error) {
            throw new Error(`Failed to load AGENTS.md template: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async generate(input) {
        try {
            await this.loadTemplate();
            if (!this.template) {
                throw new Error('Failed to load template');
            }
            const content = this.buildContent(input);
            const rendered = this.template(content);
            const outputPath = path.join(input.targetDir, 'AGENTS.md');
            await fs.writeFile(outputPath, rendered, 'utf-8');
            this.logger.info(`Generated AGENTS.md at ${outputPath}`);
            return {
                success: true,
                filesCreated: ['AGENTS.md'],
                filesModified: []
            };
        }
        catch (error) {
            this.logger.error('Failed to generate AGENTS.md:', error);
            return {
                success: false,
                filesCreated: [],
                filesModified: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    buildContent(input) {
        return {
            projectName: input.projectName,
            description: input.description,
            techStack: this.formatTechStack(input.techStack),
            quickStart: {
                setupCommands: this.generateSetupCommands(input),
                startCommand: this.generateStartCommand(input)
            },
            documentMap: [
                { document: '架构总览', path: 'docs/ARCHITECTURE.md', readingTime: '5 min', description: '六层架构详解和质量评分' },
                { document: '设计理念', path: 'docs/design-docs/', readingTime: '15 min', description: '核心信念和设计模式' },
                { document: '执行计划', path: 'docs/exec-plans/', readingTime: '10 min', description: '活跃计划和已完成计划' },
                { document: '产品规范', path: 'docs/product-specs/', readingTime: '15 min', description: '功能规范和用户流程' }
            ],
            commonTasks: this.generateCommonTasks(input),
            constraints: this.generateConstraints(input)
        };
    }
    formatTechStack(techStack) {
        const parts = [techStack.language];
        if (techStack.frontend)
            parts.push(techStack.frontend);
        if (techStack.backend)
            parts.push(techStack.backend);
        if (techStack.database)
            parts.push(techStack.database);
        return parts.join(' + ');
    }
    generateSetupCommands(input) {
        const commands = ['# 克隆仓库', `git clone <repo-url> ${input.projectName}`, `cd ${input.projectName}`, '', '# 安装依赖'];
        if (input.techStack.language === 'typescript')
            commands.push('npm install');
        if (input.techStack.database === 'postgresql')
            commands.push('npx prisma migrate dev');
        return commands;
    }
    generateStartCommand(input) {
        if (input.techStack.frontend === 'nextjs')
            return 'npm run dev';
        return 'npm start';
    }
    generateCommonTasks(input) {
        return [
            { name: '添加新功能', steps: ['阅读相关设计文档', '在指定目录实现（遵循六层架构）', '遵循编码规范', '运行测试'] },
            { name: '修复 Bug', steps: ['查看问题追踪', '编写回归测试', '实施修复', '验证通过'] }
        ];
    }
    generateConstraints(input) {
        return [
            { type: 'must-not', description: '不要违反层依赖规则（下层禁止依赖上层）' },
            { type: 'must', description: '必须为新功能编写测试' },
            { type: 'must', description: '必须更新相关文档' },
            { type: 'warning', description: '注意保持 AGENTS.md 精简' }
        ];
    }
    registerHelpers() {
        handlebars_1.default.registerHelper('eq', (a, b) => a === b);
    }
}
exports.AgentsMdGenerator = AgentsMdGenerator;
exports.default = AgentsMdGenerator;
//# sourceMappingURL=AgentsMdGenerator.js.map