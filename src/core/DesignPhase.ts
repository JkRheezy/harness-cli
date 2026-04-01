import { Logger } from '../utils/Logger';
import { SkillInvoker } from '../utils/SkillInvoker';
import { DesignResult, DesignPhase as Phase } from '../types/superpowers';

export class DesignPhase {
  private logger: Logger;
  private skillInvoker: SkillInvoker;
  private autoDesign: boolean;

  constructor(autoDesign: boolean = true) {
    this.logger = new Logger();
    this.skillInvoker = new SkillInvoker();
    this.autoDesign = autoDesign;
  }

  /**
   * Run complete design phase for a task
   */
  async run(task: any): Promise<DesignResult> {
    this.logger.info(`🎨 Starting design phase for: ${task.title}`);

    // Step 1: Brainstorming
    const brainstormResult = await this.runBrainstorming(task);
    if (!brainstormResult.success) {
      return this.createResult('none', false, 'Brainstorming failed');
    }

    // Step 2: Writing Plans
    const planResult = await this.runPlanning(task, brainstormResult);
    if (!planResult.success) {
      return this.createResult('brainstorming', false, 'Planning failed');
    }

    // Step 3: Check for approval if required
    if (!this.autoDesign) {
      this.logger.info('⏳ Waiting for design approval...');
      return this.createResult('planning', false, 'Waiting for approval', planResult.path);
    }

    return this.createResult('ready', true, 'Design complete', planResult.path);
  }

  /**
   * Run brainstorming skill
   */
  private async runBrainstorming(task: any): Promise<any> {
    this.logger.info('🧠 Running brainstorming...');
    
    const hasSkill = await this.skillInvoker.exists('brainstorming');
    if (!hasSkill) {
      this.logger.warn('Brainstorming skill not found, using fallback');
      return { success: true, fallback: true };
    }

    return await this.skillInvoker.invoke('brainstorming', {
      topic: task.title,
      description: task.description,
      requirements: task.requirements
    });
  }

  /**
   * Run writing-plans skill
   */
  private async runPlanning(task: any, brainstormResult: any): Promise<any> {
    this.logger.info('📝 Running planning...');
    
    const hasSkill = await this.skillInvoker.exists('writing-plans');
    if (!hasSkill) {
      this.logger.warn('Writing-plans skill not found, using fallback');
      return { success: true, fallback: true, path: null };
    }

    return await this.skillInvoker.invoke('writing-plans', {
      task: task,
      brainstorm: brainstormResult
    });
  }

  private createResult(
    phase: Phase, 
    approved: boolean, 
    summary: string,
    planPath?: string
  ): DesignResult {
    return { phase, approved, summary, planPath };
  }
}
