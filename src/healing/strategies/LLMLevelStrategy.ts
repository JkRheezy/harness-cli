import { HealingAttempt, HealingCost, LLMSuggestedFix } from '../types';
import { LLMErrorAnalyzer } from '../llm/ErrorAnalyzer';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

/**
 * Intelligent healing using LLM analysis
 * More flexible but slower and more expensive
 */
export class LLMLevelStrategy {
  private analyzer: LLMErrorAnalyzer;
  private workingDir: string;
  private logger: any;
  private maxAttempts: number;
  
  constructor(
    llmCaller: (prompt: string) => Promise<string>,
    workingDir: string,
    logger: any,
    maxAttempts: number = 3
  ) {
    this.analyzer = new LLMErrorAnalyzer(llmCaller);
    this.workingDir = workingDir;
    this.logger = logger;
    this.maxAttempts = maxAttempts;
  }

  /**
   * Attempt to heal using LLM analysis
   */
  async heal(error: string | Error, context: any = {}): Promise<HealingAttempt> {
    const startTime = Date.now();
    const attempt: HealingAttempt = {
      level: 2,
      strategy: 'llm-analysis',
      success: false,
      durationMs: 0,
      cost: { llmCalls: 0, tokensUsed: 0, estimatedCost: 0 }
    };

    try {
      // Step 1: Analyze error with LLM
      this.logger.info('[LLMLevelStrategy] Analyzing error with LLM...');
      const analysis = await this.analyzer.analyze(
        typeof error === 'string' ? error : error.message,
        context
      );
      
      // Track cost (rough estimate)
      attempt.cost.llmCalls = 1;
      attempt.cost.tokensUsed = 1500; // Approximate
      attempt.cost.estimatedCost = 0.03; // $0.03 per analysis
      
      this.logger.info(`[LLMLevelStrategy] Root cause: ${analysis.rootCause}`);
      this.logger.info(`[LLMLevelStrategy] Confidence: ${analysis.confidence}`);
      
      // Step 2: Check if fixable
      if (!analysis.isFixable || analysis.confidence < 0.6) {
        attempt.error = `LLM confidence too low (${analysis.confidence}) or not fixable`;
        if (analysis.requiresHuman) {
          attempt.error += ' - requires human intervention';
        }
        attempt.durationMs = Date.now() - startTime;
        return attempt;
      }
      
      // Step 3: Apply fixes
      let anyFixApplied = false;
      
      for (const fix of analysis.suggestedFixes.slice(0, this.maxAttempts)) {
        this.logger.info(`[LLMLevelStrategy] Applying fix: ${fix.description}`);
        
        const applied = await this.applyFix(fix);
        if (applied) {
          anyFixApplied = true;
          attempt.appliedFix = {
            type: fix.type === 'run_command' ? 'command' : 
                  fix.type === 'install_dependency' ? 'command' : 'file',
            description: fix.description,
            files: fix.filePath ? [fix.filePath] : undefined,
            commands: fix.command ? [fix.command] : 
                      fix.packageName ? [`npm install ${fix.packageName}`] : undefined
          };
          break; // Only apply one fix at a time
        }
      }
      
      attempt.success = anyFixApplied;
      
    } catch (e: any) {
      attempt.error = `LLM healing failed: ${e.message}`;
    }

    attempt.durationMs = Date.now() - startTime;
    return attempt;
  }

  /**
   * Apply a single LLM-suggested fix
   */
  private async applyFix(fix: LLMSuggestedFix): Promise<boolean> {
    try {
      switch (fix.type) {
        case 'create_file':
          return await this.createFile(fix.filePath!, fix.content!);
          
        case 'modify_file':
          return await this.modifyFile(fix.filePath!, fix.content!);
          
        case 'run_command':
          return await this.runCommand(fix.command!);
          
        case 'install_dependency':
          return await this.installDependency(fix.packageName!);
          
        default:
          this.logger.warn(`[LLMLevelStrategy] Unknown fix type: ${fix.type}`);
          return false;
      }
    } catch (error: any) {
      this.logger.error(`[LLMLevelStrategy] Fix failed:`, error.message);
      return false;
    }
  }

  private async createFile(filePath: string, content: string): Promise<boolean> {
    const fullPath = path.join(this.workingDir, filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content);
    this.logger.info(`[LLMLevelStrategy] Created file: ${filePath}`);
    return true;
  }

  private async modifyFile(filePath: string, content: string): Promise<boolean> {
    const fullPath = path.join(this.workingDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
      this.logger.warn(`[LLMLevelStrategy] File not found for modification: ${filePath}`);
      return false;
    }
    
    fs.writeFileSync(fullPath, content);
    this.logger.info(`[LLMLevelStrategy] Modified file: ${filePath}`);
    return true;
  }

  private async runCommand(command: string): Promise<boolean> {
    this.logger.info(`[LLMLevelStrategy] Running command: ${command}`);
    await execAsync(command, { cwd: this.workingDir, timeout: 60000 });
    return true;
  }

  private async installDependency(packageName: string): Promise<boolean> {
    this.logger.info(`[LLMLevelStrategy] Installing dependency: ${packageName}`);
    await execAsync(`npm install ${packageName}`, { 
      cwd: this.workingDir, 
      timeout: 120000 
    });
    return true;
  }
}
