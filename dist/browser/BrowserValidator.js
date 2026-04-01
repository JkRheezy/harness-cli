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
exports.BrowserValidator = void 0;
const Logger_1 = require("../utils/Logger");
const BrowserAgent_1 = require("./BrowserAgent");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
class BrowserValidator {
    constructor(screenshotDir = '.harness/artifacts/screenshots') {
        this.browserAgent = new BrowserAgent_1.BrowserAgent();
        this.logger = new Logger_1.Logger();
        this.screenshotDir = screenshotDir;
    }
    async validate(options) {
        this.logger.info(`🔍 Starting browser validation: ${options.url}`);
        await this.browserAgent.initialize('chromium');
        try {
            const navResult = await this.browserAgent.navigate(options.url);
            await new Promise(r => setTimeout(r, 1000));
            let screenshotPath;
            if (options.takeScreenshot) {
                screenshotPath = await this.saveScreenshot('validation');
            }
            const domSnapshot = await this.browserAgent.captureDOMSnapshot();
            const selectorChecks = await Promise.all((options.expectedSelectors || []).map(async (selector) => ({
                selector,
                found: await this.browserAgent.verifyElement(selector)
            })));
            const textChecks = await Promise.all((options.expectedText || []).map(async (text) => ({
                text,
                found: await this.browserAgent.verifyText(text)
            })));
            let performanceMetrics;
            if (options.checkPerformance) {
                performanceMetrics = await this.browserAgent.getPerformanceMetrics();
            }
            let accessibilityIssues = [];
            if (options.checkAccessibility) {
                accessibilityIssues = await this.checkAccessibility();
            }
            const consoleErrors = this.browserAgent.getConsoleLogs()
                .filter(log => log.includes('[error]'));
            const networkErrors = this.browserAgent.getNetworkErrors();
            const allSelectorsFound = selectorChecks.every(c => c.found);
            const allTextFound = textChecks.every(c => c.found);
            const hasNoCriticalErrors = consoleErrors.length === 0 && networkErrors.length === 0;
            const success = navResult.status === 200 &&
                allSelectorsFound &&
                allTextFound &&
                hasNoCriticalErrors;
            return {
                success,
                url: navResult.url,
                screenshotPath,
                domSnapshot,
                consoleErrors,
                networkErrors,
                accessibilityIssues,
                performanceMetrics
            };
        }
        finally {
            await this.browserAgent.close();
        }
    }
    async compareWithBaseline(baselinePath, threshold = 0.1) {
        this.logger.info(`🔍 Comparing with baseline: ${baselinePath}`);
        await this.browserAgent.initialize('chromium');
        try {
            const currentScreenshot = await this.browserAgent.captureScreenshot();
            const currentPath = path.join(this.screenshotDir, 'current.png');
            await fs.mkdir(path.dirname(currentPath), { recursive: true });
            await fs.writeFile(currentPath, currentScreenshot);
            try {
                await fs.access(baselinePath);
            }
            catch {
                await fs.mkdir(path.dirname(baselinePath), { recursive: true });
                await fs.writeFile(baselinePath, currentScreenshot);
                return {
                    hasChanges: false,
                    diffPercentage: 0,
                    baselinePath,
                    currentPath
                };
            }
            const baseline = await fs.readFile(baselinePath);
            const diffPercentage = this.calculateDiffPercentage(baseline, currentScreenshot);
            const hasChanges = diffPercentage > threshold;
            return {
                hasChanges,
                diffPercentage,
                baselinePath,
                currentPath
            };
        }
        finally {
            await this.browserAgent.close();
        }
    }
    async checkAccessibility() {
        const issues = [];
        const hasImagesWithoutAlt = await this.browserAgent.verifyElement('img:not([alt])');
        if (hasImagesWithoutAlt) {
            issues.push({
                severity: 'warning',
                rule: 'img-alt',
                message: 'Images without alt text detected'
            });
        }
        const hasEmptyLinks = await this.browserAgent.verifyElement('a:empty:not([aria-label])');
        if (hasEmptyLinks) {
            issues.push({
                severity: 'error',
                rule: 'link-text',
                message: 'Empty links without aria-label detected'
            });
        }
        const hasMissingLang = await this.browserAgent.verifyElement('html:not([lang])');
        if (hasMissingLang) {
            issues.push({
                severity: 'info',
                rule: 'html-lang',
                message: 'HTML element missing lang attribute'
            });
        }
        return issues;
    }
    async saveScreenshot(name) {
        const screenshot = await this.browserAgent.captureScreenshot();
        const filePath = path.join(this.screenshotDir, `${name}-${Date.now()}.png`);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, screenshot);
        return filePath;
    }
    calculateDiffPercentage(baseline, current) {
        if (baseline.length !== current.length) {
            return 100;
        }
        let diffPixels = 0;
        for (let i = 0; i < baseline.length; i++) {
            if (baseline[i] !== current[i]) {
                diffPixels++;
            }
        }
        return (diffPixels / baseline.length) * 100;
    }
}
exports.BrowserValidator = BrowserValidator;
//# sourceMappingURL=BrowserValidator.js.map