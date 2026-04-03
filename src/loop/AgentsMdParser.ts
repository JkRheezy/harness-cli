import * as fs from 'fs/promises';
import * as path from 'path';
import { ParsedAgentsMd, ParsedDocumentMap, ParsedCommonTask, ParsedConstraint } from './types';
import { Logger } from '../utils/Logger';

/**
 * Parses AGENTS.md to extract structured information
 * Enables document-driven development
 */
export class AgentsMdParser {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Parse AGENTS.md file
   */
  async parse(projectPath: string): Promise<ParsedAgentsMd> {
    const agentsMdPath = path.join(projectPath, 'AGENTS.md');
    
    try {
      const content = await fs.readFile(agentsMdPath, 'utf-8');
      return this.parseContent(content);
    } catch (error) {
      this.logger.error(`Failed to parse AGENTS.md at ${agentsMdPath}:`, error);
      throw new Error(`AGENTS.md not found or unreadable at ${agentsMdPath}`);
    }
  }

  parseContent(content: string): ParsedAgentsMd {
    return {
      projectName: this.extractProjectName(content),
      description: this.extractDescription(content),
      techStack: this.extractTechStack(content),
      quickStart: this.extractQuickStart(content),
      documentMap: this.extractDocumentMap(content),
      commonTasks: this.extractCommonTasks(content),
      constraints: this.extractConstraints(content)
    };
  }

  private extractProjectName(content: string): string {
    const match = content.match(/^#\s+(.+?)\s+-/m);
    return match ? match[1].trim() : 'Unknown Project';
  }

  private extractDescription(content: string): string {
    const match = content.match(/\*\*核心功能\*\*:\s*(.+)/);
    return match ? match[1].trim() : '';
  }

  private extractTechStack(content: string): string {
    const match = content.match(/\*\*技术栈\*\*:\s*(.+)/);
    return match ? match[1].trim() : '';
  }

  private extractQuickStart(content: string): { setupCommands: string[]; startCommand: string } {
    const setupMatch = content.match(/```bash\n([\s\S]*?)```/);
    const setupCommands = setupMatch 
      ? setupMatch[1].split('\n').filter(line => line.trim() && !line.startsWith('#'))
      : [];

    const startMatch = content.match(/### 2\.2[\s\S]*?```bash\n(.+?)\n```/);
    const startCommand = startMatch ? startMatch[1].trim() : '';

    return { setupCommands, startCommand };
  }

  private extractDocumentMap(content: string): ParsedDocumentMap[] {
    const docs: ParsedDocumentMap[] = [];
    const sectionMatch = content.match(/##\s*3[.\s]+关键文档索引([\s\S]*?)(?=##\s+\d+[.\s]|$)/);
    
    if (sectionMatch) {
      const lines = sectionMatch[1].split('\n');
      for (const line of lines) {
        const match = line.match(/\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/);
        if (match && !line.includes('路径') && !line.includes('---')) {  // Skip header and separator
          docs.push({
            document: match[1].trim(),
            path: match[2].trim(),
            readingTime: match[3].trim(),
            description: match[4].trim()
          });
        }
      }
    }

    return docs;
  }

  private extractCommonTasks(content: string): ParsedCommonTask[] {
    const tasks: ParsedCommonTask[] = [];
    const sectionMatch = content.match(/##\s*4[.\s]+常见任务\n+([\s\S]*?)(?=\n## |$)/);
    
    if (sectionMatch) {
      const taskSections = sectionMatch[1].split(/###\s+4\.\d+/).slice(1);
      
      for (const section of taskSections) {
        const nameMatch = section.match(/^\s*(.+?)\n/);
        const name = nameMatch ? nameMatch[1].trim() : 'Unknown Task';
        
        const steps: string[] = [];
        const stepMatches = section.matchAll(/\d+\.\s*(.+)/g);
        for (const match of stepMatches) {
          steps.push(match[1].trim());
        }

        tasks.push({ name, steps });
      }
    }

    return tasks;
  }

  private extractConstraints(content: string): ParsedConstraint[] {
    const constraints: ParsedConstraint[] = [];
    const sectionMatch = content.match(/##\s*5[.\s]+重要约束([\s\S]*?)(?=##\s+\d+[.\s]|$)/);
    
    if (sectionMatch) {
      const lines = sectionMatch[1].split('\n');
      for (const line of lines) {
        if (line.includes('❌')) {
          const match = line.match(/\*\*(.+?)\*\*/);
          if (match) {
            constraints.push({ type: 'must-not', description: match[1] });
          }
        } else if (line.includes('✅')) {
          const match = line.match(/\*\*(.+?)\*\*/);
          if (match) {
            constraints.push({ type: 'must', description: match[1] });
          }
        } else if (line.includes('⚠️')) {
          const match = line.match(/\*\*(.+?)\*\*/);
          if (match) {
            constraints.push({ type: 'warning', description: match[1] });
          }
        }
      }
    }

    return constraints;
  }
}

export default AgentsMdParser;
