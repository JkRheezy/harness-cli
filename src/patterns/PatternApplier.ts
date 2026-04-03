/**
 * Base Pattern Applier
 * 
 * Abstract base class providing common functionality for pattern appliers.
 * Pattern appliers overlay additional architecture on top of the six-layer foundation.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Pattern, PatternApplication, PatternResult, FileModification, PatternApplier as IPatternApplier } from './types';
import { PatternChoice } from '../bootstrap/types';

/**
 * Abstract base class for pattern appliers
 */
export abstract class BasePatternApplier implements IPatternApplier {
  abstract readonly pattern: Pattern;

  /**
   * Check if this pattern can be applied to the given input
   */
  abstract canApply(input: { patterns?: PatternChoice[] | string[] }): boolean;

  /**
   * Apply the pattern to the target directory
   */
  abstract apply(application: PatternApplication): Promise<PatternResult>;

  /**
   * Ensure a directory exists, creating it if necessary
   */
  protected async ensureDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Write content to a file, ensuring parent directory exists
   */
  protected async writeFile(filePath: string, content: string): Promise<void> {
    await this.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Read file content
   */
  protected async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  /**
   * Check if a file exists
   */
  protected async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a standard pattern result
   */
  protected createResult(
    patternName: string,
    success: boolean,
    filesCreated: string[] = [],
    modifications: FileModification[] = [],
    error?: string
  ): PatternResult {
    return {
      pattern: patternName,
      success,
      filesCreated,
      modifications,
      error
    };
  }

  /**
   * Add a file creation modification
   */
  protected addModification(
    modifications: FileModification[],
    filePath: string,
    type: 'create' | 'modify' | 'delete',
    description: string
  ): void {
    modifications.push({
      path: filePath,
      type,
      description
    });
  }
}
