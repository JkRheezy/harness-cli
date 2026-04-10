import { SmartInitOptions, BusinessAnalysis } from '../../commands/types';
import {
  WorkerOutput,
  SynthesisResult,
  CoordinatorConfig,
  LLMCaller,
  VerificationResult,
} from './types';
import { BusinessWorker, TechWorker, DomainWorker, RiskWorker } from './workers';
import { Synthesizer } from './Synthesizer';
import { OutputGenerator } from './OutputGenerator';
import { Verifier } from './Verifier';

/**
 * 默认协调器配置
 */
const DEFAULT_CONFIG: CoordinatorConfig = {
  maxRetries: 3,
  minConfidence: 0.8,
  timeout: 300000, // 5分钟超时
  models: {
    research: 'claude-3-5-sonnet',
    synthesis: 'claude-3-5-sonnet',
    implementation: 'claude-3-5-sonnet',
    verification: 'claude-3-5-sonnet',
  },
};

/**
 * 分析协调器 - 编排 4 阶段分析工作流
 * 
 * 4 阶段工作流：
 * 1. Research Phase: 并行执行 4 个 Worker 进行多维度分析
 * 2. Synthesis Phase: 综合所有 Worker 输出，形成统一理解
 * 3. Implementation Phase: 生成 BusinessAnalysis 输出
 * 4. Verification Phase: 验证输出质量，必要时重新生成
 */
export class AnalysisCoordinator {
  private config: CoordinatorConfig;
  private synthesizer: Synthesizer;
  private outputGenerator: OutputGenerator;
  private verifier: Verifier;

  constructor(private llmCaller: LLMCaller, config?: Partial<CoordinatorConfig>) {
    // 合并默认配置和传入配置
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      models: {
        ...DEFAULT_CONFIG.models,
        ...config?.models,
      },
    };

