/**
 * AgentsMdManager 测试
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { AgentsMdManager } from '../AgentsMdManager';
import { Gap } from '../../types';

describe('AgentsMdManager', () => {
  let tempDir: string;
  let manager: AgentsMdManager;

  beforeEach(async () => {
    // 创建临时目录
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-md-test-'));
    manager = new AgentsMdManager(tempDir);
  });

  afterEach(async () => {
    // 清理临时目录
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('read()', () => {
    test('当 AGENTS.md 不存在时返回 null', async () => {
      const result = await manager.read();
      expect(result).toBeNull();
    });

    test('成功读取并解析 AGENTS.md', async () => {
      const content = `# Test Project

> 状态: 🔄 持续进化中 | 最后更新: 2026-04-02 (由 Loop 自动更新)

## 已实现功能 ✅

| 模块 | 描述 | 完成时间 |
|------|------|----------|
| ModuleA | 模块A描述 | 2026-04-01 |

## 进行中 🚧

- ModuleB: 模块B描述

## 待实现 📋

_以下内容由 Loop 自动检测生成_

| 模块 | 描述 | 优先级 | 生成原因 |
|------|------|--------|----------|
| ModuleC | 模块C描述 | P0 | 原因说明 |
`;
      await fs.writeFile(path.join(tempDir, 'AGENTS.md'), content, 'utf-8');

      const result = await manager.read();

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Test Project');
      expect(result!.implemented).toHaveLength(1);
      expect(result!.implemented[0].module).toBe('ModuleA');
      expect(result!.implemented[0].description).toBe('模块A描述');
      expect(result!.inProgress).toHaveLength(1);
      expect(result!.inProgress[0].module).toBe('ModuleB');
      expect(result!.pending).toHaveLength(1);
      expect(result!.pending[0].module).toBe('ModuleC');
      expect(result!.pending[0].priority).toBe('P0');
    });

    test('解析空列表', async () => {
      const content = `# Test Project

> 状态: 🔄 持续进化中 | 最后更新: 2026-04-02 (由 Loop 自动更新)

## 已实现功能 ✅

*暂无已实现功能*

## 进行中 🚧

*暂无进行中任务*

## 待实现 📋

_以下内容由 Loop 自动检测生成_

*暂无待实现需求*
`;
      await fs.writeFile(path.join(tempDir, 'AGENTS.md'), content, 'utf-8');

      const result = await manager.read();

      expect(result).not.toBeNull();
      expect(result!.implemented).toHaveLength(0);
      expect(result!.inProgress).toHaveLength(0);
      expect(result!.pending).toHaveLength(0);
    });
  });

  describe('addRequirement()', () => {
    test('创建新的 AGENTS.md 并添加需求', async () => {
      const gap: Gap = {
        id: 'gap-1',
        type: 'missing_module',
        name: 'NewModule',
        description: '新模块描述',
        reason: '业务需要',
        priority: 'P0',
        suggestedScope: 'core',
        detectedAt: new Date()
      };

      await manager.addRequirement(gap);

      const result = await manager.read();
      expect(result).not.toBeNull();
      expect(result!.pending).toHaveLength(1);
      expect(result!.pending[0].module).toBe('NewModule');
      expect(result!.pending[0].description).toBe('新模块描述');
      expect(result!.pending[0].priority).toBe('P0');
      expect(result!.pending[0].reason).toBe('业务需要');
    });

    test('向已有文件添加新需求', async () => {
      const content = `# Test Project

> 状态: 🔄 持续进化中 | 最后更新: 2026-04-02 (由 Loop 自动更新)

## 已实现功能 ✅

*暂无已实现功能*

## 进行中 🚧

*暂无进行中任务*

## 待实现 📋

_以下内容由 Loop 自动检测生成_

| 模块 | 描述 | 优先级 | 生成原因 |
|------|------|--------|----------|
| ExistingModule | 已有模块 | P1 | 原因 |
`;
      await fs.writeFile(path.join(tempDir, 'AGENTS.md'), content, 'utf-8');

      const gap: Gap = {
        id: 'gap-2',
        type: 'missing_api',
        name: 'NewAPIModule',
        description: 'API模块描述',
        reason: 'API需要',
        priority: 'P1',
        suggestedScope: 'api',
        detectedAt: new Date()
      };

      await manager.addRequirement(gap);

      const result = await manager.read();
      expect(result!.pending).toHaveLength(2);
      expect(result!.pending.some(e => e.module === 'NewAPIModule')).toBe(true);
    });

    test('已存在的需求跳过添加', async () => {
      const gap: Gap = {
        id: 'gap-1',
        type: 'missing_module',
        name: 'DuplicateModule',
        description: '描述',
        reason: '原因',
        priority: 'P0',
        suggestedScope: 'core',
        detectedAt: new Date()
      };

      await manager.addRequirement(gap);
      await manager.addRequirement(gap);

      const result = await manager.read();
      expect(result!.pending).toHaveLength(1);
    });

    test('已实现的模块不再添加到待实现', async () => {
      const content = `# Test Project

> 状态: 🔄 持续进化中 | 最后更新: 2026-04-02 (由 Loop 自动更新)

## 已实现功能 ✅

| 模块 | 描述 | 完成时间 |
|------|------|----------|
| ImplementedModule | 已实现 | 2026-04-01 |

## 进行中 🚧

*暂无进行中任务*

## 待实现 📋

_以下内容由 Loop 自动检测生成_

*暂无待实现需求*
`;
      await fs.writeFile(path.join(tempDir, 'AGENTS.md'), content, 'utf-8');

      const gap: Gap = {
        id: 'gap-1',
        type: 'missing_module',
        name: 'ImplementedModule',
        description: '描述',
        reason: '原因',
        priority: 'P0',
        suggestedScope: 'core',
        detectedAt: new Date()
      };

      await manager.addRequirement(gap);

      const result = await manager.read();
      expect(result!.pending).toHaveLength(0);
      expect(result!.implemented).toHaveLength(1);
    });
  });

  describe('markAsInProgress()', () => {
    test('将待实现标记为进行中', async () => {
      const content = `# Test Project

> 状态: 🔄 持续进化中 | 最后更新: 2026-04-02 (由 Loop 自动更新)

## 待实现 📋

_以下内容由 Loop 自动检测生成_

| 模块 | 描述 | 优先级 | 生成原因 |
|------|------|--------|----------|
| ToDoModule | 待做模块 | P1 | 原因 |
`;
      await fs.writeFile(path.join(tempDir, 'AGENTS.md'), content, 'utf-8');

      await manager.markAsInProgress('ToDoModule');

      const result = await manager.read();
      expect(result!.pending).toHaveLength(0);
      expect(result!.inProgress).toHaveLength(1);
      expect(result!.inProgress[0].module).toBe('ToDoModule');
      expect(result!.inProgress[0].description).toBe('待做模块');
    });

    test('直接标记新模块为进行中', async () => {
      await manager.markAsInProgress('DirectInProgress', '直接开始');

      const result = await manager.read();
      expect(result!.inProgress).toHaveLength(1);
      expect(result!.inProgress[0].module).toBe('DirectInProgress');
      expect(result!.inProgress[0].description).toBe('直接开始');
    });

    test('已实现的模块不能再标记为进行中', async () => {
      const content = `# Test Project

> 状态: 🔄 持续进化中 | 最后更新: 2026-04-02 (由 Loop 自动更新)

## 已实现功能 ✅

| 模块 | 描述 | 完成时间 |
|------|------|----------|
| DoneModule | 已完成 | 2026-04-01 |
`;
      await fs.writeFile(path.join(tempDir, 'AGENTS.md'), content, 'utf-8');

      await manager.markAsInProgress('DoneModule', '尝试开始');

      const result = await manager.read();
      expect(result!.inProgress).toHaveLength(0);
      expect(result!.implemented).toHaveLength(1);
    });

    test('重复的进行中请求只更新描述', async () => {
      await manager.markAsInProgress('SameModule', '初始描述');
      await manager.markAsInProgress('SameModule', '更新描述');

      const result = await manager.read();
      expect(result!.inProgress).toHaveLength(1);
    });
  });

  describe('markAsImplemented()', () => {
    test('将待实现标记为已实现', async () => {
      const content = `# Test Project

> 状态: 🔄 持续进化中 | 最后更新: 2026-04-02 (由 Loop 自动更新)

## 待实现 📋

_以下内容由 Loop 自动检测生成_

| 模块 | 描述 | 优先级 | 生成原因 |
|------|------|--------|----------|
| ToCompleteModule | 待完成 | P0 | 原因 |
`;
      await fs.writeFile(path.join(tempDir, 'AGENTS.md'), content, 'utf-8');

      await manager.markAsImplemented('ToCompleteModule');

      const result = await manager.read();
      expect(result!.pending).toHaveLength(0);
      expect(result!.implemented).toHaveLength(1);
      expect(result!.implemented[0].module).toBe('ToCompleteModule');
      expect(result!.implemented[0].description).toBe('待完成');
      expect(result!.implemented[0].completedAt).toBeDefined();
    });

    test('将进行中的标记为已实现', async () => {
      const content = `# Test Project

> 状态: 🔄 持续进化中 | 最后更新: 2026-04-02 (由 Loop 自动更新)

## 进行中 🚧

- WorkingModule: 开发中
`;
      await fs.writeFile(path.join(tempDir, 'AGENTS.md'), content, 'utf-8');

      await manager.markAsImplemented('WorkingModule');

      const result = await manager.read();
      expect(result!.inProgress).toHaveLength(0);
      expect(result!.implemented).toHaveLength(1);
      expect(result!.implemented[0].description).toBe('开发中');
    });

    test('直接标记新模块为已实现', async () => {
      await manager.markAsImplemented('QuickComplete');

      const result = await manager.read();
      expect(result!.implemented).toHaveLength(1);
      expect(result!.implemented[0].module).toBe('QuickComplete');
      expect(result!.implemented[0].completedAt).toBeDefined();
    });

    test('重复标记为已实现不重复添加', async () => {
      await manager.markAsImplemented('OnceModule');
      await manager.markAsImplemented('OnceModule');

      const result = await manager.read();
      expect(result!.implemented).toHaveLength(1);
    });
  });

  describe('serialize and parse roundtrip', () => {
    test('完整的读写循环保持数据一致性', async () => {
      // 添加一些需求
      const gaps: Gap[] = [
        {
          id: 'g1',
          type: 'missing_module',
          name: 'AuthModule',
          description: '认证模块',
          reason: '需要登录功能',
          priority: 'P0',
          suggestedScope: 'auth',
          detectedAt: new Date()
        },
        {
          id: 'g2',
          type: 'missing_api',
          name: 'UserAPI',
          description: '用户API',
          reason: '需要用户管理',
          priority: 'P1',
          suggestedScope: 'api',
          detectedAt: new Date()
        }
      ];

      for (const gap of gaps) {
        await manager.addRequirement(gap);
      }

      await manager.markAsInProgress('AuthModule', '开始实现认证');
      await manager.markAsImplemented('UserAPI');

      // 重新读取并验证
      const result = await manager.read();
      
      expect(result!.pending).toHaveLength(0);
      expect(result!.inProgress).toHaveLength(1);
      expect(result!.implemented).toHaveLength(1);
      
      expect(result!.inProgress[0].module).toBe('AuthModule');
      expect(result!.inProgress[0].description).toBe('认证模块');
      
      expect(result!.implemented[0].module).toBe('UserAPI');
      expect(result!.implemented[0].description).toBe('用户API');
      expect(result!.implemented[0].completedAt).toBeDefined();
    });
  });

  describe('getAgentsMdPath()', () => {
    test('返回正确的文件路径', () => {
      const expectedPath = path.join(tempDir, 'AGENTS.md');
      expect(manager.getAgentsMdPath()).toBe(expectedPath);
    });
  });
});
