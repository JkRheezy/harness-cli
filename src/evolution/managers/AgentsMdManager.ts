/**
 * AgentsMdManager - 自动读写 AGENTS.md 的管理器
 * 
 * 用于自动维护项目需求文档，支持：
 * - 读取并解析 AGENTS.md 结构
 * - 添加新需求到待实现列表
 * - 标记模块为进行中/已实现
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Gap, AgentsMdStructure, AgentsMdEntry } from '../types';

export class AgentsMdManager {
  private projectPath: string;
  private agentsMdPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.agentsMdPath = path.join(projectPath, 'AGENTS.md');
  }

  /**
   * 读取并解析 AGENTS.md 文件
   * @returns 解析后的结构，如果文件不存在则返回 null
   */
  async read(): Promise<AgentsMdStructure | null> {
    try {
      const content = await fs.readFile(this.agentsMdPath, 'utf-8');
      return this.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * 解析 AGENTS.md 内容
   */
  private parse(content: string): AgentsMdStructure {
    const lines = content.split('\n');
    const result: AgentsMdStructure = {
      title: '',
      lastUpdated: new Date(),
      implemented: [],
      inProgress: [],
      pending: [],
      techDebt: []
    };

    let currentSection: 'implemented' | 'inProgress' | 'pending' | 'techDebt' | null = null;
    let inTable = false;
    let tableHeaders: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 解析标题
      if (line.startsWith('# ') && !result.title) {
        result.title = line.substring(2).trim();
        continue;
      }

      // 解析最后更新时间
      if (line.includes('最后更新:')) {
        const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          result.lastUpdated = new Date(dateMatch[1]);
        }
        continue;
      }

      // 识别章节
      if (line.startsWith('## ')) {
        const sectionName = line.substring(3).trim();
        if (sectionName.includes('已实现') || sectionName.includes('✅')) {
          currentSection = 'implemented';
        } else if (sectionName.includes('进行中') || sectionName.includes('🚧')) {
          currentSection = 'inProgress';
        } else if (sectionName.includes('待实现') || sectionName.includes('📋')) {
          currentSection = 'pending';
        } else if (sectionName.includes('技术债务') || sectionName.includes('💳')) {
          currentSection = 'techDebt';
        } else {
          currentSection = null;
        }
        inTable = false;
        continue;
      }

      // 解析表格
      if (line.startsWith('|') && currentSection) {
        if (!inTable) {
          // 表头行 - 使用与数据行一致的解析逻辑
          const parts = line.split('|');
          tableHeaders = parts.slice(1, -1).map(h => h.trim());
          inTable = true;
        } else if (line.includes('---')) {
          // 分隔行，跳过
          continue;
        } else {
          // 数据行
          if (currentSection) {
            const entry = this.parseTableRow(line, tableHeaders, currentSection === 'implemented' ? 'implemented' : currentSection === 'inProgress' ? 'in_progress' : 'pending');
            if (entry) {
              switch (currentSection) {
                case 'implemented':
                  result.implemented.push(entry);
                  break;
                case 'inProgress':
                  result.inProgress.push(entry);
                  break;
                case 'pending':
                  result.pending.push(entry);
                  break;
                case 'techDebt':
                  result.techDebt!.push(entry);
                  break;
              }
            }
          }
        }
        continue;
      }

      // 解析列表项（用于进行中章节）
      if (line.startsWith('- ') && currentSection === 'inProgress') {
        const entry = this.parseListItem(line);
        if (entry) {
          result.inProgress.push(entry);
        }
      }
    }

    return result;
  }

  /**
   * 解析表格行
   */
  private parseTableRow(line: string, headers: string[], defaultStatus: 'implemented' | 'in_progress' | 'pending' = 'pending'): AgentsMdEntry | null {
    // 分割并保留空单元格，只过滤掉最外侧的空字符串
    const parts = line.split('|');
    // 移除首尾的 empty strings（由行首和行尾的 | 产生）
    const cells = parts.slice(1, -1).map(c => c.trim());
    if (cells.length < 2) return null;

    const entry: AgentsMdEntry = {
      module: cells[0] || '',
      description: '',
      status: defaultStatus
    };

    // 根据表头映射字段
    headers.forEach((header, index) => {
      const cell = cells[index];
      if (!cell) return;

      if (header.includes('模块')) {
        entry.module = cell;
      } else if (header.includes('描述')) {
        entry.description = cell;
      } else if (header.includes('优先级')) {
        entry.priority = cell;
      } else if (header.includes('原因') || header.includes('生成原因')) {
        entry.reason = cell;
      } else if (header.includes('完成时间')) {
        const dateMatch = cell.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          entry.completedAt = new Date(dateMatch[1] + 'T00:00:00.000Z');
        }
      }
    });

    return entry;
  }

  /**
   * 解析列表项
   */
  private parseListItem(line: string): AgentsMdEntry | null {
    const content = line.substring(2).trim();
    const match = content.match(/^([^:]+):?\s*(.*)$/);
    if (match) {
      return {
        module: match[1].trim(),
        description: match[2]?.trim() || '',
        status: 'in_progress'
      };
    }
    return {
      module: content,
      description: '',
      status: 'in_progress'
    };
  }

  /**
   * 将新发现的需求添加到"待实现"列表
   * 如果已存在则跳过
   */
  async addRequirement(gap: Gap): Promise<void> {
    const structure = await this.read() || this.createDefaultStructure();

    // 检查是否已存在
    const exists = 
      structure.implemented.some(e => e.module === gap.name) ||
      structure.inProgress.some(e => e.module === gap.name) ||
      structure.pending.some(e => e.module === gap.name);

    if (exists) {
      return;
    }

    // 添加到待实现列表
    const entry: AgentsMdEntry = {
      module: gap.name,
      description: gap.description,
      status: 'pending',
      priority: gap.priority,
      reason: gap.reason
    };

    structure.pending.push(entry);
    structure.lastUpdated = new Date();

    await this.write(structure);
  }

  /**
   * 将模块从"待实现/进行中"移到"已实现"
   * 记录完成时间
   */
  async markAsImplemented(moduleName: string): Promise<void> {
    const structure = await this.read() || this.createDefaultStructure();

    // 从待实现中移除并获取信息
    const pendingIndex = structure.pending.findIndex(e => e.module === moduleName);
    let entry: AgentsMdEntry | undefined;
    if (pendingIndex !== -1) {
      entry = structure.pending.splice(pendingIndex, 1)[0];
    }

    // 从进行中移除（如果已经在 pending 中找到了，就不需要再找了）
    if (!entry) {
      const inProgressIndex = structure.inProgress.findIndex(e => e.module === moduleName);
      if (inProgressIndex !== -1) {
        entry = structure.inProgress.splice(inProgressIndex, 1)[0];
      }
    }

    // 检查是否已在已实现列表中
    const alreadyImplemented = structure.implemented.some(e => e.module === moduleName);
    if (alreadyImplemented) {
      structure.lastUpdated = new Date();
      await this.write(structure);
      return;
    }

    // 添加到已实现列表
    const implementedEntry: AgentsMdEntry = {
      module: moduleName,
      description: entry?.description || '',
      status: 'implemented',
      priority: entry?.priority,
      completedAt: new Date()
    };

    structure.implemented.push(implementedEntry);
    structure.lastUpdated = new Date();

    await this.write(structure);
  }

  /**
   * 将模块标记为"进行中"
   */
  async markAsInProgress(moduleName: string, description?: string): Promise<void> {
    const structure = await this.read() || this.createDefaultStructure();

    // 检查是否已在进行中列表
    const existingInProgress = structure.inProgress.find(e => e.module === moduleName);
    if (existingInProgress) {
      // 不覆盖已有描述，只做保存
      await this.write(structure);
      return;
    }

    // 检查是否已在已实现列表
    const alreadyImplemented = structure.implemented.some(e => e.module === moduleName);
    if (alreadyImplemented) {
      return;
    }

    // 从待实现中移除并获取信息
    const pendingIndex = structure.pending.findIndex(e => e.module === moduleName);
    let entry: AgentsMdEntry | undefined;
    if (pendingIndex !== -1) {
      entry = structure.pending.splice(pendingIndex, 1)[0];
    }

    // 添加到进行中列表 - 优先保留原有描述
    const inProgressEntry: AgentsMdEntry = {
      module: moduleName,
      description: entry?.description || description || '',
      status: 'in_progress',
      priority: entry?.priority
    };

    structure.inProgress.push(inProgressEntry);
    structure.lastUpdated = new Date();

    await this.write(structure);
  }

  /**
   * 创建默认结构
   */
  private createDefaultStructure(): AgentsMdStructure {
    return {
      title: 'Project Requirements',
      lastUpdated: new Date(),
      implemented: [],
      inProgress: [],
      pending: []
    };
  }

  /**
   * 将结构写入 AGENTS.md 文件
   */
  private async write(structure: AgentsMdStructure): Promise<void> {
    const content = this.serialize(structure);
    await fs.writeFile(this.agentsMdPath, content, 'utf-8');
  }

  /**
   * 序列化结构为 Markdown
   */
  private serialize(structure: AgentsMdStructure): string {
    const dateStr = structure.lastUpdated.toISOString().split('T')[0];
    const lines: string[] = [];

    // 标题和状态
    lines.push(`# ${structure.title || 'Project Requirements'}`);
    lines.push('');
    lines.push(`> 状态: 🔄 持续进化中 | 最后更新: ${dateStr} (由 Loop 自动更新)`);
    lines.push('');

    // 已实现功能
    lines.push('## 已实现功能 ✅');
    lines.push('');
    if (structure.implemented.length > 0) {
      lines.push('| 模块 | 描述 | 完成时间 |');
      lines.push('|------|------|----------|');
      for (const entry of structure.implemented) {
        const completedAt = entry.completedAt 
          ? entry.completedAt.toISOString().split('T')[0] 
          : dateStr;
        lines.push(`| ${entry.module} | ${entry.description} | ${completedAt} |`);
      }
    } else {
      lines.push('*暂无已实现功能*');
    }
    lines.push('');

    // 进行中
    lines.push('## 进行中 🚧');
    lines.push('');
    if (structure.inProgress.length > 0) {
      for (const entry of structure.inProgress) {
        const desc = entry.description ? `: ${entry.description}` : '';
        lines.push(`- ${entry.module}${desc}`);
      }
    } else {
      lines.push('*暂无进行中任务*');
    }
    lines.push('');

    // 待实现
    lines.push('## 待实现 📋');
    lines.push('');
    lines.push('_以下内容由 Loop 自动检测生成_');
    lines.push('');
    if (structure.pending.length > 0) {
      lines.push('| 模块 | 描述 | 优先级 | 生成原因 |');
      lines.push('|------|------|--------|----------|');
      for (const entry of structure.pending) {
        const priority = entry.priority || 'P1';
        const reason = entry.reason || '';
        lines.push(`| ${entry.module} | ${entry.description} | ${priority} | ${reason} |`);
      }
    } else {
      lines.push('*暂无待实现需求*');
    }
    lines.push('');

    // 技术债务（可选）
    if (structure.techDebt && structure.techDebt.length > 0) {
      lines.push('## 技术债务 💳');
      lines.push('');
      lines.push('| 模块 | 描述 | 优先级 |');
      lines.push('|------|------|--------|');
      for (const entry of structure.techDebt) {
        const priority = entry.priority || 'P1';
        lines.push(`| ${entry.module} | ${entry.description} | ${priority} |`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 获取 AGENTS.md 文件路径
   */
  getAgentsMdPath(): string {
    return this.agentsMdPath;
  }
}
