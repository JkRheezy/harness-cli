import { BrowserType, DOMSnapshot, NavigationResult, ScreenshotOptions, BugReproductionStep, BugReproductionResult, PerformanceMetrics } from './types';
export declare class BrowserAgent {
    private browser;
    private page;
    private logger;
    private consoleLogs;
    private networkErrors;
    constructor();
    initialize(browserType?: BrowserType): Promise<void>;
    private setupEventListeners;
    navigate(url: string): Promise<NavigationResult>;
    captureDOMSnapshot(): Promise<DOMSnapshot>;
    captureScreenshot(options?: ScreenshotOptions): Promise<Buffer>;
    click(selector: string): Promise<void>;
    type(selector: string, text: string): Promise<void>;
    verifyElement(selector: string): Promise<boolean>;
    verifyText(text: string): Promise<boolean>;
    getPerformanceMetrics(): Promise<PerformanceMetrics>;
    reproduceBug(steps: BugReproductionStep[]): Promise<BugReproductionResult>;
    getConsoleLogs(): string[];
    getNetworkErrors(): string[];
    clearLogs(): void;
    close(): Promise<void>;
}
//# sourceMappingURL=BrowserAgent.d.ts.map