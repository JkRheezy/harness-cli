import { SynthesisResult, LLMCaller } from './types';
import { BusinessAnalysis, DirectoryNode, InitialTask } from '../../commands/types';

/**
 * 输出生成器 - 生成最终的 BusinessAnalysis
 */
export class OutputGenerator {
  constructor(
    private llmCaller: LLMCaller,
    private model: string
  ) {}

  /**
   * 从综合结果生成最终输出
   */
  async generate(
    synthesis: SynthesisResult,
    projectName: string,
    overview: string
  ): Promise<BusinessAnalysis> {
    // 构建生成 Prompt
    const prompt = this.buildGenerationPrompt(synthesis);

    // 调用 LLM 生成初始任务
    const response = await this.llmCaller(prompt, this.model);

    // 解析初始任务
    const initialTasks = this.parseInitialTasks(response);

    // 转换目录结构
    const directoryStructure = this.parseDirectoryStructure(
      synthesis.technical.directoryStructure
    );

    // 组合成最终的 BusinessAnalysis
    return {
      projectName,
      overview,
      businessDescription: synthesis.business.description,
      coreFeatures: synthesis.business.coreFeatures.map(f => f.name),
      techStack: {
        backend: synthesis.technical.stackRecommendation.backend || '待定',
        frontend: synthesis.technical.stackRecommendation.frontend,
        database: synthesis.technical.stackRecommendation.database || '待定',
        other: synthesis.technical.stackRecommendation.other
      },
      directoryStructure,
      initialTasks
    };
  }

  /**
   * 构建生成 Prompt
   */
  private buildGenerationPrompt(synthesis: SynthesisResult): string {
    const features = synthesis.business.coreFeatures
      .map(f => `- ${f.name} (${f.priority}): ${f.description}`)
      .join('\n');

    const risks = synthesis.risks
      .map(r => `- ${r.severity.toUpperCase()}: ${r.description} (缓解: ${r.mitigation})`)
      .join('\n');

    const questions = synthesis.openQuestions
      .map(q => `- ${q}`)
      .join('\n');

    return `基于以下综合分析结果，生成项目的初始任务列表。

## 业务描述
${synthesis.business.description}

## 核心功能
${features}

## 技术栈建议
- 后端: ${synthesis.technical.stackRecommendation.backend || '待定'}
- 前端: ${synthesis.technical.stackRecommendation.frontend || '待定'}
- 数据库: ${synthesis.technical.stackRecommendation.database || '待定'}
- 其他: ${synthesis.technical.stackRecommendation.other.join(', ') || '无'}

## 架构说明
${synthesis.technical.architectureNotes}

## 项目结构
${synthesis.technical.directoryStructure}

## 风险与缓解
${risks || '无明确风险'}

## 待澄清问题
${questions || '无'}

请生成 5-10 个初始任务，每个任务包含:
1. id: 任务唯一标识（如 task-001）
2. name: 任务名称（简洁明了）
3. description: 任务描述（详细说明要做什么）
4. priority: 优先级（high/medium/low）
5. acceptanceCriteria: 验收标准（字符串数组，至少 2 条）

以 JSON 格式返回，格式如下:
{\n  "tasks": [\n    {\n      "id": "task-001",\n      "name": "任务名称",\n      "description": "任务描述",\n      "priority": "high",\n      "acceptanceCriteria": ["标准1", "标准2"]\n    }\n  ]\n}`;
  }

  /**
   * 解析初始任务
   */
  private parseInitialTasks(response: string): Array<{
    id: string;
    name: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    acceptanceCriteria: string[];
  }> {
    try {
      // 提取 JSON 部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法在响应中找到 JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // 验证并规范化任务列表
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        return parsed.tasks.map((task: any, index: number) => ({
          id: task.id || `task-${String(index + 1).padStart(3, '0')}`,
          name: task.name || '未命名任务',
          description: task.description || '暂无描述',
          priority: ['high', 'medium', 'low'].includes(task.priority)
            ? task.priority
            : 'medium',
          acceptanceCriteria: Array.isArray(task.acceptanceCriteria)
            ? task.acceptanceCriteria
            : ['完成基本功能', '通过代码审查']
        }));
      }

      throw new Error('响应中未找到任务列表');
    } catch (error) {
      // 如果解析失败，返回默认任务
      console.warn('解析初始任务失败，使用默认任务:', error);
      return [
        {
          id: 'task-001',
          name: '项目初始化',
          description: '设置项目基础结构和依赖',
          priority: 'high',
          acceptanceCriteria: ['创建项目目录结构', '初始化 package.json', '安装核心依赖']
        },
        {
          id: 'task-002',
          name: '核心功能开发',
          description: '实现项目核心功能模块',
          priority: 'high',
          acceptanceCriteria: ['完成核心功能代码', '添加单元测试', '通过功能验证']
        },
        {
          id: 'task-003',
          name: '文档编写',
          description: '编写项目文档和 README',
          priority: 'medium',
          acceptanceCriteria: ['完成 README 编写', '添加 API 文档', '编写使用说明']
        }
      ];
    }
  }

  /**
   * 解析目录结构文本为 DirectoryNode 数组
   */
  private parseDirectoryStructure(structureText: string): DirectoryNode[] {
    const lines = structureText.trim().split('\n');
    const root: DirectoryNode[] = [];
    const stack: { nodes: DirectoryNode[]; level: number }[] = [
      { nodes: root, level: -1 }
    ];

    for (const line of lines) {
      if (!line.trim()) continue;

      // 计算缩进层级
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1].length : 0;
      const level = Math.floor(indent / 2);

      // 提取名称和描述
      const cleanLine = line.trim().replace(/^[│├└─\s]+/, '');
      const [name, ...descParts] = cleanLine.split('#');
      const description = descParts.join('#').trim() || name.trim();

      const isDirectory = cleanLine.endsWith('/') || !cleanLine.includes('.');
      const node: DirectoryNode = {
        name: name.trim().replace(/\/$/, ''),
        type: isDirectory ? 'directory' : 'file',
        description
      };

      // 找到正确的父节点
      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      const parent = stack[stack.length - 1];
      parent.nodes.push(node);

      // 如果是目录，添加到栈中
      if (isDirectory) {
        node.children = [];
        stack.push({ nodes: node.children, level });
      }
    }

    return root;
  }
}
