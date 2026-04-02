"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABTestNode = void 0;
const BaseNode_1 = require("./BaseNode");
const orchestration_1 = require("../../types/orchestration");
class ABTestNode extends BaseNode_1.BaseNode {
    constructor(context) {
        super(context);
    }
    getName() {
        return 'ABTestNode';
    }
    async execute(input) {
        const { state } = input;
        this.logger.info(`Executing ${this.getName()}`);
        try {
            // Check if A/B testing is enabled
            if (!state.config.enableABTesting) {
                this.logger.info('A/B testing is disabled');
                return { state: { abTestVariant: null } };
            }
            // Validate state
            if (!this.validateState(state, ['tasks', 'currentTaskId'])) {
                return this.createErrorOutput('Invalid state: missing required fields');
            }
            // Route to variant
            const routeResult = await this.route(state);
            // Get the current task
            const currentTaskId = state.currentTaskId;
            if (!currentTaskId) {
                this.logger.info('No current task for A/B testing');
                return { state: { abTestVariant: null } };
            }
            const task = state.tasks.find(t => t.id === currentTaskId);
            if (!task) {
                return this.createErrorOutput(`Task not found: ${currentTaskId}`);
            }
            // Execute based on variant
            const variant = routeResult.abTestVariant;
            this.logger.info(`A/B test variant selected: ${variant}`);
            let executionResult;
            if (variant === 'A') {
                executionResult = await this.executeVariantA(state, task);
            }
            else {
                executionResult = await this.executeVariantB(state, task);
            }
            return {
                state: {
                    abTestVariant: variant,
                    ...executionResult
                }
            };
        }
        catch (error) {
            return this.createErrorOutput(error);
        }
    }
    /**
     * Route the task to variant A or B based on task ID hash
     */
    async route(state) {
        if (!state.config.enableABTesting) {
            return { abTestVariant: null };
        }
        const taskId = state.currentTaskId || '';
        const variant = this.simpleHash(taskId) % 2 === 0 ? 'A' : 'B';
        return { abTestVariant: variant };
    }
    /**
     * Execute with variant A config (lower temperature for more deterministic results)
     */
    async executeVariantA(state, task) {
        this.logger.info(`Executing variant A for task: ${task.id}`);
        const startTime = Date.now();
        try {
            // Simulate execution with lower temperature config
            const result = {
                taskId: task.id,
                status: orchestration_1.TaskStatus.COMPLETED,
                output: {
                    variant: 'A',
                    config: { temperature: 0.2 },
                    message: `Task ${task.id} executed with variant A (deterministic)`
                },
                duration: Date.now() - startTime,
                hasChanges: false
            };
            // Store in abTestResults
            const newAbTestResults = new Map(state.abTestResults);
            newAbTestResults.set(task.id, result);
            return { abTestResults: newAbTestResults };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Variant A execution failed: ${errorMessage}`);
            const result = {
                taskId: task.id,
                status: orchestration_1.TaskStatus.FAILED,
                error: errorMessage,
                duration: Date.now() - startTime,
                hasChanges: false
            };
            const newAbTestResults = new Map(state.abTestResults);
            newAbTestResults.set(task.id, result);
            return { abTestResults: newAbTestResults };
        }
    }
    /**
     * Execute with variant B config (higher temperature for more creative results)
     */
    async executeVariantB(state, task) {
        this.logger.info(`Executing variant B for task: ${task.id}`);
        const startTime = Date.now();
        try {
            // Simulate execution with higher temperature config
            const result = {
                taskId: task.id,
                status: orchestration_1.TaskStatus.COMPLETED,
                output: {
                    variant: 'B',
                    config: { temperature: 0.8 },
                    message: `Task ${task.id} executed with variant B (creative)`
                },
                duration: Date.now() - startTime,
                hasChanges: false
            };
            // Store in abTestResults
            const newAbTestResults = new Map(state.abTestResults);
            newAbTestResults.set(task.id, result);
            return { abTestResults: newAbTestResults };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Variant B execution failed: ${errorMessage}`);
            const result = {
                taskId: task.id,
                status: orchestration_1.TaskStatus.FAILED,
                error: errorMessage,
                duration: Date.now() - startTime,
                hasChanges: false
            };
            const newAbTestResults = new Map(state.abTestResults);
            newAbTestResults.set(task.id, result);
            return { abTestResults: newAbTestResults };
        }
    }
    /**
     * Simple hash function for deterministic variant assignment
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
    /**
     * Compare results from both variants for analysis
     */
    compareVariants(state) {
        const results = state.abTestResults;
        if (!results || results.size === 0) {
            return null;
        }
        let variantA = null;
        let variantB = null;
        for (const [, result] of results) {
            if (result.output?.variant === 'A') {
                variantA = result;
            }
            else if (result.output?.variant === 'B') {
                variantB = result;
            }
        }
        if (!variantA && !variantB) {
            return null;
        }
        let comparison = '';
        if (variantA && variantB) {
            const durationDiff = variantB.duration - variantA.duration;
            comparison = `Variant A: ${variantA.duration}ms, Variant B: ${variantB.duration}ms (diff: ${durationDiff}ms)`;
        }
        else if (variantA) {
            comparison = 'Only variant A result available';
        }
        else {
            comparison = 'Only variant B result available';
        }
        return { variantA, variantB, comparison };
    }
}
exports.ABTestNode = ABTestNode;
//# sourceMappingURL=ABTestNode.js.map