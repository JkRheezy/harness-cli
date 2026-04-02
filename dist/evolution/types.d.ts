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
    documentation?: {
        autoUpdate: boolean;
        maintainRoadmap: boolean;
    };
    businessContext?: BusinessContext;
}
export interface Gap {
    id: string;
    type: 'missing_module' | 'missing_api' | 'incomplete_flow' | 'missing_model' | 'config_mismatch';
    name: string;
    description: string;
    reason: string;
    priority: 'P0' | 'P1' | 'P2';
    suggestedScope: string;
    relatedFiles?: string[];
    detectedAt: Date;
}
export interface ModuleRequirement {
    name: string;
    description: string;
    requiredFiles: string[];
    optionalFiles?: string[];
    priority: 'P0' | 'P1' | 'P2';
}
export interface ArchitecturePattern {
    type: string;
    requiredModules: string[];
    optionalModules?: string[];
}
export interface RequirementDiscoveryResult {
    gaps: Gap[];
    existingModules: string[];
    missingModules: string[];
    incompleteFlows: string[];
    detectedAt: Date;
}
export interface AgentsMdEntry {
    module: string;
    description: string;
    status: 'implemented' | 'in_progress' | 'pending';
    priority?: string;
    reason?: string;
    completedAt?: Date;
}
export interface AgentsMdStructure {
    title: string;
    lastUpdated: Date;
    implemented: AgentsMdEntry[];
    inProgress: AgentsMdEntry[];
    pending: AgentsMdEntry[];
    techDebt?: AgentsMdEntry[];
}
export interface BusinessTask {
    id: string;
    title: string;
    description: string;
    requirements: string[];
    suggestedApproach: string[];
    acceptanceCriteria: string[];
    estimatedEffort: 'small' | 'medium' | 'large';
    priority: 'P0' | 'P1' | 'P2';
    relatedGap: Gap;
}
//# sourceMappingURL=types.d.ts.map