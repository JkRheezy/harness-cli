export interface Escalation {
    taskId: string;
    taskTitle: string;
    error: string;
    attempts: number;
    timestamp: Date;
    logs: string[];
}
export interface ErrorRecord {
    error: string;
    stack?: string;
    timestamp: Date;
}
export declare class StateManager {
    private logger;
    private escalations;
    private errors;
    constructor();
    saveEscalation(escalation: Escalation): Promise<void>;
    saveError(record: ErrorRecord): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=StateManager.d.ts.map