/**
 * Multi-Agent Pattern
 * 
 * Implements the multi-agent pattern overlay that adds agent-based
 * architecture components to the six-layer foundation.
 */

import * as path from 'path';
import { BasePatternApplier } from './PatternApplier';
import { Pattern, PatternApplication, PatternResult, FileModification, MultiAgentConfig, AgentDefinition } from './types';
import { BootstrapInput, PatternChoice } from '../bootstrap/types';

/**
 * Multi-Agent pattern implementation
 */
export class MultiAgentPattern extends BasePatternApplier {
  readonly pattern: Pattern = {
    name: 'multi-agent',
    version: '1.0.0',
    description: 'Adds multi-agent architecture components with orchestration and communication',
    appliesTo: ['service', 'runtime']
  };

  /**
   * Default agent definitions
   */
  private readonly defaultAgents: AgentDefinition[] = [
    {
      name: 'CoordinatorAgent',
      role: 'coordination',
      responsibilities: ['task-distribution', 'result-aggregation'],
      layer: 'service'
    },
    {
      name: 'WorkerAgent',
      role: 'execution',
      responsibilities: ['task-execution', 'status-reporting'],
      layer: 'runtime'
    }
  ];

  /**
   * Check if this pattern should be applied
   */
  canApply(input: { patterns?: PatternChoice[] | string[] }): boolean {
    if (!input.patterns) return false;
    return input.patterns.some(p => 
      typeof p === 'string' ? p === 'multi-agent' : p.name === 'multi-agent'
    );
  }

