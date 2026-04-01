import { EventEmitter } from 'events';
import { TaskQueue, Task } from './TaskQueue';
import { TaskExecutor } from './TaskExecutor';
import { ReviewAgent } from './ReviewAgent';
import { PRAutomator } from './PRAutomator';
import { StateManager } from './StateManager';
import { SafetyGuard } from './SafetyGuard';
import { Logger } from '../utils/Logger';
import { CheckpointManager } from './CheckpointManager';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DesignPhase } from './DesignPhase';
import { PRWorkflow } from './PRWorkflow';
import { ResilientErrorHandler } from './ResilientLoop';
import { DesignResult, PRWorkflowResult } from '../types/superpowers';

export interface LoopConfig {
  llm: {
    provider: 'openai' | 'anthropic' | 'kimi' | 'google' | 'local';
    model: string;
    apiKey: string;
    baseUrl?: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
  };
  safety: {
    maxExecutionTime: number;
    maxErrorRate: number;
    maxComplexity: number;
  };
  checkpoint: {
    enabled: boolean;
    interval: number;
  };
  projectPath?: string;
}

export interface LoopOptions {
  maxDuration: number;
  dryRun?: boolean;
}

export class LoopController extends EventEmitter {
  private config: LoopConfig;
  private taskQueue: TaskQueue;
  private executor: TaskExecutor;
  private reviewer: ReviewAgent;
  private prAutomator: PRAutomator;
  private stateManager: StateManager;
  private safetyGuard: SafetyGuard;
  private checkpointManager: CheckpointManager;
  private logger: Logger;
  
  private isRunning: boolean = false;
  private startTime: number = 0;
  private currentTask: any = null;
  private stats = {
    completed: 0,
    failed: 0,
    escalated: 0
  };
  private actionHistory: string[] = [];
  private hasGeneratedInitialTasks: boolean = false;
  private designPhase: DesignPhase;
  private prWorkflow: PRWorkflow;
  private errorHandler: ResilientErrorHandler;
  private enableSuperpowers: boolean;

  constructor(config: LoopConfig) {
    super();
    this.config = config;
    this.logger = new Logger();
    
    // 确定工作目录
    const workingDir = config.projectPath || process.cwd();
    this.logger.info(`📁 Working directory: ${workingDir}`);
    
    this.taskQueue = new TaskQueue();
    this.executor = new TaskExecutor(config.llm, workingDir);
    this.reviewer = new ReviewAgent(config.llm);
    this.prAutomator = new PRAutomator();
    this.stateManager = new StateManager();
    this.safetyGuard = new SafetyGuard(config.safety);
    this.checkpointManager = new CheckpointManager();
    
    // Initialize Superpowers components
    this.enableSuperpowers = true; // Can be from config
    this.designPhase = new DesignPhase(true);
    this.prWorkflow = new PRWorkflow();
    this.errorHandler = new ResilientErrorHandler(3);
  }

