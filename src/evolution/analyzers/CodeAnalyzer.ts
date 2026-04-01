import { Logger } from '../../utils/Logger';
import { EvolutionOpportunity, OpportunityEvidence, TaskCategory } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

export class CodeAnalyzer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  async analyze(projectPath: string): Promise<EvolutionOpportunity[]> {
    this.logger.info('🔍 Analyzing codebase for evolution opportunities...');
    
    const opportunities: EvolutionOpportunity[] = [];

    const [
      todoOpportunities,
      coverageOpportunities,
      smellOpportunities
    ] = await Promise.all([
      this.findTODOs(projectPath),
      this.findTestCoverageGaps(projectPath),
      this.findCodeSmells(projectPath)
    ]);

    opportunities.push(
      ...todoOpportunities,
      ...coverageOpportunities,
      ...smellOpportunities
    );

    this.logger.info(`✅ Code analysis complete: ${opportunities.length} opportunities found`);
    return opportunities;
  }

  private async findTODOs(projectPath: string): Promise<EvolutionOpportunity[]> {
    const opportunities: EvolutionOpportunity[] = [];
    
    try {
      const files = await glob('**/*.{ts,tsx,js,jsx}', {
        cwd: projectPath,
        ignore: ['node_modules/**', 'dist/**', '.next/**']
      });

      for (const file of files.slice(0, 50)) {
        const content = await fs.readFile(path.join(projectPath, file), 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const todoMatch = line.match(/\/\/\s*(TODO|FIXME|XXX)[!:]?\s*(.+)/i);
          if (todoMatch) {
            const priority = line.includes('!') ? 'high' : 'medium';
            const description = todoMatch[2].trim();
            
            opportunities.push({
              id: `evolution-todo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              category: 'technical_debt',
              trigger: 'code_pattern_detected',
              title: `Address ${todoMatch[1]}: ${description.slice(0, 50)}...`,
              description: `Found ${todoMatch[1]} comment in ${file}:${i + 1}\n\n${description}`,
              priority,
              estimatedImpact: priority === 'high' ? 7 : 5,
              evidence: [{
                type: 'code_smell',
                description: `${todoMatch[1]} found: ${description}`,
                location: `${file}:${i + 1}`,
                severity: priority === 'high' ? 'error' : 'warning'
              }],
              suggestedApproach: `1. Review the TODO comment\n2. Implement the required changes\n3. Remove the TODO comment\n4. Add tests if applicable`,
              relatedFiles: [file],
              createdAt: new Date()
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn('Error finding TODOs:', error);
    }

    return opportunities.slice(0, 10);
  }

  private async findTestCoverageGaps(projectPath: string): Promise<EvolutionOpportunity[]> {
    const opportunities: EvolutionOpportunity[] = [];
    
    try {
      const sourceFiles = await glob('src/**/*.{ts,tsx}', {
        cwd: projectPath,
        ignore: ['**/*.test.ts', '**/*.spec.ts', '**/*.d.ts']
      });

      const testFiles = await glob('src/**/*.{test,spec}.{ts,tsx}', {
        cwd: projectPath
      });

      const testedPaths = new Set(
        testFiles.map(f => f.replace(/\.(test|spec)\.(ts|tsx)$/, '.ts'))
      );

      const untestedFiles = sourceFiles
        .filter(f => !f.endsWith('.d.ts'))
        .filter(f => !testedPaths.has(f.replace(/\.tsx?$/, '.ts')))
        .filter(f => !f.includes('__tests__'))
        .slice(0, 5);

      for (const file of untestedFiles) {
        opportunities.push({
          id: `evolution-coverage-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          category: 'testing',
          trigger: 'code_pattern_detected',
          title: `Add tests for ${path.basename(file)}`,
          description: `File ${file} appears to lack corresponding unit tests.`,
          priority: 'medium',
          estimatedImpact: 6,
          evidence: [{
            type: 'missing_feature',
            description: `No test file found for ${file}`,
            location: file,
            severity: 'warning'
          }],
          suggestedApproach: `1. Create test file: ${file.replace(/\.tsx?$/, '.test.ts')}\n2. Test core functionality\n3. Test edge cases`,
          relatedFiles: [file],
          createdAt: new Date()
        });
      }
    } catch (error) {
      this.logger.warn('Error finding coverage gaps:', error);
    }

    return opportunities;
  }

  private async findCodeSmells(projectPath: string): Promise<EvolutionOpportunity[]> {
    const opportunities: EvolutionOpportunity[] = [];
    
    try {
      const files = await glob('src/**/*.{ts,tsx}', {
        cwd: projectPath,
        ignore: ['**/*.test.ts', '**/*.spec.ts']
      });

      for (const file of files.slice(0, 20)) {
        const content = await fs.readFile(path.join(projectPath, file), 'utf-8');
        const lines = content.split('\n');

        if (lines.length > 300) {
          opportunities.push({
            id: `evolution-longfile-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            category: 'technical_debt',
            trigger: 'code_pattern_detected',
            title: `Refactor long file: ${path.basename(file)}`,
            description: `File ${file} has ${lines.length} lines. Consider splitting into smaller modules.`,
            priority: 'medium',
            estimatedImpact: 5,
            evidence: [{
              type: 'code_smell',
              description: `File length: ${lines.length} lines`,
              location: file,
              severity: 'warning'
            }],
            suggestedApproach: `1. Identify cohesive groups of functionality\n2. Extract into separate modules\n3. Update imports`,
            relatedFiles: [file],
            createdAt: new Date()
          });
        }

        const consoleLogs = lines.filter(line => {
          const match = line.match(/console\.(log|warn|error|debug)\(/);
          return match && !line.includes('//') && !line.includes('logger.');
        });

        if (consoleLogs.length > 3) {
          opportunities.push({
            id: `evolution-console-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            category: 'technical_debt',
            trigger: 'code_pattern_detected',
            title: `Replace console.log with proper logging`,
            description: `Found ${consoleLogs.length} console.* statements in ${file}.`,
            priority: 'low',
            estimatedImpact: 4,
            evidence: [{
              type: 'code_smell',
              description: `${consoleLogs.length} console statements`,
              location: file,
              severity: 'info'
            }],
            suggestedApproach: `1. Import proper logger\n2. Replace console.log with logger.info/debug`,
            relatedFiles: [file],
            createdAt: new Date()
          });
        }
      }
    } catch (error) {
      this.logger.warn('Error finding code smells:', error);
    }

    return opportunities;
  }
}
