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
exports.DocumentationGenerator = void 0;
const AgentsMdGenerator_1 = require("./AgentsMdGenerator");
const ArchitectureDocGenerator_1 = require("./ArchitectureDocGenerator");
const Logger_1 = require("../utils/Logger");
/**
 * Main orchestrator for documentation generation
 * Generates complete knowledge base for Harness projects
 */
class DocumentationGenerator {
    constructor() {
        this.agentsMdGenerator = new AgentsMdGenerator_1.AgentsMdGenerator();
        this.architectureDocGenerator = new ArchitectureDocGenerator_1.ArchitectureDocGenerator();
        this.logger = new Logger_1.Logger();
    }
    /**
     * Generate complete documentation knowledge base
     */
    async generate(input) {
        this.logger.info(`Generating documentation for ${input.projectName}`);
        const results = [];
        // Generate AGENTS.md (entry point)
        results.push(await this.agentsMdGenerator.generate(input));
        // Generate ARCHITECTURE.md
        results.push(await this.architectureDocGenerator.generate(input));
        // Generate additional docs directory structure
        await this.generateDocStructure(input);
        // Aggregate results
        const allCreated = [];
        const allModified = [];
        const errors = [];
        for (const result of results) {
            allCreated.push(...result.filesCreated);
            allModified.push(...result.filesModified);
            if (result.error)
                errors.push(result.error);
        }
        if (errors.length > 0) {
            return {
                success: false,
                filesCreated: allCreated,
                filesModified: allModified,
                error: errors.join('; ')
            };
        }
        return {
            success: true,
            filesCreated: allCreated,
            filesModified: allModified
        };
    }
    async generateDocStructure(input) {
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const docsDir = path.join(input.targetDir, 'docs');
        // Create subdirectories
        const subdirs = ['design-docs', 'exec-plans', 'product-specs', 'references'];
        for (const subdir of subdirs) {
            await fs.mkdir(path.join(docsDir, subdir), { recursive: true });
        }
        // Create exec-plans subdirectories
        await fs.mkdir(path.join(docsDir, 'exec-plans', 'active'), { recursive: true });
        await fs.mkdir(path.join(docsDir, 'exec-plans', 'completed'), { recursive: true });
        // Create placeholder files
        await fs.writeFile(path.join(docsDir, 'design-docs', 'index.md'), '# 设计文档\n\n本文档包含项目的核心设计理念和架构模式。\n', 'utf-8');
        await fs.writeFile(path.join(docsDir, 'exec-plans', 'active', '.gitkeep'), '', 'utf-8');
        await fs.writeFile(path.join(docsDir, 'exec-plans', 'completed', '.gitkeep'), '', 'utf-8');
        await fs.writeFile(path.join(docsDir, 'product-specs', 'index.md'), '# 产品规范\n\n本文档包含产品功能规范和用户流程定义。\n', 'utf-8');
        await fs.writeFile(path.join(docsDir, 'references', '.gitkeep'), '', 'utf-8');
    }
}
exports.DocumentationGenerator = DocumentationGenerator;
exports.default = DocumentationGenerator;
//# sourceMappingURL=DocumentationGenerator.js.map