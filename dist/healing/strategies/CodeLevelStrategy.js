"use strict";
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
exports.CodeLevelStrategy = void 0;
const types_1 = require("../types");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util_1 = require("util");
const child_process_1 = require("child_process");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Fast, deterministic healing for common issues
 * No LLM calls - pure code logic
 */
class CodeLevelStrategy {
    constructor(workingDir, logger) {
        this.workingDir = workingDir;
        this.logger = logger;
    }
    /**
     * Attempt to heal using code-level fixes
     */
    async heal(error, classification) {
        const startTime = Date.now();
        const attempt = {
            level: 1,
            strategy: 'code-level',
            success: false,
            durationMs: 0,
            cost: { llmCalls: 0, tokensUsed: 0, estimatedCost: 0 }
        };
        try {
            switch (classification.category) {
                case types_1.ErrorCategory.CONFIG_MISSING:
                    attempt.success = await this.fixMissingConfig(classification);
                    break;
                case types_1.ErrorCategory.DEPENDENCY_MISSING:
                    attempt.success = await this.fixMissingDependency(classification);
                    break;
                case types_1.ErrorCategory.COMMAND_NOT_FOUND:
                    attempt.success = await this.fixMissingCommand(classification);
                    break;
                case types_1.ErrorCategory.TIMEOUT:
                    attempt.success = await this.handleTimeout(classification);
                    break;
                default:
                    attempt.error = 'No code-level fix available for this error type';
                    return attempt;
            }
            if (attempt.success) {
                attempt.appliedFix = {
                    type: 'config',
                    description: `Fixed ${classification.category}`
                };
            }
        }
        catch (e) {
            attempt.error = e.message;
        }
        attempt.durationMs = Date.now() - startTime;
        return attempt;
    }
    /**
     * Fix missing configuration files
     */
    async fixMissingConfig(classification) {
        const config = classification.context.missingConfig;
        // Check if it's a known config type
        if (!config || config.includes('.eslintrc')) {
            return this.createEslintConfig();
        }
        if (config.includes('tsconfig')) {
            return this.createTsConfig();
        }
        if (config.includes('jest')) {
            return this.createJestConfig();
        }
        this.logger.warn(`[CodeLevelStrategy] Unknown config type: ${config}`);
        return false;
    }
    /**
     * Create ESLint config for Next.js projects
     */
    async createEslintConfig() {
        try {
            const packageJsonPath = path.join(this.workingDir, 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                return false;
            }
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            // Next.js project
            if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
                const eslintConfig = { extends: 'next/core-web-vitals' };
                fs.writeFileSync(path.join(this.workingDir, '.eslintrc.json'), JSON.stringify(eslintConfig, null, 2) + '\n');
                this.logger.info('[CodeLevelStrategy] Created .eslintrc.json for Next.js');
                return true;
            }
            // Generic TypeScript project
            if (fs.existsSync(path.join(this.workingDir, 'tsconfig.json'))) {
                const eslintConfig = {
                    parser: '@typescript-eslint/parser',
                    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
                    parserOptions: { ecmaVersion: 2020, sourceType: 'module' }
                };
                fs.writeFileSync(path.join(this.workingDir, '.eslintrc.json'), JSON.stringify(eslintConfig, null, 2) + '\n');
                this.logger.info('[CodeLevelStrategy] Created .eslintrc.json for TypeScript');
                return true;
            }
            // Basic JavaScript project
            const eslintConfig = { extends: 'eslint:recommended' };
            fs.writeFileSync(path.join(this.workingDir, '.eslintrc.json'), JSON.stringify(eslintConfig, null, 2) + '\n');
            this.logger.info('[CodeLevelStrategy] Created basic .eslintrc.json');
            return true;
        }
        catch (error) {
            this.logger.error('[CodeLevelStrategy] Failed to create ESLint config:', error.message);
            return false;
        }
    }
    /**
     * Create basic tsconfig.json
     */
    async createTsConfig() {
        const tsConfig = {
            compilerOptions: {
                target: 'ES2020',
                module: 'commonjs',
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: true,
                outDir: './dist',
                rootDir: './src'
            },
            include: ['src/**/*'],
            exclude: ['node_modules', 'dist']
        };
        fs.writeFileSync(path.join(this.workingDir, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2) + '\n');
        this.logger.info('[CodeLevelStrategy] Created tsconfig.json');
        return true;
    }
    /**
     * Create basic Jest config
     */
    async createJestConfig() {
        const jestConfig = {
            preset: 'ts-jest',
            testEnvironment: 'node',
            roots: ['<rootDir>/src'],
            testMatch: ['**/__tests__/**/*.test.ts']
        };
        fs.writeFileSync(path.join(this.workingDir, 'jest.config.js'), `module.exports = ${JSON.stringify(jestConfig, null, 2)};\n`);
        this.logger.info('[CodeLevelStrategy] Created jest.config.js');
        return true;
    }
    /**
     * Fix missing dependencies by running npm install
     */
    async fixMissingDependency(classification) {
        const moduleName = classification.context.missingModule;
        try {
            this.logger.info('[CodeLevelStrategy] Installing dependencies...');
            await execAsync('npm install', {
                cwd: this.workingDir,
                timeout: 300000
            });
            this.logger.info('[CodeLevelStrategy] Dependencies installed');
            return true;
        }
        catch (error) {
            this.logger.error('[CodeLevelStrategy] npm install failed:', error.message);
            return false;
        }
    }
    /**
     * Handle command not found
     */
    async fixMissingCommand(classification) {
        const command = classification.context.missingCommand;
        // For now, we can't auto-install system commands
        // But we can suggest it in the logs
        this.logger.warn(`[CodeLevelStrategy] Missing system command: ${command}`);
        return false;
    }
    /**
     * Handle timeout - retry with longer timeout (conceptual)
     */
    async handleTimeout(classification) {
        this.logger.info('[CodeLevelStrategy] Timeout detected, will retry with extended timeout');
        // The actual retry happens at a higher level
        return true;
    }
}
exports.CodeLevelStrategy = CodeLevelStrategy;
//# sourceMappingURL=CodeLevelStrategy.js.map