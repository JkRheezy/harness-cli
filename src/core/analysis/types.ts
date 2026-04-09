/**
 * 规范驱动的差距分析 - 类型定义
 */

// ============================================================================
// 目标架构（来自规范文档）
// ============================================================================

export interface TargetArchitecture {
  version: string;
  parsedAt: Date;
  agents: AgentSpec[];
  modules: ModuleSpec[];
  interfaces: InterfaceSpec[];
  dataModels: DataModelSpec[];
  workflows: WorkflowSpec[];
}

export interface AgentSpec {
  name: string;
  description: string;
  responsibilities: string[];
  skills: string[];
  expectedFiles: string[];
  dependencies: string[];
}

export interface ModuleSpec {
  name: string;
  description: string;
  layer: 'api' | 'service' | 'data' | 'ui';
  exposedInterfaces: string[];
  dependencies: string[];
  expectedFiles: string[];
  acceptanceCriteria: string[];
}

export interface InterfaceSpec {
  name: string;
  type: 'class' | 'function' | 'api' | 'event';
  signature: string;
  module: string;
  description: string;
}

export interface DataModelSpec {
  name: string;
  fields: DataField[];
  relations: DataRelation[];
}

export interface DataField {
  name: string;
  type: string;
  optional: boolean;
}

export interface DataRelation {
  target: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface WorkflowSpec {
  name: string;
  description: string;
  steps: WorkflowStep[];
  participants: string[];
}

export interface WorkflowStep {
  name: string;
  description: string;
  actor: string;
}

// ============================================================================
// 当前实现（来自代码扫描）
// ============================================================================

export interface CurrentImplementation {
  scannedAt: Date;
  agents: ImplementedAgent[];
  modules: ImplementedModule[];
  files: SourceFile[];
  exports: ExportSymbol[];
}

export interface ImplementedAgent {
  name: string;
  files: string[];
  detectedResponsibilities: string[];
  completeness: number;
}

export interface ImplementedModule {
  name: string;
  files: string[];
  exportedSymbols: string[];
  detectedLayer?: string;
}

export interface SourceFile {
  path: string;
  type: 'ts' | 'tsx' | 'js' | 'json' | 'other';
  size: number;
  exports: string[];
  imports: string[];
}

export interface ExportSymbol {
  name: string;
  type: 'class' | 'function' | 'interface' | 'type' | 'const';
  file: string;
}

// ============================================================================
// 差距分析
// ============================================================================

export type GapType =
  | 'missing_agent'
  | 'missing_module'
  | 'incomplete_module'
  | 'missing_interface'
  | 'orphan_code'
  | 'doc_outdated';

export interface Gap {
  id: string;
  type: GapType;
  severity: 'blocking' | 'major' | 'minor';
  specRef: {
    document: string;
    section?: string;
    line?: number;
  };
  targetName: string;
  targetDescription: string;
  evidence: {
    expected: string;
    actual: string;
    missingItems?: string[];
    existingItems?: string[];
  };
  relatedFiles: string[];
}

// ============================================================================
// 业务任务
// ============================================================================

export interface BusinessTask {
  id: string;
  title: string;
  description: string;
  sourceGap: Gap;
  requirements: string[];
  suggestedApproach: string[];
  acceptanceCriteria: string[];
  priority: 'P0' | 'P1' | 'P2';
  estimatedEffort: 'small' | 'medium' | 'large';
  maxDuration: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
}
