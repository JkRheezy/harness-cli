# Specification-Driven Gap Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 harness-cli 的任务生成系统，从硬编码电商模板转变为基于 AGENTS.md/ARCHITECTURE.md 与代码差距分析的智能任务生成。

**Architecture:** 创建 GapAnalysisEngine，包含四个核心组件：SpecParser（LLM解析规范）、CodeScanner（AST扫描代码）、GapDetector（对比差距）、TaskGenerator（生成任务）。采用 TDD 开发，每个组件先有测试后实现。

**Tech Stack:** TypeScript, Jest (testing), AST parsing (TypeScript compiler API), LLM integration (existing harness LLM client)

---

## File Structure Overview

```
src/
├── core/
│   ├── analysis/
│   │   ├── types.ts                      # 类型定义 (Gap, Spec, Implementation, Task)
│   │   ├── GapAnalysisEngine.ts          # 主引擎，协调四个组件
│   │   ├── SpecParser.ts                 # 解析 AGENTS.md/ARCHITECTURE.md
│   │   ├── CodeScanner.ts                # 扫描源代码
│   │   ├── GapDetector.ts                # 检测规范与实现的差距
│   │   ├── TaskGenerator.ts              # 基于差距生成任务
│   │   └── __tests__/
│   │       ├── GapAnalysisEngine.test.ts
│   │       ├── SpecParser.test.ts
│   │       ├── CodeScanner.test.ts
│   │       ├── GapDetector.test.ts
│   │       └── TaskGenerator.test.ts
```

---

## Task 1: Create Type Definitions

**Files:**
- Create: `src/core/analysis/types.ts`
- Test: `src/core/analysis/__tests__/types.test.ts`

- [ ] **Step 1: Write the type definitions file**

Create `src/core/analysis/types.ts`:

```typescript
/**
 * 规范驱动的差距分析 - 类型定义
 */

// ============================================================================
// 目标架构（来自规范文档）
// ============================================================================

export interface TargetArchitecture {
  version: string;
  parsedAt: Date;
  agents: AgentSpec[];
  modules: ModuleSpec[];
  interfaces: InterfaceSpec[];
  dataModels: DataModelSpec[];
  workflows: WorkflowSpec[];
}

export interface AgentSpec {
  name: string;
  description: string;
  responsibilities: string[];
  skills: string[];
  expectedFiles: string[];
  dependencies: string[];
}

export interface ModuleSpec {
  name: string;
  description: string;
  layer: 'api' | 'service' | 'data' | 'ui';
  exposedInterfaces: string[];
  dependencies: string[];
  expectedFiles: string[];
  acceptanceCriteria: string[];
}

export interface InterfaceSpec {
  name: string;
  type: 'class' | 'function' | 'api' | 'event';
  signature: string;
  module: string;
  description: string;
}

export interface DataModelSpec {
  name: string;
  fields: DataField[];
  relations: DataRelation[];
}

export interface DataField {
  name: string;
  type: string;
  optional: boolean;
}

export interface DataRelation {
  target: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface WorkflowSpec {
  name: string;
  description: string;
  steps: WorkflowStep[];
  participants: string[];
}

export interface WorkflowStep {
  name: string;
  description: string;
  actor: string;
}

// ============================================================================
// 当前实现（来自代码扫描）
// ============================================================================

export interface CurrentImplementation {
  scannedAt: Date;
  agents: ImplementedAgent[];
  modules: ImplementedModule[];
  files: SourceFile[];
  exports: ExportSymbol[];
}

export interface ImplementedAgent {
  name: string;
  files: string[];
  detectedResponsibilities: string[];
  completeness: number;
}

export interface ImplementedModule {
  name: string;
  files: string[];
  exportedSymbols: string[];
  detectedLayer?: string;
}

export interface SourceFile {
  path: string;
  type: 'ts' | 'tsx' | 'js' | 'json' | 'other';
  size: number;
  exports: string[];
  imports: string[];
}

export interface ExportSymbol {
  name: string;
  type: 'class' | 'function' | 'interface' | 'type' | 'const';
  file: string;
}

// ============================================================================
// 差距分析
// ============================================================================

export type GapType =
  | 'missing_agent'
  | 'missing_module'
  | 'incomplete_module'
  | 'missing_interface'
  | 'orphan_code'
  | 'doc_outdated';

export interface Gap {
  id: string;
  type: GapType;
  severity: 'blocking' | 'major' | 'minor';
  specRef: {
    document: string;
    section?: string;
    line?: number;
  };
  targetName: string;
  targetDescription: string;
  evidence: {
    expected: string;
    actual: string;
    missingItems?: string[];
    existingItems?: string[];
  };
  relatedFiles: string[];
}

// ============================================================================
// 业务任务
// ============================================================================

export interface BusinessTask {
  id: string;
  title: string;
  description: string;
  sourceGap: Gap;
  requirements: string[];
  suggestedApproach: string[];
  acceptanceCriteria: string[];
  priority: 'P0' | 'P1' | 'P2';
  estimatedEffort: 'small' | 'medium' | 'large';
  maxDuration: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
}
```

- [ ] **Step 2: Create the test file to verify types compile**

Create `src/core/analysis/__tests__/types.test.ts`:

```typescript
import {
  TargetArchitecture,
  CurrentImplementation,
  Gap,
  BusinessTask,
  GapType,
  AgentSpec,
  ModuleSpec
} from '../types';

describe('Type Definitions', () => {
  it('should allow creating valid TargetArchitecture', () => {
    const arch: TargetArchitecture = {
      version: '1.0.0',
      parsedAt: new Date(),
      agents: [],
      modules: [],
      interfaces: [],
      dataModels: [],
      workflows: []
    };
    expect(arch.version).toBe('1.0.0');
  });

  it('should allow creating valid AgentSpec', () => {
    const agent: AgentSpec = {
      name: 'TestAgent',
      description: 'A test agent',
      responsibilities: ['task-execution'],
      skills: ['coding'],
      expectedFiles: ['src/agents/TestAgent.ts'],
      dependencies: []
    };
    expect(agent.name).toBe('TestAgent');
  });

  it('should allow creating valid ModuleSpec', () => {
    const module: ModuleSpec = {
      name: 'UserService',
      description: 'User management',
      layer: 'service',
      exposedInterfaces: ['createUser', 'getUser'],
      dependencies: ['Database'],
      expectedFiles: ['src/services/UserService.ts'],
      acceptanceCriteria: ['All tests pass']
    };
    expect(module.layer).toBe('service');
  });

  it('should allow creating valid Gap', () => {
    const gap: Gap = {
      id: 'gap-1',
      type: 'missing_agent',
      severity: 'blocking',
      specRef: { document: 'AGENTS.md' },
      targetName: 'TestAgent',
      targetDescription: 'Test agent description',
      evidence: {
        expected: 'Agent should exist',
        actual: 'Agent not found'
      },
      relatedFiles: []
    };
    expect(gap.type).toBe('missing_agent');
  });

  it('should allow creating valid BusinessTask', () => {
    const task: BusinessTask = {
      id: 'task-1',
      title: 'Implement TestAgent',
      description: 'Create the test agent',
      sourceGap: {
        id: 'gap-1',
        type: 'missing_agent',
        severity: 'blocking',
        specRef: { document: 'AGENTS.md' },
        targetName: 'TestAgent',
        targetDescription: 'Test agent',
        evidence: { expected: 'Agent', actual: 'No agent' },
        relatedFiles: []
      },
      requirements: ['Create file', 'Implement methods'],
      suggestedApproach: ['Step 1', 'Step 2'],
      acceptanceCriteria: ['Tests pass'],
      priority: 'P0',
      estimatedEffort: 'medium',
      maxDuration: 7200000,
      status: 'pending',
      createdAt: new Date()
    };
    expect(task.priority).toBe('P0');
  });

  it('should have all required GapTypes', () => {
    const types: GapType[] = [
      'missing_agent',
      'missing_module',
      'incomplete_module',
      'missing_interface',
      'orphan_code',
      'doc_outdated'
    ];
    expect(types).toHaveLength(6);
  });
});
```

