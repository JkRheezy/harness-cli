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
exports.visualizeCommand = void 0;
const commander_1 = require("commander");
const fs = __importStar(require("fs/promises"));
const LoopController_1 = require("../core/LoopController");
const ConfigLoader_1 = require("../utils/ConfigLoader");
exports.visualizeCommand = new commander_1.Command('visualize')
    .description('Generate architecture visualization')
    .option('-f, --format <format>', 'Output format (mermaid|json)', 'mermaid')
    .option('-o, --output <path>', 'Output file path')
    .option('-c, --config <path>', 'Config file path', '.harness/config.yaml')
    .action(async (options) => {
    try {
        const config = await loadConfig(options.config);
        const controller = new LoopController_1.LoopController(config);
        const diagram = await controller.getArchitectureDiagram();
        if (options.output) {
            await fs.writeFile(options.output, diagram, 'utf-8');
            console.log(`✅ Diagram saved to: ${options.output}`);
        }
        else {
            console.log('\n📊 Architecture Diagram:\n');
            console.log(diagram);
            console.log('\n');
        }
    }
    catch (error) {
        console.error('❌ Failed to generate visualization:', error.message);
        process.exit(1);
    }
});
async function loadConfig(configPath) {
    try {
        return await ConfigLoader_1.ConfigLoader.load(configPath);
    }
    catch (error) {
        // If config doesn't exist, return a minimal config for visualization
        if (error.code === 'ENOENT' || error.message?.includes('not found')) {
            console.warn('⚠️  Config not found, using default configuration');
            return {
                llm: {
                    provider: 'openai',
                    model: 'gpt-4',
                    apiKey: process.env.OPENAI_API_KEY || '',
                    maxTokens: 4000,
                    temperature: 0.2,
                    timeout: 300000
                },
                safety: {
                    maxExecutionTime: 21600000,
                    maxErrorRate: 0.5,
                    maxComplexity: 100
                },
                checkpoint: {
                    enabled: false,
                    interval: 300000
                }
            };
        }
        throw error;
    }
}
exports.default = exports.visualizeCommand;
//# sourceMappingURL=visualize.js.map