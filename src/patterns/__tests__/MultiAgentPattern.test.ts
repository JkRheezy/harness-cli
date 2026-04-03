/**
 * MultiAgentPattern Tests
 * 
 * Tests for the multi-agent pattern implementation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { MultiAgentPattern } from '../MultiAgentPattern';
import { PatternApplication } from '../types';
import { BootstrapInput } from '../../bootstrap/types';

describe('MultiAgentPattern', () => {
  let pattern: MultiAgentPattern;
  let tempDir: string;

  beforeEach(async () => {
    pattern = new MultiAgentPattern();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'multi-agent-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('pattern metadata', () => {
    it('should have correct pattern name', () => {
      expect(pattern.pattern.name).toBe('multi-agent');
    });

    it('should have version', () => {
      expect(pattern.pattern.version).toBe('1.0.0');
    });

    it('should have description', () => {
      expect(pattern.pattern.description).toContain('multi-agent');
      expect(pattern.pattern.description.length).toBeGreaterThan(0);
    });

    it('should apply to service and runtime layers', () => {
      expect(pattern.pattern.appliesTo).toContain('service');
      expect(pattern.pattern.appliesTo).toContain('runtime');
    });
  });

  describe('canApply', () => {
    it('should return true when patterns include multi-agent', () => {
      const input = {
        projectName: 'test',
        patterns: ['multi-agent' as const]
      };
      expect(pattern.canApply(input)).toBe(true);
    });

    it('should return false when patterns do not include multi-agent', () => {
      const input = {
        projectName: 'test',
        patterns: ['other-pattern' as const]
      };
      expect(pattern.canApply(input)).toBe(false);
    });

    it('should return false when patterns is undefined', () => {
      const input: { patterns?: string[] } = {};
      expect(pattern.canApply(input)).toBe(false);
    });

    it('should return false when patterns is empty', () => {
      const input = {
        projectName: 'test',
        patterns: [] as string[]
      };
      expect(pattern.canApply(input)).toBe(false);
    });

    it('should return true when multi-agent is among multiple patterns', () => {
      const input = {
        projectName: 'test',
        patterns: ['api', 'multi-agent', 'database']
      };
      expect(pattern.canApply(input)).toBe(true);
    });
  });

  describe('apply - creates agent types', () => {
    it('should create agent types file', async () => {
      const application: PatternApplication = {
        pattern: pattern.pattern,
        targetDir: tempDir,
        projectName: 'test-project'
      };

      const result = await pattern.apply(application);

      expect(result.success).toBe(true);
      const typesPath = path.join(tempDir, 'src', 'agents', 'types.ts');
      expect(result.filesCreated).toContain(typesPath);

      const content = await fs.readFile(typesPath, 'utf-8');
      expect(content).toContain('AgentMessage');
      expect(content).toContain('AgentContext');
      expect(content).toContain('Task');
      expect(content).toContain('TaskResult');
    });

    it('should track type definitions in modifications', async () => {
      const application: PatternApplication = {
        pattern: pattern.pattern,
        targetDir: tempDir,
        projectName: 'test-project'
      };

      const result = await pattern.apply(application);

      const typesMod = result.modifications.find(m => 
        m.path.includes('types.ts')
      );
      expect(typesMod).toBeDefined();
      expect(typesMod?.type).toBe('create');
      expect(typesMod?.description).toContain('Agent type');
    });
  });

  describe('apply - creates BaseAgent', () => {
    it('should create BaseAgent abstract class', async () => {
      const application: PatternApplication = {
        pattern: pattern.pattern,
        targetDir: tempDir,
        projectName: 'test-project'
      };

      const result = await pattern.apply(application);

      expect(result.success).toBe(true);
      const baseAgentPath = path.join(tempDir, 'src', 'agents', 'BaseAgent.ts');
      expect(result.filesCreated).toContain(baseAgentPath);

      const content = await fs.readFile(baseAgentPath, 'utf-8');
      expect(content).toContain('export abstract class BaseAgent');
      expect(content).toContain('initialize(): Promise<void>');
      expect(content).toContain('shutdown(): Promise<void>');
      expect(content).toContain('executeTask(task: Task)');
    });

    it('should include abstract methods in BaseAgent', async () => {
      const application: PatternApplication = {
        pattern: pattern.pattern,
        targetDir: tempDir,
        projectName: 'test-project'
      };

      await pattern.apply(application);

      const baseAgentPath = path.join(tempDir, 'src', 'agents', 'BaseAgent.ts');
      const content = await fs.readFile(baseAgentPath, 'utf-8');
      expect(content).toContain('abstract onMessage');
      expect(content).toContain('abstract executeTask');
      expect(content).toContain('abstract sendMessage');
    });
  });

  describe('apply - creates orchestrator', () => {
    it('should create AgentOrchestrator', async () => {
      const application: PatternApplication = {
        pattern: pattern.pattern,
        targetDir: tempDir,
        projectName: 'test-project'
      };

      const result = await pattern.apply(application);

      expect(result.success).toBe(true);
      const orchestratorPath = path.join(tempDir, 'src', 'agents', 'Orchestrator.ts');
      expect(result.filesCreated).toContain(orchestratorPath);

      const content = await fs.readFile(orchestratorPath, 'utf-8');
      expect(content).toContain('export class AgentOrchestrator');
      expect(content).toContain('registerAgent');
      expect(content).toContain('distributeTask');
    });

    it('should include orchestrator configuration', async () => {
      const application: PatternApplication = {
        pattern: pattern.pattern,
        targetDir: tempDir,
        projectName: 'test-project'
      };

      await pattern.apply(application);

      const orchestratorPath = path.join(tempDir, 'src', 'agents', 'Orchestrator.ts');
      const content = await fs.readFile(orchestratorPath, 'utf-8');
      expect(content).toContain('OrchestratorConfig');
      expect(content).toContain('maxRetries');
      expect(content).toContain('loadBalancing');
    });
  });

  describe('apply - creates message bus', () => {
    it('should create MessageBus', async () => {
      const application: PatternApplication = {
        pattern: pattern.pattern,
        targetDir: tempDir,
        projectName: 'test-project'
      };

      const result = await pattern.apply(application);

      expect(result.success).toBe(true);
      const messageBusPath = path.join(tempDir, 'src', 'agents', 'MessageBus.ts');
      expect(result.filesCreated).toContain(messageBusPath);

      const content = await fs.readFile(messageBusPath, 'utf-8');
      expect(content).toContain('export class MessageBus');
      expect(content).toContain('subscribe');
      expect(content).toContain('publish');
    });
  });

  describe('apply - creates agent implementations', () => {
    it('should create default agent implementations', async () => {
      const application: PatternApplication = {
        pattern: pattern.pattern,
        targetDir: tempDir,
        projectName: 'test-project'
      };

      const result = await pattern.apply(application);

      expect(result.success).toBe(true);
      
      // Check for CoordinatorAgent
      const coordinatorPath = path.join(tempDir, 'src', 'agents', 'CoordinatorAgent.ts');
      expect(result.filesCreated).toContain(coordinatorPath);

      // Check for WorkerAgent
      const workerPath = path.join(tempDir, 'src', 'agents', 'WorkerAgent.ts');
      expect(result.filesCreated).toContain(workerPath);
    });

    it('should create agents module index', async () => {
      const application: PatternApplication = {
        pattern: pattern.pattern,
        targetDir: tempDir,
        projectName: 'test-project'
      };

      const result = await pattern.apply(application);

      const indexPath = path.join(tempDir, 'src', 'agents', 'index.ts');
      expect(result.filesCreated).toContain(indexPath);

      const content = await fs.readFile(indexPath, 'utf-8');
      expect(content).toContain('export { BaseAgent }');
      expect(content).toContain('export { AgentOrchestrator }');
      expect(content).toContain('export { MessageBus }');
    });

    it('should extend BaseAgent in agent implementations', async () => {
      const application: PatternApplication = {
        pattern: pattern.pattern,
        targetDir: tempDir,
        projectName: 'test-project'
      };

      await pattern.apply(application);

      const coordinatorPath = path.join(tempDir, 'src', 'agents', 'CoordinatorAgent.ts');
      const content = await fs.readFile(coordinatorPath, 'utf-8');
      expect(content).toContain('extends BaseAgent');
      expect(content).toContain('initialize()');
      expect(content).toContain('shutdown()');
      expect(content).toContain('executeTask');
    });
  });

  describe('apply - with custom config', () => {
    it('should use custom agents from config', async () => {
      const customConfig = {
        agents: [
          {
            name: 'CustomAgent',
            role: 'custom',
            responsibilities: ['custom-task'],
            layer: 'service' as const
          }
        ],
        orchestratorType: 'hierarchical' as const,
        communicationProtocol: 'event-driven' as const
      };

      const application: PatternApplication = {
        pattern: pattern.pattern,
        targetDir: tempDir,
        projectName: 'test-project',
        config: customConfig
      };

      const result = await pattern.apply(application);

      expect(result.success).toBe(true);
      
      // Should create custom agent
      const customAgentPath = path.join(tempDir, 'src', 'agents', 'CustomAgent.ts');
      expect(result.filesCreated).toContain(customAgentPath);

      // Should NOT create default agents
      const coordinatorPath = path.join(tempDir, 'src', 'agents', 'CoordinatorAgent.ts');
      expect(result.filesCreated).not.toContain(coordinatorPath);
    });

    it('should document orchestrator type in generated code', async () => {
      const application: PatternApplication = {
        pattern: pattern.pattern,
        targetDir: tempDir,
        projectName: 'test-project',
        config: { orchestratorType: 'decentralized' }
      };

      await pattern.apply(application);

      const orchestratorPath = path.join(tempDir, 'src', 'agents', 'Orchestrator.ts');
      const content = await fs.readFile(orchestratorPath, 'utf-8');
      expect(content).toContain('decentralized');
    });
  });

  describe('apply - error handling', () => {
    it('should return error result on failure', async () => {
      // Create a file where directory should be to cause an error
      const srcPath = path.join(tempDir, 'src');
      await fs.writeFile(srcPath, 'not-a-directory');

      const application: PatternApplication = {
        pattern: pattern.pattern,
        targetDir: tempDir,
        projectName: 'test-project'
      };

      const result = await pattern.apply(application);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('result tracking', () => {
    it('should track all created files in result', async () => {
      const application: PatternApplication = {
        pattern: pattern.pattern,
        targetDir: tempDir,
        projectName: 'test-project'
      };

      const result = await pattern.apply(application);

      expect(result.pattern).toBe('multi-agent');
      expect(result.filesCreated.length).toBeGreaterThanOrEqual(6); // types, BaseAgent, Orchestrator, MessageBus, 2 agents, index
      expect(result.modifications.length).toBe(result.filesCreated.length);
    });

    it('should include modification descriptions', async () => {
      const application: PatternApplication = {
        pattern: pattern.pattern,
        targetDir: tempDir,
        projectName: 'test-project'
      };

      const result = await pattern.apply(application);

      for (const mod of result.modifications) {
        expect(mod.type).toBe('create');
        expect(mod.description).toBeTruthy();
      }
    });
  });
});
