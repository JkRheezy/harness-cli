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

  it('should validate layer dependencies order', () => {
    const layerOrder: LayerName[] = ['types', 'config', 'repo', 'service', 'runtime', 'ui'];
    
    expect(layerOrder[0]).toBe('types');
    expect(layerOrder[5]).toBe('ui');
  });
});
