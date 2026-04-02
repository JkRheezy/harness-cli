import { TaskQueue } from '../core/TaskQueue';
import { EvolutionConfig, BusinessContext } from './types';
export interface EvolutionTask {
    id: string;
    title: string;
    description: string;
    requirements: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    category?: string;
    maxDuration: number;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    parentTask?: string;
}
export declare class AutoEvolution {
    private logger;
    private detector;
    private taskQueue;
    private config;
    private iterationCount;
    constructor(config: EvolutionConfig, taskQueue: TaskQueue, projectPath?: string);
    trigger(trigger: 'queue_empty' | 'periodic_check', projectPath: string, context?: BusinessContext): Promise<boolean>;
    private convertToTask;
    private buildTaskDescription;
    private extractRequirements;
    private estimateDuration;
    getStats(): {
        iterationCount: number;
        enabled: boolean;
    };
    /**
     * Set project path for the detector
     */
    setProjectPath(projectPath: string): void;
}
//# sourceMappingURL=AutoEvolution.d.ts.map