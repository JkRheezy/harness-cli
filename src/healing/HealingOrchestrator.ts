import { 
  HealingResult, 
  HealingAttempt, 
  HealingLevel, 
  HealingCost,
  ErrorClassification,
  HealingStrategyType 
} from './types';
import { ErrorClassifier } from './ErrorClassifier';
import { CodeLevelStrategy } from './strategies/CodeLevelStrategy';
import { LLMLevelStrategy } from './strategies/LLMLevelStrategy';

export interface OrchestratorConfig {
  maxCodeAttempts: number;
  maxLLMAttempts: number;
  maxTotalCost: number; // USD
  enableLLM: boolean;
}

/**
 * Orchestrates multi-level healing with cost control
 */
export class HealingOrchestrator {
  private classifier: ErrorClassifier;
  private codeStrategy: CodeLevelStrategy;
  private llmStrategy: LLMLevelStrategy | null;
  private config: OrchestratorConfig;
  private logger: any;
  
  constructor(
    workingDir: string,
    logger: any,
    llmCaller?: (prompt: string) => Promise<string>,
    config: Partial<OrchestratorConfig> = {}
  ) {
    this.classifier = new ErrorClassifier();
    this.codeStrategy = new CodeLevelStrategy(workingDir, logger);
    this.config = {
      maxCodeAttempts: 2,
      maxLLMAttempts: 1,
      maxTotalCost: 0.10, // $0.10 max per healing session
      enableLLM: true,
      ...config
    };
    this.logger = logger;
    
    // Only create LLM strategy if caller provided and enabled
    if (llmCaller && this.config.enableLLM) {
      this.llmStrategy = new LLMLevelStrategy(llmCaller, workingDir, logger);
    } else {
      this.llmStrategy = null;
    }
  }

  /**
   * Main healing entry point
   * Implements 3-layer healing with cost tracking
   */
  async heal(error: string | Error, context: any = {}): Promise<HealingResult> {
    const attempts: HealingAttempt[] = [];
    let totalCost: HealingCost = { llmCalls: 0, tokensUsed: 0, estimatedCost: 0 };
    
    this.logger.info('[HealingOrchestrator] Starting healing process...');
    
    // Step 1: Classify error
    const classification = this.classifier.classify(error);
    this.logger.info(`[HealingOrchestrator] Error classified as: ${classification.category}`);
    this.logger.info(`[HealingOrchestrator] Suggested strategy: Level ${classification.suggestedStrategy}`);
    
    // Step 2: Try code-level healing first (if applicable)
    if (classification.suggestedStrategy <= HealingLevel.CODE) {
      for (let i = 0; i < this.config.maxCodeAttempts; i++) {
        this.logger.info(`[HealingOrchestrator] Code-level attempt ${i + 1}/${this.config.maxCodeAttempts}`);
        
        const attempt = await this.codeStrategy.heal(error, classification);
        attempts.push(attempt);
        
        if (attempt.success) {
          this.logger.info('[HealingOrchestrator] ✓ Code-level healing succeeded');
          return this.buildResult(true, attempts, totalCost);
        }
        
        this.logger.warn(`[HealingOrchestrator] ✗ Code-level attempt failed: ${attempt.error}`);
      }
    }
    
    // Step 3: Try LLM-level healing (if enabled and not too expensive)
    if (this.llmStrategy && classification.suggestedStrategy <= HealingLevel.LLM) {
      if (totalCost.estimatedCost >= this.config.maxTotalCost) {
        this.logger.warn(`[HealingOrchestrator] Cost limit reached ($${totalCost.estimatedCost}), skipping LLM`);
      } else {
        for (let i = 0; i < this.config.maxLLMAttempts; i++) {
          this.logger.info(`[HealingOrchestrator] LLM-level attempt ${i + 1}/${this.config.maxLLMAttempts}`);
          
          const attempt = await this.llmStrategy.heal(error, context);
          attempts.push(attempt);
          
          // Track cost
          totalCost.llmCalls += attempt.cost.llmCalls;
          totalCost.tokensUsed += attempt.cost.tokensUsed;
          totalCost.estimatedCost += attempt.cost.estimatedCost;
          
          if (attempt.success) {
            this.logger.info('[HealingOrchestrator] ✓ LLM-level healing succeeded');
            return this.buildResult(true, attempts, totalCost);
          }
          
          this.logger.warn(`[HealingOrchestrator] ✗ LLM-level attempt failed: ${attempt.error}`);
          
          // Check cost after each LLM attempt
          if (totalCost.estimatedCost >= this.config.maxTotalCost) {
            this.logger.warn(`[HealingOrchestrator] Cost limit reached, stopping LLM attempts`);
            break;
          }
        }
      }
    }
    
    // Step 4: Escalation - all healing failed
    this.logger.error('[HealingOrchestrator] All healing attempts failed, escalating to human');
    
    return this.buildResult(false, attempts, totalCost, true);
  }

  /**
   * Quick check if healing is likely to succeed
   */
  canProbablyHeal(error: string | Error): boolean {
    const classification = this.classifier.classify(error);
    return classification.suggestedStrategy <= HealingLevel.LLM;
  }

  /**
   * Estimate healing cost before attempting
   */
  estimateCost(error: string | Error): HealingCost {
    const classification = this.classifier.classify(error);
    
    if (classification.suggestedStrategy === HealingLevel.CODE) {
      return { llmCalls: 0, tokensUsed: 0, estimatedCost: 0 };
    }
    
    if (classification.suggestedStrategy === HealingLevel.LLM && this.llmStrategy) {
      return { 
        llmCalls: 1, 
        tokensUsed: 1500, 
        estimatedCost: 0.03 
      };
    }
    
    return { llmCalls: 0, tokensUsed: 0, estimatedCost: 0 };
  }

  private buildResult(
    success: boolean, 
    attempts: HealingAttempt[], 
    cost: HealingCost,
    escalated: boolean = false
  ): HealingResult {
    let strategy: HealingStrategyType;
    if (success) {
      strategy = attempts[attempts.length - 1].strategy;
    } else {
      strategy = 'escalation';
    }
    return {
      success,
      strategy,
      attempts,
      cost,
      canRetry: !success && !escalated,
      escalationReason: escalated ? 'All healing strategies exhausted' : undefined
    };
  }
}
