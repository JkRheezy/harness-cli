# AGENTS.md 重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 AGENTS.md 生成系统，使其符合 OpenAI Harness 范式（80-120行），并实现基于代码推断的自动填充功能。

**Architecture:** 采用分层文档策略 - AGENTS.md 作为精简入口（~60行），详细信息分散到 docs/BUSINESS.md 和 docs/ARCHITECTURE.md。自动填充系统通过 CodeFeatureExtractor 扫描代码，BusinessGenerator 应用映射规则生成描述，DocsUpdater 增量更新文档。

**Tech Stack:** TypeScript, Handlebars (模板), Jest (测试)

---

## 文件结构总览

```
src/
├── templates/
│   ├── smart-agents.md.hbs          # 精简版 AGENTS.md 模板（修改）
│   ├── business.md.hbs               # 详细业务描述模板（新增）
│   ├── architecture.md.hbs           # 详细架构描述模板（新增）
│   └── initial-task.yaml.hbs         # 初始任务模板（现有）
├── docs/
│   └── autofiller/
│       ├── index.ts                  # 模块导出（新增）
│       ├── CodeFeatureExtractor.ts   # 代码特征提取器（新增）
│       ├── BusinessGenerator.ts      # 业务描述生成器（新增）
│       ├── DocsUpdater.ts            # 文档更新器（新增）
│       ├── SensitiveFilter.ts        # 敏感信息过滤器（新增）
│       └── __tests__/                # 测试目录（新增）
│           ├── CodeFeatureExtractor.test.ts
│           ├── BusinessGenerator.test.ts
│           └── DocsUpdater.test.ts
└── commands/
    └── InitCommand.ts                # 修改以支持新模板系统
```

---

## Phase 1: 重构模板系统

### Task 1: 精简 AGENTS.md 模板

**Files:**
- Modify: `src/templates/smart-agents.md.hbs`
- Test: `src/templates/__tests__/smart-agents.test.ts`

- [ ] **Step 1: 编写模板渲染测试**

```typescript
// src/templates/__tests__/smart-agents.test.ts
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('smart-agents.md.hbs', () => {
  it('should generate AGENTS.md with less than 80 lines', async () => {
    const templateSource = await fs.readFile(
      path.join(__dirname, '../smart-agents.md.hbs'),
      'utf-8'
    );
    const template = Handlebars.compile(templateSource);
    
    const result = template({
      projectName: 'test-project',
      techStack: { backend: 'Node.js' },
      coreFeatures: ['feature1', 'feature2'],
      availableDocs: {}
    });
    
    const lineCount = result.split('\n').length;
    expect(lineCount).toBeLessThanOrEqual(80);
    expect(lineCount).toBeGreaterThanOrEqual(60);
  });
  
  it('should include available docs in index', async () => {
    const templateSource = await fs.readFile(
      path.join(__dirname, '../smart-agents.md.hbs'),
      'utf-8'
    );
    const template = Handlebars.compile(templateSource);
    
    const result = template({
      projectName: 'test-project',
      availableDocs: { business: true, architecture: true }
    });
    
    expect(result).toContain('BUSINESS.md');
    expect(result).toContain('ARCHITECTURE.md');
  });
});
```

- [ ] **Step 2: 运行测试确保失败**

```bash
cd D:\work\study\Kimi_Agent_OpenAI_Harness\harness-cli
npm test -- src/templates/__tests__/smart-agents.test.ts
```

Expected: FAIL (模板不存在或行数过多)

- [ ] **Step 3: 重写精简版模板**

```handlebars
{{! src/templates/smart-agents.md.hbs }}
# AGENTS.md - {{projectName}} Agent 协作指南

> 本文档是 AI Agent 的入口指南，长度控制在 80-120 行

## 1. 快速开始 (2分钟)

### 1.1 项目概述
- **项目名称**: {{projectName}}
- **技术栈**: {{techStack.backend}}{{#if techStack.frontend}} / {{techStack.frontend}}{{/if}}
- **核心功能**: {{coreFeatures.length}}个核心模块

### 1.2 环境准备
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
src/
├── types/          # Layer 1: 类型定义
├── config/         # Layer 2: 配置管理
├── repo/           # Layer 3: 数据访问
├── service/        # Layer 4: 业务逻辑
├── runtime/        # Layer 5: 运行时
└── ui/             # Layer 6: 界面层
```

## 3. 关键文档索引

