import { TelemetryProvider } from '../types';
/**
 * Collects metrics for the Harness execution loop.
 * Tracks task execution, queue depth, safety checks, and checkpoint operations.
 */
export declare class LoopMetricsCollector {
    private telemetry;
    constructor(telemetry: TelemetryProvider);
    /**
     * Record that a task has started execution.
     * @param taskType - Type/category of the task
     * @param taskId - Unique identifier for the task instance
     */
    recordTaskStart(taskType: string, taskId: string): void;
    /**
     * Record task completion with duration and success status.
     * @param taskType - Type/category of the task
     * @param taskId - Unique identifier for the task instance
     * @param durationMs - Execution duration in milliseconds
     * @param success - Whether the task completed successfully
     */
    recordTaskComplete(taskType: string, taskId: string, durationMs: number, success: boolean): void;
    /**
     * Record current queue depth.
     * @param depth - Number of tasks waiting in queue
     */
    recordQueueDepth(depth: number): void;
    /**
     * Record that a safety check was triggered.
     * @param reason - Reason the safety check was triggered
     */
    recordSafetyCheckTriggered(reason: string): void;
    /**
     * Record checkpoint save duration.
     * @param durationMs - Time to save checkpoint in milliseconds
     */
    recordCheckpointSave(durationMs: number): void;
    /**
     * Start a tracing span for task execution.
     * @param taskType - Type of task being executed
     * @param taskTitle - Human-readable task title
     * @returns Span object for tracing
     */
    startTaskSpan(taskType: string, taskTitle: string): import("../types").Span;
}
//# sourceMappingURL=LoopMetricsCollector.d.ts.map