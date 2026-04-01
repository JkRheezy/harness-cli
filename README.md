# Harness CLI

🚀 **无人值守 Agent 开发项目脚手架**

基于 Harness-Engineering 方法论，提供项目模板、代码生成和自动化审查功能。

## 安装

### 全局安装（推荐）

```bash
npm install -g @harness/cli
```

### 使用 npx（无需安装）

```bash
npx @harness/cli create my-project
```

### 作为项目依赖

```bash
npm install --save-dev @harness/cli
```

## 快速开始

### 1. 创建新项目

```bash
# 交互式创建
harness init

# 快速创建
harness create my-project --template node-ts

# 使用 Python 模板
harness create my-python-project --template python
```

### 2. 查看可用模板

```bash
harness list-templates
```

### 3. 启动无人值守开发

```bash
cd my-project

# 编辑配置文件
vim .harness/config.yaml

# 启动开发 Loop
harness loop
```

## 命令参考

### `harness init`

交互式初始化项目

```bash
harness init [options]

Options:
  -f, --force              强制覆盖现有配置
  -t, --template <name>    指定模板
  -n, --name <name>        项目名称
  --skip-install           跳过依赖安装
```

### `harness create <project-name>`

快速创建项目

```bash
harness create my-project [options]

Options:
  -t, --template <name>    指定模板 (默认: node-ts)
  -f, --force              强制覆盖
  --skip-install           跳过依赖安装
```

### `harness loop`

启动无人值守开发 Loop

```bash
harness loop [options]

Options:
  -c, --config <path>      配置文件路径 (默认: .harness/config.yaml)
  -d, --duration <hours>   最大运行时长 (默认: 6)
  --dry-run                模拟运行
```

### `harness task`

提交开发任务

```bash
harness task -t "任务标题" -d "任务描述" [options]

Options:
  -t, --title <title>          任务标题 (必需)
  -d, --description <desc>     任务描述 (必需)
  -r, --requirements <items>   需求列表 (逗号分隔)
  -p, --priority <level>       优先级 (low|medium|high)
  --max-duration <hours>       最大执行时长
```

### `harness pr-create`

自动创建 PR

```bash
harness pr-create -b feature-branch -t "PR标题" [options]

Options:
  -b, --branch <branch>    分支名 (必需)
  -t, --title <title>      PR标题 (必需)
  -m, --message <message>  PR描述
  --auto-merge             自动合并
```

### `harness pr-review`

自动审查 PR

```bash
harness pr-review -n <pr-number> [options]

Options:
  -n, --number <number>    PR编号 (必需)
  --auto-approve           自动批准
```

### `harness status`

查看系统状态

```bash
harness status
```

### `harness list-templates`

列出可用模板

```bash
harness list-templates
# 或
harness templates
```

## 项目模板

### node-ts

Node.js TypeScript 项目模板，包含：
- TypeScript 配置
- Jest 测试框架
- ESLint 代码检查
- 完整的 AGENTS.md 模板
- Harness 配置示例

### python

Python 项目模板，包含：
- pyproject.toml 配置
- pytest 测试框架
- Black 代码格式化
- mypy 类型检查
- 完整的 AGENTS.md 模板

## 作为库使用

```typescript
import { TemplateManager, InitCommand } from '@harness/cli';

// 使用模板管理器
const manager = new TemplateManager();
const templates = await manager.listTemplates();

// 创建项目
await manager.scaffold('node-ts', './my-project', {
  projectName: 'my-project',
  projectDescription: 'My awesome project',
  author: 'Your Name',
  version: '1.0.0'
});
```

## 配置文件

`.harness/config.yaml`:

```yaml
project:
  name: my-project
  description: My awesome project
  type: node-ts

llm:
  provider: openai
  model: gpt-4
  apiKey: ${OPENAI_API_KEY}
  maxTokens: 4096
  temperature: 0.7

safety:
  maxExecutionTime: 14400000
  maxErrorRate: 0.3

checkpoint:
  enabled: true
  interval: 300000

pr:
  autoCreate: true
  autoReview: true
  autoMerge: false
```

## 创建自定义模板

1. 在 `templates/` 目录下创建新文件夹
2. 添加 `template.json` 配置文件
3. 添加模板文件（使用 `.hbs` 后缀支持 Handlebars 渲染）

示例模板配置：

```json
{
  "name": "my-template",
  "description": "我的自定义模板",
  "version": "1.0.0",
  "variables": [
    {
      "name": "projectName",
      "description": "项目名称",
      "required": true
    },
    {
      "name": "author",
      "description": "作者",
      "default": "Anonymous"
    }
  ]
}
```

## 发布流程

### 1. 构建

```bash
npm run build
```

### 2. 登录 npm

```bash
npm login
```

### 3. 发布

```bash
npm publish --access public
```

## 开发

```bash
# 克隆仓库
git clone https://github.com/your-org/harness-cli.git
cd harness-cli

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm test
```

## 许可证

MIT
