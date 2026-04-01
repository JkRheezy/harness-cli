import { BrowserValidator } from '../BrowserValidator';

describe('BrowserValidator', () => {
  let validator: BrowserValidator;

  beforeEach(() => {
    validator = new BrowserValidator();
  });

  test('should be instantiable', () => {
    expect(validator).toBeDefined();
  });

  test('validate method exists', () => {
    expect(typeof validator.validate).toBe('function');
  });

  test('compareWithBaseline method exists', () => {
    expect(typeof validator.compareWithBaseline).toBe('function');
  });
});
