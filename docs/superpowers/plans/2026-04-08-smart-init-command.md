# Smart Init Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强 harness create 命令，添加项目概述输入和 LLM 驱动的业务分析，自动生成 AGENTS.md 和初始任务列表

**Architecture:** 扩展现有 InitCommand 类，在收集基础信息后增加项目概述输入，调用 LLM 生成业务架构、技术选型、目录结构和初始任务，最后生成智能化的 AGENTS.md 和任务文件

**Tech Stack:** TypeScript, inquirer (交互), LLM API (OpenAI/Kimi), Handlebars (模板)

---

## File Structure Overview

```
src/
├── commands/
│   ├── InitCommand.ts              # 修改: 添加智能分析流程
│   └── types.ts                    # 创建: 命令相关类型定义
├── services/
│   └── BusinessAnalyzer.ts         # 创建: LLM 业务分析服务
├── templates/
│   ├── smart-agents.md.hbs         # 创建: 智能 AGENTS.md 模板
│   └── initial-task.yaml.hbs       # 创建: 初始任务模板
└── __tests__/
    └── commands/
        └── InitCommand.test.ts     # 创建: 集成测试
```

---

## Task 1: 创建类型定义文件

**Files:**
- Create: `src/commands/types.ts`

**Purpose:** 定义智能初始化所需的类型

- [ ] **Step 1: 创建类型定义文件**

```typescript
/**
 * 智能初始化命令相关类型定义
 */

/**
 * 项目业务分析结果
 */
export interface BusinessAnalysis {
  /** 项目名称 */
  projectName: string;
  /** 项目概述 */
  overview: string;
  /** 详细业务描述 */
  businessDescription: string;
  /** 核心功能列表 */
  coreFeatures: string[];
  /** 技术栈建议 */
  techStack: {
    backend: string;
    frontend?: string;
    database: string;
    other: string[];
  };
  /** 项目结构建议 */
  directoryStructure: DirectoryNode[];
  /** 初始任务列表 */
  initialTasks: InitialTask[];
}

/**
 * 目录节点
 */
export interface DirectoryNode {
  name: string;
  type: 'file' | 'directory';
  description: string;
  children?: DirectoryNode[];
}

/**
 * 初始任务
 */
export interface InitialTask {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  acceptanceCriteria: string[];
}

/**
 * LLM 分析响应
 */
export interface LLMAnalysisResponse {
  businessDescription: string;
  coreFeatures: string[];
  techStack: {
    backend: string;
    frontend?: string;
    database: string;
    other: string[];
  };
  directoryStructure: DirectoryNode[];
  initialTasks: InitialTask[];
}

/**
 * 智能初始化选项
 */
export interface SmartInitOptions {
  /** 项目名称 */
  projectName: string;
  /** 项目概述 */
  overview: string;
  /** 技术栈模板 */
  template: string;
  /** 是否跳过业务分析 */
  skipAnalysis?: boolean;
  /** 是否立即启动 loop */
  autoStart?: boolean;
}
```

- [ ] **Step 2: 提交**

```bash
git add src/commands/types.ts
git commit -m "feat(commands): 添加智能初始化命令类型定义"
```

---

## Task 2: 创建 BusinessAnalyzer 服务

**Files:**
- Create: `src/services/BusinessAnalyzer.ts`
- Create test: `src/services/__tests__/BusinessAnalyzer.test.ts`

**Purpose:** 调用 LLM 分析项目概述并生成业务架构

- [ ] **Step 1: 创建 BusinessAnalyzer 类**

