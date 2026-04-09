import { TargetArchitecture, AgentSpec, ModuleSpec } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class SpecParser {
  private cache: TargetArchitecture | null = null;
  private cacheKey: string | null = null;

  constructor(private projectPath: string) {}

  async parse(): Promise<TargetArchitecture> {
    const agentsMdPath = path.join(this.projectPath, 'AGENTS.md');
    const architectureMdPath = path.join(this.projectPath, 'ARCHITECTURE.md');

    // First, check if we can use cached result without reading files
    // This requires getting file stats to detect changes
    let agentsMdStats: { mtime: Date; size: number } | null = null;
    let architectureMdStats: { mtime: Date; size: number } | null = null;

    try {
      const stats = await fs.stat(agentsMdPath);
      agentsMdStats = { mtime: stats.mtime, size: stats.size };
    } catch {
      // AGENTS.md doesn't exist
    }

    try {
      const stats = await fs.stat(architectureMdPath);
      architectureMdStats = { mtime: stats.mtime, size: stats.size };
    } catch {
      // ARCHITECTURE.md doesn't exist
    }

    // Check cache using file stats (cheaper than reading content)
    const statsKey = this.hashContent(
      JSON.stringify(agentsMdStats) + JSON.stringify(architectureMdStats)
    );
    
    if (this.cache && this.cacheKey === statsKey) {
      return this.cache;
    }

    // Read file contents
    let agentsMdContent = '';
    let architectureMdContent = '';

    try {
      if (agentsMdStats) {
        agentsMdContent = await fs.readFile(agentsMdPath, 'utf-8');
      }
    } catch {
      // AGENTS.md 未找到
    }

    try {
      if (architectureMdStats) {
        architectureMdContent = await fs.readFile(architectureMdPath, 'utf-8');
      }
    } catch {
      // ARCHITECTURE.md 未找到
    }

    const agents = await this.parseAgentsMd(agentsMdContent);
    const modules = await this.parseArchitectureMd(architectureMdContent);

    const hasNoDocs = !agentsMdContent && !architectureMdContent;

    const result: TargetArchitecture = {
      version: hasNoDocs ? '0.0.0' : '1.0.0',
      parsedAt: new Date(),
      agents,
      modules,
      interfaces: [],
      dataModels: [],
      workflows: []
    };

    // 更新缓存 (using stats key)
    this.cache = result;
    this.cacheKey = statsKey;

    return result;
  }

  async parseAgentsMd(content: string): Promise<AgentSpec[]> {
    if (!content.trim()) {
      return [];
    }

    const agents: AgentSpec[] = [];
    const sections = this.splitByHeaders(content);

    for (const section of sections) {
      const agent = this.extractAgentFromSection(section);
      if (agent) {
        agents.push(agent);
      }
    }

    return agents;
  }

  private async parseArchitectureMd(content: string): Promise<ModuleSpec[]> {
    if (!content.trim()) {
      return [];
    }

    const modules: ModuleSpec[] = [];
    // 基于 ### 标题的简单提取
    const lines = content.split('\n');
    let currentModule: Partial<ModuleSpec> | null = null;
    let currentSection: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('### ')) {
        if (currentModule && currentModule.name) {
          modules.push(this.finalizeModule(currentModule));
        }
        currentModule = {
          name: line.replace('### ', '').trim(),
          description: '',
          layer: 'service',
          exposedInterfaces: [],
          dependencies: [],
          expectedFiles: [],
          acceptanceCriteria: []
        };
        currentSection = null;
      } else if (currentModule) {
        if (line.startsWith('**Layer:**')) {
          currentModule.layer = line.replace('**Layer:**', '').trim() as any;
          currentSection = null;
        } else if (line.startsWith('**Description:**')) {
          currentModule.description = line.replace('**Description:**', '').trim();
          currentSection = null;
        } else if (line.includes('Interfaces:')) {
          currentSection = 'interfaces';
        } else if (line.includes('Dependencies:')) {
          currentSection = 'dependencies';
        } else if (line.includes('Criteria:')) {
          currentSection = 'criteria';
        } else if (line.startsWith('- ') && currentSection === 'interfaces') {
          currentModule.exposedInterfaces!.push(line.replace('- ', '').trim());
        } else if (line.startsWith('- ') && currentSection === 'dependencies') {
          currentModule.dependencies!.push(line.replace('- ', '').trim());
        } else if (line.startsWith('- ') && currentSection === 'criteria') {
          currentModule.acceptanceCriteria!.push(line.replace('- ', '').trim());
        } else if (line.startsWith('**') && line.endsWith('**')) {
          // New section header
          currentSection = null;
        }
      }
    }

    if (currentModule && currentModule.name) {
      modules.push(this.finalizeModule(currentModule));
    }

    return modules;
  }

  private splitByHeaders(content: string): string[] {
    const sections: string[] = [];
    const lines = content.split('\n');
    let currentSection: string[] = [];

    for (const line of lines) {
      if (line.startsWith('## ') && currentSection.length > 0) {
        sections.push(currentSection.join('\n'));
        currentSection = [line];
      } else {
        currentSection.push(line);
      }
    }

    if (currentSection.length > 0) {
      sections.push(currentSection.join('\n'));
    }

    return sections;
  }

  private extractAgentFromSection(section: string): AgentSpec | null {
    const lines = section.split('\n');
    const headerLine = lines.find(l => l.startsWith('## '));

    if (!headerLine) return null;

    const name = headerLine.replace('## ', '').trim();
    const responsibilities: string[] = [];
    const skills: string[] = [];

    let inResponsibilities = false;
    let inSkills = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.includes('Responsibilities')) {
        inResponsibilities = true;
        inSkills = false;
        continue;
      }

      if (trimmed.includes('Skills')) {
        inSkills = true;
        inResponsibilities = false;
        continue;
      }

      if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
        inResponsibilities = false;
        inSkills = false;
        continue;
      }

      if (trimmed.startsWith('- ') && inResponsibilities) {
        responsibilities.push(trimmed.replace('- ', ''));
      }

      if (trimmed.startsWith('- ') && inSkills) {
        skills.push(trimmed.replace('- ', ''));
      }
    }

    return {
      name,
      description: '',
      responsibilities,
      skills,
      expectedFiles: [`src/lib/ai/agents/${name}.ts`],
      dependencies: []
    };
  }

  private finalizeModule(partial: Partial<ModuleSpec>): ModuleSpec {
    return {
      name: partial.name || 'Unknown',
      description: partial.description || '',
      layer: partial.layer || 'service',
      exposedInterfaces: partial.exposedInterfaces || [],
      dependencies: partial.dependencies || [],
      expectedFiles: partial.expectedFiles || [],
      acceptanceCriteria: partial.acceptanceCriteria || []
    };
  }

  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}
