"use strict";
/**
 * Bootstrap Generator for Six-Layer Architecture
 * Generates complete project foundation with all 6 layers
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BootstrapGenerator = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const TemplateRegistry_1 = require("./TemplateRegistry");
const Logger_1 = require("../utils/Logger");
class BootstrapGenerator {
    constructor() {
        this.templateRegistry = new TemplateRegistry_1.TemplateRegistry();
        this.logger = new Logger_1.Logger();
    }
    /**
     * Main method: bootstrap a new project with six-layer architecture
     */
    async bootstrap(input) {
        this.logger.info(`Starting bootstrap for project: ${input.projectName}`);
        // Track created resources for potential rollback
        const createdFiles = [];
        const createdDirs = [];
        try {
            // Validate and create target directory
            await this.ensureTargetDirectory(input.targetDir);
            const layers = [];
            const filesCreated = [];
            // Generate 6 layers in order: types → config → repo → service → runtime → ui
            const layerOrder = ['types', 'config', 'repo', 'service', 'runtime', 'ui'];
            for (const layerName of layerOrder) {
                const layerResult = await this.generateLayer(layerName, input, createdFiles, createdDirs);
                layers.push(layerResult);
                filesCreated.push(...layerResult.files);
            }
            // Generate root config files
            const configFiles = await this.generateRootConfigFiles(input, createdFiles);
            filesCreated.push(...configFiles);
            this.logger.info(`Bootstrap completed successfully: ${input.projectName}`);
            return {
                success: true,
                projectPath: path.resolve(input.targetDir),
                layers,
                filesCreated
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Bootstrap failed: ${errorMessage}`);
            // Rollback: clean up created files and directories
            await this.rollback(createdFiles, createdDirs);
            return {
                success: false,
                projectPath: input.targetDir,
                layers: [],
                filesCreated: [],
                error: errorMessage
            };
        }
    }
    /**
     * Rollback created files and directories on failure
     */
    async rollback(files, dirs) {
        this.logger.warn('Rolling back created resources...');
        // Delete files in reverse order (newest first)
        for (const file of [...files].reverse()) {
            try {
                await fs.promises.unlink(file);
                this.logger.debug(`Rolled back file: ${file}`);
            }
            catch (err) {
                // File might not exist, ignore error
            }
        }
        // Delete directories in reverse order
        for (const dir of [...dirs].reverse()) {
            try {
                const contents = await fs.promises.readdir(dir).catch(() => []);
                if (contents.length === 0) {
                    await fs.promises.rmdir(dir);
                    this.logger.debug(`Rolled back directory: ${dir}`);
                }
            }
            catch (err) {
                // Directory might not be empty or not exist, ignore error
            }
        }
        this.logger.warn('Rollback completed');
    }
    /**
     * Ensure target directory exists (create if not exists)
     */
    async ensureTargetDirectory(targetDir) {
        const absolutePath = path.resolve(targetDir);
        // Check if directory exists using async API
        const exists = await fs.promises.access(absolutePath).then(() => true).catch(() => false);
        if (exists) {
            // Check if it's a file
            const stats = await fs.promises.stat(absolutePath);
            if (!stats.isDirectory()) {
                throw new Error(`Target path exists and is not a directory: ${targetDir}`);
            }
            // Check if directory is empty
            const contents = await fs.promises.readdir(absolutePath);
            if (contents.length > 0) {
                throw new Error(`Target directory is not empty: ${targetDir}`);
            }
        }
        else {
            // Create directory using async API
            await fs.promises.mkdir(absolutePath, { recursive: true });
            this.logger.info(`Created target directory: ${absolutePath}`);
        }
    }
    /**
     * Generate a single layer
     */
    async generateLayer(layerName, input, createdFiles = [], createdDirs = []) {
        this.logger.info(`Generating layer: ${layerName}`);
        try {
            const template = this.templateRegistry.getTemplate(layerName, input.techStack);
            if (!template) {
                this.logger.warn(`No template found for layer: ${layerName}`);
                return {
                    layer: layerName,
                    created: false,
                    files: []
                };
            }
            const layerDir = path.join(input.targetDir, template.directory);
            const files = [];
            // Create layer directory using async API
            await fs.promises.mkdir(layerDir, { recursive: true });
            // Track directory for potential rollback
            if (!createdDirs.includes(layerDir)) {
                createdDirs.push(layerDir);
            }
            // Generate files from template
            for (const fileTemplate of template.files) {
                const filePath = path.join(layerDir, fileTemplate.path);
                const fileDir = path.dirname(filePath);
                // Ensure subdirectory exists using async API
                await fs.promises.mkdir(fileDir, { recursive: true });
                if (!createdDirs.includes(fileDir) && fileDir !== layerDir) {
                    createdDirs.push(fileDir);
                }
                // Replace variables in template
                const content = this.replaceVariables(fileTemplate.template, input);
                // Write file using async API
                await fs.promises.writeFile(filePath, content, 'utf-8');
                // Track file for potential rollback
                createdFiles.push(filePath);
                // Normalize path to use forward slashes for consistency
                const relativePath = path.relative(input.targetDir, filePath).replace(/\\/g, '/');
                files.push(relativePath);
                this.logger.debug(`Created file: ${filePath}`);
            }
            this.logger.info(`Layer ${layerName} generated with ${files.length} files`);
            return {
                layer: layerName,
                created: true,
                files
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to generate layer ${layerName}: ${errorMessage}`);
            return {
                layer: layerName,
                created: false,
                files: [],
                error: errorMessage
            };
        }
    }
    /**
     * Replace template variables with actual values
     */
    replaceVariables(template, input) {
        return template
            .replace(/\{\{projectName\}\}/g, input.projectName)
            .replace(/\{\{description\}\}/g, input.description)
            .replace(/\{\{ProjectName\}\}/g, input.projectName)
            .replace(/\{\{PROJECT_NAME\}\}/g, input.projectName);
    }
    /**
     * Generate root configuration files (package.json, tsconfig.json, .gitignore)
     */
    async generateRootConfigFiles(input, createdFiles = []) {
        const files = [];
        try {
            // Generate package.json
            const packageJsonPath = path.join(input.targetDir, 'package.json');
            const packageJson = this.generatePackageJson(input);
            await fs.promises.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
            createdFiles.push(packageJsonPath);
            files.push('package.json');
            // Generate tsconfig.json
            const tsconfigPath = path.join(input.targetDir, 'tsconfig.json');
            const tsconfig = this.generateTsConfig(input);
            await fs.promises.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2), 'utf-8');
            createdFiles.push(tsconfigPath);
            files.push('tsconfig.json');
            // Generate .gitignore
            const gitignorePath = path.join(input.targetDir, '.gitignore');
            const gitignore = this.generateGitignore(input);
            await fs.promises.writeFile(gitignorePath, gitignore, 'utf-8');
            createdFiles.push(gitignorePath);
            files.push('.gitignore');
            this.logger.info(`Generated ${files.length} root config files`);
            return files;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to generate root config files: ${errorMessage}`);
            throw error;
        }
    }
    /**
     * Generate package.json based on tech stack
     */
    generatePackageJson(input) {
        const dependencies = {
            zod: '^3.22.0'
        };
        const devDependencies = {
            typescript: '^5.3.0',
            '@types/node': '^20.0.0'
        };
        // Add Next.js dependencies if frontend is nextjs
        if (input.techStack.frontend === 'nextjs') {
            dependencies.next = '^14.0.0';
            dependencies.react = '^18.2.0';
            dependencies['react-dom'] = '^18.2.0';
            devDependencies['@types/react'] = '^18.2.0';
            devDependencies['@types/react-dom'] = '^18.2.0';
        }
        // Add Prisma if database is postgresql
        if (input.techStack.database === 'postgresql') {
            dependencies['@prisma/client'] = '^5.6.0';
            devDependencies.prisma = '^5.6.0';
        }
        return {
            name: input.projectName.toLowerCase().replace(/\s+/g, '-'),
            version: '0.1.0',
            description: input.description,
            private: true,
            scripts: {
                dev: input.techStack.frontend === 'nextjs' ? 'next dev' : 'tsx watch src/index.ts',
                build: input.techStack.frontend === 'nextjs' ? 'next build' : 'tsc',
                start: input.techStack.frontend === 'nextjs' ? 'next start' : 'node dist/index.js',
                lint: 'eslint . --ext .ts,.tsx',
                typecheck: 'tsc --noEmit'
            },
            dependencies,
            devDependencies
        };
    }
    /**
     * Generate tsconfig.json
     */
    generateTsConfig(input) {
        const config = {
            compilerOptions: {
                target: 'ES2022',
                lib: ['ES2022'],
                allowJs: true,
                skipLibCheck: true,
                strict: true,
                noEmit: false,
                esModuleInterop: true,
                module: 'ESNext',
                moduleResolution: 'bundler',
                resolveJsonModule: true,
                isolatedModules: true,
                jsx: input.techStack.frontend === 'nextjs' ? 'preserve' : undefined,
                incremental: true,
                baseUrl: '.',
                paths: {
                    '@/*': ['./src/*']
                }
            },
            include: ['src/**/*', '.env.d.ts'],
            exclude: ['node_modules', 'dist', '.next']
        };
        // Remove undefined values
        if (config.compilerOptions && config.compilerOptions.jsx === undefined) {
            delete config.compilerOptions.jsx;
        }
        return config;
    }
    /**
     * Generate .gitignore
     */
    generateGitignore(input) {
        const ignores = [
            '# Dependencies',
            'node_modules/',
            '.pnp',
            '.pnp.js',
            '',
            '# Production builds',
            'dist/',
            'build/',
            '.next/',
            'out/',
            '',
            '# Environment variables',
            '.env',
            '.env.local',
            '.env.*.local',
            '',
            '# IDE',
            '.idea/',
            '.vscode/',
            '*.swp',
            '*.swo',
            '',
            '# OS',
            '.DS_Store',
            'Thumbs.db',
            '',
            '# Logs',
            'logs/',
            '*.log',
            'npm-debug.log*',
            'yarn-debug.log*',
            'yarn-error.log*',
            '',
            '# Testing',
            'coverage/',
            '.nyc_output/',
            '',
            '# Prisma (if applicable)',
            '*.db',
            '*.db-journal'
        ];
        return ignores.join('\n');
    }
}
exports.BootstrapGenerator = BootstrapGenerator;
//# sourceMappingURL=BootstrapGenerator.js.map