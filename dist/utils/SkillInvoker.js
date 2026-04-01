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
exports.SkillInvoker = void 0;
const Logger_1 = require("./Logger");
class SkillInvoker {
    constructor(skillsPath = '.config/agents/skills') {
        this.logger = new Logger_1.Logger();
        this.skillsPath = skillsPath;
    }
    /**
     * Invoke a Superpowers skill
     */
    async invoke(skillName, args) {
        this.logger.info(`🔧 Invoking skill: ${skillName}`);
        const skillPath = `${this.skillsPath}/${skillName}`;
        try {
            // Check if skill exists
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            await fs.access(`${skillPath}/SKILL.md`);
            // For now, return a placeholder result
            // In production, this would actually invoke the skill
            return {
                success: true,
                skill: skillName,
                result: args
            };
        }
        catch (error) {
            this.logger.warn(`Skill ${skillName} not found at ${skillPath}`);
            return { success: false, error: 'Skill not found' };
        }
    }
    /**
     * Check if skill exists
     */
    async exists(skillName) {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            await fs.access(`${this.skillsPath}/${skillName}/SKILL.md`);
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.SkillInvoker = SkillInvoker;
//# sourceMappingURL=SkillInvoker.js.map