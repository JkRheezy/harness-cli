import { ErrorClassifier } from '../ErrorClassifier';
import { ErrorCategory, HealingLevel } from '../types';

describe('ErrorClassifier', () => {
  let classifier: ErrorClassifier;

  beforeEach(() => {
    classifier = new ErrorClassifier();
  });

  describe('classify', () => {
    it('should classify ESLint config missing as CODE level', () => {
      const error = 'Error: Cannot find .eslintrc.json';
      const result = classifier.classify(error);
      
      expect(result.category).toBe(ErrorCategory.CONFIG_MISSING);
      expect(result.suggestedStrategy).toBe(HealingLevel.CODE);
      expect(result.knownPattern).toBe(true);
    });

    it('should classify module not found as CODE level', () => {
      const error = "Error: Cannot find module 'express'";
      const result = classifier.classify(error);
      
      expect(result.category).toBe(ErrorCategory.DEPENDENCY_MISSING);
      expect(result.suggestedStrategy).toBe(HealingLevel.CODE);
    });

    it('should classify build errors as LLM level', () => {
      const error = 'TypeScript compilation error: Type string is not assignable to type number';
      const result = classifier.classify(error);
      
      expect(result.category).toBe(ErrorCategory.BUILD_ERROR);
      expect(result.suggestedStrategy).toBe(HealingLevel.LLM);
    });

    it('should classify test failures as LLM level', () => {
      const error = 'Test failed: expected 5 but received 3';
      const result = classifier.classify(error);
      
      expect(result.category).toBe(ErrorCategory.TEST_FAILURE);
      expect(result.suggestedStrategy).toBe(HealingLevel.LLM);
    });

    it('should classify unknown errors as LLM level', () => {
      const error = 'Something weird happened that we do not recognize';
      const result = classifier.classify(error);
      
      expect(result.category).toBe(ErrorCategory.UNKNOWN);
      expect(result.suggestedStrategy).toBe(HealingLevel.LLM);
      expect(result.knownPattern).toBe(false);
    });

    it('should extract missing config file from error', () => {
      const error = 'Cannot find tsconfig.json in project root';
      const result = classifier.classify(error);
      
      expect(result.category).toBe(ErrorCategory.CONFIG_MISSING);
      expect(result.context.missingConfig).toBe('tsconfig.json');
    });

    it('should extract missing module from error', () => {
      const error = "Cannot find module '@types/node'";
      const result = classifier.classify(error);
      
      expect(result.category).toBe(ErrorCategory.DEPENDENCY_MISSING);
      expect(result.context.missingModule).toBe('@types/node');
    });

    it('should handle Error objects', () => {
      const error = new Error('eslint configuration error');
      const result = classifier.classify(error);
      
      expect(result.category).toBe(ErrorCategory.CONFIG_MISSING);
    });

    it('should classify timeouts as CODE level', () => {
      const error = 'Request timeout after 30000ms';
      const result = classifier.classify(error);
      
      expect(result.category).toBe(ErrorCategory.TIMEOUT);
      expect(result.suggestedStrategy).toBe(HealingLevel.CODE);
    });

    it('should classify command not found as CODE level', () => {
      const error = "spawn ENOENT: 'tsc' command not found";
      const result = classifier.classify(error);
      
      expect(result.category).toBe(ErrorCategory.COMMAND_NOT_FOUND);
      expect(result.suggestedStrategy).toBe(HealingLevel.CODE);
    });
  });

  describe('isCodeLevelFixable', () => {
    it('should return true for config errors', () => {
      const error = 'Cannot find .eslintrc.json';
      expect(classifier.isCodeLevelFixable(error)).toBe(true);
    });

    it('should return true for dependency errors', () => {
      const error = "Cannot find module 'lodash'";
      expect(classifier.isCodeLevelFixable(error)).toBe(true);
    });

    it('should return false for build errors', () => {
      const error = 'TypeScript compilation failed';
      expect(classifier.isCodeLevelFixable(error)).toBe(false);
    });

    it('should return false for unknown errors', () => {
      const error = 'Something weird happened';
      expect(classifier.isCodeLevelFixable(error)).toBe(false);
    });
  });
});
