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
exports.ArchitectureDocGenerator = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const handlebars_1 = __importDefault(require("handlebars"));
const Logger_1 = require("../utils/Logger");
class ArchitectureDocGenerator {
    constructor() {
        this.logger = new Logger_1.Logger();
    }
    async loadTemplate() {
        try {
            const templatePath = path.join(__dirname, 'templates', 'architecture-md.hbs');
            const templateContent = await fs.readFile(templatePath, 'utf-8');
            this.template = handlebars_1.default.compile(templateContent);
        }
        catch (error) {
            throw new Error(`Failed to load architecture template: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async generate(input) {
        try {
            await this.loadTemplate();
            const content = this.buildContent(input);
            const rendered = this.template(content);
            const docsDir = path.join(input.targetDir, 'docs');
            await fs.mkdir(docsDir, { recursive: true });
            const outputPath = path.join(docsDir, 'ARCHITECTURE.md');
            await fs.writeFile(outputPath, rendered, 'utf-8');
            this.logger.info(`Generated ARCHITECTURE.md at ${outputPath}`);
            return {
                success: true,
                filesCreated: ['docs/ARCHITECTURE.md'],
                filesModified: []
            };
        }
        catch (error) {
            this.logger.error('Failed to generate ARCHITECTURE.md:', error);
            return {
                success: false,
                filesCreated: [],
                filesModified: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    buildContent(input) {
        return {
            projectName: input.projectName,
            overview: this.generateOverview(input),
            layers: this.generateLayerInfo(input),
            qualityScore: this.generateQualityScore(input),
            crossCutting: this.generateCrossCutting(input),
            layerComplexity: {},
            layerIssues: {}
        };
    }
    generateOverview(input) {
        return `${input.projectName} 采用六层分层架构（Types → Config → Repo → Service → Runtime → UI），` +
            `严格遵循依赖方向规则。每层有明确的职责边界，上层可以依赖下层，下层禁止依赖上层。` +
            `这种架构为 AI Agent 提供了清晰的导航和约束。`;
    }
    generateLayerInfo(input) {
        const layerDescriptions = {
            types: '领域模型、类型定义、接口契约',
            config: '配置定义、验证、加载',
            repo: '数据访问、存储抽象',
            service: '业务服务、工作流编排',
            runtime: 'Agent 执行、任务调度、状态管理',
            ui: 'API 接口、CLI、Web 界面'
        };
        return input.architecture.layers.map((layer, index) => {
            const dependencies = index === 0 ? [] : input.architecture.layers.slice(0, index);
            return {
                name: layer,
                description: layerDescriptions[layer] || `${layer} 层`,
                directory: `src/${layer}`,
                dependencies,
                quality: {
                    coverage: 0,
                    complexity: 'low',
                    issues: []
                }
            };
        });
    }
    generateQualityScore(input) {
        return {
            overall: 0,
            byLayer: input.architecture.layers.reduce((acc, layer) => {
                acc[layer] = 0;
                return acc;
            }, {}),
            gaps: input.architecture.layers.map(layer => ({
                layer,
                issue: '初始状态，等待评估',
                severity: 'low'
            }))
        };
    }
    generateCrossCutting(input) {
        return [
            { name: '认证 (Auth)', description: '用户认证和权限管理', implementation: 'src/config/auth.ts' },
            { name: '遥测 (Telemetry)', description: '日志、指标、追踪', implementation: 'src/config/telemetry.ts' },
            { name: '错误处理', description: '统一错误处理和恢复', implementation: 'src/runtime/error-handler.ts' }
        ];
    }
}
exports.ArchitectureDocGenerator = ArchitectureDocGenerator;
exports.default = ArchitectureDocGenerator;
//# sourceMappingURL=ArchitectureDocGenerator.js.map