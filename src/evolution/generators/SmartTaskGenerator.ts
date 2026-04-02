/**
 * SmartTaskGenerator - 将代码缺口转化为具体业务开发任务
 * 
 * 根据 Gap 类型生成相应的 BusinessTask，包括实现步骤和验收标准
 */

import { Gap, BusinessTask } from '../types';
import { Logger } from '../../utils/Logger';

/**
 * 预定义模块的实现步骤映射
 */
const MODULE_IMPLEMENTATION_STEPS: Record<string, string[]> = {
  user: [
    '创建用户数据库模型',
    '实现注册/登录 API',
    '创建登录/注册页面',
    '添加 JWT token 处理',
    '实现密码找回'
  ],
  payment: [
    '集成 Stripe SDK',
    '创建支付 API',
    '实现支付页面',
    '添加支付状态回调',
    '错误处理和退款'
  ],
  auth: [
    '创建认证中间件',
    '实现权限控制',
    '添加会话管理',
    '实现 OAuth 集成',
    '添加安全验证'
  ],
  notification: [
    '配置邮件服务',
    '实现推送通知',
    '创建通知模板',
    '添加通知历史',
    '实现通知偏好设置'
  ]
};

/**
 * 预定义模块的验收标准
 */
const MODULE_ACCEPTANCE_CRITERIA: Record<string, string[]> = {
  user: [
    '用户可以注册新账户',
    '用户可以使用邮箱/密码登录',
    'JWT token 正确生成和验证',
    '密码找回流程正常工作',
    '用户资料可以更新'
  ],
  payment: [
    '支持信用卡支付',
    '处理支付回调',
    '错误处理和退款流程',
    '支付状态实时更新',
    '交易记录正确保存'
  ],
  auth: [
    '未授权访问被正确阻止',
    'Token 过期正确处理',
    '权限分级正确工作',
    'OAuth 登录正常',
    '安全日志记录完整'
  ],
  notification: [
    '邮件通知正确发送',
    '推送通知到达率 > 95%',
    '通知模板渲染正确',
    '用户可以管理通知偏好',
    '通知历史可查询'
  ]
};

/**
 * 默认实现步骤（当没有特定模块匹配时使用）
 */
const DEFAULT_IMPLEMENTATION_STEPS: Record<string, string[]> = {
  missing_module: [
    '创建数据库模型',
    '实现核心 API',
    '创建页面/UI 组件',
    '添加数据验证',
    '集成测试'
  ],
  missing_api: [
    '创建 route.ts 文件',
    '实现业务逻辑',
    '添加输入验证',
    '实现错误处理',
    '编写 API 文档'
  ],
  incomplete_flow: [
    '分析缺失的环节',
    '补充缺失页面',
    '添加页面间跳转逻辑',
    '实现状态管理',
    '端到端流程测试'
  ],
  missing_model: [
    '设计数据模型',
    '创建数据库表/集合',
    '实现 CRUD 操作',
    '添加数据验证',
    '创建关联关系'
  ],
  config_mismatch: [
    '审查当前配置',
    '更新配置文件',
    '验证配置加载',
    '测试配置生效',
    '更新配置文档'
  ]
};

/**
 * 默认验收标准（当没有特定模块匹配时使用）
 */
const DEFAULT_ACCEPTANCE_CRITERIA: Record<string, string[]> = {
  missing_module: [
    '功能按预期工作',
    '单元测试覆盖率 > 80%',
    '集成测试通过',
    '代码符合项目规范',
    '文档已更新'
  ],
  missing_api: [
    'API 响应格式正确',
    '错误处理完善',
    '输入验证有效',
    'API 文档已更新',
    '性能测试通过'
  ],
  incomplete_flow: [
    '用户流程完整可走完',
    '所有页面正常渲染',
    '状态管理正确',
    '边界情况处理完善',
    '用户体验测试通过'
  ],
  missing_model: [
    '数据模型设计合理',
    'CRUD 操作正常',
    '数据验证有效',
    '关联关系正确',
    '迁移脚本已创建'
  ],
  config_mismatch: [
    '配置与实际代码一致',
    '配置加载无错误',
    '环境变量正确读取',
    '配置文档已更新',
    '回滚方案已准备'
  ]
};

