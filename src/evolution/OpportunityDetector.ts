import { Logger } from '../utils/Logger';
import { CodeAnalyzer } from './analyzers/CodeAnalyzer';
import { BusinessAnalyzer } from './analyzers/BusinessAnalyzer';
import { DocumentationDriftAnalyzer } from './analyzers/DocumentationDriftAnalyzer';
import { 
  EvolutionOpportunity, 
  EvolutionConfig, 
  EvolutionResult,
  BusinessContext 
} from './types';

export class OpportunityDetector {
  private logger: Logger;
  private codeAnalyzer: CodeAnalyzer;
  private businessAnalyzer: BusinessAnalyzer;
  private docDriftAnalyzer: DocumentationDriftAnalyzer;
  private config: EvolutionConfig;

  constructor(config: EvolutionConfig) {
    this.logger = new Logger();
    this.codeAnalyzer = new CodeAnalyzer();
    this.businessAnalyzer = new BusinessAnalyzer();
    this.docDriftAnalyzer = new DocumentationDriftAnalyzer();
    this.config = config;
  }

  async detectOpportunities(
    projectPath: string,
    context?: BusinessContext
  ): Promise<EvolutionResult> {
    const startTime = Date.now();
    
    this.logger.info('🔍 Starting opportunity detection...');
    
    const allOpportunities: EvolutionOpportunity[] = [];

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
    const priorityScore: Record<string, number> = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25
    };

    return opportunities.sort((a, b) => {
      const scoreA = priorityScore[a.priority] + a.estimatedImpact;
      const scoreB = priorityScore[b.priority] + b.estimatedImpact;
      return scoreB - scoreA;
    });
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
}
