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
exports.ReviewAgent = void 0;
const simple_git_1 = require("simple-git");
const Logger_1 = require("../utils/Logger");
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
class ReviewAgent {
    constructor(config) {
        this.config = config;
        this.logger = new Logger_1.Logger();
        this.git = (0, simple_git_1.simpleGit)();
        if (config.provider === 'openai') {
            this.openai = new openai_1.default({
                apiKey: config.apiKey,
                baseURL: config.baseUrl
            });
        }
        else if (config.provider === 'anthropic') {
            this.anthropic = new sdk_1.default({
                apiKey: config.apiKey
            });
        }
    }
    async review(prNumber) {
        this.logger.info(`🔍 开始审查 PR #${prNumber}`);
        try {
            // 1. 获取 PR diff
            const diff = await this.getPRDiff(prNumber);
            // 2. 运行自动化检查
            const automatedChecks = await this.runAutomatedChecks(prNumber);
            // 3. LLM 代码审查
            const llmReview = await this.llmReview(diff);
            // 4. 合并审查结果
            const allIssues = [...automatedChecks.issues, ...llmReview.issues];
            const allSuggestions = [...automatedChecks.suggestions, ...llmReview.suggestions];
            // 5. 判断是否可自动批准
            const canAutoApprove = this.canAutoApprove(allIssues, automatedChecks);
            // 6. 生成审查总结
            const summary = await this.generateSummary(allIssues, allSuggestions);
            return {
                status: canAutoApprove ? 'approved' : 'changes_requested',
                canAutoApprove,
                issues: allIssues,
                suggestions: allSuggestions,
                summary
            };
        }
        catch (error) {
            this.logger.error('PR 审查失败:', error);
            throw error;
        }
    }
    async approve(prNumber, comment) {
        this.logger.info(`✅ 批准 PR #${prNumber}`);
        try {
            let command = `gh pr review ${prNumber} --approve`;
            if (comment) {
                command += ` --body "${comment}"`;
            }
            await this.runCommand(command);
        }
        catch (error) {
            this.logger.error('批准 PR 失败:', error);
            throw error;
        }
    }
    async requestChanges(prNumber, comment) {
        this.logger.info(`📝 请求修改 PR #${prNumber}`);
        try {
            const command = `gh pr review ${prNumber} --request-changes --body "${comment}"`;
            await this.runCommand(command);
        }
        catch (error) {
            this.logger.error('请求修改失败:', error);
            throw error;
        }
    }
    async getPRDiff(prNumber) {
        const command = `gh pr diff ${prNumber}`;
        const result = await this.runCommand(command);
        if (result.exitCode !== 0) {
            throw new Error(`获取 PR diff 失败: ${result.stderr}`);
        }
        return result.stdout;
    }
    async runAutomatedChecks(prNumber) {
        const issues = [];
        const suggestions = [];
        // 1. 架构约束检查
        const archIssues = await this.checkArchitectureConstraints(prNumber);
        issues.push(...archIssues);
        // 2. 代码风格检查
        const styleIssues = await this.checkCodeStyle(prNumber);
        issues.push(...styleIssues);
        // 3. 安全检查
        const securityIssues = await this.checkSecurity(prNumber);
        issues.push(...securityIssues);
        // 4. 测试检查
        const testIssues = await this.checkTests(prNumber);
        issues.push(...testIssues);
        // 5. 性能检查
        const perfIssues = await this.checkPerformance(prNumber);
        issues.push(...perfIssues);
        return {
            status: issues.length === 0 ? 'approved' : 'changes_requested',
            canAutoApprove: issues.length === 0,
            issues,
            suggestions,
            summary: ''
        };
    }
    async checkArchitectureConstraints(prNumber) {
        const issues = [];
        try {
            // 获取 PR 中的文件
            const files = await this.getPRFiles(prNumber);
            for (const file of files) {
                // 检查层依赖违规
                if (await this.hasLayerViolation(file)) {
                    issues.push({
                        severity: 'error',
                        file: file.filename,
                        message: '架构约束违规: 层依赖方向错误',
                        suggestion: '请确保下层不依赖上层'
                    });
                }
                // 检查文件大小
                if (file.additions > 300) {
                    issues.push({
                        severity: 'warning',
                        file: file.filename,
                        message: `文件过大: +${file.additions} 行`,
                        suggestion: '建议拆分为多个小文件'
                    });
                }
            }
        }
        catch (error) {
            this.logger.warn('架构检查失败:', error);
        }
        return issues;
    }
    async checkCodeStyle(prNumber) {
        const issues = [];
        try {
            // 运行 linter
            const result = await this.runCommand('npm run lint');
            if (result.exitCode !== 0) {
                // 解析 linter 输出
                const lintIssues = this.parseLintOutput(result.stdout);
                issues.push(...lintIssues);
            }
        }
        catch (error) {
            this.logger.warn('代码风格检查失败:', error);
        }
        return issues;
    }
    async checkSecurity(prNumber) {
        const issues = [];
        try {
            // 检查敏感信息泄露
            const diff = await this.getPRDiff(prNumber);
            const sensitivePatterns = [
                { pattern: /password\s*[=:]\s*["'][^"']+["']/i, message: '可能的密码泄露' },
                { pattern: /api[_-]?key\s*[=:]\s*["'][^"']+["']/i, message: '可能的 API Key 泄露' },
                { pattern: /secret\s*[=:]\s*["'][^"']+["']/i, message: '可能的 Secret 泄露' },
                { pattern: /private[_-]?key/i, message: '可能的私钥泄露' }
            ];
            for (const { pattern, message } of sensitivePatterns) {
                if (pattern.test(diff)) {
                    issues.push({
                        severity: 'error',
                        message: `安全问题: ${message}`,
                        suggestion: '请使用环境变量或密钥管理服务'
                    });
                }
            }
        }
        catch (error) {
            this.logger.warn('安全检查失败:', error);
        }
        return issues;
    }
    async checkTests(prNumber) {
        const issues = [];
        try {
            // 检查是否包含测试
            const files = await this.getPRFiles(prNumber);
            const hasCodeChanges = files.some(f => f.filename.startsWith('src/') &&
                (f.status === 'added' || f.status === 'modified'));
            const hasTestChanges = files.some(f => f.filename.includes('test') ||
                f.filename.includes('spec'));
            if (hasCodeChanges && !hasTestChanges) {
                issues.push({
                    severity: 'warning',
                    message: '代码变更未包含测试',
                    suggestion: '请为新功能添加单元测试'
                });
            }
            // 运行测试
            const testResult = await this.runCommand('npm test');
            if (testResult.exitCode !== 0) {
                issues.push({
                    severity: 'error',
                    message: '测试失败',
                    suggestion: '请修复测试失败'
                });
            }
        }
        catch (error) {
            this.logger.warn('测试检查失败:', error);
        }
        return issues;
    }
    async checkPerformance(prNumber) {
        const issues = [];
        try {
            const diff = await this.getPRDiff(prNumber);
            // 检查性能反模式
            const perfPatterns = [
                { pattern: /console\.log\(/g, message: '包含 console.log，可能影响性能' },
                { pattern: /for\s*\([^)]+\)\s*\{[^}]*for\s*\(/g, message: '嵌套循环，可能影响性能' },
                { pattern: /new\s+Promise\s*\(\s*resolve\s*=>\s*\{/g, message: '手动创建 Promise，建议使用 async/await' }
            ];
            for (const { pattern, message } of perfPatterns) {
                if (pattern.test(diff)) {
                    issues.push({
                        severity: 'info',
                        message,
                        suggestion: '请考虑优化'
                    });
                }
            }
        }
        catch (error) {
            this.logger.warn('性能检查失败:', error);
        }
        return issues;
    }
    async llmReview(diff) {
        const prompt = `
You are an expert code reviewer. Please review the following code changes:

\`\`\`diff
${diff}
\`\`\`

Please analyze:
1. Code quality and readability
2. Potential bugs or issues
3. Architecture and design patterns
4. Performance considerations
5. Security concerns

Respond in JSON format:
{
  "issues": [
    {
      "severity": "error|warning|info",
      "message": "description of the issue",
      "suggestion": "how to fix it"
    }
  ],
  "suggestions": [
    "improvement suggestion 1",
    "improvement suggestion 2"
  ]
}
`;
        try {
            const response = await this.callLLM(prompt);
            const review = JSON.parse(response);
            return {
                status: review.issues.length === 0 ? 'approved' : 'changes_requested',
                canAutoApprove: review.issues.length === 0,
                issues: review.issues,
                suggestions: review.suggestions,
                summary: ''
            };
        }
        catch (error) {
            this.logger.warn('LLM 审查失败:', error);
            return {
                status: 'approved',
                canAutoApprove: true,
                issues: [],
                suggestions: [],
                summary: ''
            };
        }
    }
    canAutoApprove(issues, automatedChecks) {
        // 有 error 级别问题，不能自动批准
        if (issues.some(i => i.severity === 'error')) {
            return false;
        }
        // 警告超过 3 个，不能自动批准
        const warnings = issues.filter(i => i.severity === 'warning');
        if (warnings.length > 3) {
            return false;
        }
        // 测试必须通过
        if (!automatedChecks.testsPassed) {
            return false;
        }
        return true;
    }
    async generateSummary(issues, suggestions) {
        const errorCount = issues.filter(i => i.severity === 'error').length;
        const warningCount = issues.filter(i => i.severity === 'warning').length;
        const infoCount = issues.filter(i => i.severity === 'info').length;
        if (errorCount === 0 && warningCount === 0) {
            return '✅ 所有检查通过，代码质量良好';
        }
        let summary = '';
        if (errorCount > 0) {
            summary += `❌ 发现 ${errorCount} 个错误`;
        }
        if (warningCount > 0) {
            summary += `${summary ? '，' : ''}⚠️  ${warningCount} 个警告`;
        }
        if (infoCount > 0) {
            summary += `${summary ? '，' : ''}ℹ️  ${infoCount} 个建议`;
        }
        return summary;
    }
    async getPRFiles(prNumber) {
        const command = `gh pr view ${prNumber} --json files`;
        const result = await this.runCommand(command);
        if (result.exitCode !== 0) {
            return [];
        }
        const data = JSON.parse(result.stdout);
        return data.files || [];
    }
    async hasLayerViolation(file) {
        // 简单的层依赖检查
        const content = await this.getFileContent(file.filename);
        // 检查 repo 层是否依赖 service 层
        if (file.filename.includes('/repo/')) {
            if (content.includes("from '../service/'") || content.includes("from '@/service/")) {
                return true;
            }
        }
        // 检查 service 层是否依赖 UI 层
        if (file.filename.includes('/service/')) {
            if (content.includes("from '../ui/'") || content.includes("from '@/ui/")) {
                return true;
            }
        }
        return false;
    }
    async getFileContent(filename) {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            return await fs.readFile(filename, 'utf-8');
        }
        catch {
            return '';
        }
    }
    parseLintOutput(output) {
        const issues = [];
        const lines = output.split('\n');
        for (const line of lines) {
            // 解析 eslint 输出格式
            const match = line.match(/(.+):(\d+):(\d+):\s*(error|warning)\s*(.+)/);
            if (match) {
                issues.push({
                    severity: match[4],
                    file: match[1],
                    line: parseInt(match[2]),
                    message: match[5]
                });
            }
        }
        return issues;
    }
    async callLLM(prompt) {
        if (this.config.provider === 'openai' && this.openai) {
            const response = await this.openai.chat.completions.create({
                model: this.config.model,
                messages: [
                    { role: 'system', content: 'You are an expert code reviewer.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: this.config.maxTokens,
                temperature: 0.2
            });
            return response.choices[0]?.message?.content || '';
        }
        else if (this.config.provider === 'anthropic' && this.anthropic) {
            const response = await this.anthropic.messages.create({
                model: this.config.model,
                max_tokens: this.config.maxTokens,
                temperature: 0.2,
                messages: [{ role: 'user', content: prompt }]
            });
            const content = response.content[0];
            return content && 'text' in content ? content.text : '';
        }
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
    async runCommand(command) {
        const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const util = await Promise.resolve().then(() => __importStar(require('util')));
        const execPromise = util.promisify(exec);
        try {
            const { stdout, stderr } = await execPromise(command);
            return { stdout, stderr, exitCode: 0 };
        }
        catch (error) {
            return {
                stdout: error.stdout || '',
                stderr: error.stderr || '',
                exitCode: error.code || 1
            };
        }
    }
}
exports.ReviewAgent = ReviewAgent;
//# sourceMappingURL=ReviewAgent.js.map