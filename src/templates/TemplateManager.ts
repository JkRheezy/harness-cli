import { promises as fs } from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { Logger } from '../utils/Logger';

export interface TemplateConfig {
  name: string;
  description: string;
  version: string;
  path: string;
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  description: string;
  default?: string;
  required?: boolean;
}

export interface TemplateContext {
  projectName: string;
  projectDescription?: string;
  author?: string;
  version?: string;
  [key: string]: any;
}

export class TemplateManager {
  private templatesDir: string;
  private logger: Logger;

  constructor() {
    // 优先使用本地 templates，否则使用已安装的包中的 templates
    this.templatesDir = this.resolveTemplatesDir();
    this.logger = new Logger();
  }

  private resolveTemplatesDir(): string {
    // 生产环境：使用包内的 templates（相对于当前文件的位置）
    // __dirname 是 dist/templates/，所以向上两级到项目根目录
    const packageTemplates = path.join(__dirname, '..', '..', 'templates');
    
    return packageTemplates;
  }

  async listTemplates(): Promise<TemplateConfig[]> {
    try {
      const entries = await fs.readdir(this.templatesDir, { withFileTypes: true });
      const templates: TemplateConfig[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const configPath = path.join(this.templatesDir, entry.name, 'template.json');
          try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            templates.push({
              ...config,
              path: path.join(this.templatesDir, entry.name)
            });
          } catch {
            // 跳过无效的模板
          }
        }
      }

      return templates;
    } catch (error) {
      this.logger.error('无法读取模板列表:', error);
      return [];
    }
  }

  async getTemplate(name: string): Promise<TemplateConfig | null> {
    const templates = await this.listTemplates();
    return templates.find(t => t.name === name) || null;
  }

  async scaffold(
    templateName: string,
    targetDir: string,
    context: TemplateContext
  ): Promise<void> {
    const template = await this.getTemplate(templateName);
    if (!template) {
      throw new Error(`模板不存在: ${templateName}`);
    }

    this.logger.info(`📦 使用模板: ${template.name}`);
    this.logger.info(`🎯 目标目录: ${targetDir}`);

    // 确保目标目录存在
    await fs.mkdir(targetDir, { recursive: true });

    // 复制并渲染模板文件
    await this.copyTemplate(template.path, targetDir, context);

    this.logger.info('✅ 项目创建完成！');
  }

  private async copyTemplate(
    sourceDir: string,
    targetDir: string,
    context: TemplateContext
  ): Promise<void> {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);

      // 跳过模板配置文件
      if (entry.name === 'template.json') continue;

      if (entry.isDirectory()) {
        await fs.mkdir(targetPath, { recursive: true });
        await this.copyTemplate(sourcePath, targetPath, context);
      } else {
        await this.processFile(sourcePath, targetPath, context);
      }
    }
  }

  private async processFile(
    sourcePath: string,
    targetPath: string,
    context: TemplateContext
  ): Promise<void> {
    const content = await fs.readFile(sourcePath, 'utf-8');

    // 检查是否是模板文件 (以 .hbs 结尾)
    if (sourcePath.endsWith('.hbs')) {
      // 渲染 Handlebars 模板
      const template = Handlebars.compile(content);
      const rendered = template(context);
      
      // 移除 .hbs 后缀
      const finalPath = targetPath.replace(/\.hbs$/, '');
      await fs.writeFile(finalPath, rendered, 'utf-8');
    } else {
      // 直接复制
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}
