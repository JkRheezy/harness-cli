"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoopMetricsCollector = void 0;
const crypto_1 = require("crypto");
/**
 * Collects metrics for the Harness execution loop.
 * Tracks task execution, queue depth, safety checks, and checkpoint operations.
 */
class LoopMetricsCollector {
    constructor(telemetry) {
        this.telemetry = telemetry;
    }
    /**
     * Record that a task has started execution.
     * @param taskType - Type/category of the task
     * @param taskId - Unique identifier for the task instance
     */
    recordTaskStart(taskType, taskId) {
        this.telemetry.counter('loop.task.started', 1, {
            taskType,
            taskId
        });
    }
    /**
     * Record task completion with duration and success status.
     * @param taskType - Type/category of the task
     * @param taskId - Unique identifier for the task instance
     * @param durationMs - Execution duration in milliseconds
     * @param success - Whether the task completed successfully
     */
    recordTaskComplete(taskType, taskId, durationMs, success) {
        this.telemetry.timer('loop.task.duration', durationMs, {
            taskType,
            taskId,
            status: success ? 'success' : 'failure'
        });
        if (success) {
            this.telemetry.counter('loop.task.success', 1, { taskType, taskId });
        }
        else {
            this.telemetry.counter('loop.task.failure', 1, { taskType, taskId });
        }
    }
    /**
     * Record current queue depth.
     * @param depth - Number of tasks waiting in queue
     */
    recordQueueDepth(depth) {
        this.telemetry.gauge('loop.queue.depth', depth);
    }
    /**
     * Record that a safety check was triggered.
     * @param reason - Reason the safety check was triggered
     */
    recordSafetyCheckTriggered(reason) {
        this.telemetry.counter('loop.safety.check.triggered', 1, { reason });
    }
    /**
     * Record checkpoint save duration.
     * @param durationMs - Time to save checkpoint in milliseconds
     */
    recordCheckpointSave(durationMs) {
        this.telemetry.timer('loop.checkpoint.save.duration', durationMs);
    }
    /**
     * Start a tracing span for task execution.
     * @param taskType - Type of task being executed
     * @param taskTitle - Human-readable task title
     * @returns Span object for tracing
     */
    startTaskSpan(taskType, taskTitle) {
        const traceId = (0, crypto_1.randomUUID)();
        const spanId = (0, crypto_1.randomUUID)();
        return this.telemetry.startSpan('loop.task.execution', { traceId, spanId });
    }
}
exports.LoopMetricsCollector = LoopMetricsCollector;
//# sourceMappingURL=LoopMetricsCollector.js.map