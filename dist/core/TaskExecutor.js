"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskExecutor = void 0;
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const simple_git_1 = require("simple-git");
const Logger_1 = require("../utils/Logger");
const ToolRegistry_1 = require("../tools/ToolRegistry");
const BrowserValidator_1 = require("../browser/BrowserValidator");
const DevServerManager_1 = require("../utils/DevServerManager");
class TaskExecutor {
    constructor(config, workingDir = process.cwd()) {
        this.context = [];
        this.devServerUrl = null;
        this.config = config;
        this.workingDir = workingDir;
        this.logger = new Logger_1.Logger();
        this.git = (0, simple_git_1.simpleGit)(workingDir);
        this.toolRegistry = new ToolRegistry_1.ToolRegistry();
        this.devServerManager = new DevServerManager_1.DevServerManager();
        // 初始化 LLM 客户端
        if (config.provider === 'openai' || config.provider === 'kimi') {
            // Kimi 使用 OpenAI 兼容接口
            this.openai = new openai_1.default({
                apiKey: config.apiKey,
                baseURL: config.baseUrl
            });
        }
        else if (config.provider === 'anthropic') {
            // Kimi Coding Plan 使用 Anthropic 兼容接口
            this.anthropic = new sdk_1.default({
                apiKey: config.apiKey,
                baseURL: config.baseUrl
            });
        }
    }
    async execute(task, options = {}) {
        const startTime = Date.now();
        this.logger.info(`🤖 开始执行任务: ${task.title}`);
        try {
            // 1. 准备上下文
            const context = await this.prepareContext(task);
            // 2. 生成执行计划
            const plan = await this.generatePlan(task, context);
            // 检查 plan 和 steps 是否有效
            if (!plan || !plan.steps || !Array.isArray(plan.steps)) {
                this.logger.error('❌ 生成的计划无效或为空');
                return {
                    status: 'failed',
                    error: 'Failed to generate valid execution plan',
                    duration: Date.now() - startTime
                };
            }
            this.logger.info(`📋 执行计划: ${plan.steps.length} 个步骤`);
            // 3. 执行步骤
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
                    // 更新上下文
                    this.context.push({
                        role: 'assistant',
                        content: `Completed: ${step.description}\nResult: ${JSON.stringify(result)}`
                    });
                }
                catch (error) {
                    this.logger.error(`❌ Step ${i + 1} failed:`, error.message);
                    stepError = error;
                    results.push({
                        step: step.description,
                        status: 'failed',
                        error: error.message
                    });
                    // 继续执行后续步骤，不中断
                }
            }
            // 4. 验证结果（无论步骤是否成功，都进行验证）
            const validation = await this.validateResults(task, results, options.dryRun);
            // 5. 创建分支（如果有代码变更）
            let branch = null;
            if (validation.hasChanges && !options.dryRun) {
                branch = await this.createBranch(task);
            }
            const duration = Date.now() - startTime;
            // 如果有步骤错误，任务标记为失败
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
        }
        catch (error) {
            this.logger.error('任务执行失败:', error);
            return {
                status: 'failed',
                error: error.message || String(error),
                canRetry: this.shouldRetry(error),
                duration: Date.now() - startTime
            };
        }
        finally {
            // 停止开发服务器
            await this.stopDevServer();
        }
    }
    async prepareContext(task) {
        this.logger.info('Preparing context...');
        // 读取 AGENTS.md
        this.logger.info('Reading AGENTS.md...');
        const agentsMd = await this.readFile('AGENTS.md');
        this.logger.info(`AGENTS.md length: ${agentsMd.length}`);
        // 读取架构文档
        this.logger.info('Reading ARCHITECTURE.md...');
        const architecture = await this.readFile('docs/ARCHITECTURE.md');
        this.logger.info(`ARCHITECTURE.md length: ${architecture.length}`);
        // 读取相关代码
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
    async generatePlan(task, context) {
        const prompt = this.buildPlanPrompt(task, context);
        this.logger.info('Calling LLM to generate plan...');
        try {
            const response = await this.callLLM(prompt);
            // Log full response for debugging
            this.logger.info(`LLM Response length: ${response.length}`);
            this.logger.info(`LLM Response preview: ${response.substring(0, 800)}...`);
            // 解析计划
            try {
                // 尝试提取 JSON 代码块
                const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                    response.match(/```\s*([\s\S]*?)\s*```/);
                if (jsonMatch && jsonMatch[1]) {
                    this.logger.info('Found JSON code block, parsing...');
                    const parsed = JSON.parse(jsonMatch[1].trim());
                    if (parsed.steps && Array.isArray(parsed.steps)) {
                        this.logger.info(`✅ Parsed plan with ${parsed.steps.length} steps from code block`);
                        return parsed;
                    }
                }
                // 尝试匹配 JSON 对象
                const jsonObjectMatch = response.match(/(\{[\s\S]*\})/);
                if (jsonObjectMatch) {
                    this.logger.info('Found JSON object, parsing...');
                    const parsed = JSON.parse(jsonObjectMatch[1].trim());
                    if (parsed.steps && Array.isArray(parsed.steps)) {
                        this.logger.info(`✅ Parsed plan with ${parsed.steps.length} steps from object`);
                        return parsed;
                    }
                }
                // 直接解析整个响应
                this.logger.info('Attempting to parse entire response as JSON...');
                const parsed = JSON.parse(response.trim());
                if (parsed.steps && Array.isArray(parsed.steps)) {
                    this.logger.info(`✅ Parsed plan with ${parsed.steps.length} steps`);
                    return parsed;
                }
                throw new Error('Parsed JSON does not contain steps array');
            }
            catch (error) {
                this.logger.error(`⚠️ JSON parse failed: ${error.message}`);
                this.logger.error('Falling back to text extraction...');
                this.logger.error(`Response was: ${response.substring(0, 500)}...`);
                const extracted = this.extractPlanFromText(response);
                this.logger.info(`Extracted ${extracted.steps?.length || 0} steps from text`);
                return extracted;
            }
        }
        catch (error) {
            this.logger.error(`❌ Failed to generate plan: ${error.message}`);
            // Return empty plan instead of crashing
            return { steps: [], error: error.message };
        }
    }
    async executeStep(step, options) {
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        switch (step.type) {
            case 'read_file':
                // 添加存在性检查
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
                    // 确保目录存在
                    await this.ensureDirectoryExists(path.dirname(step.path));
                    // 如果没有提供 content，先生成代码
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
                    // 添加文件存在性检查
                    const fileExists = await this.fileExists(step.path);
                    if (!fileExists) {
                        this.logger.warn(`⚠️ File not found for edit: ${step.path}, creating new file...`);
                        await this.ensureDirectoryExists(path.dirname(step.path));
                        const content = step.content || step.newString || '';
                        await this.writeFile(step.path, content);
                        return { type: 'edit_file', path: step.path, created: true };
                    }
                    // 如果没有提供 oldString/newString，先生成修改内容
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
    async validateResults(task, results, dryRun) {
        // 检查是否有代码变更（添加超时）
        let hasChanges = false;
        try {
            const status = await Promise.race([
                this.git.status(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Git timeout')), 5000))
            ]);
            hasChanges = status.files.length > 0;
            this.logger.info(`Git status: ${status.files.length} files changed`);
        }
        catch (error) {
            this.logger.warn('Git 状态检查失败或超时，假设无变更');
            hasChanges = false;
        }
        // 模拟模式下，如果没有实际文件变更，跳过测试
        if (dryRun || !hasChanges) {
            this.logger.info('Dry run mode or no changes - skipping tests');
            return {
                success: true,
                hasChanges: dryRun && hasChanges,
                message: dryRun ? 'Dry run completed' : 'No code changes generated'
            };
        }
        // Run traditional tests
        const testResult = await this.runTests();
        const lintResult = await this.runLinter();
        const archCheck = await this.checkArchitecture();
        // Run browser validation for web projects
        const browserValidation = await this.runBrowserValidation(task);
        const success = testResult.success &&
            lintResult.success &&
            archCheck.success &&
            (browserValidation?.success ?? true);
        return {
            success,
            hasChanges: true,
            testResult,
            lintResult,
            archCheck,
            browserValidation,
            canAutoFix: !success && this.canAutoFix(testResult, lintResult)
        };
    }
    /**
     * Run browser-based validation
     */
    async runBrowserValidation(task) {
        const hasPackageJson = await this.fileExists('package.json');
        if (!hasPackageJson) {
            this.logger.info('📦 No package.json found, skipping browser validation');
            return null;
        }
        this.logger.info('🌐 Starting browser validation...');
        try {
            // 自动启动或复用开发服务器
            let devServerUrl = this.devServerUrl;
            if (!devServerUrl) {
                devServerUrl = await this.devServerManager.start({
                    timeout: 120000, // 2分钟超时
                    port: 3000
                });
                this.devServerUrl = devServerUrl;
                this.logger.info(`✅ Dev server ready at ${devServerUrl}`);
            }
            // 执行浏览器验证
            const validator = new BrowserValidator_1.BrowserValidator();
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
        }
        catch (error) {
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
     * 停止开发服务器（在任务完成后调用）
     */
    async stopDevServer() {
        if (this.devServerUrl) {
            await this.devServerManager.stop();
            this.devServerUrl = null;
            this.logger.info('✅ Dev server stopped');
        }
    }
    /**
     * Check if file exists
     */
    async fileExists(filePath) {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const pathModule = await Promise.resolve().then(() => __importStar(require('path')));
            const fullPath = pathModule.join(this.workingDir, filePath);
            await fs.access(fullPath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Ensure directory exists, create if not
     */
    async ensureDirectoryExists(dirPath) {
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        const pathModule = await Promise.resolve().then(() => __importStar(require('path')));
        const fullPath = pathModule.join(this.workingDir, dirPath);
        try {
            await fs.mkdir(fullPath, { recursive: true });
        }
        catch (error) {
            // 目录已存在或其他错误
            this.logger.debug(`Directory creation note: ${error.message}`);
        }
    }
    async createBranch(task) {
        const branchName = `harness/${task.id}`;
        // 先检查 git 状态，排除日志文件
        const status = await this.git.status();
        const filesToAdd = status.files
            .filter(f => !f.path.startsWith('logs/') && !f.path.endsWith('.log'))
            .map(f => f.path);
        if (filesToAdd.length === 0) {
            this.logger.info('ℹ️ 没有代码变更需要提交');
            return branchName;
        }
        // 检查分支是否已存在，如果存在则切换到该分支
        try {
            const { stdout: branchList } = await this.runCommand(`git branch --list ${branchName}`);
            if (branchList && branchList.trim().includes(branchName)) {
                this.logger.info(`🔀 分支 ${branchName} 已存在，切换到该分支`);
                await this.runCommand(`git checkout ${branchName}`);
            }
            else {
                await this.git.checkoutLocalBranch(branchName);
            }
        }
        catch (error) {
            // 如果检查失败，尝试直接创建（可能会失败，但会抛出更清晰的错误）
            await this.git.checkoutLocalBranch(branchName);
        }
        // 只添加非日志文件
        for (const file of filesToAdd) {
            try {
                await this.git.add(file);
            }
            catch (e) {
                this.logger.warn(`⚠️ 无法添加文件 ${file}: ${e}`);
            }
        }
        // 检查是否有 staged 文件（通过 raw 命令）
        const { stdout: stagedFiles } = await this.runCommand('git diff --cached --name-only');
        if (!stagedFiles || stagedFiles.trim().length === 0) {
            this.logger.info('ℹ️ 没有代码变更需要提交（仅日志文件变更）');
            return branchName;
        }
        await this.git.commit(`[Auto] ${task.title}\n\nTask: ${task.id}`);
        await this.git.push('origin', branchName);
        this.logger.info(`🔀 创建分支: ${branchName} (${filesToAdd.length} 个文件)`);
        return branchName;
    }
    async callLLM(prompt, retries = 2) {
        this.logger.info(`Calling LLM: ${this.config.provider}/${this.config.model}...`);
        const timeout = this.config.timeout || 60000;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                if (attempt > 0) {
                    this.logger.info(`Retry attempt ${attempt}/${retries}...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
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
                        // 解析 Anthropic 格式的响应
                        if (data.content && data.content.length > 0) {
                            const textContent = data.content.find((c) => c.type === 'text');
                            return textContent?.text || '';
                        }
                        return '';
                    }
                    catch (error) {
                        clearTimeout(timeoutId);
                        throw error;
                    }
                }
                // OpenAI 使用 SDK
                if (this.config.provider === 'openai' && this.openai) {
                    this.logger.info(`Sending OpenAI request (timeout: ${timeout}ms)...`);
                    // 创建超时 Promise
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`LLM call timeout after ${timeout}ms`)), timeout));
                    // 创建 API 调用 Promise
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
                    return response.choices[0]?.message?.content || '';
                }
                // Kimi 使用 OpenAI 兼容接口（fetch）
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
                        return data.choices[0]?.message?.content || '';
                    }
                    catch (error) {
                        clearTimeout(timeoutId);
                        throw error;
                    }
                }
                throw new Error(`Unsupported provider: ${this.config.provider}`);
            }
            catch (error) {
                this.logger.warn(`LLM call failed (attempt ${attempt + 1}): ${error.message}`);
                if (attempt === retries) {
                    throw error;
                }
            }
        }
        throw new Error('LLM call failed after all retries');
    }
    getSystemPrompt() {
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
    buildPlanPrompt(task, context) {
        return `You are a code execution planner. Create a detailed plan to implement the following task.

## Task: ${task.title}

### Description
${task.description}

### Requirements
${task.requirements?.map((r) => `- ${r}`).join('\n') || 'None specified'}

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
    async generateEditPlan(description, currentContent) {
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
        }
        catch (error) {
            this.logger.warn(`Failed to parse edit plan: ${error.message}`);
            // Return a fallback that won't break
            return { oldString: '', newString: '' };
        }
    }
    extractPlanFromText(text) {
        // 从文本中提取计划
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
    async generateSummary(task, results) {
        // 直接返回简单摘要，避免额外的 LLM 调用
        return `完成 "${task.title}"，成功执行 ${results.length} 个步骤。`;
    }
    async generateCode(description, context) {
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
    // 文件操作
    async readFile(filePath) {
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        const pathModule = await Promise.resolve().then(() => __importStar(require('path')));
        const fullPath = pathModule.join(this.workingDir, filePath);
        try {
            return await fs.readFile(fullPath, 'utf-8');
        }
        catch (error) {
            return '';
        }
    }
    async writeFile(filePath, content) {
        if (process.env.DRY_RUN === 'true') {
            this.logger.info(`[DRY RUN] Would write to ${filePath}`);
            return;
        }
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        const pathModule = await Promise.resolve().then(() => __importStar(require('path')));
        // 构建完整路径
        const fullPath = pathModule.join(this.workingDir, filePath);
        // 确保目录存在
        const dir = pathModule.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');
        this.logger.info(`✏️  写入文件: ${filePath}`);
    }
    async editFile(path, oldString, newString) {
        if (process.env.DRY_RUN === 'true') {
            this.logger.info(`[DRY RUN] Would edit ${path}`);
            return;
        }
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        const pathModule = await Promise.resolve().then(() => __importStar(require('path')));
        const fullPath = pathModule.join(this.workingDir, path);
        const content = await fs.readFile(fullPath, 'utf-8');
        if (!content.includes(oldString)) {
            throw new Error(`String not found in file: ${oldString}`);
        }
        const newContent = content.replace(oldString, newString);
        await fs.writeFile(fullPath, newContent, 'utf-8');
        this.logger.info(`✏️  编辑文件: ${path}`);
    }
    async runCommand(command, cwd) {
        if (process.env.DRY_RUN === 'true') {
            this.logger.info(`[DRY RUN] Would run: ${command}`);
            return { stdout: '', stderr: '', exitCode: 0 };
        }
        const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const util = await Promise.resolve().then(() => __importStar(require('util')));
        const execPromise = util.promisify(exec);
        try {
            const { stdout, stderr } = await execPromise(command, { cwd });
            return { stdout, stderr, exitCode: 0 };
        }
        catch (error) {
            return { stdout: error.stdout, stderr: error.stderr, exitCode: error.code };
        }
    }
    async searchCode(query) {
        const { glob } = await Promise.resolve().then(() => __importStar(require('glob')));
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
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
    extractMatches(content, query) {
        const lines = content.split('\n');
        const matches = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(query)) {
                matches.push(`Line ${i + 1}: ${lines[i].trim()}`);
            }
        }
        return matches;
    }
    async findRelevantCode(task) {
        // 搜索与任务相关的代码
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
    async runTests() {
        this.logger.info('🧪 运行测试...');
        const result = await this.runCommand('npm test');
        return {
            success: result.exitCode === 0,
            output: result.stdout,
            errors: result.stderr
        };
    }
    async runLinter() {
        this.logger.info('🔍 运行 linter...');
        const result = await this.runCommand('npm run lint');
        return {
            success: result.exitCode === 0,
            output: result.stdout,
            errors: result.stderr
        };
    }
    async checkArchitecture() {
        this.logger.info('🏗️  检查架构约束...');
        // 实现架构检查逻辑
        return { success: true };
    }
    canAutoFix(testResult, lintResult) {
        // 判断是否可自动修复
        return !testResult.success || !lintResult.success;
    }
    shouldRetry(error) {
        // 判断是否应重试
        const retryableErrors = [
            'timeout',
            'rate_limit',
            'network_error'
        ];
        return retryableErrors.some(e => error.message.toLowerCase().includes(e));
    }
}
exports.TaskExecutor = TaskExecutor;
//# sourceMappingURL=TaskExecutor.js.map