  /**
   * Apply the multi-agent pattern
   */
  async apply(application: PatternApplication): Promise<PatternResult> {
    const filesCreated: string[] = [];
    const modifications: FileModification[] = [];

    try {
      const config = this.getConfig(application);
      const srcDir = path.join(application.targetDir, 'src');

      // Create agent types
      await this.createAgentTypes(srcDir, filesCreated, modifications);

      // Create BaseAgent abstract class
      await this.createBaseAgent(srcDir, filesCreated, modifications);

      // Create orchestrator
      await this.createOrchestrator(srcDir, config, filesCreated, modifications);

      // Create message bus
      await this.createMessageBus(srcDir, config, filesCreated, modifications);

      // Create agent implementations
      await this.createAgentImplementations(srcDir, config, filesCreated, modifications);

      return this.createResult(
        this.pattern.name,
        true,
        filesCreated,
        modifications
      );
    } catch (error) {
      return this.createResult(
        this.pattern.name,
        false,
        filesCreated,
        modifications,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get configuration with defaults
   */
  private getConfig(application: PatternApplication): MultiAgentConfig {
    const config = application.config as MultiAgentConfig | undefined;
    return {
      agents: config?.agents ?? this.defaultAgents,
      orchestratorType: config?.orchestratorType ?? 'centralized',
      communicationProtocol: config?.communicationProtocol ?? 'message-bus'
    };
  }

  /**
   * Create agent type definitions
   */
  private async createAgentTypes(
    srcDir: string,
    filesCreated: string[],
    modifications: FileModification[]
  ): Promise<void> {
    const content = `/**
 * Agent Types
 * 
 * Type definitions for multi-agent system
 */

export interface AgentMessage {
  id: string;
  type: string;
  payload: unknown;
  sender: string;
  timestamp: number;
  priority?: 'low' | 'medium' | 'high';
}

export interface AgentContext {
  agentId: string;
  role: string;
  capabilities: string[];
  state: Record<string, unknown>;
}

export interface Task {
  id: string;
  type: string;
  data: unknown;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high';
  deadline?: number;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  data?: unknown;
  error?: string;
  completedAt: number;
}

export type AgentState = 'idle' | 'busy' | 'error' | 'shutdown';

export interface AgentStatus {
  agentId: string;
  state: AgentState;
  currentTask?: string;
  queueLength: number;
  lastHeartbeat: number;
}
`;

    const filePath = path.join(srcDir, 'agents', 'types.ts');
    await this.writeFile(filePath, content);
    filesCreated.push(filePath);
    this.addModification(modifications, filePath, 'create', 'Agent type definitions');
  }

  /**
   * Create BaseAgent abstract class
   */
  private async createBaseAgent(
    srcDir: string,
    filesCreated: string[],
    modifications: FileModification[]
  ): Promise<void> {
    const content = `/**
 * BaseAgent
 * 
 * Abstract base class for all agents in the multi-agent system.
 */

import { AgentMessage, AgentContext, Task, TaskResult, AgentStatus, AgentState } from './types';

export abstract class BaseAgent {
  protected context: AgentContext;
  protected state: AgentState = 'idle';
  protected messageQueue: AgentMessage[] = [];
  protected currentTask?: string;

  constructor(context: AgentContext) {
    this.context = context;
  }

  /**
   * Get agent identifier
   */
  get id(): string {
    return this.context.agentId;
  }

  /**
   * Get current agent state
   */
  get agentState(): AgentState {
    return this.state;
  }

  /**
   * Initialize the agent
   */
  abstract initialize(): Promise<void>;

  /**
   * Shutdown the agent gracefully
   */
  abstract shutdown(): Promise<void>;

  /**
   * Process an incoming message
   */
  abstract onMessage(message: AgentMessage): Promise<void>;

  /**
   * Execute a task
   */
  abstract executeTask(task: Task): Promise<TaskResult>;

  /**
   * Get current status
   */
  getStatus(): AgentStatus {
    return {
      agentId: this.context.agentId,
      state: this.state,
      currentTask: this.currentTask,
      queueLength: this.messageQueue.length,
      lastHeartbeat: Date.now()
    };
  }

  /**
   * Send a message to another agent
   */
  protected abstract sendMessage(to: string, message: Omit<AgentMessage, 'sender' | 'timestamp'>): Promise<void>;

  /**
   * Update agent state
   */
  protected setState(newState: AgentState): void {
    this.state = newState;
  }

  /**
   * Queue a message for processing
   */
  protected queueMessage(message: AgentMessage): void {
    this.messageQueue.push(message);
  }

  /**
   * Check if agent has a specific capability
   */
  hasCapability(capability: string): boolean {
    return this.context.capabilities.includes(capability);
  }
}
`;

    const filePath = path.join(srcDir, 'agents', 'BaseAgent.ts');
    await this.writeFile(filePath, content);
    filesCreated.push(filePath);
    this.addModification(modifications, filePath, 'create', 'BaseAgent abstract class');
  }

  /**
   * Create orchestrator based on configuration
   */
  private async createOrchestrator(
    srcDir: string,
    config: MultiAgentConfig,
    filesCreated: string[],
    modifications: FileModification[]
  ): Promise<void> {
    const content = `/**
 * Agent Orchestrator
 * 
 * Manages agent lifecycle, task distribution, and coordination.
 * Type: ${config.orchestratorType}
 */

import { BaseAgent } from './BaseAgent';
import { Task, TaskResult, AgentStatus } from './types';

export interface OrchestratorConfig {
  maxRetries: number;
  timeoutMs: number;
  loadBalancing: 'round-robin' | 'least-loaded' | 'capability-based';
}

export class AgentOrchestrator {
  private agents: Map<string, BaseAgent> = new Map();
  private config: OrchestratorConfig;
  private taskHistory: Map<string, TaskResult> = new Map();

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      timeoutMs: config.timeoutMs ?? 30000,
      loadBalancing: config.loadBalancing ?? 'least-loaded'
    };
  }

  /**
   * Register an agent with the orchestrator
   */
  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.id, agent);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  /**
   * Distribute a task to an appropriate agent
   */
  async distributeTask(task: Task): Promise<TaskResult> {
    const agent = this.selectAgent(task);
    if (!agent) {
      return {
        taskId: task.id,
        success: false,
        error: 'No suitable agent found',
        completedAt: Date.now()
      };
    }

    const result = await agent.executeTask(task);
    this.taskHistory.set(task.id, result);
    return result;
  }

  /**
   * Get status of all registered agents
   */
  getAllStatus(): AgentStatus[] {
    return Array.from(this.agents.values()).map(agent => agent.getStatus());
  }

  /**
   * Get specific agent by ID
   */
  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Broadcast a message to all agents
   */
  async broadcast(message: { type: string; payload: unknown }): Promise<void> {
    const promises = Array.from(this.agents.values()).map(async agent => {
      // Implementation would depend on message bus integration
    });
    await Promise.all(promises);
  }

  /**
   * Select the best agent for a task based on load balancing strategy
   */
  private selectAgent(task: Task): BaseAgent | undefined {
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => agent.agentState !== 'busy');

    if (availableAgents.length === 0) return undefined;

    switch (this.config.loadBalancing) {
      case 'round-robin':
        return availableAgents[0];
      case 'least-loaded':
        return availableAgents.reduce((best, current) => 
          current.getStatus().queueLength < best.getStatus().queueLength ? current : best
        );
      case 'capability-based':
        return availableAgents.find(agent => 
          // Would check task requirements against agent capabilities
          true
        ) ?? availableAgents[0];
      default:
        return availableAgents[0];
    }
  }

  /**
   * Shutdown all agents gracefully
   */
  async shutdownAll(): Promise<void> {
    const promises = Array.from(this.agents.values()).map(agent => agent.shutdown());
    await Promise.all(promises);
    this.agents.clear();
  }
}
`;

    const filePath = path.join(srcDir, 'agents', 'Orchestrator.ts');
    await this.writeFile(filePath, content);
    filesCreated.push(filePath);
    this.addModification(modifications, filePath, 'create', `Agent orchestrator (${config.orchestratorType})`);
  }

  /**
   * Create message bus based on configuration
   */
  private async createMessageBus(
    srcDir: string,
    config: MultiAgentConfig,
    filesCreated: string[],
    modifications: FileModification[]
  ): Promise<void> {
    const content = `/**
 * Message Bus
 * 
 * Inter-agent communication system.
 * Protocol: ${config.communicationProtocol}
 */

import { AgentMessage } from './types';

export type MessageHandler = (message: AgentMessage) => void | Promise<void>;

export class MessageBus {
  private subscribers: Map<string, Set<MessageHandler>> = new Map();
  private messageHistory: AgentMessage[] = [];
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 1000) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Subscribe to messages of a specific type
   */
  subscribe(messageType: string, handler: MessageHandler): () => void {
    if (!this.subscribers.has(messageType)) {
      this.subscribers.set(messageType, new Set());
    }
    this.subscribers.get(messageType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(messageType)?.delete(handler);
    };
  }

  /**
   * Publish a message to all subscribers
   */
  async publish(message: AgentMessage): Promise<void> {
    // Store in history
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }

    // Notify subscribers
    const handlers = this.subscribers.get(message.type) ?? new Set();
    const promises = Array.from(handlers).map(async handler => {
      try {
        await handler(message);
      } catch (error) {
        console.error(\`Message handler error: \${error}\`);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Send direct message to specific agent
   */
  async sendDirect(targetAgentId: string, message: AgentMessage): Promise<void> {
    // Would integrate with agent registry for direct delivery
    await this.publish({
      ...message,
      payload: {
        ...message.payload as object,
        targetAgentId
      }
    });
  }

  /**
   * Get message history
   */
  getHistory(limit?: number): AgentMessage[] {
    const history = this.messageHistory;
    return limit ? history.slice(-limit) : [...history];
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
  }
}
`;

    const filePath = path.join(srcDir, 'agents', 'MessageBus.ts');
    await this.writeFile(filePath, content);
    filesCreated.push(filePath);
    this.addModification(modifications, filePath, 'create', `Message bus (${config.communicationProtocol})`);
  }

  /**
   * Create agent implementations
   */
  private async createAgentImplementations(
    srcDir: string,
    config: MultiAgentConfig,
    filesCreated: string[],
    modifications: FileModification[]
  ): Promise<void> {
    // Create index file for agents module
    const indexContent = `/**
 * Agents Module
 * 
 * Multi-agent system components
 */

export { BaseAgent } from './BaseAgent';
export { AgentOrchestrator } from './Orchestrator';
export { MessageBus } from './MessageBus';
export * from './types';
${config.agents.map(agent => `export { ${agent.name} } from './${agent.name}';`).join('\n')}
`;

    const indexPath = path.join(srcDir, 'agents', 'index.ts');
    await this.writeFile(indexPath, indexContent);
    filesCreated.push(indexPath);
    this.addModification(modifications, indexPath, 'create', 'Agents module index');

    // Create each agent implementation
    for (const agentDef of config.agents) {
      const agentContent = this.generateAgentImplementation(agentDef);
      const agentPath = path.join(srcDir, 'agents', `${agentDef.name}.ts`);
      await this.writeFile(agentPath, agentContent);
      filesCreated.push(agentPath);
      this.addModification(modifications, agentPath, 'create', `${agentDef.name} implementation`);
    }
  }

  /**
   * Generate agent implementation code
   */
  private generateAgentImplementation(agentDef: AgentDefinition): string {
    return `/**
 * ${agentDef.name}
 * 
 * Role: ${agentDef.role}
 * Layer: ${agentDef.layer}
 * Responsibilities: ${agentDef.responsibilities.join(', ')}
 */

import { BaseAgent } from './BaseAgent';
import { AgentMessage, AgentContext, Task, TaskResult, AgentState } from './types';

export class ${agentDef.name} extends BaseAgent {
  constructor(context: Omit<AgentContext, 'capabilities'>) {
    super({
      ...context,
      capabilities: [${agentDef.responsibilities.map(r => `'${r}'`).join(', ')}]
    });
  }

  async initialize(): Promise<void> {
    this.setState('idle');
    console.log(\`${agentDef.name} \${this.id} initialized\`);
  }

  async shutdown(): Promise<void> {
    this.setState('shutdown');
    console.log(\`${agentDef.name} \${this.id} shutdown\`);
  }

  async onMessage(message: AgentMessage): Promise<void> {
    // Handle incoming messages based on type
    switch (message.type) {
      case 'task-assigned':
        // Handle task assignment
        break;
      case 'status-request':
        // Handle status request
        break;
      default:
        // Log unknown message type
        console.warn(\`Unknown message type: \${message.type}\`);
    }
  }

  async executeTask(task: Task): Promise<TaskResult> {
    this.setState('busy');
    this.currentTask = task.id;

    try {
      // Task execution logic specific to ${agentDef.role}
      const result = await this.processTask(task);
      
      this.setState('idle');
      this.currentTask = undefined;

      return {
        taskId: task.id,
        success: true,
        data: result,
        completedAt: Date.now()
      };
    } catch (error) {
      this.setState('error');
      this.currentTask = undefined;

      return {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        completedAt: Date.now()
      };
    }
  }

  protected async sendMessage(
    to: string, 
    message: Omit<AgentMessage, 'sender' | 'timestamp'>
  ): Promise<void> {
    // Implementation would integrate with MessageBus
    console.log(\`Sending message to \${to}\`);
  }

  private async processTask(task: Task): Promise<unknown> {
    // Task-specific processing logic
    console.log(\`Processing task: \${task.id} of type \${task.type}\`);
    return { status: 'completed', taskId: task.id };
  }
}
`;
  }
}
