import { SimpleGit, simpleGit } from 'simple-git';
import { Logger } from '../utils/Logger';

export interface PRCreateOptions {
  branch: string;
  title: string;
  body: string;
  draft?: boolean;
  autoMerge?: boolean;
}

export interface PRMergeOptions {
  number: number;
  strategy?: 'merge' | 'squash' | 'rebase';
  deleteBranch?: boolean;
}

export class PRAutomator {
  private git: SimpleGit;
  private logger: Logger;
  private githubToken: string;
  private repo: { owner: string; repo: string };
  private hasGhCLI: boolean = false;
  private ghPath: string = 'gh';
  private initialized: boolean = false;

  constructor() {
    this.git = simpleGit();
    this.logger = new Logger();
    this.githubToken = process.env.GITHUB_TOKEN || '';
    
    // 从 git remote 解析仓库信息
    this.repo = { owner: '', repo: '' };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await this.initRepo();
    await this.checkGhCLI();
    
    this.initialized = true;
  }

  private async checkGhCLI(): Promise<void> {
    // 首先检查本地 bin/gh.exe
    const localGh = require('path').join(process.cwd(), 'bin', 'gh.exe');
    const fs = require('fs');
    
    if (fs.existsSync(localGh)) {
      try {
        const { exec } = await import('child_process');
        const util = await import('util');
        const execPromise = util.promisify(exec);
        await execPromise(`"${localGh}" --version`);
        this.hasGhCLI = true;
        this.ghPath = localGh;
        this.logger.info('✅ GitHub CLI (gh) 已安装 (本地)');
        return;
      } catch {
        // 本地 gh 不可用，继续检查系统路径
      }
    }

    // 检查系统路径的 gh
    try {
      const { exec } = await import('child_process');
      const util = await import('util');
      const execPromise = util.promisify(exec);
      await execPromise('gh --version');
      this.hasGhCLI = true;
      this.ghPath = 'gh';
      this.logger.info('✅ GitHub CLI (gh) 已安装 (系统)');
    } catch {
      this.hasGhCLI = false;
      this.logger.warn('⚠️ GitHub CLI (gh) 未安装，将使用 GitHub API');
    }
  }

  private async initRepo(): Promise<void> {
    try {
      const remotes = await this.git.getRemotes(true);
      const origin = remotes.find(r => r.name === 'origin');
      
      if (origin) {
        const match = origin.refs.fetch.match(/github\.com[:\/](.+?)\/(.+?)\.git/);
        if (match) {
          this.repo.owner = match[1];
          this.repo.repo = match[2];
        }
      }
    } catch (error) {
      this.logger.warn('无法解析仓库信息:', error);
    }
  }

  async create(options: PRCreateOptions): Promise<any> {
    await this.initialize();
    this.logger.info('🔀 创建 PR:', options.title);
    
    try {
      if (this.hasGhCLI) {
        return await this.createWithGhCLI(options);
      } else {
        return await this.createWithAPI(options);
      }
    } catch (error) {
      this.logger.error('PR 创建失败:', error);
      // 返回模拟结果，不中断流程
      return {
        url: `https://github.com/${this.repo.owner}/${this.repo.repo}/pull/0`,
        number: 0,
        branch: options.branch,
        title: options.title,
        simulated: true
      };
    }
  }

  private async createWithGhCLI(options: PRCreateOptions): Promise<any> {
    const command = this.buildPRCreateCommand(options);
    const result = await this.runCommand(command);
    
    if (result.exitCode !== 0) {
      throw new Error(`PR 创建失败: ${result.stderr}`);
    }
    
    const prUrl = result.stdout.trim();
    const prNumber = this.extractPRNumber(prUrl);
    
    this.logger.info(`✅ PR 已创建: ${prUrl}`);
    
    return {
      url: prUrl,
      number: prNumber,
      branch: options.branch,
      title: options.title
    };
  }

