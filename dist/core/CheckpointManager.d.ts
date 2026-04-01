export interface Checkpoint {
    timestamp: number;
    currentTask: any;
    stats: {
        completed: number;
        failed: number;
        escalated: number;
    };
    queueState: any;
    hasGeneratedInitialTasks?: boolean;
}
export declare class CheckpointManager {
    private logger;
    private checkpointPath;
    constructor();
    save(checkpoint: Checkpoint): Promise<void>;
    load(): Promise<Checkpoint | null>;
}
//# sourceMappingURL=CheckpointManager.d.ts.map