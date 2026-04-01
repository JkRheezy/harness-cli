import { Logger } from '../utils/Logger';

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
    this.registerDefaultTools();
  }

  register(name: string, tool: Tool): void {
    this.tools.set(name, tool);
    this.logger.debug(`🔧 注册工具: ${name}`);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  async execute(name: string, params: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`工具不存在: ${name}`);
    }
    
    this.logger.info(`🔧 执行工具: ${name}`);
    return await tool.execute(params);
  }

  private registerDefaultTools(): void {
    // 注册默认工具
    this.register('read_file', {
      name: 'read_file',
      description: '读取文件内容',
      parameters: {
        path: { type: 'string', description: '文件路径' }
      },
      execute: async (params: { path: string }) => {
        const fs = await import('fs/promises');
        return await fs.readFile(params.path, 'utf-8');
      }
    });

    this.register('write_file', {
      name: 'write_file',
      description: '写入文件内容',
      parameters: {
        path: { type: 'string', description: '文件路径' },
        content: { type: 'string', description: '文件内容' }
      },
      execute: async (params: { path: string; content: string }) => {
        const fs = await import('fs/promises');
        await fs.writeFile(params.path, params.content, 'utf-8');
        return { success: true };
      }
    });

    this.register('run_command', {
      name: 'run_command',
      description: '运行命令',
      parameters: {
        command: { type: 'string', description: '命令' },
        cwd: { type: 'string', description: '工作目录', optional: true }
      },
      execute: async (params: { command: string; cwd?: string }) => {
        const { exec } = await import('child_process');
        const util = await import('util');
        const execPromise = util.promisify(exec);
        
        const { stdout, stderr } = await execPromise(params.command, { cwd: params.cwd });
        return { stdout, stderr };
      }
    });
  }
}
