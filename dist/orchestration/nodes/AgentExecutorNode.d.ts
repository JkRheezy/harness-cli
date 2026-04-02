import { BaseNode, NodeContext, NodeInput, NodeOutput } from './BaseNode';
export interface AgentExecutionResult {
    success: boolean;
    output?: any;
    error?: string;
    hasChanges: boolean;
}
export declare class AgentExecutorNode extends BaseNode {
    constructor(context: NodeContext);
    getName(): string;
    execute(input: NodeInput): Promise<NodeOutput>;
    /**
     * Execute a single task
     * This is a placeholder implementation that should be overridden by subclasses
     * or integrated with actual agent execution logic
     */
    private executeTask;
    /**
     * Check if the task requires human review based on config
     */
    private shouldRequestReview;
}
//# sourceMappingURL=AgentExecutorNode.d.ts.map