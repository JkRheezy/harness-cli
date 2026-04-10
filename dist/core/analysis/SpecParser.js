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
exports.SpecParser = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class SpecParser {
    constructor(projectPath) {
        this.projectPath = projectPath;
        this.cache = null;
        this.cacheKey = null;
    }
    async parse() {
        const agentsMdPath = path.join(this.projectPath, 'AGENTS.md');
        const architectureMdPath = path.join(this.projectPath, 'ARCHITECTURE.md');
        // First, check if we can use cached result without reading files
        // This requires getting file stats to detect changes
        let agentsMdStats = null;
        let architectureMdStats = null;
        try {
            const stats = await fs.stat(agentsMdPath);
            agentsMdStats = { mtime: stats.mtime, size: stats.size };
        }
        catch {
            // AGENTS.md doesn't exist
        }
        try {
            const stats = await fs.stat(architectureMdPath);
            architectureMdStats = { mtime: stats.mtime, size: stats.size };
        }
        catch {
            // ARCHITECTURE.md doesn't exist
        }
        // Read file contents
        let agentsMdContent = '';
        let architectureMdContent = '';
        try {
            if (agentsMdStats) {
                agentsMdContent = await fs.readFile(agentsMdPath, 'utf-8');
            }
        }
        catch {
            // AGENTS.md not found
        }
        try {
            if (architectureMdStats) {
                architectureMdContent = await fs.readFile(architectureMdPath, 'utf-8');
            }
        }
        catch {
            // ARCHITECTURE.md not found
        }
        // Check cache using content hash to detect any content changes
        const currentKey = this.hashContent(agentsMdContent + architectureMdContent);
        if (this.cache && this.cacheKey === currentKey) {
            return this.cache;
        }
        const agents = await this.parseAgentsMd(agentsMdContent);
        const modules = await this.parseArchitectureMd(architectureMdContent);
        const hasNoDocs = !agentsMdContent && !architectureMdContent;
        const result = {
            version: hasNoDocs ? '0.0.0' : '1.0.0',
            parsedAt: new Date(),
            agents,
            modules,
            interfaces: [],
            dataModels: [],
            workflows: []
        };
        // Update cache with content-based key
        this.cache = result;
        this.cacheKey = currentKey;
        return result;
    }
    async parseAgentsMd(content) {
        if (!content.trim()) {
            return [];
        }
        const agents = [];
        const sections = this.splitByHeaders(content);
        for (const section of sections) {
            const agent = this.extractAgentFromSection(section);
            if (agent) {
                agents.push(agent);
            }
        }
        return agents;
    }
    async parseArchitectureMd(content) {
        if (!content.trim()) {
            return [];
        }
        const modules = [];
        // 基于 ### 标题的简单提取
        const lines = content.split('\n');
        let currentModule = null;
        let currentSection = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('### ')) {
                if (currentModule && currentModule.name) {
                    modules.push(this.finalizeModule(currentModule));
                }
                currentModule = {
                    name: line.replace('### ', '').trim(),
                    description: '',
                    layer: 'service',
                    exposedInterfaces: [],
                    dependencies: [],
                    expectedFiles: [],
                    acceptanceCriteria: []
                };
                currentSection = null;
            }
            else if (currentModule) {
                if (line.startsWith('**Layer:**')) {
                    const validLayers = ['api', 'service', 'data', 'ui'];
                    const layer = line.replace('**Layer:**', '').trim();
                    currentModule.layer = validLayers.includes(layer)
                        ? layer
                        : 'service'; // default
                    currentSection = null;
                }
                else if (line.startsWith('**Description:**')) {
                    currentModule.description = line.replace('**Description:**', '').trim();
                    currentSection = null;
                }
                else if (line.includes('Interfaces:')) {
                    currentSection = 'interfaces';
                }
                else if (line.includes('Dependencies:')) {
                    currentSection = 'dependencies';
                }
                else if (line.includes('Criteria:')) {
                    currentSection = 'criteria';
                }
                else if (line.startsWith('- ') && currentSection === 'interfaces') {
                    currentModule.exposedInterfaces.push(line.replace('- ', '').trim());
                }
                else if (line.startsWith('- ') && currentSection === 'dependencies') {
                    currentModule.dependencies.push(line.replace('- ', '').trim());
                }
                else if (line.startsWith('- ') && currentSection === 'criteria') {
                    currentModule.acceptanceCriteria.push(line.replace('- ', '').trim());
                }
                else if (line.startsWith('**') && line.endsWith('**')) {
                    // New section header
                    currentSection = null;
                }
            }
        }
        if (currentModule && currentModule.name) {
            modules.push(this.finalizeModule(currentModule));
        }
        return modules;
    }
    splitByHeaders(content) {
        const sections = [];
        const lines = content.split('\n');
        let currentSection = [];
        for (const line of lines) {
            if (line.startsWith('## ') && currentSection.length > 0) {
                sections.push(currentSection.join('\n'));
                currentSection = [line];
            }
            else {
                currentSection.push(line);
            }
        }
        if (currentSection.length > 0) {
            sections.push(currentSection.join('\n'));
        }
        return sections;
    }
    extractAgentFromSection(section) {
        const lines = section.split('\n');
        const headerLine = lines.find(l => l.startsWith('## '));
        if (!headerLine)
            return null;
        const name = headerLine.replace('## ', '').trim();
        const responsibilities = [];
        const skills = [];
        let inResponsibilities = false;
        let inSkills = false;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.includes('Responsibilities')) {
                inResponsibilities = true;
                inSkills = false;
                continue;
            }
            if (trimmed.includes('Skills')) {
                inSkills = true;
                inResponsibilities = false;
                continue;
            }
            if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
                inResponsibilities = false;
                inSkills = false;
                continue;
            }
            if (trimmed.startsWith('- ') && inResponsibilities) {
                responsibilities.push(trimmed.replace('- ', ''));
            }
            if (trimmed.startsWith('- ') && inSkills) {
                skills.push(trimmed.replace('- ', ''));
            }
        }
        return {
            name,
            description: '',
            responsibilities,
            skills,
            expectedFiles: [`src/lib/ai/agents/${name}.ts`],
            dependencies: []
        };
    }
    finalizeModule(partial) {
        return {
            name: partial.name || 'Unknown',
            description: partial.description || '',
            layer: partial.layer || 'service',
            exposedInterfaces: partial.exposedInterfaces || [],
            dependencies: partial.dependencies || [],
            expectedFiles: partial.expectedFiles || [],
            acceptanceCriteria: partial.acceptanceCriteria || []
        };
    }
    hashContent(content) {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
}
exports.SpecParser = SpecParser;
//# sourceMappingURL=SpecParser.js.map