- [ ] **Step 3: Run the test to verify types work**

Run: `cd harness-cli && npx jest src/core/analysis/__tests__/types.test.ts --passWithNoTests`
Expected: PASS (types compile and test runs)

- [ ] **Step 4: Commit**

```bash
cd harness-cli
git add src/core/analysis/types.ts src/core/analysis/__tests__/types.test.ts
git commit -m "feat(analysis): add type definitions for spec-driven gap analysis"
```

---

## Task 2: Create SpecParser

**Files:**
- Create: `src/core/analysis/SpecParser.ts`
- Test: `src/core/analysis/__tests__/SpecParser.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/analysis/__tests__/SpecParser.test.ts`:

```typescript
import { SpecParser } from '../SpecParser';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises');

describe('SpecParser', () => {
  let parser: SpecParser;
  let mockFs: jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    parser = new SpecParser('/test/project');
    mockFs = fs as jest.Mocked<typeof fs>;
  });

  describe('parse', () => {
    it('should parse AGENTS.md and extract agent definitions', async () => {
      const agentsMd = `
# Project Agents

## CoordinatorAgent

**Role:** Task coordination and distribution

**Responsibilities:**
- task-distribution
- result-aggregation
- workflow-management

**Skills:**
- llm-orchestration
- state-management

## WorkerAgent

**Role:** Task execution

**Responsibilities:**
- task-execution
- error-reporting
`;

      mockFs.readFile = jest.fn().mockImplementation((filePath: string) => {
        if (filePath.includes('AGENTS.md')) return Promise.resolve(agentsMd);
        if (filePath.includes('ARCHITECTURE.md')) return Promise.resolve('# Architecture\n\nTBD');
        return Promise.reject(new Error('File not found'));
      });

      mockFs.access = jest.fn().mockResolvedValue(undefined);

      const result = await parser.parse();

      expect(result.agents).toHaveLength(2);
      expect(result.agents[0].name).toBe('CoordinatorAgent');
      expect(result.agents[0].responsibilities).toContain('task-distribution');
      expect(result.agents[0].skills).toContain('llm-orchestration');
      expect(result.agents[1].name).toBe('WorkerAgent');
    });

    it('should parse ARCHITECTURE.md and extract modules', async () => {
      const architectureMd = `
# System Architecture

## Modules

### UserService

**Layer:** service

**Description:** Handles user management

**Exposed Interfaces:**
- createUser(userData: UserData): Promise<User>
- getUser(id: string): Promise<User>

**Dependencies:**
- Database
- Logger

**Acceptance Criteria:**
- All CRUD operations work
- Input validation implemented
`;

      mockFs.readFile = jest.fn().mockImplementation((filePath: string) => {
        if (filePath.includes('AGENTS.md')) return Promise.resolve('# Agents\n\nTBD');
        if (filePath.includes('ARCHITECTURE.md')) return Promise.resolve(architectureMd);
        return Promise.reject(new Error('File not found'));
      });

      mockFs.access = jest.fn().mockResolvedValue(undefined);

      const result = await parser.parse();

      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].name).toBe('UserService');
      expect(result.modules[0].layer).toBe('service');
      expect(result.modules[0].exposedInterfaces).toHaveLength(2);
      expect(result.modules[0].dependencies).toContain('Database');
    });

    it('should handle missing documentation gracefully', async () => {
      mockFs.access = jest.fn().mockRejectedValue(new Error('File not found'));

      const result = await parser.parse();

      expect(result.agents).toEqual([]);
      expect(result.modules).toEqual([]);
      expect(result.version).toBe('0.0.0');
    });

    it('should use cache when documents have not changed', async () => {
      mockFs.readFile = jest.fn().mockResolvedValue('# Agents\n\n## TestAgent');
      mockFs.access = jest.fn().mockResolvedValue(undefined);

      // 第一次解析
      await parser.parse();

      // 第二次解析应该使用缓存
      const result = await parser.parse();

      // 文件应该只被读取一次
      expect(mockFs.readFile).toHaveBeenCalledTimes(2); // AGENTS.md + ARCHITECTURE.md
    });
  });

  describe('parseAgentsMd', () => {
    it('should extract agent from markdown format', async () => {
      const markdown = `
## TestAgent

Description here

**Responsibilities:**
- task-one
- task-two
`;

      const result = await (parser as any).parseAgentsMd(markdown);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('TestAgent');
      expect(result[0].responsibilities).toEqual(['task-one', 'task-two']);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd harness-cli && npx jest src/core/analysis/__tests__/SpecParser.test.ts --passWithNoTests`
Expected: FAIL with "SpecParser is not defined" or similar

- [ ] **Step 3: Write minimal implementation**

Create `src/core/analysis/SpecParser.ts`:

```typescript
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

    let agentsMdContent = '';
    let architectureMdContent = '';

    try {
      await fs.access(agentsMdPath);
      agentsMdContent = await fs.readFile(agentsMdPath, 'utf-8');
    } catch {
      // AGENTS.md 未找到
    }

    try {
      await fs.access(architectureMdPath);
      architectureMdContent = await fs.readFile(architectureMdPath, 'utf-8');
    } catch {
      // ARCHITECTURE.md 未找到
    }

    // 检查缓存
    const currentKey = this.hashContent(agentsMdContent + architectureMdContent);
    if (this.cache && this.cacheKey === currentKey) {
      return this.cache;
    }

    const agents = await this.parseAgentsMd(agentsMdContent);
    const modules = await this.parseArchitectureMd(architectureMdContent);

    const result: TargetArchitecture = {
      version: '1.0.0',
      parsedAt: new Date(),
      agents,
      modules,
      interfaces: [],
      dataModels: [],
      workflows: []
    };

    // 更新缓存
    this.cache = result;
    this.cacheKey = currentKey;

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
      } else if (currentModule) {
        if (line.startsWith('**Layer:**')) {
          currentModule.layer = line.replace('**Layer:**', '').trim() as any;
        } else if (line.startsWith('**Description:**')) {
          currentModule.description = line.replace('**Description:**', '').trim();
        } else if (line.startsWith('- ') && lines[i - 1]?.includes('Interfaces')) {
          currentModule.exposedInterfaces!.push(line.replace('- ', '').trim());
        } else if (line.startsWith('- ') && lines[i - 1]?.includes('Dependencies')) {
          currentModule.dependencies!.push(line.replace('- ', '').trim());
        } else if (line.startsWith('- ') && lines[i - 1]?.includes('Criteria')) {
          currentModule.acceptanceCriteria!.push(line.replace('- ', '').trim());
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd harness-cli && npx jest src/core/analysis/__tests__/SpecParser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd harness-cli
git add src/core/analysis/SpecParser.ts src/core/analysis/__tests__/SpecParser.test.ts
git commit -m "feat(analysis): add SpecParser to parse AGENTS.md and ARCHITECTURE.md"
```

---

## Task 3: Create CodeScanner

**Files:**
- Create: `src/core/analysis/CodeScanner.ts`
- Test: `src/core/analysis/__tests__/CodeScanner.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/analysis/__tests__/CodeScanner.test.ts`:

