# AGENTS.md 重构设计文档

**日期**: 2026-04-10  
**作者**: Harness CLI Team  
**状态**: 待实现  

## 1. 背景与问题

### 1.1 当前问题

当前智能分析生成的 `AGENTS.md` 存在以下问题：

1. **文件过长**：生成的文档有 285 行，严重超出 OpenAI Harness 范式要求的 **80-120 行**
2. **信息过载**：技术栈描述长达数百字、包含详细业务描述段落、完整目录结构树
3. **Agent 体验差**：AI Agent 无法在 2 分钟内读完并理解项目

### 1.2 范式要求

根据 OpenAI Harness 范式，`AGENTS.md` 应该是：

- **长度**: 80-120 行
- **阅读时间**: 2 分钟内
- **结构**: 清晰的 6 层架构指引
- **作用**: 入口指南，而非百科全书

## 2. 设计目标

### 2.1 核心目标

1. **符合范式**: AGENTS.md 始终控制在 60-80 行
2. **分层文档**: 详细信息分散到专门文档
3. **自动补充**: Loop 运行时自动检测并填充"待补充"内容
4. **向后兼容**: 不使用智能分析时也能正常工作

### 2.2 成功标准

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| AGENTS.md 行数 | 285 行 | 60-80 行 |
| Agent 理解时间 | >5 分钟 | <2 分钟 |
| 文档生成成功率 | 85% | >95% |

## 3. 架构设计

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     文档系统架构                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  初始化阶段 (harness create)                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │ 基础模板     │  │ 智能分析     │  │ 文档生成器   │   │  │
│  │  │ (精简版)     │  │ (可选)       │  │              │   │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │  │
│  │         │                  │                 │           │  │
│  │         ▼                  ▼                 ▼           │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │ AGENTS.md (~60行)                                   │ │  │
│  │  │ docs/BUSINESS.md (条件)                             │ │  │
│  │  │ docs/ARCHITECTURE.md (条件)                         │ │  │
│  │  │ .harness/tasks/001-initial.yaml                     │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  运行阶段 (harness loop)                                  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │ 代码扫描     │  │ 特征提取     │  │ 自动填充     │   │  │
│  │  │              │  │              │  │              │   │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │  │
│  │         │                  │                 │           │  │
│  │         ▼                  ▼                 ▼           │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │ 检测到"待补充" → 提取代码特征 → 生成描述 → 更新     │ │  │
│  │  │ 保留用户编辑，只更新占位符                            │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 组件职责

| 组件 | 职责 | 文件 |
|------|------|------|
| TemplateRenderer | 渲染 Handlebars 模板 | `src/templates/*.hbs` |
| SmartDocGenerator | 根据分析结果生成详细文档 | `InitCommand.generateSmartDocs()` |
| CodeFeatureExtractor | 扫描代码提取业务特征 | `docs/autofiller/CodeFeatureExtractor.ts` |
| BusinessGenerator | 将代码特征映射为业务描述 | `docs/autofiller/BusinessGenerator.ts` |
| DocsUpdater | 增量更新文档（含文件锁） | `docs/autofiller/DocsUpdater.ts` |
| SensitiveFilter | 过滤敏感信息 | `docs/autofiller/SensitiveFilter.ts` |

## 4. 数据模型

### 4.1 文档元数据

```typescript
// .harness/docs-meta.json
interface DocsMetadata {
  version: string;           // "1.0.0"
  generatedAt: string;       // ISO timestamp
  lastUpdatedAt: string;     // 上次更新时间
  
  generation: {
    mode: 'full-analysis' | 'partial-analysis' | 'base-template';
    components: {
      business: 'completed' | 'timeout' | 'failed' | 'skipped';
      tech: 'completed' | 'timeout' | 'failed' | 'skipped';
      domain: 'completed' | 'timeout' | 'failed' | 'skipped';
      risk: 'completed' | 'timeout' | 'failed' | 'skipped';
    };
  };
  
  autofilled: {
    [section: string]: {
      timestamp: string;
      source: 'code-inference' | 'llm-analysis' | 'manual';
      confidence: number;
    };
  };
}
```

### 4.2 代码特征结构

```typescript
interface CodeFeatures {
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
```

## 5. 模板设计

### 5.1 AGENTS.md 模板（精简版）

```handlebars
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

### 5.2 详细文档模板

**docs/BUSINESS.md.hbs**: 业务描述详情  
**docs/ARCHITECTURE.md.hbs**: 技术架构详情  
**initial-task.yaml.hbs**: 初始任务列表

## 6. 自动填充算法

### 6.1 特征映射规则

```typescript
const mappingRules: MappingRule[] = [
  {
    // 实体 → 业务域
    id: 'entities-to-domain',
    match: (features) => features.domain.entities,
    transform: (entities) => {
      const domains = new Set<string>();
      if (entities.some(e => /user|account|profile|auth/i.test(e))) {
        domains.add('用户管理');
      }
      if (entities.some(e => /order|cart|payment|checkout/i.test(e))) {
        domains.add('订单与支付');
      }
      if (entities.some(e => /product|sku|item|goods/i.test(e))) {
        domains.add('商品与库存');
      }
      if (entities.some(e => /notification|message|email|sms/i.test(e))) {
        domains.add('消息通知');
      }
      return Array.from(domains);
    }
  },
  {
    // API 路由 → 核心功能
    id: 'routes-to-features',
    match: (features) => features.api.routes,
    transform: (routes) => {
      const features: string[] = [];
      if (routes.some(r => /auth|login|oauth/i.test(r))) {
        features.push('用户认证与授权');
      }
      if (routes.some(r => /webhook|callback/i.test(r))) {
        features.push('第三方系统集成');
      }
      return features;
    }
  }
];
```

### 6.2 生成流程

```
1. 解析 AGENTS.md
   └─ 检测 "待补充" 占位符

