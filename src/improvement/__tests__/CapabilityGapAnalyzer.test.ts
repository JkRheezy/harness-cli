import { CapabilityGapAnalyzer } from '../CapabilityGapAnalyzer';
import { ExecutionFailure } from '../types';

describe('CapabilityGapAnalyzer', () => {
  let analyzer: CapabilityGapAnalyzer;

  beforeEach(() => {
    analyzer = new CapabilityGapAnalyzer();
  });

  describe('analyzeFailure', () => {
    it('should identify missing template gap', () => {
      const failure: ExecutionFailure = {
        taskId: '1',
        taskName: 'Generate types layer',
        error: 'No template found for layer: types',
        context: 'bootstrap layer generation',
        timestamp: new Date()
      };

      const gap = analyzer.analyzeFailure(failure);

      expect(gap).not.toBeNull();
      expect(gap?.category).toBe('bootstrap');
      expect(gap?.severity).toBe('high');
      expect(gap?.description).toContain('Missing template');
    });

    it('should identify pattern application failure', () => {
      const failure: ExecutionFailure = {
        taskId: '2',
        taskName: 'Apply multi-agent pattern',
        error: 'Pattern apply failed: missing orchestrator',
        context: 'pattern application',
        timestamp: new Date()
      };

      const gap = analyzer.analyzeFailure(failure);

      expect(gap).not.toBeNull();
      expect(gap?.category).toBe('pattern');
      expect(gap?.severity).toBe('high');
    });

    it('should identify documentation generation failure', () => {
      const failure: ExecutionFailure = {
        taskId: '3',
        taskName: 'Generate AGENTS.md',
        error: 'Template not found',
        context: 'documentation generation',
        timestamp: new Date()
      };

      const gap = analyzer.analyzeFailure(failure);

      expect(gap).not.toBeNull();
      expect(gap?.category).toBe('documentation');
      expect(gap?.severity).toBe('medium');
    });

    it('should identify AGENTS.md parsing failure as critical', () => {
      const failure: ExecutionFailure = {
        taskId: '4',
        taskName: 'Parse AGENTS.md',
        error: 'Failed to parse AGENTS.md: unexpected format',
        context: 'loop execution',
        timestamp: new Date()
      };

      const gap = analyzer.analyzeFailure(failure);

      expect(gap).not.toBeNull();
      expect(gap?.category).toBe('loop');
      expect(gap?.severity).toBe('critical');
    });

    it('should identify constraint validation failure', () => {
      const failure: ExecutionFailure = {
        taskId: '5',
        taskName: 'Validate constraints',
        error: 'Constraint validation failed: invalid format',
        context: 'constraint checking',
        timestamp: new Date()
      };

      const gap = analyzer.analyzeFailure(failure);

      expect(gap).not.toBeNull();
      expect(gap?.category).toBe('loop');
      expect(gap?.severity).toBe('high');
    });

    it('should return null for unknown failures', () => {
      const failure: ExecutionFailure = {
        taskId: '6',
        taskName: 'User task',
        error: 'User code compilation failed',
        context: 'product compilation',
        timestamp: new Date()
      };

      const gap = analyzer.analyzeFailure(failure);

      expect(gap).toBeNull();
    });
  });

  describe('analyzeFailures', () => {
    it('should analyze multiple failures and deduplicate gaps', () => {
      const failures: ExecutionFailure[] = [
        {
          taskId: '1',
          taskName: 'Generate types layer',
          error: 'No template found for layer: types',
          context: 'bootstrap layer generation',
          timestamp: new Date()
        },
        {
          taskId: '2',
          taskName: 'Generate config layer',
          error: 'No template found for layer: config',
          context: 'bootstrap layer generation',
          timestamp: new Date()
        }
      ];

      const result = analyzer.analyzeFailures(failures);

      expect(result.gaps.length).toBe(1); // Should deduplicate same pattern
      expect(result.criticalCount).toBe(0);
      expect(result.highCount).toBe(1);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should count severities correctly', () => {
      const failures: ExecutionFailure[] = [
        {
          taskId: '1',
          taskName: 'Parse AGENTS.md',
          error: 'Failed to parse AGENTS.md',
          context: 'loop execution',
          timestamp: new Date()
        },
        {
          taskId: '2',
          taskName: 'Generate docs',
          error: 'Template not found',
          context: 'documentation generation',
          timestamp: new Date()
        }
      ];

      const result = analyzer.analyzeFailures(failures);

      expect(result.criticalCount).toBe(1);
      expect(result.mediumCount).toBe(1);
    });

    it('should generate category-specific recommendations', () => {
      const failures: ExecutionFailure[] = [
        {
          taskId: '1',
          taskName: 'Parse AGENTS.md',
          error: 'Failed to parse AGENTS.md',
          context: 'loop execution',
          timestamp: new Date()
        }
      ];

      const result = analyzer.analyzeFailures(failures);

      expect(result.recommendations).toContain('Enhance AgentsMdParser to handle more document formats');
      expect(result.recommendations).toContain('Prioritize critical gaps before continuing product development');
    });
  });
});