```typescript
import { CodeScanner } from '../CodeScanner';
import * as fs from 'fs/promises';
import * as glob from 'glob';

jest.mock('fs/promises');
jest.mock('glob');

describe('CodeScanner', () => {
  let scanner: CodeScanner;
  let mockFs: jest.Mocked<typeof fs>;
  let mockGlob: jest.Mocked<typeof glob>;

  beforeEach(() => {
    jest.clearAllMocks();
    scanner = new CodeScanner('/test/project');
    mockFs = fs as jest.Mocked<typeof fs>;
    mockGlob = glob as jest.Mocked<typeof glob>;
  });

  describe('scan', () => {
    it('should detect agents from src/lib/ai/agents directory', async () => {
      mockGlob.glob = jest.fn().mockImplementation((pattern: string) => {
        if (pattern.includes('agents')) {
          return Promise.resolve([
            'src/lib/ai/agents/CoordinatorAgent.ts',
            'src/lib/ai/agents/WorkerAgent.ts'
          ]);
        }
        return Promise.resolve([]);
      });

      mockFs.readFile = jest.fn().mockImplementation((filePath: string) => {
        if (filePath.includes('CoordinatorAgent')) {
          return Promise.resolve(`
export class CoordinatorAgent {
  async distributeTask(task: Task) {
    // 实现
  }
}
          `);
        }
        if (filePath.includes('WorkerAgent')) {
          return Promise.resolve(`
export class WorkerAgent {
  async executeTask(task: Task) {
    // 实现
  }
}
          `);
        }
        return Promise.reject(new Error('File not found'));
      });

      mockFs.stat = jest.fn().mockResolvedValue({ size: 1000 } as any);

      const result = await scanner.scan();

      expect(result.agents).toHaveLength(2);
      expect(result.agents[0].name).toBe('CoordinatorAgent');
      expect(result.agents[1].name).toBe('WorkerAgent');
    });

    it('should extract exports from TypeScript files', async () => {
      mockGlob.glob = jest.fn().mockResolvedValue(['src/services/UserService.ts']);
      mockFs.readFile = jest.fn().mockResolvedValue(`
export class UserService {
  async createUser() {}
  async getUser() {}
}

export interface UserData {
  name: string;
}

export type UserRole = 'admin' | 'user';
      `);
      mockFs.stat = jest.fn().mockResolvedValue({ size: 500 } as any);

      const result = await scanner.scan();

      expect(result.files).toHaveLength(1);
      expect(result.files[0].exports).toContain('UserService');
      expect(result.files[0].exports).toContain('UserData');
      expect(result.files[0].exports).toContain('UserRole');
    });

    it('should handle empty project gracefully', async () => {
      mockGlob.glob = jest.fn().mockResolvedValue([]);

      const result = await scanner.scan();

      expect(result.agents).toEqual([]);
      expect(result.modules).toEqual([]);
      expect(result.files).toEqual([]);
    });
  });

  describe('scanAgents', () => {
    it('should calculate agent completeness', async () => {
      mockGlob.glob = jest.fn().mockResolvedValue(['src/lib/ai/agents/TestAgent.ts']);
      mockFs.readFile = jest.fn().mockResolvedValue(`
export class TestAgent {
  // 部分实现
}
      `);
      mockFs.stat = jest.fn().mockResolvedValue({ size: 200 } as any);

      const result = await (scanner as any).scanAgents();

      expect(result[0].completeness).toBeLessThan(100);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd harness-cli && npx jest src/core/analysis/__tests__/CodeScanner.test.ts --passWithNoTests`
Expected: FAIL with "CodeScanner is not defined"

- [ ] **Step 3: Write minimal implementation**

Create `src/core/analysis/CodeScanner.ts`:

```typescript
import { CurrentImplementation, ImplementedAgent, ImplementedModule, SourceFile } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

export class CodeScanner {
  constructor(private projectPath: string) {}

  async scan(): Promise<CurrentImplementation> {
    const [agents, modules, files] = await Promise.all([
      this.scanAgents(),
      this.scanModules(),
      this.scanFiles()
    ]);

    return {
      scannedAt: new Date(),
      agents,
      modules,
      files,
      exports: [] // 将从文件填充
    };
  }

  async scanAgents(): Promise<ImplementedAgent[]> {
    const agents: ImplementedAgent[] = [];
    const agentsDir = path.join(this.projectPath, 'src/lib/ai/agents');

    try {
      const files = await glob('*.ts', { cwd: agentsDir });

      for (const file of files) {
        const filePath = path.join(agentsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const name = path.basename(file, '.ts');

        const detectedResponsibilities = this.extractResponsibilities(content);
        const completeness = this.calculateCompleteness(content);

        agents.push({
          name,
          files: [filePath],
          detectedResponsibilities,
          completeness
        });
      }
    } catch {
      // 目录不存在或读取错误
    }

    return agents;
  }

  private async scanModules(): Promise<ImplementedModule[]> {
    const modules: ImplementedModule[] = [];
    const srcPath = path.join(this.projectPath, 'src');

    try {
      // 扫描常见模块目录
      const patterns = [
        'services/**/*.ts',
        'modules/**/*.ts',
        'components/**/*.ts',
        'api/**/*.ts'
      ];

      const allFiles: string[] = [];
      for (const pattern of patterns) {
        const files = await glob(pattern, { cwd: srcPath });
        allFiles.push(...files);
      }

      // 按目录分组作为模块
      const moduleMap = new Map<string, string[]>();
      for (const file of allFiles) {
        const dir = path.dirname(file);
        if (!moduleMap.has(dir)) {
          moduleMap.set(dir, []);
        }
        moduleMap.get(dir)!.push(path.join(srcPath, file));
      }

      for (const [dir, files] of moduleMap) {
        const moduleName = path.basename(dir);
        const exportedSymbols: string[] = [];

        for (const file of files) {
          const content = await fs.readFile(file, 'utf-8');
          const exports = this.extractExports(content);
          exportedSymbols.push(...exports);
        }

        modules.push({
          name: moduleName,
          files,
          exportedSymbols,
          detectedLayer: this.detectLayer(dir)
        });
      }
    } catch {
      // 扫描错误
    }

    return modules;
  }

  private async scanFiles(): Promise<SourceFile[]> {
    const files: SourceFile[] = [];
    const srcPath = path.join(this.projectPath, 'src');

    try {
      const tsFiles = await glob('**/*.ts', {
        cwd: srcPath,
        ignore: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**']
      });

      for (const file of tsFiles.slice(0, 100)) { // 限制以防止过载
        const filePath = path.join(srcPath, file);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');

        files.push({
          path: filePath,
          type: file.endsWith('.tsx') ? 'tsx' : 'ts',
          size: stats.size,
          exports: this.extractExports(content),
          imports: this.extractImports(content)
        });
      }
    } catch {
      // 扫描文件错误
    }

    return files;
  }

  private extractResponsibilities(content: string): string[] {
    const responsibilities: string[] = [];

    // 查找可能表示职责的方法名
    const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/g;
    let match;

    while ((match = methodRegex.exec(content)) !== null) {
      const methodName = match[1];
      if (!['constructor', 'toString', 'valueOf'].includes(methodName)) {
        responsibilities.push(methodName);
      }
    }

    return [...new Set(responsibilities)]; // 去重
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];

    // 匹配 export class/interface/type/function/const
    const exportRegex = /export\s+(?:abstract\s+)?(?:class|interface|type|function|const)\s+(\w+)/g;
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return exports;
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];

    // 匹配 import 语句
    const importRegex = /from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  private calculateCompleteness(content: string): number {
    // 基于代码大小和结构的简单启发式
    let score = 0;

    if (content.includes('constructor')) score += 10;
    if (content.includes('async')) score += 10;
    if (content.includes('export')) score += 10;
    if (content.includes('interface')) score += 10;
    if (content.includes('import')) score += 5;
    if (content.length > 500) score += 20;
    if (content.length > 1000) score += 20;
    if (content.includes('// TODO')) score -= 10;

    return Math.min(100, Math.max(0, score));
  }

  private detectLayer(dir: string): string {
    if (dir.includes('api')) return 'api';
    if (dir.includes('service')) return 'service';
    if (dir.includes('data') || dir.includes('model')) return 'data';
    if (dir.includes('ui') || dir.includes('component')) return 'ui';
    return 'unknown';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd harness-cli && npx jest src/core/analysis/__tests__/CodeScanner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd harness-cli
git add src/core/analysis/CodeScanner.ts src/core/analysis/__tests__/CodeScanner.test.ts
git commit -m "feat(analysis): add CodeScanner to analyze current implementation"
```