  async start(options: LoopOptions): Promise<void> {
    this.isRunning = true;
    this.startTime = Date.now();
    
    this.logger.info('🚀 Loop 控制器已启动');
    this.logger.info(`⏱️  最大运行时长: ${options.maxDuration / (1000 * 60 * 60)}小时`);
    this.logger.info(`🧪 模拟模式: ${options.dryRun ? '是' : '否'}`);
    
    // 加载之前的检查点（如果有）
    await this.loadCheckpoint();
    
    // 启动检查点定时器
    if (this.config.checkpoint.enabled) {
      this.startCheckpointTimer();
    }
    
    // 主循环
    while (this.isRunning) {
      try {
        // 检查是否超过最大运行时间
        if (this.shouldStop(options.maxDuration)) {
          this.logger.info('⏰ 达到最大运行时长，停止 Loop');
          break;
        }
        
        // 安全检查
        const safetyCheck = await this.safetyGuard.checkLoopHealth(this.getContext());
        if (!safetyCheck.passed) {
          this.logger.warn('⚠️  安全检查未通过:', safetyCheck.reason);
          await this.handleSafetyViolation(safetyCheck);
          continue;
        }
        
        // 获取任务
        this.currentTask = await this.taskQueue.dequeue({ timeout: 30000 });
        
        if (!this.currentTask) {
          // 队列为空时，尝试从项目分析生成任务
          if (!this.hasGeneratedInitialTasks) {
            this.logger.info('📋 任务队列为空，分析项目生成初始任务...');
            await this.generateTasksFromProject();
            this.hasGeneratedInitialTasks = true;
            continue;
          }
          
          // 无任务，短暂休眠
          await this.sleep(1000);
          continue;
        }
        
        this.logger.info(`📋 开始执行任务: ${this.currentTask.title}`);
        this.recordAction(`task_start:${this.currentTask.id}`);
        
        // 执行任务
        const result = await this.executeTask(this.currentTask, options);
        
        // 处理结果
        await this.processResult(this.currentTask, result);
        
      } catch (error: any) {
        this.logger.error('Loop 执行错误:', error);
        this.recordAction(`error:${error.message}`);
        await this.handleLoopError(error);
      }
    }
    
    this.logger.info('🏁 Loop 已停止');
    this.logger.info(`📊 统计: 完成${this.stats.completed}, 失败${this.stats.failed}, 升级${this.stats.escalated}`);
  }

  async stop(): Promise<void> {
    this.logger.info('🛑 正在停止 Loop...');
    this.isRunning = false;
    
    // 保存最终检查点
    await this.saveCheckpoint();
    
    // 清理资源
    await this.cleanup();
  }

  async getStatus(): Promise<any> {
    return {
      loopStatus: this.isRunning ? 'running' : 'stopped',
      activeTasks: this.currentTask ? 1 : 0,
      pendingTasks: await this.taskQueue.getPendingCount(),
      completedTasks: this.stats.completed,
      failedTasks: this.stats.failed,
      uptime: Date.now() - this.startTime
    };
  }

  private async generateTasksFromProject(): Promise<void> {
    try {
      // 读取 AGENTS.md
      const agentsMd = await this.readAgentsMd();
      
      // 读取开发计划
      const plans = await this.findDevelopmentPlans();
      
      // 分析代码现状
      const codeStatus = await this.analyzeCodebase();
      
      let tasks: Task[] = [];
      
      if (plans.length === 0) {
        this.logger.warn('⚠️ 未找到开发计划，基于代码现状生成默认任务');
        // 基于代码现状生成默认任务
        tasks = this.createTasksFromCodeStatus(codeStatus);
      } else {
        // 根据计划和现状生成任务
        tasks = this.createTasksFromPlans(plans, codeStatus);
      }
      
      // 加入队列
      for (const task of tasks) {
        await this.taskQueue.enqueue(task);
        this.logger.info(`📥 生成任务: ${task.title}`);
      }
      
      this.logger.info(`✅ 已生成 ${tasks.length} 个初始任务`);
      
    } catch (error: any) {
      this.logger.error('生成任务失败:', error.message);
    }
  }
  
