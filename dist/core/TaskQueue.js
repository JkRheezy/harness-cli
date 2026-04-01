"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskQueue = void 0;
const Logger_1 = require("../utils/Logger");
class TaskQueue {
    constructor() {
        this.queue = [];
        this.activeTasks = new Map();
        this.logger = new Logger_1.Logger();
    }
    async enqueue(task) {
        this.queue.push(task);
        this.logger.info(`📥 任务已加入队列: ${task.title} (${this.queue.length} 个待处理)`);
    }
    async dequeue(options = {}) {
        // 按优先级排序
        this.sortByPriority();
        // 找到符合条件的任务
        const index = this.queue.findIndex(task => {
            if (options.filter) {
                return options.filter(task);
            }
            return true;
        });
        if (index === -1) {
            return null;
        }
        // 移除并返回任务
        const task = this.queue.splice(index, 1)[0];
        this.activeTasks.set(task.id, task);
        this.logger.info(`📤 任务已取出: ${task.title} (${this.queue.length} 个待处理)`);
        return task;
    }
    async update(task) {
        if (task.status === 'completed' || task.status === 'failed' || task.status === 'escalated') {
            this.activeTasks.delete(task.id);
        }
        else {
            this.activeTasks.set(task.id, task);
        }
    }
    async getPendingCount() {
        return this.queue.length;
    }
    async getActiveCount() {
        return this.activeTasks.size;
    }
    async getState() {
        return {
            queue: this.queue,
            activeTasks: Array.from(this.activeTasks.values())
        };
    }
    async restoreState(state) {
        if (state.queue) {
            this.queue = state.queue;
        }
        if (state.activeTasks) {
            this.activeTasks = new Map(state.activeTasks.map((t) => [t.id, t]));
        }
    }
    async close() {
        this.queue = [];
        this.activeTasks.clear();
    }
    sortByPriority() {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        this.queue.sort((a, b) => {
            // 首先按优先级排序
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0)
                return priorityDiff;
            // 然后按创建时间排序（先创建的先处理）
            return a.createdAt.getTime() - b.createdAt.getTime();
        });
    }
}
exports.TaskQueue = TaskQueue;
//# sourceMappingURL=TaskQueue.js.map