  private async createWithAPI(options: PRCreateOptions): Promise<any> {
    if (!this.githubToken) {
      throw new Error('GITHUB_TOKEN 未设置');
    }

    // 获取默认分支
    const baseBranch = await this.getDefaultBranch();
    
    // 使用 GitHub API 创建 PR
    const response = await fetch(
      `https://api.github.com/repos/${this.repo.owner}/${this.repo.repo}/pulls`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.githubToken}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          title: options.title,
          body: options.body,
          head: options.branch,
          base: baseBranch,
          draft: options.draft || false
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API 错误: ${error}`);
    }

    const data = await response.json() as any;
    
    this.logger.info(`✅ PR 已创建: ${data.html_url}`);
    
    return {
      url: data.html_url as string,
      number: data.number as number,
      branch: options.branch,
      title: options.title
    };
  }

  private async getDefaultBranch(): Promise<string> {
    try {
      const remotes = await this.git.getRemotes(true);
      const origin = remotes.find(r => r.name === 'origin');
      if (origin) {
        // 尝试获取默认分支
        const { stdout } = await this.runCommand('git symbolic-ref refs/remotes/origin/HEAD');
        if (stdout) {
          return stdout.replace('refs/remotes/origin/', '').trim();
        }
      }
      return 'main';
    } catch {
      return 'main';
    }
  }

  async merge(options: PRMergeOptions): Promise<void> {
    await this.initialize();
    this.logger.info(`🔀 合并 PR #${options.number}`);
    
    try {
      const strategy = options.strategy || 'squash';
      const command = `"${this.ghPath}" pr merge ${options.number} --${strategy} ${options.deleteBranch ? '--delete-branch' : ''}`;
      
      const result = await this.runCommand(command);
      
      if (result.exitCode !== 0) {
        throw new Error(`PR 合并失败: ${result.stderr}`);
      }
      
      this.logger.info('✅ PR 已合并');
      
    } catch (error) {
      this.logger.error('PR 合并失败:', error);
      throw error;
    }
  }

  async getPR(number: number): Promise<any> {
    await this.initialize();
    try {
      const command = `"${this.ghPath}" pr view ${number} --json number,title,body,state,url,headRefName,baseRefName`;
      const result = await this.runCommand(command);
      
      if (result.exitCode !== 0) {
        throw new Error(`获取 PR 失败: ${result.stderr}`);
      }
      
      return JSON.parse(result.stdout);
      
    } catch (error) {
      this.logger.error('获取 PR 失败:', error);
      throw error;
    }
  }

  async listPRs(options: { state?: string; author?: string } = {}): Promise<any[]> {
    await this.initialize();
    try {
      let command = `"${this.ghPath}" pr list --json number,title,author,state,url`;
      
      if (options.state) {
        command += ` --state ${options.state}`;
      }
      
      if (options.author) {
        command += ` --author ${options.author}`;
      }
      
      const result = await this.runCommand(command);
      
      if (result.exitCode !== 0) {
        throw new Error(`列出 PR 失败: ${result.stderr}`);
      }
      
      return JSON.parse(result.stdout);
      
    } catch (error) {
      this.logger.error('列出 PR 失败:', error);
      throw error;
    }
  }

  async approve(number: number, comment?: string): Promise<void> {
    await this.initialize();
    this.logger.info(`✅ 批准 PR #${number}`);
    
    try {
      let command = `"${this.ghPath}" pr review ${number} --approve`;
      
      if (comment) {
        command += ` --body "${comment}"`;
      }
      
      const result = await this.runCommand(command);
      
      if (result.exitCode !== 0) {
        throw new Error(`批准 PR 失败: ${result.stderr}`);
      }
      
      this.logger.info('✅ PR 已批准');
      
    } catch (error) {
      this.logger.error('批准 PR 失败:', error);
      throw error;
    }
  }