| 文档 | 路径 | 阅读时间 |
|------|------|----------|
{{#if availableDocs.business}}| 业务描述 | docs/BUSINESS.md | 3 min |
{{/if}}
{{#if availableDocs.architecture}}| 架构总览 | docs/ARCHITECTURE.md | 5 min |
{{/if}}
| 初始任务 | .harness/tasks/001-initial.yaml | 5 min |
| API 文档 | docs/API.md | 10 min |
| 开发规范 | docs/DEVELOPMENT.md | 5 min |

## 4. 常见任务

### 4.1 添加新功能
1. 在 `src/types/` 定义类型
2. 在 `src/service/` 实现业务逻辑
3. 添加单元测试
4. 更新文档

### 4.2 修复 Bug
1. 编写回归测试
2. 实施修复
3. 运行测试验证

## 5. 重要约束

- ❌ 不要违反层依赖规则（下层不依赖上层）
- ✅ 必须为新功能编写测试
- ⚠️ 复杂逻辑需要注释说明

## 6. 寻求帮助

- 查看 docs/references/troubleshooting.md
- 运行 `harness status` 查看系统状态
```

- [ ] **Step 4: 运行测试确保通过**

```bash
npm test -- src/templates/__tests__/smart-agents.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/templates/smart-agents.md.hbs src/templates/__tests__/smart-agents.test.ts
git commit -m "refactor(template): simplify AGENTS.md to 60-80 lines"
```

---

### Task 2: 创建详细业务描述模板

**Files:**
- Create: `src/templates/business.md.hbs`
- Test: `src/templates/__tests__/business.test.ts`

- [ ] **Step 1: 编写模板测试**

```typescript
// src/templates/__tests__/business.test.ts
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('business.md.hbs', () => {
  it('should render business description', async () => {
    const templateSource = await fs.readFile(
      path.join(__dirname, '../business.md.hbs'),
      'utf-8'
    );
    const template = Handlebars.compile(templateSource);
    
    const result = template({
      projectName: 'test-project',
      businessDescription: 'Test business description',
      coreFeatures: ['Feature 1', 'Feature 2']
    });
    
    expect(result).toContain('test-project');
    expect(result).toContain('Test business description');
    expect(result).toContain('Feature 1');
  });
});
```

- [ ] **Step 2: 运行测试确保失败**

```bash
npm test -- src/templates/__tests__/business.test.ts
```

Expected: FAIL (文件不存在)

- [ ] **Step 3: 创建业务描述模板**

```handlebars
{{! src/templates/business.md.hbs }}
# BUSINESS.md - {{projectName}} 业务描述

## 项目概述

{{projectName}} 的核心业务是：

{{{businessDescription}}}

## 核心功能

{{#each coreFeatures}}
- **{{this}}**
{{/each}}

## 目标用户

基于业务分析确定的目标用户群体。

## 价值主张

项目的核心价值和竞争优势。

---
*本文档由 Harness CLI 智能分析自动生成*
```

- [ ] **Step 4: 运行测试确保通过**

```bash
npm test -- src/templates/__tests__/business.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/templates/business.md.hbs src/templates/__tests__/business.test.ts
git commit -m "feat(template): add BUSINESS.md template for detailed description"
```

---

### Task 3: 创建架构描述模板

**Files:**
- Create: `src/templates/architecture.md.hbs`
- Test: `src/templates/__tests__/architecture.test.ts`

- [ ] **Step 1: 编写模板测试**

```typescript
// src/templates/__tests__/architecture.test.ts
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('architecture.md.hbs', () => {
  it('should render architecture details', async () => {
    const templateSource = await fs.readFile(
      path.join(__dirname, '../architecture.md.hbs'),
      'utf-8'
    );
    const template = Handlebars.compile(templateSource);
    
    const result = template({
      projectName: 'test-project',
      techStack: {
        backend: 'Node.js',
        frontend: 'React',
        database: 'PostgreSQL'
      },
      directoryStructure: [
        { name: 'src', type: 'directory', description: 'Source code' }
      ]
    });
    
    expect(result).toContain('Node.js');
    expect(result).toContain('React');
    expect(result).toContain('Source code');
  });
});
```

- [ ] **Step 2: 运行测试确保失败**

```bash
npm test -- src/templates/__tests__/architecture.test.ts
```

Expected: FAIL

- [ ] **Step 3: 创建架构模板**

```handlebars
{{! src/templates/architecture.md.hbs }}
# ARCHITECTURE.md - {{projectName}} 架构总览

## 技术栈

### 后端
{{techStack.backend}}

### 前端
{{#if techStack.frontend}}{{techStack.frontend}}{{else}}待定{{/if}}

### 数据库
{{techStack.database}}

{{#if techStack.other}}
### 其他技术
{{#each techStack.other}}
- {{this}}
{{/each}}
{{/if}}

## 项目结构

```
{{#each directoryStructure}}
{{name}}{{#if (eq type 'directory')}}/{{/if}}  # {{description}}
{{/each}}
```

## 架构决策

待补充：关键架构决策记录（ADR）

---
*本文档由 Harness CLI 智能分析自动生成*
```

- [ ] **Step 4: 运行测试确保通过**

```bash
npm test -- src/templates/__tests__/architecture.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/templates/architecture.md.hbs src/templates/__tests__/architecture.test.ts
git commit -m "feat(template): add ARCHITECTURE.md template"
```

---

### Task 4: 修改 InitCommand 支持分层文档

**Files:**
- Modify: `src/commands/InitCommand.ts`
- Test: `src/commands/__tests__/InitCommand.test.ts`

- [ ] **Step 1: 查看现有 InitCommand 的 generateSmartDocs 方法**

```bash
cat src/commands/InitCommand.ts | grep -A 30 "generateSmartDocs"
```

- [ ] **Step 2: 修改 generateSmartDocs 方法**

```typescript
// src/commands/InitCommand.ts 中修改 generateSmartDocs 方法

private async generateSmartDocs(
  targetDir: string, 
  analysis: BusinessAnalysis,
  options: { skipAnalysis?: boolean } = {}
): Promise<void> {
  // 注册 Handlebars 辅助函数
  Handlebars.registerHelper('eq', (a, b) => a === b);

  // 读取所有模板
  const templateDir = path.join(__dirname, '../templates');
  const agentsTemplateSource = await fs.readFile(
    path.join(templateDir, 'smart-agents.md.hbs'), 
    'utf-8'
  );
  const businessTemplateSource = options.skipAnalysis 
    ? null 
    : await fs.readFile(path.join(templateDir, 'business.md.hbs'), 'utf-8');
  const architectureTemplateSource = options.skipAnalysis
    ? null
    : await fs.readFile(path.join(templateDir, 'architecture.md.hbs'), 'utf-8');
  const taskTemplateSource = await fs.readFile(
    path.join(templateDir, 'initial-task.yaml.hbs'),
    'utf-8'
  );

  // 编译模板
  const agentsTemplate = Handlebars.compile(agentsTemplateSource);
  const taskTemplate = Handlebars.compile(taskTemplateSource);

  // 准备可用文档列表
  const availableDocs: { business?: boolean; architecture?: boolean } = {};
  
  // 生成简洁的 AGENTS.md
  const agentsContent = agentsTemplate({
    ...analysis,
    availableDocs
  });
  await fs.writeFile(path.join(targetDir, 'AGENTS.md'), agentsContent, 'utf-8');

  // 如果启用了智能分析，生成详细文档
  if (!options.skipAnalysis && businessTemplateSource && architectureTemplateSource) {
    const businessTemplate = Handlebars.compile(businessTemplateSource);
    const architectureTemplate = Handlebars.compile(architectureTemplateSource);

    // 创建 docs 目录
    const docsDir = path.join(targetDir, 'docs');
    await fs.mkdir(docsDir, { recursive: true });

    // 生成业务描述文档
    const businessContent = businessTemplate(analysis);
    await fs.writeFile(path.join(docsDir, 'BUSINESS.md'), businessContent, 'utf-8');
    availableDocs.business = true;

    // 生成架构文档
    const architectureContent = architectureTemplate(analysis);
    await fs.writeFile(path.join(docsDir, 'ARCHITECTURE.md'), architectureContent, 'utf-8');
    availableDocs.architecture = true;

    // 更新 AGENTS.md（包含新文档链接）
    const updatedAgentsContent = agentsTemplate({
      ...analysis,
      availableDocs
    });
    await fs.writeFile(path.join(targetDir, 'AGENTS.md'), updatedAgentsContent, 'utf-8');
  }

  // 创建任务目录
  const tasksDir = path.join(targetDir, '.harness', 'tasks');
  await fs.mkdir(tasksDir, { recursive: true });

  // 生成初始任务文件
  const tasksContent = taskTemplate(analysis);
  await fs.writeFile(path.join(tasksDir, '001-initial-tasks.yaml'), tasksContent, 'utf-8');
}
```

- [ ] **Step 3: 更新 execute 方法调用**

```typescript
// 在 execute 方法中找到 generateSmartDocs 调用
// 修改为：
await this.generateSmartDocs(targetDir, businessAnalysis, {
  skipAnalysis: options.skipAnalysis
});
```

- [ ] **Step 4: 运行现有测试**

```bash
npm test -- src/commands/__tests__/InitCommand.test.ts
```

Expected: 部分测试可能需要更新

- [ ] **Step 5: Commit**

```bash
git add src/commands/InitCommand.ts
git commit -m "feat(commands): update InitCommand to support layered documentation"
```

---

## Phase 2: 实现自动填充系统

### Task 5: 实现敏感信息过滤器

**Files:**
- Create: `src/docs/autofiller/SensitiveFilter.ts`
- Test: `src/docs/autofiller/__tests__/SensitiveFilter.test.ts`

- [ ] **Step 1: 编写敏感信息过滤器测试**

```typescript
// src/docs/autofiller/__tests__/SensitiveFilter.test.ts
import { SensitiveFilter } from '../SensitiveFilter';

describe('SensitiveFilter', () => {
  let filter: SensitiveFilter;

  beforeEach(() => {
    filter = new SensitiveFilter();
  });

  it('should detect API keys', () => {
    const code = `const apiKey = 'sk-1234567890abcdef';`;
    expect(filter.containsSensitive(code)).toBe(true);
  });

  it('should detect passwords', () => {
    const code = `const password = 'secret123';`;
    expect(filter.containsSensitive(code)).toBe(true);
  });

  it('should not flag normal code', () => {
    const code = `const userName = 'john';`;
    expect(filter.containsSensitive(code)).toBe(false);
  });

  it('should sanitize sensitive content', () => {
    const code = `apiKey: 'sk-1234567890abcdef'`;
    const sanitized = filter.sanitize(code);
    expect(sanitized).toContain('***');
    expect(sanitized).not.toContain('sk-1234567890abcdef');
  });
});
```

- [ ] **Step 2: 运行测试确保失败**

```bash
npm test -- src/docs/autofiller/__tests__/SensitiveFilter.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现敏感信息过滤器**

```typescript
// src/docs/autofiller/SensitiveFilter.ts

export class SensitiveFilter {
  private patterns: RegExp[] = [
    /api[_-]?key\s*[=:]\s*['"][^'"]{8,}['"]/i,
    /password\s*[=:]\s*['"][^'"]+['"]/i,
    /secret\s*[=:]\s*['"][^'"]+['"]/i,
    /token\s*[=:]\s*['"][^'"]{16,}['"]/i,
    /private[_-]?key\s*[=:]\s*['"][^'"]+['"]/i,
    /aws[_-]?access[_-]?key\s*[=:]\s*['"][^'"]+['"]/i,
    /connection[_-]?string\s*[=:]\s*['"][^'"]+['"]/i,
  ];

  containsSensitive(content: string): boolean {
    return this.patterns.some(pattern => pattern.test(content));
  }

  sanitize(content: string): string {
    let sanitized = content;
    for (const pattern of this.patterns) {
      sanitized = sanitized.replace(pattern, (match) => {
        // 保留变量名，替换值
        const keyPart = match.split(/[=:]/)[0];
        return `${keyPart}= '***'`;
      });
    }
    return sanitized;
  }

  filterFileContent(content: string): string | null {
    if (this.containsSensitive(content)) {
      return this.sanitize(content);
    }
    return content;
  }
}
```

- [ ] **Step 4: 运行测试确保通过**

```bash
npm test -- src/docs/autofiller/__tests__/SensitiveFilter.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/docs/autofiller/SensitiveFilter.ts src/docs/autofiller/__tests__/SensitiveFilter.test.ts
git commit -m "feat(autofiller): add SensitiveFilter to prevent leaking secrets"
```

---

### Task 6: 实现代码特征提取器

**Files:**
- Create: `src/docs/autofiller/CodeFeatureExtractor.ts`
- Test: `src/docs/autofiller/__tests__/CodeFeatureExtractor.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
// src/docs/autofiller/__tests__/CodeFeatureExtractor.test.ts
import { CodeFeatureExtractor } from '../CodeFeatureExtractor';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('CodeFeatureExtractor', () => {
  let extractor: CodeFeatureExtractor;
  let testDir: string;

  beforeEach(async () => {
    extractor = new CodeFeatureExtractor();
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true });
  });

  it('should extract entities from TypeORM decorators', async () => {
    await fs.writeFile(
      path.join(testDir, 'User.ts'),
      `@Entity() export class User { @PrimaryKey() id: string; }`
    );

    const features = await extractor.extract(testDir);
    expect(features.domain.entities).toContain('User');
  });

  it('should extract API routes from Express/NestJS', async () => {
    await fs.writeFile(
      path.join(testDir, 'routes.ts'),
      `router.get('/api/users', userController.list);`
    );

    const features = await extractor.extract(testDir);
    expect(features.api.routes).toContain('/api/users');
  });

  it('should detect database from dependencies', async () => {
    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({ dependencies: { 'pg': '^8.0.0' } })
    );

    const features = await extractor.extract(testDir);
    expect(features.tech.databases).toContain('PostgreSQL');
  });
});
```

- [ ] **Step 2: 运行测试确保失败**

```bash
npm test -- src/docs/autofiller/__tests__/CodeFeatureExtractor.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现代码特征提取器**

```typescript
// src/docs/autofiller/CodeFeatureExtractor.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { SensitiveFilter } from './SensitiveFilter';

export interface CodeFeatures {
  api: {
    routes: string[];
    controllers: string[];
    middlewares: string[];
  };
  domain: {
    entities: string[];
    services: string[];
    repositories: string[];
  };
  tech: {
    frameworks: string[];
    databases: string[];
    integrations: string[];
  };
}

export class CodeFeatureExtractor {
  private sensitiveFilter: SensitiveFilter;

  constructor() {
    this.sensitiveFilter = new SensitiveFilter();
  }

  async extract(projectPath: string): Promise<CodeFeatures> {
    const features: CodeFeatures = {
      api: { routes: [], controllers: [], middlewares: [] },
      domain: { entities: [], services: [], repositories: [] },
      tech: { frameworks: [], databases: [], integrations: [] }
    };

    await this.scanDirectory(projectPath, features);
    await this.detectTechFromPackageJson(projectPath, features);

    // 去重
    features.api.routes = [...new Set(features.api.routes)];
    features.domain.entities = [...new Set(features.domain.entities)];
    features.tech.frameworks = [...new Set(features.tech.frameworks)];

    return features;
  }

  private async scanDirectory(dir: string, features: CodeFeatures): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // 跳过 node_modules 等
        if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
          continue;
        }
        await this.scanDirectory(fullPath, features);
      } else if (entry.isFile() && /\.(ts|js|tsx|jsx)$/.test(entry.name)) {
        await this.parseSourceFile(fullPath, features);
      }
    }
  }

  private async parseSourceFile(filePath: string, features: CodeFeatures): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // 跳过包含敏感信息的文件
      if (this.sensitiveFilter.containsSensitive(content)) {
        return;
      }

      // 提取实体
      const entityMatches = content.match(/@Entity\([\s\S]*?\)\s*(?:export\s+)?class\s+(\w+)/g);
      if (entityMatches) {
        entityMatches.forEach(match => {
          const className = match.match(/class\s+(\w+)/)?.[1];
          if (className) features.domain.entities.push(className);
        });
      }

      // 提取服务
      const serviceMatches = content.match(/@Injectable\([\s\S]*?\)\s*(?:export\s+)?class\s+(\w+Service)/g);
      if (serviceMatches) {
        serviceMatches.forEach(match => {
          const className = match.match(/class\s+(\w+)/)?.[1];
          if (className) features.domain.services.push(className);
        });
      }

      // 提取 API 路由
      const routeMatches = content.match(/['"`]\/(api\/[^'"`]+)['"`]/g);
      if (routeMatches) {
        routeMatches.forEach(match => {
          const route = match.replace(/['"`]/g, '');
          if (route) features.api.routes.push(route);
        });
      }

      // 提取控制器
      const controllerMatches = content.match(/@Controller\([\s\S]*?\)\s*(?:export\s+)?class\s+(\w+Controller)/g);
      if (controllerMatches) {
        controllerMatches.forEach(match => {
          const className = match.match(/class\s+(\w+)/)?.[1];
          if (className) features.api.controllers.push(className);
        });
      }
    } catch (error) {
      // 忽略无法解析的文件
    }
  }

  private async detectTechFromPackageJson(projectPath: string, features: CodeFeatures): Promise<void> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      // 检测框架
      if (deps['@nestjs/core']) features.tech.frameworks.push('NestJS');
      if (deps['express']) features.tech.frameworks.push('Express');
      if (deps['fastify']) features.tech.frameworks.push('Fastify');
      if (deps['next']) features.tech.frameworks.push('Next.js');

      // 检测数据库
      if (deps['pg'] || deps['postgresql']) features.tech.databases.push('PostgreSQL');
      if (deps['mysql2'] || deps['mysql']) features.tech.databases.push('MySQL');
      if (deps['mongoose'] || deps['mongodb']) features.tech.databases.push('MongoDB');
      if (deps['redis'] || deps['ioredis']) features.tech.databases.push('Redis');
      if (deps['@prisma/client']) features.tech.databases.push('Prisma');
      if (deps['typeorm']) features.tech.databases.push('TypeORM');

      // 检测集成
      if (deps['stripe']) features.tech.integrations.push('Stripe');
      if (deps['@sendgrid/mail']) features.tech.integrations.push('SendGrid');
      if (deps['aws-sdk']) features.tech.integrations.push('AWS');
    } catch (error) {
      // 忽略无法读取的 package.json
    }
  }
}
```

- [ ] **Step 4: 运行测试确保通过**

```bash
npm test -- src/docs/autofiller/__tests__/CodeFeatureExtractor.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/docs/autofiller/CodeFeatureExtractor.ts src/docs/autofiller/__tests__/CodeFeatureExtractor.test.ts
git commit -m "feat(autofiller): implement CodeFeatureExtractor to scan project structure"
```

---

### Task 7: 实现业务描述生成器

**Files:**
- Create: `src/docs/autofiller/BusinessGenerator.ts`
- Test: `src/docs/autofiller/__tests__/BusinessGenerator.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
// src/docs/autofiller/__tests__/BusinessGenerator.test.ts
import { BusinessGenerator } from '../BusinessGenerator';
import { CodeFeatures } from '../CodeFeatureExtractor';

describe('BusinessGenerator', () => {
  let generator: BusinessGenerator;

  beforeEach(() => {
    generator = new BusinessGenerator();
  });

  it('should generate business domains from entities', () => {
    const features: CodeFeatures = {
      api: { routes: [], controllers: [], middlewares: [] },
      domain: { entities: ['User', 'Account'], services: [], repositories: [] },
      tech: { frameworks: [], databases: [], integrations: [] }
    };

    const description = generator.generate(features);
    expect(description).toContain('用户管理');
  });

  it('should generate features from API routes', () => {
    const features: CodeFeatures = {
      api: { routes: ['/api/orders', '/api/payments'], controllers: [], middlewares: [] },
      domain: { entities: [], services: [], repositories: [] },
      tech: { frameworks: [], databases: [], integrations: [] }
    };

    const description = generator.generate(features);
    expect(description).toContain('订单');
  });

  it('should handle empty features', () => {
    const features: CodeFeatures = {
      api: { routes: [], controllers: [], middlewares: [] },
      domain: { entities: [], services: [], repositories: [] },
      tech: { frameworks: [], databases: [], integrations: [] }
    };

    const description = generator.generate(features);
    expect(description).toContain('待补充');
  });
});
```

- [ ] **Step 2: 运行测试确保失败**

```bash
npm test -- src/docs/autofiller/__tests__/BusinessGenerator.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现业务描述生成器**

```typescript
// src/docs/autofiller/BusinessGenerator.ts
import { CodeFeatures } from './CodeFeatureExtractor';

interface MappingRule {
  id: string;
  match: (features: CodeFeatures) => string[] | null;
  transform: (matches: string[]) => string[];
}

export class BusinessGenerator {
  private mappingRules: MappingRule[];

  constructor() {
    this.mappingRules = this.initializeRules();
  }

  generate(features: CodeFeatures): string {
    const domains: string[] = [];
    const functionalities: string[] = [];

    // 应用所有映射规则
    for (const rule of this.mappingRules) {
      const matches = rule.match(features);
      if (matches && matches.length > 0) {
        const results = rule.transform(matches);
        if (rule.id.includes('domain')) {
          domains.push(...results);
        } else {
          functionalities.push(...results);
        }
      }
    }

    // 去重
    const uniqueDomains = [...new Set(domains)];
    const uniqueFunctionalities = [...new Set(functionalities)];

    // 生成描述
    if (uniqueDomains.length === 0 && uniqueFunctionalities.length === 0) {
      return '待补充：基于代码的业务系统，需要进一步分析以确定具体业务领域。';
    }

    let description = '';
    if (uniqueDomains.length > 0) {
      description += `核心业务领域包括：${uniqueDomains.join('、')}。`;
    }
    if (uniqueFunctionalities.length > 0) {
      description += `主要功能模块：${uniqueFunctionalities.join('、')}。`;
    }

    return description;
  }

  generateCoreFeatures(features: CodeFeatures): string[] {
    const features_list: string[] = [];

    // 从实体生成核心功能
    if (features.domain.entities.some(e => /user|account|auth/i.test(e))) {
      features_list.push('用户认证与权限管理');
    }
    if (features.domain.entities.some(e => /order|cart|payment/i.test(e))) {
      features_list.push('订单与支付处理');
    }
    if (features.domain.entities.some(e => /product|item|goods|sku/i.test(e))) {
      features_list.push('商品与库存管理');
    }
    if (features.domain.entities.some(e => /notification|message/i.test(e))) {
      features_list.push('消息通知系统');
    }

    // 从 API 生成核心功能
    if (features.api.routes.some(r => /webhook|integration/i.test(r))) {
      features_list.push('第三方系统集成');
    }

    // 从数据库生成核心功能
    if (features.tech.databases.includes('Redis')) {
      features_list.push('高性能缓存层');
    }

    return features_list.length > 0 ? features_list : ['核心业务功能待补充'];
  }

  private initializeRules(): MappingRule[] {
    return [
      {
        id: 'entities-domain-user',
        match: (f) => f.domain.entities.filter(e => /user|account|profile|auth/i.test(e)),
        transform: () => ['用户管理']
      },
      {
        id: 'entities-domain-order',
        match: (f) => f.domain.entities.filter(e => /order|cart|payment|checkout/i.test(e)),
        transform: () => ['订单与支付']
      },
      {
        id: 'entities-domain-product',
        match: (f) => f.domain.entities.filter(e => /product|sku|item|goods|inventory/i.test(e)),
        transform: () => ['商品与库存']
      },
      {
        id: 'entities-domain-notification',
        match: (f) => f.domain.entities.filter(e => /notification|message|email|sms/i.test(e)),
        transform: () => ['消息通知']
      },
      {
        id: 'routes-feature-auth',
        match: (f) => f.api.routes.filter(r => /auth|login|oauth/i.test(r)),
        transform: () => ['用户认证']
      },
      {
        id: 'routes-feature-api',
        match: (f) => f.api.routes.filter(r => /api\/v\d+/i.test(r)),
        transform: () => ['RESTful API 服务']
      }
    ];
  }
}
```

- [ ] **Step 4: 运行测试确保通过**

```bash
npm test -- src/docs/autofiller/__tests__/BusinessGenerator.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/docs/autofiller/BusinessGenerator.ts src/docs/autofiller/__tests__/BusinessGenerator.test.ts
git commit -m "feat(autofiller): implement BusinessGenerator with mapping rules"
```

---

### Task 8: 实现文档更新器

**Files:**
- Create: `src/docs/autofiller/DocsUpdater.ts`
- Test: `src/docs/autofiller/__tests__/DocsUpdater.test.ts`
- Create: `src/docs/autofiller/index.ts`

- [ ] **Step 1: 编写测试**

```typescript
// src/docs/autofiller/__tests__/DocsUpdater.test.ts
import { DocsUpdater } from '../DocsUpdater';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('DocsUpdater', () => {
  let updater: DocsUpdater;
  let testDir: string;

  beforeEach(async () => {
    updater = new DocsUpdater();
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true });
  });

  it('should detect placeholder in AGENTS.md', async () => {
    await fs.writeFile(
      path.join(testDir, 'AGENTS.md'),
      '## 业务描述\n待补充\n'
    );

    const placeholders = await updater.detectPlaceholders(testDir);
    expect(placeholders).toContain('businessDescription');
  });

  it('should update placeholder with new content', async () => {
    const originalContent = '## 业务描述\n待补充\n\n## 其他';
    await fs.writeFile(path.join(testDir, 'AGENTS.md'), originalContent);

    await updater.updateSection(testDir, 'businessDescription', '新的业务描述');

    const updated = await fs.readFile(path.join(testDir, 'AGENTS.md'), 'utf-8');
    expect(updated).toContain('新的业务描述');
    expect(updated).not.toContain('待补充');
    expect(updated).toContain('## 其他'); // 保留其他内容
  });

  it('should not update if user has manually edited', async () => {
    const originalContent = '## 业务描述\n这是用户手动写的内容\n';
    await fs.writeFile(path.join(testDir, 'AGENTS.md'), originalContent);

    await updater.updateSection(testDir, 'businessDescription', '自动生成的内容');

    const updated = await fs.readFile(path.join(testDir, 'AGENTS.md'), 'utf-8');
    expect(updated).toContain('这是用户手动写的内容');
    expect(updated).not.toContain('自动生成的内容');
  });
});
```

- [ ] **Step 2: 运行测试确保失败**

```bash
npm test -- src/docs/autofiller/__tests__/DocsUpdater.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现文档更新器**

```typescript
// src/docs/autofiller/DocsUpdater.ts
import * as fs from 'fs/promises';
import * as path from 'path';

export interface PlaceholderInfo {
  section: string;
  lineNumber: number;
  currentContent: string;
}

export class DocsUpdater {
  private placeholderPatterns: Map<string, RegExp>;

  constructor() {
    this.placeholderPatterns = new Map([
      ['businessDescription', /##?\s*业务描述[\s\S]*?(?=##|$)/i],
      ['coreFeatures', /##?\s*核心功能[\s\S]*?(?=##|$)/i],
      ['targetUsers', /##?\s*目标用户[\s\S]*?(?=##|$)/i],
    ]);
  }

  async detectPlaceholders(projectPath: string): Promise<string[]> {
    const agentsMdPath = path.join(projectPath, 'AGENTS.md');
    const placeholders: string[] = [];

    try {
      const content = await fs.readFile(agentsMdPath, 'utf-8');
      
      for (const [section, pattern] of this.placeholderPatterns) {
        const match = content.match(pattern);
        if (match && this.isPlaceholder(match[0])) {
          placeholders.push(section);
        }
      }
    } catch (error) {
      // AGENTS.md 不存在
    }

    return placeholders;
  }

  async updateSection(
    projectPath: string,
    section: string,
    newContent: string
  ): Promise<boolean> {
    const agentsMdPath = path.join(projectPath, 'AGENTS.md');

    try {
      const content = await fs.readFile(agentsMdPath, 'utf-8');
      const pattern = this.placeholderPatterns.get(section);
      
      if (!pattern) {
        return false;
      }

      const match = content.match(pattern);
      if (!match) {
        return false;
      }

      const currentSection = match[0];
      
      // 如果用户已手动编辑（不包含"待补充"），不覆盖
      if (!this.isPlaceholder(currentSection)) {
        return false;
      }

      // 构建新的章节内容
      const sectionTitle = this.extractTitle(currentSection);
      const updatedSection = `${sectionTitle}\n\n${newContent}`;

      // 替换内容
      const newFileContent = content.replace(currentSection, updatedSection);
      await fs.writeFile(agentsMdPath, newFileContent, 'utf-8');

      return true;
    } catch (error) {
      return false;
    }
  }

  async updateMetadata(
    projectPath: string,
    section: string,
    source: 'code-inference' | 'llm-analysis' | 'manual',
    confidence: number
  ): Promise<void> {
    const metaPath = path.join(projectPath, '.harness', 'docs-meta.json');
    
    let meta: any = {};
    try {
      const content = await fs.readFile(metaPath, 'utf-8');
      meta = JSON.parse(content);
    } catch {
      // 文件不存在，创建新的
    }

    if (!meta.autofilled) {
      meta.autofilled = {};
    }

    meta.autofilled[section] = {
      timestamp: new Date().toISOString(),
      source,
      confidence
    };

    await fs.mkdir(path.dirname(metaPath), { recursive: true });
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  }

  private isPlaceholder(content: string): boolean {
    const placeholderIndicators = [
      '待补充',
      'TODO',
      'FIXME',
      'TBD',
      '待定',
      '待完善'
    ];
    return placeholderIndicators.some(indicator => content.includes(indicator));
  }

  private extractTitle(section: string): string {
    const lines = section.split('\n');
    return lines[0].trim();
  }
}
```

- [ ] **Step 4: 创建模块导出**

```typescript
// src/docs/autofiller/index.ts
export { CodeFeatureExtractor, CodeFeatures } from './CodeFeatureExtractor';
export { BusinessGenerator } from './BusinessGenerator';
export { DocsUpdater, PlaceholderInfo } from './DocsUpdater';
export { SensitiveFilter } from './SensitiveFilter';
```

- [ ] **Step 5: 运行测试确保通过**

```bash
npm test -- src/docs/autofiller/__tests__/DocsUpdater.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/docs/autofiller/
git commit -m "feat(autofiller): implement DocsUpdater with incremental update support"
```

---

## Phase 3: 集成到 Loop

### Task 9: 集成自动填充到 LoopController

**Files:**
- Modify: `src/core/LoopController.ts`

- [ ] **Step 1: 在 LoopController 中添加自动填充触发**

```typescript
// src/core/LoopController.ts
// 在 generateTasksFromProject 方法后添加新方法

import { CodeFeatureExtractor, BusinessGenerator, DocsUpdater } from '../docs/autofiller';

// ... existing code ...

private async autoFillDocs(): Promise<void> {
  try {
    this.logger.info('[DocsAutofill] Checking for placeholders in AGENTS.md...');

    const extractor = new CodeFeatureExtractor();
    const generator = new BusinessGenerator();
    const updater = new DocsUpdater();

    // 检测占位符
    const placeholders = await updater.detectPlaceholders(this.projectPath);
    
    if (placeholders.length === 0) {
      this.logger.info('[DocsAutofill] No placeholders found');
      return;
    }

    this.logger.info(`[DocsAutofill] Found ${placeholders.length} placeholders: ${placeholders.join(', ')}`);

    // 扫描代码
    const features = await extractor.extract(this.projectPath);

    // 生成并更新每个占位符
    for (const placeholder of placeholders) {
      if (placeholder === 'businessDescription') {
        const description = generator.generate(features);
        const updated = await updater.updateSection(
          this.projectPath,
          'businessDescription',
          description
        );
        
        if (updated) {
          await updater.updateMetadata(
            this.projectPath,
            'businessDescription',
            'code-inference',
            0.7
          );
          this.logger.info('[DocsAutofill] Updated businessDescription');
        }
      }
      
      // 可以扩展其他占位符的处理
    }
  } catch (error) {
    this.logger.warn('[DocsAutofill] Error during auto-fill:', error);
    // 失败不阻塞主流程
  }
}
```

- [ ] **Step 2: 在 Loop 启动时调用自动填充**

```typescript
// 在 start 方法中添加

public async start(options: LoopOptions): Promise<void> {
  // ... existing code ...
  
  // 启动时尝试自动填充文档
  await this.autoFillDocs();
  
  // ... rest of start logic ...
}
```

- [ ] **Step 3: 运行测试**

```bash
npm test -- src/core/__tests__/LoopController.test.ts
```

Expected: 通过或需要更新测试

- [ ] **Step 4: Commit**

```bash
git add src/core/LoopController.ts
git commit -m "feat(loop): integrate docs autofiller into LoopController"
```

---

## Phase 4: 验证与清理

### Task 10: 运行完整测试套件

- [ ] **Step 1: 运行所有相关测试**

```bash
npm test -- --testPathPattern="(InitCommand|LoopController|autofiller)"
```

- [ ] **Step 2: 确保构建成功**

```bash
npm run build
```

- [ ] **Step 3: 创建测试项目验证功能**

```bash
# 创建测试项目
mkdir -p /tmp/test-agents-md && cd /tmp/test-agents-md
npm init -y

# 添加示例代码
cat > User.ts << 'EOF'
@Entity()
export class User {
  @PrimaryKey() id: string;
  @Property() email: string;
}
EOF

cat > Order.ts << 'EOF'
@Entity()
export class Order {
  @PrimaryKey() id: string;
  @ManyToOne(() => User) user: User;
}
EOF

# 运行 harness create（跳过分析）
harness create test-project --template node-ts --skip-analysis

# 检查 AGENTS.md 行数
wc -l test-project/AGENTS.md
# Expected: ~60-80 行
```

- [ ] **Step 4: 最终 Commit**

```bash
git add .
git commit -m "feat: complete AGENTS.md refactoring with autofiller system"
```

---

## 自检清单

**Plan complete and saved to `docs/superpowers/plans/2026-04-10-agents-md-refactoring.md`.**

**Spec coverage check:**
- ✅ 精简 AGENTS.md 模板 (Task 1)
- ✅ 分层文档生成 (Task 2, 3, 4)
- ✅ 敏感信息过滤 (Task 5)
- ✅ 代码特征提取 (Task 6)
- ✅ 业务描述生成 (Task 7)
- ✅ 增量文档更新 (Task 8)
- ✅ Loop 集成 (Task 9)
- ✅ 测试覆盖 (每个 Task 包含测试)

**Placeholder scan:**
- ✅ 无 TBD/TODO
- ✅ 无 "implement later"
- ✅ 所有步骤包含具体代码

**Type consistency:**
- ✅ CodeFeatures 接口在各处一致
- ✅ PlaceholderInfo 接口匹配

---

## 执行选项

**Plan complete and saved to `docs/superpowers/plans/2026-04-10-agents-md-refactoring.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints for review

**Which approach?**
