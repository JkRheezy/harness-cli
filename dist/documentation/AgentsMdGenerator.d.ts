import { DocumentationInput, DocumentationResult } from './types';
export declare class AgentsMdGenerator {
    private logger;
    private template;
    constructor();
    loadTemplate(): Promise<void>;
    generate(input: DocumentationInput): Promise<DocumentationResult>;
    private buildContent;
    private formatTechStack;
    private generateSetupCommands;
    private generateStartCommand;
    private generateCommonTasks;
    private generateConstraints;
    private registerHelpers;
}
export default AgentsMdGenerator;
//# sourceMappingURL=AgentsMdGenerator.d.ts.map