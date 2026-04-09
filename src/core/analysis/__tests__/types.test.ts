import {
  TargetArchitecture,
  CurrentImplementation,
  Gap,
  BusinessTask,
  GapType,
  AgentSpec,
  ModuleSpec
} from '../types';

describe('Type Definitions', () => {
  it('should allow creating valid TargetArchitecture', () => {
    const arch: TargetArchitecture = {
      version: '1.0.0',
      parsedAt: new Date(),
      agents: [],
      modules: [],
      interfaces: [],
      dataModels: [],
      workflows: []
    };
    expect(arch.version).toBe('1.0.0');
  });

  it('should allow creating valid AgentSpec', () => {
    const agent: AgentSpec = {
      name: 'TestAgent',
      description: 'A test agent',
      responsibilities: ['task-execution'],
      skills: ['coding'],
      expectedFiles: ['src/agents/TestAgent.ts'],
      dependencies: []
    };
    expect(agent.name).toBe('TestAgent');
  });

  it('should allow creating valid ModuleSpec', () => {
    const module: ModuleSpec = {
      name: 'UserService',
      description: 'User management',
      layer: 'service',
      exposedInterfaces: ['createUser', 'getUser'],
      dependencies: ['Database'],
      expectedFiles: ['src/services/UserService.ts'],
      acceptanceCriteria: ['All tests pass']
    };
    expect(module.layer).toBe('service');
  });

  it('should allow creating valid Gap', () => {
    const gap: Gap = {
      id: 'gap-1',
      type: 'missing_agent',
      severity: 'blocking',
      specRef: { document: 'AGENTS.md' },
      targetName: 'TestAgent',
      targetDescription: 'Test agent description',
      evidence: {
        expected: 'Agent should exist',
        actual: 'Agent not found'
      },
      relatedFiles: []
    };
    expect(gap.type).toBe('missing_agent');
  });

  it('should allow creating valid BusinessTask', () => {
    const task: BusinessTask = {
      id: 'task-1',
      title: 'Implement TestAgent',
      description: 'Create the test agent',
      sourceGap: {
        id: 'gap-1',
        type: 'missing_agent',
        severity: 'blocking',
        specRef: { document: 'AGENTS.md' },
        targetName: 'TestAgent',
        targetDescription: 'Test agent',
        evidence: { expected: 'Agent', actual: 'No agent' },
        relatedFiles: []
      },
      requirements: ['Create file', 'Implement methods'],
      suggestedApproach: ['Step 1', 'Step 2'],
      acceptanceCriteria: ['Tests pass'],
      priority: 'P0',
      estimatedEffort: 'medium',
      maxDuration: 7200000,
      status: 'pending',
      createdAt: new Date()
    };
    expect(task.priority).toBe('P0');
  });

  it('should have all required GapTypes', () => {
    const types: GapType[] = [
      'missing_agent',
      'missing_module',
      'incomplete_module',
      'missing_interface',
      'orphan_code',
      'doc_outdated'
    ];
    expect(types).toHaveLength(6);
  });
});
