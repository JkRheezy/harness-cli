/**
 * Types for Documentation Generator System
 * Knowledge base for Harness-generated projects
 */

export interface DocumentationInput {
  projectName: string;
  description: string;
  techStack: TechStackInfo;
  architecture: ArchitectureInfo;
  targetDir: string;
}

export interface TechStackInfo {
  language: string;
  frontend?: string;
  backend?: string;
  database?: string;
  deployment?: string;
  additional: string[];
}

export interface ArchitectureInfo {
  pattern: string;
  layers: string[];
  keyDecisions: ArchitecturalDecision[];
}

export interface ArchitecturalDecision {
  id: string;
  title: string;
  context: string;
  decision: string;
  consequences: string[];
  date: string;
}

export interface DocumentationResult {
  success: boolean;
  filesCreated: string[];
  filesModified: string[];
  error?: string;
}

export interface AgentsMdContent {
  projectName: string;
  description: string;
  techStack: string;
  quickStart: QuickStartSection;
  documentMap: DocumentMapEntry[];
  commonTasks: CommonTask[];
  constraints: Constraint[];
}

export interface QuickStartSection {
  setupCommands: string[];
  startCommand: string;
}

export interface DocumentMapEntry {
  document: string;
  path: string;
  readingTime: string;
  description: string;
}

export interface CommonTask {
  name: string;
  steps: string[];
}

export interface Constraint {
  type: 'must' | 'must-not' | 'should' | 'warning';
  description: string;
}

export interface ArchitectureDocContent {
  projectName: string;
  overview: string;
  layers: LayerInfo[];
  qualityScore: QualityScore;
  crossCutting: CrossCuttingConcern[];
}

export interface LayerInfo {
  name: string;
  description: string;
  directory: string;
  dependencies: string[];
  quality: LayerQuality;
}

export interface LayerQuality {
  coverage: number;
  complexity: 'low' | 'medium' | 'high';
  issues: string[];
}

export interface QualityScore {
  overall: number;
  byLayer: Record<string, number>;
  gaps: QualityGap[];
}

export interface QualityGap {
  layer: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
}

export interface CrossCuttingConcern {
  name: string;
  description: string;
  implementation: string;
}

export interface DesignDocContent {
  coreBeliefs: string[];
  patterns: PatternDoc[];
  decisions: ArchitecturalDecision[];
}

export interface PatternDoc {
  name: string;
  description: string;
  whenToUse: string[];
  whenNotToUse: string[];
}

export interface ExecPlanTemplate {
  phases: ExecPhase[];
  activePlans: string[];
  completedPlans: string[];
  techDebt: TechDebtItem[];
}

export interface ExecPhase {
  name: string;
  description: string;
  estimatedDays: number;
  dependencies: string[];
}

export interface TechDebtItem {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface ProductSpecContent {
  domain: string;
  features: FeatureSpec[];
  userFlows: UserFlow[];
  businessRules: BusinessRule[];
}

export interface FeatureSpec {
  name: string;
  description: string;
  status: 'implemented' | 'in-progress' | 'planned';
  priority: 'P0' | 'P1' | 'P2';
}

export interface UserFlow {
  name: string;
  steps: string[];
  entryPoints: string[];
}

export interface BusinessRule {
  id: string;
  description: string;
  implementation: string;
}
