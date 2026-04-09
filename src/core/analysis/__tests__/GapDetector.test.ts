import { GapDetector } from '../GapDetector';
import {
  TargetArchitecture,
  CurrentImplementation,
  Gap,
  AgentSpec,
  ModuleSpec,
  InterfaceSpec,
  ImplementedAgent,
  ImplementedModule,
  SourceFile,
  ExportSymbol
} from '../types';

describe('GapDetector', () => {
  let detector: GapDetector;

  beforeEach(() => {
    detector = new GapDetector();
  });

  describe('detect', () => {
    it('should return empty array when target and current match perfectly', () => {
      const target = createTargetArchitecture({
        agents: [createAgentSpec('TestAgent')],
        modules: [createModuleSpec('TestModule')]
      });
      const current = createCurrentImplementation({
        agents: [createImplementedAgent('TestAgent')],
        modules: [createImplementedModule('TestModule')]
      });

      const gaps = detector.detect(target, current);

      expect(gaps).toHaveLength(0);
    });

    it('should detect missing agents', () => {
      const target = createTargetArchitecture({
        agents: [createAgentSpec('MissingAgent')]
      });
      const current = createCurrentImplementation({
        agents: []
      });

      const gaps = detector.detect(target, current);

      expect(gaps).toHaveLength(1);
      expect(gaps[0].type).toBe('missing_agent');
      expect(gaps[0].targetName).toBe('MissingAgent');
      expect(gaps[0].severity).toBe('blocking');
    });

    it('should detect multiple missing agents', () => {
      const target = createTargetArchitecture({
        agents: [
          createAgentSpec('AgentA'),
          createAgentSpec('AgentB'),
          createAgentSpec('AgentC')
        ]
      });
      const current = createCurrentImplementation({
        agents: [createImplementedAgent('AgentA')]
      });

      const gaps = detector.detect(target, current);

      expect(gaps).toHaveLength(2);
      expect(gaps.map(g => g.targetName)).toContain('AgentB');
      expect(gaps.map(g => g.targetName)).toContain('AgentC');
    });

    it('should detect missing modules', () => {
      const target = createTargetArchitecture({
        modules: [createModuleSpec('MissingModule')]
      });
      const current = createCurrentImplementation({
        modules: []
      });

      const gaps = detector.detect(target, current);

      expect(gaps).toHaveLength(1);
      expect(gaps[0].type).toBe('missing_module');
      expect(gaps[0].targetName).toBe('MissingModule');
      expect(gaps[0].severity).toBe('blocking');
    });

    it('should detect incomplete modules with missing interfaces', () => {
      const target = createTargetArchitecture({
        modules: [
          createModuleSpec('IncompleteModule', ['interface1', 'interface2'])
        ],
        interfaces: [
          createInterfaceSpec('interface1', 'IncompleteModule'),
          createInterfaceSpec('interface2', 'IncompleteModule')
        ]
      });
      const current = createCurrentImplementation({
        modules: [
          createImplementedModule('IncompleteModule', ['interface1'])
        ]
      });

      const gaps = detector.detect(target, current);

      const incompleteGap = gaps.find(g => g.type === 'incomplete_module');
      expect(incompleteGap).toBeDefined();
      expect(incompleteGap!.evidence.missingItems).toContain('interface2');
    });

    it('should detect missing interfaces', () => {
      const target = createTargetArchitecture({
        modules: [createModuleSpec('TestModule', ['missingInterface'])],
        interfaces: [createInterfaceSpec('missingInterface', 'TestModule')]
      });
      const current = createCurrentImplementation({
        modules: [createImplementedModule('TestModule', [])]
      });

      const gaps = detector.detect(target, current);

      const interfaceGap = gaps.find(g => g.type === 'missing_interface');
      expect(interfaceGap).toBeDefined();
      expect(interfaceGap!.targetName).toBe('missingInterface');
    });

    it('should detect orphan code', () => {
      const target = createTargetArchitecture({
        agents: [createAgentSpec('SpecAgent')],
        modules: [createModuleSpec('SpecModule')]
      });
      const current = createCurrentImplementation({
        agents: [
          createImplementedAgent('SpecAgent'),
          createImplementedAgent('OrphanAgent')
        ],
        modules: [
          createImplementedModule('SpecModule'),
          createImplementedModule('OrphanModule')
        ]
      });

      const gaps = detector.detect(target, current);

      const orphanGaps = gaps.filter(g => g.type === 'orphan_code');
      expect(orphanGaps).toHaveLength(2);
      expect(orphanGaps.map(g => g.targetName)).toContain('OrphanAgent');
      expect(orphanGaps.map(g => g.targetName)).toContain('OrphanModule');
    });

    it('should calculate severity correctly for blocking items', () => {
      const target = createTargetArchitecture({
        agents: [createAgentSpec('CoreAgent')],
        modules: [createModuleSpec('CoreModule')]
      });
      const current = createCurrentImplementation();

      const gaps = detector.detect(target, current);

      expect(gaps.every(g => g.severity === 'blocking')).toBe(true);
    });

    it('should calculate severity as major for incomplete modules', () => {
      const target = createTargetArchitecture({
        modules: [
          createModuleSpec('TestModule', ['interface1', 'interface2'])
        ],
        interfaces: [
          createInterfaceSpec('interface1', 'TestModule'),
          createInterfaceSpec('interface2', 'TestModule')
        ]
      });
      const current = createCurrentImplementation({
        modules: [createImplementedModule('TestModule', ['interface1'])]
      });

      const gaps = detector.detect(target, current);

      const incompleteGap = gaps.find(g => g.type === 'incomplete_module');
      expect(incompleteGap?.severity).toBe('major');
    });

    it('should calculate severity as minor for orphan code', () => {
      const target = createTargetArchitecture({
        agents: []
      });
      const current = createCurrentImplementation({
        agents: [createImplementedAgent('OrphanAgent')]
      });

      const gaps = detector.detect(target, current);

      expect(gaps[0].severity).toBe('minor');
    });

    it('should generate unique gap IDs', () => {
      const target = createTargetArchitecture({
        agents: [createAgentSpec('Agent1'), createAgentSpec('Agent2')]
      });
      const current = createCurrentImplementation();

      const gaps = detector.detect(target, current);

      const ids = gaps.map(g => g.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should include evidence for missing items', () => {
      const target = createTargetArchitecture({
        modules: [
          createModuleSpec('TestModule', ['iface1', 'iface2', 'iface3'])
        ],
        interfaces: [
          createInterfaceSpec('iface1', 'TestModule'),
          createInterfaceSpec('iface2', 'TestModule'),
          createInterfaceSpec('iface3', 'TestModule')
        ]
      });
      const current = createCurrentImplementation({
        modules: [createImplementedModule('TestModule', ['iface1'])]
      });

      const gaps = detector.detect(target, current);

      const incompleteGap = gaps.find(g => g.type === 'incomplete_module');
      expect(incompleteGap?.evidence.expected).toBe('3 interfaces');
      expect(incompleteGap?.evidence.actual).toBe('1 interface');
      expect(incompleteGap?.evidence.missingItems).toEqual(['iface2', 'iface3']);
    });

    it('should include related files in gaps', () => {
      const target = createTargetArchitecture({
        modules: [createModuleSpec('TestModule')]
      });
      const current = createCurrentImplementation({
        modules: []
      });

      const gaps = detector.detect(target, current);

      expect(gaps[0].relatedFiles).toEqual(['src/modules/TestModule.ts']);
    });

    it('should handle complex scenario with multiple gap types', () => {
      const target = createTargetArchitecture({
        agents: [createAgentSpec('AgentA'), createAgentSpec('AgentB')],
        modules: [
          createModuleSpec('ModuleA', ['iface1', 'iface2']),
          createModuleSpec('ModuleB')
        ],
        interfaces: [
          createInterfaceSpec('iface1', 'ModuleA'),
          createInterfaceSpec('iface2', 'ModuleA')
        ]
      });
      const current = createCurrentImplementation({
        agents: [createImplementedAgent('AgentA')],
        modules: [
          createImplementedModule('ModuleA', ['iface1']),
          createImplementedModule('OrphanModule')
        ]
      });

      const gaps = detector.detect(target, current);

      expect(gaps.some(g => g.type === 'missing_agent' && g.targetName === 'AgentB')).toBe(true);
      expect(gaps.some(g => g.type === 'missing_module' && g.targetName === 'ModuleB')).toBe(true);
      expect(gaps.some(g => g.type === 'incomplete_module')).toBe(true);
      expect(gaps.some(g => g.type === 'orphan_code' && g.targetName === 'OrphanModule')).toBe(true);
    });
  });

  describe('detectMissingAgents', () => {
    it('should detect agents in spec but not in implementation', () => {
      const target = createTargetArchitecture({
        agents: [createAgentSpec('Missing')]
      });
      const current = createCurrentImplementation();

      const gaps = (detector as any).detectMissingAgents(target, current);

      expect(gaps).toHaveLength(1);
      expect(gaps[0].type).toBe('missing_agent');
    });
  });

  describe('detectMissingModules', () => {
    it('should detect modules in spec but not in implementation', () => {
      const target = createTargetArchitecture({
        modules: [createModuleSpec('Missing')]
      });
      const current = createCurrentImplementation();

      const gaps = (detector as any).detectMissingModules(target, current);

      expect(gaps).toHaveLength(1);
      expect(gaps[0].type).toBe('missing_module');
    });
  });

  describe('detectIncompleteModules', () => {
    it('should detect modules with missing interfaces', () => {
      const target = createTargetArchitecture({
        modules: [createModuleSpec('Test', ['iface1', 'iface2'])],
        interfaces: [
          createInterfaceSpec('iface1', 'Test'),
          createInterfaceSpec('iface2', 'Test')
        ]
      });
      const current = createCurrentImplementation({
        modules: [createImplementedModule('Test', ['iface1'])]
      });

      const gaps = (detector as any).detectIncompleteModules(target, current);

      expect(gaps).toHaveLength(1);
      expect(gaps[0].type).toBe('incomplete_module');
    });
  });

  describe('detectOrphanCode', () => {
    it('should detect implemented agents not in spec', () => {
      const target = createTargetArchitecture({ agents: [] });
      const current = createCurrentImplementation({
        agents: [createImplementedAgent('Orphan')]
      });

      const gaps = (detector as any).detectOrphanCode(target, current);

      expect(gaps).toHaveLength(1);
      expect(gaps[0].type).toBe('orphan_code');
    });

    it('should detect implemented modules not in spec', () => {
      const target = createTargetArchitecture({ modules: [] });
      const current = createCurrentImplementation({
        modules: [createImplementedModule('Orphan')]
      });

      const gaps = (detector as any).detectOrphanCode(target, current);

      expect(gaps).toHaveLength(1);
      expect(gaps[0].type).toBe('orphan_code');
    });
  });

  describe('calculateSeverity', () => {
    it('should return blocking for missing_agent', () => {
      const severity = (detector as any).calculateSeverity('missing_agent', 'Test');
      expect(severity).toBe('blocking');
    });

    it('should return blocking for missing_module', () => {
      const severity = (detector as any).calculateSeverity('missing_module', 'Test');
      expect(severity).toBe('blocking');
    });

    it('should return major for incomplete_module', () => {
      const severity = (detector as any).calculateSeverity('incomplete_module', 'Test');
      expect(severity).toBe('major');
    });

    it('should return major for missing_interface', () => {
      const severity = (detector as any).calculateSeverity('missing_interface', 'Test');
      expect(severity).toBe('major');
    });

    it('should return minor for orphan_code', () => {
      const severity = (detector as any).calculateSeverity('orphan_code', 'Test');
      expect(severity).toBe('minor');
    });

    it('should return major for doc_outdated', () => {
      const severity = (detector as any).calculateSeverity('doc_outdated', 'Test');
      expect(severity).toBe('major');
    });
  });
});

// Helper functions
function createTargetArchitecture(overrides: Partial<TargetArchitecture> = {}): TargetArchitecture {
  return {
    version: '1.0.0',
    parsedAt: new Date(),
    agents: [],
    modules: [],
    interfaces: [],
    dataModels: [],
    workflows: [],
    ...overrides
  };
}

function createAgentSpec(name: string): AgentSpec {
  return {
    name,
    description: `Description for ${name}`,
    responsibilities: [],
    skills: [],
    expectedFiles: [`src/agents/${name}.ts`],
    dependencies: []
  };
}

function createModuleSpec(name: string, exposedInterfaces: string[] = []): ModuleSpec {
  return {
    name,
    description: `Description for ${name}`,
    layer: 'service',
    exposedInterfaces,
    dependencies: [],
    expectedFiles: [`src/modules/${name}.ts`],
    acceptanceCriteria: []
  };
}

function createInterfaceSpec(name: string, module: string): InterfaceSpec {
  return {
    name,
    type: 'function',
    signature: `function ${name}()`,
    module,
    description: `Interface ${name}`
  };
}

function createCurrentImplementation(overrides: Partial<CurrentImplementation> = {}): CurrentImplementation {
  return {
    scannedAt: new Date(),
    agents: [],
    modules: [],
    files: [],
    exports: [],
    ...overrides
  };
}

function createImplementedAgent(name: string): ImplementedAgent {
  return {
    name,
    files: [`src/agents/${name}.ts`],
    detectedResponsibilities: [],
    completeness: 1.0
  };
}

function createImplementedModule(name: string, exportedSymbols: string[] = []): ImplementedModule {
  return {
    name,
    files: [`src/modules/${name}.ts`],
    exportedSymbols,
    detectedLayer: 'service'
  };
}
