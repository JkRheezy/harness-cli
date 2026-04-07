"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorClassifier = void 0;
const types_1 = require("./types");
/**
 * Classifies errors to determine optimal healing strategy
 * Uses pattern matching for fast classification
 */
class ErrorClassifier {
    /**
     * Classify an error to determine healing strategy
     */
    classify(error) {
        const errorString = typeof error === 'string'
            ? error
            : `${error.message}\n${error.stack || ''}`;
        // Try pattern matching first (fast path)
        for (const { category, level, patterns } of ErrorClassifier.patterns) {
            for (const pattern of patterns) {
                if (pattern.test(errorString)) {
                    return {
                        category,
                        severity: this.inferSeverity(category),
                        suggestedStrategy: level,
                        knownPattern: true,
                        context: this.extractContext(category, errorString)
                    };
                }
            }
        }
        // Unknown error - use LLM
        return {
            category: types_1.ErrorCategory.UNKNOWN,
            severity: 'warning',
            suggestedStrategy: types_1.HealingLevel.LLM,
            knownPattern: false,
            context: {}
        };
    }
    /**
     * Check if error is likely fixable at code level
     */
    isCodeLevelFixable(error) {
        const classification = this.classify(error);
        return classification.suggestedStrategy === types_1.HealingLevel.CODE;
    }
    /**
     * Infer severity from category
     */
    inferSeverity(category) {
        switch (category) {
            case types_1.ErrorCategory.CONFIG_MISSING:
            case types_1.ErrorCategory.DEPENDENCY_MISSING:
            case types_1.ErrorCategory.COMMAND_NOT_FOUND:
                return 'blocking';
            case types_1.ErrorCategory.LINT_ERROR:
                return 'warning';
            case types_1.ErrorCategory.TIMEOUT:
                return 'info';
            default:
                return 'blocking';
        }
    }
    /**
     * Extract relevant context from error
     */
    extractContext(category, error) {
        const context = {};
        switch (category) {
            case types_1.ErrorCategory.CONFIG_MISSING:
                const configMatch = error.match(/(['"]?)([\w.-]+\.(json|js|ts|yaml|yml))\1/);
                if (configMatch) {
                    context.missingConfig = configMatch[2];
                }
                break;
            case types_1.ErrorCategory.DEPENDENCY_MISSING:
                const moduleMatch = error.match(/cannot find module ['"]([^'"]+)['"]/i);
                if (moduleMatch) {
                    context.missingModule = moduleMatch[1];
                }
                break;
            case types_1.ErrorCategory.COMMAND_NOT_FOUND:
                const cmdMatch = error.match(/command not found:\s*(\w+)/i);
                if (cmdMatch) {
                    context.missingCommand = cmdMatch[1];
                }
                break;
        }
        return context;
    }
}
exports.ErrorClassifier = ErrorClassifier;
/**
 * Known error patterns and their categories
 */
ErrorClassifier.patterns = [
    {
        category: types_1.ErrorCategory.CONFIG_MISSING,
        level: types_1.HealingLevel.CODE,
        patterns: [
            /eslint|eslintrc|\.eslintrc/i,
            /prettier|prettierrc/i,
            /tsconfig\.json|typescript config/i,
            /jest\.config|test config/i
        ]
    },
    {
        category: types_1.ErrorCategory.DEPENDENCY_MISSING,
        level: types_1.HealingLevel.CODE,
        patterns: [
            /cannot find module|module not found/i,
            /node_modules|npm install|yarn add/i,
            /package not found/i
        ]
    },
    {
        category: types_1.ErrorCategory.COMMAND_NOT_FOUND,
        level: types_1.HealingLevel.CODE,
        patterns: [
            /command not found|is not recognized/i,
            /ENOENT.*spawn/i,
            /'.+' is not installed/i
        ]
    },
    {
        category: types_1.ErrorCategory.TIMEOUT,
        level: types_1.HealingLevel.CODE,
        patterns: [
            /timeout|timed out/i,
            /ETIMEDOUT|ECONNRESET/i,
            /exceeded.*time/i
        ]
    },
    {
        category: types_1.ErrorCategory.BUILD_ERROR,
        level: types_1.HealingLevel.LLM,
        patterns: [
            /build failed|compilation error/i,
            /syntax error|parse error/i,
            /type error|typeScript error/i
        ]
    },
    {
        category: types_1.ErrorCategory.TEST_FAILURE,
        level: types_1.HealingLevel.LLM,
        patterns: [
            /test failed|assertion failed/i,
            /expect.*received/i,
            /snapshot mismatch/i
        ]
    },
    {
        category: types_1.ErrorCategory.LINT_ERROR,
        level: types_1.HealingLevel.CODE,
        patterns: [
            /eslint.*error|lint.*error/i,
            /prettier.*error/i,
            /code style/i
        ]
    }
];
//# sourceMappingURL=ErrorClassifier.js.map