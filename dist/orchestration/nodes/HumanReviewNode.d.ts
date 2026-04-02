import { BaseNode, NodeContext, NodeInput, NodeOutput } from './BaseNode';
import { ReviewDecision } from '../../types/orchestration';
export interface HumanReviewInput {
    taskId: string;
    taskTitle: string;
    taskDescription: string;
    result: any;
    timeoutMs?: number;
}
export interface HumanReviewOutput {
    decision: ReviewDecision;
    feedback?: string;
}
export declare class HumanReviewNode extends BaseNode {
    constructor(context: NodeContext);
    getName(): string;
    execute(input: NodeInput): Promise<NodeOutput>;
    /**
     * Interrupt the graph execution and wait for human review
     * This is a placeholder that simulates the interrupt pattern
     */
    private interruptForReview;
    /**
     * Handle resuming from a pending review
     */
    private handlePendingReview;
    /**
     * Submit a review decision from external source (UI, API, etc.)
     * This would be called by an external system when human provides input
     */
    static submitReview(decision: ReviewDecision, feedback?: string): Partial<NodeOutput>;
    /**
     * Check if the review node should wait for human input
     */
    shouldWaitForReview(state: any): boolean;
}
//# sourceMappingURL=HumanReviewNode.d.ts.map