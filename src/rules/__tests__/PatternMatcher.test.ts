import {
  extractPatternFromContent,
  matchPattern,
  shouldApplyRule,
  PatternDefinition,
} from '../PatternMatcher';
import { Rule, RuleContext, Severity } from '../types';

describe('PatternMatcher', () => {
  describe('extractPatternFromContent', () => {
    it('should extract pattern with complete YAML', () => {
      const content = `
# Some Rule

This is a rule description.

\`\`\`yaml
pattern: console\\.log
message: Use logger instead
fix:
  instruction: Replace with logger
  replacement: logger.info()
  example_before: console.log("debug")
  example_after: logger.info("debug")
\`\`\`
      `;

      const result = extractPatternFromContent(content);

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe('console\\.log');
      expect(result?.message).toBe('Use logger instead');
      expect(result?.fix).toEqual({
        instruction: 'Replace with logger',
        replacement: 'logger.info()',
        example_before: 'console.log("debug")',
        example_after: 'logger.info("debug")',
      });
    });

    it('should extract pattern without fix block', () => {
      const content = `
# Simple Rule

\`\`\`yaml
pattern: todo
message: Fix this TODO
\`\`\`
      `;

      const result = extractPatternFromContent(content);

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe('todo');
      expect(result?.message).toBe('Fix this TODO');
      expect(result?.fix).toBeUndefined();
    });

    it('should return null when no YAML block exists', () => {
      const content = `
# Some Rule

This is just plain text without any YAML block.
      `;

      const result = extractPatternFromContent(content);

      expect(result).toBeNull();
    });

    it('should return null when pattern is missing', () => {
      const content = `
\`\`\`yaml
message: Missing pattern
\`\`\`
      `;

      const result = extractPatternFromContent(content);

      expect(result).toBeNull();
    });

    it('should return null when message is missing', () => {
      const content = `
\`\`\`yaml
pattern: some-pattern
\`\`\`
      `;

      const result = extractPatternFromContent(content);

      expect(result).toBeNull();
    });

    it('should work with ".yml" code block tag', () => {
      const content = `
\`\`\`yml
pattern: test-pattern
message: Test message
\`\`\`
      `;

      const result = extractPatternFromContent(content);

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe('test-pattern');
      expect(result?.message).toBe('Test message');
    });

    it('should extract partial fix fields', () => {
      const content = `
\`\`\`yaml
pattern: var\\s+
message: Use const or let
fix:
  instruction: Replace var with const
  replacement: const 
\`\`\`
      `;

      const result = extractPatternFromContent(content);

      expect(result).not.toBeNull();
      expect(result?.fix).toEqual({
        instruction: 'Replace var with const',
        replacement: 'const',
      });
    });
  });

  describe('matchPattern', () => {
    const createMockRule = (overrides: Partial<Rule> = {}): Rule => ({
      id: 'test-rule',
      name: 'Test Rule',
      description: 'A test rule',
      severity: 'error' as Severity,
      content: '',
      autoFixable: false,
      disabled: false,
      version: '1.0.0',
      tags: ['test'],
      ...overrides,
    });

    const createMockContext = (overrides: Partial<RuleContext> = {}): RuleContext => ({
      projectRoot: '/project',
      filePath: '/project/src/test.ts',
      fileContent: '',
      ...overrides,
    });

    it('should match simple pattern', () => {
      const rule = createMockRule({
        content: `
\`\`\`yaml
pattern: console\\.log
message: Use logger instead
\`\`\`
        `,
      });
      const context = createMockContext({
        fileContent: 'console.log("hello");\nconst x = 1;',
      });

      const violations = matchPattern(rule, context);

      expect(violations).toHaveLength(1);
      expect(violations[0].ruleId).toBe('test-rule');
      expect(violations[0].ruleName).toBe('Test Rule');
      expect(violations[0].line).toBe(1);
      expect(violations[0].column).toBe(1);
      expect(violations[0].message).toBe('Use logger instead');
      expect(violations[0].codeSnippet).toBe('console.log("hello");');
    });

    it('should find multiple matches', () => {
      const rule = createMockRule({
        content: `
\`\`\`yaml
pattern: TODO
message: Fix this TODO
\`\`\`
        `,
      });
      const context = createMockContext({
        fileContent: '// TODO: first\n// TODO: second\n// FIXME: not matched',
      });

      const violations = matchPattern(rule, context);

      expect(violations).toHaveLength(2);
      expect(violations[0].line).toBe(1);
      expect(violations[1].line).toBe(2);
    });

    it('should match pattern with capture groups', () => {
      const rule = createMockRule({
        content: `
\`\`\`yaml
pattern: require\\("([^"]+)"\\)
message: Use import instead
fix:
  replacement: import $1 from "$1"
\`\`\`
        `,
        autoFixable: true,
      });
      const context = createMockContext({
        fileContent: 'const foo = require("bar");',
      });

      const violations = matchPattern(rule, context);

      expect(violations).toHaveLength(1);
      expect(violations[0].match).toBeDefined();
      expect(violations[0].match?.[0]).toBe('require("bar")');
      expect(violations[0].match?.[1]).toBe('bar');
      expect(violations[0].autoFixable).toBe(true);
      expect(violations[0].fix?.replacement).toBe('import $1 from "$1"');
    });

    it('should use rule.fix when pattern has no fix', () => {
      const rule = createMockRule({
        content: `
\`\`\`yaml
pattern: deprecated
message: This is deprecated
\`\`\`
        `,
        autoFixable: true,
        fix: {
          instruction: 'Use new method',
          replacement: 'newMethod()',
        },
      });
      const context = createMockContext({
        fileContent: 'deprecated();',
      });

      const violations = matchPattern(rule, context);

      expect(violations).toHaveLength(1);
      expect(violations[0].fix?.instruction).toBe('Use new method');
      expect(violations[0].fix?.replacement).toBe('newMethod()');
      expect(violations[0].autoFixable).toBe(true);
    });

    it('should return empty array when pattern does not match', () => {
      const rule = createMockRule({
        content: `
\`\`\`yaml
pattern: xyz123
message: Not found
\`\`\`
        `,
      });
      const context = createMockContext({
        fileContent: 'console.log("hello");',
      });

      const violations = matchPattern(rule, context);

      expect(violations).toHaveLength(0);
    });

    it('should return empty array when no YAML block in content', () => {
      const rule = createMockRule({
        content: 'Just plain text',
      });
      const context = createMockContext({
        fileContent: 'console.log("hello");',
      });

      const violations = matchPattern(rule, context);

      expect(violations).toHaveLength(0);
    });

    it('should truncate long code snippets', () => {
      const rule = createMockRule({
        content: `
\`\`\`yaml
pattern: test
message: Test
\`\`\`
        `,
      });
      // Include 'test' in the long line so it matches
      const longLine = 'test' + 'a'.repeat(200);
      const context = createMockContext({
        fileContent: longLine,
      });

      const violations = matchPattern(rule, context);

      expect(violations).toHaveLength(1);
      expect(violations[0].codeSnippet?.length).toBeLessThanOrEqual(103); // 100 + '...'
      expect(violations[0].codeSnippet?.endsWith('...')).toBe(true);
    });

    it('should not be autoFixable when rule.autoFixable is false', () => {
      const rule = createMockRule({
        content: `
\`\`\`yaml
pattern: bad
message: Bad code
fix:
  replacement: good
\`\`\`
        `,
        autoFixable: false,
      });
      const context = createMockContext({
        fileContent: 'bad code',
      });

      const violations = matchPattern(rule, context);

      expect(violations[0].autoFixable).toBe(false);
    });
  });

  describe('shouldApplyRule', () => {
    const createMockRule = (paths?: string[]): Rule => ({
      id: 'test-rule',
      name: 'Test Rule',
      description: 'A test rule',
      severity: 'error' as Severity,
      content: '',
      autoFixable: false,
      disabled: false,
      version: '1.0.0',
      tags: ['test'],
      paths,
    });

    it('should return true when paths is empty', () => {
      const rule = createMockRule([]);
      expect(shouldApplyRule(rule, '/project/src/file.ts', '/project')).toBe(true);
    });

    it('should return true when paths is undefined', () => {
      const rule = createMockRule(undefined);
      expect(shouldApplyRule(rule, '/project/src/file.ts', '/project')).toBe(true);
    });

    it('should match exact path', () => {
      const rule = createMockRule(['src/file.ts']);
      expect(shouldApplyRule(rule, '/project/src/file.ts', '/project')).toBe(true);
    });

    it('should not match different path', () => {
      const rule = createMockRule(['src/other.ts']);
      expect(shouldApplyRule(rule, '/project/src/file.ts', '/project')).toBe(false);
    });

    it('should match globstar pattern', () => {
      const rule = createMockRule(['**/*.ts']);
      expect(shouldApplyRule(rule, '/project/src/file.ts', '/project')).toBe(true);
      expect(shouldApplyRule(rule, '/project/src/deep/nested/file.ts', '/project')).toBe(true);
    });

    it('should match single star pattern', () => {
      const rule = createMockRule(['src/*.ts']);
      expect(shouldApplyRule(rule, '/project/src/file.ts', '/project')).toBe(true);
      expect(shouldApplyRule(rule, '/project/src/deep/file.ts', '/project')).toBe(false);
    });

    it('should match multiple patterns', () => {
      const rule = createMockRule(['*.js', '*.ts']);
      expect(shouldApplyRule(rule, '/project/file.ts', '/project')).toBe(true);
      expect(shouldApplyRule(rule, '/project/file.js', '/project')).toBe(true);
      expect(shouldApplyRule(rule, '/project/file.py', '/project')).toBe(false);
    });

    it('should handle Windows-style paths', () => {
      const rule = createMockRule(['src/**/*.ts']);
      // Test with normalized Windows-style paths (forward slashes after normalization)
      expect(shouldApplyRule(rule, 'C:/project/src/file.ts', 'C:/project')).toBe(true);
      // Also test with actual backslash paths that get normalized
      expect(shouldApplyRule(rule, 'C:\\project\\src\\file.ts', 'C:\\project')).toBe(true);
    });

    it('should escape dots in patterns', () => {
      const rule = createMockRule(['*.ts']);
      expect(shouldApplyRule(rule, '/project/file.ts', '/project')).toBe(true);
      expect(shouldApplyRule(rule, '/project/file-tasks', '/project')).toBe(false);
    });
  });
});
