import { EvolutionOpportunity } from '../types';
export interface DriftIssue {
    type: 'jsdoc_mismatch' | 'readme_outdated' | 'comment_stale' | 'api_doc_drift';
    file: string;
    location: string;
    expected: string;
    actual: string;
    severity: 'info' | 'warning' | 'error';
}
export declare class DocumentationDriftAnalyzer {
    private logger;
    constructor();
    analyze(projectPath: string): Promise<EvolutionOpportunity[]>;
    private findJSDocDrift;
    private findReadmeDrift;
    private findStaleComments;
    private findAPIDocDrift;
}
//# sourceMappingURL=DocumentationDriftAnalyzer.d.ts.map