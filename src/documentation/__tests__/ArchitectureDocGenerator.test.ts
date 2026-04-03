import { ArchitectureDocGenerator } from '../ArchitectureDocGenerator';
import { DocumentationInput } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

describe('ArchitectureDocGenerator', () => {
  let generator: ArchitectureDocGenerator;
  let testDir: string;

  beforeEach(async () => {
    generator = new ArchitectureDocGenerator();
    testDir = path.join(tmpdir(), `arch-doc-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try { await fs.rm(testDir, { recursive: true, force: true }); } catch {}
  });

  it('should generate ARCHITECTURE.md', async () => {
    const input: DocumentationInput = {
      projectName: 'TestApp',
      description: 'Test app',
      techStack: { language: 'typescript', additional: [] },
      architecture: {
        pattern: 'six-layer',
        layers: ['types', 'config', 'repo', 'service', 'runtime', 'ui'],
        keyDecisions: []
      },
      targetDir: testDir
    };

    const result = await generator.generate(input);

    expect(result.success).toBe(true);
    expect(result.filesCreated).toContain('docs/ARCHITECTURE.md');

    const content = await fs.readFile(path.join(testDir, 'docs', 'ARCHITECTURE.md'), 'utf-8');
    expect(content).toContain('# TestApp 架构设计');
    expect(content).toContain('六层架构总览与质量评分');
    expect(content).toContain('总体评分: 0/100');
  });

  it('should include all 6 layers', async () => {
    const input: DocumentationInput = {
      projectName: 'MyApp', description: 'My app',
      techStack: { language: 'typescript', additional: [] },
      architecture: {
        pattern: 'six-layer',
        layers: ['types', 'config', 'repo', 'service', 'runtime', 'ui'],
        keyDecisions: []
      },
      targetDir: testDir
    };

    await generator.generate(input);

    const content = await fs.readFile(path.join(testDir, 'docs', 'ARCHITECTURE.md'), 'utf-8');
    expect(content).toContain('types 层');
    expect(content).toContain('config 层');
    expect(content).toContain('repo 层');
    expect(content).toContain('service 层');
    expect(content).toContain('runtime 层');
    expect(content).toContain('ui 层');
  });
});