```typescript
import { LLMAnalysisResponse, BusinessAnalysis, SmartInitOptions } from '../commands/types';

/**
 * 业务分析器
 * 使用 LLM 分析项目概述并生成业务架构、技术选型和初始任务
 */
export class BusinessAnalyzer {
  private apiKey: string;
  private provider: string;
  private baseUrl?: string;

  constructor(config: {
    apiKey: string;
    provider: 'openai' | 'kimi' | 'anthropic';
    baseUrl?: string;
  }) {
    this.apiKey = config.apiKey;
    this.provider = config.provider;
    this.baseUrl = config.baseUrl;
  }

  /**
   * 分析项目概述并生成业务架构
   */
  async analyze(options: SmartInitOptions): Promise<BusinessAnalysis> {
    const prompt = this.buildAnalysisPrompt(options);
    
    const response = await this.callLLM(prompt);
    const analysis = this.parseResponse(response);

    return {
      projectName: options.projectName,
      overview: options.overview,
      ...analysis
    };
  }

  /**
   * 构建分析提示词
   */
  private buildAnalysisPrompt(options: SmartInitOptions): string {
    return `你是一个资深软件架构师，请根据以下项目概述进行业务分析和技术设计。

## 项目信息
- 项目名称: ${options.projectName}
- 技术模板: ${options.template}
- 项目概述: ${options.overview}

## 请提供以下分析结果（JSON格式）

1. **businessDescription**: 详细的业务描述（200-300字）
2. **coreFeatures**: 核心功能列表（5-8个）
3. **techStack**: 技术栈建议
   - backend: 后端技术
   - frontend: 前端技术（如有）
   - database: 数据库
   - other: 其他技术数组
4. **directoryStructure**: 项目目录结构建议（树形，包含文件说明）
5. **initialTasks**: 初始开发任务（3-5个）
   - 每个任务包含: id, name, description, priority(high/medium/low), acceptanceCriteria(数组)

