import { HealingOrchestrator } from '../HealingOrchestrator';
import { Logger } from '../../utils/Logger';

describe('HealingOrchestrator', () => {
  let orchestrator: HealingOrchestrator;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    orchestrator = new HealingOrchestrator('/tmp', logger);
  });

  describe('estimateCost', () => {
    it('should estimate zero cost for code-level fixes', () => {
      const error = 'Cannot find module';
      const cost = orchestrator.estimateCost(error);
      
      expect(cost.llmCalls).toBe(0);
      expect(cost.estimatedCost).toBe(0);
    });

    it('should estimate cost for unknown errors when LLM is enabled', () => {
      const mockLlmCaller = jest.fn().mockResolvedValue('mock response');
      const llmOrchestrator = new HealingOrchestrator('/tmp', logger, mockLlmCaller);
      const error = 'Something weird';
      const cost = llmOrchestrator.estimateCost(error);
      
      expect(cost.llmCalls).toBe(1);
      expect(cost.estimatedCost).toBeGreaterThan(0);
    });

    it('should estimate zero cost when LLM is not enabled', () => {
      const error = 'Something weird';
      const cost = orchestrator.estimateCost(error);
      
      expect(cost.llmCalls).toBe(0);
      expect(cost.estimatedCost).toBe(0);
    });
  });

  describe('canProbablyHeal', () => {
    it('should return true for code-level errors', () => {
      const error = 'eslint config missing';
      expect(orchestrator.canProbablyHeal(error)).toBe(true);
    });

    it('should return true for LLM-level errors', () => {
      const error = 'Build failed with complex type error';
      expect(orchestrator.canProbablyHeal(error)).toBe(true);
    });

    it('should handle various error types', () => {
      const errors = [
        'Cannot find module',
        'npm install failed',
        'Timeout',
        'Test assertion failed'
      ];
      
      for (const error of errors) {
        expect(orchestrator.canProbablyHeal(error)).toBe(true);
      }
    });
  });

  describe('constructor config', () => {
    it('should accept custom config', () => {
      const customOrchestrator = new HealingOrchestrator('/tmp', logger, undefined, {
        maxCodeAttempts: 5,
        maxLLMAttempts: 3,
        maxTotalCost: 0.50,
        enableLLM: false
      });
      
      expect(customOrchestrator).toBeDefined();
    });

    it('should work without LLM caller', () => {
      const noLlmOrchestrator = new HealingOrchestrator('/tmp', logger);
      expect(noLlmOrchestrator.canProbablyHeal('test error')).toBe(true);
    });
  });
});
