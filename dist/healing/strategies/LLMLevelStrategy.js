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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMLevelStrategy = void 0;
const ErrorAnalyzer_1 = require("../llm/ErrorAnalyzer");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util_1 = require("util");
const child_process_1 = require("child_process");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Intelligent healing using LLM analysis
 * More flexible but slower and more expensive
 */
class LLMLevelStrategy {
    constructor(llmCaller, workingDir, logger, maxAttempts = 3) {
        this.analyzer = new ErrorAnalyzer_1.LLMErrorAnalyzer(llmCaller);
        this.workingDir = workingDir;
        this.logger = logger;
        this.maxAttempts = maxAttempts;
    }
    /**
     * Attempt to heal using LLM analysis
     */
    async heal(error, context = {}) {
        const startTime = Date.now();
        const attempt = {
            level: 2,
            strategy: 'llm-analysis',
            success: false,
            durationMs: 0,
            cost: { llmCalls: 0, tokensUsed: 0, estimatedCost: 0 }
        };
        try {
            // Step 1: Analyze error with LLM
            this.logger.info('[LLMLevelStrategy] Analyzing error with LLM...');
            const analysis = await this.analyzer.analyze(typeof error === 'string' ? error : error.message, context);
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
        }
        catch (e) {
            attempt.error = `LLM healing failed: ${e.message}`;
        }
        attempt.durationMs = Date.now() - startTime;
        return attempt;
    }
    /**
     * Apply a single LLM-suggested fix
     */
    async applyFix(fix) {
        try {
            switch (fix.type) {
                case 'create_file':
                    return await this.createFile(fix.filePath, fix.content);
                case 'modify_file':
                    return await this.modifyFile(fix.filePath, fix.content);
                case 'run_command':
                    return await this.runCommand(fix.command);
                case 'install_dependency':
                    return await this.installDependency(fix.packageName);
                default:
                    this.logger.warn(`[LLMLevelStrategy] Unknown fix type: ${fix.type}`);
                    return false;
            }
        }
        catch (error) {
            this.logger.error(`[LLMLevelStrategy] Fix failed:`, error.message);
            return false;
        }
    }
    async createFile(filePath, content) {
        const fullPath = path.join(this.workingDir, filePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, content);
        this.logger.info(`[LLMLevelStrategy] Created file: ${filePath}`);
        return true;
    }
    async modifyFile(filePath, content) {
        const fullPath = path.join(this.workingDir, filePath);
        if (!fs.existsSync(fullPath)) {
            this.logger.warn(`[LLMLevelStrategy] File not found for modification: ${filePath}`);
            return false;
        }
        fs.writeFileSync(fullPath, content);
        this.logger.info(`[LLMLevelStrategy] Modified file: ${filePath}`);
        return true;
    }
    async runCommand(command) {
        this.logger.info(`[LLMLevelStrategy] Running command: ${command}`);
        await execAsync(command, { cwd: this.workingDir, timeout: 60000 });
        return true;
    }
    async installDependency(packageName) {
        this.logger.info(`[LLMLevelStrategy] Installing dependency: ${packageName}`);
        await execAsync(`npm install ${packageName}`, {
            cwd: this.workingDir,
            timeout: 120000
        });
        return true;
    }
}
exports.LLMLevelStrategy = LLMLevelStrategy;
//# sourceMappingURL=LLMLevelStrategy.js.map