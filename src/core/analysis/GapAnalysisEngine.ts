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
export class GapAnalysisEngine {
  constructor(
    private specParser: SpecParser,
    private codeScanner: CodeScanner,
    private gapDetector: GapDetector,
    private taskGenerator: TaskGenerator
  ) {}

  /**
   * Runs the full analysis pipeline
   * @param projectPath - Path to the project root
   * @returns Array of business tasks to implement
   */
  async analyze(projectPath: string): Promise<BusinessTask[]> {
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
