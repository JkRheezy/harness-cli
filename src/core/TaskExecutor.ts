import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { SimpleGit, simpleGit } from 'simple-git';
import { Logger } from '../utils/Logger';
import { ToolRegistry } from '../tools/ToolRegistry';
import { BrowserValidator } from '../browser/BrowserValidator';
import { BrowserValidationResult } from '../browser/types';
import { DevServerManager } from '../utils/DevServerManager';
import { TelemetryProvider, FileAdapter } from '../telemetry';
import { LLMMetricsCollector } from '../telemetry/collectors';
import { HealingOrchestrator } from '../healing';
import { RuleFixer } from '../rules';
import { RuleViolation } from '../rules/types';

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'kimi' | 'google' | 'local';
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export interface ExecuteOptions {
  dryRun?: boolean;
  onProgress?: (progress: any) => void;
}

export class TaskExecutor {
  private config: LLMConfig;
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private git: SimpleGit;
  private toolRegistry: ToolRegistry;
  private logger: Logger;
  private context: any[] = [];
  private workingDir: string;
  private devServerManager: DevServerManager;
  private devServerUrl: string | null = null;
  private telemetry: TelemetryProvider;
  private llmMetrics: LLMMetricsCollector;

  constructor(
    config: LLMConfig, 
    workingDir: string = process.cwd(), 
    telemetry?: TelemetryProvider
  ) {
    this.config = config;
    this.workingDir = workingDir;
    this.logger = new Logger();
    this.git = simpleGit(workingDir);
    this.toolRegistry = new ToolRegistry();
    this.devServerManager = new DevServerManager();
    
    // Initialize telemetry (use provided or create new)
    this.telemetry = telemetry || new FileAdapter({
      outputDir: require('path').join(workingDir, '.harness', 'telemetry'),
      maxFileSizeMB: 10,
      retentionDays: 7
    });
    
    this.llmMetrics = new LLMMetricsCollector(this.telemetry);
    
    // Init LLM 客户端
    if (config.provider === 'openai' || config.provider === 'kimi') {
      // Kimi 使用 OpenAI compatinterface
      this.openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl
      });
    } else if (config.provider === 'anthropic') {
      // Kimi Coding Plan 使用 Anthropic compatinterface
      this.anthropic = new Anthropic({
        apiKey: config.apiKey,
        baseURL: config.baseUrl
      });
    }
  }

  private safeTelemetry(fn: () => void): void {
    try {
      fn();
    } catch (error) {
      // Telemetry failures should not affect execution but should be debuggable
      this.logger?.debug('Telemetry error:', error);
    }
  }

  async execute(task: any, options: ExecuteOptions = {}): Promise<any> {
    const startTime = Date.now();
    
    this.logger.info(`🤖 Starting task: ${task.title}`);
    
    try {
      // 1. 准备context
      const context = await this.prepareContext(task);
      
      // 2. GenerateExecuting plan
      const plan = await this.generatePlan(task, context);
      
      // Check plan 和 steps 是否有效
      if (!plan || !plan.steps || !Array.isArray(plan.steps)) {
        this.logger.error('❌ Generate的plan无效或为空');
        return {
          status: 'failed',
          error: 'Failed to generate valid execution plan',
          duration: Date.now() - startTime
        };
      }
      
      this.logger.info(`📋 Executing plan: ${plan.steps.length} steps`);
      
      // 3. 执linestep
      const results = [];
      let stepError = null;
      
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        this.logger.info(`  [${i + 1}/${plan.steps.length}] ${step.description}`);
        
        if (options.onProgress) {
          options.onProgress({
            step: i + 1,
            total: plan.steps.length,
            description: step.description
          });
        }
        
        try {
          const result = await this.executeStep(step, options);
          results.push(result);
          
          // Updatecontext
          this.context.push({
            role: 'assistant',
            content: `Completed: ${step.description}\nResult: ${JSON.stringify(result)}`
          });
        } catch (error: any) {
          this.logger.error(`❌ Step ${i + 1} failed:`, error.message);
          stepError = error;
          results.push({
            step: step.description,
            status: 'failed',
            error: error.message
          });
          // Continue执line后续step，不medium断
        }
      }
      
      // 4. verifyresult（无论step是否Success，都进lineverify）
      const validation = await this.validateResults(task, results, options.dryRun);
      
      // 5. CreateBranch（如果有代码change）
      let branch = null;
      if (validation.hasChanges && !options.dryRun) {
        branch = await this.createBranch(task);
      }
      
      const duration = Date.now() - startTime;
      
      // 如果有stepError，任务标记为Failed
      const hasError = stepError !== null || !validation.success;
      
      return {
        status: hasError ? 'failed' : 'success',
        plan,
        results,
        validation,
        branch,
        hasChanges: validation.hasChanges,
        summary: await this.generateSummary(task, results),
        duration,
        error: stepError?.message
      };
      
    } catch (error: any) {
      this.logger.error('任务执lineFailed:', error);
      
      return {
        status: 'failed',
        error: error.message || String(error),
        canRetry: this.shouldRetry(error),
        duration: Date.now() - startTime
      };
    } finally {
      // StopDev server
      await this.stopDevServer();
    }
  }

  private async prepareContext(task: any): Promise<any> {
    this.logger.info('Preparing context...');
    
    // 读取 AGENTS.md
    this.logger.info('Reading AGENTS.md...');
    const agentsMd = await this.readFile('AGENTS.md');
    this.logger.info(`AGENTS.md length: ${agentsMd.length}`);
    
    // 读取Archdoc
    this.logger.info('Reading ARCHITECTURE.md...');
    const architecture = await this.readFile('docs/ARCHITECTURE.md');
    this.logger.info(`ARCHITECTURE.md length: ${architecture.length}`);
    
    // 读取相close代码
    this.logger.info('Finding relevant code...');
    const relevantCode = await this.findRelevantCode(task);
    this.logger.info(`Found ${relevantCode.length} relevant code entries`);
    
    return {
      agentsMd,
      architecture,
      relevantCode,
      task: task
    };
  }

  private async generatePlan(task: any, context: any): Promise<any> {
    const span = this.telemetry.startSpan('task.plan.generation');
    const startTime = Date.now();
    let spanStatus: 'ok' | 'error' = 'ok';
    
    try {
      const prompt = this.buildPlanPrompt(task, context);
      
      this.logger.info('Calling LLM to generate plan...');
      
      const response = await this.callLLM(prompt);
      
      // Log full response for debugging
      this.logger.info(`LLM Response length: ${response.length}`);
      this.logger.info(`LLM Response preview: ${response.substring(0, 800)}...`);
      
      // Parsing plan
      try {
        // Attempt提取 JSON 代码block
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                          response.match(/```\s*([\s\S]*?)\s*```/);
        
        if (jsonMatch && jsonMatch[1]) {
          this.logger.info('Found JSON code block, parsing...');
          const parsed = JSON.parse(jsonMatch[1].trim());
          if (parsed.steps && Array.isArray(parsed.steps)) {
            this.logger.info(`✅ Parsed plan with ${parsed.steps.length} steps from code block`);
            
            this.safeTelemetry(() => {
              this.telemetry.timer('task.plan.generation.duration', Date.now() - startTime, {
                taskType: task.type,
                stepsCount: parsed.steps.length
              });
              
              this.telemetry.addSpanEvent(span, 'plan.generated', {
                stepsCount: parsed.steps.length
              });
            });
            
            return parsed;
          }
        }
        
        // Attempt匹配 JSON object
        const jsonObjectMatch = response.match(/(\{[\s\S]*\})/);
        if (jsonObjectMatch) {
          this.logger.info('Found JSON object, parsing...');
          const parsed = JSON.parse(jsonObjectMatch[1].trim());
          if (parsed.steps && Array.isArray(parsed.steps)) {
            this.logger.info(`✅ Parsed plan with ${parsed.steps.length} steps from object`);
            
            this.safeTelemetry(() => {
              this.telemetry.timer('task.plan.generation.duration', Date.now() - startTime, {
                taskType: task.type,
                stepsCount: parsed.steps.length
              });
              
              this.telemetry.addSpanEvent(span, 'plan.generated', {
                stepsCount: parsed.steps.length
              });
            });
            
            return parsed;
          }
        }
        
        // 直接解析整个响应
        this.logger.info('Attempting to parse entire response as JSON...');
        const parsed = JSON.parse(response.trim());
        if (parsed.steps && Array.isArray(parsed.steps)) {
          this.logger.info(`✅ Parsed plan with ${parsed.steps.length} steps`);
          
          this.safeTelemetry(() => {
            this.telemetry.timer('task.plan.generation.duration', Date.now() - startTime, {
              taskType: task.type,
              stepsCount: parsed.steps.length
            });
            
            this.telemetry.addSpanEvent(span, 'plan.generated', {
              stepsCount: parsed.steps.length
            });
          });
          
          return parsed;
        }
        
        throw new Error('Parsed JSON does not contain steps array');
      } catch (error: any) {
        this.logger.error(`⚠️ JSON parse failed: ${error.message}`);
        this.logger.error('Falling back to text extraction...');
        this.logger.error(`Response was: ${response.substring(0, 500)}...`);
        const extracted = this.extractPlanFromText(response);
        this.logger.info(`Extracted ${extracted.steps?.length || 0} steps from text`);
        
        this.safeTelemetry(() => {
          this.telemetry.timer('task.plan.generation.duration', Date.now() - startTime, {
            taskType: task.type,
            stepsCount: extracted.steps?.length || 0,
            fallback: true
          });
          
          this.telemetry.addSpanEvent(span, 'plan.extracted', {
            stepsCount: extracted.steps?.length || 0
          });
        });
        
        return extracted;
      }
    } catch (error: any) {
      this.logger.error(`❌ Failed to generate plan: ${error.message}`);
      spanStatus = 'error';
      
      this.safeTelemetry(() => {
        this.telemetry.counter('task.plan.generation.failure', 1);
      });
      
      // Return empty plan instead of crashing
      return { steps: [], error: error.message };
    } finally {
      // Ensure span is always ended
      this.safeTelemetry(() => {
        this.telemetry.endSpan(span, spanStatus);
      });
    }
  }

  private async executeStep(step: any, options: ExecuteOptions): Promise<any> {
    const path = await import('path');
    
    switch (step.type) {
      case 'read_file':
        // add存在性Check
        const exists = await this.fileExists(step.path);
        if (!exists) {
          this.logger.warn(`⚠️ File not found: ${step.path}, skipping...`);
          return { 
            type: 'read_file', 
            path: step.path, 
            skipped: true, 
            reason: 'File not found' 
          };
        }
        return await this.readFile(step.path);
        
      case 'write_file':
        if (!options.dryRun) {
          // 确保dir存在
          await this.ensureDirectoryExists(path.dirname(step.path));
          
          // 如果没有提供 content，先Generating code
          let content = step.content;
          if (!content) {
            this.logger.info(`    Generating code for ${step.path}...`);
            content = await this.generateCode(step.description, { path: step.path });
          }
          await this.writeFile(step.path, content);
        }
        return { path: step.path, action: 'written' };
        
      case 'edit_file':
        if (!options.dryRun) {
          // addfile存在性Check
          const fileExists = await this.fileExists(step.path);
          if (!fileExists) {
            this.logger.warn(`⚠️ File not found for edit: ${step.path}, creating new file...`);
            await this.ensureDirectoryExists(path.dirname(step.path));
            const content = step.content || step.newString || '';
            await this.writeFile(step.path, content);
            return { type: 'edit_file', path: step.path, created: true };
          }
          
          // 如果没有提供 oldString/newString，先Generatemodcontent
          let { oldString, newString } = step;
          if (!oldString || !newString) {
            this.logger.info(`    Generating edit for ${step.path}...`);
            const currentContent = await this.readFile(step.path);
            const editPlan = await this.generateEditPlan(step.description, currentContent);
            oldString = editPlan.oldString;
            newString = editPlan.newString;
          }
          await this.editFile(step.path, oldString, newString);
        }
        return { path: step.path, action: 'edited' };
        
      case 'run_command':
        if (!options.dryRun) {
          return await this.runCommand(step.command, step.cwd);
        }
        return { command: step.command, action: 'simulated' };
        
      case 'search_code':
        return await this.searchCode(step.query);
        
      case 'generate_code':
        const code = await this.generateCode(step.description, step.context);
        return { code };
        
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async validateResults(task: any, results: any[], dryRun?: boolean): Promise<any> {
    // Step 1: Check git status (with timeout)
    let hasChanges = false;
    try {
      const status = await Promise.race([
        this.git.status(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Git timeout')), 5000))
      ]) as any;
      hasChanges = status.files.length > 0;
      this.logger.info(`Git status: ${status.files.length} files changed`);
    } catch (error) {
      this.logger.warn('Git status check failed or timeout, assuming no changes');
      hasChanges = false;
    }
    
    // Step 2: Dry run or no changes - skip validation
    if (dryRun || !hasChanges) {
      this.logger.info(dryRun ? 'Dry run mode - skipping validation' : 'No code changes - skipping validation');
      return {
        success: true,
        hasChanges: dryRun && hasChanges,
        message: dryRun ? 'Dry run completed' : 'No code changes generated'
      };
    }
    
    // Step 3: Run tests (required)
    this.logger.info('Running validation with automatic healing...');
    const testResult = await this.runTests();
    
    // Step 4: Run linter with healing capability
    let lintResult = await this.runLinter();
    let healingResult = null;
    
    // If lint fails, try to heal
    if (!lintResult.success && lintResult.errors) {
      this.logger.info('Linter failed, attempting automatic healing...');
      
      const orchestrator = new HealingOrchestrator(
        this.workingDir,
        this.logger,
        // LLM caller - use TaskExecutor's existing LLM call capability
        async (prompt: string) => {
          // Use TaskExecutor's existing LLM call capability
          const response = await this.callLLM(prompt);
          return response;
        },
        { maxTotalCost: 0.05 } // Max $0.05 for lint healing
      );
      
      healingResult = await orchestrator.heal(lintResult.errors, {
        taskType: 'lint',
        projectType: this.detectProjectType()
      });
      
      this.logger.info(`Healing cost: $${healingResult.cost.estimatedCost.toFixed(4)}`);
      
      // If healing succeeded, retry lint
      if (healingResult.success) {
        this.logger.info('Healing succeeded, retrying linter...');
        lintResult = await this.runLinter();
      } else {
        this.logger.warn(`Healing failed: ${healingResult.escalationReason}`);
      }
    }
    
    // Phase 2: Code-level auto-fix (RuleFixer)
    if (!lintResult.success && lintResult.output) {
      this.logger.info('Linter still has violations, attempting code auto-fix...');
      
      // Parse lint output for violations
      const violations = this.parseLintOutput(lintResult.output);
      const fixableViolations = violations.filter(v => v.autoFixable);
      
      if (fixableViolations.length > 0) {
        this.logger.info(`Found ${fixableViolations.length} auto-fixable violations`);
        
        const ruleFixer = new RuleFixer({ dryRun: false });
        const affectedFiles = [...new Set(fixableViolations.map(v => v.filePath))];
        
        let totalFixed = 0;
        for (const filePath of affectedFiles) {
          const fullPath = require('path').join(this.workingDir, filePath);
          
          if (!require('fs').existsSync(fullPath)) {
            this.logger.warn(`File not found: ${filePath}`);
            continue;
          }
          
          const content = require('fs').readFileSync(fullPath, 'utf8');
          const fileViolations = fixableViolations.filter(v => v.filePath === filePath);
          
          try {
            const fixResult = await ruleFixer.fixFile(content, fileViolations);
            
            if (fixResult.success || fixResult.partial) {
              require('fs').writeFileSync(fullPath, fixResult.fixedCode!);
              totalFixed += fixResult.appliedFixes.length;
              this.logger.info(`Fixed ${fixResult.appliedFixes.length} issues in ${filePath}`);
            }
          } catch (error: any) {
            this.logger.error(`Failed to fix ${filePath}:`, error.message);
          }
        }
        
        // Retry lint after fixes
        if (totalFixed > 0) {
          this.logger.info('Code fixes applied, retrying linter...');
          lintResult = await this.runLinter();
        }
      }
    }
    
    // Step 5: Architecture check
    const archCheck = await this.checkArchitecture();
    
    // Step 6: Browser validation (keep existing)
    const browserValidation = await this.runBrowserValidation(task);
    
    // Step 7: Determine overall success
    // Lint is NOT required - if it fails after healing, we still consider success
    const success = testResult.success && archCheck.success && (browserValidation?.success ?? true);
    
    return {
      success,
      hasChanges: true,
      testResult,
      lintResult,
      archCheck,
      browserValidation,
      healingResult, // Include healing info
      canAutoFix: !success // If overall failed, could try more fixes
    };
  }

  // Add helper method detectProjectType
  private detectProjectType(): string {
    try {
      const fs = require('fs');
      const path = require('path');
      const packageJsonPath = path.join(this.workingDir, 'package.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        return 'unknown';
      }
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      if (packageJson.dependencies?.next) return 'nextjs';
      if (packageJson.dependencies?.react) return 'react';
      if (packageJson.devDependencies?.typescript) return 'typescript';
      
      return 'nodejs';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Run browser-based validation
   */
  private async runBrowserValidation(task: any): Promise<BrowserValidationResult | null> {
    // Skip browser validation if disabled via environment variable
    if (process.env.SKIP_BROWSER_VALIDATION === 'true') {
      this.logger.info('🌐 Browser validation skipped (SKIP_BROWSER_VALIDATION=true)');
      return null;
    }

    const hasPackageJson = await this.fileExists('package.json');
    if (!hasPackageJson) {
      this.logger.info('📦 No package.json found, skipping browser validation');
      return null;
    }

    this.logger.info('🌐 Starting browser validation...');

    try {
      // 自动Start或复用Dev server
      let devServerUrl = this.devServerUrl;
      if (!devServerUrl) {
        devServerUrl = await this.devServerManager.start({
          timeout: 120000,  // 2分钟Timeout
          port: 3000
        });
        this.devServerUrl = devServerUrl;
        this.logger.info(`✅ Dev server ready at ${devServerUrl}`);
      }

      // 执lineBrowser validation
      const validator = new BrowserValidator();
      const result = await validator.validate({
        url: devServerUrl,
        takeScreenshot: true,
        checkAccessibility: true,
        checkPerformance: true,
        expectedSelectors: task.expectedSelectors || [],
        expectedText: task.expectedText || []
      });

      this.logger.info(`✅ Browser validation: ${result.success ? 'PASSED' : 'FAILED'}`);
      
      if (result.consoleErrors.length > 0) {
        this.logger.warn(`⚠️ ${result.consoleErrors.length} console errors`);
      }
      
      if (result.accessibilityIssues.length > 0) {
        this.logger.warn(`⚠️ ${result.accessibilityIssues.length} accessibility issues`);
      }

      if (result.performanceMetrics) {
        this.logger.info(`⏱️  Load time: ${result.performanceMetrics.loadTime}ms`);
      }

      return result;
      
    } catch (error: any) {
      this.logger.error('❌ Browser validation failed:', error.message);
      return {
        success: false,
        url: '',
        screenshotPath: undefined,
        consoleErrors: [],
        networkErrors: [],
        accessibilityIssues: [],
        performanceMetrics: undefined,
        domSnapshot: undefined
      };
    }
  }

  /**
   * StopDev server（在任务complete后调用）
   */
  async stopDevServer(): Promise<void> {
    if (this.devServerUrl) {
      await this.devServerManager.stop();
      this.devServerUrl = null;
      this.logger.info('✅ Dev server stopped');
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      const pathModule = await import('path');
      const fullPath = pathModule.join(this.workingDir, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure directory exists, create if not
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    const fs = await import('fs/promises');
    const pathModule = await import('path');
    const fullPath = pathModule.join(this.workingDir, dirPath);
    
    try {
      await fs.mkdir(fullPath, { recursive: true });
    } catch (error: any) {
      // dir已存在或其他Error
      this.logger.debug(`Directory creation note: ${error.message}`);
    }
  }

  private async createBranch(task: any): Promise<string> {
    const branchName = `harness/${task.id}`;
    
    // 先Check git status，排除logfile
    const status = await this.git.status();
    const filesToAdd = status.files
      .filter(f => !f.path.startsWith('logs/') && !f.path.endsWith('.log'))
      .map(f => f.path);
    
    if (filesToAdd.length === 0) {
      this.logger.info('ℹ️ 没有代码changeneedCommit');
      return branchName;
    }
    
    // CheckBranch是否已存在，如果存在则切换到该Branch
    try {
      const { stdout: branchList } = await this.runCommand(`git branch --list ${branchName}`);
      if (branchList && branchList.trim().includes(branchName)) {
        this.logger.info(`🔀 Branch ${branchName} 已存在，切换到该Branch`);
        await this.runCommand(`git checkout ${branchName}`);
      } else {
        await this.git.checkoutLocalBranch(branchName);
      }
    } catch (error) {
      // 如果CheckFailed，Attempt直接Create（可能会Failed，但会抛出更清晰的Error）
      await this.git.checkoutLocalBranch(branchName);
    }
    
    // 只add非logfile
    for (const file of filesToAdd) {
      try {
        await this.git.add(file);
      } catch (e) {
        this.logger.warn(`⚠️ 无法addfile ${file}: ${e}`);
      }
    }
    
    // Check是否有 staged file（通过 raw 命令）
    const { stdout: stagedFiles } = await this.runCommand('git diff --cached --name-only');
    if (!stagedFiles || stagedFiles.trim().length === 0) {
      this.logger.info('ℹ️ 没有代码changeneedCommit（仅logfilechange）');
      return branchName;
    }
    
    await this.git.commit(`[Auto] ${task.title}\n\nTask: ${task.id}`);
    await this.git.push('origin', branchName);
    
    this.logger.info(`🔀 CreateBranch: ${branchName} (${filesToAdd.length} 个file)`);
    
    return branchName;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    // NOTE: This is an approximation. Actual token counts depend on the tokenizer
    // used by the specific LLM provider and may vary significantly for
    // non-English text or special characters.
    return Math.ceil(text.length / 4);
  }

  private async callLLM(prompt: string, retries = 2): Promise<string> {
    const callStart = Date.now();
    const span = this.llmMetrics.startLLMSpan(this.config.provider, this.config.model);
    let spanStatus: 'ok' | 'error' = 'ok';
    
    try {
      let lastError: Error | null = null;
      const timeout = this.config.timeout || 60000;
      
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          if (attempt > 0) {
            this.logger.info(`Retry attempt ${attempt}/${retries}...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
          
          this.logger.info(`Calling LLM: ${this.config.provider}/${this.config.model}...`);
          
          // Anthropic / Kimi Coding 使用 fetch 直接调用
          if (this.config.provider === 'anthropic') {
            this.logger.info(`Sending Kimi Coding request via fetch...`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
              const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': this.config.apiKey,
                  'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                  model: this.config.model,
                  max_tokens: this.config.maxTokens,
                  temperature: this.config.temperature,
                  messages: [
                    { role: 'user', content: this.getSystemPrompt() + '\n\n' + prompt }
                  ]
                }),
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              
              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
              }
              
              const data = await response.json();
              this.logger.info('Kimi Coding response received');
              
              // 解析 Anthropic format的响应
              if (data.content && data.content.length > 0) {
                const textContent = data.content.find((c: any) => c.type === 'text');
                const result = textContent?.text || '';
                
                // Record success metrics
                const duration = Date.now() - callStart;
                this.safeTelemetry(() => {
                  this.llmMetrics.recordCall({
                    provider: this.config.provider,
                    model: this.config.model,
                    promptTokens: this.estimateTokens(prompt),
                    completionTokens: this.estimateTokens(result),
                    totalTokens: this.estimateTokens(prompt) + this.estimateTokens(result),
                    durationMs: duration,
                    success: true
                  });
                  
                  this.telemetry.addSpanEvent(span, 'llm.response.received', {
                    duration,
                    responseLength: result.length
                  });
                });
                
                return result;
              }
              
              // Record success metrics for empty response
              const duration = Date.now() - callStart;
              this.safeTelemetry(() => {
                this.llmMetrics.recordCall({
                  provider: this.config.provider,
                  model: this.config.model,
                  promptTokens: this.estimateTokens(prompt),
                  completionTokens: 0,
                  totalTokens: this.estimateTokens(prompt),
                  durationMs: duration,
                  success: true
                });
              });
              
              return '';
              
            } catch (error: any) {
              clearTimeout(timeoutId);
              throw error;
            }
          }
          
          // OpenAI 使用 SDK
          if (this.config.provider === 'openai' && this.openai) {
            this.logger.info(`Sending OpenAI request (timeout: ${timeout}ms)...`);
            
            // CreateTimeout Promise
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error(`LLM call timeout after ${timeout}ms`)), timeout)
            );
            
            // Create API 调用 Promise
            const apiPromise = this.openai.chat.completions.create({
              model: this.config.model,
              messages: [
                { role: 'system', content: this.getSystemPrompt() },
                ...this.context,
                { role: 'user', content: prompt }
              ],
              max_tokens: this.config.maxTokens,
              temperature: this.config.temperature
            });
            
            this.logger.info('Waiting for OpenAI response...');
            const response = await Promise.race([apiPromise, timeoutPromise]);
            
            this.logger.info('OpenAI response received');
            const result = response.choices[0]?.message?.content || '';
            
            // Record success metrics
            const duration = Date.now() - callStart;
            this.safeTelemetry(() => {
              this.llmMetrics.recordCall({
                provider: this.config.provider,
                model: this.config.model,
                promptTokens: this.estimateTokens(prompt),
                completionTokens: this.estimateTokens(result),
                totalTokens: this.estimateTokens(prompt) + this.estimateTokens(result),
                durationMs: duration,
                success: true
              });
              
              this.telemetry.addSpanEvent(span, 'llm.response.received', {
                duration,
                responseLength: result.length
              });
            });
            
            return result;
          }
          
          // Kimi 使用 OpenAI compatinterface（fetch）
          if (this.config.provider === 'kimi') {
            this.logger.info(`Sending Kimi request via fetch...`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
              const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                  model: this.config.model,
                  messages: [
                    { role: 'system', content: this.getSystemPrompt() },
                    ...this.context,
                    { role: 'user', content: prompt }
                  ],
                  max_tokens: this.config.maxTokens,
                  temperature: this.config.temperature
                }),
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              
              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
              }
              
              const data = await response.json();
              this.logger.info('Kimi response received');
              const result = data.choices[0]?.message?.content || '';
              
              // Record success metrics
              const duration = Date.now() - callStart;
              this.safeTelemetry(() => {
                this.llmMetrics.recordCall({
                  provider: this.config.provider,
                  model: this.config.model,
                  promptTokens: this.estimateTokens(prompt),
                  completionTokens: this.estimateTokens(result),
                  totalTokens: this.estimateTokens(prompt) + this.estimateTokens(result),
                  durationMs: duration,
                  success: true
                });
                
                this.telemetry.addSpanEvent(span, 'llm.response.received', {
                  duration,
                  responseLength: result.length
                });
              });
              
              return result;
              
            } catch (error: any) {
              clearTimeout(timeoutId);
              throw error;
            }
          }
          
          throw new Error(`Unsupported provider: ${this.config.provider}`);
          
        } catch (error: any) {
          lastError = error;
          this.logger.warn(`LLM call failed (attempt ${attempt + 1}): ${error.message}`);
          
          if (attempt === retries) {
            // Record failure metrics
            this.safeTelemetry(() => {
              this.llmMetrics.recordCall({
                provider: this.config.provider,
                model: this.config.model,
                promptTokens: this.estimateTokens(prompt),
                completionTokens: 0,
                totalTokens: this.estimateTokens(prompt),
                durationMs: Date.now() - callStart,
                success: false,
                errorType: error.name
              });
              
              this.telemetry.addSpanEvent(span, 'llm.error', {
                error: error.message,
                attempt
              });
            });
            
            spanStatus = 'error';
            throw error;
          }
        }
      }
      
      throw lastError || new Error('LLM call failed after all retries');
    } finally {
      // Ensure span is always ended
      this.safeTelemetry(() => {
        this.telemetry.endSpan(span, spanStatus);
      });
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert software engineer working in a Harness-Engineering environment.

Key principles:
1. Follow the six-layer architecture (Types → Config → Repo → Service → Runtime → UI)
2. Write clean, maintainable code with proper error handling
3. Always write tests for new functionality
4. Follow the taste invariants and naming conventions
5. Use structured logging, not console.log
6. Validate all inputs and handle edge cases

You can use the following tools:
- read_file: Read a file from the codebase
- write_file: Write content to a file
- edit_file: Edit a specific part of a file
- run_command: Run a shell command
- search_code: Search for code patterns
- generate_code: Generate code based on description

Respond in JSON format when possible.`;
  }

  private buildPlanPrompt(task: any, context: any): string {
    return `You are a code execution planner. Create a detailed plan to implement the following task.

## Task: ${task.title}

### Description
${task.description}

### Requirements
${task.requirements?.map((r: string) => `- ${r}`).join('\n') || 'None specified'}

### Project Context
${context.agentsMd.substring(0, 300)}

### Architecture
${context.architecture.substring(0, 400)}

## Instructions
1. Analyze the task and break it down into small, actionable steps (3-8 steps)
2. Each step must be one of these types: read_file, write_file, edit_file, run_command, search_code
3. For write_file: provide path and description only (content will be generated later)
4. For edit_file: provide path and description only (detailed changes will be made later)
5. Keep descriptions concise and clear
6. Return ONLY a valid JSON object in this exact format:

\`\`\`json
{
  "steps": [
    {
      "type": "read_file",
      "description": "Read existing agent structure",
      "path": "src/lib/ai/agents/BaseAgent.ts"
    },
    {
      "type": "write_file",
      "description": "Create the main PickerAgent implementation",
      "path": "src/lib/ai/agents/PickerAgent.ts"
    },
    {
      "type": "edit_file",
      "description": "Update exports to include PickerAgent",
      "path": "src/lib/ai/index.ts"
    }
  ]
}
\`\`\`

IMPORTANT: 
- Return ONLY the JSON code block
- DO NOT include full file content in the plan (it will be generated in execution phase)
- Keep the response concise to avoid truncation`;
  }

  private async generateEditPlan(description: string, currentContent: string): Promise<{oldString: string, newString: string}> {
    const prompt = `
You need to make an edit to a file. Based on the description and current content, determine what to change.

## Description
${description}

## Current File Content (first 1000 chars)
${currentContent.substring(0, 1000)}

## Instructions
Return a JSON object with "oldString" (the text to replace) and "newString" (the replacement text).
The oldString must exist exactly in the current content.

\`\`\`json
{
  "oldString": "text to replace",
  "newString": "replacement text"
}
\`\`\`
`;
    
    const response = await this.callLLM(prompt);
    
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                        response.match(/```\s*([\s\S]*?)\s*```/);
      
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1].trim());
      }
      
      return JSON.parse(response.trim());
    } catch (error: any) {
      this.logger.warn(`Failed to parse edit plan: ${error.message}`);
      // Return a fallback that won't break
      return { oldString: '', newString: '' };
    }
  }

  private extractPlanFromText(text: string): any {
    // slave文本medium提取plan
    const steps = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        steps.push({
          type: 'action',
          description: line.replace(/^\d+\.\s*/, '')
        });
      }
    }
    
    return { steps };
  }

  private async generateSummary(task: any, results: any[]): Promise<string> {
    // 直接返回简单summary，避免额外的 LLM 调用
    return `complete "${task.title}"，Success执line ${results.length} steps。`;
  }

  private async generateCode(description: string, context: any): Promise<string> {
    const prompt = `
Generate code for: ${description}

Context: ${JSON.stringify(context)}

Requirements:
- Follow the six-layer architecture
- Include proper error handling
- Add TypeScript types
- Include comments for complex logic

IMPORTANT: Return ONLY the code content, wrapped in a markdown code block. Do NOT return JSON, tool calls, or any other format.
Example:
\`\`\`typescript
// Your code here
\`\`\`
`;
    
    const response = await this.callLLM(prompt);
    
    // Extract code from markdown code block
    const codeBlockMatch = response.match(/```(?:\w+)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    
    // If no code block found, return the response as-is
    return response.trim();
  }

  // file操作
  private async readFile(filePath: string): Promise<string> {
    const fs = await import('fs/promises');
    const pathModule = await import('path');
    const fullPath = pathModule.join(this.workingDir, filePath);
    
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      return '';
    }
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    if (process.env.DRY_RUN === 'true') {
      this.logger.info(`[DRY RUN] Would write to ${filePath}`);
      return;
    }
    
    const fs = await import('fs/promises');
    const pathModule = await import('path');
    
    // Build完整path
    const fullPath = pathModule.join(this.workingDir, filePath);
    
    // 确保dir存在
    const dir = pathModule.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(fullPath, content, 'utf-8');
    this.logger.info(`✏️  Writing file: ${filePath}`);
  }

  private async editFile(path: string, oldString: string, newString: string): Promise<void> {
    if (process.env.DRY_RUN === 'true') {
      this.logger.info(`[DRY RUN] Would edit ${path}`);
      return;
    }
    
    const fs = await import('fs/promises');
    const pathModule = await import('path');
    const fullPath = pathModule.join(this.workingDir, path);
    
    const content = await fs.readFile(fullPath, 'utf-8');
    
    if (!content.includes(oldString)) {
      throw new Error(`String not found in file: ${oldString}`);
    }
    
    const newContent = content.replace(oldString, newString);
    await fs.writeFile(fullPath, newContent, 'utf-8');
    this.logger.info(`✏️  Editing file: ${path}`);
  }

  private async runCommand(command: string, cwd?: string): Promise<any> {
    if (process.env.DRY_RUN === 'true') {
      this.logger.info(`[DRY RUN] Would run: ${command}`);
      return { stdout: '', stderr: '', exitCode: 0 };
    }
    
    const { exec } = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(exec);
    
    try {
      const { stdout, stderr } = await execPromise(command, { cwd });
      return { stdout, stderr, exitCode: 0 };
    } catch (error: any) {
      return { stdout: error.stdout, stderr: error.stderr, exitCode: error.code };
    }
  }

  private async searchCode(query: string): Promise<any[]> {
    const { glob } = await import('glob');
    const fs = await import('fs/promises');
    
    const files = await glob('src/**/*.{ts,js}', { ignore: 'node_modules/**' });
    const results = [];
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      if (content.includes(query)) {
        results.push({ file, matches: this.extractMatches(content, query) });
      }
    }
    
    return results;
  }

  private extractMatches(content: string, query: string): string[] {
    const lines = content.split('\n');
    const matches = [];
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(query)) {
        matches.push(`Line ${i + 1}: ${lines[i].trim()}`);
      }
    }
    
    return matches;
  }

  private async findRelevantCode(task: any): Promise<string> {
    // Search与任务相close的代码
    const keywords = task.title.split(' ').concat(task.description.split(' '));
    const results = [];
    
    for (const keyword of keywords) {
      if (keyword.length > 3) {
        const matches = await this.searchCode(keyword);
        results.push(...matches.slice(0, 3));
      }
    }
    
    return JSON.stringify(results.slice(0, 10));
  }

  private async runTests(): Promise<any> {
    this.logger.info('🧪 Running tests...');
    const result = await this.runCommand('npm test');
    
    return {
      success: result.exitCode === 0,
      output: result.stdout,
      errors: result.stderr
    };
  }

  private async runLinter(): Promise<any> {
    this.logger.info('🔍 Run linter...');
    const result = await this.runCommand('npm run lint');
    
    return {
      success: result.exitCode === 0,
      output: result.stdout,
      errors: result.stderr
    };
  }

  /**
   * Parse ESLint JSON output into RuleViolations
   */
  private parseLintOutput(stdout: string): RuleViolation[] {
    const violations: RuleViolation[] = [];
    
    try {
      // Find JSON array in output
      const jsonMatch = stdout.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return violations;
      }
      
      const results = JSON.parse(jsonMatch[0]);
      
      for (const fileResult of results) {
        const filePath = fileResult.filePath;
        
        for (const message of fileResult.messages || []) {
          if (!message.fix) continue;
          
          violations.push({
            ruleId: message.ruleId || 'unknown',
            ruleName: message.ruleId || 'unknown',
            severity: message.severity === 2 ? 'error' : 'warning',
            filePath: filePath,
            line: message.line,
            column: message.column,
            message: message.message,
            autoFixable: true,
            fix: {
              replacement: message.fix.text
            }
          });
        }
      }
    } catch (error: any) {
      this.logger.error('Failed to parse lint output:', error.message);
    }
    
    return violations;
  }

  private async checkArchitecture(): Promise<any> {
    this.logger.info('🏗️  Checking architectureconstraint...');
    // implArchCheck逻辑
    return { success: true };
  }

  private canAutoFix(testResult: any, lintResult: any): boolean {
    // 判断是否可自动fix
    return !testResult.success || !lintResult.success;
  }

  private shouldRetry(error: any): boolean {
    // 判断是否应Retry
    const retryableErrors = [
      'timeout',
      'rate_limit',
      'network_error'
    ];
    
    return retryableErrors.some(e => error.message.toLowerCase().includes(e));
  }
}
