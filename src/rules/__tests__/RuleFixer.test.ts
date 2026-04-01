import { RuleFixer, RuleFixerOptions } from '../RuleFixer';
import { RuleViolation, Severity } from '../types';

describe('RuleFixer', () => {
  let fixer: RuleFixer;

  beforeEach(() => {
    fixer = new RuleFixer({ dryRun: false });
  });

  describe('fixFile', () => {
    it('should apply replacement with capture groups ($1, $2)', async () => {
      const fileContent = 'const foo = require("bar");';
      const match = ['require("bar")', 'bar'] as RegExpMatchArray;
      match.index = 12;

      const violations: RuleViolation[] = [
        {
          ruleId: 'no-require',
          ruleName: 'No require()',
          severity: 'error' as Severity,
          filePath: 'test.ts',
          line: 1,
          column: 13,
          message: 'Use import instead of require',
          autoFixable: true,
          fix: {
            replacement: 'import $1 from "$1"',
          },
          match,
        },
      ];

      const result = await fixer.fixFile(fileContent, violations);

      expect(result.success).toBe(true);
      expect(result.appliedFixes).toHaveLength(1);
      expect(result.appliedFixes[0]).toEqual({
        line: 1,
        ruleId: 'no-require',
        original: 'require("bar")',
        replacement: 'import bar from "bar"',
      });
      expect(result.fixedCode).toBe('const foo = import bar from "bar";');
    });

    it('should process multiple capture groups', async () => {
      const fileContent = 'function test(a, b) {}';
      const match = ['function test(a, b) {}', 'test', 'a, b'] as RegExpMatchArray;
      match.index = 0;

      const violations: RuleViolation[] = [
        {
          ruleId: 'prefer-arrow',
          ruleName: 'Prefer Arrow Functions',
          severity: 'warning' as Severity,
          filePath: 'test.ts',
          line: 1,
          column: 1,
          message: 'Use arrow function',
          autoFixable: true,
          fix: {
            replacement: 'const $1 = ($2) => {}',
          },
          match,
        },
      ];

      const result = await fixer.fixFile(fileContent, violations);

      expect(result.success).toBe(true);
      expect(result.fixedCode).toBe('const test = (a, b) => {}');
    });

    it('should not modify file in dry-run mode', async () => {
      const fileContent = 'var x = 1;';
      const fixerDry = new RuleFixer({ dryRun: true });

      const violations: RuleViolation[] = [
        {
          ruleId: 'no-var',
          ruleName: 'No Var',
          severity: 'error' as Severity,
          filePath: 'test.ts',
          line: 1,
          column: 1,
          message: 'Use const or let',
          autoFixable: true,
          fix: {
            replacement: 'const x = 1;',
          },
        },
      ];

      const result = await fixerDry.fixFile(fileContent, violations);

      expect(result.success).toBe(true);
      expect(result.fixedCode).toBeUndefined();
      expect(result.appliedFixes).toHaveLength(1);
    });

    it('should process fixes from bottom to top to preserve line numbers', async () => {
      const fileContent = 'var a = 1;\nvar b = 2;\nvar c = 3;';

      const violations: RuleViolation[] = [
        {
          ruleId: 'no-var',
          ruleName: 'No Var',
          severity: 'error' as Severity,
          filePath: 'test.ts',
          line: 1,
          column: 1,
          message: 'Use const',
          autoFixable: true,
          fix: {
            replacement: 'const a = 1;',
          },
        },
        {
          ruleId: 'no-var',
          ruleName: 'No Var',
          severity: 'error' as Severity,
          filePath: 'test.ts',
          line: 2,
          column: 1,
          message: 'Use const',
          autoFixable: true,
          fix: {
            replacement: 'const b = 2;',
          },
        },
        {
          ruleId: 'no-var',
          ruleName: 'No Var',
          severity: 'error' as Severity,
          filePath: 'test.ts',
          line: 3,
          column: 1,
          message: 'Use const',
          autoFixable: true,
          fix: {
            replacement: 'const c = 3;',
          },
        },
      ];

      const result = await fixer.fixFile(fileContent, violations);

      expect(result.success).toBe(true);
      expect(result.fixedCode).toBe('const a = 1;\nconst b = 2;\nconst c = 3;');
      expect(result.appliedFixes).toHaveLength(3);
    });

    it('should handle partial line replacement with match.index', async () => {
      const fileContent = 'console.log("hello"); // old comment';
      const match = ['// old comment'] as RegExpMatchArray;
      match.index = 22;

      const violations: RuleViolation[] = [
        {
          ruleId: 'update-comment',
          ruleName: 'Update Comment',
          severity: 'warning' as Severity,
          filePath: 'test.ts',
          line: 1,
          column: 23,
          message: 'Update comment',
          autoFixable: true,
          fix: {
            replacement: '// new comment',
          },
          match,
        },
      ];

      const result = await fixer.fixFile(fileContent, violations);

      expect(result.success).toBe(true);
      expect(result.fixedCode).toBe('console.log("hello"); // new comment');
    });

    it('should handle violations without line numbers', async () => {
      const fileContent = 'bad code here';

      const violations: RuleViolation[] = [
        {
          ruleId: 'generic-error',
          ruleName: 'Generic Error',
          severity: 'error' as Severity,
          filePath: 'test.ts',
          message: 'Fix this',
          autoFixable: true,
          fix: {
            replacement: 'good code here',
          },
        },
      ];

      const result = await fixer.fixFile(fileContent, violations);

      expect(result.success).toBe(false);
      expect(result.failedFixes).toHaveLength(1);
      expect(result.failedFixes[0].reason).toContain('No line number specified');
    });

    it('should skip non-auto-fixable violations', async () => {
      const fileContent = 'var x = 1;';

      const violations: RuleViolation[] = [
        {
          ruleId: 'no-var',
          ruleName: 'No Var',
          severity: 'error' as Severity,
          filePath: 'test.ts',
          line: 1,
          column: 1,
          message: 'Use const or let',
          autoFixable: false,
        },
      ];

      const result = await fixer.fixFile(fileContent, violations);

      expect(result.success).toBe(true);
      expect(result.appliedFixes).toHaveLength(0);
      expect(result.fixedCode).toBe(fileContent);
    });

    it('should handle empty violations array', async () => {
      const fileContent = 'const x = 1;';
      const result = await fixer.fixFile(fileContent, []);

      expect(result.success).toBe(true);
      expect(result.appliedFixes).toHaveLength(0);
      expect(result.fixedCode).toBe(fileContent);
    });

    it('should handle special $& replacement pattern', async () => {
      const fileContent = 'TODO: fix this';
      const match = ['TODO'] as RegExpMatchArray;
      match.index = 0;

      const violations: RuleViolation[] = [
        {
          ruleId: 'todo-format',
          ruleName: 'TODO Format',
          severity: 'warning' as Severity,
          filePath: 'test.ts',
          line: 1,
          column: 1,
          message: 'Format TODO',
          autoFixable: true,
          fix: {
            replacement: '[$&]', // $& should be replaced with entire match
          },
          match,
        },
      ];

      const result = await fixer.fixFile(fileContent, violations);

      expect(result.fixedCode).toBe('[TODO]: fix this');
    });

    it('should handle escaped dollar signs', async () => {
      const fileContent = 'price: 10';
      const match = ['10'] as RegExpMatchArray;
      match.index = 7;

      const violations: RuleViolation[] = [
        {
          ruleId: 'add-currency',
          ruleName: 'Add Currency',
          severity: 'warning' as Severity,
          filePath: 'test.ts',
          line: 1,
          column: 8,
          message: 'Add currency symbol',
          autoFixable: true,
          fix: {
            replacement: '\\$10', // Escaped dollar sign
          },
          match,
        },
      ];

      const result = await fixer.fixFile(fileContent, violations);

      expect(result.fixedCode).toBe('price: $10');
    });

    it('should support $0 as alias for entire match', async () => {
      const fileContent = 'TODO: fix this';
      const match = ['TODO'] as RegExpMatchArray;
      match.index = 0;

      const violations: RuleViolation[] = [
        {
          ruleId: 'todo-format',
          ruleName: 'TODO Format',
          severity: 'warning' as Severity,
          filePath: 'test.ts',
          line: 1,
          column: 1,
          message: 'Format TODO',
          autoFixable: true,
          fix: {
            replacement: '[$0]', // $0 should be replaced with entire match
          },
          match,
        },
      ];

      const result = await fixer.fixFile(fileContent, violations);

      expect(result.fixedCode).toBe('[TODO]: fix this');
    });

    it('should handle $$ escape sequence for literal dollar sign', async () => {
      const fileContent = 'price: 10';
      const match = ['10'] as RegExpMatchArray;
      match.index = 7;

      const violations: RuleViolation[] = [
        {
          ruleId: 'add-currency',
          ruleName: 'Add Currency',
          severity: 'warning' as Severity,
          filePath: 'test.ts',
          line: 1,
          column: 8,
          message: 'Add currency symbol',
          autoFixable: true,
          fix: {
            replacement: '$$10', // $$ should be replaced with literal $
          },
          match,
        },
      ];

      const result = await fixer.fixFile(fileContent, violations);

      expect(result.fixedCode).toBe('price: $10');
    });

    it('should support multi-digit capture groups ($10)', async () => {
      // Create a match array with 11 elements (index 0-10)
      const match = ['match0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10'] as RegExpMatchArray;
      match.index = 0;

      const fileContent = 'match0';

      const violations: RuleViolation[] = [
        {
          ruleId: 'multi-capture',
          ruleName: 'Multi Capture',
          severity: 'warning' as Severity,
          filePath: 'test.ts',
          line: 1,
          column: 1,
          message: 'Replace with 10th capture group',
          autoFixable: true,
          fix: {
            replacement: '[$10]', // $10 should reference the 10th capture group
          },
          match,
        },
      ];

      const result = await fixer.fixFile(fileContent, violations);

      expect(result.success).toBe(true);
      expect(result.fixedCode).toBe('[m10]');
    });

    it('should handle overlapping fixes on same line (documenting current behavior)', async () => {
      // When fixes overlap on the same line, they are applied right-to-left
      // This means the rightmost fix is applied first, then the leftmost
      // Depending on the replacement, this may produce unexpected results
      const fileContent = 'var a = 1, b = 2;';

      const violations: RuleViolation[] = [
        {
          ruleId: 'no-var',
          ruleName: 'No Var',
          severity: 'error' as Severity,
          filePath: 'test.ts',
          line: 1,
          column: 1,
          message: 'Use const',
          autoFixable: true,
          fix: {
            replacement: 'const', // Replace 'var' at column 1
          },
        },
        {
          ruleId: 'prefer-let',
          ruleName: 'Prefer Let',
          severity: 'warning' as Severity,
          filePath: 'test.ts',
          line: 1,
          column: 12,
          message: 'Use let for b',
          autoFixable: true,
          fix: {
            replacement: 'let', // Replace at column 12
          },
        },
      ];

      const result = await fixer.fixFile(fileContent, violations);

      // Both fixes should be applied (non-overlapping in this case)
      expect(result.success).toBe(true);
      expect(result.appliedFixes).toHaveLength(2);
    });

    it('should set partial: true when some fixes succeed and others fail', async () => {
      const fileContent = 'var x = 1;';

      const violations: RuleViolation[] = [
        {
          ruleId: 'no-var',
          ruleName: 'No Var',
          severity: 'error' as Severity,
          filePath: 'test.ts',
          line: 1,
          column: 1,
          message: 'Use const',
          autoFixable: true,
          fix: {
            replacement: 'const',
          },
        },
        {
          ruleId: 'nonexistent-rule',
          ruleName: 'Nonexistent Rule',
          severity: 'error' as Severity,
          filePath: 'test.ts',
          line: 999, // Out of range line
          column: 1,
          message: 'This will fail',
          autoFixable: true,
          fix: {
            replacement: 'fix',
          },
        },
      ];

      const result = await fixer.fixFile(fileContent, violations);

      expect(result.success).toBe(false);
      expect(result.partial).toBe(true);
      expect(result.appliedFixes).toHaveLength(1);
      expect(result.failedFixes).toHaveLength(1);
    });
  });

  describe('generateFixReport', () => {
    it('should generate report for auto-fixable violations', () => {
      const violations: RuleViolation[] = [
        {
          ruleId: 'no-console',
          ruleName: 'No Console',
          severity: 'warning' as Severity,
          filePath: 'test.ts',
          line: 5,
          column: 1,
          message: 'Remove console.log',
          autoFixable: true,
          fix: {
            instruction: 'Delete the console.log statement',
            example_before: 'console.log("debug")',
            example_after: '',
          },
        },
      ];

      const report = fixer.generateFixReport(violations);

      expect(report).toContain('FIX REPORT');
      expect(report).toContain('no-console:5:1');
      expect(report).toContain('Remove console.log');
      expect(report).toContain('Delete the console.log statement');
      expect(report).toContain('1 auto-fixable');
    });

    it('should generate report for manual fix violations', () => {
      const violations: RuleViolation[] = [
        {
          ruleId: 'complex-logic',
          ruleName: 'Complex Logic',
          severity: 'error' as Severity,
          filePath: 'test.ts',
          line: 10,
          message: 'Refactor this complex function',
          autoFixable: false,
          fix: {
            instruction: 'Extract into smaller functions',
          },
          codeSnippet: 'function doEverything() { ... }',
        },
      ];

      const report = fixer.generateFixReport(violations);

      expect(report).toContain('Manual Fix Required');
      expect(report).toContain('complex-logic:10');
      expect(report).toContain('How to fix: Extract into smaller functions');
      expect(report).toContain('0 auto-fixable');
      expect(report).toContain('1 require manual fix');
    });

    it('should handle empty violations array', () => {
      const report = fixer.generateFixReport([]);

      expect(report).toContain('No violations found');
    });

    it('should include severity in report', () => {
      const violations: RuleViolation[] = [
        {
          ruleId: 'error-rule',
          ruleName: 'Error Rule',
          severity: 'error' as Severity,
          filePath: 'test.ts',
          line: 1,
          message: 'Error message',
          autoFixable: true,
        },
        {
          ruleId: 'info-rule',
          ruleName: 'Info Rule',
          severity: 'info' as Severity,
          filePath: 'test.ts',
          line: 2,
          message: 'Info message',
          autoFixable: false,
        },
      ];

      const report = fixer.generateFixReport(violations);

      expect(report).toContain('[ERROR]');
      expect(report).toContain('[INFO]');
    });
  });

  describe('canAutoFixAll', () => {
    it('should return true for empty array', () => {
      expect(fixer.canAutoFixAll([])).toBe(true);
    });

    it('should return true when all violations are auto-fixable', () => {
      const violations: RuleViolation[] = [
        {
          ruleId: 'rule1',
          ruleName: 'Rule 1',
          severity: 'error' as Severity,
          filePath: 'test.ts',
          message: 'Error 1',
          autoFixable: true,
        },
        {
          ruleId: 'rule2',
          ruleName: 'Rule 2',
          severity: 'warning' as Severity,
          filePath: 'test.ts',
          message: 'Error 2',
          autoFixable: true,
        },
      ];

      expect(fixer.canAutoFixAll(violations)).toBe(true);
    });

    it('should return false when any violation is not auto-fixable', () => {
      const violations: RuleViolation[] = [
        {
          ruleId: 'rule1',
          ruleName: 'Rule 1',
          severity: 'error' as Severity,
          filePath: 'test.ts',
          message: 'Error 1',
          autoFixable: true,
        },
        {
          ruleId: 'rule2',
          ruleName: 'Rule 2',
          severity: 'warning' as Severity,
          filePath: 'test.ts',
          message: 'Error 2',
          autoFixable: false,
        },
      ];

      expect(fixer.canAutoFixAll(violations)).toBe(false);
    });
  });

  describe('countAutoFixable', () => {
    it('should return zeros for empty array', () => {
      expect(fixer.countAutoFixable([])).toEqual({ autoFixable: 0, manualFix: 0 });
    });

    it('should count auto-fixable and manual fix violations', () => {
      const violations: RuleViolation[] = [
        {
          ruleId: 'rule1',
          ruleName: 'Rule 1',
          severity: 'error' as Severity,
          filePath: 'test.ts',
          message: 'Error 1',
          autoFixable: true,
        },
        {
          ruleId: 'rule2',
          ruleName: 'Rule 2',
          severity: 'warning' as Severity,
          filePath: 'test.ts',
          message: 'Error 2',
          autoFixable: false,
        },
        {
          ruleId: 'rule3',
          ruleName: 'Rule 3',
          severity: 'info' as Severity,
          filePath: 'test.ts',
          message: 'Error 3',
          autoFixable: true,
        },
      ];

      expect(fixer.countAutoFixable(violations)).toEqual({ autoFixable: 2, manualFix: 1 });
    });

    it('should count all as manual when none are auto-fixable', () => {
      const violations: RuleViolation[] = [
        {
          ruleId: 'rule1',
          ruleName: 'Rule 1',
          severity: 'error' as Severity,
          filePath: 'test.ts',
          message: 'Error 1',
          autoFixable: false,
        },
      ];

      expect(fixer.countAutoFixable(violations)).toEqual({ autoFixable: 0, manualFix: 1 });
    });
  });
});
