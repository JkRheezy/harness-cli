/**
 * SmartTaskGenerator 测试
 */

import { SmartTaskGenerator } from '../SmartTaskGenerator';
import { Gap, BusinessTask } from '../../types';

// Mock Logger
jest.mock('../../../utils/Logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

describe('SmartTaskGenerator', () => {
  let generator: SmartTaskGenerator;

  beforeEach(() => {
    generator = new SmartTaskGenerator();
  });

  describe('constructor', () => {
    it('应该成功初始化 Logger', () => {
      expect(generator).toBeDefined();
    });
  });

  describe('generateFromGap', () => {
    it('应该将 missing_module 类型的 gap 转化为业务任务', () => {
      const gap: Gap = {
        id: 'gap-001',
        type: 'missing_module',
        name: '用户管理模块',
        description: '缺少用户管理功能',
        reason: '核心功能缺失',
        priority: 'P1',
        suggestedScope: '实现完整的用户 CRUD',
        relatedFiles: ['src/models/User.ts'],
        detectedAt: new Date()
      };

      const task = generator.generateFromGap(gap);

      expect(task).toBeDefined();
      expect(task.id).toMatch(/^TASK-\d+-/);
      expect(task.title).toContain('用户管理模块');
      expect(task.title).toContain('实现');
      expect(task.priority).toBe('P1');
      expect(task.estimatedEffort).toBe('large');
      expect(task.relatedGap).toBe(gap);
      expect(task.requirements.length).toBeGreaterThan(0);
      expect(task.suggestedApproach.length).toBeGreaterThan(0);
      expect(task.acceptanceCriteria.length).toBeGreaterThan(0);
    });

    it('应该将 missing_api 类型的 gap 转化为业务任务', () => {
      const gap: Gap = {
        id: 'gap-002',
        type: 'missing_api',
        name: '/api/users/login',
        description: '缺少用户登录 API',
        reason: '认证功能需要',
        priority: 'P0',
        suggestedScope: '实现登录接口',
        detectedAt: new Date()
      };

      const task = generator.generateFromGap(gap);

      expect(task).toBeDefined();
      expect(task.title).toContain('/api/users/login');
      expect(task.title).toContain('添加');
      expect(task.title).toContain('API 接口');
      expect(task.priority).toBe('P0');
      expect(task.estimatedEffort).toBe('medium');
    });

    it('应该将 incomplete_flow 类型的 gap 转化为业务任务', () => {
      const gap: Gap = {
        id: 'gap-003',
        type: 'incomplete_flow',
        name: '用户注册流程',
        description: '注册流程缺少邮箱验证',
        reason: '安全要求',
        priority: 'P1',
        suggestedScope: '补充邮箱验证环节',
        detectedAt: new Date()
      };

      const task = generator.generateFromGap(gap);

      expect(task).toBeDefined();
      expect(task.title).toContain('用户注册流程');
      expect(task.title).toContain('完善');
      expect(task.title).toContain('流程');
      expect(task.estimatedEffort).toBe('medium');
    });

    it('应该将 missing_model 类型的 gap 转化为业务任务', () => {
      const gap: Gap = {
        id: 'gap-004',
        type: 'missing_model',
        name: 'Order 模型',
        description: '缺少订单数据模型',
        reason: '电商功能需要',
        priority: 'P0',
        suggestedScope: '创建 Order 模型及关联',
        detectedAt: new Date()
      };

      const task = generator.generateFromGap(gap);

      expect(task).toBeDefined();
      expect(task.title).toContain('Order 模型');
      expect(task.title).toContain('创建');
      expect(task.title).toContain('数据模型');
      expect(task.estimatedEffort).toBe('medium');
    });

    it('应该将 config_mismatch 类型的 gap 转化为业务任务', () => {
      const gap: Gap = {
        id: 'gap-005',
        type: 'config_mismatch',
        name: '数据库配置',
        description: '配置文件与实际数据库不匹配',
        reason: '配置未同步',
        priority: 'P2',
        suggestedScope: '更新配置文件',
        detectedAt: new Date()
      };

      const task = generator.generateFromGap(gap);

      expect(task).toBeDefined();
      expect(task.title).toContain('数据库配置');
      expect(task.title).toContain('修复');
      expect(task.estimatedEffort).toBe('small');
    });

    it('生成的任务描述应包含问题描述和原因分析', () => {
      const gap: Gap = {
        id: 'gap-006',
        type: 'missing_module',
        name: '测试模块',
        description: '这是一个测试描述',
        reason: '测试原因',
        priority: 'P2',
        suggestedScope: '测试范围',
        detectedAt: new Date()
      };

      const task = generator.generateFromGap(gap);

      expect(task.description).toContain('## 问题描述');
      expect(task.description).toContain('这是一个测试描述');
      expect(task.description).toContain('## 原因分析');
      expect(task.description).toContain('测试原因');
      expect(task.description).toContain('## 建议范围');
      expect(task.description).toContain('测试范围');
    });

    it('应该在描述中包含相关文件列表', () => {
      const gap: Gap = {
        id: 'gap-007',
        type: 'missing_module',
        name: '测试模块',
        description: '测试描述',
        reason: '测试原因',
        priority: 'P2',
        suggestedScope: '测试范围',
        relatedFiles: ['file1.ts', 'file2.ts'],
        detectedAt: new Date()
      };

      const task = generator.generateFromGap(gap);

      expect(task.description).toContain('## 相关文件');
      expect(task.description).toContain('file1.ts');
      expect(task.description).toContain('file2.ts');
    });

    it('每个生成的任务应该有唯一的 ID', () => {
      const gap: Gap = {
        id: 'gap-008',
        type: 'missing_api',
        name: 'Test API',
        description: 'Test',
        reason: 'Test',
        priority: 'P2',
        suggestedScope: 'Test',
        detectedAt: new Date()
      };

      const task1 = generator.generateFromGap(gap);
      const task2 = generator.generateFromGap(gap);

      expect(task1.id).not.toBe(task2.id);
    });
  });

  describe('generateImplementationSteps', () => {
    it('应该为 user 模块返回预定义的实现步骤', () => {
      const gap: Gap = {
        id: 'gap-user',
        type: 'missing_module',
        name: 'user authentication system',
        description: '缺少用户认证',
        reason: '需要登录功能',
        priority: 'P1',
        suggestedScope: '实现用户系统',
        detectedAt: new Date()
      };

      const steps = generator.generateImplementationSteps(gap);

      expect(steps).toContain('创建用户数据库模型');
      expect(steps).toContain('实现注册/登录 API');
      expect(steps).toContain('创建登录/注册页面');
      expect(steps).toContain('添加 JWT token 处理');
      expect(steps).toContain('实现密码找回');
    });

    it('应该为 payment 模块返回预定义的实现步骤', () => {
      const gap: Gap = {
        id: 'gap-payment',
        type: 'missing_module',
        name: 'payment gateway',
        description: '缺少支付功能',
        reason: '需要收款',
        priority: 'P0',
        suggestedScope: '实现支付系统',
        detectedAt: new Date()
      };

      const steps = generator.generateImplementationSteps(gap);

      expect(steps).toContain('集成 Stripe SDK');
      expect(steps).toContain('创建支付 API');
      expect(steps).toContain('实现支付页面');
      expect(steps).toContain('添加支付状态回调');
      expect(steps).toContain('错误处理和退款');
    });

    it('应该根据 gap 类型返回默认实现步骤', () => {
      const gap: Gap = {
        id: 'gap-api',
        type: 'missing_api',
        name: 'custom api',
        description: '缺少 API',
        reason: '需要接口',
        priority: 'P1',
        suggestedScope: '实现 API',
        detectedAt: new Date()
      };

      const steps = generator.generateImplementationSteps(gap);

      expect(steps).toContain('创建 route.ts 文件');
      expect(steps).toContain('实现业务逻辑');
      expect(steps).toContain('添加输入验证');
      expect(steps).toContain('实现错误处理');
      expect(steps).toContain('编写 API 文档');
    });

    it('应该返回步骤的副本而非原始引用', () => {
      const gap: Gap = {
        id: 'gap-009',
        type: 'missing_api',
        name: 'api1',
        description: 'test',
        reason: 'test',
        priority: 'P2',
        suggestedScope: 'test',
        detectedAt: new Date()
      };

      const steps1 = generator.generateImplementationSteps(gap);
      const steps2 = generator.generateImplementationSteps(gap);

      steps1.push('额外步骤');
      expect(steps2).not.toContain('额外步骤');
    });
  });

  describe('generateAcceptanceCriteria', () => {
    it('应该为 payment 模块返回预定义的验收标准', () => {
      const gap: Gap = {
        id: 'gap-payment-criteria',
        type: 'missing_module',
        name: 'payment system',
        description: '缺少支付',
        reason: '需要收款',
        priority: 'P0',
        suggestedScope: '实现支付',
        detectedAt: new Date()
      };

      const criteria = generator.generateAcceptanceCriteria(gap);

      expect(criteria).toContain('支持信用卡支付');
      expect(criteria).toContain('处理支付回调');
      expect(criteria).toContain('错误处理和退款流程');
      expect(criteria).toContain('支付状态实时更新');
      expect(criteria).toContain('交易记录正确保存');
    });

    it('应该为 user 模块返回预定义的验收标准', () => {
      const gap: Gap = {
        id: 'gap-user-criteria',
        type: 'missing_module',
        name: 'user module',
        description: '缺少用户模块',
        reason: '需要用户管理',
        priority: 'P1',
        suggestedScope: '实现用户模块',
        detectedAt: new Date()
      };

      const criteria = generator.generateAcceptanceCriteria(gap);

      expect(criteria).toContain('用户可以注册新账户');
      expect(criteria).toContain('用户可以使用邮箱/密码登录');
      expect(criteria).toContain('JWT token 正确生成和验证');
    });

    it('应该根据 gap 类型返回默认验收标准', () => {
      const gap: Gap = {
        id: 'gap-flow',
        type: 'incomplete_flow',
        name: 'checkout flow',
        description: '流程不完整',
        reason: '缺少步骤',
        priority: 'P1',
        suggestedScope: '完善流程',
        detectedAt: new Date()
      };

      const criteria = generator.generateAcceptanceCriteria(gap);

      expect(criteria).toContain('用户流程完整可走完');
      expect(criteria).toContain('所有页面正常渲染');
      expect(criteria).toContain('状态管理正确');
    });

    it('应该返回验收标准的副本而非原始引用', () => {
      const gap: Gap = {
        id: 'gap-010',
        type: 'missing_module',
        name: 'unknown module',
        description: 'test',
        reason: 'test',
        priority: 'P2',
        suggestedScope: 'test',
        detectedAt: new Date()
      };

      const criteria1 = generator.generateAcceptanceCriteria(gap);
      const criteria2 = generator.generateAcceptanceCriteria(gap);

      criteria1.push('额外标准');
      expect(criteria2).not.toContain('额外标准');
    });
  });

  describe('工作量估算', () => {
    it('P0 missing_module 应该估算为 large', () => {
      const gap: Gap = {
        id: 'gap-p0-module',
        type: 'missing_module',
        name: 'critical module',
        description: 'test',
        reason: 'test',
        priority: 'P0',
        suggestedScope: 'test',
        detectedAt: new Date()
      };

      const task = generator.generateFromGap(gap);
      expect(task.estimatedEffort).toBe('large');
    });

    it('P1 missing_api 应该估算为 small', () => {
      const gap: Gap = {
        id: 'gap-p1-api',
        type: 'missing_api',
        name: 'simple api',
        description: 'test',
        reason: 'test',
        priority: 'P1',
        suggestedScope: 'test',
        detectedAt: new Date()
      };

      const task = generator.generateFromGap(gap);
      expect(task.estimatedEffort).toBe('small');
    });

    it('P0 incomplete_flow 应该估算为 large', () => {
      const gap: Gap = {
        id: 'gap-p0-flow',
        type: 'incomplete_flow',
        name: 'critical flow',
        description: 'test',
        reason: 'test',
        priority: 'P0',
        suggestedScope: 'test',
        detectedAt: new Date()
      };

      const task = generator.generateFromGap(gap);
      expect(task.estimatedEffort).toBe('large');
    });

    it('所有 config_mismatch 应该估算为 small', () => {
      const priorities: Array<'P0' | 'P1' | 'P2'> = ['P0', 'P1', 'P2'];
      
      priorities.forEach(priority => {
        const gap: Gap = {
          id: `gap-config-${priority}`,
          type: 'config_mismatch',
          name: 'config',
          description: 'test',
          reason: 'test',
          priority,
          suggestedScope: 'test',
          detectedAt: new Date()
        };

        const task = generator.generateFromGap(gap);
        expect(task.estimatedEffort).toBe('small');
      });
    });
  });

  describe('边界情况', () => {
    it('应该处理没有相关文件的 gap', () => {
      const gap: Gap = {
        id: 'gap-no-files',
        type: 'missing_module',
        name: 'orphan module',
        description: 'test',
        reason: 'test',
        priority: 'P2',
        suggestedScope: 'test',
        detectedAt: new Date()
      };

      const task = generator.generateFromGap(gap);
      expect(task).toBeDefined();
      expect(task.description).not.toContain('## 相关文件');
    });

    it('应该处理空相关文件数组', () => {
      const gap: Gap = {
        id: 'gap-empty-files',
        type: 'missing_module',
        name: 'empty files module',
        description: 'test',
        reason: 'test',
        priority: 'P2',
        suggestedScope: 'test',
        relatedFiles: [],
        detectedAt: new Date()
      };

      const task = generator.generateFromGap(gap);
      expect(task).toBeDefined();
      // 空数组时不应该添加相关文件部分
      expect(task.description).not.toContain('## 相关文件');
    });
  });
});
