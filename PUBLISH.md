# 发布指南

本文档介绍如何将 `@harness/cli` 发布到 npm 并供其他项目使用。

## 前置条件

1. npm 账号（https://www.npmjs.com/）
2. 加入组织或有权限发布 `@harness` 命名空间下的包
3. Node.js >= 18

## 发布步骤

### 1. 准备发布

```bash
# 确保代码已提交
git status

# 更新版本号
npm version patch  # patch | minor | major

# 构建项目
npm run build
```

### 2. 登录 npm

```bash
npm login
```

输入你的 npm 用户名、密码和邮箱。

### 3. 发布包

如果是 scoped 包（如 `@harness/cli`），需要加上 `--access public`：

```bash
npm publish --access public
```

### 4. 验证发布

```bash
# 查看包信息
npm view @harness/cli

# 测试安装
npm install -g @harness/cli

# 验证命令
harness --version
```

## 更新已发布包

### 版本号规则

- **patch**: 修复 bug (1.0.0 -> 1.0.1)
- **minor**: 添加功能 (1.0.0 -> 1.1.0)
- **major**: 破坏性变更 (1.0.0 -> 2.0.0)

### 更新流程

```bash
# 1. 更新版本
npm version minor

# 2. 构建
npm run build

# 3. 发布
npm publish --access public

# 4. 推送 git 标签
git push origin main --tags
```

## 使用 Beta 版本

### 发布 Beta 版本

```bash
npm version prerelease --preid=beta
npm publish --tag beta --access public
```

### 安装 Beta 版本

```bash
npm install -g @harness/cli@beta
```

## 撤销发布

如果发布后有严重问题，可以在 24 小时内撤销：

```bash
npm unpublish @harness/cli@<version>
```

**注意**: npm 现在推荐使用 `npm deprecate` 而不是 `unpublish`：

```bash
npm deprecate @harness/cli@<version> "This version has critical issues, please use latest"
```

## 最佳实践

1. **发布前检查清单**:
   - [ ] 代码已审查
   - [ ] 测试通过
   - [ ] 版本号已更新
   - [ ] CHANGELOG 已更新
   - [ ] 文档已更新

2. **使用 GitHub Actions 自动发布**:

创建 `.github/workflows/publish.yml`:

```yaml
name: Publish

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      - run: npm ci
      - run: npm run build
      - run: npm test
      
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

3. **使用 npm scripts 简化**:

在 `package.json` 中添加：

```json
{
  "scripts": {
    "prepublishOnly": "npm run build && npm test",
    "release:patch": "npm version patch && npm publish --access public",
    "release:minor": "npm version minor && npm publish --access public",
    "release:major": "npm version major && npm publish --access public"
  }
}
```

## 故障排除

### 403 Forbidden

可能是因为：
- 没有权限发布 scoped 包
- 包名已被占用
- 需要验证邮箱

解决：
```bash
# 验证邮箱
npm adduser

# 检查包名可用性
npm search @harness/cli
```

### 版本已存在

```bash
# 检查现有版本
npm view @harness/cli versions

# 使用新版本号
npm version patch
```

### 构建文件缺失

确保 `files` 字段在 `package.json` 中正确配置：

```json
{
  "files": [
    "dist/**/*",
    "templates/**/*",
    "README.md"
  ]
}
```

## 相关链接

- npm 文档: https://docs.npmjs.com/
- Scoped packages: https://docs.npmjs.com/creating-and-publishing-scoped-public-packages
- 语义化版本: https://semver.org/
