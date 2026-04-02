import { Command } from 'commander';
import visualizeCommand from '../visualize';

describe('visualize command', () => {
  test('should be a Command instance', () => {
    expect(visualizeCommand).toBeInstanceOf(Command);
  });

  test('should have correct name and description', () => {
    expect(visualizeCommand.name()).toBe('visualize');
    expect(visualizeCommand.description()).toBe('Generate architecture visualization');
  });

  test('should have format option with default value', () => {
    const formatOption = visualizeCommand.options.find(
      opt => opt.long === '--format'
    );
    expect(formatOption).toBeDefined();
    expect(formatOption?.defaultValue).toBe('mermaid');
  });

  test('should have output option', () => {
    const outputOption = visualizeCommand.options.find(
      opt => opt.long === '--output'
    );
    expect(outputOption).toBeDefined();
  });

  test('should have config option with default value', () => {
    const configOption = visualizeCommand.options.find(
      opt => opt.long === '--config'
    );
    expect(configOption).toBeDefined();
    expect(configOption?.defaultValue).toBe('.harness/config.yaml');
  });

  test('should export visualizeCommand as default', () => {
    const defaultExport = require('../visualize').default;
    expect(defaultExport).toBe(visualizeCommand);
  });
});
