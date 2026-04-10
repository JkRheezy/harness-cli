# Specification-Driven Gap Analysis Design

## Overview

重构 harness-cli 的任务生成系统，从**硬编码的电商模板**转变为**基于规范文档与代码实际差距的智能分析**。

**核心原则**：AGENTS.md 和 ARCHITECTURE.md 是"真理来源"（Source of Truth），任务生成基于规范与实现的差距分析。

**目标**：
1. 支持任意类型的软件项目（不再锁定电商领域）
2. 通过解析规范文档自动识别目标架构
3. 通过代码扫描识别当前实现状态
4. 基于差距生成具体的开发任务

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Input: Project Directory                     │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  AGENTS.md      │  │  ARCHITECTURE.md │  │  Source Code   │ │
│  │  (Agent角色定义) │  │  (架构规范)       │  │  (当前实现)     │ │
│  └────────┬────────┘  └────────┬─────────┘  └───────┬────────┘ │
└───────────┼────────────────────┼────────────────────┼──────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GapAnalysisEngine                            │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │  SpecParser     │    │  CodeScanner    │    │ GapDetector │ │
│  │  (规范解析器)    │    │  (代码扫描器)    │    │ (差距检测器) │ │
│  └────────┬────────┘    └────────┬────────┘    └──────┬──────┘ │
│           │                      │                    │        │
│           │    ┌─────────────────┴────────────────────┘        │
│           │    │                   │                           │
│           ▼    ▼                   ▼                           │
│      ┌──────────────────────────────────────┐                 │
│      │  TargetArchitecture (目标架构模型)    │                 │
│      │  CurrentImplementation (当前实现模型) │                 │
│      └───────────────────┬──────────────────┘                 │
│                          │                                     │
│                          ▼                                     │
│      ┌──────────────────────────────────────┐                 │
│      │  Gap[] (差距列表)                     │                 │
│      │  - missing_module                    │                 │
│      │  - incomplete_module                 │                 │
│      │  - orphan_code                       │                 │
│      └──────────────┬───────────────────────┘                 │
└─────────────────────┼──────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TaskGenerator                                │
│  将 Gap 转化为可执行的 BusinessTask                              │
└─────────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TaskQueue                                    │
│  执行队列中的任务                                                │
└─────────────────────────────────────────────────────────────────┘
```

### 组件职责

| 组件 | 职责 | 输入 | 输出 |
|------|------|------|------|
| **SpecParser** | 解析 AGENTS.md 和 ARCHITECTURE.md，提取结构化规范 | Markdown 文档 | `TargetArchitecture` |
| **CodeScanner** | 扫描源代码，识别当前实现状态和模块 | Source Code | `CurrentImplementation` |
| **GapDetector** | 对比规范与实现，识别差距 | Target + Current | `Gap[]` |
| **TaskGenerator** | 将差距转化为具体开发任务 | Gap[] + 规范上下文 | `BusinessTask[]` |

---

## Data Models

### TargetArchitecture (目标架构)

```typescript
interface TargetArchitecture {
  version: string;
  parsedAt: Date;
  agents: AgentSpec[];
  modules: ModuleSpec[];
  interfaces: InterfaceSpec[];
  dataModels: DataModelSpec[];
  workflows: WorkflowSpec[];
}

interface AgentSpec {
  name: string;
  description: string;
  responsibilities: string[];
  skills: string[];
  expectedFiles: string[];  // 期望的文件路径模式
  dependencies: string[];
}

interface ModuleSpec {
  name: string;
  description: string;
  layer: 'api' | 'service' | 'data' | 'ui';
  exposedInterfaces: string[];
  dependencies: string[];
  expectedFiles: string[];
  acceptanceCriteria: string[];
}

interface InterfaceSpec {
  name: string;
  type: 'class' | 'function' | 'api' | 'event';
  signature: string;
  module: string;
  description: string;
}

interface DataModelSpec {
  name: string;
  fields: DataField[];
  relations: DataRelation[];
}

interface WorkflowSpec {
  name: string;
  description: string;
  steps: WorkflowStep[];
  participants: string[];
}
```

### CurrentImplementation (当前实现)

```typescript
interface CurrentImplementation {
  scannedAt: Date;
  agents: ImplementedAgent[];
  modules: ImplementedModule[];
  files: SourceFile[];
  exports: ExportSymbol[];
}

interface ImplementedAgent {
  name: string;
  files: string[];
  detectedResponsibilities: string[];
  completeness: number;  // 0-100
}

interface ImplementedModule {
  name: string;
  files: string[];
  exportedSymbols: string[];
  detectedLayer?: string;
}

interface SourceFile {
  path: string;
  type: 'ts' | 'tsx' | 'js' | 'json' | 'other';
  size: number;
  exports: string[];
  imports: string[];
}
```

### Gap (差距)

```typescript
type GapType = 
  | 'missing_agent'      // 规范定义了 Agent，但代码未实现
  | 'missing_module'     // 规范定义了模块，但代码未实现
  | 'incomplete_module'  // 模块存在但功能不完整
  | 'missing_interface'  // 接口未实现
  | 'orphan_code'        // 代码存在但规范未定义
  | 'doc_outdated';      // 规范与代码明显不符