---

## Task 4: Create GapDetector

**Files:**
- Create: `src/core/analysis/GapDetector.ts`
- Test: `src/core/analysis/__tests__/GapDetector.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/analysis/__tests__/GapDetector.test.ts`:

```typescript
import { GapDetector } from '../GapDetector';
import { TargetArchitecture, CurrentImplementation, Gap } from '../types';

describe('GapDetector', () => {
  let detector: GapDetector;

  beforeEach(() => {
    detector = new GapDetector();
  });

  describe('detect', () => {
    it('should detect missing agents', () => {
      const target: TargetArchitecture = {
        version: '1.0.0',
        parsedAt: new Date(),
        agents: [
          { name: 'CoordinatorAgent', description: '', responsibilities: [], skills: [], expectedFiles: [], dependencies: [] }
        ],
        modules: [],
        interfaces: [],
        dataModels: [],
        workflows: []
      };

      const current: CurrentImplementation = {
        scannedAt: new Date(),
        agents: [], // 未实现 Agent
        modules: [],
        files: [],
        exports: []
      };

      const gaps = detector.detect(target, current);

      expect(gaps).toHaveLength(1);
      expect(gaps[0].type).toBe('missing_agent');
      expect(gaps[0].targetName).toBe('CoordinatorAgent');
    });

    it('should detect missing modules', () => {
      const target: TargetArchitecture = {
        version: '1.0.0',
        parsedAt: new Date(),
        agents: [],
        modules: [
          { name: 'UserService', description: '', layer: 'service', exposedInterfaces: [], dependencies: [], expectedFiles: [], acceptanceCriteria: [] }
        ],
        interfaces: [],
        dataModels: [],
        workflows: []
      };

      const current: CurrentImplementation = {
        scannedAt: new Date(),
        agents: [],
        modules: [], // 无模块
        files: [],
        exports: []
      };

      const gaps = detector.detect(target, current);

      expect(gaps).toHaveLength(1);
      expect(gaps[0].type).toBe('missing_module');
      expect(gaps[0].targetName).toBe('UserService');
    });

    it('should not report gaps for implemented components', () => {
      const target: TargetArchitecture = {
        version: '1.0.0',
        parsedAt: new Date(),
        agents: [
          { name: 'CoordinatorAgent', description: '', responsibilities: [], skills: [], expectedFiles: [], dependencies: [] }
        ],
        modules: [],
        interfaces: [],
        dataModels: [],
        workflows: []
      };

      const current: CurrentImplementation = {
        scannedAt: new Date(),
        agents: [
          { name: 'CoordinatorAgent', files: [], detectedResponsibilities: [], completeness: 100 }
        ],
        modules: [],
        files: [],
        exports: []
      };

      const gaps = detector.detect(target, current);

      expect(gaps).toHaveLength(0);
    });

    it('should detect incomplete modules', () => {
      const target: TargetArchitecture = {
        version: '1.0.0',
        parsedAt: new Date(),
        agents: [],
        modules: [
          {
            name: 'UserService',
            description: '',
            layer: 'service',
            exposedInterfaces: ['createUser', 'getUser', 'updateUser'],
            dependencies: [],
            expectedFiles: [],
            acceptanceCriteria: []
          }
        ],
        interfaces: [],
        dataModels: [],
        workflows: []
      };

      const current: CurrentImplementation = {
        scannedAt: new Date(),
        agents: [],
        modules: [
          {
            name: 'UserService',
            files: [],
            exportedSymbols: ['createUser'], // 三个接口中只有一个
            detectedLayer: 'service'
          }
        ],
        files: [],
        exports: []
      };

      const gaps = detector.detect(target, current);

      const incompleteGap = gaps.find(g => g.type === 'incomplete_module');
      expect(incompleteGap).toBeDefined();
      expect(incompleteGap!.evidence.missingItems).toContain('getUser');
      expect(incompleteGap!.evidence.missingItems).toContain('updateUser');
    });

    it('should detect orphan code', () => {
      const target: TargetArchitecture = {
        version: '1.0.0',
        parsedAt: new Date(),
        agents: [],
        modules: [],
        interfaces: [],
        dataModels: [],
        workflows: []
      };

      const current: CurrentImplementation = {
        scannedAt: new Date(),
        agents: [
          { name: 'LegacyAgent', files: [], detectedResponsibilities: [], completeness: 50 }
        ],
        modules: [],
        files: [],
        exports: []
      };

      const gaps = detector.detect(target, current);

      const orphanGap = gaps.find(g => g.type === 'orphan_code');
      expect(orphanGap).toBeDefined();
      expect(orphanGap!.targetName).toBe('LegacyAgent');
    });
  });

  describe('severity calculation', () => {
    it('should assign blocking severity to missing core agents', () => {
      const target: TargetArchitecture = {
        version: '1.0.0',
        parsedAt: new Date(),
        agents: [
          { name: 'CoordinatorAgent', description: '', responsibilities: [], skills: [], expectedFiles: [], dependencies: [] }
        ],
        modules: [],
        interfaces: [],
        dataModels: [],
        workflows: []
      };

      const current: CurrentImplementation = {
        scannedAt: new Date(),
        agents: [],
        modules: [],
        files: [],
        exports: []
      };

      const gaps = detector.detect(target, current);

      expect(gaps[0].severity).toBe('blocking');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd harness-cli && npx jest src/core/analysis/__tests__/GapDetector.test.ts --passWithNoTests`
Expected: FAIL with "GapDetector is not defined"

- [ ] **Step 3: Write minimal implementation**

Create `src/core/analysis/GapDetector.ts`:

