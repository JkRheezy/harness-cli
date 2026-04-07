import { ErrorClassification, ErrorCategory, HealingLevel } from './types';

/**
 * Classifies errors to determine optimal healing strategy
 * Uses pattern matching for fast classification
 */
export class ErrorClassifier {
  /**
   * Known error patterns and their categories
   */
  private static patterns: Array<{
    category: ErrorCategory;
    level: HealingLevel;
    patterns: RegExp[];
  }> = [
    {
      category: ErrorCategory.CONFIG_MISSING,
      level: HealingLevel.CODE,
      patterns: [
        /eslint|eslintrc|\.eslintrc/i,
        /prettier|prettierrc/i,
        /tsconfig\.json|typescript config/i,
        /jest\.config|test config/i
      ]
    },
    {
      category: ErrorCategory.DEPENDENCY_MISSING,
      level: HealingLevel.CODE,
      patterns: [
        /cannot find module|module not found/i,
        /node_modules|npm install|yarn add/i,
        /package not found/i
      ]
    },
    {
      category: ErrorCategory.COMMAND_NOT_FOUND,
      level: HealingLevel.CODE,
      patterns: [
        /command not found|is not recognized/i,
        /ENOENT.*spawn/i,
        /'.+' is not installed/i
      ]
    },
    {
      category: ErrorCategory.TIMEOUT,
      level: HealingLevel.CODE,
      patterns: [
        /timeout|timed out/i,
        /ETIMEDOUT|ECONNRESET/i,
        /exceeded.*time/i
      ]
    },
    {
      category: ErrorCategory.BUILD_ERROR,
      level: HealingLevel.LLM,
      patterns: [
        /build failed|compilation error/i,
        /syntax error|parse error/i,
        /type error|typeScript error/i
      ]
    },
    {
      category: ErrorCategory.TEST_FAILURE,
      level: HealingLevel.LLM,
      patterns: [
        /test failed|assertion failed/i,
        /expect.*received/i,
        /snapshot mismatch/i
      ]
    },
    {
      category: ErrorCategory.LINT_ERROR,
      level: HealingLevel.CODE,
      patterns: [
        /eslint.*error|lint.*error/i,
        /prettier.*error/i,
        /code style/i
      ]
    }
  ];

  /**
   * Classify an error to determine healing strategy
   */
  classify(error: string | Error): ErrorClassification {
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
      category: ErrorCategory.UNKNOWN,
      severity: 'warning',
      suggestedStrategy: HealingLevel.LLM,
      knownPattern: false,
      context: {}
    };
  }

  /**
   * Check if error is likely fixable at code level
   */
  isCodeLevelFixable(error: string | Error): boolean {
    const classification = this.classify(error);
    return classification.suggestedStrategy === HealingLevel.CODE;
  }

  /**
   * Infer severity from category
   */
  private inferSeverity(category: ErrorCategory): 'blocking' | 'warning' | 'info' {
    switch (category) {
      case ErrorCategory.CONFIG_MISSING:
      case ErrorCategory.DEPENDENCY_MISSING:
      case ErrorCategory.COMMAND_NOT_FOUND:
        return 'blocking';
      case ErrorCategory.LINT_ERROR:
        return 'warning';
      case ErrorCategory.TIMEOUT:
        return 'info';
      default:
        return 'blocking';
    }
  }

  /**
   * Extract relevant context from error
   */
  private extractContext(category: ErrorCategory, error: string): any {
    const context: any = {};
    
    switch (category) {
      case ErrorCategory.CONFIG_MISSING:
        const configMatch = error.match(/(['"]?)([\w.-]+\.(json|js|ts|yaml|yml))\1/);
        if (configMatch) {
          context.missingConfig = configMatch[2];
        }
        break;
        
      case ErrorCategory.DEPENDENCY_MISSING:
        const moduleMatch = error.match(/cannot find module ['"]([^'"]+)['"]/i);
        if (moduleMatch) {
          context.missingModule = moduleMatch[1];
        }
        break;
        
      case ErrorCategory.COMMAND_NOT_FOUND:
        const cmdMatch = error.match(/command not found:\s*(\w+)/i);
        if (cmdMatch) {
          context.missingCommand = cmdMatch[1];
        }
        break;
    }
    
    return context;
  }
}
