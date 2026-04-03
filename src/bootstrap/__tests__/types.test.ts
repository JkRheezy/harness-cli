import { BootstrapInput, TechStackChoice, LayerName } from '../types';

describe('Bootstrap Types', () => {
  it('should create valid BootstrapInput', () => {
    const input: BootstrapInput = {
      projectName: 'my-app',
      description: 'Test application',
      techStack: {
        language: 'typescript',
        frontend: 'nextjs',
        backend: 'nextjs-api',
        database: 'postgresql'
      },
      patterns: [{ name: 'multi-agent' }],
      targetDir: './my-app'
    };

    expect(input.projectName).toBe('my-app');
    expect(input.techStack.language).toBe('typescript');
  });

  it('should validate all LayerName union type values', () => {
    const validLayers: LayerName[] = ['types', 'config', 'repo', 'service', 'runtime', 'ui'];
    
    // Verify all six layer names are valid
    expect(validLayers).toHaveLength(6);
    expect(validLayers).toContain('types');
    expect(validLayers).toContain('config');
    expect(validLayers).toContain('repo');
    expect(validLayers).toContain('service');
    expect(validLayers).toContain('runtime');
    expect(validLayers).toContain('ui');
  });
});
