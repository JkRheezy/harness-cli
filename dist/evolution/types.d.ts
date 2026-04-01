/**
 * Auto-Evolution types for self-improving harness-loop
 */
export type EvolutionTrigger = 'queue_empty' | 'periodic_check' | 'quality_regression' | 'business_opportunity' | 'code_pattern_detected';
export type TaskCategory = 'technical_debt' | 'feature_gap' | 'performance' | 'security' | 'testing' | 'documentation' | 'business_feature' | 'ux_improvement';
export interface EvolutionOpportunity {
    id: string;
    category: TaskCategory;
    trigger: EvolutionTrigger;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedImpact: number;
    evidence: OpportunityEvidence[];
    suggestedApproach: string;
    relatedFiles?: string[];
    createdAt: Date;
}
export interface OpportunityEvidence {
    type: 'code_smell' | 'metric_regression' | 'user_flow_gap' | 'missing_feature' | 'pattern_match';
    description: string;
    location?: string;
    severity: 'info' | 'warning' | 'error';
}
export interface BusinessContext {
    domain: string;
    currentFeatures: string[];
    userFlows: UserFlow[];
    businessRules: BusinessRule[];
    competitors?: string[];
    targetUsers?: string;
}
export interface UserFlow {
    name: string;
    steps: string[];
    entryPoints: string[];
    conversionGoal?: string;
    currentIssues?: string[];
}
export interface BusinessRule {
    id: string;
    description: string;
    implementationFiles: string[];
    validationTests?: string[];
}
export interface EvolutionResult {
    opportunitiesFound: number;
    tasksGenerated: number;
    categories: Record<TaskCategory, number>;
    analysisDuration: number;
}
export interface EvolutionConfig {
    enabled: boolean;
    checkInterval: number;
    maxOpportunitiesPerAnalysis: number;
    minImpactThreshold: number;
    categories: {
        technical: boolean;
        business: boolean;
        ux: boolean;
    };
    businessContext?: BusinessContext;
}
//# sourceMappingURL=types.d.ts.map