interface Gap {
  id: string;
  type: GapType;
  severity: 'blocking' | 'major' | 'minor';
  
  // 规范引用
  specRef: {
    document: string;
    section?: string;
    line?: number;
  };
  
  // 涉及的目标
  targetName: string;
  targetDescription: string;
  
  // 差距详情
  evidence: {
    expected: string;
    actual: string;
    missingItems?: string[];
    existingItems?: string[];
  };
  
  // 相关文件
  relatedFiles: string[];
}
```

### BusinessTask (业务任务)

```typescript
interface BusinessTask {
  id: string;
  title: string;
  description: string;
  
  // 来源
  sourceGap: Gap;
  
  // 实现要求
  requirements: string[];
  suggestedApproach: string[];
  acceptanceCriteria: string[];
  
  // 元数据
  priority: 'P0' | 'P1' | 'P2';
  estimatedEffort: 'small' | 'medium' | 'large';
  maxDuration: number;  // 毫秒
  
  // 状态
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
}
```

---

## Component Specifications

### 1. SpecParser

**职责**：解析规范文档，提取结构化架构模型

**实现方式**：
- 使用 LLM 解析 Markdown 文档
- 通过结构化 Prompt 要求 LLM 提取规范
- 缓存解析结果（基于文档 hash）

**核心方法**：

```typescript
class SpecParser {
  constructor(private docsPath: string);
  
  async parse(): Promise<TargetArchitecture>;
  
  private async parseAgentsMd(): Promise<AgentSpec[]>;
  private async parseArchitectureMd(): Promise<{
    modules: ModuleSpec[];
    interfaces: InterfaceSpec[];
    dataModels: DataModelSpec[];
    workflows: WorkflowSpec[];
  }>;
  
  // 缓存管理
  private getCacheKey(): string;
  private loadFromCache(): TargetArchitecture | null;
  private saveToCache(arch: TargetArchitecture): void;
}
```

**LLM Prompt 设计**：

```
你是一个架构文档解析器。请解析以下 AGENTS.md 和 ARCHITECTURE.md 文档，提取结构化信息。

## 文档内容
{agentsMdContent}

{architectureMdContent}

## 提取要求
1. 识别所有定义的 Agent（名称、职责、技能）
2. 识别所有模块（名称、层级、依赖）
3. 识别接口定义
4. 识别数据模型
5. 识别工作流

## 输出格式（JSON）
{
  "agents": [...],
  "modules": [...],
  "interfaces": [...],
  "dataModels": [...],
  "workflows": [...]
}
```

### 2. CodeScanner

**职责**：扫描源代码，识别当前实现状态

**扫描策略**：
1. **Agent 检测**：扫描 src/lib/ai/agents/ 目录
2. **模块检测**：基于文件路径和导出符号分析
3. **接口检测**：提取所有导出的类、函数、类型
4. **依赖分析**：分析 import 关系

**核心方法**：

```typescript
class CodeScanner {
  constructor(private srcPath: string);
  
  async scan(): Promise<CurrentImplementation>;
  
  private async scanAgents(): Promise<ImplementedAgent[]>;
  private async scanModules(): Promise<ImplementedModule[]>;
  private async scanFiles(): Promise<SourceFile[]>;
  
  // AST 分析
  private analyzeFile(filePath: string): SourceFile;
  private extractExports(ast: SourceFile): string[];
  private extractImports(ast: SourceFile): string[];
}
```

### 3. GapDetector

**职责**：对比规范与实现，识别差距

**检测规则**：

| 规则 | 条件 | 生成的 Gap |
|------|------|-----------|
| R1 | 规范有 Agent X，代码无 Agent X | missing_agent |
| R2 | 规范有 Module Y，代码无 Module Y | missing_module |
| R3 | Module Y 存在，但缺少规范定义的接口 | incomplete_module |
| R4 | 代码有 Module Z，规范无 Module Z | orphan_code |
| R5 | 接口存在但签名与规范不符 | doc_outdated |

**核心方法**：

```typescript
class GapDetector {
  detect(
    target: TargetArchitecture,
    current: CurrentImplementation
  ): Gap[];
  
  private detectMissingAgents(target: TargetArchitecture, current: CurrentImplementation): Gap[];
  private detectMissingModules(target: TargetArchitecture, current: CurrentImplementation): Gap[];
  private detectIncompleteModules(target: TargetArchitecture, current: CurrentImplementation): Gap[];
  private detectOrphanCode(target: TargetArchitecture, current: CurrentImplementation): Gap[];
}
```

### 4. TaskGenerator

**职责**：将 Gap 转化为可执行的业务任务

**任务生成策略**：
- 每个 Gap 生成一个主要任务
- 根据 Gap 类型和严重程度设置优先级
- 从规范中提取具体的实现要求和验收标准

**核心方法**：

```typescript
class TaskGenerator {
  generate(gaps: Gap[], target: TargetArchitecture): BusinessTask[];
  
  private generateFromGap(gap: Gap, target: TargetArchitecture): BusinessTask;
  
