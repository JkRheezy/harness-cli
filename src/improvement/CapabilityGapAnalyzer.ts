import { CapabilityGap, GapAnalysisResult, ExecutionFailure } from './types';
import { Logger } from '../utils/Logger';

/**
 * Analyzes execution failures to identify Harness framework capability gaps
 * Triggers self-improvement when the framework lacks capabilities
 */
export class CapabilityGapAnalyzer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Analyze execution failure and identify if it's a capability gap
   */
  analyzeFailure(failure: ExecutionFailure): CapabilityGap | null {
    this.logger.info(`[CapabilityGapAnalyzer] Analyzing failure: ${failure.taskName}`);

    // Pattern matching for known gap categories
    const gap = this.matchGapPattern(failure);
    
    if (gap) {
      this.logger.warn(`[CapabilityGapAnalyzer] Capability gap identified: ${gap.description}`);
    }

    return gap;
  }

  /**
   * Analyze multiple failures for systemic gaps
   */
  analyzeFailures(failures: ExecutionFailure[]): GapAnalysisResult {
    const gaps: CapabilityGap[] = [];
    
    for (const failure of failures) {
      const gap = this.analyzeFailure(failure);
      if (gap && !this.isDuplicateGap(gaps, gap)) {
        gaps.push(gap);
      }
    }

    return {
      gaps,
      criticalCount: gaps.filter(g => g.severity === 'critical').length,
      highCount: gaps.filter(g => g.severity === 'high').length,
      mediumCount: gaps.filter(g => g.severity === 'medium').length,
      lowCount: gaps.filter(g => g.severity === 'low').length,
      recommendations: this.generateRecommendations(gaps)
    };
  }

  private matchGapPattern(failure: ExecutionFailure): CapabilityGap | null {
    const error = failure.error.toLowerCase();
    const context = failure.context.toLowerCase();

    // Pattern: Missing template for layer
    if (error.includes('no template found') && context.includes('layer')) {
      return {
        id: `gap-template-${Date.now()}`,
        category: 'bootstrap',
        description: `Missing template for layer in context: ${failure.context}`,
        severity: 'high',
        evidence: failure.error,
        suggestedFix: 'Add template to TemplateRegistry for the missing layer/tech-stack combination',
        estimatedEffort: 'small'
      };
    }

    // Pattern: Pattern application failed
    if (error.includes('pattern') && error.includes('apply')) {
      return {
        id: `gap-pattern-${Date.now()}`,
        category: 'pattern',
        description: 'Pattern applier failed to apply pattern correctly',
        severity: 'high',
        evidence: failure.error,
        suggestedFix: 'Fix PatternApplier implementation or add missing file generation logic',
        estimatedEffort: 'medium'
      };
    }

    // Pattern: Documentation generation failed
    if (context.includes('documentation') || context.includes('agents.md')) {
      return {
        id: `gap-docs-${Date.now()}`,
        category: 'documentation',
        description: 'Documentation generation failed',
        severity: 'medium',
        evidence: failure.error,
        suggestedFix: 'Fix DocumentationGenerator or add missing template',
        estimatedEffort: 'small'
      };
    }

    // Pattern: AGENTS.md parsing failed
    if (error.includes('agents.md') && error.includes('parse')) {
      return {
        id: `gap-parser-${Date.now()}`,
        category: 'loop',
        description: 'AGENTS.md parser cannot handle document format',
        severity: 'critical',
        evidence: failure.error,
        suggestedFix: 'Update AgentsMdParser to handle the specific format variant',
        estimatedEffort: 'medium'
      };
    }

    // Pattern: Constraint validation failed
    if (error.includes('constraint') || error.includes('validation')) {
      return {
        id: `gap-constraint-${Date.now()}`,
        category: 'loop',
        description: 'ConstraintValidator cannot validate project constraints',
        severity: 'high',
        evidence: failure.error,
        suggestedFix: 'Add constraint validation logic or improve error handling',
        estimatedEffort: 'medium'
      };
    }

    // Unknown failure - might be product issue, not framework gap
    return null;
  }

  private isDuplicateGap(existingGaps: CapabilityGap[], newGap: CapabilityGap): boolean {
    return existingGaps.some(gap => 
      gap.category === newGap.category && 
      gap.description === newGap.description
    );
  }

  private generateRecommendations(gaps: CapabilityGap[]): string[] {
    const recommendations: string[] = [];

    if (gaps.some(g => g.category === 'bootstrap')) {
      recommendations.push('Review TemplateRegistry for missing layer templates');
    }

    if (gaps.some(g => g.category === 'pattern')) {
      recommendations.push('Review PatternApplier implementations for robustness');
    }

    if (gaps.some(g => g.category === 'documentation')) {
      recommendations.push('Add error handling and fallback templates to DocumentationGenerator');
    }

    if (gaps.some(g => g.category === 'loop')) {
      recommendations.push('Enhance AgentsMdParser to handle more document formats');
    }

    if (gaps.some(g => g.severity === 'critical')) {
      recommendations.push('Prioritize critical gaps before continuing product development');
    }

    return recommendations;
  }
}

export default CapabilityGapAnalyzer;
