"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoopController = void 0;
const events_1 = require("events");
const TaskQueue_1 = require("./TaskQueue");
const TaskExecutor_1 = require("./TaskExecutor");
const ReviewAgent_1 = require("./ReviewAgent");
const PRAutomator_1 = require("./PRAutomator");
const StateManager_1 = require("./StateManager");
const SafetyGuard_1 = require("./SafetyGuard");
const Logger_1 = require("../utils/Logger");
const CheckpointManager_1 = require("./CheckpointManager");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const DesignPhase_1 = require("./DesignPhase");
const PRWorkflow_1 = require("./PRWorkflow");
const ResilientLoop_1 = require("./ResilientLoop");
const AutoEvolution_1 = require("../evolution/AutoEvolution");
const HarnessGraph_1 = require("../orchestration/graph/HarnessGraph");
const telemetry_1 = require("../telemetry");
const collectors_1 = require("../telemetry/collectors");
class LoopController extends events_1.EventEmitter {
    constructor(config, options) {
        super();
        this.isRunning = false;
        this.startTime = 0;
        this.currentTask = null;
        this.stats = {
            completed: 0,
            failed: 0,
            escalated: 0
        };
        this.sessionStats = {
            completed: 0,
            failed: 0,
            escalated: 0,
            startTime: Date.now()
        };
        this.actionHistory = [];
        this.hasGeneratedInitialTasks = false;
        // Health monitoring for unattended mode
        this.healthStats = {
            consecutiveErrors: 0,
            recentTasks: [],
            lastSuccessTime: Date.now(),
            isPaused: false
        };
        this.config = config;
        this.logger = new Logger_1.Logger();
        // 确定工作目录
        const workingDir = config.projectPath || process.cwd();
        this.logger.info(`📁 Working directory: ${workingDir}`);
        this.taskQueue = new TaskQueue_1.TaskQueue();
        this.executor = new TaskExecutor_1.TaskExecutor(config.llm, workingDir);
        this.reviewer = new ReviewAgent_1.ReviewAgent(config.llm);
        this.prAutomator = new PRAutomator_1.PRAutomator();
        this.stateManager = new StateManager_1.StateManager();
        this.safetyGuard = new SafetyGuard_1.SafetyGuard(config.safety);
        this.checkpointManager = new CheckpointManager_1.CheckpointManager();
        // Initialize Superpowers components
        this.enableSuperpowers = config.superpowers?.enabled ?? true;
        const skillsPath = config.superpowers?.skillsPath;
        this.designPhase = new DesignPhase_1.DesignPhase(true, skillsPath);
        this.prWorkflow = new PRWorkflow_1.PRWorkflow();
        this.errorHandler = new ResilientLoop_1.ResilientErrorHandler(3);
        // Initialize auto-evolution
        this.evolutionConfig = config.evolution || {
            enabled: true,
            checkInterval: 300000,
            maxOpportunitiesPerAnalysis: 5,
            minImpactThreshold: 5,
            categories: {
                technical: true,
                business: true,
                ux: true
            }
        };
        this.autoEvolution = new AutoEvolution_1.AutoEvolution(this.evolutionConfig, this.taskQueue, workingDir);
        // Initialize session stats
        this.sessionStats = {
            completed: 0,
            failed: 0,
            escalated: 0,
            startTime: Date.now()
        };
        // Initialize telemetry (use provided or create default)
        this.telemetry = options?.telemetry || new telemetry_1.FileAdapter({
            outputDir: path.join(workingDir, '.harness', 'telemetry'),
            maxFileSizeMB: 10,
            retentionDays: 7
        });
        this.loopMetrics = new collectors_1.LoopMetricsCollector(this.telemetry);
        // Initialize LangGraph
        this.useLangGraph = config.orchestration !== undefined;
        if (this.useLangGraph) {
            this.initializeLangGraph();
        }
        // 进程异常处理 - 无人值守模式
        this.setupProcessHandlers();
    }
    setupProcessHandlers() {
        // 未捕获的异常
        process.on('uncaughtException', (error) => {
            this.logger.error('💥 Uncaught Exception:', error);
            this.gracefulShutdown();
        });
        // 未处理的 Promise 拒绝
        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
        });
        // SIGTERM 信号处理
        process.on('SIGTERM', () => {
            this.logger.info('📥 Received SIGTERM, shutting down gracefully...');
            this.gracefulShutdown();
        });
        // SIGINT 信号处理 (Ctrl+C)
        process.on('SIGINT', () => {
            this.logger.info('📥 Received SIGINT, shutting down gracefully...');
            this.gracefulShutdown();
        });
    }
    async gracefulShutdown() {
        this.isRunning = false;
        // 保存检查点
        if (this.config.checkpoint?.enabled) {
            await this.saveCheckpoint();
        }
        // 停止开发服务器
        await this.executor.stopDevServer?.();
        this.logger.info('👋 Graceful shutdown complete');
        process.exit(0);
    }
    // Health monitoring methods for unattended mode
    async checkHealth() {
        const config = this.config.unattended;
        if (!config?.enabled)
            return true;
        // 检查连续错误数
        if (this.healthStats.consecutiveErrors >= (config.maxConsecutiveErrors || 5)) {
            this.logger.warn(`⚠️ 连续错误数过高 (${this.healthStats.consecutiveErrors})，暂停运行`);
            this.healthStats.isPaused = true;
            return false;
        }
        // 计算错误率
        const recentWindow = 10; // 最近10个任务
        const recentTasks = this.healthStats.recentTasks.slice(-recentWindow);
        const failedCount = recentTasks.filter(t => t.status === 'failed').length;
        const errorRate = recentTasks.length > 0 ? failedCount / recentWindow : 0;
        if (config.pauseOnHighErrorRate && errorRate > (config.errorRateThreshold || 0.5)) {
            this.logger.warn(`⚠️ 错误率过高 (${(errorRate * 100).toFixed(1)}%)，暂停运行`);
            this.healthStats.isPaused = true;
            return false;
        }
        return true;
    }
    recordTaskStatus(status) {
        this.healthStats.recentTasks.push({
            status,
            timestamp: Date.now()
        });
        // 只保留最近100条记录
        if (this.healthStats.recentTasks.length > 100) {
            this.healthStats.recentTasks.shift();
        }
        if (status === 'success') {
            this.healthStats.consecutiveErrors = 0;
            this.healthStats.lastSuccessTime = Date.now();
        }
        else if (status === 'failed') {
            this.healthStats.consecutiveErrors++;
        }
    }
    async waitForResume() {
        const config = this.config.unattended;
        if (!config?.autoResume)
            return;
        const delay = config.resumeDelay || 300000; // 默认5分钟
        this.logger.info(`⏸️ 将在 ${delay / 60000} 分钟后尝试恢复...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        this.healthStats.isPaused = false;
        this.healthStats.consecutiveErrors = 0;
        this.logger.info('▶️ 恢复运行');
    }
    initializeLangGraph() {
        const orchestrationConfig = this.config.orchestration || {
            enableHumanReview: false,
            enableParallelExecution: false,
            enableABTesting: false,
            maxParallelAgents: 3,
            reviewTimeoutMs: 300000
        };
        this.harnessGraph = new HarnessGraph_1.HarnessGraph(orchestrationConfig, {
            llmConfig: this.config.llm,
            workingDir: this.config.projectPath || process.cwd()
        });
    }
    async getArchitectureDiagram() {
        if (!this.useLangGraph || !this.harnessGraph) {
            return this.getLegacyArchitectureDescription();
        }
        return this.harnessGraph.getMermaidDiagram();
    }
    async saveArchitectureDiagram(outputPath) {
        const diagram = await this.getArchitectureDiagram();
        await fs.writeFile(outputPath, diagram, 'utf-8');
    }
    getLegacyArchitectureDescription() {
        return `graph TD
    Start[Start] --> TaskQueue[Task Queue]
    TaskQueue --> Executor[Task Executor]
    Executor --> Review[Review Agent]
    Review --> PR[PR Automator]
    PR --> End[End]`;
    }
    async start(options) {
        this.isRunning = true;
        this.startTime = Date.now();
        this.logger.info('🚀 Loop 控制器已启动');
        this.logger.info(`⏱️  最大运行时长: ${options.maxDuration / (1000 * 60 * 60)}小时`);
        this.logger.info(`🧪 模拟模式: ${options.dryRun ? '是' : '否'}`);
        if (this.config.unattended?.enabled) {
            this.logger.info('🤖 无人值守模式: 已启用');
            this.logger.info(`   最大连续错误数: ${this.config.unattended.maxConsecutiveErrors || 5}`);
            this.logger.info(`   自动恢复: ${this.config.unattended.autoResume ? '是' : '否'}`);
        }
        // 加载之前的检查点（如果有）
        await this.loadCheckpoint();
        // 启动检查点定时器
        if (this.config.checkpoint.enabled) {
            this.startCheckpointTimer();
        }
        // 主循环
        while (this.isRunning) {
            let taskStartTime = 0;
            try {
                // 检查是否超过最大运行时间
                if (this.shouldStop(options.maxDuration)) {
                    this.logger.info('⏰ 达到最大运行时长，停止 Loop');
                    break;
                }
                // 健康检查（无人值守模式）
                const isHealthy = await this.checkHealth();
                if (!isHealthy) {
                    await this.waitForResume();
                    continue;
                }
                // 如果处于暂停状态，等待恢复
                if (this.healthStats.isPaused) {
                    await this.sleep(5000);
                    continue;
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
                    // Auto-evolution: when queue is empty and initial tasks done
                    if (this.evolutionConfig.enabled) {
                        const evolved = await this.autoEvolution.trigger('queue_empty', this.config.projectPath || process.cwd(), this.businessContext);
                        if (evolved) {
                            continue;
                        }
                    }
                    this.logger.info('✨ 所有任务完成，队列为空，等待新任务...');
                    await this.sleep(5000);
                    continue;
                }
                this.logger.info(`📋 开始执行任务: ${this.currentTask.title}`);
                this.recordAction(`task_start:${this.currentTask.id}`);
                // Record telemetry before task execution
                taskStartTime = Date.now();
                const pendingCount = await this.taskQueue.getPendingCount();
                this.safeTelemetry(() => {
                    this.loopMetrics.recordTaskStart(this.currentTask.type || 'unknown', this.currentTask.id);
                    this.loopMetrics.recordQueueDepth(pendingCount);
                });
                this.currentTaskSpan = this.loopMetrics.startTaskSpan(this.currentTask.type || 'unknown', this.currentTask.title);
                // 执行任务
                const result = await this.executeTask(this.currentTask, options);
                // Record telemetry after task execution
                const duration = Date.now() - taskStartTime;
                this.safeTelemetry(() => {
                    this.loopMetrics.recordTaskComplete(this.currentTask.type || 'unknown', this.currentTask.id, duration, result.status === 'success');
                });
                if (this.currentTaskSpan) {
                    this.safeTelemetry(() => {
                        this.telemetry.addSpanEvent(this.currentTaskSpan, 'task.completed', {
                            status: result.status,
                            duration,
                            hasChanges: result.hasChanges
                        });
                        this.telemetry.endSpan(this.currentTaskSpan, result.status === 'success' ? 'ok' : 'error');
                    });
                    this.currentTaskSpan = undefined;
                }
                // 处理结果
                await this.processResult(this.currentTask, result);
                // 记录任务状态（无人值守模式）
                this.recordTaskStatus(result.status);
                // Periodic auto-evolution check
                if (this.stats.completed > 0 && this.stats.completed % 5 === 0) {
                    await this.autoEvolution.trigger('periodic_check', this.config.projectPath || process.cwd(), this.businessContext);
                }
            }
            catch (error) {
                this.logger.error('Loop 执行错误:', error);
                this.recordAction(`error:${error.message}`);
                // 记录失败状态（无人值守模式）
                this.recordTaskStatus('failed');
                // Record failure telemetry
                const duration = Date.now() - taskStartTime;
                this.safeTelemetry(() => {
                    this.loopMetrics.recordTaskComplete(this.currentTask?.type || 'unknown', this.currentTask?.id || 'unknown', duration, false);
                });
                if (this.currentTaskSpan) {
                    this.safeTelemetry(() => {
                        this.telemetry.endSpan(this.currentTaskSpan, 'error');
                    });
                    this.currentTaskSpan = undefined;
                }
                await this.handleLoopError(error);
            }
        }
        this.logger.info('🏁 Loop stopped');
        this.logger.info(`📊 Session stats: completed=${this.sessionStats.completed}, failed=${this.sessionStats.failed}`);
        this.logger.info(`📊 Lifetime stats: completed=${this.stats.completed}, failed=${this.stats.failed}, escalated=${this.stats.escalated}`);
    }
    async stop() {
        this.logger.info('🛑 正在停止 Loop...');
        this.isRunning = false;
        // 保存最终检查点
        await this.saveCheckpoint();
        // 清理资源
        await this.cleanup();
        // Flush telemetry before exit
        await this.telemetry.flush();
        await this.telemetry.close();
        this.emit('stopped', { timestamp: Date.now() });
    }
    async getStatus() {
        return {
            loopStatus: this.isRunning ? 'running' : 'stopped',
            activeTasks: this.currentTask ? 1 : 0,
            pendingTasks: await this.taskQueue.getPendingCount(),
            sessionStats: this.sessionStats,
            lifetimeStats: this.stats,
            uptime: Date.now() - this.startTime
        };
    }
    async generateTasksFromProject() {
        try {
            // 读取 AGENTS.md
            const agentsMd = await this.readAgentsMd();
            // 读取开发计划
            const plans = await this.findDevelopmentPlans();
            // 分析代码现状
            const codeStatus = await this.analyzeCodebase();
            let tasks = [];
            if (plans.length === 0) {
                this.logger.warn('⚠️ 未找到开发计划，基于代码现状生成默认任务');
                // 基于代码现状生成默认任务
                tasks = this.createTasksFromCodeStatus(codeStatus);
            }
            else {
                // 根据计划和现状生成任务
                tasks = this.createTasksFromPlans(plans, codeStatus);
            }
            // 加入队列
            for (const task of tasks) {
                await this.taskQueue.enqueue(task);
                this.logger.info(`📥 生成任务: ${task.title}`);
            }
            this.logger.info(`✅ 已生成 ${tasks.length} 个初始任务`);
        }
        catch (error) {
            this.logger.error('生成任务失败:', error.message);
        }
    }
    createTasksFromCodeStatus(codeStatus) {
        const tasks = [];
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
                priority: 'high',
                status: 'pending',
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
                priority: 'high',
                status: 'pending',
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
                priority: 'medium',
                status: 'pending',
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
                priority: 'high',
                status: 'pending',
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
                priority: 'medium',
                status: 'pending',
                maxDuration: 2 * 60 * 60 * 1000,
                createdAt: now
            });
        }
        return tasks;
    }
    async readAgentsMd() {
        try {
            return await fs.readFile('AGENTS.md', 'utf-8');
        }
        catch {
            return '';
        }
    }
    async findDevelopmentPlans() {
        const plansDir = 'docs/superpowers/plans';
        const plans = [];
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
        }
        catch {
            // 目录不存在
        }
        return plans;
    }
    extractTasksFromPlan(content) {
        const tasks = [];
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
    async analyzeCodebase() {
        const status = {
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
        }
        catch {
            // 目录不存在
        }
        if (!status.hasPickerAgent)
            status.missingComponents.push('PickerAgent');
        if (!status.hasDesignerAgent)
            status.missingComponents.push('DesignerAgent');
        if (!status.hasMarketerAgent)
            status.missingComponents.push('MarketerAgent');
        if (!status.hasOrchestrator)
            status.missingComponents.push('Orchestrator');
        return status;
    }
    createTasksFromPlans(plans, codeStatus) {
        const tasks = [];
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
                priority: 'high',
                status: 'pending',
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
                priority: 'high',
                status: 'pending',
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
                priority: 'medium',
                status: 'pending',
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
                priority: 'high',
                status: 'pending',
                maxDuration: 2 * 60 * 60 * 1000,
                createdAt: now
            });
        }
        return tasks;
    }
    async executeTask(task, options) {
        const startTime = Date.now();
        const maxTaskDuration = task.maxDuration || 600000; // 默认10分钟
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
        // 创建超时 Promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Task timeout after ${maxTaskDuration}ms`));
            }, maxTaskDuration);
        });
        try {
            // 更新任务状态
            task.status = 'running';
            task.startedAt = new Date();
            await this.taskQueue.update(task);
            // 执行任务与超时竞争
            const result = await Promise.race([
                this.executor.execute(task, {
                    dryRun: options.dryRun,
                    onProgress: (progress) => {
                        this.emit('taskProgress', { task, progress });
                    }
                }),
                timeoutPromise
            ]);
            // 计算执行时间
            const duration = Date.now() - startTime;
            return {
                ...result,
                duration,
                completedAt: new Date()
            };
        }
        catch (error) {
            if (error.message?.includes('timeout')) {
                this.logger.error(`⏱️ 任务超时: ${task.title}`);
                return {
                    status: 'failed',
                    error: `Task timeout after ${maxTaskDuration}ms`,
                    duration: Date.now() - startTime
                };
            }
            return {
                status: 'failed',
                error: error.message || String(error),
                duration: Date.now() - startTime
            };
        }
    }
    async processResult(task, result) {
        this.logger.info(`✅ 任务执行完成: ${task.title}`);
        this.logger.info(`   状态: ${result.status}`);
        this.logger.info(`   耗时: ${result.duration}ms`);
        if (result.status === 'success') {
            // Update both stats
            this.stats.completed++;
            this.sessionStats.completed++;
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
        }
        else if (result.status === 'failed') {
            // 分类处理错误
            const errorType = this.classifyError(result.error);
            switch (errorType) {
                case 'transient':
                    // 临时错误：网络超时等，直接重试
                    await this.handleTransientError(task, result);
                    break;
                case 'file_not_found':
                    // 文件不存在：创建缺失文件后重试
                    await this.handleFileNotFoundError(task, result);
                    break;
                case 'dependency_missing':
                    // 依赖缺失：安装依赖后重试
                    await this.handleDependencyError(task, result);
                    break;
                case 'permanent':
                default:
                    // 永久错误：使用错误处理器创建修复任务
                    await this.handlePermanentError(task, result);
                    break;
            }
        }
    }
    classifyError(error) {
        if (!error)
            return 'unknown';
        const errorLower = error.toLowerCase();
        // 临时错误
        if (errorLower.includes('timeout') ||
            errorLower.includes('econnreset') ||
            errorLower.includes('aborted') ||
            errorLower.includes('network')) {
            return 'transient';
        }
        // 文件不存在
        if (errorLower.includes('enoent') ||
            errorLower.includes('no such file')) {
            return 'file_not_found';
        }
        // 依赖缺失
        if (errorLower.includes('cannot find module') ||
            errorLower.includes('module not found')) {
            return 'dependency_missing';
        }
        return 'permanent';
    }
    async handleTransientError(task, result) {
        this.logger.info(`🔄 临时错误，准备重试: ${result.error}`);
        // 延迟 5 秒后重试同一任务
        await new Promise(resolve => setTimeout(resolve, 5000));
        task.retryCount = (task.retryCount || 0) + 1;
        task.status = 'pending';
        await this.taskQueue.enqueue(task);
        this.logger.info(`🔄 Task ${task.id} queued for retry (attempt ${task.retryCount})`);
    }
    async handleFileNotFoundError(task, result) {
        this.logger.info(`📁 文件不存在错误，创建缺失文件后重试`);
        // 提取文件路径并创建空文件
        const fileMatch = result.error.match(/open '(.+?)'/);
        if (fileMatch) {
            const filePath = fileMatch[1];
            await this.createEmptyFile(filePath);
            // 重试任务
            task.status = 'pending';
            await this.taskQueue.enqueue(task);
            this.logger.info(`🔄 Task ${task.id} queued for retry after creating missing file`);
        }
        else {
            // 无法提取路径，按永久错误处理
            await this.handlePermanentError(task, result);
        }
    }
    async handleDependencyError(task, result) {
        this.logger.info(`📦 依赖缺失错误，尝试安装依赖后重试`);
        // 提取模块名称
        const moduleMatch = result.error.match(/['"](.+?)['"]/);
        if (moduleMatch) {
            const moduleName = moduleMatch[1];
            try {
                const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
                execSync(`npm install ${moduleName}`, { cwd: process.cwd(), stdio: 'pipe' });
                this.logger.info(`✅ 安装依赖成功: ${moduleName}`);
                // 重试任务
                task.status = 'pending';
                await this.taskQueue.enqueue(task);
                this.logger.info(`🔄 Task ${task.id} queued for retry after installing dependency`);
            }
            catch (installError) {
                this.logger.error(`❌ 安装依赖失败: ${installError.message}`);
                // 安装失败，按永久错误处理
                await this.handlePermanentError(task, result);
            }
        }
        else {
            // 无法提取模块名，按永久错误处理
            await this.handlePermanentError(task, result);
        }
    }
    async handlePermanentError(task, result) {
        // Use resilient error handler instead of immediate failure
        const errorResult = await this.errorHandler.handleFailure(task, new Error(result.error), task.retryCount || 0);
        if (errorResult.shouldRetry) {
            // Retry the task
            task.retryCount = (task.retryCount || 0) + 1;
            task.status = 'pending';
            await this.taskQueue.enqueue(task);
            this.logger.info(`🔄 Task ${task.id} queued for retry (attempt ${task.retryCount})`);
        }
        else if (errorResult.fixTaskId) {
            // Fix task created, mark current as failed
            // Update both stats
            this.stats.failed++;
            this.sessionStats.failed++;
            this.recordAction(`task_failed:${task.id}`);
            task.status = 'failed';
            task.result = result;
            task.fixTaskId = errorResult.fixTaskId;
            await this.taskQueue.update(task);
            this.logger.info(`📥 Fix task ${errorResult.fixTaskId} created for failed task`);
        }
    }
    async createEmptyFile(filePath) {
        try {
            // 确保目录存在
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            // 创建空文件（带基本模板）
            const ext = path.extname(filePath);
            let content = '';
            if (ext === '.ts') {
                content = '// Auto-generated file\nexport {};\n';
            }
            else if (ext === '.tsx') {
                content = '// Auto-generated file\nexport default function Component() {\n  return null;\n}\n';
            }
            await fs.writeFile(filePath, content, 'utf-8');
            this.logger.info(`✅ 创建缺失文件: ${filePath}`);
        }
        catch (error) {
            this.logger.error(`❌ 创建文件失败: ${error.message}`);
        }
    }
    async generateFollowUpTasks(completedTask, result) {
        // 根据完成的任务生成后续任务
        const followUpTasks = [];
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
                priority: 'medium',
                status: 'pending',
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
    async generateFixTask(failedTask, result) {
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
            priority: 'high',
            status: 'pending',
            parentTask: failedTask.id,
            maxDuration: failedTask.maxDuration,
            createdAt: new Date()
        };
        await this.taskQueue.enqueue(fixTask);
        this.logger.info(`📥 生成修复任务: ${fixTask.title}`);
    }
    async createPR(task, result) {
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
                }
                else if (review.issues.length > 0) {
                    // 生成修复任务
                    await this.generateReviewFixTask(task, review);
                }
            }
            catch (reviewError) {
                this.logger.warn('自动审查失败:', reviewError);
            }
        }
        catch (error) {
            this.logger.error('PR 创建失败:', error.message);
            // PR 创建失败不中断流程
        }
    }
    buildPRBody(task, result) {
        const sections = [
            `## 🤖 Harness 自动生成的 PR`,
            '',
            `**任务:** ${task.title}`,
            `**任务 ID:** ${task.id}`,
            `**执行时间:** ${Math.round(result.duration / 1000)}s`,
            '',
            `### 📋 执行计划`,
            result.plan?.steps?.map((s, i) => `${i + 1}. ${s.type}: ${s.description}`).join('\n') || 'N/A',
            '',
            `### 📝 变更摘要`,
            result.summary || '完成代码生成和文件修改',
            '',
            `---`,
            `*由 Harness-Engineering 自动生成*`
        ];
        return sections.join('\n');
    }
    async generateReviewFixTask(task, review) {
        const fixTask = {
            id: `task-${Date.now()}-review-fix`,
            title: `修复 PR #${task.prNumber} 的审查问题`,
            description: `根据自动审查结果修复代码问题。\n\n审查发现的问题:\n${review.issues.map((i) => `- [${i.severity}] ${i.message}`).join('\n')}`,
            requirements: review.suggestions,
            priority: 'high',
            status: 'pending',
            parentTask: task.id,
            prNumber: task.prNumber,
            maxDuration: 30 * 60 * 1000, // 30分钟
            createdAt: new Date()
        };
        await this.taskQueue.enqueue(fixTask);
        this.logger.info(`📥 生成审查修复任务: ${fixTask.title}`);
    }
    async shouldEscalate(task, result) {
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
    async escalateTask(task, result) {
        // Update both stats
        this.stats.escalated++;
        this.sessionStats.escalated++;
        this.recordAction(`task_escalated:${task.id}`);
        task.status = 'escalated';
        task.result = result;
        await this.taskQueue.update(task);
        this.logger.warn(`⚠️ 任务 ${task.id} 已升级，需要人工审查`);
        this.emit('taskEscalated', { task, result });
        // TODO: 发送通知（Slack/Email）
    }
    async handleSafetyViolation(check) {
        // Record safety check telemetry
        this.safeTelemetry(() => {
            this.loopMetrics.recordSafetyCheckTriggered(check.reason || 'unknown');
            this.telemetry.log('warn', `Safety check triggered: ${check.reason}`, {
                action: check.action,
                taskId: this.currentTask?.id
            });
        });
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
    async handleLoopError(error) {
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
    shouldStop(maxDuration) {
        return Date.now() - this.startTime > maxDuration;
    }
    getContext() {
        return {
            startTime: this.startTime,
            currentTask: this.currentTask,
            stats: this.stats,
            sessionStats: this.sessionStats, // Add this line
            queueSize: this.taskQueue.getPendingCount(),
            actionHistory: this.actionHistory,
            errors: this.stats.failed,
            totalAttempts: this.stats.completed + this.stats.failed + this.stats.escalated
        };
    }
    recordAction(action) {
        this.actionHistory.push(action);
        // 只保留最近 100 个动作
        if (this.actionHistory.length > 100) {
            this.actionHistory = this.actionHistory.slice(-100);
        }
    }
    startCheckpointTimer() {
        setInterval(async () => {
            await this.saveCheckpoint();
        }, this.config.checkpoint.interval);
    }
    async saveCheckpoint() {
        const checkpoint = {
            timestamp: Date.now(),
            currentTask: this.currentTask,
            stats: this.stats,
            sessionStats: this.sessionStats,
            queueState: await this.taskQueue.getState(),
            hasGeneratedInitialTasks: this.hasGeneratedInitialTasks
        };
        await this.checkpointManager.save(checkpoint);
        this.logger.debug('💾 Checkpoint saved');
    }
    async loadCheckpoint() {
        const checkpoint = await this.checkpointManager.load();
        if (checkpoint) {
            this.logger.info('📂 Loading checkpoint');
            // Load historical stats (never reset)
            if (checkpoint.stats) {
                this.stats = checkpoint.stats;
                this.logger.info(`📊 Historical stats: completed=${this.stats.completed}, failed=${this.stats.failed}`);
            }
            // Reset session stats for new session
            this.sessionStats = {
                completed: 0,
                failed: 0,
                escalated: 0,
                startTime: Date.now()
            };
            this.logger.info('🔄 Session stats reset for new session');
            if (checkpoint.queueState) {
                await this.taskQueue.restoreState(checkpoint.queueState);
            }
            if (checkpoint.hasGeneratedInitialTasks) {
                this.hasGeneratedInitialTasks = checkpoint.hasGeneratedInitialTasks;
            }
        }
    }
    async cleanup() {
        await this.taskQueue.close();
        await this.stateManager.close();
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Safely execute telemetry call without affecting main flow.
     */
    safeTelemetry(fn) {
        try {
            fn();
        }
        catch (error) {
            // Telemetry failures should not affect main execution
            this.logger.debug('Telemetry error (non-critical):', error);
        }
    }
    isFatalError(error) {
        const fatalPatterns = [
            'Out of memory',
            'Cannot find module',
            'EACCES',
            'EPERM'
        ];
        const errorMessage = error.message || String(error);
        return fatalPatterns.some(p => errorMessage.includes(p));
    }
    /**
     * Set business context for evolution analysis
     */
    setBusinessContext(context) {
        this.businessContext = context;
        this.logger.info(`💼 Business context set: ${context.domain}`);
    }
}
exports.LoopController = LoopController;
//# sourceMappingURL=LoopController.js.map