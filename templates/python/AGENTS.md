# AGENTS.md - Agent 协作指南

> 本文档是 AI Agent 的入口指南，长度控制在 80-120 行

## 1. 快速开始 (2分钟)

### 1.1 项目概述
- **项目名称**: {{projectName}}
- **技术栈**: Python 3.9+
- **核心功能**: {{projectDescription}}

### 1.2 环境准备
```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -e ".[dev]"

# 运行测试
pytest
```

## 2. 项目结构

```
src/
└── {{projectName}}/
    ├── __init__.py
    ├── core/           # 核心业务逻辑
    ├── models/         # 数据模型
    ├── services/       # 服务层
    └── utils/          # 工具函数
tests/                  # 测试
docs/                   # 文档
```

## 3. 关键文档索引

| 文档 | 路径 | 阅读时间 |
|------|------|----------|
| 架构总览 | docs/ARCHITECTURE.md | 5 min |
| API 文档 | docs/API.md | 10 min |

## 4. 常见任务

### 4.1 添加新功能
1. 在 `src/{{projectName}}/` 创建模块
2. 添加类型注解
3. 编写 pytest 测试
4. 运行 `black` 和 `mypy` 检查

### 4.2 代码规范
- 使用 Black 格式化 (line-length: 100)
- 使用 mypy 类型检查
- 函数必须有 docstring

## 5. 重要约束

- ❌ 不要提交没有测试的代码
- ✅ 类型注解是必需的
- ⚠️ 保持函数简洁（< 50 行）

## 6. 寻求帮助

- 查看 docs/references/troubleshooting.md
- 运行 `harness status` 查看系统状态