export class SmartTaskGenerator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
    this.logger.info('SmartTaskGenerator initialized');
  }

  /**
   * 将 Gap 转化为具体的业务任务
   * @param gap - 发现的代码缺口
   * @returns 生成的业务任务
   */
  generateFromGap(gap: Gap): BusinessTask {
    this.logger.info(`Generating business task from gap: ${gap.id} (${gap.type})`);

    const title = this.generateTitle(gap);
    const description = this.generateDescription(gap);
    const implementationSteps = this.generateImplementationSteps(gap);
    const acceptanceCriteria = this.generateAcceptanceCriteria(gap);
    const estimatedEffort = this.estimateEffort(gap);

    const task: BusinessTask = {
      id: `TASK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      requirements: this.generateRequirements(gap),
      suggestedApproach: implementationSteps,
      acceptanceCriteria,
      estimatedEffort,
      priority: gap.priority,
      relatedGap: gap
    };

    this.logger.info(`Generated task: ${task.id} with effort: ${estimatedEffort}`);
    return task;
  }

  /**
   * 根据缺口类型生成实现步骤
   * @param gap - 发现的代码缺口
   * @returns 实现步骤列表
   */
  generateImplementationSteps(gap: Gap): string[] {
    // 首先检查是否有特定模块的预定义步骤
    const moduleName = this.extractModuleName(gap.name);
    
    if (moduleName && MODULE_IMPLEMENTATION_STEPS[moduleName]) {
      this.logger.debug(`Using predefined steps for module: ${moduleName}`);
      return MODULE_IMPLEMENTATION_STEPS[moduleName];
    }

    // 根据缺口类型使用默认步骤
    const steps = DEFAULT_IMPLEMENTATION_STEPS[gap.type] || DEFAULT_IMPLEMENTATION_STEPS.missing_module;
    
    this.logger.debug(`Generated ${steps.length} implementation steps for gap type: ${gap.type}`);
    return [...steps]; // 返回副本
  }

  /**
   * 生成验收标准
   * @param gap - 发现的代码缺口
   * @returns 验收标准列表
   */
  generateAcceptanceCriteria(gap: Gap): string[] {
    // 首先检查是否有特定模块的预定义标准
    const moduleName = this.extractModuleName(gap.name);
    
    if (moduleName && MODULE_ACCEPTANCE_CRITERIA[moduleName]) {
      this.logger.debug(`Using predefined criteria for module: ${moduleName}`);
      return MODULE_ACCEPTANCE_CRITERIA[moduleName];
    }

    // 根据缺口类型使用默认标准
    const criteria = DEFAULT_ACCEPTANCE_CRITERIA[gap.type] || DEFAULT_ACCEPTANCE_CRITERIA.missing_module;
    
    this.logger.debug(`Generated ${criteria.length} acceptance criteria for gap type: ${gap.type}`);
    return [...criteria]; // 返回副本
  }

  /**
   * 生成任务标题
   * @param gap - 发现的代码缺口
   * @returns 任务标题
   */
  private generateTitle(gap: Gap): string {
    const moduleName = gap.name;

    switch (gap.type) {
      case 'missing_module':
        return `实现 ${moduleName} 功能模块`;
      case 'missing_api':
        return `添加 ${moduleName} API 接口`;
      case 'incomplete_flow':
        return `完善 ${moduleName} 业务流程`;
      case 'missing_model':
        return `创建 ${moduleName} 数据模型`;
      case 'config_mismatch':
        return `修复 ${moduleName} 配置不一致问题`;
      default:
        return `处理 ${moduleName} 相关问题`;
    }
  }

  /**
   * 生成任务描述
   * @param gap - 发现的代码缺口
   * @returns 任务描述
   */
  private generateDescription(gap: Gap): string {
    const lines: string[] = [
      `## 问题描述`,
      `${gap.description}`,
      ``,
      `## 原因分析`,
      `${gap.reason}`,
      ``,
      `## 建议范围`,
      `${gap.suggestedScope}`
    ];

    if (gap.relatedFiles && gap.relatedFiles.length > 0) {
      lines.push(``, `## 相关文件`,
        ...gap.relatedFiles.map(f => `- ${f}`)
      );
    }

    return lines.join('\n');
  }

  /**
   * 生成需求列表
   * @param gap - 发现的代码缺口
   * @returns 需求列表
   */
  private generateRequirements(gap: Gap): string[] {
    const requirements: string[] = [
      `解决: ${gap.description}`,
      `优先级: ${gap.priority}`
    ];

    switch (gap.type) {
      case 'missing_module':
        requirements.push(
          '实现完整的功能模块',
          '包含必要的 API 和 UI',
          '添加适当的测试覆盖'
        );
        break;
      case 'missing_api':
        requirements.push(
          '实现 RESTful API 接口',
          '添加输入验证和错误处理',
          '编写 API 文档'
        );
        break;
      case 'incomplete_flow':
        requirements.push(
          '补全流程中的所有环节',
          '确保用户体验流畅',
          '处理边界情况'
        );
        break;
      case 'missing_model':
        requirements.push(
          '设计合理的数据结构',
          '实现 CRUD 操作',
          '添加数据验证'
        );
        break;
      case 'config_mismatch':
        requirements.push(
          '修复配置与实际代码的不一致',
          '确保配置正确加载',
          '更新相关文档'
        );
        break;
    }

    return requirements;
  }

  /**
   * 估算工作量
   * @param gap - 发现的代码缺口
   * @returns 工作量估算 (small/medium/large)
   */
  private estimateEffort(gap: Gap): 'small' | 'medium' | 'large' {
    // 基于优先级和类型估算工作量
    const effortMatrix: Record<string, Record<string, 'small' | 'medium' | 'large'>> = {
      missing_module: {
        P0: 'large',
        P1: 'large',
        P2: 'medium'
      },
      missing_api: {
        P0: 'medium',
        P1: 'small',
        P2: 'small'
      },
      incomplete_flow: {
        P0: 'large',
        P1: 'medium',
        P2: 'medium'
      },
      missing_model: {
        P0: 'medium',
        P1: 'small',
        P2: 'small'
      },
      config_mismatch: {
        P0: 'small',
        P1: 'small',
        P2: 'small'
      }
    };

    const typeEffort = effortMatrix[gap.type];
    if (typeEffort) {
      return typeEffort[gap.priority] || 'medium';
    }

    // 默认根据优先级
    switch (gap.priority) {
      case 'P0':
        return 'large';
      case 'P1':
        return 'medium';
      case 'P2':
        return 'small';
      default:
        return 'medium';
    }
  }

  /**
   * 从名称中提取模块名
   * @param name - 缺口名称
   * @returns 模块名或 null
   */
  private extractModuleName(name: string): string | null {
    const lowerName = name.toLowerCase();
    
    for (const module of Object.keys(MODULE_IMPLEMENTATION_STEPS)) {
      if (lowerName.includes(module)) {
        return module;
      }
    }
    
    return null;
  }
}