  // 优先级映射
  private gapToPriority(gap: Gap): 'P0' | 'P1' | 'P2';
  
  // 工作量估算
  private estimateEffort(gap: Gap): 'small' | 'medium' | 'large';
}
```

---

## Integration with Existing System

### 替换点

1. **LoopController.analyzeCodebase()**
   - 当前：硬编码检查 PickerAgent/DesignerAgent/MarketerAgent
   - 新实现：调用 GapAnalysisEngine.analyze()

2. **LoopController.createTasksFromCodeStatus()**
   - 当前：硬编码生成 4 个电商智能体任务
   - 新实现：调用 TaskGenerator.generate() 基于 Gap 生成任务

3. **RequirementDiscoveryEngine**
   - 当前：硬编码电商模块要求
   - 新实现：移除，功能由 SpecParser + GapDetector 替代

### 新的入口点

```typescript
// src/analysis/GapAnalysisEngine.ts
export class GapAnalysisEngine {
  constructor(
    private specParser: SpecParser,
    private codeScanner: CodeScanner,
    private gapDetector: GapDetector,
    private taskGenerator: TaskGenerator
  );
  
  async analyze(projectPath: string): Promise<BusinessTask[]> {
    // 1. 解析规范
    const target = await this.specParser.parse();
    
    // 2. 扫描代码
    const current = await this.codeScanner.scan();
    
    // 3. 检测差距
    const gaps = this.gapDetector.detect(target, current);
    
    // 4. 生成任务
    const tasks = this.taskGenerator.generate(gaps, target);
    
    return tasks;
  }
}
```

---

## File Structure

```
src/
├── analysis/
│   ├── GapAnalysisEngine.ts          # 主入口
│   ├── SpecParser.ts                 # 规范解析
│   ├── CodeScanner.ts                # 代码扫描
│   ├── GapDetector.ts                # 差距检测
│   ├── TaskGenerator.ts              # 任务生成
│   ├── types.ts                      # 类型定义
│   └── __tests__/
│       ├── SpecParser.test.ts
│       ├── CodeScanner.test.ts
│       ├── GapDetector.test.ts
│       └── TaskGenerator.test.ts
└── core/
    ├── LoopController.ts             # 修改：集成 GapAnalysisEngine
    └── ...
```

---

## Testing Strategy

### 单元测试

1. **SpecParser Tests**
   - 测试能正确解析各种格式的 AGENTS.md
   - 测试缓存机制
   - 测试错误处理（文档不存在）

2. **CodeScanner Tests**
   - 测试 Agent 检测
   - 测试模块检测
   - 测试导出符号提取

3. **GapDetector Tests**
   - 测试每种 Gap 类型的检测
   - 测试边界情况（空项目、完整项目）

4. **TaskGenerator Tests**
   - 测试任务生成逻辑
   - 测试优先级映射
   - 测试工作量估算

### 集成测试

```typescript
// __tests__/GapAnalysisEngine.integration.test.ts
describe('GapAnalysisEngine Integration', () => {
  it('should detect missing agents from AGENTS.md', async () => {
    // 创建临时项目目录
    // 写入测试用的 AGENTS.md（定义 AgentX）
    // 不创建 AgentX 的实现
    // 运行分析
    // 验证生成了 "实现 AgentX" 的任务
  });
  
  it('should handle complete project with no gaps', async () => {
    // 创建规范定义的所有组件
    // 验证返回空任务列表或仅代码审查任务
  });
});
```

---

## Migration Plan

### 阶段 1：新增分析系统（向后兼容）
1. 创建新的 `src/analysis/` 目录和组件
2. 保持旧的 `RequirementDiscoveryEngine` 不变
3. 添加功能开关，允许切换新旧系统

### 阶段 2：验证和调优
1. 在测试项目上验证新系统
2. 调优 Prompt 和检测规则
3. 确保生成的任务质量

### 阶段 3：切换默认
1. 将新系统设为默认
2. 保留旧系统作为 fallback

### 阶段 4：清理
1. 移除 `RequirementDiscoveryEngine`
2. 移除 LoopController 中的硬编码任务生成逻辑

---

## Success Criteria

1. **功能性**
   - [ ] 能正确解析任意 AGENTS.md 和 ARCHITECTURE.md
   - [ ] 能准确识别规范与实际代码的差距
   - [ ] 生成的任务与规范文档一致（可追溯）

2. **通用性**
   - [ ] 支持不同类型的项目（Web、CLI、Library）
   - [ ] 不依赖任何特定领域知识（无硬编码电商逻辑）

3. **质量**
   - [ ] 生成的任务具有可执行性
   - [ ] 任务描述清晰，包含具体要求和验收标准
   - [ ] 测试覆盖率 > 80%

4. **性能**
   - [ ] 分析时间 < 30 秒（中等规模项目）
   - [ ] 支持缓存，文档未变更时不重复解析

---

## Future Enhancements

1. **增量分析**：只分析变更的模块
2. **历史追踪**：记录架构演进历史
3. **智能建议**：基于 Gap 提供重构建议
4. **可视化**：生成架构图和 Gap 报告
