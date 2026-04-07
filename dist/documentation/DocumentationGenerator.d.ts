import { DocumentationInput, DocumentationResult } from './types';
/**
 * Main orchestrator for documentation generation
 * Generates complete knowledge base for Harness projects
 */
export declare class DocumentationGenerator {
    private agentsMdGenerator;
    private architectureDocGenerator;
    private logger;
    constructor();
    /**
     * Generate complete documentation knowledge base
     */
    generate(input: DocumentationInput): Promise<DocumentationResult>;
    private generateDocStructure;
}
export default DocumentationGenerator;
//# sourceMappingURL=DocumentationGenerator.d.ts.map