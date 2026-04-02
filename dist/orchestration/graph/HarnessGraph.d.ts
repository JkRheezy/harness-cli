export interface GraphConfig {
    llmConfig: any;
    workingDir: string;
}
export declare class HarnessGraph {
    private graph;
    private compiledGraph;
    private logger;
    constructor(orchestrationConfig: any, graphConfig: GraphConfig);
    private buildGraph;
    compile(): any;
    getGraph(): any;
    getMermaidDiagram(): string;
}
//# sourceMappingURL=HarnessGraph.d.ts.map