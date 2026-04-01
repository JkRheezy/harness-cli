"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpportunityDetector = void 0;
const Logger_1 = require("../utils/Logger");
const CodeAnalyzer_1 = require("./analyzers/CodeAnalyzer");
const BusinessAnalyzer_1 = require("./analyzers/BusinessAnalyzer");
const DocumentationDriftAnalyzer_1 = require("./analyzers/DocumentationDriftAnalyzer");
class OpportunityDetector {
    constructor(config) {
        this.logger = new Logger_1.Logger();
        this.codeAnalyzer = new CodeAnalyzer_1.CodeAnalyzer();
        this.businessAnalyzer = new BusinessAnalyzer_1.BusinessAnalyzer();
        this.docDriftAnalyzer = new DocumentationDriftAnalyzer_1.DocumentationDriftAnalyzer();
        this.config = config;
    }
    async detectOpportunities(projectPath, context) {
        const startTime = Date.now();
        this.logger.info('🔍 Starting opportunity detection...');
        const allOpportunities = [];
        // Parallel analysis
        const analysisPromises = [];
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
        const filteredOpportunities = allOpportunities.filter(opp => opp.estimatedImpact >= this.config.minImpactThreshold);
        // Sort by priority and impact
        const sortedOpportunities = this.prioritizeOpportunities(filteredOpportunities);
        // Limit results
        const limitedOpportunities = sortedOpportunities.slice(0, this.config.maxOpportunitiesPerAnalysis);
        const duration = Date.now() - startTime;
        this.logger.info(`✅ Opportunity detection complete: ${limitedOpportunities.length} opportunities found (${duration}ms)`);
        return {
            opportunitiesFound: allOpportunities.length,
            tasksGenerated: limitedOpportunities.length,
            categories: this.categorizeOpportunities(limitedOpportunities),
            analysisDuration: duration
        };
    }
    async getTopOpportunities(projectPath, limit = 5, context) {
        const allOpportunities = [];
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
        const filtered = allOpportunities.filter(opp => opp.estimatedImpact >= this.config.minImpactThreshold);
        const prioritized = this.prioritizeOpportunities(filtered);
        this.logger.info(`📊 Analyzed ${allOpportunities.length} opportunities, returning top ${limit}`);
        return prioritized.slice(0, limit);
    }
    prioritizeOpportunities(opportunities) {
        const priorityScore = {
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
    categorizeOpportunities(opportunities) {
        const categories = {};
        for (const opp of opportunities) {
            categories[opp.category] = (categories[opp.category] || 0) + 1;
        }
        return categories;
    }
}
exports.OpportunityDetector = OpportunityDetector;
//# sourceMappingURL=OpportunityDetector.js.map