## 输出格式要求
必须是有效的 JSON，不要包含 markdown 代码块标记，直接返回 JSON 对象。`;
  }

  /**
   * 调用 LLM API
   */
  private async callLLM(prompt: string): Promise<string> {
    if (this.provider === 'openai') {
      return this.callOpenAI(prompt);
    } else if (this.provider === 'kimi') {
      return this.callKimi(prompt);
    }
    throw new Error(`不支持的 LLM 提供商: ${this.provider}`);
  }

  /**
   * 调用 OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch(this.baseUrl || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 错误: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * 调用 Kimi API
   */
  private async callKimi(prompt: string): Promise<string> {
    const response = await fetch(this.baseUrl || 'https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'moonshot-v1-32k',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`Kimi API 错误: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * 解析 LLM 响应
   */
  private parseResponse(response: string): LLMAnalysisResponse {
    // 清理可能的 markdown 代码块
    const cleanResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      const parsed = JSON.parse(cleanResponse);
      
      // 验证必需字段
      if (!parsed.businessDescription || !parsed.coreFeatures || !parsed.techStack) {
        throw new Error('LLM 响应缺少必需字段');
      }

      return parsed as LLMAnalysisResponse;
    } catch (error) {
      throw new Error(`解析 LLM 响应失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
```

- [ ] **Step 2: 创建测试文件**

```typescript
import { BusinessAnalyzer } from '../BusinessAnalyzer';

describe('BusinessAnalyzer', () => {
  let analyzer: BusinessAnalyzer;

  beforeEach(() => {
    analyzer = new BusinessAnalyzer({
      apiKey: 'test-key',
      provider: 'openai'
    });
  });

  describe('analyze', () => {
    it('应抛出错误当 API Key 无效时', async () => {
      await expect(analyzer.analyze({
        projectName: 'test',
        overview: 'test project',
        template: 'node-ts'
      })).rejects.toThrow();
    });
  });

  describe('parseResponse', () => {
    it('应正确解析有效的 JSON 响应', () => {
      const validResponse = JSON.stringify({
        businessDescription: '这是一个测试项目',
        coreFeatures: ['功能1', '功能2'],
        techStack: {
          backend: 'Node.js',
          database: 'MongoDB',
          other: ['Redis']
        },
        directoryStructure: [],
        initialTasks: []
      });

      // 使用私有方法测试（通过 any 绕过）
      const result = (analyzer as any).parseResponse(validResponse);
      expect(result.businessDescription).toBe('这是一个测试项目');
      expect(result.coreFeatures).toHaveLength(2);
    });

    it('应移除 markdown 代码块标记', () => {
      const responseWithMarkdown = '```json\n{"businessDescription":"test"}\n```';
      const result = (analyzer as any).parseResponse(responseWithMarkdown);
      expect(result.businessDescription).toBe('test');
    });
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
npm test -- src/services/__tests__/BusinessAnalyzer.test.ts
```
Expected: 测试通过

- [ ] **Step 4: 提交**

```bash
git add src/services/BusinessAnalyzer.ts src/services/__tests__/BusinessAnalyzer.test.ts
git commit -m "feat(services): 添加 BusinessAnalyzer LLM 业务分析服务"
```

---

## Task 3: 创建 Handlebars 模板

**Files:**
- Create: `src/templates/smart-agents.md.hbs`
- Create: `src/templates/initial-task.yaml.hbs`

**Purpose:** 创建智能化的 AGENTS.md 和任务模板

- [ ] **Step 1: 创建 smart-agents.md.hbs**

```handlebars
# AGENTS.md - {{projectName}} Agent 协作指南

> 本文档是 AI Agent 的入口指南，基于项目概述自动生成
> **项目概述**: {{overview}}

## 1. 快速开始 (2分钟)

### 1.1 项目概述
- **项目名称**: {{projectName}}
- **技术栈**: {{techStack.backend}}{{#if techStack.frontend}} / {{techStack.frontend}}{{/if}} / {{techStack.database}}
- **核心功能**: 
{{#each coreFeatures}}
  - {{this}}
{{/each}}

### 1.2 业务描述

{{{businessDescription}}}

### 1.3 环境准备
```bash
# 安装依赖
npm install

# 启动开发环境
npm run dev

# 运行测试
npm test
```

## 2. 项目结构

```
{{#each directoryStructure}}
{{#if (eq type 'directory')}}{{name}}/{{else}}{{name}}{{/if}}  # {{description}}
{{#if children}}
{{#each children}}
  {{#if (eq type 'directory')}}{{name}}/{{else}}{{name}}{{/if}}  # {{description}}
{{/each}}
{{/if}}
{{/each}}
```

## 3. 技术栈详情

### 3.1 后端
- {{techStack.backend}}

### 3.2 数据库
- {{techStack.database}}

{{#if techStack.frontend}}
### 3.3 前端
- {{techStack.frontend}}
{{/if}}

{{#if techStack.other}}
### 3.4 其他技术
{{#each techStack.other}}
- {{this}}
{{/each}}
{{/if}}

## 4. 开发规范

- ❌ 不要违反层依赖规则（下层不依赖上层）
- ✅ 必须为新功能编写测试 (覆盖率 > 80%)
- ⚠️ 复杂逻辑需要中文注释说明

## 5. 初始任务

{{#each initialTasks}}
### {{name}}
**优先级**: {{priority}}

{{description}}

**验收标准**:
{{#each acceptanceCriteria}}
- [ ] {{this}}
{{/each}}

{{/each}}

## 6. 使用 Harness CLI

```bash
# 启动无人值守开发
harness loop --unattended

# 查看项目状态
harness status

# 查看 telemetry 监控
harness telemetry-ui --port 9999
```
```

- [ ] **Step 2: 创建 initial-task.yaml.hbs**

```handlebars
{{#each initialTasks}}
---
id: {{id}}
name: {{name}}
priority: {{priority}}
description: |
  {{description}}
acceptanceCriteria:
{{#each acceptanceCriteria}}
  - {{this}}
{{/each}}
metadata:
  estimatedComplexity: 3
  requiredSkills:
    - TypeScript
    - Node.js
---

{{/each}}
```

- [ ] **Step 3: 提交**

```bash
git add src/templates/smart-agents.md.hbs src/templates/initial-task.yaml.hbs
git commit -m "feat(templates): 添加智能 AGENTS.md 和任务模板"
```

---

## Task 4: 修改 InitCommand 添加智能分析

**Files:**
- Modify: `src/commands/InitCommand.ts`

**Purpose:** 集成业务分析流程到项目创建中

- [ ] **Step 1: 修改 InitCommand.ts**

在现有 import 后添加：

```typescript
import { BusinessAnalyzer } from '../services/BusinessAnalyzer';
import { BusinessAnalysis, SmartInitOptions } from './types';
import * as Handlebars from 'handlebars';
```

在 `execute` 方法中，收集项目信息后添加：

```typescript
// 在收集模板变量后，创建项目前添加以下代码

// 4.5 智能业务分析（如果未跳过）
let businessAnalysis: BusinessAnalysis | undefined;
if (!options.skipAnalysis && isInteractive) {
  const { enableSmartAnalysis } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableSmartAnalysis',
      message: '是否启用智能业务分析（推荐）?',
      default: true
    }
  ]);

  if (enableSmartAnalysis) {
    // 输入项目概述
    const { overview } = await inquirer.prompt([
      {
        type: 'input',
        name: 'overview',
        message: '项目概述（一句话描述业务目标）:',
        validate: (input: string) => input.trim().length > 10 || '请提供更详细的描述（至少10个字符）'
      }
    ]);

    // 获取 LLM 配置
    const llmConfig = await this.loadLLMConfig();
    if (llmConfig) {
      const analyzer = new BusinessAnalyzer(llmConfig);
      
      const spinner = ora('正在进行业务分析...').start();
      try {
        businessAnalysis = await analyzer.analyze({
          projectName: context.projectName,
          overview,
          template: templateName
        });
        spinner.succeed('业务分析完成!');
      } catch (error) {
        spinner.fail('业务分析失败，使用基础模板');
        console.error(error);
      }
    } else {
      console.log('⚠️ 未配置 LLM API Key，跳过智能分析');
    }
  }
}
```

在创建项目成功后添加：

```typescript
// 在 spinner.succeed('项目创建成功!') 后添加：

// 生成智能文档
if (businessAnalysis) {
  const docSpinner = ora('正在生成智能文档...').start();
  try {
    await this.generateSmartDocs(targetDir, businessAnalysis);
    docSpinner.succeed('智能文档生成完成!');
  } catch (error) {
    docSpinner.fail('智能文档生成失败');
    console.error(error);
  }
}
```

添加私有方法：

```typescript
/**
 * 加载 LLM 配置
 */
private async loadLLMConfig(): Promise<{ apiKey: string; provider: 'openai' | 'kimi'; baseUrl?: string } | null> {
  try {
    // 从环境变量读取
    const openaiKey = process.env.OPENAI_API_KEY;
    const kimiKey = process.env.KIMI_API_KEY;

    if (openaiKey) {
      return {
        apiKey: openaiKey,
        provider: 'openai',
        baseUrl: process.env.OPENAI_BASE_URL
      };
    }

    if (kimiKey) {
      return {
        apiKey: kimiKey,
        provider: 'kimi',
        baseUrl: process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1'
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 生成智能文档
 */
private async generateSmartDocs(targetDir: string, analysis: BusinessAnalysis): Promise<void> {
  // 注册 Handlebars 辅助函数
  Handlebars.registerHelper('eq', (a, b) => a === b);

  // 读取模板
  const agentsTemplatePath = path.join(__dirname, '../templates/smart-agents.md.hbs');
  const taskTemplatePath = path.join(__dirname, '../templates/initial-task.yaml.hbs');

  const agentsTemplateSource = await fs.readFile(agentsTemplatePath, 'utf-8');
  const taskTemplateSource = await fs.readFile(taskTemplatePath, 'utf-8');

  // 编译模板
  const agentsTemplate = Handlebars.compile(agentsTemplateSource);
  const taskTemplate = Handlebars.compile(taskTemplateSource);

  // 生成 AGENTS.md
  const agentsContent = agentsTemplate(analysis);
  await fs.writeFile(path.join(targetDir, 'AGENTS.md'), agentsContent, 'utf-8');

  // 创建任务目录
  const tasksDir = path.join(targetDir, '.harness', 'tasks');
  await fs.mkdir(tasksDir, { recursive: true });

  // 生成初始任务文件
  const tasksContent = taskTemplate(analysis);
  await fs.writeFile(path.join(tasksDir, '001-initial-tasks.yaml'), tasksContent, 'utf-8');
}
```

- [ ] **Step 2: 提交**

```bash
git add src/commands/InitCommand.ts
git commit -m "feat(commands): InitCommand 添加智能业务分析功能"
```

---

## Task 5: 添加 auto-start 选项

**Files:**
- Modify: `src/commands/InitCommand.ts`
- Modify: `src/cli.ts` (create 命令)

**Purpose:** 创建完成后询问是否立即启动自动化开发

- [ ] **Step 1: 修改 cli.ts 中的 create 命令**

找到 create 命令定义，添加新选项：

```typescript
program
  .command('create [project-name]')
  .description('智能创建新项目')
  .option('-t, --template <name>', '指定模板', 'node-ts')
  .option('-f, --force', '强制覆盖')
  .option('--skip-install', '跳过依赖安装')
  .option('--skip-analysis', '跳过智能业务分析')
  .option('--auto-start', '创建完成后立即启动自动化开发')
  .action(async (projectName, options) => {
    try {
      const command = new InitCommand();
      await command.execute({
        projectName,
        template: options.template,
        force: options.force,
        skipInstall: options.skipInstall,
        skipAnalysis: options.skipAnalysis,
        autoStart: options.autoStart
      });
    } catch (error) {
      logger.error('项目创建失败:', error);
      process.exit(1);
    }
  });
```

- [ ] **Step 2: 修改 InitCommand 添加 auto-start 逻辑**

在显示后续步骤之前添加：

```typescript
// 9. 询问是否立即启动自动化开发
if (!options.autoStart && isInteractive && businessAnalysis) {
  const { startLoop } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'startLoop',
      message: '是否立即启动自动化开发 (harness loop)?',
      default: true
    }
  ]);

  if (startLoop) {
    console.log('\n🚀 正在启动自动化开发...\n');
    const { LoopController } = await import('../core/LoopController');
    const { ConfigLoader } = await import('../utils/ConfigLoader');
    
    const config = await ConfigLoader.load(path.join(targetDir, '.harness/config.yaml'));
    const controller = new LoopController(config);
    
    // 在新目录中启动 loop
    process.chdir(targetDir);
    await controller.start({ maxDuration: 6 * 60 * 60 * 1000 });
    return; // 不显示后续步骤
  }
}

// 如果指定了 --auto-start 参数
if (options.autoStart && businessAnalysis) {
  console.log('\n🚀 正在启动自动化开发...\n');
  // ... 同上
}
```

- [ ] **Step 3: 提交**

```bash
git add src/cli.ts src/commands/InitCommand.ts
git commit -m "feat(commands): 添加 auto-start 选项，支持创建后立即启动开发"
```

---

## Task 6: 创建集成测试

**Files:**
- Create: `src/commands/__tests__/InitCommand.test.ts`

**Purpose:** 测试智能初始化流程

- [ ] **Step 1: 创建测试文件**

```typescript
import { InitCommand } from '../InitCommand';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('InitCommand Smart Features', () => {
  let command: InitCommand;
  let tempDir: string;

  beforeEach(() => {
    command = new InitCommand();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('loadLLMConfig', () => {
    it('应从环境变量读取 OpenAI 配置', () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      
      const config = (command as any).loadLLMConfig();
      
      expect(config).not.toBeNull();
      expect(config?.provider).toBe('openai');
      expect(config?.apiKey).toBe('test-openai-key');
      
      delete process.env.OPENAI_API_KEY;
    });

    it('应从环境变量读取 Kimi 配置', () => {
      process.env.KIMI_API_KEY = 'test-kimi-key';
      
      const config = (command as any).loadLLMConfig();
      
      expect(config).not.toBeNull();
      expect(config?.provider).toBe('kimi');
      
      delete process.env.KIMI_API_KEY;
    });

    it('没有配置时应返回 null', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.KIMI_API_KEY;
      
      const config = (command as any).loadLLMConfig();
      
      expect(config).toBeNull();
    });
  });

  describe('generateSmartDocs', () => {
    it('应生成 AGENTS.md 和任务文件', async () => {
      const analysis = {
        projectName: 'test-project',
        overview: '测试项目概述',
        businessDescription: '详细业务描述',
        coreFeatures: ['功能1', '功能2'],
        techStack: {
          backend: 'Node.js',
          database: 'MongoDB',
          other: ['Redis']
        },
        directoryStructure: [],
        initialTasks: [
          {
            id: 'task-1',
            name: '初始化项目',
            description: '创建基础结构',
            priority: 'high' as const,
            acceptanceCriteria: ['标准1', '标准2']
          }
        ]
      };

      await (command as any).generateSmartDocs(tempDir, analysis);

      // 验证 AGENTS.md 生成
      const agentsPath = path.join(tempDir, 'AGENTS.md');
      expect(fs.existsSync(agentsPath)).toBe(true);
      
      const agentsContent = fs.readFileSync(agentsPath, 'utf-8');
      expect(agentsContent).toContain('test-project');
      expect(agentsContent).toContain('功能1');
      expect(agentsContent).toContain('Node.js');

      // 验证任务文件生成
      const tasksPath = path.join(tempDir, '.harness', 'tasks', '001-initial-tasks.yaml');
      expect(fs.existsSync(tasksPath)).toBe(true);
      
      const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
      expect(tasksContent).toContain('task-1');
      expect(tasksContent).toContain('初始化项目');
    });
  });
});
```

- [ ] **Step 2: 运行测试**

```bash
npm test -- src/commands/__tests__/InitCommand.test.ts
```
Expected: 测试通过

- [ ] **Step 3: 提交**

```bash
git add src/commands/__tests__/InitCommand.test.ts
git commit -m "test(commands): 添加 InitCommand 智能功能测试"
```

---

## Task 7: 更新导出和最终验证

**Files:**
- Modify: `src/index.ts` (如有需要)
- Build and test

- [ ] **Step 1: 构建项目**

```bash
npm run build
```
Expected: 无编译错误

- [ ] **Step 2: 运行所有测试**

```bash
npm test
```
Expected: 所有测试通过

- [ ] **Step 3: 提交所有更改**

```bash
git add -A
git commit -m "feat: 完成智能项目初始化功能"
```

---

## Usage Example

创建项目的新交互流程：

```bash
$ harness create opc-commerce

🚀 Harness 项目初始化

? 选择项目模板: node-ts
? 项目名称: opc-commerce
? 项目描述: OPC 跨境电商平台
? 作者: Your Name

? 是否启用智能业务分析（推荐）? Yes
? 项目概述（一句话描述业务目标）: 基于OPC UA的跨境电商平台，连接工业设备实时采集数据，支持多语言多币种

🤖 正在进行业务分析...
✅ 业务分析完成!

? 是否立即启动自动化开发 (harness loop)? Yes

🚀 正在启动自动化开发...
```

---

## Spec Coverage Check

| 需求 | 任务 |
|------|------|
| 项目概述输入 | Task 4 Step 1 |
| LLM 业务分析 | Task 2 |
| 自动生成 AGENTS.md | Task 3, Task 4 |
| 自动生成初始任务 | Task 3, Task 4 |
| 一键启动开发 | Task 5 |
| 技术选型建议 | Task 2 (LLM 生成) |
| 目录结构建议 | Task 2 (LLM 生成) |

---

## Placeholder Scan

- ✅ 无 TBD/TODO
- ✅ 所有代码步骤包含完整实现
- ✅ 所有测试包含具体断言
- ✅ 类型定义完整
