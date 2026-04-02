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

export abstract class BaseNode {
  protected logger: Logger;
  protected config: any;
  protected workingDir: string;

  constructor(context: NodeContext) {
    this.logger = context.logger;
    this.config = context.config;
    this.workingDir = context.workingDir;
  }

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
  protected validateState(state: HarnessStateType, requiredFields: string[]): boolean {
    for (const field of requiredFields) {
      if (!(field in state)) {
        this.logger.error(`Missing required field in state: ${field}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Create an error output with the error message
   */
  protected createErrorOutput(error: Error | string): NodeOutput {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`Node ${this.getName()} error: ${errorMessage}`);
    
    return {
      state: {
        errors: [errorMessage]
      }
    };
  }
}