  private createTasksFromCodeStatus(codeStatus: any): Task[] {
    const tasks: Task[] = [];
    const now = new Date();
    
    // 根据缺失的组件生成任务（与 createTasksFromPlans 相同的逻辑）
    if (!codeStatus.hasPickerAgent) {
      tasks.push({
        id: `task-${Date.now()}-picker`,
        title: '实现 PickerAgent 选品智能体',
        description: '实现选品Agent，包含Google Trends和Reddit趋势分析功能，生成产品创意',
        requirements: [
          '创建 src/lib/ai/agents/PickerAgent.ts',
          '实现趋势数据源接口',
          '实现产品创意生成逻辑',
          '添加单元测试'
        ],
        priority: 'high' as const,
        status: 'pending' as const,
        maxDuration: 2 * 60 * 60 * 1000,
        createdAt: now
      });
    }
    
    if (!codeStatus.hasDesignerAgent) {
      tasks.push({
        id: `task-${Date.now()}-designer`,
        title: '实现 DesignerAgent 设计智能体',
        description: '实现设计Agent，生成AI图像Prompt并调用图像生成API',
        requirements: [
          '创建 src/lib/ai/agents/DesignerAgent.ts',
          '实现图像Prompt生成',
          '集成图像生成API',
          '添加设计模板'
        ],
        priority: 'high' as const,
        status: 'pending' as const,
        maxDuration: 2 * 60 * 60 * 1000,
        createdAt: now
      });
    }
    
    if (!codeStatus.hasMarketerAgent) {
      tasks.push({
        id: `task-${Date.now()}-marketer`,
        title: '实现 MarketerAgent 营销智能体',
        description: '实现营销Agent，生成商品文案、SEO优化、广告素材',
        requirements: [
          '创建 src/lib/ai/agents/MarketerAgent.ts',
          '实现商品描述生成',
          '实现SEO关键词优化',
          '生成社交媒体文案'
        ],
        priority: 'medium' as const,
        status: 'pending' as const,
        maxDuration: 2 * 60 * 60 * 1000,
        createdAt: now
      });
    }
    
    if (!codeStatus.hasOrchestrator) {
      tasks.push({
        id: `task-${Date.now()}-orchestrator`,
        title: '实现 Orchestrator 协调器',
        description: '实现Agent协调器，管理多Agent协作和状态流转',
        requirements: [
          '创建 src/lib/ai/Orchestrator.ts',
          '实现Agent注册机制',
          '实现状态管理',
          '集成LangGraph'
        ],
        priority: 'high' as const,
        status: 'pending' as const,
        maxDuration: 2 * 60 * 60 * 1000,
        createdAt: now
      });
    }
    
    // 如果所有组件都已存在，生成一个代码审查任务
    if (tasks.length === 0) {
      tasks.push({
        id: `task-${Date.now()}-review`,
        title: '代码质量审查与优化',
        description: '审查现有代码质量，识别改进点并生成优化建议',
        requirements: [
          '分析代码结构和设计模式',
          '检查类型安全和错误处理',
          '识别性能瓶颈',
          '生成优化报告和改进代码'
        ],
        priority: 'medium' as const,
        status: 'pending' as const,
        maxDuration: 2 * 60 * 60 * 1000,
        createdAt: now
      });
    }
    
    return tasks;
  }

  private async readAgentsMd(): Promise<string> {
    try {
      return await fs.readFile('AGENTS.md', 'utf-8');
    } catch {
      return '';
    }
  }

  private async findDevelopmentPlans(): Promise<any[]> {
    const plansDir = 'docs/superpowers/plans';
    const plans: any[] = [];
    
    try {
      const files = await fs.readdir(plansDir);
      for (const file of files.filter(f => f.endsWith('.md'))) {
        const content = await fs.readFile(path.join(plansDir, file), 'utf-8');
        plans.push({
          file,
          content,
          tasks: this.extractTasksFromPlan(content)
        });
      }
    } catch {
      // 目录不存在
    }
    
    return plans;
  }

  private extractTasksFromPlan(content: string): any[] {
    const tasks: any[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      // 匹配任务行: "- [ ] 任务描述" 或 "1. 任务描述"
      const match = line.match(/^(?:\s*[-*]\s*\[\s*\]\s*|\s*\d+\.\s*)(.+)$/);
      if (match) {
        tasks.push({
          description: match[1].trim(),
          raw: line.trim()
        });
      }
    }
    
    return tasks;
  }

