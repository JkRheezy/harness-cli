import * as fs from 'fs/promises';
import * as path from 'path';
import Handlebars from 'handlebars';
import { DocumentationInput, AgentsMdContent, DocumentationResult } from './types';
import { Logger } from '../utils/Logger';

export class AgentsMdGenerator {
  private logger: Logger;
  private template: Handlebars.TemplateDelegate | undefined;

  constructor() {
    this.logger = new Logger();
    this.registerHelpers();
  }

  async loadTemplate(): Promise<void> {
    const templatePath = path.join(__dirname, 'templates', 'agents-md.hbs');
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    this.template = Handlebars.compile(templateContent);
  }

  async generate(input: DocumentationInput): Promise<DocumentationResult> {
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
    } catch (error) {
      this.logger.error('Failed to generate AGENTS.md:', error);
      return {
        success: false,
        filesCreated: [],
        filesModified: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private buildContent(input: DocumentationInput): AgentsMdContent {
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

  private formatTechStack(techStack: DocumentationInput['techStack']): string {
    const parts = [techStack.language];
    if (techStack.frontend) parts.push(techStack.frontend);
    if (techStack.backend) parts.push(techStack.backend);
    if (techStack.database) parts.push(techStack.database);
    return parts.join(' + ');
  }

  private generateSetupCommands(input: DocumentationInput): string[] {
    const commands = ['# 克隆仓库', `git clone <repo-url> ${input.projectName}`, `cd ${input.projectName}`, '', '# 安装依赖'];
    if (input.techStack.language === 'typescript') commands.push('npm install');
    if (input.techStack.database === 'postgresql') commands.push('npx prisma migrate dev');
    return commands;
  }

  private generateStartCommand(input: DocumentationInput): string {
    if (input.techStack.frontend === 'nextjs') return 'npm run dev';
    return 'npm start';
  }

  private generateCommonTasks(input: DocumentationInput): Array<{name: string, steps: string[]}> {
    return [
      { name: '添加新功能', steps: ['阅读相关设计文档', '在指定目录实现（遵循六层架构）', '遵循编码规范', '运行测试'] },
      { name: '修复 Bug', steps: ['查看问题追踪', '编写回归测试', '实施修复', '验证通过'] }
    ];
  }

  private generateConstraints(input: DocumentationInput): Array<{type: 'must' | 'must-not' | 'should' | 'warning', description: string}> {
    return [
      { type: 'must-not', description: '不要违反层依赖规则（下层禁止依赖上层）' },
      { type: 'must', description: '必须为新功能编写测试' },
      { type: 'must', description: '必须更新相关文档' },
      { type: 'warning', description: '注意保持 AGENTS.md 精简' }
    ];
  }

  private registerHelpers(): void {
    Handlebars.registerHelper('eq', (a, b) => a === b);
  }
}

export default AgentsMdGenerator;
