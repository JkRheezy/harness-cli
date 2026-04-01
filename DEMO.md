# Harness CLI 演示

> 完整的无人值守开发工作流演示

## 场景：自动实现用户认证功能

### 1. 初始化项目

```bash
# 创建新项目
mkdir my-project && cd my-project

# 初始化 Harness
harness init

# 输出:
# 🚀 初始化 Harness 项目...
# ✅ 默认配置已创建: .harness/config.yaml
# ✅ 目录结构已创建
# ✅ AGENTS.md 已创建
# ✅ GitHub Actions 工作流已创建
# ✅ .gitignore 已创建
# ✅ 初始化完成！
```

### 2. 配置环境

```bash
# 设置 API 密钥
export OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxx

# 编辑配置
vim .harness/config.yaml
```

### 3. 提交任务

```bash
harness task \
  --title "实现 JWT 用户认证" \
  --description "添加完整的用户认证系统，包括注册、登录、token 刷新" \
  --requirements "创建 User 模型,实现注册接口,实现登录接口,添加 JWT 中间件,实现 token 刷新,编写单元测试" \
  --priority high \
  --max-duration 3

# 输出:
# 📋 提交任务: 实现 JWT 用户认证
# ✅ 任务已提交: task-1711462800000-abc123
# ⏱️  预计执行时间: 3 小时
```

### 4. 启动无人值守 Loop

```bash
harness loop --duration 6

# 输出:
# 🚀 启动 Harness 无人值守 Loop...
# ⏱️  最大运行时长: 6小时
# 🧪 模拟模式: 否
# 📂 从检查点恢复
# 💾 检查点已保存
# 
# 📋 开始执行任务: 实现 JWT 用户认证
# 📋 执行计划: 8 个步骤
#   [1/8] 读取现有代码结构
#   [2/8] 创建 User 类型定义
#   [3/8] 实现用户服务
#   [4/8] 实现认证控制器
#   [5/8] 添加 JWT 中间件
#   [6/8] 实现 token 刷新
#   [7/8] 编写单元测试
#   [8/8] 运行测试验证
# 
# ✅ 任务执行完成: 实现 JWT 用户认证
#    状态: success
#    耗时: 45000ms
# 
# 🔀 创建 PR...
# ✅ PR 已创建: https://github.com/user/repo/pull/1
# 📊 PR 编号: 1
# 
# 🔍 启动自动审查...
# 📋 审查结果:
#   - 状态: approved
#   - 问题数: 0
#   - 建议数: 2
# 
# 💡 改进建议:
#   - 考虑添加密码强度验证
#   - 建议添加登录失败限制
# 
# ✅ 自动审查通过，批准 PR
# 🔀 自动合并 PR...
# ✅ PR 已合并
# 
# 📊 统计: 完成1, 失败0, 升级0
```

### 5. 查看结果

```bash
# 查看状态
harness status

# 输出:
# 📊 Harness 系统状态
# ===================
# Loop 状态: running
# 活跃任务: 0
# 待处理任务: 2
# 已完成任务: 1
# 失败任务: 0
# 运行时长: 0小时45分钟
```

### 6. 查看生成的代码

```bash
# 查看 PR
git log --oneline -5

# 输出:
# abc1234 [Auto] 实现 JWT 用户认证
# ef56789 之前的提交...

# 查看文件
cat src/types/user.ts
cat src/service/auth-service.ts
cat src/ui/api/auth-controller.ts
```

## 完整工作流

```
人类: 提交任务 → Loop: 执行 → PR: 创建 → 审查: 自动 → 合并: 自动
     │                │            │              │            │
     │                │            │              │            │
     ▼                ▼            ▼              ▼            ▼
   任务队列        代码生成      分支推送       LLM审查      代码合并
   优先级排序      测试运行      PR创建         自动化检查   部署触发
                  文档更新      审查请求       问题修复
```

## 多任务并行示例

```bash
# 提交多个任务

harness task \
  --title "添加订单管理" \
  --description "实现订单 CRUD" \
  --priority medium

harness task \
  --title "优化数据库查询" \
  --description "添加索引，优化慢查询" \
  --priority high

harness task \
  --title "更新文档" \
  --description "更新 API 文档" \
  --priority low

# 启动 Loop（自动按优先级处理）
harness loop --duration 8
```

## 监控长时间运行

```bash
# 终端 1: 启动 Loop
harness loop --duration 6

# 终端 2: 监控状态
watch -n 10 harness status

# 终端 3: 查看日志
tail -f logs/harness.log
```

## 故障恢复示例

```bash
# Loop 因错误停止
# ...
# 🚨 安全边界被触发: 错误率超过 50%
# 🛑 正在停止 Loop...
# 🧹 资源已清理

# 修复问题后，从检查点恢复
harness loop --duration 6

# 输出:
# 📂 从检查点恢复
# 📋 恢复任务: 实现 JWT 用户认证
# 🔄 继续执行...
```

## 实际使用建议

### 开发环境

```bash
# 使用本地模型节省成本
export LLM_PROVIDER=local
export LLM_MODEL=codellama:13b

# 短时长测试
harness loop --duration 1 --dry-run
```

### 生产环境

```bash
# 使用 GPT-4 高质量生成
export LLM_PROVIDER=openai
export LLM_MODEL=gpt-4o

# 长时间运行
nohup harness loop --duration 6 > harness.log 2>&1 &
```

### CI/CD 集成

```yaml
# .github/workflows/harness-auto.yml
name: Harness Auto Development

on:
  issues:
    types: [labeled]

jobs:
  auto-develop:
    if: github.event.label.name == 'harness-auto'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Harness
        run: |
          npm install -g @harness/cli
          harness init
          
      - name: Run Harness Loop
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          harness task \
            --title "${{ github.event.issue.title }}" \
            --description "${{ github.event.issue.body }}" \
            --priority high
            
          harness loop --duration 4
```

---

**演示版本**: 2.1.0
