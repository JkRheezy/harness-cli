import { SpecParser } from './SpecParser';
import { CodeScanner } from './CodeScanner';
import { GapDetector } from './GapDetector';
import { TaskGenerator } from './TaskGenerator';
import { BusinessTask } from './types';
/**
 * Main entry point for gap analysis
 * Orchestrates the full analysis pipeline:
 * 1. Parse specification documents
 * 2. Scan current codebase
 * 3. Detect gaps between target and current
 * 4. Generate business tasks to close gaps
 */
export declare class GapAnalysisEngine {
    private specParser;
    private codeScanner;
    private gapDetector;
    private taskGenerator;
    constructor(specParser: SpecParser, codeScanner: CodeScanner, gapDetector: GapDetector, taskGenerator: TaskGenerator);
    /**
     * Runs the full analysis pipeline
     * @param projectPath - Path to the project root
     * @returns Array of business tasks to implement
     */
    analyze(projectPath: string): Promise<BusinessTask[]>;
}
//# sourceMappingURL=GapAnalysisEngine.d.ts.map