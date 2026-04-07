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
exports.AgentsMdParser = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const Logger_1 = require("../utils/Logger");
/**
 * Parses AGENTS.md to extract structured information
 * Enables document-driven development
 */
class AgentsMdParser {
    constructor() {
        this.logger = new Logger_1.Logger();
    }
    /**
     * Parse AGENTS.md file
     */
    async parse(projectPath) {
        const agentsMdPath = path.join(projectPath, 'AGENTS.md');
        try {
            const content = await fs.readFile(agentsMdPath, 'utf-8');
            return this.parseContent(content);
        }
        catch (error) {
            this.logger.error(`Failed to parse AGENTS.md at ${agentsMdPath}:`, error);
            throw new Error(`AGENTS.md not found or unreadable at ${agentsMdPath}`);
        }
    }
    parseContent(content) {
        return {
            projectName: this.extractProjectName(content),
            description: this.extractDescription(content),
            techStack: this.extractTechStack(content),
            quickStart: this.extractQuickStart(content),
            documentMap: this.extractDocumentMap(content),
            commonTasks: this.extractCommonTasks(content),
            constraints: this.extractConstraints(content)
        };
    }
    extractProjectName(content) {
        const match = content.match(/^#\s+(.+?)\s+-/m);
        return match ? match[1].trim() : 'Unknown Project';
    }
    extractDescription(content) {
        const match = content.match(/\*\*核心功能\*\*:\s*(.+)/);
        return match ? match[1].trim() : '';
    }
    extractTechStack(content) {
        const match = content.match(/\*\*技术栈\*\*:\s*(.+)/);
        return match ? match[1].trim() : '';
    }
    extractQuickStart(content) {
        const setupMatch = content.match(/```bash\n([\s\S]*?)```/);
        const setupCommands = setupMatch
            ? setupMatch[1].split('\n').filter(line => line.trim() && !line.startsWith('#'))
            : [];
        const startMatch = content.match(/### 2\.2[\s\S]*?```bash\n(.+?)\n```/);
        const startCommand = startMatch ? startMatch[1].trim() : '';
        return { setupCommands, startCommand };
    }
    extractDocumentMap(content) {
        const docs = [];
        const sectionMatch = content.match(/##\s*3[.\s]+关键文档索引([\s\S]*?)(?=##\s+\d+[.\s]|$)/);
        if (sectionMatch) {
            const lines = sectionMatch[1].split('\n');
            for (const line of lines) {
                const match = line.match(/\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/);
                if (match && !line.includes('路径') && !line.includes('---')) { // Skip header and separator
                    docs.push({
                        document: match[1].trim(),
                        path: match[2].trim(),
                        readingTime: match[3].trim(),
                        description: match[4].trim()
                    });
                }
            }
        }
        return docs;
    }
    extractCommonTasks(content) {
        const tasks = [];
        const sectionMatch = content.match(/##\s*4[.\s]+常见任务\n+([\s\S]*?)(?=\n## |$)/);
        if (sectionMatch) {
            const taskSections = sectionMatch[1].split(/###\s+4\.\d+/).slice(1);
            for (const section of taskSections) {
                const nameMatch = section.match(/^\s*(.+?)\n/);
                const name = nameMatch ? nameMatch[1].trim() : 'Unknown Task';
                const steps = [];
                const stepMatches = section.matchAll(/\d+\.\s*(.+)/g);
                for (const match of stepMatches) {
                    steps.push(match[1].trim());
                }
                tasks.push({ name, steps });
            }
        }
        return tasks;
    }
    extractConstraints(content) {
        const constraints = [];
        const sectionMatch = content.match(/##\s*5[.\s]+重要约束([\s\S]*?)(?=##\s+\d+[.\s]|$)/);
        if (sectionMatch) {
            const lines = sectionMatch[1].split('\n');
            for (const line of lines) {
                if (line.includes('❌')) {
                    const match = line.match(/\*\*(.+?)\*\*/);
                    if (match) {
                        constraints.push({ type: 'must-not', description: match[1] });
                    }
                }
                else if (line.includes('✅')) {
                    const match = line.match(/\*\*(.+?)\*\*/);
                    if (match) {
                        constraints.push({ type: 'must', description: match[1] });
                    }
                }
                else if (line.includes('⚠️')) {
                    const match = line.match(/\*\*(.+?)\*\*/);
                    if (match) {
                        constraints.push({ type: 'warning', description: match[1] });
                    }
                }
            }
        }
        return constraints;
    }
}
exports.AgentsMdParser = AgentsMdParser;
exports.default = AgentsMdParser;
//# sourceMappingURL=AgentsMdParser.js.map