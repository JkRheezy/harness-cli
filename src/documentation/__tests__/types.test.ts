import { DocumentationInput, AgentsMdContent, ArchitectureDocContent } from '../types';

describe('Documentation Types', () => {
  it('should create valid DocumentationInput', () => {
    const input: DocumentationInput = {
      projectName: 'my-app',
      description: 'Test app',
      techStack: {
        language: 'typescript',
        additional: ['Next.js', 'Prisma']
      },
      architecture: {
        pattern: 'six-layer',
        layers: ['types', 'config', 'repo', 'service', 'runtime', 'ui'],
        keyDecisions: []
      },
      targetDir: './my-app'
    };

    expect(input.projectName).toBe('my-app');
    expect(input.architecture.layers).toHaveLength(6);
  });

  it('should create valid AgentsMdContent', () => {
    const content: AgentsMdContent = {
      projectName: 'My App',
      description: 'A test application',
      techStack: 'Next.js + TypeScript + PostgreSQL',
      quickStart: {
        setupCommands: ['npm install'],
        startCommand: 'npm run dev'
      },
      documentMap: [
        { document: 'Architecture', path: 'docs/ARCHITECTURE.md', readingTime: '5 min', description: 'Overview' }
      ],
      commonTasks: [],
      constraints: []
    };

    expect(content.documentMap).toHaveLength(1);
  });
});