  private async analyzeCodebase(): Promise<any> {
    const status: any = {
      hasPickerAgent: false,
      hasDesignerAgent: false,
      hasMarketerAgent: false,
      hasOrchestrator: false,
      hasFrontend: false,
      missingComponents: []
    };
    
    try {
      const files = await fs.readdir('src/lib/ai/agents');
      status.hasPickerAgent = files.some(f => f.toLowerCase().includes('picker'));
      status.hasDesignerAgent = files.some(f => f.toLowerCase().includes('designer'));
      status.hasMarketerAgent = files.some(f => f.toLowerCase().includes('marketer'));
      status.hasOrchestrator = files.some(f => f.toLowerCase().includes('orchestrator'));
    } catch {
      // 目录不存在
    }
    
    if (!status.hasPickerAgent) status.missingComponents.push('PickerAgent');
    if (!status.hasDesignerAgent) status.missingComponents.push('DesignerAgent');
    if (!status.hasMarketerAgent) status.missingComponents.push('MarketerAgent');
    if (!status.hasOrchestrator) status.missingComponents.push('Orchestrator');
    
    return status;
  }

  private createTasksFromPlans(plans: any[], codeStatus: any): Task[] {
    const tasks: Task[] = [];
    const now = new Date();
    
    // 根据缺失的组件生成任务
    if (!codeStatus.hasPickerAgent) {
      tasks.push({
        id: `task-${Date.now()}-picker`,
        title: '实现 PickerAgent 选品智能体',
        description: '实现选品Agent，包含Google Trends和Reddit趋势分析功能，生成产品创意',
        requirements: [
          '创建 src/lib/ai/agents/PickerAgent.ts',
          '实现趋势数据源接口',
          '实现产品创意生成逻辑',
          '添加单元测试'
        ],
        priority: 'high' as const,
        status: 'pending' as const,
        maxDuration: 2 * 60 * 60 * 1000,
        createdAt: now
      });
    }
    
    if (!codeStatus.hasDesignerAgent) {
      tasks.push({
        id: `task-${Date.now()}-designer`,
        title: '实现 DesignerAgent 设计智能体',
        description: '实现设计Agent，生成AI图像Prompt并调用图像生成API',
        requirements: [
          '创建 src/lib/ai/agents/DesignerAgent.ts',
          '实现图像Prompt生成',
          '集成图像生成API',
          '添加设计模板'
        ],
        priority: 'high' as const,
        status: 'pending' as const,
        maxDuration: 2 * 60 * 60 * 1000,
        createdAt: now
      });
    }
    
    if (!codeStatus.hasMarketerAgent) {
      tasks.push({
        id: `task-${Date.now()}-marketer`,
        title: '实现 MarketerAgent 营销智能体',
        description: '实现营销Agent，生成商品文案、SEO优化、广告素材',
        requirements: [
          '创建 src/lib/ai/agents/MarketerAgent.ts',
          '实现商品描述生成',
          '实现SEO关键词优化',
          '生成社交媒体文案'
        ],
        priority: 'medium' as const,
        status: 'pending' as const,
        maxDuration: 2 * 60 * 60 * 1000,
        createdAt: now
      });
    }
    
    if (!codeStatus.hasOrchestrator) {
      tasks.push({
        id: `task-${Date.now()}-orchestrator`,
        title: '实现 Orchestrator 协调器',
        description: '实现Agent协调器，管理多Agent协作和状态流转',
        requirements: [
          '创建 src/lib/ai/Orchestrator.ts',
          '实现Agent注册机制',
          '实现状态管理',
          '集成LangGraph'
        ],
        priority: 'high' as const,
        status: 'pending' as const,
        maxDuration: 2 * 60 * 60 * 1000,
        createdAt: now
      });
    }
    
    return tasks;
  }

  private async executeTask(task: any, options: LoopOptions): Promise<any> {
    const startTime = Date.now();
    
    // Design Phase (if Superpowers enabled)
    if (this.enableSuperpowers) {
      const designResult = await this.designPhase.run(task);
      
      if (!designResult.approved) {
        this.logger.warn(`⏳ Task ${task.id} design not approved, skipping`);
        return {
          status: 'skipped',
          reason: 'design_not_approved',
          duration: Date.now() - startTime
        };
      }
    }
    
    try {
      // 更新任务状态
      task.status = 'running';
      task.startedAt = new Date();
      await this.taskQueue.update(task);
      
      // 执行任务（使用 TaskExecutor）
      const result = await this.executor.execute(task, {
        dryRun: options.dryRun,
        onProgress: (progress) => {
          this.emit('taskProgress', { task, progress });
        }
      });
      
      // 计算执行时间
      const duration = Date.now() - startTime;
      
      return {
        ...result,
        duration,
        completedAt: new Date()
      };
      
    } catch (error: any) {
      return {
        status: 'failed',
        error: error.message || String(error),
        duration: Date.now() - startTime
      };
    }
  }

