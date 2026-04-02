import { Logger } from '../utils/Logger';

export interface Task {
  id: string;
  title: string;
  description: string;
  requirements?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'escalated';
  maxDuration: number;
  retryCount?: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
}

export interface DequeueOptions {
  timeout?: number;
  filter?: (task: Task) => boolean;
}

export class TaskQueue {
  private queue: Task[] = [];
  private activeTasks: Map<string, Task> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  async enqueue(task: Task): Promise<void> {
    this.queue.push(task);
    this.logger.info(`📥 任务已加入队列: ${task.title} (${this.queue.length} 个待处理)`);
  }

  async dequeue(options: DequeueOptions = {}): Promise<Task | null> {
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

  async update(task: Task): Promise<void> {
    if (task.status === 'completed' || task.status === 'failed' || task.status === 'escalated') {
      this.activeTasks.delete(task.id);
    } else {
      this.activeTasks.set(task.id, task);
    }
  }

  async getPendingCount(): Promise<number> {
    return this.queue.length;
  }

  async getActiveCount(): Promise<number> {
    return this.activeTasks.size;
  }

  async getState(): Promise<any> {
    return {
      queue: this.queue,
      activeTasks: Array.from(this.activeTasks.values())
    };
  }

  async restoreState(state: any): Promise<void> {
    if (state.queue) {
      this.queue = state.queue;
    }
    if (state.activeTasks) {
      this.activeTasks = new Map(state.activeTasks.map((t: Task) => [t.id, t]));
    }
  }

  async close(): Promise<void> {
    this.queue = [];
    this.activeTasks.clear();
  }

  private sortByPriority(): void {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    this.queue.sort((a, b) => {
      // 首先按优先级排序
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // 然后按创建时间排序（先创建的先处理）
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });
  }
}
