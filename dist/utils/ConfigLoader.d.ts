import { EvolutionConfig, BusinessContext } from '../evolution/types';
export interface UnattendedConfig {
    enabled: boolean;
    maxConsecutiveErrors: number;
    pauseOnHighErrorRate: boolean;
    errorRateThreshold: number;
    autoResume: boolean;
    resumeDelay: number;
}
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
    evolution?: EvolutionConfig;
    businessContext?: BusinessContext;
    unattended?: UnattendedConfig;
}
export declare class ConfigLoader {
    static load(configPath: string): Promise<HarnessConfig>;
    private static mergeConfig;
    private static resolveEnvVariables;
    static createDefaultConfig(): Promise<void>;
}
//# sourceMappingURL=ConfigLoader.d.ts.map