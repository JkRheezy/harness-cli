import yaml from 'js-yaml';
import { promises as fs } from 'fs';
import path from 'path';

export interface HarnessConfig {
  llm: {
    provider: 'openai' | 'anthropic' | 'kimi' | 'google' | 'local';
    model: string;
    apiKey: string;
    baseUrl?: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
  };
  safety: {
    maxExecutionTime: number;
    maxErrorRate: number;
    maxComplexity: number;
  };
  checkpoint: {
    enabled: boolean;
    interval: number;
  };
  github: {
    token: string;
  };
  superpowers?: {
    enabled: boolean;
    autoDesign: boolean;
    requireApproval: boolean;
    skillsPath: string;
  };
  projectPath?: string;
}

export class ConfigLoader {
  static async load(configPath: string): Promise<HarnessConfig> {
    // 默认配置
    const defaultConfig: HarnessConfig = {
      llm: {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: process.env.OPENAI_API_KEY || '',
        maxTokens: 128000,
        temperature: 0.2,
        timeout: 300000  // 5分钟（生成详细计划需要较长时间）
      },
      safety: {
        maxExecutionTime: 21600000,  // 6小时
        maxErrorRate: 0.5,  // 50%
        maxComplexity: 100
      },
      checkpoint: {
        enabled: true,
        interval: 300000  // 5分钟
      },
      github: {
        token: process.env.GITHUB_TOKEN || ''
      },
      superpowers: {
        enabled: true,
        autoDesign: true,
        requireApproval: false,
        skillsPath: '.config/agents/skills'
      }
    };

    // 尝试读取配置文件
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const fileConfig = yaml.load(content) as Partial<HarnessConfig>;
      
      // 合并配置
      return this.mergeConfig(defaultConfig, fileConfig);
    } catch (error) {
      console.warn(`无法读取配置文件 ${configPath}，使用默认配置`);
      return defaultConfig;
    }
  }

  private static mergeConfig(defaults: HarnessConfig, overrides: Partial<HarnessConfig>): HarnessConfig {
    const merged = {
      llm: { ...defaults.llm, ...overrides.llm },
      safety: { ...defaults.safety, ...overrides.safety },
      checkpoint: { ...defaults.checkpoint, ...overrides.checkpoint },
      github: { ...defaults.github, ...overrides.github },
      projectPath: overrides.projectPath || defaults.projectPath
    };
    
    // 替换环境变量占位符 ${ENV_VAR}
    this.resolveEnvVariables(merged);
    
    return merged;
  }
  
  private static resolveEnvVariables(obj: any): void {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'string') {
        // 替换 ${ENV_VAR} 格式
        obj[key] = obj[key].replace(/\$\{(\w+)\}/g, (match: string, envVar: string) => {
          const value = process.env[envVar];
          if (value === undefined) {
            console.warn(`警告: 环境变量 ${envVar} 未设置`);
          }
          return value || '';
        });
      } else if (obj[key] && typeof obj[key] === 'object') {
        this.resolveEnvVariables(obj[key]);
      }
    }
  }

  static async createDefaultConfig(): Promise<void> {
    const configDir = '.harness';
    const configPath = path.join(configDir, 'config.yaml');

    // 确保目录存在
    try {
      await fs.mkdir(configDir, { recursive: true });
    } catch {
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
`;

    await fs.writeFile(configPath, defaultConfig, 'utf-8');
    console.log(`✅ 默认配置已创建: ${configPath}`);
  }
}
