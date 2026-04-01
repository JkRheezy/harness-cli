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
export declare class TaskQueue {
    private queue;
    private activeTasks;
    private logger;
    constructor();
    enqueue(task: Task): Promise<void>;
    dequeue(options?: DequeueOptions): Promise<Task | null>;
    update(task: Task): Promise<void>;
    getPendingCount(): Promise<number>;
    getActiveCount(): Promise<number>;
    getState(): Promise<any>;
    restoreState(state: any): Promise<void>;
    close(): Promise<void>;
    private sortByPriority;
}
//# sourceMappingURL=TaskQueue.d.ts.map