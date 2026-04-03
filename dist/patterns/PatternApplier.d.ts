/**
 * Base Pattern Applier
 *
 * Abstract base class providing common functionality for pattern appliers.
 * Pattern appliers overlay additional architecture on top of the six-layer foundation.
 */
import { Pattern, PatternApplication, PatternResult, FileModification, PatternApplier as IPatternApplier } from './types';
import { PatternChoice } from '../bootstrap/types';
/**
 * Abstract base class for pattern appliers
 */
export declare abstract class BasePatternApplier implements IPatternApplier {
    abstract readonly pattern: Pattern;
    /**
     * Check if this pattern can be applied to the given input
     */
    abstract canApply(input: {
        patterns?: PatternChoice[] | string[];
    }): boolean;
    /**
     * Apply the pattern to the target directory
     */
    abstract apply(application: PatternApplication): Promise<PatternResult>;
    /**
     * Ensure a directory exists, creating it if necessary
     */
    protected ensureDir(dir: string): Promise<void>;
    /**
     * Write content to a file, ensuring parent directory exists
     */
    protected writeFile(filePath: string, content: string): Promise<void>;
    /**
     * Read file content
     */
    protected readFile(filePath: string): Promise<string>;
    /**
     * Check if a file exists
     */
    protected fileExists(filePath: string): Promise<boolean>;
    /**
     * Create a standard pattern result
     */
    protected createResult(patternName: string, success: boolean, filesCreated?: string[], modifications?: FileModification[], error?: string): PatternResult;
    /**
     * Add a file creation modification
     */
    protected addModification(modifications: FileModification[], filePath: string, type: 'create' | 'modify' | 'delete', description: string): void;
}
//# sourceMappingURL=PatternApplier.d.ts.map