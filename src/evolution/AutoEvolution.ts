import { Logger } from '../utils/Logger';
import { OpportunityDetector } from './OpportunityDetector';
import { TaskQueue } from '../core/TaskQueue';
import { 
  EvolutionConfig, 
  EvolutionOpportunity, 
  BusinessContext,
  TaskCategory
} from './types';

export interface Task {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  category?: string;
  maxDuration: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  parentTask?: string;
}

export class AutoEvolution {
  private logger: Logger;
  private detector: OpportunityDetector;
  private taskQueue: TaskQueue;
  private config: EvolutionConfig;
  private iterationCount: number = 0;

  constructor(config: EvolutionConfig, taskQueue: TaskQueue) {
    this.logger = new Logger();
    this.detector = new OpportunityDetector(config);
    this.taskQueue = taskQueue;
    this.config = config;
  }

  async trigger(
    trigger: 'queue_empty' | 'periodic_check',
    projectPath: string,
    context?: BusinessContext
  ): Promise<boolean> {
    if (!this.config.enabled) {
      this.logger.info('⏭️ Auto-evolution disabled');
      return false;
    }

    this.logger.info(`🔄 Auto-evolution triggered: ${trigger}`);

    // Skip periodic check if not enough iterations passed
    if (trigger === 'periodic_check') {
      this.iterationCount++;
      if (this.iterationCount * this.config.checkInterval < 60000) {
        return false;
      }
      this.iterationCount = 0;
    }

    try {
      const opportunities = await this.detector.getTopOpportunities(
        projectPath,
        this.config.maxOpportunitiesPerAnalysis,
        context
      );

      if (opportunities.length === 0) {
        this.logger.info('✨ No evolution opportunities found');
        return false;
      }

      const tasks = opportunities.map(opp => this.convertToTask(opp));

      for (const task of tasks) {
        await this.taskQueue.enqueue(task);
        this.logger.info(`📥 Auto-generated task: ${task.title}`);
      }

      this.logger.info(`✅ Auto-evolution complete: ${tasks.length} tasks generated`);
      return true;

    } catch (error: any) {
      this.logger.error('❌ Auto-evolution failed:', error.message);
      return false;
    }
  }

  private convertToTask(opportunity: EvolutionOpportunity): Task {
    return {
      id: opportunity.id,
      title: opportunity.title,
      description: this.buildTaskDescription(opportunity),
      requirements: this.extractRequirements(opportunity),
      priority: opportunity.priority,
      status: 'pending',
      category: opportunity.category,
      maxDuration: this.estimateDuration(opportunity),
      createdAt: new Date()
    };
  }

  private buildTaskDescription(opportunity: EvolutionOpportunity): string {
    const parts = [
      opportunity.description,
      '',
      '📊 Impact Score: ' + opportunity.estimatedImpact + '/10',
      '',
      '🎯 Suggested Approach:',
      opportunity.suggestedApproach,
      '',
      '📋 Evidence:'
    ];

    for (const evidence of opportunity.evidence) {
      parts.push(`- [${evidence.type}] ${evidence.description}`);
      if (evidence.location) {
        parts.push(`  Location: ${evidence.location}`);
      }
    }

    if (opportunity.relatedFiles && opportunity.relatedFiles.length > 0) {
      parts.push('');
      parts.push('📁 Related Files:');
      opportunity.relatedFiles.forEach(file => parts.push(`- ${file}`));
    }

    return parts.join('\n');
  }

  private extractRequirements(opportunity: EvolutionOpportunity): string[] {
    const requirements: string[] = [];

    const lines = opportunity.suggestedApproach.split('\n');
    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)$/);
      if (match) {
        requirements.push(match[1]);
      }
    }

    switch (opportunity.category) {
      case 'testing':
        requirements.push('Tests must pass in CI');
        requirements.push('Coverage report generated');
        break;
      case 'business_feature':
        requirements.push('Feature validated in browser');
        requirements.push('User flow tested end-to-end');
        break;
      case 'performance':
        requirements.push('Performance metrics collected');
        break;
      case 'security':
        requirements.push('Security review passed');
        break;
    }

    return requirements;
  }

  private estimateDuration(opportunity: EvolutionOpportunity): number {
    const baseDurations: Record<string, number> = {
      technical_debt: 60 * 60 * 1000,
      feature_gap: 4 * 60 * 60 * 1000,
      performance: 2 * 60 * 60 * 1000,
      security: 2 * 60 * 60 * 1000,
      testing: 90 * 60 * 1000,
      documentation: 60 * 60 * 1000,
      business_feature: 4 * 60 * 60 * 1000,
      ux_improvement: 3 * 60 * 60 * 1000
    };

    const base = baseDurations[opportunity.category] || 2 * 60 * 60 * 1000;
    const impactMultiplier = opportunity.estimatedImpact / 5;
    
    return Math.round(base * impactMultiplier);
  }

  getStats(): { iterationCount: number; enabled: boolean } {
    return {
      iterationCount: this.iterationCount,
      enabled: this.config.enabled
    };
  }
}
