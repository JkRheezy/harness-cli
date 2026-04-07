import { ErrorClassification } from './types';
/**
 * Classifies errors to determine optimal healing strategy
 * Uses pattern matching for fast classification
 */
export declare class ErrorClassifier {
    /**
     * Known error patterns and their categories
     */
    private static patterns;
    /**
     * Classify an error to determine healing strategy
     */
    classify(error: string | Error): ErrorClassification;
    /**
     * Check if error is likely fixable at code level
     */
    isCodeLevelFixable(error: string | Error): boolean;
    /**
     * Infer severity from category
     */
    private inferSeverity;
    /**
     * Extract relevant context from error
     */
    private extractContext;
}
//# sourceMappingURL=ErrorClassifier.d.ts.map