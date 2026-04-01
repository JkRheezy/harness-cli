"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateManager = void 0;
const Logger_1 = require("../utils/Logger");
class StateManager {
    constructor() {
        this.escalations = new Map();
        this.errors = [];
        this.logger = new Logger_1.Logger();
    }
    async saveEscalation(escalation) {
        this.logger.info(`👤 保存升级请求: ${escalation.taskId}`);
        this.escalations.set(escalation.taskId, escalation);
        // 这里可以实现持久化到数据库或文件
        // 例如：写入 JSON 文件、数据库等
    }
    async saveError(record) {
        this.logger.error(`💾 保存错误记录: ${record.error}`);
        this.errors.push(record);
        // 保留最近的100条错误记录
        if (this.errors.length > 100) {
            this.errors = this.errors.slice(-100);
        }
    }
    async close() {
        this.logger.info('🔒 StateManager 已关闭');
    }
}
exports.StateManager = StateManager;
//# sourceMappingURL=StateManager.js.map