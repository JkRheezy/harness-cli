import { AgentsMdParser } from '../AgentsMdParser';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

describe('AgentsMdParser', () => {
  let parser: AgentsMdParser;
  let testDir: string;

  const sampleAgentsMd = `# TestProject - 项目概述

## 1. 项目概述

- **项目名称**: TestProject
- **核心功能**: A test project for demonstration
- **技术栈**: TypeScript + React + Node.js

## 2. 快速开始

### 2.1 环境准备

\`\`\`bash
# Install dependencies
npm install
# Copy config
cp .env.example .env
\`\`\`

### 2.2 启动项目

\`\`\`bash
npm run dev
\`\`\`

## 3. 关键文档索引

| 文档 | 路径 | 阅读时间 | 内容摘要 |
|------|------|----------|----------|
| 架构文档 | docs/ARCHITECTURE.md | 10 min | 系统架构说明 |
| API文档 | docs/API.md | 5 min | API接口文档 |

## 4. 常见任务

### 4.1 添加新功能

1. 创建功能分支
2. 编写代码
3. 添加测试
4. 提交PR

### 4.2 修复Bug

1. 定位问题
2. 编写修复
3. 验证修复
4. 提交代码

## 5. 重要约束

- ❌ **不要直接修改main分支**
- ✅ **所有代码必须通过测试**
- ⚠️ **注意敏感信息不要提交**
`;

  beforeEach(async () => {
    parser = new AgentsMdParser();
    testDir = path.join(tmpdir(), `agents-md-parser-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(path.join(testDir, 'AGENTS.md'), sampleAgentsMd, 'utf-8');
  });

  afterEach(async () => {
    try { await fs.rm(testDir, { recursive: true, force: true }); } catch {}
  });

  it('should parse AGENTS.md from file', async () => {
    const result = await parser.parse(testDir);

    expect(result.projectName).toBe('TestProject');
    expect(result.description).toBe('A test project for demonstration');
    expect(result.techStack).toBe('TypeScript + React + Node.js');
  });

  it('should parse content directly', () => {
    const result = parser.parseContent(sampleAgentsMd);

    expect(result.projectName).toBe('TestProject');
    expect(result.description).toBe('A test project for demonstration');
  });

  it('should extract quick start commands', () => {
    const result = parser.parseContent(sampleAgentsMd);

    expect(result.quickStart.setupCommands).toContain('npm install');
    expect(result.quickStart.setupCommands).toContain('cp .env.example .env');
    expect(result.quickStart.startCommand).toBe('npm run dev');
  });

  it('should extract document map', () => {
    const result = parser.parseContent(sampleAgentsMd);

    expect(result.documentMap).toHaveLength(2);
    expect(result.documentMap[0].document).toBe('架构文档');
    expect(result.documentMap[0].path).toBe('docs/ARCHITECTURE.md');
    expect(result.documentMap[1].document).toBe('API文档');
  });

  it('should extract common tasks', () => {
    const result = parser.parseContent(sampleAgentsMd);

    expect(result.commonTasks).toHaveLength(2);
    expect(result.commonTasks[0].name).toBe('添加新功能');
    expect(result.commonTasks[0].steps).toHaveLength(4);
    expect(result.commonTasks[1].name).toBe('修复Bug');
  });

  it('should extract constraints', () => {
    const result = parser.parseContent(sampleAgentsMd);

    expect(result.constraints).toHaveLength(3);
    expect(result.constraints[0]).toEqual({
      type: 'must-not',
      description: '不要直接修改main分支'
    });
    expect(result.constraints[1]).toEqual({
      type: 'must',
      description: '所有代码必须通过测试'
    });
    expect(result.constraints[2]).toEqual({
      type: 'warning',
      description: '注意敏感信息不要提交'
    });
  });

  it('should throw error when AGENTS.md not found', async () => {
    const emptyDir = path.join(tmpdir(), `empty-${Date.now()}`);
    await fs.mkdir(emptyDir, { recursive: true });

    await expect(parser.parse(emptyDir)).rejects.toThrow('AGENTS.md not found');

    await fs.rmdir(emptyDir);
  });
});
