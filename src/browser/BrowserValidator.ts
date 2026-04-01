import { Logger } from '../utils/Logger';
import { BrowserAgent } from './BrowserAgent';
import {
  BrowserValidationResult,
  AccessibilityIssue,
  VisualRegressionResult
} from './types';
import * as path from 'path';
import * as fs from 'fs/promises';

export class BrowserValidator {
  private browserAgent: BrowserAgent;
  private logger: Logger;
  private screenshotDir: string;

  constructor(screenshotDir: string = '.harness/artifacts/screenshots') {
    this.browserAgent = new BrowserAgent();
    this.logger = new Logger();
    this.screenshotDir = screenshotDir;
  }

  async validate(options: {
    url: string;
    takeScreenshot?: boolean;
    checkAccessibility?: boolean;
    checkPerformance?: boolean;
    expectedSelectors?: string[];
    expectedText?: string[];
  }): Promise<BrowserValidationResult> {
    this.logger.info(`🔍 Starting browser validation: ${options.url}`);

    await this.browserAgent.initialize('chromium');

    try {
      const navResult = await this.browserAgent.navigate(options.url);
      await new Promise(r => setTimeout(r, 1000));

      let screenshotPath: string | undefined;
      if (options.takeScreenshot) {
        screenshotPath = await this.saveScreenshot('validation');
      }

      const domSnapshot = await this.browserAgent.captureDOMSnapshot();

      const selectorChecks = await Promise.all(
        (options.expectedSelectors || []).map(async selector => ({
          selector,
          found: await this.browserAgent.verifyElement(selector)
        }))
      );

      const textChecks = await Promise.all(
        (options.expectedText || []).map(async text => ({
          text,
          found: await this.browserAgent.verifyText(text)
        }))
      );

      let performanceMetrics;
      if (options.checkPerformance) {
        performanceMetrics = await this.browserAgent.getPerformanceMetrics();
      }

      let accessibilityIssues: AccessibilityIssue[] = [];
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

    } finally {
      await this.browserAgent.close();
    }
  }

  async compareWithBaseline(
    baselinePath: string,
    threshold: number = 0.1
  ): Promise<VisualRegressionResult> {
    this.logger.info(`🔍 Comparing with baseline: ${baselinePath}`);

    await this.browserAgent.initialize('chromium');

    try {
      const currentScreenshot = await this.browserAgent.captureScreenshot();
      const currentPath = path.join(this.screenshotDir, 'current.png');
      
      await fs.mkdir(path.dirname(currentPath), { recursive: true });
      await fs.writeFile(currentPath, currentScreenshot);

      try {
        await fs.access(baselinePath);
      } catch {
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

    } finally {
      await this.browserAgent.close();
    }
  }

  private async checkAccessibility(): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

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

  private async saveScreenshot(name: string): Promise<string> {
    const screenshot = await this.browserAgent.captureScreenshot();
    const filePath = path.join(this.screenshotDir, `${name}-${Date.now()}.png`);
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, screenshot);
    
    return filePath;
  }

  private calculateDiffPercentage(baseline: Buffer, current: Buffer): number {
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
