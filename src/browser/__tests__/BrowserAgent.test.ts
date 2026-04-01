import { BrowserAgent } from '../BrowserAgent';

describe('BrowserAgent', () => {
  test('should be instantiable', () => {
    const agent = new BrowserAgent();
    expect(agent).toBeDefined();
    expect(agent).toBeInstanceOf(BrowserAgent);
  });

  test('should have initialize method', () => {
    const agent = new BrowserAgent();
    expect(typeof agent.initialize).toBe('function');
  });

  test('should have navigate method', () => {
    const agent = new BrowserAgent();
    expect(typeof agent.navigate).toBe('function');
  });

  test('should have captureScreenshot method', () => {
    const agent = new BrowserAgent();
    expect(typeof agent.captureScreenshot).toBe('function');
  });

  test('should have verifyElement method', () => {
    const agent = new BrowserAgent();
    expect(typeof agent.verifyElement).toBe('function');
  });

  test('should have getConsoleLogs method', () => {
    const agent = new BrowserAgent();
    expect(typeof agent.getConsoleLogs).toBe('function');
  });

  test('should have close method', () => {
    const agent = new BrowserAgent();
    expect(typeof agent.close).toBe('function');
  });

  test('getConsoleLogs should return an array', () => {
    const agent = new BrowserAgent();
    const logs = agent.getConsoleLogs();
    expect(Array.isArray(logs)).toBe(true);
  });
});
