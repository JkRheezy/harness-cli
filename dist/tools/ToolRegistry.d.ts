export interface Tool {
    name: string;
    description: string;
    parameters: Record<string, any>;
    execute: (params: any) => Promise<any>;
}
export declare class ToolRegistry {
    private tools;
    private logger;
    constructor();
    register(name: string, tool: Tool): void;
    get(name: string): Tool | undefined;
    execute(name: string, params: any): Promise<any>;
    private registerDefaultTools;
}
//# sourceMappingURL=ToolRegistry.d.ts.map