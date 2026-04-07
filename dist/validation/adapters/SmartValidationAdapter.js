"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartValidationAdapter = void 0;
const ValidationAdapter_1 = require("../ValidationAdapter");
const HealingOrchestrator_1 = require("../../healing/HealingOrchestrator");
/**
 * Base class for adapters with intelligent self-healing
 */
class SmartValidationAdapter extends ValidationAdapter_1.BaseValidationAdapter {
    constructor(logger, workingDir, config = {}) {
        super(logger, workingDir, config.enableHealing ?? true);
        this.enableHealing = config.enableHealing ?? true;
        if (this.enableHealing) {
            this.healingOrchestrator = new HealingOrchestrator_1.HealingOrchestrator(workingDir, logger, config.llmCaller, { maxTotalCost: config.maxHealingCost ?? 0.10 });
        }
        else {
            this.healingOrchestrator = null;
        }
    }
    /**
     * Run validation with intelligent healing
     */
    async validateWithHealing() {
        // First attempt
        let result = await this.validate();
        // If failed and healing enabled, try to heal
        if (!result.success && this.healingOrchestrator && result.errors) {
            this.logger.info(`[${this.name}] Validation failed, attempting healing...`);
            const healingResult = await this.healingOrchestrator.heal(result.errors, {
                taskType: this.name,
                projectType: this.detectProjectType()
            });
            // Log healing results
            this.logger.info(`[${this.name}] Healing attempts: ${healingResult.attempts.length}`);
            this.logger.info(`[${this.name}] Healing cost: $${healingResult.cost.estimatedCost.toFixed(4)}`);
            if (healingResult.success) {
                this.logger.info(`[${this.name}] Healing succeeded, retrying validation...`);
                // Retry validation after healing
                result = await this.validate();
                // Add healing info to result
                result.healingAttempted = true;
                result.healingSucceeded = true;
                result.healingCost = healingResult.cost;
            }
            else {
                this.logger.warn(`[${this.name}] Healing failed: ${healingResult.escalationReason}`);
                result.healingAttempted = true;
                result.healingSucceeded = false;
                result.healingCost = healingResult.cost;
            }
        }
        return result;
    }
    /**
     * Detect project type for better healing context
     */
    detectProjectType() {
        const fs = require('fs');
        const path = require('path');
        try {
            const packageJsonPath = path.join(this.workingDir, 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                return 'unknown';
            }
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            if (packageJson.dependencies?.next)
                return 'nextjs';
            if (packageJson.dependencies?.react)
                return 'react';
            if (packageJson.dependencies?.vue)
                return 'vue';
            if (packageJson.dependencies?.express)
                return 'express';
            if (packageJson.devDependencies?.typescript)
                return 'typescript';
            return 'nodejs';
        }
        catch {
            return 'unknown';
        }
    }
    /**
     * Override runWithAutoFix to use healing
     */
    async runWithAutoFix() {
        const ready = await this.checkPrerequisites();
        if (!ready) {
            // Try standard auto-fix first
            if (this.enableAutoFix && this.autoFix) {
                this.logger.info(`[${this.name}] Prerequisites not met, attempting standard auto-fix...`);
                const fixed = await this.autoFix();
                if (!fixed && this.healingOrchestrator) {
                    // Try intelligent healing for prerequisites
                    const error = `Prerequisites not met for ${this.name}`;
                    const healingResult = await this.healingOrchestrator.heal(error);
                    if (!healingResult.success) {
                        return {
                            success: false,
                            skipped: !this.isRequired,
                            skipReason: `Prerequisites not met and healing failed`,
                            canAutoFix: healingResult.canRetry
                        };
                    }
                }
                else if (!fixed) {
                    return {
                        success: false,
                        skipped: !this.isRequired,
                        skipReason: `Prerequisites not met`,
                        canAutoFix: false
                    };
                }
            }
        }
        // Run validation with healing
        return await this.validateWithHealing();
    }
}
exports.SmartValidationAdapter = SmartValidationAdapter;
//# sourceMappingURL=SmartValidationAdapter.js.map