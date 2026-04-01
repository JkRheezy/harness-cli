export interface Task {
    id: string;
    title: string;
    description: string;
    requirements: string[];
    priority: 'low' | 'medium' | 'high';
    maxDuration: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    createdAt: Date;
    retryCount?: number;
}
export interface SubmitResult {
    taskId: string;
    status: 'queued' | 'failed';
    estimatedStart?: Date;
}
export declare class TaskSubmitter {
    private logger;
    constructor();
    submit(task: Task): Promise<SubmitResult>;
}
//# sourceMappingURL=TaskSubmitter.d.ts.map