import { Logger } from '../utils/Logger';

export interface Checkpoint {
  timestamp: number;
  currentTask: any;
  stats: {
    completed: number;
    failed: number;
    escalated: number;
  };
  queueState: any;
  hasGeneratedInitialTasks?: boolean;
}

export class CheckpointManager {
  private logger: Logger;
  private checkpointPath: string = './.harness/checkpoint.json';

  constructor() {
    this.logger = new Logger();
  }

  async save(checkpoint: Checkpoint): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // 确保目录存在
      const dir = path.dirname(this.checkpointPath);
      await fs.mkdir(dir, { recursive: true });
      
      // 保存检查点
      await fs.writeFile(
        this.checkpointPath,
        JSON.stringify(checkpoint, null, 2),
        'utf-8'
      );
      
      this.logger.debug('💾 检查点已保存');
    } catch (error) {
      this.logger.warn('检查点保存失败:', error);
    }
  }

  async load(): Promise<Checkpoint | null> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(this.checkpointPath, 'utf-8');
      return JSON.parse(content) as Checkpoint;
    } catch {
      // 文件不存在或读取失败
      return null;
    }
  }
}
