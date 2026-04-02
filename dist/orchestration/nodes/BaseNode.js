"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseNode = void 0;
class BaseNode {
    constructor(context) {
        this.logger = context.logger;
        this.config = context.config;
        this.workingDir = context.workingDir;
    }
    /**
     * Validate that required fields are present in the state
     */
    validateState(state, requiredFields) {
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
    createErrorOutput(error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Node ${this.getName()} error: ${errorMessage}`);
        return {
            state: {
                errors: [errorMessage]
            }
        };
    }
}
exports.BaseNode = BaseNode;
//# sourceMappingURL=BaseNode.js.map