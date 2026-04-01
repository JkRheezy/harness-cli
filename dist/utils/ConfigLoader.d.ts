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
    projectPath?: string;
}
export declare class ConfigLoader {
    static load(configPath: string): Promise<HarnessConfig>;
    private static mergeConfig;
    private static resolveEnvVariables;
    static createDefaultConfig(): Promise<void>;
}
//# sourceMappingURL=ConfigLoader.d.ts.map