"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigLoader = void 0;
const js_yaml_1 = __importDefault(require("js-yaml"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
class ConfigLoader {
    static async load(configPath) {
        // 默认配置
        const defaultConfig = {
            llm: {
                provider: 'openai',
                model: 'gpt-4o',
                apiKey: process.env.OPENAI_API_KEY || '',
                maxTokens: 128000,
                temperature: 0.2,
                timeout: 300000 // 5分钟（生成详细计划需要较长时间）
            },
            safety: {
                maxExecutionTime: 21600000, // 6小时
                maxErrorRate: 0.5, // 50%
                maxComplexity: 100
            },
            checkpoint: {
                enabled: true,
                interval: 300000 // 5分钟
            },
            github: {
                token: process.env.GITHUB_TOKEN || ''
            },
            superpowers: {
                enabled: true,
                autoDesign: true,
                requireApproval: false,
                skillsPath: '.config/agents/skills'
            },
            evolution: {
                enabled: true,
                checkInterval: 300000,
                maxOpportunitiesPerAnalysis: 5,
                minImpactThreshold: 5,
                categories: {
                    technical: true, // Technical debt
                    business: true, // Business features
                    ux: true // User experience
                },
                documentation: {
                    autoUpdate: true, // Auto-update AGENTS.md
                    maintainRoadmap: true // Maintain roadmap
                }
            }
        };
        // 尝试读取配置文件
        try {
            const content = await fs_1.promises.readFile(configPath, 'utf-8');
            const fileConfig = js_yaml_1.default.load(content);
            // 合并配置
            return this.mergeConfig(defaultConfig, fileConfig);
        }
        catch (error) {
            console.warn(`无法读取配置文件 ${configPath}，使用默认配置`);
            return defaultConfig;
        }
    }
    static mergeConfig(defaults, overrides) {
        const merged = {
            llm: { ...defaults.llm, ...overrides.llm },
            safety: { ...defaults.safety, ...overrides.safety },
            checkpoint: { ...defaults.checkpoint, ...overrides.checkpoint },
            github: { ...defaults.github, ...overrides.github },
            projectPath: overrides.projectPath || defaults.projectPath
        };
        // Merge evolution config if provided
        if (overrides.evolution) {
            merged.evolution = {
                ...defaults.evolution,
                ...overrides.evolution,
                categories: {
                    ...defaults.evolution?.categories,
                    ...overrides.evolution.categories
                },
                documentation: {
                    autoUpdate: overrides.evolution.documentation?.autoUpdate ?? defaults.evolution?.documentation?.autoUpdate ?? true,
                    maintainRoadmap: overrides.evolution.documentation?.maintainRoadmap ?? defaults.evolution?.documentation?.maintainRoadmap ?? true
                }
            };
        }
        // Merge business context if provided
        if (overrides.businessContext) {
            merged.businessContext = overrides.businessContext;
        }
        // Merge superpowers config if provided
        if (overrides.superpowers) {
            merged.superpowers = {
                ...defaults.superpowers,
                ...overrides.superpowers
            };
        }
        // Merge unattended config if provided
        if (overrides.unattended) {
            merged.unattended = {
                ...overrides.unattended
            };
        }
        // 替换环境变量占位符 ${ENV_VAR}
        this.resolveEnvVariables(merged);
        return merged;
    }
    static resolveEnvVariables(obj) {
        for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'string') {
                // 替换 ${ENV_VAR} 格式
                obj[key] = obj[key].replace(/\$\{(\w+)\}/g, (match, envVar) => {
                    const value = process.env[envVar];
                    if (value === undefined) {
                        console.warn(`警告: 环境变量 ${envVar} 未设置`);
                    }
                    return value || '';
                });
            }
            else if (obj[key] && typeof obj[key] === 'object') {
                this.resolveEnvVariables(obj[key]);
            }
        }
    }
    static async createDefaultConfig() {
        const configDir = '.harness';
        const configPath = path_1.default.join(configDir, 'config.yaml');
        // 确保目录存在
        try {
            await fs_1.promises.mkdir(configDir, { recursive: true });
        }
        catch {
            // 目录已存在
        }
        const defaultConfig = `# Harness-Engineering 配置文件
# 版本: 2.1.0

# LLM 配置
llm:
  provider: openai  # openai | anthropic | kimi | google | local
  model: gpt-4o
  apiKey: \${OPENAI_API_KEY}  # 从环境变量读取
  maxTokens: 128000
  temperature: 0.2
  timeout: 21600000  # 6小时 (毫秒)

# 安全边界配置
safety:
  maxExecutionTime: 21600000  # 6小时
  maxErrorRate: 0.5  # 50%
  maxComplexity: 100

# 检查点配置
checkpoint:
  enabled: true
  interval: 300000  # 5分钟 (毫秒)

# GitHub 配置
github:
  token: \${GITHUB_TOKEN}  # 从环境变量读取

# Auto-evolution configuration
evolution:
  enabled: true
  checkInterval: 300000
  maxOpportunitiesPerAnalysis: 5
  minImpactThreshold: 5
  categories:
    technical: true    # Technical debt
    business: true     # Business features
    ux: true          # User experience
  documentation:
    autoUpdate: true      # Auto-update AGENTS.md
    maintainRoadmap: true # Maintain roadmap

# Business context for feature analysis (optional)
businessContext:
  domain: ecommerce
  currentFeatures:
    - product catalog
    - shopping cart
  userFlows:
    - name: Purchase Flow
      steps:
        - browse
        - cart
        - checkout
      entryPoints:
        - homepage
      conversionGoal: purchase completed
`;
        await fs_1.promises.writeFile(configPath, defaultConfig, 'utf-8');
        console.log(`✅ 默认配置已创建: ${configPath}`);
    }
}
exports.ConfigLoader = ConfigLoader;
//# sourceMappingURL=ConfigLoader.js.map