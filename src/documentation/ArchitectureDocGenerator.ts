import * as fs from 'fs/promises';
import * as path from 'path';
import Handlebars from 'handlebars';
import { DocumentationInput, ArchitectureDocContent, DocumentationResult } from './types';
import { Logger } from '../utils/Logger';

export class ArchitectureDocGenerator {
  private logger: Logger;
  private template: Handlebars.TemplateDelegate | undefined;

  constructor() {
    this.logger = new Logger();
  }

  async loadTemplate(): Promise<void> {
    try {
      const templatePath = path.join(__dirname, 'templates', 'architecture-md.hbs');
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      this.template = Handlebars.compile(templateContent);
    } catch (error) {
      throw new Error(`Failed to load architecture template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generate(input: DocumentationInput): Promise<DocumentationResult> {
    try {
      await this.loadTemplate();
      
      const content = this.buildContent(input);
      const rendered = this.template!(content);
      
      const docsDir = path.join(input.targetDir, 'docs');
      await fs.mkdir(docsDir, { recursive: true });
      
      const outputPath = path.join(docsDir, 'ARCHITECTURE.md');
      await fs.writeFile(outputPath, rendered, 'utf-8');
      
      this.logger.info(`Generated ARCHITECTURE.md at ${outputPath}`);
      
      return {
        success: true,
        filesCreated: ['docs/ARCHITECTURE.md'],
        filesModified: []
      };
    } catch (error) {
      this.logger.error('Failed to generate ARCHITECTURE.md:', error);
      return {
        success: false,
        filesCreated: [],
        filesModified: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private buildContent(input: DocumentationInput): ArchitectureDocContent {
    return {
      projectName: input.projectName,
      overview: this.generateOverview(input),
      layers: this.generateLayerInfo(input),
      qualityScore: this.generateQualityScore(input),
      crossCutting: this.generateCrossCutting(input),
      layerComplexity: {},
      layerIssues: {}
    };
  }

  private generateOverview(input: DocumentationInput): string {
    return `${input.projectName} 采用六层分层架构（Types → Config → Repo → Service → Runtime → UI），` +
      `严格遵循依赖方向规则。每层有明确的职责边界，上层可以依赖下层，下层禁止依赖上层。` +
      `这种架构为 AI Agent 提供了清晰的导航和约束。`;
  }

  private generateLayerInfo(input: DocumentationInput): Array<{
    name: string;
    description: string;
    directory: string;
    dependencies: string[];
    quality: { coverage: number; complexity: 'low' | 'medium' | 'high'; issues: string[] };
  }> {
    const layerDescriptions: Record<string, string> = {
      types: '领域模型、类型定义、接口契约',
      config: '配置定义、验证、加载',
      repo: '数据访问、存储抽象',
      service: '业务服务、工作流编排',
      runtime: 'Agent 执行、任务调度、状态管理',
      ui: 'API 接口、CLI、Web 界面'
    };

    return input.architecture.layers.map((layer, index) => {
      const dependencies = index === 0 ? [] : input.architecture.layers.slice(0, index);
      return {
        name: layer,
        description: layerDescriptions[layer] || `${layer} 层`,
        directory: `src/${layer}`,
        dependencies,
        quality: {
          coverage: 0,
          complexity: 'low',
          issues: []
        }
      };
    });
  }

  private generateQualityScore(input: DocumentationInput) {
    return {
      overall: 0,
      byLayer: input.architecture.layers.reduce((acc, layer) => {
        acc[layer] = 0;
        return acc;
      }, {} as Record<string, number>),
      gaps: input.architecture.layers.map(layer => ({
        layer,
        issue: '初始状态，等待评估',
        severity: 'low' as const
      }))
    };
  }

  private generateCrossCutting(input: DocumentationInput): Array<{name: string, description: string, implementation: string}> {
    return [
      { name: '认证 (Auth)', description: '用户认证和权限管理', implementation: 'src/config/auth.ts' },
      { name: '遥测 (Telemetry)', description: '日志、指标、追踪', implementation: 'src/config/telemetry.ts' },
      { name: '错误处理', description: '统一错误处理和恢复', implementation: 'src/runtime/error-handler.ts' }
    ];
  }
}

export default ArchitectureDocGenerator;
