import { BusinessAnalysis } from '../../commands/types';
import { VerificationResult } from './types';

/**
 * 验证器 - 验证 BusinessAnalysis 的完整性和质量
 */
export class Verifier {
  private readonly minConfidence = 0.8;

  /**
   * 验证 BusinessAnalysis
   */
  verify(analysis: BusinessAnalysis): VerificationResult {
    const issues: string[] = [];
    let score = 0;
    let totalChecks = 5;

    // 检查必需字段 - businessDescription 长度 >= 50
    if (!analysis.businessDescription || analysis.businessDescription.length < 50) {
      issues.push(`业务描述过短: 当前 ${analysis.businessDescription?.length || 0} 字符，需要至少 50 字符`);
    } else {
      score++;
    }

    // 检查必需字段 - coreFeatures 数量 >= 3
    if (!analysis.coreFeatures || analysis.coreFeatures.length < 3) {
      issues.push(`核心功能数量不足: 当前 ${analysis.coreFeatures?.length || 0} 个，需要至少 3 个`);
    } else {
      score++;
    }

    // 检查必需字段 - techStack 完整
    const techStackValid = this.validateTechStack(analysis.techStack);
    if (!techStackValid.valid) {
      issues.push(`技术栈不完整: ${techStackValid.missingFields.join(', ')}`);
    } else {
      score++;
    }

    // 检查必需字段 - directoryStructure 长度 >= 20
    const dirStructureCount = this.countDirectoryNodes(analysis.directoryStructure);
    if (dirStructureCount < 20) {
      issues.push(`目录结构节点数不足: 当前 ${dirStructureCount} 个，需要至少 20 个`);
    } else {
      score++;
    }

    // 检查必需字段 - initialTasks 数量 >= 3
    if (!analysis.initialTasks || analysis.initialTasks.length < 3) {
      issues.push(`初始任务数量不足: 当前 ${analysis.initialTasks?.length || 0} 个，需要至少 3 个`);
    } else {
      score++;
    }

    // 计算置信度
    const confidence = score / totalChecks;

    return {
      valid: issues.length === 0 && confidence >= this.minConfidence,
      issues,
      confidence
    };
  }

  /**
   * 验证技术栈的完整性
   */
  private validateTechStack(techStack: BusinessAnalysis['techStack']): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    if (!techStack) {
      return { valid: false, missingFields: ['techStack 对象缺失'] };
    }

    // backend 是必需字段
    if (!techStack.backend || techStack.backend.trim() === '') {
      missingFields.push('backend');
    }

    // database 是必需字段
    if (!techStack.database || techStack.database.trim() === '') {
      missingFields.push('database');
    }

    // other 是必需字段（可以为空数组，但不能缺失）
    if (!Array.isArray(techStack.other)) {
      missingFields.push('other');
    }

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * 递归计算目录结构节点总数
   */
  private countDirectoryNodes(nodes: BusinessAnalysis['directoryStructure']): number {
    if (!Array.isArray(nodes)) {
      return 0;
    }

    let count = 0;
    for (const node of nodes) {
      count++; // 当前节点
      if (node.children && node.children.length > 0) {
        count += this.countDirectoryNodes(node.children); // 递归计算子节点
      }
    }
    return count;
  }

  /**
   * 生成反馈 Prompt 用于重新生成
   */
  generateFeedback(analysis: BusinessAnalysis, verification: VerificationResult): string {
    if (verification.valid) {
      return '验证通过，无需修改。';
    }

    const lines: string[] = [
      '## 验证反馈',
      '',
      `当前置信度: ${(verification.confidence * 100).toFixed(1)}%，低于要求的 ${(this.minConfidence * 100).toFixed(0)}%`,
      '',
      '### 发现的问题',
      ''
    ];

    for (const issue of verification.issues) {
      lines.push(`- ${issue}`);
    }

    lines.push('');
    lines.push('### 当前数据概览');
    lines.push('');
    lines.push(`- 项目名称: ${analysis.projectName || '未设置'}`);
    lines.push(`- 业务描述长度: ${analysis.businessDescription?.length || 0} 字符`);
    lines.push(`- 核心功能数量: ${analysis.coreFeatures?.length || 0} 个`);
    lines.push(`- 目录结构节点数: ${this.countDirectoryNodes(analysis.directoryStructure)} 个`);
    lines.push(`- 初始任务数量: ${analysis.initialTasks?.length || 0} 个`);
    lines.push('');
    lines.push('### 请根据以上问题进行修正并重新生成：');
    lines.push('');
    lines.push('1. 扩充业务描述，确保详细说明项目目标和范围（至少 50 字符）');
    lines.push('2. 补充核心功能列表，至少包含 3 个主要功能');
    lines.push('3. 完善技术栈信息，确保包含 backend、database 和 other 字段');
    lines.push('4. 细化目录结构，确保包含足够的文件和文件夹（至少 20 个节点）');
    lines.push('5. 增加初始任务数量，至少包含 3 个可执行的任务');

    return lines.join('\n');
  }
}
