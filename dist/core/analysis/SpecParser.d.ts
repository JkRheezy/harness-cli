import { TargetArchitecture, AgentSpec } from './types';
export declare class SpecParser {
    private projectPath;
    private cache;
    private cacheKey;
    constructor(projectPath: string);
    parse(): Promise<TargetArchitecture>;
    parseAgentsMd(content: string): Promise<AgentSpec[]>;
    private parseArchitectureMd;
    private splitByHeaders;
    private extractAgentFromSection;
    private finalizeModule;
    private hashContent;
}
//# sourceMappingURL=SpecParser.d.ts.map