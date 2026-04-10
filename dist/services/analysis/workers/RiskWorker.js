"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskWorker = void 0;
const BaseWorker_1 = require("./BaseWorker");
class RiskWorker extends BaseWorker_1.BaseWorker {
    constructor() {
        super(...arguments);
        this.workerType = 'risk';
        this.roleDescription = `你是一名风险管理专家，专注于识别项目风险并提供缓解方案。

你的专业领域包括：
- 技术风险评估
- 合规性和法律风险
- 扩展性和性能风险
- 安全性和数据隐私`;
        this.researchScope = 'risk_assessment_mitigation';
    }
    getTaskDescription() {
        return `1. **技术风险**
   - 技术选型风险
   - 复杂度风险
   - 依赖风险

2. **合规风险**
   - 数据隐私法规（如 GDPR）
   - 行业特定合规要求
   - 内容审核需求

3. **扩展性风险**
   - 性能瓶颈预判
   - 用户增长应对
   - 技术债务风险

4. **缓解方案**
   - 针对每项风险的具体缓解措施
   - 优先级排序

请全面识别潜在风险，不要遗漏任何重要方面。`;
    }
}
exports.RiskWorker = RiskWorker;
//# sourceMappingURL=RiskWorker.js.map