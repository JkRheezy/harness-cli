export interface InitOptions {
    force?: boolean;
    template?: string;
    projectName?: string;
    skipInstall?: boolean;
    skipAnalysis?: boolean;
    autoStart?: boolean;
}
export declare class InitCommand {
    private logger;
    private templateManager;
    constructor();
    execute(options: InitOptions): Promise<void>;
    private installDependencies;
    private getInstallCommand;
    /**
     * 加载 LLM 配置
     */
    private loadLLMConfig;
    /**
     * 生成智能文档
     */
    private generateSmartDocs;
}
//# sourceMappingURL=InitCommand.d.ts.map