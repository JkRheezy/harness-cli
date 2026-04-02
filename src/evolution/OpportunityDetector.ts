import { Logger } from '../utils/Logger';
import { CodeAnalyzer } from './analyzers/CodeAnalyzer';
import { BusinessAnalyzer } from './analyzers/BusinessAnalyzer';
import { DocumentationDriftAnalyzer } from './analyzers/DocumentationDriftAnalyzer';
import { RequirementDiscoveryEngine } from './analyzers/RequirementDiscoveryEngine';
import { AgentsMdManager } from './managers/AgentsMdManager';
import { SmartTaskGenerator } from './generators/SmartTaskGenerator';
import { 
  EvolutionOpportunity, 
  EvolutionConfig, 
  EvolutionResult,
  BusinessContext,
  Gap
} from './types';

export class OpportunityDetector {
  private logger: Logger;
  private codeAnalyzer: CodeAnalyzer;
  private businessAnalyzer: BusinessAnalyzer;
  private docDriftAnalyzer: DocumentationDriftAnalyzer;
  private requirementDiscoveryEngine: RequirementDiscoveryEngine | null = null;
  private agentsMdManager: AgentsMdManager | null = null;
  private smartTaskGenerator: SmartTaskGenerator;
  private config: EvolutionConfig;
  private projectPath: string = '';

  constructor(config: EvolutionConfig, projectPath?: string) {
    this.logger = new Logger();
    this.codeAnalyzer = new CodeAnalyzer();
    this.businessAnalyzer = new BusinessAnalyzer();
    this.docDriftAnalyzer = new DocumentationDriftAnalyzer();
    this.smartTaskGenerator = new SmartTaskGenerator();
    this.config = config;
    if (projectPath) {
      this.projectPath = projectPath;
      this.requirementDiscoveryEngine = new RequirementDiscoveryEngine(projectPath);
      this.agentsMdManager = new AgentsMdManager(projectPath);
    }
  }

  async detectOpportunities(
    projectPath: string,
    context?: BusinessContext
  ): Promise<EvolutionResult> {
    const startTime = Date.now();
    
    this.logger.info('🔍 Starting opportunity detection...');
    
    // Initialize managers if projectPath is provided and not already set
    if (projectPath && !this.projectPath) {
      this.projectPath = projectPath;
      this.requirementDiscoveryEngine = new RequirementDiscoveryEngine(projectPath);
      this.agentsMdManager = new AgentsMdManager(projectPath);
    }
    
    const allOpportunities: EvolutionOpportunity[] = [];
    let discoveredGaps: Gap[] = [];

    // Parallel analysis
    const analysisPromises: Promise<EvolutionOpportunity[]>[] = [];

    if (this.config.categories.technical) {
      analysisPromises.push(this.codeAnalyzer.analyze(projectPath));
    }

    if (this.config.categories.business && context) {
      analysisPromises.push(this.businessAnalyzer.analyze(projectPath, context));
    }

    // Always run documentation drift analysis
    analysisPromises.push(this.docDriftAnalyzer.analyze(projectPath));

    // Run requirement discovery if business category is enabled
    if (this.config.categories.business && this.requirementDiscoveryEngine) {
      try {
        const discoveryResult = await this.requirementDiscoveryEngine.analyze();
        discoveredGaps = discoveryResult.gaps;
        
        // Convert gaps to opportunities
        const gapOpportunities = this.convertGapsToOpportunities(discoveryResult.gaps);
        allOpportunities.push(...gapOpportunities);
        
        this.logger.info(`📋 Requirement discovery found ${discoveryResult.gaps.length} gaps`);
      } catch (error: any) {
        this.logger.warn('⚠️ Requirement discovery failed:', error.message);
      }
    }

    const results = await Promise.all(analysisPromises);
    results.forEach(opportunities => allOpportunities.push(...opportunities));

    // Filter by impact threshold
    const filteredOpportunities = allOpportunities.filter(
      opp => opp.estimatedImpact >= this.config.minImpactThreshold
    );

    // Sort by priority and impact
    const sortedOpportunities = this.prioritizeOpportunities(filteredOpportunities);

    // Limit results
    const limitedOpportunities = sortedOpportunities.slice(
      0, 
      this.config.maxOpportunitiesPerAnalysis
    );

    // Update AGENTS.md if auto-update is enabled
    if (this.config.documentation?.autoUpdate && this.agentsMdManager && discoveredGaps.length > 0) {
      await this.updateAgentsMd(discoveredGaps);
    }

    const duration = Date.now() - startTime;

    this.logger.info(`✅ Opportunity detection complete: ${limitedOpportunities.length} opportunities found (${duration}ms)`);

    return {
      opportunitiesFound: allOpportunities.length,
      tasksGenerated: limitedOpportunities.length,
      categories: this.categorizeOpportunities(limitedOpportunities),
      analysisDuration: duration
    };
  }