```typescript
import { TargetArchitecture, CurrentImplementation, Gap, GapType } from './types';

export class GapDetector {
  detect(target: TargetArchitecture, current: CurrentImplementation): Gap[] {
    const gaps: Gap[] = [];

    gaps.push(...this.detectMissingAgents(target, current));
    gaps.push(...this.detectMissingModules(target, current));
    gaps.push(...this.detectIncompleteModules(target, current));
    gaps.push(...this.detectOrphanCode(target, current));

    return gaps;
  }

  private detectMissingAgents(target: TargetArchitecture, current: CurrentImplementation): Gap[] {
    const gaps: Gap[] = [];

    for (const agentSpec of target.agents) {
      const exists = current.agents.some(a =>
        a.name.toLowerCase() === agentSpec.name.toLowerCase()
      );

      if (!exists) {
        gaps.push(this.createGap({
          type: 'missing_agent',
          targetName: agentSpec.name,
          targetDescription: agentSpec.description,
          expected: `Agent ${agentSpec.name} should exist`,
          actual: 'Agent not found in codebase',
          specRef: { document: 'AGENTS.md', section: agentSpec.name }
        }));
      }
    }

    return gaps;
  }

  private detectMissingModules(target: TargetArchitecture, current: CurrentImplementation): Gap[] {
    const gaps: Gap[] = [];

    for (const moduleSpec of target.modules) {
      const exists = current.modules.some(m =>
        m.name.toLowerCase() === moduleSpec.name.toLowerCase()
      );

      if (!exists) {
        gaps.push(this.createGap({
          type: 'missing_module',
          targetName: moduleSpec.name,
          targetDescription: moduleSpec.description,
          expected: `Module ${moduleSpec.name} should exist`,
          actual: 'Module not found in codebase',
          specRef: { document: 'ARCHITECTURE.md', section: moduleSpec.name }
        }));
      }
    }

    return gaps;
  }

  private detectIncompleteModules(target: TargetArchitecture, current: CurrentImplementation): Gap[] {
    const gaps: Gap[] = [];

    for (const moduleSpec of target.modules) {
      const currentModule = current.modules.find(m =>
        m.name.toLowerCase() === moduleSpec.name.toLowerCase()
      );

      if (currentModule) {
        const missingInterfaces = moduleSpec.exposedInterfaces.filter(iface =>
          !currentModule.exportedSymbols.some(sym =>
            iface.toLowerCase().includes(sym.toLowerCase()) ||
            sym.toLowerCase().includes(iface.toLowerCase())
          )
        );

        if (missingInterfaces.length > 0) {
          gaps.push(this.createGap({
            type: 'incomplete_module',
            targetName: moduleSpec.name,
            targetDescription: moduleSpec.description,
            expected: `Module should expose: ${moduleSpec.exposedInterfaces.join(', ')}`,
            actual: `Only found: ${currentModule.exportedSymbols.join(', ') || 'none'}`,
            missingItems: missingInterfaces,
            existingItems: currentModule.exportedSymbols,
            specRef: { document: 'ARCHITECTURE.md', section: moduleSpec.name }
          }));
        }
      }
    }

    return gaps;
  }

  private detectOrphanCode(target: TargetArchitecture, current: CurrentImplementation): Gap[] {
    const gaps: Gap[] = [];

    // 检查规范中未定义的 Agent
    for (const currentAgent of current.agents) {
      const inSpec = target.agents.some(a =>
        a.name.toLowerCase() === currentAgent.name.toLowerCase()
      );

      if (!inSpec) {
        gaps.push(this.createGap({
          type: 'orphan_code',
          targetName: currentAgent.name,
          targetDescription: 'Agent exists in code but not in specification',
          expected: 'Should be defined in AGENTS.md or removed',
          actual: 'Found implemented agent without specification',
          specRef: { document: 'AGENTS.md' }
        }));
      }
    }

    // 检查规范中未定义的模块
    for (const currentModule of current.modules) {
      const inSpec = target.modules.some(m =>
        m.name.toLowerCase() === currentModule.name.toLowerCase()
      );

      if (!inSpec) {
        gaps.push(this.createGap({
          type: 'orphan_code',
          targetName: currentModule.name,
          targetDescription: 'Module exists in code but not in specification',
          expected: 'Should be defined in ARCHITECTURE.md or removed',
          actual: 'Found implemented module without specification',
          specRef: { document: 'ARCHITECTURE.md' }
        }));
      }
    }

    return gaps;
  }

  private createGap(params: {
    type: GapType;
    targetName: string;
    targetDescription: string;
    expected: string;
    actual: string;
    missingItems?: string[];
    existingItems?: string[];
    specRef: { document: string; section?: string };
  }): Gap {
    return {
      id: `gap-${params.type}-${params.targetName.toLowerCase()}-${Date.now()}`,
      type: params.type,
      severity: this.calculateSeverity(params.type, params.targetName),
      targetName: params.targetName,
      targetDescription: params.targetDescription,
      specRef: params.specRef,
      evidence: {
        expected: params.expected,
        actual: params.actual,
        missingItems: params.missingItems,
        existingItems: params.existingItems
      },
      relatedFiles: []
    };
  }

  private calculateSeverity(type: GapType, targetName: string): 'blocking' | 'major' | 'minor' {
    // 核心组件缺失时为阻塞级别
    const corePatterns = ['coordinator', 'orchestrator', 'main', 'core', 'auth'];
    const isCore = corePatterns.some(p => targetName.toLowerCase().includes(p));

    switch (type) {
      case 'missing_agent':
        return isCore ? 'blocking' : 'major';
      case 'missing_module':
        return isCore ? 'blocking' : 'major';
      case 'incomplete_module':
        return 'major';
      case 'missing_interface':
        return 'minor';
      case 'orphan_code':
        return 'minor';
      case 'doc_outdated':
        return 'minor';
      default:
        return 'major';
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd harness-cli && npx jest src/core/analysis/__tests__/GapDetector.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd harness-cli
git add src/core/analysis/GapDetector.ts src/core/analysis/__tests__/GapDetector.test.ts
git commit -m "feat(analysis): add GapDetector to identify gaps between spec and implementation"
```

---

## Task 5: Create TaskGenerator

**Files:**
- Create: `src/core/analysis/TaskGenerator.ts`
- Test: `src/core/analysis/__tests__/TaskGenerator.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/analysis/__tests__/TaskGenerator.test.ts`:

```typescript
import { TaskGenerator } from '../TaskGenerator';
import { Gap, TargetArchitecture, BusinessTask } from '../types';

describe('TaskGenerator', () => {
  let generator: TaskGenerator;

  beforeEach(() => {
    generator = new TaskGenerator();
  });

  describe('generate', () => {
    it('should generate task for missing agent', () => {
      const gap: Gap = {
        id: 'gap-1',
        type: 'missing_agent',
        severity: 'blocking',
        targetName: 'CoordinatorAgent',
        targetDescription: 'Coordinates tasks between agents',
        specRef: { document: 'AGENTS.md' },
        evidence: {
          expected: 'Agent CoordinatorAgent should exist',
          actual: 'Agent not found'
        },
        relatedFiles: []
      };

      const target: TargetArchitecture = {
        version: '1.0.0',
        parsedAt: new Date(),
        agents: [
          {
            name: 'CoordinatorAgent',
            description: 'Coordinates tasks',
            responsibilities: ['task-distribution', 'result-aggregation'],
            skills: ['orchestration'],
            expectedFiles: ['src/lib/ai/agents/CoordinatorAgent.ts'],
            dependencies: []
          }
        ],
        modules: [],
        interfaces: [],
        dataModels: [],
        workflows: []
      };

      const tasks = generator.generate([gap], target);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toContain('CoordinatorAgent');
      expect(tasks[0].priority).toBe('P0');
      expect(tasks[0].requirements).toContain(expect.stringContaining('task-distribution'));
    });

    it('should generate task for missing module', () => {
      const gap: Gap = {
        id: 'gap-2',
        type: 'missing_module',
        severity: 'major',
        targetName: 'UserService',
        targetDescription: 'Handles user management',
        specRef: { document: 'ARCHITECTURE.md' },
        evidence: {
          expected: 'Module UserService should exist',
          actual: 'Module not found'
        },
        relatedFiles: []
      };

      const target: TargetArchitecture = {
        version: '1.0.0',
        parsedAt: new Date(),
        agents: [],
        modules: [
          {
            name: 'UserService',
            description: 'User management service',
            layer: 'service',
            exposedInterfaces: ['createUser', 'getUser'],
            dependencies: ['Database'],
            expectedFiles: ['src/services/UserService.ts'],
            acceptanceCriteria: ['All tests pass', 'Input validation works']
          }
        ],
        interfaces: [],
        dataModels: [],
        workflows: []
      };

      const tasks = generator.generate([gap], target);

      expect(tasks[0].title).toContain('UserService');
      expect(tasks[0].acceptanceCriteria).toContain(expect.stringContaining('tests pass'));
    });

    it('should map severity to priority correctly', () => {
      const blockingGap: Gap = {
        id: 'gap-1',
        type: 'missing_agent',
        severity: 'blocking',
        targetName: 'CoreAgent',
        targetDescription: '',
        specRef: { document: 'AGENTS.md' },
        evidence: { expected: '', actual: '' },
        relatedFiles: []
      };

      const minorGap: Gap = {
        id: 'gap-2',
        type: 'orphan_code',
        severity: 'minor',
        targetName: 'LegacyModule',
        targetDescription: '',
        specRef: { document: 'ARCHITECTURE.md' },
        evidence: { expected: '', actual: '' },
        relatedFiles: []
      };

      const target: TargetArchitecture = {
        version: '1.0.0',
        parsedAt: new Date(),
        agents: [],
        modules: [],
        interfaces: [],
        dataModels: [],
        workflows: []
      };

      const blockingTasks = generator.generate([blockingGap], target);
      const minorTasks = generator.generate([minorGap], target);

      expect(blockingTasks[0].priority).toBe('P0');
      expect(minorTasks[0].priority).toBe('P2');
    });

    it('should include source gap reference in task', () => {
      const gap: Gap = {
        id: 'gap-1',
        type: 'missing_agent',
        severity: 'blocking',
        targetName: 'TestAgent',
        targetDescription: 'Test agent',
        specRef: { document: 'AGENTS.md', section: 'TestAgent' },
        evidence: { expected: 'Should exist', actual: 'Not found' },
        relatedFiles: []
      };

      const target: TargetArchitecture = {
        version: '1.0.0',
        parsedAt: new Date(),
        agents: [],
        modules: [],
        interfaces: [],
        dataModels: [],
        workflows: []
      };

      const tasks = generator.generate([gap], target);

      expect(tasks[0].sourceGap.id).toBe('gap-1');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd harness-cli && npx jest src/core/analysis/__tests__/TaskGenerator.test.ts --passWithNoTests`
