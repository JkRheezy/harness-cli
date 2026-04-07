/**
 * Types for Loop Execution System
 * Document-driven development
 */
export interface ParsedAgentsMd {
    projectName: string;
    description: string;
    techStack: string;
    quickStart: {
        setupCommands: string[];
        startCommand: string;
    };
    documentMap: ParsedDocumentMap[];
    commonTasks: ParsedCommonTask[];
    constraints: ParsedConstraint[];
}
export interface ParsedDocumentMap {
    document: string;
    path: string;
    readingTime: string;
    description: string;
}
export interface ParsedCommonTask {
    name: string;
    steps: string[];
}
export interface ParsedConstraint {
    type: 'must' | 'must-not' | 'should' | 'warning';
    description: string;
}
export interface LoopTask {
    id: string;
    name: string;
    description: string;
    source: 'agents-md' | 'architecture' | 'product-spec';
    priority: 'critical' | 'high' | 'medium' | 'low';
    estimatedEffort: 'small' | 'medium' | 'large';
    acceptanceCriteria: string[];
    constraints: string[];
    relatedDocs: string[];
}
export interface LoopContext {
    projectPath: string;
    parsedAgentsMd: ParsedAgentsMd;
    currentPhase: string;
    completedTasks: string[];
    pendingTasks: LoopTask[];
}
//# sourceMappingURL=types.d.ts.map