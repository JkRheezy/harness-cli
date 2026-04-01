import { LoopController } from '../core/LoopController';
import { DesignPhase } from '../core/DesignPhase';
import { PRWorkflow } from '../core/PRWorkflow';
import { ResilientErrorHandler } from '../core/ResilientLoop';

describe('Superpowers Integration', () => {
  test('DesignPhase can be instantiated', () => {
    const designPhase = new DesignPhase(true);
    expect(designPhase).toBeDefined();
  });

  test('PRWorkflow can be instantiated', () => {
    const prWorkflow = new PRWorkflow();
    expect(prWorkflow).toBeDefined();
  });

  test('ResilientErrorHandler can be instantiated', () => {
    const errorHandler = new ResilientErrorHandler(3);
    expect(errorHandler).toBeDefined();
  });
});
