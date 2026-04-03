import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BootstrapGenerator } from '../BootstrapGenerator';
import { BootstrapInput, TechStackChoice } from '../types';

describe('BootstrapGenerator', () => {
  let generator: BootstrapGenerator;
  let tempDir: string;

  beforeEach(() => {
    generator = new BootstrapGenerator();
    // Create a unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Six-Layer Structure', () => {
    it('should create six-layer structure', async () => {
      const input: BootstrapInput = {
        projectName: 'test-app',
        description: 'Test application',
        techStack: {
          language: 'typescript',
          frontend: 'nextjs',
          database: 'postgresql'
        },
        targetDir: path.join(tempDir, 'my-project')
      };

      const result = await generator.bootstrap(input);

      expect(result.success).toBe(true);
      expect(result.layers).toHaveLength(6);

      // Verify all layers were created
      const layerNames = result.layers.map(l => l.layer);
      expect(layerNames).toContain('types');
      expect(layerNames).toContain('config');
      expect(layerNames).toContain('repo');
      expect(layerNames).toContain('service');
      expect(layerNames).toContain('runtime');
      expect(layerNames).toContain('ui');

      // Verify all layers were marked as created
      result.layers.forEach(layer => {
        expect(layer.created).toBe(true);
        expect(layer.files.length).toBeGreaterThan(0);
      });
    });

    it('should create layer directories', async () => {
      const input: BootstrapInput = {
        projectName: 'test-app',
        description: 'Test application',
        techStack: {
          language: 'typescript',
          frontend: 'nextjs',
          database: 'postgresql'
        },
        targetDir: path.join(tempDir, 'my-project')
      };

      await generator.bootstrap(input);

      // Verify all layer directories exist
      expect(fs.existsSync(path.join(input.targetDir, 'src/types'))).toBe(true);
      expect(fs.existsSync(path.join(input.targetDir, 'src/config'))).toBe(true);
      expect(fs.existsSync(path.join(input.targetDir, 'src/repo'))).toBe(true);
      expect(fs.existsSync(path.join(input.targetDir, 'src/service'))).toBe(true);
      expect(fs.existsSync(path.join(input.targetDir, 'src/runtime'))).toBe(true);
      expect(fs.existsSync(path.join(input.targetDir, 'src/ui'))).toBe(true);
    });
  });

  describe('Root Config Files', () => {
    it('should create root config files', async () => {
      const input: BootstrapInput = {
        projectName: 'test-app',
        description: 'Test application',
        techStack: {
          language: 'typescript'
        },
        targetDir: path.join(tempDir, 'my-project')
      };

      const result = await generator.bootstrap(input);

      expect(result.success).toBe(true);
      expect(result.filesCreated).toContain('package.json');
      expect(result.filesCreated).toContain('tsconfig.json');
      expect(result.filesCreated).toContain('.gitignore');

      // Verify files exist
      expect(fs.existsSync(path.join(input.targetDir, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(input.targetDir, 'tsconfig.json'))).toBe(true);
      expect(fs.existsSync(path.join(input.targetDir, '.gitignore'))).toBe(true);
    });

    it('should generate valid package.json', async () => {
      const input: BootstrapInput = {
        projectName: 'my-awesome-app',
        description: 'My awesome application',
        techStack: {
          language: 'typescript'
        },
        targetDir: path.join(tempDir, 'my-project')
      };

      await generator.bootstrap(input);

      const packageJsonPath = path.join(input.targetDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.name).toBe('my-awesome-app');
      expect(packageJson.description).toBe('My awesome application');
      expect(packageJson.version).toBe('0.1.0');
      expect(packageJson.private).toBe(true);
    });

    it('should include Next.js deps when frontend is nextjs', async () => {
      const input: BootstrapInput = {
        projectName: 'test-app',
        description: 'Test application',
        techStack: {
          language: 'typescript',
          frontend: 'nextjs'
        },
        targetDir: path.join(tempDir, 'my-project')
      };

      await generator.bootstrap(input);

      const packageJsonPath = path.join(input.targetDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.dependencies.next).toBeDefined();
      expect(packageJson.dependencies.react).toBeDefined();
      expect(packageJson.dependencies['react-dom']).toBeDefined();
    });

    it('should include Prisma when database is postgresql', async () => {
      const input: BootstrapInput = {
        projectName: 'test-app',
        description: 'Test application',
        techStack: {
          language: 'typescript',
          database: 'postgresql'
        },
        targetDir: path.join(tempDir, 'my-project')
      };

      await generator.bootstrap(input);

      const packageJsonPath = path.join(input.targetDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.dependencies['@prisma/client']).toBeDefined();
      expect(packageJson.devDependencies.prisma).toBeDefined();
    });

    it('should always include Zod', async () => {
      const input: BootstrapInput = {
        projectName: 'test-app',
        description: 'Test application',
        techStack: {
          language: 'typescript'
        },
        targetDir: path.join(tempDir, 'my-project')
      };

      await generator.bootstrap(input);

      const packageJsonPath = path.join(input.targetDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.dependencies.zod).toBeDefined();
    });
  });

  describe('Template Variable Replacement', () => {
    it('should replace {{projectName}} in generated files', async () => {
      const input: BootstrapInput = {
        projectName: 'MyProject',
        description: 'Test application',
        techStack: {
          language: 'typescript'
        },
        targetDir: path.join(tempDir, 'my-project')
      };

      await generator.bootstrap(input);

      // Check types/index.ts contains the project name
      const typesIndexPath = path.join(input.targetDir, 'src/types/index.ts');
      const content = fs.readFileSync(typesIndexPath, 'utf-8');

      expect(content).toContain('MyProject');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid target directory (file instead of directory)', async () => {
      // Create a file with the target name
      const filePath = path.join(tempDir, 'not-a-directory');
      fs.writeFileSync(filePath, 'I am a file', 'utf-8');

      const input: BootstrapInput = {
        projectName: 'test-app',
        description: 'Test application',
        techStack: {
          language: 'typescript'
        },
        targetDir: filePath
      };

      const result = await generator.bootstrap(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a directory');
    });

    it('should handle non-empty target directory', async () => {
      // Create a directory with contents
      const targetDir = path.join(tempDir, 'non-empty-dir');
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, 'existing-file.txt'), 'I exist', 'utf-8');

      const input: BootstrapInput = {
        projectName: 'test-app',
        description: 'Test application',
        techStack: {
          language: 'typescript'
        },
        targetDir
      };

      const result = await generator.bootstrap(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not empty');
    });
  });

  describe('Layer Files Generation', () => {
    it('should generate correct files for types layer', async () => {
      const input: BootstrapInput = {
        projectName: 'test-app',
        description: 'Test application',
        techStack: {
          language: 'typescript'
        },
        targetDir: path.join(tempDir, 'my-project')
      };

      const result = await generator.bootstrap(input);

      const typesLayer = result.layers.find(l => l.layer === 'types');
      expect(typesLayer).toBeDefined();
      expect(typesLayer?.files).toContain('src/types/index.ts');
      expect(typesLayer?.files).toContain('src/types/domain.ts');

      // Verify files exist
      expect(fs.existsSync(path.join(input.targetDir, 'src/types/index.ts'))).toBe(true);
      expect(fs.existsSync(path.join(input.targetDir, 'src/types/domain.ts'))).toBe(true);
    });

    it('should generate correct files for config layer with Zod', async () => {
      const input: BootstrapInput = {
        projectName: 'test-app',
        description: 'Test application',
        techStack: {
          language: 'typescript'
        },
        targetDir: path.join(tempDir, 'my-project')
      };

      const result = await generator.bootstrap(input);

      const configLayer = result.layers.find(l => l.layer === 'config');
      expect(configLayer).toBeDefined();
      expect(configLayer?.files).toContain('src/config/index.ts');

      // Verify file contains Zod import
      const configPath = path.join(input.targetDir, 'src/config/index.ts');
      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain("import { z } from 'zod'");
    });

    it('should generate correct files for repo layer with PostgreSQL', async () => {
      const input: BootstrapInput = {
        projectName: 'test-app',
        description: 'Test application',
        techStack: {
          language: 'typescript',
          database: 'postgresql'
        },
        targetDir: path.join(tempDir, 'my-project')
      };

      const result = await generator.bootstrap(input);

      const repoLayer = result.layers.find(l => l.layer === 'repo');
      expect(repoLayer).toBeDefined();
      expect(repoLayer?.files).toContain('src/repo/index.ts');
      expect(repoLayer?.files).toContain('src/repo/prisma.ts');
      expect(repoLayer?.files).toContain('src/repo/repositories/index.ts');

      // Verify prisma.ts contains PrismaClient import
      const prismaPath = path.join(input.targetDir, 'src/repo/prisma.ts');
      const content = fs.readFileSync(prismaPath, 'utf-8');
      expect(content).toContain("import { PrismaClient } from '@prisma/client'");
    });

    it('should generate correct files for ui layer with Next.js', async () => {
      const input: BootstrapInput = {
        projectName: 'test-app',
        description: 'Test application',
        techStack: {
          language: 'typescript',
          frontend: 'nextjs'
        },
        targetDir: path.join(tempDir, 'my-project')
      };

      const result = await generator.bootstrap(input);

      const uiLayer = result.layers.find(l => l.layer === 'ui');
      expect(uiLayer).toBeDefined();
      expect(uiLayer?.files).toContain('src/ui/index.ts');
      expect(uiLayer?.files).toContain('src/ui/components/index.tsx');

      // Verify component file contains React import
      const componentPath = path.join(input.targetDir, 'src/ui/components/index.tsx');
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain("import React from 'react'");
    });
  });

  describe('Bootstrap Result', () => {
    it('should return correct project path in result', async () => {
      const input: BootstrapInput = {
        projectName: 'test-app',
        description: 'Test application',
        techStack: {
          language: 'typescript'
        },
        targetDir: path.join(tempDir, 'my-project')
      };

      const result = await generator.bootstrap(input);

      expect(result.success).toBe(true);
      expect(result.projectPath).toBe(path.resolve(input.targetDir));
    });

    it('should track all created files', async () => {
      const input: BootstrapInput = {
        projectName: 'test-app',
        description: 'Test application',
        techStack: {
          language: 'typescript',
          frontend: 'nextjs',
          database: 'postgresql'
        },
        targetDir: path.join(tempDir, 'my-project')
      };

      const result = await generator.bootstrap(input);

      expect(result.success).toBe(true);
      // Should have: 3 root config files + layer files
      expect(result.filesCreated.length).toBeGreaterThan(3);

      // Verify all files actually exist
      result.filesCreated.forEach(file => {
        expect(fs.existsSync(path.join(input.targetDir, file))).toBe(true);
      });
    });
  });
});