  private async processResult(task: any, result: any): Promise<void> {
    this.logger.info(`✅ 任务执行完成: ${task.title}`);
    this.logger.info(`   状态: ${result.status}`);
    this.logger.info(`   耗时: ${result.duration}ms`);
    
    if (result.status === 'success') {
      this.stats.completed++;
      this.recordAction(`task_complete:${task.id}`);
      
      // PR Workflow (if not dry run and has changes)
      if (result.hasChanges && !result.dryRun && this.enableSuperpowers) {
        const prResult = await this.prWorkflow.run(task, result);
        
        if (prResult.prNumber > 0) {
          task.prUrl = prResult.prUrl;
          task.prNumber = prResult.prNumber;
          task.prMerged = prResult.merged;
        }
      }
      
      // Legacy PR creation fallback
      if (result.hasChanges && !result.dryRun && !this.enableSuperpowers) {
        await this.createPR(task, result);
      }
      
      // 更新任务状态
      task.status = 'completed';
      task.result = result;
      task.completedAt = new Date();
      await this.taskQueue.update(task);
      
      // 生成后续任务（如果适用）
      await this.generateFollowUpTasks(task, result);
      
      this.emit('taskCompleted', { task, result });
      
    } else if (result.status === 'failed') {
      // Use resilient error handler instead of immediate failure
      const errorResult = await this.errorHandler.handleFailure(
        task, 
        new Error(result.error), 
        task.retryCount || 0
      );
      
      if (errorResult.shouldRetry) {
        // Retry the task
        task.retryCount = (task.retryCount || 0) + 1;
        task.status = 'pending';
        await this.taskQueue.enqueue(task);
        this.logger.info(`🔄 Task ${task.id} queued for retry (attempt ${task.retryCount})`);
      } else if (errorResult.fixTaskId) {
        // Fix task created, mark current as failed
        this.stats.failed++;
        this.recordAction(`task_failed:${task.id}`);
        task.status = 'failed';
        task.result = result;
        task.fixTaskId = errorResult.fixTaskId;
        await this.taskQueue.update(task);
        
        this.logger.info(`📥 Fix task ${errorResult.fixTaskId} created for failed task`);
      }
    }
  }

  private async generateFollowUpTasks(completedTask: any, result: any): Promise<void> {
    // 根据完成的任务生成后续任务
    const followUpTasks: any[] = [];
    
    // 如果实现了某个 Agent，可能需要添加测试任务
    if (completedTask.title.includes('实现') && !completedTask.title.includes('测试')) {
      const testTask = {
        id: `task-${Date.now()}-test`,
        title: `添加 ${completedTask.title.replace('实现', '')} 的单元测试`,
        description: `为已完成的 ${completedTask.title} 添加完整的单元测试覆盖`,
        requirements: [
          `测试 ${completedTask.title.replace('实现', '').trim()} 的核心功能`,
          '覆盖正常路径和边界情况',
          '使用适当的 mock 隔离外部依赖'
        ],
        priority: 'medium' as const,
        status: 'pending' as const,
        parentTask: completedTask.id,
        maxDuration: 60 * 60 * 1000, // 1小时
        createdAt: new Date()
      };
      followUpTasks.push(testTask);
    }
    
    // 如果实现了多个 Agent，生成集成任务
    if (completedTask.title.includes('Agent')) {
      const pendingAgents = ['DesignerAgent', 'MarketerAgent', 'Orchestrator']
        .filter(name => !completedTask.title.includes(name));
      
      if (pendingAgents.length > 0) {
        this.logger.info(`📋 还有 ${pendingAgents.length} 个 Agent 待实现`);
      }
    }
    
    // 加入队列
    for (const newTask of followUpTasks) {
      await this.taskQueue.enqueue(newTask);
      this.logger.info(`📥 生成后续任务: ${newTask.title}`);
    }
  }

