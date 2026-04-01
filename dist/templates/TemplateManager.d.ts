export interface TemplateConfig {
    name: string;
    description: string;
    version: string;
    path: string;
    variables: TemplateVariable[];
}
export interface TemplateVariable {
    name: string;
    description: string;
    default?: string;
    required?: boolean;
}
export interface TemplateContext {
    projectName: string;
    projectDescription?: string;
    author?: string;
    version?: string;
    [key: string]: any;
}
export declare class TemplateManager {
    private templatesDir;
    private logger;
    constructor();
    private resolveTemplatesDir;
    listTemplates(): Promise<TemplateConfig[]>;
    getTemplate(name: string): Promise<TemplateConfig | null>;
    scaffold(templateName: string, targetDir: string, context: TemplateContext): Promise<void>;
    private copyTemplate;
    private processFile;
}
//# sourceMappingURL=TemplateManager.d.ts.map