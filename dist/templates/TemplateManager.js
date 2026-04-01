"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateManager = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const handlebars_1 = __importDefault(require("handlebars"));
const Logger_1 = require("../utils/Logger");
class TemplateManager {
    constructor() {
        // 优先使用本地 templates，否则使用已安装的包中的 templates
        this.templatesDir = this.resolveTemplatesDir();
        this.logger = new Logger_1.Logger();
    }
    resolveTemplatesDir() {
        // 生产环境：使用包内的 templates（相对于当前文件的位置）
        // __dirname 是 dist/templates/，所以向上两级到项目根目录
        const packageTemplates = path_1.default.join(__dirname, '..', '..', 'templates');
        return packageTemplates;
    }
    async listTemplates() {
        try {
            const entries = await fs_1.promises.readdir(this.templatesDir, { withFileTypes: true });
            const templates = [];
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const configPath = path_1.default.join(this.templatesDir, entry.name, 'template.json');
                    try {
                        const configContent = await fs_1.promises.readFile(configPath, 'utf-8');
                        const config = JSON.parse(configContent);
                        templates.push({
                            ...config,
                            path: path_1.default.join(this.templatesDir, entry.name)
                        });
                    }
                    catch {
                        // 跳过无效的模板
                    }
                }
            }
            return templates;
        }
        catch (error) {
            this.logger.error('无法读取模板列表:', error);
            return [];
        }
    }
    async getTemplate(name) {
        const templates = await this.listTemplates();
        return templates.find(t => t.name === name) || null;
    }
    async scaffold(templateName, targetDir, context) {
        const template = await this.getTemplate(templateName);
        if (!template) {
            throw new Error(`模板不存在: ${templateName}`);
        }
        this.logger.info(`📦 使用模板: ${template.name}`);
        this.logger.info(`🎯 目标目录: ${targetDir}`);
        // 确保目标目录存在
        await fs_1.promises.mkdir(targetDir, { recursive: true });
        // 复制并渲染模板文件
        await this.copyTemplate(template.path, targetDir, context);
        this.logger.info('✅ 项目创建完成！');
    }
    async copyTemplate(sourceDir, targetDir, context) {
        const entries = await fs_1.promises.readdir(sourceDir, { withFileTypes: true });
        for (const entry of entries) {
            const sourcePath = path_1.default.join(sourceDir, entry.name);
            const targetPath = path_1.default.join(targetDir, entry.name);
            // 跳过模板配置文件
            if (entry.name === 'template.json')
                continue;
            if (entry.isDirectory()) {
                await fs_1.promises.mkdir(targetPath, { recursive: true });
                await this.copyTemplate(sourcePath, targetPath, context);
            }
            else {
                await this.processFile(sourcePath, targetPath, context);
            }
        }
    }
    async processFile(sourcePath, targetPath, context) {
        const content = await fs_1.promises.readFile(sourcePath, 'utf-8');
        // 检查是否是模板文件 (以 .hbs 结尾)
        if (sourcePath.endsWith('.hbs')) {
            // 渲染 Handlebars 模板
            const template = handlebars_1.default.compile(content);
            const rendered = template(context);
            // 移除 .hbs 后缀
            const finalPath = targetPath.replace(/\.hbs$/, '');
            await fs_1.promises.writeFile(finalPath, rendered, 'utf-8');
        }
        else {
            // 直接复制
            await fs_1.promises.copyFile(sourcePath, targetPath);
        }
    }
}
exports.TemplateManager = TemplateManager;
//# sourceMappingURL=TemplateManager.js.map