    // 初始化各个组件
    this.synthesizer = new Synthesizer(this.llmCaller, this.config.models.synthesis);
    this.outputGenerator = new OutputGenerator(this.llmCaller, this.config.models.implementation);
    this.verifier = new Verifier();
  }

  /**
   * 执行完整的 4 阶段分析工作流
   * 
   * @param options - 智能初始化选项
   * @returns 业务分析结果
   * @throws 如果所有重试都失败
   */
  async execute(options: SmartInitOptions): Promise<BusinessAnalysis> {
    console.log('🚀 启动 4 阶段分析工作流...');
    console.log(`   项目: ${options.projectName}`);
    console.log(`   模板: ${options.template}`);

    // 阶段 1: Research - 并行执行 4 个 Workers
    console.log('\n📊 阶段 1: 并行分析 (4 Workers)');
    const workerOutputs = await this.executeResearchPhase(options);
    this.logWorkerResults(workerOutputs);

    // 阶段 2: Synthesis - 综合所有 Worker 输出
    console.log('\n🔄 阶段 2: 综合各维度分析结果');
    const synthesis = await this.synthesizer.synthesize(workerOutputs);
    this.logSynthesisResult(synthesis);

    // 检查综合结果的置信度
    if (synthesis.confidence < 0.5) {
      console.warn(`⚠️ 综合置信度较低 (${synthesis.confidence})，但仍将继续`);
    }

    // 阶段 3 & 4: Implementation + Verification
    console.log('\n📝 阶段 3 & 4: 生成并验证输出');
    const analysis = await this.generateAndVerify(synthesis, options);

    console.log('\n✅ 分析工作流完成！');
    return analysis;
  }

  /**
   * 阶段 1: 并行执行所有 Workers
   * 
   * 同时启动 4 个 Worker，分别从不同维度分析项目：
   * - BusinessWorker: 业务需求分析
   * - TechWorker: 技术栈分析
   * - DomainWorker: 领域知识分析
   * - RiskWorker: 风险分析
   * 
   * @param options - 智能初始化选项
   * @returns 所有 Worker 的输出结果数组
   */
  private async executeResearchPhase(options: SmartInitOptions): Promise<WorkerOutput[]> {
    // 创建 4 个 Worker 实例
    const businessWorker = new BusinessWorker(this.llmCaller, this.config.models.research);
    const techWorker = new TechWorker(this.llmCaller, this.config.models.research);
    const domainWorker = new DomainWorker(this.llmCaller, this.config.models.research);
    const riskWorker = new RiskWorker(this.llmCaller, this.config.models.research);

    // 使用 Promise.all 并行执行所有 Worker
    const workerPromises = [
      this.executeWorkerWithTimeout(businessWorker, options, '业务分析'),
      this.executeWorkerWithTimeout(techWorker, options, '技术分析'),
      this.executeWorkerWithTimeout(domainWorker, options, '领域分析'),
      this.executeWorkerWithTimeout(riskWorker, options, '风险分析'),
    ];

    // 等待所有 Worker 完成
    const results = await Promise.all(workerPromises);

    return results;
  }

  /**
   * 执行单个 Worker 并添加超时控制
   * 
   * @param worker - Worker 实例
   * @param options - 智能初始化选项
   * @param workerName - Worker 名称（用于日志）
   * @returns Worker 输出结果
   */
  private async executeWorkerWithTimeout(
    worker: BusinessWorker | TechWorker | DomainWorker | RiskWorker,
    options: SmartInitOptions,
    workerName: string
  ): Promise<WorkerOutput> {
    console.log(`   🔄 启动 ${workerName}...`);

    // 创建超时 Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${workerName} 超时 (${this.config.timeout}ms)`));
      }, this.config.timeout);
    });

    try {
      // 竞争：Worker 执行 vs 超时
      const result = await Promise.race([
        worker.execute(options),
        timeoutPromise,
      ]);

      console.log(`   ✅ ${workerName} 完成 (置信度: ${result.confidence})`);
      return result;
    } catch (error) {
      console.error(`   ❌ ${workerName} 失败:`, error);

      // 失败时返回降级结果，不阻塞整体流程
      return {
        worker: this.getWorkerType(workerName),
        confidence: 0.3,
        findings: [
          {
            category: 'execution_error',
            content: `${workerName} 执行失败: ${String(error)}`,
            priority: 'medium',
          },
        ],
        questions: [`${workerName} 需要重新执行`],
      };
    }
  }

  /**
   * 根据 Worker 名称获取 Worker 类型
   * 
   * @param workerName - Worker 名称
   * @returns Worker 类型
   */
  private getWorkerType(workerName: string): 'business' | 'tech' | 'domain' | 'risk' {
    const typeMap: Record<string, 'business' | 'tech' | 'domain' | 'risk'> = {
      '业务分析': 'business',
      '技术分析': 'tech',
      '领域分析': 'domain',
      '风险分析': 'risk',
    };
    return typeMap[workerName] || 'business';
  }

  /**
   * 阶段 3 & 4: 生成并验证输出
   * 
   * 循环执行直到验证通过或达到最大重试次数：
   * 1. 使用 OutputGenerator 生成 BusinessAnalysis
   * 2. 使用 Verifier 验证输出质量
   * 3. 如果不通过，根据反馈重新生成
   * 
   * @param synthesis - 综合结果
   * @param options - 智能初始化选项
   * @returns 验证通过的业务分析结果
   * @throws 如果达到最大重试次数仍未通过验证
   */
  private async generateAndVerify(
    synthesis: SynthesisResult,
    options: SmartInitOptions
  ): Promise<BusinessAnalysis> {
    let lastVerification: VerificationResult | undefined;

    // 带重试的生成循环
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      console.log(`   尝试 ${attempt}/${this.config.maxRetries}...`);

      try {
        // 阶段 3: 生成输出
        const analysis = await this.outputGenerator.generate(
          synthesis,
          options.projectName,
          options.overview
        );

        // 阶段 4: 验证输出
        const verification = this.verifier.verify(analysis);
        lastVerification = verification;

        console.log(`   📋 验证结果: ${verification.valid ? '✅ 通过' : '❌ 失败'}`);
        console.log(`      置信度: ${(verification.confidence * 100).toFixed(1)}%`);

        if (verification.valid) {
          console.log('   ✅ 输出验证通过！');
          return analysis;
        }

        // 验证失败，记录问题
        console.log('   ⚠️ 发现以下问题:');
        verification.issues.forEach((issue) => {
          console.log(`      - ${issue}`);
        });

        // 如果不是最后一次尝试，生成反馈并继续
        if (attempt < this.config.maxRetries) {
          console.log('   🔄 根据反馈重新生成...');
          const feedback = this.verifier.generateFeedback(analysis, verification);
          // 将反馈添加到 synthesis 中，供下次生成使用
          synthesis.openQuestions.push(feedback);
        }
      } catch (error) {
        console.error(`   ❌ 生成失败 (尝试 ${attempt}):`, error);
        if (attempt === this.config.maxRetries) {
          throw error;
        }
      }
    }

    // 所有重试都失败
    throw new Error(
      `无法生成有效的业务分析结果。` +
      `已尝试 ${this.config.maxRetries} 次。` +
      `最后一次验证置信度: ${((lastVerification?.confidence ?? 0) * 100).toFixed(1)}%` +
      `${lastVerification?.issues.length ? `, 问题: ${lastVerification.issues.join(', ')}` : ''}`
    );
  }

  /**
   * 记录 Worker 执行结果
   * 
   * @param outputs - Worker 输出结果数组
   */
  private logWorkerResults(outputs: WorkerOutput[]): void {
    console.log('\n   📊 Worker 执行结果汇总:');
    outputs.forEach((output) => {
      const emoji = output.confidence >= 0.7 ? '✅' : output.confidence >= 0.4 ? '⚠️' : '❌';
      console.log(`      ${emoji} ${output.worker}: 置信度 ${output.confidence}, 发现 ${output.findings.length} 项`);
      if (output.questions.length > 0) {
        console.log(`         待澄清问题: ${output.questions.length} 个`);
      }
    });

    // 计算平均置信度
    const avgConfidence = outputs.reduce((sum, o) => sum + o.confidence, 0) / outputs.length;
    console.log(`   📈 平均置信度: ${avgConfidence.toFixed(2)}`);
  }

  /**
   * 记录综合结果
   * 
   * @param synthesis - 综合结果
   */
  private logSynthesisResult(synthesis: SynthesisResult): void {
    console.log(`   📋 综合摘要: ${synthesis.summary}`);
    console.log(`   🎯 核心功能: ${synthesis.business.coreFeatures.length} 个`);
    console.log(`   ⚠️ 识别风险: ${synthesis.risks.length} 个`);
    console.log(`   📊 综合置信度: ${synthesis.confidence}`);
    if (synthesis.openQuestions.length > 0) {
      console.log(`   ❓ 待澄清问题: ${synthesis.openQuestions.length} 个`);
    }
  }
}
