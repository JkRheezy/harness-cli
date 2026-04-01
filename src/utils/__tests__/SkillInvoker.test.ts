import { SkillInvoker } from '../SkillInvoker';

describe('SkillInvoker', () => {
  let invoker: SkillInvoker;

  beforeEach(() => {
    invoker = new SkillInvoker();
  });

  test('exists returns false for non-existent skill', async () => {
    const result = await invoker.exists('non-existent-skill');
    expect(result).toBe(false);
  });

  test('invoke returns error for non-existent skill', async () => {
    const result = await invoker.invoke('non-existent', {});
    expect(result.success).toBe(false);
  });
});
