import { TelemetryProvider, Tags } from '../types';

export interface LoopMetrics {
  taskCount: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  queueDepth: number;
}

export class LoopMetricsCollector {
  constructor(private telemetry: TelemetryProvider) {}

  recordTaskStart(taskType: string, taskId: string): void {
    this.telemetry.counter('loop.task.started', 1, {
      taskType,
      taskId
    });
  }

  recordTaskComplete(taskType: string, taskId: string, durationMs: number, success: boolean): void {
    this.telemetry.timer('loop.task.duration', durationMs, {
      taskType,
      taskId,
      status: success ? 'success' : 'failure'
    });

    if (success) {
      this.telemetry.counter('loop.task.success', 1, { taskType });
    } else {
      this.telemetry.counter('loop.task.failure', 1, { taskType });
    }
  }

  recordQueueDepth(depth: number): void {
    this.telemetry.gauge('loop.queue.depth', depth);
  }

  recordSafetyCheckTriggered(reason: string): void {
    this.telemetry.counter('loop.safety.check.triggered', 1, { reason });
  }

  recordCheckpointSave(durationMs: number): void {
    this.telemetry.timer('loop.checkpoint.save.duration', durationMs);
  }

  startTaskSpan(taskType: string, taskTitle: string) {
    return this.telemetry.startSpan('loop.task.execution', {
      traceId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      spanId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
  }
}
