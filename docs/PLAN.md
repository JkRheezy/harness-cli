# 全自动需求驱动进化系统 - 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 实现全自动需求发现与维护系统，让 Loop 能够自主分析代码缺口、生成需求文档、并驱动业务功能开发

**Architecture:** 
1. RequirementDiscoveryEngine - 扫描代码并识别缺失功能
2. AgentsMdManager - 自动读写和维护 AGENTS.md 文档
3. SmartTaskGenerator - 将缺口转化为具体开发任务
4. 集成到现有 AutoEvolution 系统

---

## Task 1: 扩展类型定义

**Files:** Modify `harness-cli/src/evolution/types.ts`

添加以下类型：
- Gap - 代码缺口定义
- ModuleRequirement - 模块需求
- ArchitecturePattern - 架构模式
- RequirementDiscoveryResult - 发现结果
- AgentsMdEntry/Structure - AGENTS.md 结构
- BusinessTask - 业务任务

---

## Task 2: 实现 AgentsMdManager

**Files:**
- Create: `harness-cli/src/evolution/managers/AgentsMdManager.ts`
- Create: `harness-cli/src/evolution/managers/__tests__/AgentsMdManager.test.ts`

**核心方法：**
- `read()` - 读取并解析 AGENTS.md
- `addRequirement(gap)` - 添加新需求到待实现列表
- `markAsImplemented(name)` - 标记为已实现
- `markAsInProgress(name)` - 标记为进行中

---

## Task 3: 实现 RequirementDiscoveryEngine

**Files:**
- Create: `harness-cli/src/evolution/analyzers/RequirementDiscoveryEngine.ts`
- Create: `harness-cli/src/evolution/analyzers/__tests__/RequirementDiscoveryEngine.test.ts`

**核心方法：**
- `analyze()` - 主分析方法
- `analyzeArchitectureCompleteness()` - 检查必需模块
- `analyzeApiCompleteness()` - 检查 API 闭环
- `analyzeUserFlows()` - 检查用户流程
- `analyzeDataModels()` - 检查数据模型

**预定义模块：**
- user (P0) - 用户系统
- product (P0) - 商品系统
- cart (P0) - 购物车
- order (P0) - 订单系统
- payment (P0) - 支付系统

---

## Task 4: 实现 SmartTaskGenerator

**Files:**
- Create: `harness-cli/src/evolution/generators/SmartTaskGenerator.ts`
- Create: `harness-cli/src/evolution/generators/__tests__/SmartTaskGenerator.test.ts`

**核心方法：**
- `generateFromGap(gap)` - 将缺口转化为任务
- `generateImplementationPlan(gap)` - 生成实现步骤
- `generateAcceptanceCriteria(gap)` - 生成验收标准

---

## Task 5: 集成到 OpportunityDetector

**Files:** Modify `harness-cli/src/evolution/OpportunityDetector.ts`

**修改内容：**
1. 导入新的分析器
2. 在 `detectOpportunities` 中添加需求发现
3. 调整优先级排序（业务功能 > 技术债务 > 测试）

---

## Task 6: 更新配置类型和默认值

**Files:**
- Modify: `harness-cli/src/utils/ConfigLoader.ts`
- Modify: `harness-cli/src/evolution/types.ts`

添加 evolution 配置选项。

---

## 快速开始命令

```bash
# 1. 停止现有 Loop
taskkill /F /IM node.exe

# 2. 构建
cd harness-cli
npm run build

# 3. 测试
npm test

# 4. 提交
git add -A
git commit -m "feat: implement auto-requirement discovery system"

# 5. 重启 Loop
cd ../my-project
.\start-loop.ps1 0.5
```

详细代码实现请参考完整文档。
