import { AgentsMdGenerator } from './AgentsMdGenerator';
import { ArchitectureDocGenerator } from './ArchitectureDocGenerator';
import { DocumentationInput, DocumentationResult } from './types';
import { Logger } from '../utils/Logger';

/**
 * Main orchestrator for documentation generation
 * Generates complete knowledge base for Harness projects
 */
export class DocumentationGenerator {
  private agentsMdGenerator: AgentsMdGenerator;
  private architectureDocGenerator: ArchitectureDocGenerator;
  private logger: Logger;

  constructor() {
    this.agentsMdGenerator = new AgentsMdGenerator();
    this.architectureDocGenerator = new ArchitectureDocGenerator();
    this.logger = new Logger();
  }

  /**
   * Generate complete documentation knowledge base
   */
  async generate(input: DocumentationInput): Promise<DocumentationResult> {
    this.logger.info(`Generating documentation for ${input.projectName}`);

    const results: DocumentationResult[] = [];

    // Generate AGENTS.md (entry point)
    results.push(await this.agentsMdGenerator.generate(input));

    // Generate ARCHITECTURE.md
    results.push(await this.architectureDocGenerator.generate(input));

    // Generate additional docs directory structure
    await this.generateDocStructure(input);

    // Aggregate results
    const allCreated: string[] = [];
    const allModified: string[] = [];
    const errors: string[] = [];

    for (const result of results) {
      allCreated.push(...result.filesCreated);
      allModified.push(...result.filesModified);
      if (result.error) errors.push(result.error);
    }

    if (errors.length > 0) {
      return {
        success: false,
        filesCreated: allCreated,
        filesModified: allModified,
        error: errors.join('; ')
      };
    }

    return {
      success: true,
      filesCreated: allCreated,
      filesModified: allModified
    };
  }

  private async generateDocStructure(input: DocumentationInput): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const docsDir = path.join(input.targetDir, 'docs');

    // Create subdirectories
    const subdirs = ['design-docs', 'exec-plans', 'product-specs', 'references'];
    for (const subdir of subdirs) {
      await fs.mkdir(path.join(docsDir, subdir), { recursive: true });
    }

    // Create exec-plans subdirectories
    await fs.mkdir(path.join(docsDir, 'exec-plans', 'active'), { recursive: true });
    await fs.mkdir(path.join(docsDir, 'exec-plans', 'completed'), { recursive: true });

    // Create placeholder files
    await fs.writeFile(
      path.join(docsDir, 'design-docs', 'index.md'),
      '# 设计文档\n\n本文档包含项目的核心设计理念和架构模式。\n',
      'utf-8'
    );

    await fs.writeFile(
      path.join(docsDir, 'exec-plans', 'active', '.gitkeep'),
      '',
      'utf-8'
    );

    await fs.writeFile(
      path.join(docsDir, 'exec-plans', 'completed', '.gitkeep'),
      '',
      'utf-8'
    );

    await fs.writeFile(
      path.join(docsDir, 'product-specs', 'index.md'),
      '# 产品规范\n\n本文档包含产品功能规范和用户流程定义。\n',
      'utf-8'
    );

    await fs.writeFile(
      path.join(docsDir, 'references', '.gitkeep'),
      '',
      'utf-8'
    );
  }
}

export default DocumentationGenerator;
