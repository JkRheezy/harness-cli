import { DocumentationInput, DocumentationResult } from './types';
export declare class ArchitectureDocGenerator {
    private logger;
    private template;
    constructor();
    loadTemplate(): Promise<void>;
    generate(input: DocumentationInput): Promise<DocumentationResult>;
    private buildContent;
    private generateOverview;
    private generateLayerInfo;
    private generateQualityScore;
    private generateCrossCutting;
}
export default ArchitectureDocGenerator;
//# sourceMappingURL=ArchitectureDocGenerator.d.ts.map