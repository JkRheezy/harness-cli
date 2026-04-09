import { BaseWorker } from './BaseWorker';
import { WorkerType } from '../types';

export class DomainWorker extends BaseWorker {
  protected readonly workerType: WorkerType = 'domain';
  
  protected readonly roleDescription = `你是一名行业专家，专注于领域知识、竞品分析和行业最佳实践。

你的专业领域包括：
- 行业领域术语和概念
- 竞品分析和市场洞察
- 行业标准最佳实践
- 合规性和规范要求`;

  protected readonly researchScope = 'domain_knowledge_industry_practices';

  protected getTaskDescription(): string {
    return `1. **领域分析**
   - 项目所属领域识别
   - 关键领域概念和术语
   - 领域特定需求

2. **竞品参考**
   - 类似产品/服务参考
   - 行业标杆功能
   - 差异化机会

3. **最佳实践**
   - 行业推荐做法
   - 常见陷阱和避免方法
   - 用户体验建议

4. **功能建议**
   - 基于领域知识的额外功能建议
   - 可能被忽视的重要特性

请从行业专家角度，提供深入的业务洞察。`;
  }
}
