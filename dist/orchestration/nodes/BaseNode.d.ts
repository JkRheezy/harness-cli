import { HarnessStateType } from '../graph/state';
import { Task } from '../../core/TaskQueue';
import { Logger } from '../../utils/Logger';
export interface NodeContext {
    logger: Logger;
    workingDir: string;
    config: any;
}
export interface NodeInput {
    state: HarnessStateType;
    task?: Task;
}
export interface NodeOutput {
    state: Partial<HarnessStateType>;
}
export declare abstract class BaseNode {
    protected logger: Logger;
    protected config: any;
    protected workingDir: string;
    constructor(context: NodeContext);
    /**
     * Execute the node with the given input state
     * @param input The current state and optional task
     * @returns Partial state updates
     */
    abstract execute(input: NodeInput): Promise<NodeOutput>;
    /**
     * Get the node name for logging and debugging
     */
    abstract getName(): string;
    /**
     * Validate that required fields are present in the state
     */
    protected validateState(state: HarnessStateType, requiredFields: string[]): boolean;
    /**
     * Create an error output with the error message
     */
    protected createErrorOutput(error: Error | string): NodeOutput;
}
//# sourceMappingURL=BaseNode.d.ts.map