"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GapAnalysisEngine = void 0;
/**
 * Main entry point for gap analysis
 * Orchestrates the full analysis pipeline:
 * 1. Parse specification documents
 * 2. Scan current codebase
 * 3. Detect gaps between target and current
 * 4. Generate business tasks to close gaps
 */
class GapAnalysisEngine {
    constructor(specParser, codeScanner, gapDetector, taskGenerator) {
        this.specParser = specParser;
        this.codeScanner = codeScanner;
        this.gapDetector = gapDetector;
        this.taskGenerator = taskGenerator;
    }
    /**
     * Runs the full analysis pipeline
     * @param projectPath - Path to the project root
     * @returns Array of business tasks to implement
     */
    async analyze(projectPath) {
        // 1. Parse specification documents
        const target = await this.specParser.parse();
        // 2. Scan current codebase implementation
        const current = await this.codeScanner.scan();
        // 3. Detect gaps between target and current
        const gaps = this.gapDetector.detect(target, current);
        // 4. Generate business tasks to address gaps
        const tasks = this.taskGenerator.generate(gaps, target);
        return tasks;
    }
}
exports.GapAnalysisEngine = GapAnalysisEngine;
//# sourceMappingURL=GapAnalysisEngine.js.map