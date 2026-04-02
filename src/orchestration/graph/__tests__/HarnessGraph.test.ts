import { HarnessGraph, GraphConfig } from '../HarnessGraph';
import { HarnessStateAnnotation } from '../state';

describe('HarnessGraph', () => {
  let graph: HarnessGraph;
  const mockGraphConfig: GraphConfig = {
    llmConfig: {},
    workingDir: '/tmp/test'
  };

  beforeEach(() => {
    graph = new HarnessGraph({}, mockGraphConfig);
  });

  test('should create a HarnessGraph instance', () => {
    expect(graph).toBeInstanceOf(HarnessGraph);
  });

  test('should get the graph', () => {
    const stateGraph = graph.getGraph();
    expect(stateGraph).toBeDefined();
  });

  test('should compile the graph', () => {
    const compiled = graph.compile();
    expect(compiled).toBeDefined();
  });

  test('should return the same compiled graph on subsequent calls', () => {
    const compiled1 = graph.compile();
    const compiled2 = graph.compile();
    expect(compiled1).toBe(compiled2);
  });

  test('should generate mermaid diagram', () => {
    const diagram = graph.getMermaidDiagram();
    expect(diagram).toBeDefined();
    expect(typeof diagram).toBe('string');
    expect(diagram).toContain('graph TD');
  });
});

describe('HarnessStateAnnotation', () => {
  test('should be defined', () => {
    expect(HarnessStateAnnotation).toBeDefined();
  });

  test('should have spec with all required state fields', () => {
    // The AnnotationRoot has a spec property containing the field definitions
    expect(HarnessStateAnnotation).toHaveProperty('spec');
    
    const fields = [
      'tasks',
      'currentTaskId',
      'results',
      'pendingReview',
      'reviewDecision',
      'abTestVariant',
      'abTestResults',
      'config',
      'iterationCount',
      'startTime',
      'errors',
      'shouldStop'
    ];
    
    const spec = (HarnessStateAnnotation as any).spec;
    fields.forEach(field => {
      expect(spec).toHaveProperty(field);
    });
  });

  test('should have correct default values in spec', () => {
    const spec = (HarnessStateAnnotation as any).spec;
    
    // Check that each field has a reducer and default value factory
    expect(spec.tasks.lg_is_channel).toBe(true);
    expect(spec.currentTaskId.lg_is_channel).toBe(true);
    expect(spec.results.lg_is_channel).toBe(true);
  });
});
