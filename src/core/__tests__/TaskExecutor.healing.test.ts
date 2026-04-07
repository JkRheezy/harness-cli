import { TaskExecutor } from '../TaskExecutor';
import { Logger } from '../../utils/Logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('TaskExecutor Healing Integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'executor-healing-'));
    
    // Create a minimal project
    await fs.promises.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        scripts: { 
          lint: 'eslint src/',
          test: 'jest'
        },
        devDependencies: {
          eslint: '^8.0.0'
        }
      }, null, 2)
    );
    
    await fs.promises.mkdir(path.join(tempDir, 'src'), { recursive: true });
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it('should detect missing ESLint config', async () => {
    const executor = new TaskExecutor(
      {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        maxTokens: 1000,
        temperature: 0.2,
        timeout: 5000
      },
      tempDir
    );

    // Check that ESLint config doesn't exist
    const configPath = path.join(tempDir, '.eslintrc.json');
    expect(fs.existsSync(configPath)).toBe(false);

    // Run validation
    const result = await (executor as any).validateResults(
      { title: 'Test task' },
      [],
      false
    );

    // Should return validation result
    expect(result).toBeDefined();
    expect(result.hasChanges).toBe(false); // No changes made in test
  });

  it('should parse lint output with violations', async () => {
    const executor = new TaskExecutor(
      {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        maxTokens: 1000,
        temperature: 0.2,
        timeout: 5000
      },
      tempDir
    );

    // Create a file with code issues
    await fs.promises.writeFile(
      path.join(tempDir, 'src', 'test.js'),
      'var x = 1;\n'
    );

    // Test parseLintOutput with mock ESLint JSON
    const mockLintOutput = JSON.stringify([
      {
        filePath: 'src/test.js',
        messages: [
          {
            ruleId: 'prefer-const',
            severity: 2,
            message: 'Use const instead of var',
            line: 1,
            column: 1,
            fix: {
              text: 'const x = 1'
            }
          }
        ]
      }
    ]);

    const violations = (executor as any).parseLintOutput(mockLintOutput);
    
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('prefer-const');
    expect(violations[0].autoFixable).toBe(true);
    expect(violations[0].fix?.replacement).toBe('const x = 1');
  });

  it('should handle empty lint output', async () => {
    const executor = new TaskExecutor(
      {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        maxTokens: 1000,
        temperature: 0.2,
        timeout: 5000
      },
      tempDir
    );

    const violations = (executor as any).parseLintOutput('');
    expect(violations).toHaveLength(0);

    const violations2 = (executor as any).parseLintOutput('not json');
    expect(violations2).toHaveLength(0);
  });
});
