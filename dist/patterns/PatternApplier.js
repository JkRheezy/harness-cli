"use strict";
/**
 * Base Pattern Applier
 *
 * Abstract base class providing common functionality for pattern appliers.
 * Pattern appliers overlay additional architecture on top of the six-layer foundation.
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
exports.BasePatternApplier = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
/**
 * Abstract base class for pattern appliers
 */
class BasePatternApplier {
    /**
     * Ensure a directory exists, creating it if necessary
     */
    async ensureDir(dir) {
        await fs.mkdir(dir, { recursive: true });
    }
    /**
     * Write content to a file, ensuring parent directory exists
     */
    async writeFile(filePath, content) {
        await this.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, content, 'utf-8');
    }
    /**
     * Read file content
     */
    async readFile(filePath) {
        return fs.readFile(filePath, 'utf-8');
    }
    /**
     * Check if a file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Create a standard pattern result
     */
    createResult(patternName, success, filesCreated = [], modifications = [], error) {
        return {
            pattern: patternName,
            success,
            filesCreated,
            modifications,
            error
        };
    }
    /**
     * Add a file creation modification
     */
    addModification(modifications, filePath, type, description) {
        modifications.push({
            path: filePath,
            type,
            description
        });
    }
}
exports.BasePatternApplier = BasePatternApplier;
//# sourceMappingURL=PatternApplier.js.map