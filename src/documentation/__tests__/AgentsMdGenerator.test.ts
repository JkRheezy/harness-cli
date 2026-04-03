import { AgentsMdGenerator } from '../AgentsMdGenerator';
import { DocumentationInput } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

describe('AgentsMdGenerator', () => {
  let generator: AgentsMdGenerator;
  let testDir: string;

  beforeEach(async () => {
    generator = new AgentsMdGenerator();
    testDir = path.join(tmpdir(), `agents-md-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try { await fs.rm(testDir, { recursive: true, force: true }); } catch {}
  });

  it('should generate AGENTS.md', async () => {
    const input: DocumentationInput = {
      projectName: 'TestApp',
      description: 'A test application',
      techStack: { language: 'typescript', frontend: 'nextjs', backend: 'nextjs-api', database: 'postgresql', additional: [] },
      architecture: { pattern: 'six-layer', layers: ['types', 'config', 'repo', 'service', 'runtime', 'ui'], keyDecisions: [] },
      targetDir: testDir
    };

    const result = await generator.generate(input);

    expect(result.success).toBe(true);
    expect(result.filesCreated).toContain('AGENTS.md');

    const content = await fs.readFile(path.join(testDir, 'AGENTS.md'), 'utf-8');
    expect(content).toContain('# TestApp - Agent 协作指南');
    expect(content).toContain('typescript + nextjs + nextjs-api + postgresql');
    expect(content).toContain('## 1. 快速开始');
    expect(content).toContain('## 3. 关键文档索引');
  });

  it('should include document map', async () => {
    const input: DocumentationInput = {
      projectName: 'MyApp',
      description: 'My app',
      techStack: { language: 'typescript', additional: [] },
      architecture: { pattern: 'six-layer', layers: [], keyDecisions: [] },
      targetDir: testDir
    };

    await generator.generate(input);

    const content = await fs.readFile(path.join(testDir, 'AGENTS.md'), 'utf-8');
    expect(content).toContain('架构总览');
    expect(content).toContain('docs/ARCHITECTURE.md');
  });
});