2. 扫描代码
   └─ 提取实体、服务、路由、依赖

3. 应用映射规则
   └─ 代码特征 → 业务描述

4. 生成描述
   └─ 组合多个规则结果

5. 更新文档
   └─ 增量替换，保留用户编辑

6. 记录元数据
   └─ 更新时间、来源、置信度
```

## 7. 错误处理与降级

### 7.1 失败场景处理

| 场景 | 策略 |
|------|------|
| 代码扫描失败 | 保留占位符，记录警告日志 |
| 特征提取无匹配 | 使用通用描述 |
| 文档写入失败 | 重试3次，静默跳过 |
| AGENTS.md 格式损坏 | 备份后重新生成 |

### 7.2 降级策略

```typescript
enum FallbackStrategy {
  KEEP_PLACEHOLDER = 'keep',      // 保留"待补充"
  GENERIC = 'generic',            // 使用通用描述
  SKIP = 'skip',                  // 跳过此项
  PROMPT_USER = 'prompt'          // 生成任务提示用户
}
```

## 8. 配置选项

### 8.1 配置文件扩展

```yaml
# .harness/config.yaml
docs:
  language: 'auto'              # 文档语言: auto | zh | en
  
  autofilled:
    enabled: true               # 总开关
    mode: 'auto'                # auto | suggest | manual
    
    sections:                   # 细粒度控制
      businessDescription: true
      coreFeatures: true
      targetUsers: false        # 用户手动维护
    
    cache:
      enabled: true
      ttl: 300000               # 5分钟（毫秒）
    
    security:
      filterSensitive: true     # 过滤敏感信息
```

## 9. 安全考虑

### 9.1 敏感信息过滤

```typescript
const SENSITIVE_PATTERNS = [
  /api[_-]?key\s*[=:]\s*['"][^'"]+['"]/i,
  /password\s*[=:]\s*['"][^'"]+['"]/i,
  /secret\s*[=:]\s*['"][^'"]+['"]/i,
  /token\s*[=:]\s*['"][^'"]+['"]/i,
];

// 扫描时跳过或脱敏
```

### 9.2 文件锁机制

```typescript
class DocsLock {
  async acquire(): Promise<boolean>;
  async release(): Promise<void>;
  isLocked(): boolean;
}
```

## 10. 测试策略

### 10.1 测试覆盖

| 测试类型 | 覆盖内容 |
|---------|---------|
| 单元测试 | 特征提取规则、模板渲染 |
| 集成测试 | 完整流程：代码 → 文档 |
| 边界测试 | 空项目、超大项目、超时 |
| 回归测试 | 确保 AGENTS.md 始终 60-120 行 |

### 10.2 测试用例示例

```typescript
describe('CodeFeatureExtractor', () => {
  it('should extract entities from TypeORM decorators', () => {
    const code = `@Entity() class User { ... }`;
    const features = extractor.extract(code);
    expect(features.domain.entities).toContain('User');
  });
  
  it('should detect sensitive patterns and exclude them', () => {
    const code = `const apiKey = 'sk-1234567890abcdef';`;
    const features = extractor.extract(code);
    expect(features.sensitive).toBeDefined();
  });
});

describe('AGENTS.md line count', () => {
  it('should not exceed 120 lines', () => {
    const content = generateAgentsMd(testProject);
    const lines = content.split('\n').length;
    expect(lines).toBeLessThanOrEqual(120);
  });
});
```

## 11. 实现计划

### 11.1 Phase 1: 基础架构

1. 重构模板系统（精简 AGENTS.md）
2. 实现分层文档生成
3. 添加动态文档索引
4. 更新 InitCommand

### 11.2 Phase 2: 自动填充

1. 实现 CodeFeatureExtractor
2. 实现 BusinessGenerator（规则引擎）
3. 实现 DocsUpdater（增量更新）
4. 集成到 LoopController

### 11.3 Phase 3: 优化与测试

1. 添加缓存机制
2. 实现文件锁
3. 添加敏感信息过滤
4. 编写完整测试套件

## 12. 验收标准

### 12.1 功能验收

- [ ] AGENTS.md 生成后行数在 60-80 之间
- [ ] 启用智能分析时生成 docs/BUSINESS.md 和 docs/ARCHITECTURE.md
- [ ] 禁用智能分析时只生成 AGENTS.md
- [ ] Loop 运行时自动检测并填充"待补充"内容
- [ ] 用户手动编辑的内容不被覆盖
- [ ] 配置选项可以控制自动填充行为

### 12.2 性能验收

- [ ] 文档生成时间 < 500ms
- [ ] 代码扫描缓存有效（5分钟内不重复扫描）
- [ ] 自动填充不阻塞 Loop 主流程

### 12.3 安全验收

- [ ] 不会将 API Key、密码等敏感信息写入文档
- [ ] 文件锁防止并发修改冲突
- [ ] 文档损坏时有降级策略

## 13. 附录

### 13.1 术语表

| 术语 | 说明 |
|------|------|
| Harness 范式 | OpenAI 倡导的 Agent 项目规范 |
| AGENTS.md | Agent 入口指南文档 |
| 自动填充 | 基于代码推断自动补充文档内容 |
| 特征映射 | 将代码特征转换为业务描述的规则 |

### 13.2 参考文档

- [OpenAI Harness 范式](https://github.com/openai/harness)
- [Handlebars 模板文档](https://handlebarsjs.com/)

---

**评审记录:**

| 日期 | 评审人 | 意见 | 状态 |
|------|--------|------|------|
| 2026-04-10 | - | 初始版本 | 待评审 |
