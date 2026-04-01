export interface InitOptions {
    force?: boolean;
    template?: string;
    projectName?: string;
    skipInstall?: boolean;
}
export declare class InitCommand {
    private logger;
    private templateManager;
    constructor();
    execute(options: InitOptions): Promise<void>;
    private installDependencies;
    private getInstallCommand;
}
//# sourceMappingURL=InitCommand.d.ts.map