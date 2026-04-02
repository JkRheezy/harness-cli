"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentExecutorNode = void 0;
const BaseNode_1 = require("./BaseNode");
const orchestration_1 = require("../../types/orchestration");
class AgentExecutorNode extends BaseNode_1.BaseNode {
    constructor(context) {
        super(context);
    }
    getName() {
        return 'AgentExecutorNode';
    }
    async execute(input) {
        const { state } = input;
        this.logger.info(`Executing ${this.getName()}`);
        try {
            // Validate state
            if (!this.validateState(state, ['tasks', 'currentTaskId'])) {
                return this.createErrorOutput('Invalid state: missing required fields');
            }
            // Get the current task
            const currentTaskId = state.currentTaskId;
            if (!currentTaskId) {
                this.logger.info('No current task to execute');
                return { state: {} };
            }
            const task = state.tasks.find(t => t.id === currentTaskId);
            if (!task) {
                return this.createErrorOutput(`Task not found: ${currentTaskId}`);
            }
            // Execute the task
            const startTime = Date.now();
            const executionResult = await this.executeTask(task, state);
            const duration = Date.now() - startTime;
            // Create task result
            const taskResult = {
                taskId: currentTaskId,
                status: executionResult.success ? orchestration_1.TaskStatus.COMPLETED : orchestration_1.TaskStatus.FAILED,
                output: executionResult.output,
                error: executionResult.error,
                duration,
                hasChanges: executionResult.hasChanges
            };
            // Update results map
            const newResults = new Map(state.results);
            newResults.set(currentTaskId, taskResult);
            this.logger.info(`Task ${currentTaskId} execution completed: ${taskResult.status}`);
            return {
                state: {
                    results: newResults
                }
            };
        }
        catch (error) {
            return this.createErrorOutput(error);
        }
    }
    /**
     * Execute a single task
     * This is a placeholder implementation that should be overridden by subclasses
     * or integrated with actual agent execution logic
     */
    async executeTask(task, state) {
        this.logger.info(`Executing task: ${task.title}`);
        try {
            // Simulate task execution
            // In a real implementation, this would:
            // 1. Invoke the appropriate agent
            // 2. Execute the task logic
            // 3. Return the result
            // Placeholder: Mark as successful with no changes
            return {
                success: true,
                output: { message: `Task ${task.id} executed successfully` },
                hasChanges: false
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Task execution failed: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
                hasChanges: false
            };
        }
    }
    /**
     * Check if the task requires human review based on config
     */
    shouldRequestReview(task, state) {
        return state.config?.enableHumanReview ?? false;
    }
}
exports.AgentExecutorNode = AgentExecutorNode;
//# sourceMappingURL=AgentExecutorNode.js.map