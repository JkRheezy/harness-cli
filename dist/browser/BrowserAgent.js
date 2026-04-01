"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserAgent = void 0;
const Logger_1 = require("../utils/Logger");
const playwright_1 = require("playwright");
class BrowserAgent {
    constructor() {
        this.browser = null;
        this.page = null;
        this.consoleLogs = [];
        this.networkErrors = [];
        this.logger = new Logger_1.Logger();
    }
    async initialize(browserType = 'chromium') {
        this.logger.info(`🌐 Initializing ${browserType} browser...`);
        const browserLauncher = { chromium: playwright_1.chromium, firefox: playwright_1.firefox, webkit: playwright_1.webkit }[browserType];
        this.browser = await browserLauncher.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        await this.page.setViewportSize({ width: 1280, height: 720 });
        this.setupEventListeners();
        this.logger.info('✅ Browser initialized');
    }
    setupEventListeners() {
        if (!this.page)
            return;
        this.page.on('console', (msg) => {
            const log = `[${msg.type()}] ${msg.text()}`;
            this.consoleLogs.push(log);
            if (msg.type() === 'error') {
                this.logger.warn(`🌐 Console error: ${msg.text()}`);
            }
        });
        this.page.on('response', (response) => {
            if (response.status() >= 400) {
                const error = `${response.status()} ${response.url()}`;
                this.networkErrors.push(error);
                this.logger.warn(`🌐 Network error: ${error}`);
            }
        });
        this.page.on('pageerror', (error) => {
            this.consoleLogs.push(`[pageerror] ${error.message}`);
            this.logger.error(`🌐 Page error: ${error.message}`);
        });
    }
    async navigate(url) {
        if (!this.page)
            throw new Error('Browser not initialized');
        this.logger.info(`🌐 Navigating to: ${url}`);
        const startTime = Date.now();
        const response = await this.page.goto(url, {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        const loadTime = Date.now() - startTime;
        const result = {
            url: this.page.url(),
            status: response?.status(),
            title: await this.page.title(),
            loadTime
        };
        this.logger.info(`✅ Navigated: ${result.title} (${loadTime}ms)`);
        return result;
    }
    async captureDOMSnapshot() {
        if (!this.page)
            throw new Error('Browser not initialized');
        this.logger.info('📸 Capturing DOM snapshot...');
        const snapshot = await this.page.evaluate(() => {
            return {
                url: window.location.href,
                title: document.title,
                body: document.body?.innerHTML || '',
                elements: Array.from(document.querySelectorAll('*')).slice(0, 100).map(el => ({
                    tag: el.tagName,
                    id: el.id,
                    class: el.className,
                    text: el.textContent?.slice(0, 100),
                    attributes: Object.fromEntries(Array.from(el.attributes).map(attr => [attr.name, attr.value]))
                }))
            };
        });
        return snapshot;
    }
    async captureScreenshot(options) {
        if (!this.page)
            throw new Error('Browser not initialized');
        this.logger.info('📸 Capturing screenshot...');
        if (options?.selector) {
            const element = await this.page.$(options.selector);
            if (!element)
                throw new Error(`Element not found: ${options.selector}`);
            return await element.screenshot({ type: options.type || 'png' });
        }
        return await this.page.screenshot({
            fullPage: options?.fullPage ?? true,
            type: options?.type || 'png'
        });
    }
    async click(selector) {
        if (!this.page)
            throw new Error('Browser not initialized');
        this.logger.info(`🖱️  Clicking: ${selector}`);
        await this.page.click(selector);
    }
    async type(selector, text) {
        if (!this.page)
            throw new Error('Browser not initialized');
        this.logger.info(`⌨️  Typing into: ${selector}`);
        await this.page.fill(selector, text);
    }
    async verifyElement(selector) {
        if (!this.page)
            throw new Error('Browser not initialized');
        const element = await this.page.$(selector);
        return element !== null;
    }
    async verifyText(text) {
        if (!this.page)
            throw new Error('Browser not initialized');
        const pageContent = await this.page.content();
        return pageContent.includes(text);
    }
    async getPerformanceMetrics() {
        if (!this.page)
            throw new Error('Browser not initialized');
        const metrics = await this.page.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const paint = performance.getEntriesByType('paint');
            return {
                loadTime: navigation?.loadEventEnd - navigation?.startTime || 0,
                domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.startTime || 0,
                firstPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime
            };
        });
        return metrics;
    }
    async reproduceBug(steps) {
        const screenshots = [];
        for (const step of steps) {
            switch (step.action) {
                case 'navigate':
                    if (step.url)
                        await this.navigate(step.url);
                    break;
                case 'click':
                    if (step.selector)
                        await this.click(step.selector);
                    break;
                case 'type':
                    if (step.selector && step.text)
                        await this.type(step.selector, step.text);
                    break;
            }
            await this.page?.waitForTimeout(500);
            screenshots.push(await this.captureScreenshot());
        }
        return {
            screenshots,
            logs: this.consoleLogs,
            finalUrl: this.page?.url() || '',
            success: true
        };
    }
    getConsoleLogs() { return [...this.consoleLogs]; }
    getNetworkErrors() { return [...this.networkErrors]; }
    clearLogs() { this.consoleLogs = []; this.networkErrors = []; }
    async close() {
        if (this.browser) {
            this.logger.info('🔒 Closing browser...');
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }
}
exports.BrowserAgent = BrowserAgent;
//# sourceMappingURL=BrowserAgent.js.map