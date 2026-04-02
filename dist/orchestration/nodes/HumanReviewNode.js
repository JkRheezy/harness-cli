"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumanReviewNode = void 0;
const BaseNode_1 = require("./BaseNode");
const orchestration_1 = require("../../types/orchestration");
class HumanReviewNode extends BaseNode_1.BaseNode {
    constructor(context) {
        super(context);
    }
    getName() {
        return 'HumanReviewNode';
    }
    async execute(input) {
        const { state } = input;
        this.logger.info(`Executing ${this.getName()}`);
        try {
            // Check if human review is enabled
            if (!state.config?.enableHumanReview) {
                this.logger.info('Human review is disabled, skipping');
                return {
                    state: {
                        reviewDecision: orchestration_1.ReviewDecision.APPROVE
                    }
                };
            }
            // Validate state
            if (!this.validateState(state, ['currentTaskId', 'results'])) {
                return this.createErrorOutput('Invalid state: missing required fields');
            }
            const currentTaskId = state.currentTaskId;
            if (!currentTaskId) {
                this.logger.info('No current task for review');
                return { state: {} };
            }
            // Check if there's already a pending review
            if (state.pendingReview) {
                this.logger.info(`Resuming from pending review for task ${state.pendingReview.taskId}`);
                return this.handlePendingReview(state);
            }
            // Get the task result
            const taskResult = state.results.get(currentTaskId);
            if (!taskResult) {
                return this.createErrorOutput(`No result found for task ${currentTaskId}`);
            }
            // Check if review is needed based on task status
            if (taskResult.status !== orchestration_1.TaskStatus.WAITING_REVIEW && taskResult.status !== orchestration_1.TaskStatus.COMPLETED) {
                this.logger.info(`Task ${currentTaskId} does not require review (status: ${taskResult.status})`);
                return { state: {} };
            }
            // Get task details from tasks array
            const task = state.tasks.find(t => t.id === currentTaskId);
            if (!task) {
                return this.createErrorOutput(`Task not found: ${currentTaskId}`);
            }
            // Create pending review state
            const pendingReview = {
                taskId: currentTaskId,
                task,
                result: taskResult,
                submittedAt: Date.now()
            };
            this.logger.info(`Created pending review for task ${currentTaskId}`);
            // Interrupt the graph execution here
            // In a real implementation, this would use LangGraph's interrupt mechanism
            // or external notification system
            return this.interruptForReview(state, pendingReview);
        }
        catch (error) {
            return this.createErrorOutput(error);
        }
    }
    /**
     * Interrupt the graph execution and wait for human review
     * This is a placeholder that simulates the interrupt pattern
     */
    interruptForReview(state, pendingReview) {
        this.logger.info(`Interrupting for human review of task ${pendingReview.taskId}`);
        // In a real implementation with LangGraph:
        // throw new Interrupt({
        //   value: pendingReview,
        //   resume: ReviewDecision
        // });
        // For now, return the pending review state
        // The graph should handle this and pause execution
        return {
            state: {
                pendingReview
            }
        };
    }
    /**
     * Handle resuming from a pending review
     */
    handlePendingReview(state) {
        const pendingReview = state.pendingReview;
        // Check for timeout
        const reviewTimeoutMs = state.config?.reviewTimeoutMs || 300000;
        const elapsed = Date.now() - pendingReview.submittedAt;
        if (elapsed > reviewTimeoutMs) {
            this.logger.warn(`Review timeout for task ${pendingReview.taskId}`);
            // Auto-approve on timeout or reject based on configuration
            return {
                state: {
                    pendingReview: null,
                    reviewDecision: orchestration_1.ReviewDecision.APPROVE, // Could be configured to reject instead
                    errors: [`Review timeout for task ${pendingReview.taskId}`]
                }
            };
        }
        // If there's already a review decision, clear pending review and return
        if (state.reviewDecision) {
            this.logger.info(`Review decision received: ${state.reviewDecision}`);
            return {
                state: {
                    pendingReview: null
                }
            };
        }
        // Still waiting for review
        this.logger.info('Still waiting for human review');
        return { state: {} };
    }
    /**
     * Submit a review decision from external source (UI, API, etc.)
     * This would be called by an external system when human provides input
     */
    static submitReview(decision, feedback) {
        return {
            state: {
                reviewDecision: decision,
                pendingReview: null
            }
        };
    }
    /**
     * Check if the review node should wait for human input
     */
    shouldWaitForReview(state) {
        if (!state.config?.enableHumanReview) {
            return false;
        }
        // If there's a pending review without a decision, we should wait
        if (state.pendingReview && !state.reviewDecision) {
            // Check timeout
            const reviewTimeoutMs = state.config?.reviewTimeoutMs || 300000;
            const elapsed = Date.now() - state.pendingReview.submittedAt;
            return elapsed <= reviewTimeoutMs;
        }
        return false;
    }
}
exports.HumanReviewNode = HumanReviewNode;
//# sourceMappingURL=HumanReviewNode.js.map