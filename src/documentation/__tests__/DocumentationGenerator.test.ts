import { DocumentationGenerator } from '../DocumentationGenerator';
import { DocumentationInput } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

describe('DocumentationGenerator', () => {
  let generator: DocumentationGenerator;
  let testDir: string;

  beforeEach(async () => {
    generator = new DocumentationGenerator();
    testDir = path.join(tmpdir(), `doc-gen-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try { await fs.rm(testDir, { recursive: true, force: true }); } catch {}
  });

  it('should generate complete documentation', async () => {
    const input: DocumentationInput = {
      projectName: 'TestProject',
      description: 'A test project',
      techStack: {
        language: 'typescript',
        frontend: 'nextjs',
        additional: []
      },
      architecture: {
        pattern: 'six-layer',
        layers: ['types', 'config', 'repo', 'service', 'runtime', 'ui'],
        keyDecisions: []
      },
      targetDir: testDir
    };

    const result = await generator.generate(input);

    expect(result.success).toBe(true);
    expect(result.filesCreated).toContain('AGENTS.md');
    expect(result.filesCreated).toContain('docs/ARCHITECTURE.md');

    // Verify files exist
    const agentsMd = await fs.readFile(path.join(testDir, 'AGENTS.md'), 'utf-8');
    expect(agentsMd).toContain('TestProject');

    const archMd = await fs.readFile(path.join(testDir, 'docs', 'ARCHITECTURE.md'), 'utf-8');
    expect(archMd).toContain('TestProject');
  });

  it('should create docs directory structure', async () => {
    const input: DocumentationInput = {
      projectName: 'MyProject',
      description: 'My project',
      techStack: { language: 'typescript', additional: [] },
      architecture: { pattern: 'six-layer', layers: [], keyDecisions: [] },
      targetDir: testDir
    };

    await generator.generate(input);

    // Check directories exist
    const dirs = [
      'docs/design-docs',
      'docs/exec-plans/active',
      'docs/exec-plans/completed',
      'docs/product-specs',
      'docs/references'
    ];

    for (const dir of dirs) {
      const stat = await fs.stat(path.join(testDir, dir));
      expect(stat.isDirectory()).toBe(true);
    }

    // Check placeholder files
    const designIndex = await fs.readFile(path.join(testDir, 'docs', 'design-docs', 'index.md'), 'utf-8');
    expect(designIndex).toContain('设计文档');
  });
});
