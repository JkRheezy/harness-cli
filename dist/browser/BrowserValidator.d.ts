import { BrowserValidationResult, VisualRegressionResult } from './types';
export declare class BrowserValidator {
    private browserAgent;
    private logger;
    private screenshotDir;
    constructor(screenshotDir?: string);
    validate(options: {
        url: string;
        takeScreenshot?: boolean;
        checkAccessibility?: boolean;
        checkPerformance?: boolean;
        expectedSelectors?: string[];
        expectedText?: string[];
    }): Promise<BrowserValidationResult>;
    compareWithBaseline(baselinePath: string, threshold?: number): Promise<VisualRegressionResult>;
    private checkAccessibility;
    private saveScreenshot;
    private calculateDiffPercentage;
}
//# sourceMappingURL=BrowserValidator.d.ts.map