  private async generateFixTask(failedTask: any, result: any): Promise<void> {
    // 生成修复任务
    const fixTask = {
      id: `task-${Date.now()}-fix`,
      title: `修复: ${failedTask.title}`,
      description: `修复任务执行失败的问题。\n\n原错误: ${result.error || '未知错误'}`,
      requirements: [
        '分析失败原因',
        '修复根本问题',
        '验证修复效果'
      ],
      priority: 'high' as const,
      status: 'pending' as const,
      parentTask: failedTask.id,
      maxDuration: failedTask.maxDuration,
      createdAt: new Date()
    };
    
    await this.taskQueue.enqueue(fixTask);
    this.logger.info(`📥 生成修复任务: ${fixTask.title}`);
  }

  private async createPR(task: any, result: any): Promise<void> {
    try {
      this.logger.info(`🔀 为任务 ${task.id} 创建 PR`);
      
      const pr = await this.prAutomator.create({
        branch: result.branch || `harness/${task.id}`,
        title: `[Auto] ${task.title}`,
        body: this.buildPRBody(task, result)
      });
      
      if (pr.simulated) {
        this.logger.info(`ℹ️ PR 创建已模拟（GitHub CLI/API 不可用）`);
        return;
      }
      
      this.logger.info(`✅ PR 创建成功: ${pr.url}`);
      
      // 保存 PR 信息到任务
      task.prUrl = pr.url;
      task.prNumber = pr.number;
      
      // 请求审查（如果 reviewer 可用）
      try {
        const review = await this.reviewer.review(pr.number);
        
        if (review.canAutoApprove && review.status === 'approved') {
          await this.prAutomator.merge({ number: pr.number });
          this.logger.info(`✅ PR 已自动合并`);
          task.prMerged = true;
        } else if (review.issues.length > 0) {
          // 生成修复任务
          await this.generateReviewFixTask(task, review);
        }
      } catch (reviewError) {
        this.logger.warn('自动审查失败:', reviewError);
      }
      
    } catch (error: any) {
      this.logger.error('PR 创建失败:', error.message);
      // PR 创建失败不中断流程
    }
  }

  private buildPRBody(task: any, result: any): string {
    const sections = [
      `## 🤖 Harness 自动生成的 PR`,
      '',
      `**任务:** ${task.title}`,
      `**任务 ID:** ${task.id}`,
      `**执行时间:** ${Math.round(result.duration / 1000)}s`,
      '',
      `### 📋 执行计划`,
      result.plan?.steps?.map((s: any, i: number) => 
        `${i + 1}. ${s.type}: ${s.description}`
      ).join('\n') || 'N/A',
      '',
      `### 📝 变更摘要`,
      result.summary || '完成代码生成和文件修改',
      '',
      `---`,
      `*由 Harness-Engineering 自动生成*`
    ];
    
    return sections.join('\n');
  }

  private async generateReviewFixTask(task: any, review: any): Promise<void> {
    const fixTask = {
      id: `task-${Date.now()}-review-fix`,
      title: `修复 PR #${task.prNumber} 的审查问题`,
      description: `根据自动审查结果修复代码问题。\n\n审查发现的问题:\n${review.issues.map((i: any) => `- [${i.severity}] ${i.message}`).join('\n')}`,
      requirements: review.suggestions,
      priority: 'high' as const,
      status: 'pending' as const,
      parentTask: task.id,
      prNumber: task.prNumber,
      maxDuration: 30 * 60 * 1000, // 30分钟
      createdAt: new Date()
    };
    
    await this.taskQueue.enqueue(fixTask);
    this.logger.info(`📥 生成审查修复任务: ${fixTask.title}`);
  }

