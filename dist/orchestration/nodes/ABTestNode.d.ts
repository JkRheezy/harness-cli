import { BaseNode, NodeContext, NodeInput, NodeOutput } from './BaseNode';
import { HarnessStateType } from '../graph/state';
import { Task } from '../../core/TaskQueue';
import { TaskResult } from '../../types/orchestration';
export interface ABTestResult {
    variant: 'A' | 'B';
    result: TaskResult;
    metrics: {
        duration: number;
        qualityScore?: number;
    };
}
export declare class ABTestNode extends BaseNode {
    constructor(context: NodeContext);
    getName(): string;
    execute(input: NodeInput): Promise<NodeOutput>;
    /**
     * Route the task to variant A or B based on task ID hash
     */
    route(state: HarnessStateType): Promise<Partial<HarnessStateType>>;
    /**
     * Execute with variant A config (lower temperature for more deterministic results)
     */
    executeVariantA(state: HarnessStateType, task: Task): Promise<Partial<HarnessStateType>>;
    /**
     * Execute with variant B config (higher temperature for more creative results)
     */
    executeVariantB(state: HarnessStateType, task: Task): Promise<Partial<HarnessStateType>>;
    /**
     * Simple hash function for deterministic variant assignment
     */
    private simpleHash;
    /**
     * Compare results from both variants for analysis
     */
    compareVariants(state: HarnessStateType): {
        variantA: TaskResult | null;
        variantB: TaskResult | null;
        comparison: string;
    } | null;
}
//# sourceMappingURL=ABTestNode.d.ts.map