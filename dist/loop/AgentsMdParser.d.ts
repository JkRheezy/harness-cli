import { ParsedAgentsMd } from './types';
/**
 * Parses AGENTS.md to extract structured information
 * Enables document-driven development
 */
export declare class AgentsMdParser {
    private logger;
    constructor();
    /**
     * Parse AGENTS.md file
     */
    parse(projectPath: string): Promise<ParsedAgentsMd>;
    parseContent(content: string): ParsedAgentsMd;
    private extractProjectName;
    private extractDescription;
    private extractTechStack;
    private extractQuickStart;
    private extractDocumentMap;
    private extractCommonTasks;
    private extractConstraints;
}
export default AgentsMdParser;
//# sourceMappingURL=AgentsMdParser.d.ts.map