  private async shouldEscalate(task: any, result: any): Promise<boolean> {
    // 如果错误涉及架构变更或复杂重构，需要升级
    const escalationKeywords = [
      'architecture',
      'breaking change',
      'database migration',
      'security',
      'auth'
    ];
    
    const errorMessage = (result.error || '').toLowerCase();
    return escalationKeywords.some(kw => errorMessage.includes(kw));
  }

  private async escalateTask(task: any, result: any): Promise<void> {
    this.stats.escalated++;
    this.recordAction(`task_escalated:${task.id}`);
    
    task.status = 'escalated';
    task.result = result;
    await this.taskQueue.update(task);
    
    this.logger.warn(`⚠️ 任务 ${task.id} 已升级，需要人工审查`);
    this.emit('taskEscalated', { task, result });
    
    // TODO: 发送通知（Slack/Email）
  }

  private async handleSafetyViolation(check: any): Promise<void> {
    switch (check.action) {
      case 'pause':
        this.logger.warn('⏸️  Loop 已暂停');
        await this.sleep(60000); // 暂停1分钟
        break;
        
      case 'stop':
        this.logger.error('🛑 安全问题严重，停止 Loop');
        this.isRunning = false;
        break;
        
      default:
        this.logger.warn('⚠️  未知安全操作:', check.action);
    }
  }

  private async handleLoopError(error: any): Promise<void> {
    this.logger.error('Loop 错误:', error);
    
    // 保存错误状态
    await this.stateManager.saveError({
      timestamp: new Date(),
      error: error.message || String(error),
      stack: error.stack
    });
    
    // 短暂休眠，避免快速重试
    await this.sleep(5000);
  }

  private shouldStop(maxDuration: number): boolean {
    return Date.now() - this.startTime > maxDuration;
  }

  private getContext(): any {
    return {
      startTime: this.startTime,
      currentTask: this.currentTask,
      stats: this.stats,
      queueSize: this.taskQueue.getPendingCount(),
      actionHistory: this.actionHistory,
      errors: this.stats.failed,
      totalAttempts: this.stats.completed + this.stats.failed + this.stats.escalated
    };
  }

  private recordAction(action: string): void {
    this.actionHistory.push(action);
    // 只保留最近 100 个动作
    if (this.actionHistory.length > 100) {
      this.actionHistory = this.actionHistory.slice(-100);
    }
  }

  private startCheckpointTimer(): void {
    setInterval(async () => {
      await this.saveCheckpoint();
    }, this.config.checkpoint.interval);
  }

  private async saveCheckpoint(): Promise<void> {
    const checkpoint = {
      timestamp: Date.now(),
      currentTask: this.currentTask,
      stats: this.stats,
      queueState: await this.taskQueue.getState(),
      hasGeneratedInitialTasks: this.hasGeneratedInitialTasks
    };
    
    await this.checkpointManager.save(checkpoint);
    this.logger.debug('💾 检查点已保存');
  }

  private async loadCheckpoint(): Promise<void> {
    const checkpoint = await this.checkpointManager.load();
    
    if (checkpoint) {
      this.logger.info('📂 加载检查点');
      
      if (checkpoint.stats) {
        this.stats = checkpoint.stats;
      }
      
      if (checkpoint.queueState) {
        await this.taskQueue.restoreState(checkpoint.queueState);
      }
      
      if (checkpoint.hasGeneratedInitialTasks) {
        this.hasGeneratedInitialTasks = checkpoint.hasGeneratedInitialTasks;
      }
    }
  }

  private async cleanup(): Promise<void> {
    await this.taskQueue.close();
    await this.stateManager.close();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isFatalError(error: any): boolean {
    const fatalPatterns = [
      'Out of memory',
      'Cannot find module',
      'EACCES',
      'EPERM'
    ];
    
    const errorMessage = error.message || String(error);
    return fatalPatterns.some(p => errorMessage.includes(p));
  }
}
