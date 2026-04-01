/**
 * Browser automation types for harness-loop
 */

export type BrowserType = 'chromium' | 'firefox' | 'webkit';

export interface DOMSnapshot {
  url: string;
  title: string;
  body: string;
  elements: DOMElement[];
}

export interface DOMElement {
  tag: string;
  id: string;
  class: string;
  text?: string;
  attributes: Record<string, string>;
}

export interface NavigationResult {
  url: string;
  status?: number;
  title: string;
  loadTime?: number;
}

export interface ScreenshotOptions {
  fullPage?: boolean;
  selector?: string;
  type?: 'png' | 'jpeg';
}

export interface BugReproductionStep {
  action: 'navigate' | 'click' | 'type' | 'select';
  url?: string;
  selector?: string;
  text?: string;
  value?: string;
}

export interface BugReproductionResult {
  screenshots: Buffer[];
  logs: string[];
  finalUrl: string;
  success: boolean;
}

export interface BrowserValidationResult {
  success: boolean;
  url: string;
  screenshotPath?: string;
  domSnapshot?: DOMSnapshot;
  consoleErrors: string[];
  networkErrors: string[];
  accessibilityIssues: AccessibilityIssue[];
  performanceMetrics?: PerformanceMetrics;
}

export interface AccessibilityIssue {
  severity: 'error' | 'warning' | 'info';
  rule: string;
  element?: string;
  message: string;
}

export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint?: number;
  largestContentfulPaint?: number;
}

export interface VisualRegressionResult {
  hasChanges: boolean;
  diffPercentage: number;
  diffScreenshotPath?: string;
  baselinePath: string;
  currentPath: string;
}
