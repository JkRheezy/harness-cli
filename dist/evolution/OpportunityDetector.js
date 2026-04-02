"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpportunityDetector = void 0;
const Logger_1 = require("../utils/Logger");
const CodeAnalyzer_1 = require("./analyzers/CodeAnalyzer");
const BusinessAnalyzer_1 = require("./analyzers/BusinessAnalyzer");
const DocumentationDriftAnalyzer_1 = require("./analyzers/DocumentationDriftAnalyzer");
const RequirementDiscoveryEngine_1 = require("./analyzers/RequirementDiscoveryEngine");
const AgentsMdManager_1 = require("./managers/AgentsMdManager");
const SmartTaskGenerator_1 = require("./generators/SmartTaskGenerator");
class OpportunityDetector {
    constructor(config, projectPath) {
        this.requirementDiscoveryEngine = null;
        this.agentsMdManager = null;
        this.projectPath = '';
        this.logger = new Logger_1.Logger();
        this.codeAnalyzer = new CodeAnalyzer_1.CodeAnalyzer();
        this.businessAnalyzer = new BusinessAnalyzer_1.BusinessAnalyzer();
        this.docDriftAnalyzer = new DocumentationDriftAnalyzer_1.DocumentationDriftAnalyzer();
        this.smartTaskGenerator = new SmartTaskGenerator_1.SmartTaskGenerator();
        this.config = config;
        if (projectPath) {
            this.projectPath = projectPath;
            this.requirementDiscoveryEngine = new RequirementDiscoveryEngine_1.RequirementDiscoveryEngine(projectPath);
            this.agentsMdManager = new AgentsMdManager_1.AgentsMdManager(projectPath);
        }
    }
    async detectOpportunities(projectPath, context) {
        const startTime = Date.now();
        this.logger.info('🔍 Starting opportunity detection...');
        // Initialize managers if projectPath is provided and not already set
        if (projectPath && !this.projectPath) {
            this.projectPath = projectPath;
            this.requirementDiscoveryEngine = new RequirementDiscoveryEngine_1.RequirementDiscoveryEngine(projectPath);
            this.agentsMdManager = new AgentsMdManager_1.AgentsMdManager(projectPath);
        }
        const allOpportunities = [];
        let discoveredGaps = [];
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
        // Run requirement discovery if business category is enabled
        if (this.config.categories.business && this.requirementDiscoveryEngine) {
            try {
                const discoveryResult = await this.requirementDiscoveryEngine.analyze();
                discoveredGaps = discoveryResult.gaps;
                // Convert gaps to opportunities
                const gapOpportunities = this.convertGapsToOpportunities(discoveryResult.gaps);
                allOpportunities.push(...gapOpportunities);
                this.logger.info(`📋 Requirement discovery found ${discoveryResult.gaps.length} gaps`);
            }
            catch (error) {
                this.logger.warn('⚠️ Requirement discovery failed:', error.message);
            }
        }
        const results = await Promise.all(analysisPromises);
        results.forEach(opportunities => allOpportunities.push(...opportunities));
        // Filter by impact threshold
        const filteredOpportunities = allOpportunities.filter(opp => opp.estimatedImpact >= this.config.minImpactThreshold);
        // Sort by priority and impact
        const sortedOpportunities = this.prioritizeOpportunities(filteredOpportunities);
        // Limit results
        const limitedOpportunities = sortedOpportunities.slice(0, this.config.maxOpportunitiesPerAnalysis);
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
        // Category-based priority: business_feature > technical_debt > test_coverage
        const categoryPriority = {
            'business_feature': 3, // Highest priority
            'technical_debt': 2,
            'test_coverage': 1, // Lowest
            'feature_gap': 2,
            'performance': 2,
            'security': 3,
            'testing': 1,
            'documentation': 1,
            'ux_improvement': 2
        };
        const priorityScore = {
            critical: 100,
            high: 75,
            medium: 50,
            low: 25
        };
        return opportunities.sort((a, b) => {
            // First sort by category priority
            const catDiff = (categoryPriority[b.category] || 0) - (categoryPriority[a.category] || 0);
            if (catDiff !== 0)
                return catDiff;
            // Then by urgency priority and impact
            const scoreA = priorityScore[a.priority] + a.estimatedImpact;
            const scoreB = priorityScore[b.priority] + b.estimatedImpact;
            return scoreB - scoreA;
        });
    }
    /**
     * Convert discovered gaps to evolution opportunities
     */
    convertGapsToOpportunities(gaps) {
        return gaps.map(gap => this.convertGapToOpportunity(gap));
    }
    /**
     * Convert a single gap to evolution opportunity
     */
    convertGapToOpportunity(gap) {
        // Map gap type to task category
        const categoryMap = {
            'missing_module': 'business_feature',
            'missing_api': 'business_feature',
            'incomplete_flow': 'business_feature',
            'missing_model': 'feature_gap',
            'config_mismatch': 'technical_debt'
        };
        // Map priority to opportunity priority
        const priorityMap = {
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
    async updateAgentsMd(gaps) {
        if (!this.agentsMdManager)
            return;
        try {
            for (const gap of gaps) {
                await this.agentsMdManager.addRequirement(gap);
            }
            this.logger.info(`📝 Updated AGENTS.md with ${gaps.length} requirements`);
        }
        catch (error) {
            this.logger.warn('⚠️ Failed to update AGENTS.md:', error.message);
        }
    }
    categorizeOpportunities(opportunities) {
        const categories = {};
        for (const opp of opportunities) {
            categories[opp.category] = (categories[opp.category] || 0) + 1;
        }
        return categories;
    }
    /**
     * Get the AgentsMdManager instance
     */
    getAgentsMdManager() {
        return this.agentsMdManager;
    }
    /**
     * Set project path and initialize managers
     */
    setProjectPath(projectPath) {
        this.projectPath = projectPath;
        this.requirementDiscoveryEngine = new RequirementDiscoveryEngine_1.RequirementDiscoveryEngine(projectPath);
        this.agentsMdManager = new AgentsMdManager_1.AgentsMdManager(projectPath);
    }
}
exports.OpportunityDetector = OpportunityDetector;
//# sourceMappingURL=OpportunityDetector.js.map