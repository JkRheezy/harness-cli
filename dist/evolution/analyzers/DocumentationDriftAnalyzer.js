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
exports.DocumentationDriftAnalyzer = void 0;
const Logger_1 = require("../../utils/Logger");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
class DocumentationDriftAnalyzer {
    constructor() {
        this.logger = new Logger_1.Logger();
    }
    async analyze(projectPath) {
        this.logger.info('📚 Analyzing documentation drift...');
        const opportunities = [];
        const [jsdocOpportunities, readmeOpportunities, commentOpportunities, apiDocOpportunities] = await Promise.all([
            this.findJSDocDrift(projectPath),
            this.findReadmeDrift(projectPath),
            this.findStaleComments(projectPath),
            this.findAPIDocDrift(projectPath)
        ]);
        opportunities.push(...jsdocOpportunities, ...readmeOpportunities, ...commentOpportunities, ...apiDocOpportunities);
        this.logger.info(`✅ Documentation analysis complete: ${opportunities.length} drift issues found`);
        return opportunities;
    }
    async findJSDocDrift(projectPath) {
        const opportunities = [];
        try {
            const files = await (0, glob_1.glob)('src/**/*.{ts,tsx}', {
                cwd: projectPath,
                ignore: ['**/*.test.ts', '**/*.spec.ts']
            });
            for (const file of files.slice(0, 30)) {
                const content = await fs.readFile(path.join(projectPath, file), 'utf-8');
                const jsdocPattern = /\/\*\*[\s\S]*?\*\//g;
                let match;
                while ((match = jsdocPattern.exec(content)) !== null) {
                    const jsdocBlock = match[0];
                    const startPos = match.index;
                    const lineNumber = content.substring(0, startPos).split('\n').length;
                    const params = jsdocBlock.match(/@param\s+(?:\{[^}]+\})?\s*(\w+)/g) || [];
                    const paramNames = params.map(p => p.replace(/@param\s+(?:\{[^}]+\})?\s*/, '').trim());
                    const afterJSDoc = content.substring(startPos + jsdocBlock.length, startPos + jsdocBlock.length + 500);
                    const funcMatch = afterJSDoc.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
                    if (funcMatch) {
                        const funcName = funcMatch[1];
                        const funcParams = funcMatch[2].split(',').map(p => p.trim()).filter(p => p);
                        if (paramNames.length !== funcParams.length) {
                            opportunities.push({
                                id: `evolution-jsdoc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                category: 'documentation',
                                trigger: 'code_pattern_detected',
                                title: `Fix JSDoc for ${funcName}() in ${path.basename(file)}`,
                                description: `JSDoc params (${paramNames.length}) don't match function (${funcParams.length}) in ${file}:${lineNumber}`,
                                priority: 'medium',
                                estimatedImpact: 5,
                                evidence: [{
                                        type: 'code_smell',
                                        description: `JSDoc drift: ${paramNames.length} doc vs ${funcParams.length} actual`,
                                        location: `${file}:${lineNumber}`,
                                        severity: 'warning'
                                    }],
                                suggestedApproach: `1. Review function signature\n2. Update JSDoc @param tags\n3. Remove obsolete params`,
                                relatedFiles: [file],
                                createdAt: new Date()
                            });
                        }
                    }
                }
            }
        }
        catch (error) {
            this.logger.warn('Error finding JSDoc drift:', error);
        }
        return opportunities;
    }
    async findReadmeDrift(projectPath) {
        const opportunities = [];
        try {
            const readmePath = path.join(projectPath, 'README.md');
            const readmeExists = await fs.access(readmePath).then(() => true).catch(() => false);
            if (!readmeExists) {
                opportunities.push({
                    id: `evolution-readme-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    category: 'documentation',
                    trigger: 'code_pattern_detected',
                    title: 'Create README.md',
                    description: 'Project is missing README.md file.',
                    priority: 'high',
                    estimatedImpact: 7,
                    evidence: [{
                            type: 'missing_feature',
                            description: 'README.md not found',
                            severity: 'error'
                        }],
                    suggestedApproach: `1. Create README.md\n2. Add project description\n3. Document setup instructions`,
                    createdAt: new Date()
                });
                return opportunities;
            }
        }
        catch (error) {
            this.logger.warn('Error finding README drift:', error);
        }
        return opportunities;
    }
    async findStaleComments(projectPath) {
        const opportunities = [];
        try {
            const files = await (0, glob_1.glob)('src/**/*.{ts,tsx}', { cwd: projectPath });
            for (const file of files.slice(0, 20)) {
                const content = await fs.readFile(path.join(projectPath, file), 'utf-8');
                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const commentMatch = line.match(/\/\/\s*(.+)$/);
                    if (commentMatch) {
                        const comment = commentMatch[1].toLowerCase();
                        if (comment.includes('deprecated') && !line.includes(' eslint-disable')) {
                            opportunities.push({
                                id: `evolution-comment-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                category: 'technical_debt',
                                trigger: 'code_pattern_detected',
                                title: `Review deprecated code in ${path.basename(file)}`,
                                description: `Line ${i + 1} has "deprecated" comment but code is still active.`,
                                priority: 'medium',
                                estimatedImpact: 5,
                                evidence: [{
                                        type: 'code_smell',
                                        description: 'Deprecated comment on active code',
                                        location: `${file}:${i + 1}`,
                                        severity: 'warning'
                                    }],
                                suggestedApproach: `1. Review if code is actually deprecated\n2. If yes: remove the code\n3. If no: remove the comment`,
                                relatedFiles: [file],
                                createdAt: new Date()
                            });
                        }
                    }
                }
            }
        }
        catch (error) {
            this.logger.warn('Error finding stale comments:', error);
        }
        return opportunities;
    }
    async findAPIDocDrift(projectPath) {
        const opportunities = [];
        try {
            const openApiFiles = await (0, glob_1.glob)('{openapi,swagger}.{yaml,yml,json}', { cwd: projectPath });
            const apiRoutes = await (0, glob_1.glob)('src/app/api/**/*.{ts,tsx}', { cwd: projectPath });
            if (openApiFiles.length === 0 && apiRoutes.length > 3) {
                opportunities.push({
                    id: `evolution-apidoc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    category: 'documentation',
                    trigger: 'business_opportunity',
                    title: 'Create API documentation (OpenAPI/Swagger)',
                    description: `Project has ${apiRoutes.length} API routes but no OpenAPI documentation.`,
                    priority: 'medium',
                    estimatedImpact: 6,
                    evidence: [{
                            type: 'missing_feature',
                            description: `No API docs for ${apiRoutes.length} routes`,
                            severity: 'warning'
                        }],
                    suggestedApproach: `1. Create openapi.yaml\n2. Document all API endpoints\n3. Add request/response schemas`,
                    createdAt: new Date()
                });
            }
        }
        catch (error) {
            this.logger.warn('Error finding API doc drift:', error);
        }
        return opportunities;
    }
}
exports.DocumentationDriftAnalyzer = DocumentationDriftAnalyzer;
//# sourceMappingURL=DocumentationDriftAnalyzer.js.map