Expected: FAIL with "TaskGenerator is not defined"

- [ ] **Step 3: Write minimal implementation**

Create `src/core/analysis/TaskGenerator.ts`:

```typescript
import { Gap, TargetArchitecture, BusinessTask, AgentSpec, ModuleSpec } from './types';

export class TaskGenerator {
  generate(gaps: Gap[], target: TargetArchitecture): BusinessTask[] {
    return gaps.map(gap => this.generateFromGap(gap, target));
  }

  private generateFromGap(gap: Gap, target: TargetArchitecture): BusinessTask {
    const spec = this.findSpecForGap(gap, target);

    return {
      id: `task-${gap.type}-${gap.targetName.toLowerCase()}-${Date.now()}`,
      title: this.generateTitle(gap),
      description: this.generateDescription(gap, spec),
      sourceGap: gap,
      requirements: this.generateRequirements(gap, spec),
      suggestedApproach: this.generateApproach(gap, spec),
      acceptanceCriteria: this.generateAcceptanceCriteria(gap, spec),
      priority: this.gapToPriority(gap.severity),
      estimatedEffort: this.estimateEffort(gap),
      maxDuration: this.calculateDuration(gap),
      status: 'pending',
      createdAt: new Date()
    };
  }

  private findSpecForGap(gap: Gap, target: TargetArchitecture): AgentSpec | ModuleSpec | undefined {
    if (gap.type === 'missing_agent' || gap.type === 'incomplete_module') {
      return target.agents.find(a => a.name === gap.targetName) ||
             target.modules.find(m => m.name === gap.targetName);
    }
    return undefined;
  }

  private generateTitle(gap: Gap): string {
    switch (gap.type) {
      case 'missing_agent':
        return `实现 ${gap.targetName} Agent`;
      case 'missing_module':
        return `实现 ${gap.targetName} 模块`;
      case 'incomplete_module':
        return `完善 ${gap.targetName} 模块功能`;
      case 'orphan_code':
        return `清理或规范化 ${gap.targetName}`;
      case 'doc_outdated':
        return `更新 ${gap.targetName} 相关文档`;
      default:
        return `处理 ${gap.targetName}`;
    }
  }

  private generateDescription(gap: Gap, spec?: AgentSpec | ModuleSpec): string {
    let description = `## 差距分析\n\n`;
    description += `**类型:** ${gap.type}\n`;
    description += `**严重程度:** ${gap.severity}\n\n`;
    description += `**问题描述:**\n${gap.targetDescription}\n\n`;
    description += `**预期:**\n${gap.evidence.expected}\n\n`;
    description += `**实际:**\n${gap.evidence.actual}\n\n`;

    if (spec) {
      description += `## 规范定义\n\n`;
      description += `${spec.description}\n`;
    }

    return description;
  }

  private generateRequirements(gap: Gap, spec?: AgentSpec | ModuleSpec): string[] {
    const requirements: string[] = [];

    requirements.push(`解决差距: ${gap.evidence.expected}`);

    if (spec && 'responsibilities' in spec) {
      requirements.push(...spec.responsibilities.map(r => `实现职责: ${r}`));
    }

    if (spec && 'exposedInterfaces' in spec) {
      requirements.push(...spec.exposedInterfaces.map(i => `提供接口: ${i}`));
    }

    if (gap.evidence.missingItems) {
      requirements.push(...gap.evidence.missingItems.map(item => `添加: ${item}`));
    }

    requirements.push('编写单元测试');
    requirements.push('更新相关文档');

    return requirements;
  }

  private generateApproach(gap: Gap, spec?: AgentSpec | ModuleSpec): string[] {
    const approach: string[] = [];

    if (gap.type === 'missing_agent' || gap.type === 'missing_module') {
      approach.push('创建必要的文件和目录结构');
      approach.push('实现核心功能和接口');
      approach.push('添加类型定义和验证');
    }

    if (gap.type === 'incomplete_module') {
      approach.push('分析现有实现');
      approach.push('补充缺失的功能和接口');
      approach.push('确保与现有代码兼容');
    }

    if (spec && 'dependencies' in spec && spec.dependencies.length > 0) {
      approach.push(`集成依赖: ${spec.dependencies.join(', ')}`);
    }

    approach.push('编写测试用例');
    approach.push('运行测试验证');

    return approach;
  }

  private generateAcceptanceCriteria(gap: Gap, spec?: AgentSpec | ModuleSpec): string[] {
    const criteria: string[] = [];

    criteria.push(`GAP 已解决: ${gap.evidence.expected}`);

    if (spec && 'acceptanceCriteria' in spec && spec.acceptanceCriteria.length > 0) {
      criteria.push(...spec.acceptanceCriteria);
    }

    if (spec && 'exposedInterfaces' in spec) {
      criteria.push(...spec.exposedInterfaces.map(i => `接口 ${i} 可正常工作`));
    }

    criteria.push('单元测试覆盖率 > 80%');
    criteria.push('代码通过 lint 检查');

    return criteria;
  }

  private gapToPriority(severity: 'blocking' | 'major' | 'minor'): 'P0' | 'P1' | 'P2' {
    switch (severity) {
      case 'blocking':
        return 'P0';
      case 'major':
        return 'P1';
      case 'minor':
        return 'P2';
      default:
        return 'P1';
    }
  }

  private estimateEffort(gap: Gap): 'small' | 'medium' | 'large' {
    if (gap.type === 'missing_agent') return 'medium';
    if (gap.type === 'missing_module') return 'medium';
    if (gap.type === 'incomplete_module') return 'small';
    return 'small';
  }

  private calculateDuration(gap: Gap): number {
    // 返回毫秒为单位的持续时间
    const effort = this.estimateEffort(gap);
    switch (effort) {
      case 'small':
        return 30 * 60 * 1000; // 30 minutes
      case 'medium':
        return 2 * 60 * 60 * 1000; // 2 hours
      case 'large':
        return 4 * 60 * 60 * 1000; // 4 hours
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd harness-cli && npx jest src/core/analysis/__tests__/TaskGenerator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd harness-cli
git add src/core/analysis/TaskGenerator.ts src/core/analysis/__tests__/TaskGenerator.test.ts
git commit -m "feat(analysis): add TaskGenerator to create tasks from gaps"
```

---

## Task 6: Create GapAnalysisEngine (Main Entry Point)

**Files:**
- Create: `src/core/analysis/GapAnalysisEngine.ts`
- Test: `src/core/analysis/__tests__/GapAnalysisEngine.test.ts`
- Create: `src/core/analysis/index.ts` (exports)

- [ ] **Step 1: Write the failing test**

Create `src/core/analysis/__tests__/GapAnalysisEngine.test.ts`:

```typescript
import { GapAnalysisEngine } from '../GapAnalysisEngine';
import { SpecParser } from '../SpecParser';
import { CodeScanner } from '../CodeScanner';
import { GapDetector } from '../GapDetector';
import { TaskGenerator } from '../TaskGenerator';
import { TargetArchitecture, CurrentImplementation, BusinessTask } from '../types';

jest.mock('../SpecParser');
jest.mock('../CodeScanner');
jest.mock('../GapDetector');
jest.mock('../TaskGenerator');

describe('GapAnalysisEngine', () => {
  let engine: GapAnalysisEngine;
  let mockSpecParser: jest.Mocked<SpecParser>;
  let mockCodeScanner: jest.Mocked<CodeScanner>;
  let mockGapDetector: jest.Mocked<GapDetector>;
  let mockTaskGenerator: jest.Mocked<TaskGenerator>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSpecParser = new SpecParser('/test') as jest.Mocked<SpecParser>;
    mockCodeScanner = new CodeScanner('/test') as jest.Mocked<CodeScanner>;
    mockGapDetector = new GapDetector() as jest.Mocked<GapDetector>;
    mockTaskGenerator = new TaskGenerator() as jest.Mocked<TaskGenerator>;

    engine = new GapAnalysisEngine(
      mockSpecParser,
      mockCodeScanner,
      mockGapDetector,
      mockTaskGenerator
    );
  });

  describe('analyze', () => {
    it('should orchestrate the full analysis pipeline', async () => {
      const mockTarget: TargetArchitecture = {
        version: '1.0.0',
        parsedAt: new Date(),
        agents: [],
        modules: [],
        interfaces: [],
        dataModels: [],
        workflows: []
      };

      const mockCurrent: CurrentImplementation = {
        scannedAt: new Date(),
        agents: [],
        modules: [],
        files: [],
        exports: []
      };

      const mockGaps = [{
        id: 'gap-1',
        type: 'missing_agent' as const,
        severity: 'blocking' as const,
        targetName: 'TestAgent',
        targetDescription: '',
        specRef: { document: 'AGENTS.md' },
        evidence: { expected: '', actual: '' },
        relatedFiles: []
      }];

      const mockTasks: BusinessTask[] = [{
        id: 'task-1',
        title: 'Implement TestAgent',
        description: '',
        sourceGap: mockGaps[0],
        requirements: [],
        suggestedApproach: [],
        acceptanceCriteria: [],
        priority: 'P0',
        estimatedEffort: 'medium',
        maxDuration: 7200000,
        status: 'pending',
        createdAt: new Date()
      }];

      mockSpecParser.parse.mockResolvedValue(mockTarget);
      mockCodeScanner.scan.mockResolvedValue(mockCurrent);
      mockGapDetector.detect.mockReturnValue(mockGaps);
      mockTaskGenerator.generate.mockReturnValue(mockTasks);

      const result = await engine.analyze('/test/project');

      expect(mockSpecParser.parse).toHaveBeenCalled();
      expect(mockCodeScanner.scan).toHaveBeenCalled();
      expect(mockGapDetector.detect).toHaveBeenCalledWith(mockTarget, mockCurrent);
      expect(mockTaskGenerator.generate).toHaveBeenCalledWith(mockGaps, mockTarget);
      expect(result).toEqual(mockTasks);
    });

    it('should handle errors gracefully', async () => {
      mockSpecParser.parse.mockRejectedValue(new Error('Parse error'));

      await expect(engine.analyze('/test/project')).rejects.toThrow('Parse error');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd harness-cli && npx jest src/core/analysis/__tests__/GapAnalysisEngine.test.ts --passWithNoTests`
Expected: FAIL with "GapAnalysisEngine is not defined"

- [ ] **Step 3: Write minimal implementation**

Create `src/core/analysis/GapAnalysisEngine.ts`:

```typescript
import { SpecParser } from './SpecParser';
import { CodeScanner } from './CodeScanner';
import { GapDetector } from './GapDetector';
import { TaskGenerator } from './TaskGenerator';
import { BusinessTask } from './types';

export class GapAnalysisEngine {
  constructor(
    private specParser: SpecParser,
    private codeScanner: CodeScanner,
    private gapDetector: GapDetector,
    private taskGenerator: TaskGenerator
  ) {}

  async analyze(projectPath: string): Promise<BusinessTask[]> {
    // 1. Parse specification documents
    const target = await this.specParser.parse();

    // 2. Scan current implementation
    const current = await this.codeScanner.scan();

    // 3. Detect gaps between spec and implementation
    const gaps = this.gapDetector.detect(target, current);

    // 4. Generate tasks from gaps
    const tasks = this.taskGenerator.generate(gaps, target);

    return tasks;
  }
}
```

- [ ] **Step 4: Create index.ts for exports**

Create `src/core/analysis/index.ts`:

```typescript
/**
 * 规范驱动的差距分析
 * 
 * 分析规范文档（AGENTS.md、ARCHITECTURE.md）与实际代码实现之间的差距，
 * 生成开发任务。
 */

export { GapAnalysisEngine } from './GapAnalysisEngine';
export { SpecParser } from './SpecParser';
export { CodeScanner } from './CodeScanner';
export { GapDetector } from './GapDetector';
export { TaskGenerator } from './TaskGenerator';
export * from './types';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd harness-cli && npx jest src/core/analysis/__tests__/GapAnalysisEngine.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd harness-cli
git add src/core/analysis/GapAnalysisEngine.ts src/core/analysis/__tests__/GapAnalysisEngine.test.ts src/core/analysis/index.ts
git commit -m "feat(analysis): add GapAnalysisEngine as main entry point"
```

---

## Task 7: Integration with LoopController

**Files:**
- Modify: `src/core/LoopController.ts`

- [ ] **Step 1: Add import and modify analyzeCodebase method**

Modify `src/core/LoopController.ts` to use the new GapAnalysisEngine:

Add imports at the top:
```typescript
import { GapAnalysisEngine, SpecParser, CodeScanner, GapDetector, TaskGenerator } from './analysis';
```

Modify the `analyzeCodebase` method:
```typescript
private async analyzeCodebase(): Promise<BusinessTask[]> {
  try {
    // 创建分析引擎
    const specParser = new SpecParser(this.projectPath);
    const codeScanner = new CodeScanner(this.projectPath);
    const gapDetector = new GapDetector();
    const taskGenerator = new TaskGenerator();
    
    const engine = new GapAnalysisEngine(
      specParser,
      codeScanner,
      gapDetector,
      taskGenerator
    );
    
    // 运行分析
    const tasks = await engine.analyze(this.projectPath);
    
    this.logger.info(`Generated ${tasks.length} tasks from gap analysis`);
    return tasks;
  } catch (error) {
    this.logger.error('Gap analysis failed:', error);
    // 回退到空任务列表
    return [];
  }
}
```

- [ ] **Step 2: Remove hardcoded task generation methods**

Remove or deprecate these methods from LoopController:
- `createTasksFromCodeStatus()` - hardcoded PickerAgent/DesignerAgent/MarketerAgent
- `createTasksFromPlans()` - hardcoded agent tasks

Replace with:
```typescript
private async generateTasks(): Promise<void> {
  this.logger.info('Generating tasks from gap analysis...');
  
  const tasks = await this.analyzeCodebase();
  
  for (const task of tasks) {
    await this.taskQueue.enqueue(task);
    this.logger.info(`Enqueued task: ${task.title}`);
  }
}
```

- [ ] **Step 3: Run existing tests to ensure no regression**

Run: `cd harness-cli && npx jest src/core/__tests__/LoopController.test.ts --passWithNoTests`
Expected: PASS (or show expected failures for removed functionality)

- [ ] **Step 4: Commit**

```bash
cd harness-cli
git add src/core/LoopController.ts
git commit -m "refactor(core): integrate GapAnalysisEngine into LoopController"
```

---

## Task 8: Deprecate RequirementDiscoveryEngine

**Files:**
- Modify: `src/evolution/analyzers/RequirementDiscoveryEngine.ts`

- [ ] **Step 1: Add deprecation notice**

Add at the top of `src/evolution/analyzers/RequirementDiscoveryEngine.ts`:

```typescript
/**
 * @deprecated 请改用 GapAnalysisEngine，从 './analysis' 导入。
 * 此模块包含硬编码的电商需求，将被移除。
 */
```

- [ ] **Step 2: Update exports to warn about deprecation**

Add console warning in constructor:
```typescript
constructor(projectPath: string) {
  this.projectPath = projectPath;
  this.logger = new Logger();
  console.warn('RequirementDiscoveryEngine 已废弃。请改用 GapAnalysisEngine。');
}
```

- [ ] **Step 3: Commit**

```bash
cd harness-cli
git add src/evolution/analyzers/RequirementDiscoveryEngine.ts
git commit -m "deprecation(analysis): mark RequirementDiscoveryEngine as deprecated"
```

---

## Task 9: Create Integration Test

**Files:**
- Create: `src/core/analysis/__tests__/integration.test.ts`

- [ ] **Step 1: Write integration test**

Create `src/core/analysis/__tests__/integration.test.ts`:

```typescript
import { GapAnalysisEngine } from '../GapAnalysisEngine';
import { SpecParser } from '../SpecParser';
import { CodeScanner } from '../CodeScanner';
import { GapDetector } from '../GapDetector';
import { TaskGenerator } from '../TaskGenerator';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

jest.mock('fs/promises');
jest.mock('glob');

describe('GapAnalysis Integration', () => {
  let engine: GapAnalysisEngine;
  let mockFs: jest.Mocked<typeof fs>;
  let mockGlob: jest.Mocked<typeof glob>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs = fs as jest.Mocked<typeof fs>;
    mockGlob = glob as unknown as jest.Mocked<typeof glob>;
  });

  it('should generate tasks for a project with missing agents', async () => {
    const agentsMd = `
# Project Agents

## CoordinatorAgent

**Role:** Coordinates tasks

**Responsibilities:**
- task-distribution
- result-aggregation
`;

    const architectureMd = `
# Architecture

## Modules

### UserService

**Layer:** service
**Description:** User management

**Exposed Interfaces:**
- createUser
- getUser
`;

    mockFs.access = jest.fn().mockResolvedValue(undefined);
    mockFs.readFile = jest.fn().mockImplementation((filePath: string) => {
      if (filePath.includes('AGENTS.md')) return Promise.resolve(agentsMd);
      if (filePath.includes('ARCHITECTURE.md')) return Promise.resolve(architectureMd);
      return Promise.reject(new Error('Not found'));
    });
    mockFs.stat = jest.fn().mockResolvedValue({ size: 100 } as any);

    // 空项目 - 没有 Agent 和模块
    mockGlob.glob = jest.fn().mockResolvedValue([]);

    const specParser = new SpecParser('/test');
    const codeScanner = new CodeScanner('/test');
    const gapDetector = new GapDetector();
    const taskGenerator = new TaskGenerator();
    engine = new GapAnalysisEngine(specParser, codeScanner, gapDetector, taskGenerator);

    const tasks = await engine.analyze('/test');

    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.some(t => t.title.includes('CoordinatorAgent'))).toBe(true);
    expect(tasks.some(t => t.title.includes('UserService'))).toBe(true);
  });

  it('should return empty tasks for complete project', async () => {
    const agentsMd = `
## TestAgent

**Responsibilities:**
- do-something
`;

    mockFs.access = jest.fn().mockResolvedValue(undefined);
    mockFs.readFile = jest.fn().mockImplementation((filePath: string) => {
      if (filePath.includes('AGENTS.md')) return Promise.resolve(agentsMd);
      return Promise.reject(new Error('Not found'));
    });
    mockFs.stat = jest.fn().mockResolvedValue({ size: 100 } as any);

    // 项目有该 Agent
    mockGlob.glob = jest.fn().mockImplementation((pattern: string) => {
      if (pattern.includes('agents')) {
        return Promise.resolve(['TestAgent.ts']);
      }
      return Promise.resolve([]);
    });

    mockFs.readFile = jest.fn().mockImplementation((filePath: string) => {
      if (filePath.includes('AGENTS.md')) return Promise.resolve(agentsMd);
      if (filePath.includes('TestAgent.ts')) {
        return Promise.resolve(`
export class TestAgent {
  async doSomething() {}
}
        `);
      }
      return Promise.reject(new Error('Not found'));
    });

    const specParser = new SpecParser('/test');
    const codeScanner = new CodeScanner('/test');
    const gapDetector = new GapDetector();
    const taskGenerator = new TaskGenerator();
    engine = new GapAnalysisEngine(specParser, codeScanner, gapDetector, taskGenerator);

    const tasks = await engine.analyze('/test');

    // 应该没有差距（或只有轻微差距）
    expect(tasks.filter(t => t.priority === 'P0')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `cd harness-cli && npx jest src/core/analysis/__tests__/integration.test.ts --passWithNoTests`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd harness-cli
git add src/core/analysis/__tests__/integration.test.ts
git commit -m "test(analysis): add integration tests for gap analysis pipeline"
```

---

## Plan Self-Review

### Spec Coverage
| Spec Requirement | Implementing Task |
|-----------------|-------------------|
| SpecParser 解析 AGENTS.md/ARCHITECTURE.md | Task 2 |
| CodeScanner 扫描代码现状 | Task 3 |
| GapDetector 检测差距 | Task 4 |
| TaskGenerator 生成任务 | Task 5 |
| GapAnalysisEngine 主入口 | Task 6 |
| 与 LoopController 集成 | Task 7 |
| 废弃 RequirementDiscoveryEngine | Task 8 |
| 类型定义 | Task 1 |
| 集成测试 | Task 9 |

### Placeholder Scan
- ✅ 无 "TBD", "TODO"
- ✅ 所有测试包含具体代码
- ✅ 所有实现包含完整逻辑
- ✅ 无 "similar to Task N" 引用

### Type Consistency
- ✅ Gap, BusinessTask, AgentSpec, ModuleSpec 类型在所有文件中一致
- ✅ 方法签名保持一致
- ✅ 优先级映射: severity -> priority 统一

---

## Summary

This plan creates a complete specification-driven gap analysis system with:

1. **Type definitions** - Core data models
2. **SpecParser** - Parses AGENTS.md/ARCHITECTURE.md
3. **CodeScanner** - Analyzes current code
4. **GapDetector** - Identifies gaps
5. **TaskGenerator** - Creates actionable tasks
6. **GapAnalysisEngine** - Orchestrates the pipeline
7. **LoopController integration** - Replaces hardcoded logic
8. **Deprecation** - Marks old system as deprecated
9. **Integration tests** - Validates the full flow

**Plan complete and saved to `docs/superpowers/plans/2026-04-08-spec-driven-gap-analysis.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
