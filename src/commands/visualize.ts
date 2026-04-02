import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { LoopController } from '../core/LoopController';
import { ConfigLoader } from '../utils/ConfigLoader';

export const visualizeCommand = new Command('visualize')
  .description('Generate architecture visualization')
  .option('-f, --format <format>', 'Output format (mermaid|json)', 'mermaid')
  .option('-o, --output <path>', 'Output file path')
  .option('-c, --config <path>', 'Config file path', '.harness/config.yaml')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const controller = new LoopController(config);
      
      const diagram = await controller.getArchitectureDiagram();
      
      if (options.output) {
        await fs.writeFile(options.output, diagram, 'utf-8');
        console.log(`✅ Diagram saved to: ${options.output}`);
      } else {
        console.log('\n📊 Architecture Diagram:\n');
        console.log(diagram);
        console.log('\n');
      }
    } catch (error: any) {
      console.error('❌ Failed to generate visualization:', error.message);
      process.exit(1);
    }
  });

async function loadConfig(configPath: string) {
  try {
    return await ConfigLoader.load(configPath);
  } catch (error: any) {
    // If config doesn't exist, return a minimal config for visualization
    if (error.code === 'ENOENT' || error.message?.includes('not found')) {
      console.warn('⚠️  Config not found, using default configuration');
      return {
        llm: {
          provider: 'openai' as const,
          model: 'gpt-4',
          apiKey: process.env.OPENAI_API_KEY || '',
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
    }
    throw error;
  }
}

export default visualizeCommand;
