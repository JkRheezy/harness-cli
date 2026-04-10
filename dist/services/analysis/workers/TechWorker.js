"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TechWorker = void 0;
const BaseWorker_1 = require("./BaseWorker");
class TechWorker extends BaseWorker_1.BaseWorker {
    constructor() {
        super(...arguments);
        this.workerType = 'tech';
        this.roleDescription = `你是一名技术架构师，专注于技术选型、架构设计和项目结构规划。

你的专业领域包括：
- 技术栈评估和选型
- 系统架构设计
- 项目目录结构规划
- 开发工具和部署方案`;
        this.researchScope = 'tech_stack_architecture';
    }
    getTaskDescription() {
        return `1. **技术栈分析**
   - 后端技术推荐（语言、框架、库）
   - 前端技术推荐（如适用）
   - 数据库选择
   - 其他必要技术（缓存、消息队列等）

2. **架构建议**
   - 推荐的架构模式
   - 关键设计决策
   - 可扩展性考虑

3. **目录结构设计**
   - 项目整体结构
   - 主要模块划分
   - 文件组织建议

4. **开发注意事项**
   - 关键技术要点
   - 潜在技术挑战

请根据项目模板类型和业务需求，提供实用的技术建议。`;
    }
}
exports.TechWorker = TechWorker;
//# sourceMappingURL=TechWorker.js.map