  async requestChanges(number: number, comment: string): Promise<void> {
    await this.initialize();
    this.logger.info(`📝 请求修改 PR #${number}`);
    
    try {
      const command = `"${this.ghPath}" pr review ${number} --request-changes --body "${comment}"`;
      const result = await this.runCommand(command);
      
      if (result.exitCode !== 0) {
        throw new Error(`请求修改失败: ${result.stderr}`);
      }
      
      this.logger.info('📝 已请求修改');
      
    } catch (error) {
      this.logger.error('请求修改失败:', error);
      throw error;
    }
  }

  async addComment(number: number, comment: string): Promise<void> {
    await this.initialize();
    try {
      const command = `"${this.ghPath}" pr comment ${number} --body "${comment}"`;
      const result = await this.runCommand(command);
      
      if (result.exitCode !== 0) {
        throw new Error(`添加评论失败: ${result.stderr}`);
      }
      
    } catch (error) {
      this.logger.error('添加评论失败:', error);
      throw error;
    }
  }

  async checkStatus(number: number): Promise<any> {
    await this.initialize();
    try {
      // 获取 PR 状态
      const pr = await this.getPR(number);
      
      // 获取检查状态
      const checksCommand = `"${this.ghPath}" pr checks ${number} --json name,state,description`;
      const checksResult = await this.runCommand(checksCommand);
      const checks = checksResult.exitCode === 0 ? JSON.parse(checksResult.stdout) : [];
      
      // 获取审查状态
      const reviewsCommand = `"${this.ghPath}" pr view ${number} --json reviews`;
      const reviewsResult = await this.runCommand(reviewsCommand);
      const reviews = reviewsResult.exitCode === 0 ? JSON.parse(reviewsResult.stdout).reviews : [];
      
      return {
        pr,
        checks,
        reviews,
        isMergeable: pr.state === 'OPEN' && 
                     checks.every((c: any) => c.state === 'SUCCESS') &&
                     reviews.every((r: any) => r.state === 'APPROVED')
      };
      
    } catch (error) {
      this.logger.error('检查 PR 状态失败:', error);
      throw error;
    }
  }

  async waitForChecks(number: number, timeout: number = 300000): Promise<boolean> {
    await this.initialize();
    this.logger.info(`⏳ 等待 PR #${number} 检查完成...`);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const status = await this.checkStatus(number);
      
      const pendingChecks = status.checks.filter((c: any) => c.state === 'PENDING');
      
      if (pendingChecks.length === 0) {
        const failedChecks = status.checks.filter((c: any) => c.state === 'FAILURE');
        
        if (failedChecks.length === 0) {
          this.logger.info('✅ 所有检查通过');
          return true;
        } else {
          this.logger.error('❌ 有检查失败:', failedChecks.map((c: any) => c.name).join(', '));
          return false;
        }
      }
      
      this.logger.info(`⏳ 等待中... (${pendingChecks.length} 个检查 pending)`);
      await this.sleep(10000);  // 10秒检查一次
    }
    
    this.logger.error('⏰ 等待检查超时');
    return false;
  }

  private buildPRCreateCommand(options: PRCreateOptions): string {
    let command = `"${this.ghPath}" pr create`;
    command += ` --title "${this.escapeShellArg(options.title)}"`;
    command += ` --body "${this.escapeShellArg(options.body)}"`;
    command += ` --head "${options.branch}"`;
    
    if (options.draft) {
      command += ' --draft';
    }
    
    return command;
  }

  private extractPRNumber(url: string): number {
    const match = url.match(/\/pull\/(\d+)$/);
    return match ? parseInt(match[1]) : 0;
  }

  private escapeShellArg(arg: string): string {
    return arg.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  private async runCommand(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const { exec } = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(exec);
    
    try {
      const { stdout, stderr } = await execPromise(command, {
        env: {
          ...process.env,
          GITHUB_TOKEN: this.githubToken
        }
      });
      return { stdout, stderr, exitCode: 0 };
    } catch (error: any) {
      return { 
        stdout: error.stdout || '', 
        stderr: error.stderr || '', 
        exitCode: error.code || 1 
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
