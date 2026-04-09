import { BaseWorker } from './BaseWorker';
import { WorkerType } from '../types';

export class BusinessWorker extends BaseWorker {
  protected readonly workerType: WorkerType = 'business';
  
  protected readonly roleDescription = `你是一名资深业务分析师，专注于从商业角度分析项目需求。

你的专业领域包括：
- 目标用户分析和用户画像
- 商业模式识别和价值主张
- 核心场景和使用流程
- 功能需求提取和优先级排序`;

  protected readonly researchScope = 'business_model_user_analysis';

  protected getTaskDescription(): string {
    return `1. **目标用户分析**
   - 识别主要用户群体
   - 分析用户需求和痛点
   - 描述用户画像

2. **商业模式分析**
   - 项目的核心价值主张
   - 收入来源/盈利模式（如适用）
   - 竞争优势

3. **核心场景识别**
   - 主要使用场景
   - 用户旅程关键节点

4. **功能需求提取**
   - 列出必须实现的核心功能
   - 按重要性标记优先级

请基于项目概述，深入分析业务层面，提供有洞察力的发现。`;
  }
}