  async getTopOpportunities(
    projectPath: string,
    limit: number = 5,
    context?: BusinessContext
  ): Promise<EvolutionOpportunity[]> {
    const allOpportunities: EvolutionOpportunity[] = [];

    if (this.config.categories.technical) {
      const codeOpps = await this.codeAnalyzer.analyze(projectPath);
      allOpportunities.push(...codeOpps);
    }

    if (this.config.categories.business && context) {
      const businessOpps = await this.businessAnalyzer.analyze(projectPath, context);
      allOpportunities.push(...businessOpps);
    }

    // Always include documentation drift analysis
    const docOpps = await this.docDriftAnalyzer.analyze(projectPath);
    allOpportunities.push(...docOpps);

    const filtered = allOpportunities.filter(
      opp => opp.estimatedImpact >= this.config.minImpactThreshold
    );

    const prioritized = this.prioritizeOpportunities(filtered);
    
    this.logger.info(`📊 Analyzed ${allOpportunities.length} opportunities, returning top ${limit}`);
    
    return prioritized.slice(0, limit);
  }

  private prioritizeOpportunities(
    opportunities: EvolutionOpportunity[]
  ): EvolutionOpportunity[] {
    // Category-based priority: business_feature > technical_debt > test_coverage
    const categoryPriority: Record<string, number> = {
      'business_feature': 3,    // Highest priority
      'technical_debt': 2,
      'test_coverage': 1,       // Lowest
      'feature_gap': 2,
      'performance': 2,
      'security': 3,
      'testing': 1,
      'documentation': 1,
      'ux_improvement': 2
    };
    
    const priorityScore: Record<string, number> = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25
    };

    return opportunities.sort((a, b) => {
      // First sort by category priority
      const catDiff = (categoryPriority[b.category] || 0) - (categoryPriority[a.category] || 0);
      if (catDiff !== 0) return catDiff;
      
      // Then by urgency priority and impact
      const scoreA = priorityScore[a.priority] + a.estimatedImpact;
      const scoreB = priorityScore[b.priority] + b.estimatedImpact;
      return scoreB - scoreA;
    });
  }

  /**
   * Convert discovered gaps to evolution opportunities
   */
  private convertGapsToOpportunities(gaps: Gap[]): EvolutionOpportunity[] {
    return gaps.map(gap => this.convertGapToOpportunity(gap));
  }

  /**
   * Convert a single gap to evolution opportunity
   */
  private convertGapToOpportunity(gap: Gap): EvolutionOpportunity {
    // Map gap type to task category
    const categoryMap: Record<string, any> = {
      'missing_module': 'business_feature',
      'missing_api': 'business_feature',
      'incomplete_flow': 'business_feature',
      'missing_model': 'feature_gap',
      'config_mismatch': 'technical_debt'
    };

    // Map priority to opportunity priority
    const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'P0': 'critical',
      'P1': 'high',
      'P2': 'medium'
    };

    // Generate suggested approach using SmartTaskGenerator
    const businessTask = this.smartTaskGenerator.generateFromGap(gap);
    const suggestedApproach = businessTask.suggestedApproach.join('\n');

    return {
      id: gap.id,
      category: categoryMap[gap.type] || 'business_feature',
      trigger: 'business_opportunity',
      title: businessTask.title,
      description: gap.description,
      priority: priorityMap[gap.priority] || 'medium',
      estimatedImpact: gap.priority === 'P0' ? 9 : gap.priority === 'P1' ? 7 : 5,
      evidence: [{
        type: 'missing_feature',
        description: gap.reason,
        severity: gap.priority === 'P0' ? 'error' : gap.priority === 'P1' ? 'warning' : 'info'
      }],
      suggestedApproach: suggestedApproach,
      relatedFiles: gap.relatedFiles,
      createdAt: gap.detectedAt
    };
  }

  /**
   * Update AGENTS.md with discovered gaps
   */
  private async updateAgentsMd(gaps: Gap[]): Promise<void> {
    if (!this.agentsMdManager) return;

    try {
      for (const gap of gaps) {
        await this.agentsMdManager.addRequirement(gap);
      }
      this.logger.info(`📝 Updated AGENTS.md with ${gaps.length} requirements`);
    } catch (error: any) {
      this.logger.warn('⚠️ Failed to update AGENTS.md:', error.message);
    }
  }

  private categorizeOpportunities(
    opportunities: EvolutionOpportunity[]
  ): Record<string, number> {
    const categories: Record<string, number> = {};
    
    for (const opp of opportunities) {
      categories[opp.category] = (categories[opp.category] || 0) + 1;
    }
    
    return categories;
  }

  /**
   * Get the AgentsMdManager instance
   */
  getAgentsMdManager(): AgentsMdManager | null {
    return this.agentsMdManager;
  }

  /**
   * Set project path and initialize managers
   */
  setProjectPath(projectPath: string): void {
    this.projectPath = projectPath;
    this.requirementDiscoveryEngine = new RequirementDiscoveryEngine(projectPath);
    this.agentsMdManager = new AgentsMdManager(projectPath);
  }
}
