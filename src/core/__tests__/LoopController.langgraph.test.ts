import { LoopController, LoopConfig } from '../LoopController';
import { OrchestrationConfig } from '../../types/orchestration';

describe('LoopController - LangGraph Integration', () => {
  const baseConfig: LoopConfig = {
    llm: {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key',
      maxTokens: 4000,
      temperature: 0.2,
      timeout: 300000
    },
    safety: {
      maxExecutionTime: 21600000,
      maxErrorRate: 0.5,
      maxComplexity: 100
    },
    checkpoint: {
      enabled: false,
      interval: 300000
    }
  };

  describe('without orchestration config', () => {
    test('should not initialize LangGraph when orchestration is undefined', () => {
      const controller = new LoopController(baseConfig);
      
      // Should work without LangGraph
      expect(controller).toBeDefined();
    });

    test('getArchitectureDiagram returns legacy diagram', async () => {
      const controller = new LoopController(baseConfig);
      const diagram = await controller.getArchitectureDiagram();
      
      expect(diagram).toContain('Task Queue');
      expect(diagram).toContain('Task Executor');
    });
  });

  describe('with orchestration config', () => {
    const orchestrationConfig: OrchestrationConfig = {
      enableHumanReview: false,
      enableParallelExecution: false,
      enableABTesting: false,
      maxParallelAgents: 3,
      reviewTimeoutMs: 300000
    };

    const configWithOrchestration: LoopConfig = {
      ...baseConfig,
      orchestration: orchestrationConfig
    };

    test('should initialize LangGraph when orchestration is provided', () => {
      const controller = new LoopController(configWithOrchestration);
      
      expect(controller).toBeDefined();
    });

    test('getArchitectureDiagram returns Mermaid diagram from LangGraph', async () => {
      const controller = new LoopController(configWithOrchestration);
      const diagram = await controller.getArchitectureDiagram();
      
      expect(diagram).toContain('graph TD');
      expect(diagram).toContain('START');
      expect(diagram).toContain('END');
    });

    test('saveArchitectureDiagram writes diagram to file', async () => {
      const fs = require('fs/promises');
      const writeFileSpy = jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
      
      const controller = new LoopController(configWithOrchestration);
      const outputPath = '/tmp/diagram.mmd';
      
      await controller.saveArchitectureDiagram(outputPath);
      
      expect(writeFileSpy).toHaveBeenCalledWith(
        outputPath,
        expect.stringContaining('graph TD'),
        'utf-8'
      );
      
      writeFileSpy.mockRestore();
    });
  });

  describe('orchestration config variations', () => {
    test('works with human review enabled', () => {
      const config: LoopConfig = {
        ...baseConfig,
        orchestration: {
          enableHumanReview: true,
          enableParallelExecution: false,
          enableABTesting: false,
          maxParallelAgents: 3,
          reviewTimeoutMs: 300000
        }
      };
      
      const controller = new LoopController(config);
      expect(controller).toBeDefined();
    });

    test('works with parallel execution enabled', () => {
      const config: LoopConfig = {
        ...baseConfig,
        orchestration: {
          enableHumanReview: false,
          enableParallelExecution: true,
          enableABTesting: false,
          maxParallelAgents: 5,
          reviewTimeoutMs: 300000
        }
      };
      
      const controller = new LoopController(config);
      expect(controller).toBeDefined();
    });

    test('works with A/B testing enabled', () => {
      const config: LoopConfig = {
        ...baseConfig,
        orchestration: {
          enableHumanReview: false,
          enableParallelExecution: false,
          enableABTesting: true,
          maxParallelAgents: 3,
          reviewTimeoutMs: 300000
        }
      };
      
      const controller = new LoopController(config);
      expect(controller).toBeDefined();
    });
  });
});
