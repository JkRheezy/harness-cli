"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignPhase = void 0;
const Logger_1 = require("../utils/Logger");
const SkillInvoker_1 = require("../utils/SkillInvoker");
class DesignPhase {
    constructor(autoDesign = true) {
        this.logger = new Logger_1.Logger();
        this.skillInvoker = new SkillInvoker_1.SkillInvoker();
        this.autoDesign = autoDesign;
    }
    /**
     * Run complete design phase for a task
     */
    async run(task) {
        this.logger.info(`🎨 Starting design phase for: ${task.title}`);
        // Step 1: Brainstorming
        const brainstormResult = await this.runBrainstorming(task);
        if (!brainstormResult.success) {
            return this.createResult('none', false, 'Brainstorming failed');
        }
        // Step 2: Writing Plans
        const planResult = await this.runPlanning(task, brainstormResult);
        if (!planResult.success) {
            return this.createResult('brainstorming', false, 'Planning failed');
        }
        // Step 3: Check for approval if required
        if (!this.autoDesign) {
            this.logger.info('⏳ Waiting for design approval...');
            return this.createResult('planning', false, 'Waiting for approval', planResult.path);
        }
        return this.createResult('ready', true, 'Design complete', planResult.path);
    }
    /**
     * Run brainstorming skill
     */
    async runBrainstorming(task) {
        this.logger.info('🧠 Running brainstorming...');
        const hasSkill = await this.skillInvoker.exists('brainstorming');
        if (!hasSkill) {
            this.logger.warn('Brainstorming skill not found, using fallback');
            return { success: true, fallback: true };
        }
        return await this.skillInvoker.invoke('brainstorming', {
            topic: task.title,
            description: task.description,
            requirements: task.requirements
        });
    }
    /**
     * Run writing-plans skill
     */
    async runPlanning(task, brainstormResult) {
        this.logger.info('📝 Running planning...');
        const hasSkill = await this.skillInvoker.exists('writing-plans');
        if (!hasSkill) {
            this.logger.warn('Writing-plans skill not found, using fallback');
            return { success: true, fallback: true, path: null };
        }
        return await this.skillInvoker.invoke('writing-plans', {
            task: task,
            brainstorm: brainstormResult
        });
    }
    createResult(phase, approved, summary, planPath) {
        return { phase, approved, summary, planPath };
    }
}
exports.DesignPhase = DesignPhase;
//# sourceMappingURL=DesignPhase.js.map