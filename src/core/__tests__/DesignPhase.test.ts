import { DesignPhase } from '../DesignPhase';

describe('DesignPhase', () => {
  let designPhase: DesignPhase;

  beforeEach(() => {
    designPhase = new DesignPhase(true);
  });

  test('run returns design result', async () => {
    const task = {
      title: 'Test Task',
      description: 'Test description',
      requirements: []
    };

    const result = await designPhase.run(task);
    
    expect(result).toHaveProperty('phase');
    expect(result).toHaveProperty('approved');
    expect(result).toHaveProperty('summary');
  });
});
