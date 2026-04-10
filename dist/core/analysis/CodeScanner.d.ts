/**
 * CodeScanner - Scans source code to identify current implementation state
 */
import { CurrentImplementation, ImplementedAgent, ExportSymbol } from './types';
export declare class CodeScanner {
    private projectPath;
    private readonly moduleDirectories;
    constructor(projectPath: string);
    scan(): Promise<CurrentImplementation>;
    scanAgents(): Promise<ImplementedAgent[]>;
    private scanModules;
    private scanFiles;
    private scanDirectory;
    private scanAllExports;
    private scanExportsInDirectory;
    extractExports(content: string): Promise<{
        name: string;
        type: ExportSymbol['type'];
    }[]>;
    private extractImports;
    calculateCompleteness(content: string): number;
    private detectResponsibilities;
    private detectLayer;
    private getFileType;
}
//# sourceMappingURL=CodeScanner.d.ts.map