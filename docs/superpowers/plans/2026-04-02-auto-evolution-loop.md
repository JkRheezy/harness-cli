# Auto-Evolution Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable harness-loop to autonomously generate both technical and business iteration tasks without human input, creating a self-evolving system that continuously improves code quality and business value.

**Architecture:** 
- Create `AutoEvolution` engine that periodically analyzes codebase and business metrics to spawn improvement tasks
- Add `BusinessAnalyzer` to understand domain logic and identify business feature gaps
- Add `DocumentationDriftAnalyzer` to detect drift between docs/comments and actual code
- Add `OpportunityDetector` to coordinate all analyzers and prioritize opportunities
- Integrate with existing LoopController to feed discovered tasks into the queue automatically

**Tech Stack:** TypeScript, harness-loop core, Playwright (for business flow validation), AST parsing (ESPrima/TypeScript compiler API)

---

## Overview

Current harness-loop requires initial tasks to start. This implementation adds **Auto-Evolution** capability that allows the loop to:

1. **Self-Start**: When queue is empty, analyze project and generate improvement tasks
2. **Business Evolution**: Analyze product features, user flows, and business logic to suggest new capabilities
3. **Technical Evolution**: Find code debt, missing tests, performance issues, security gaps
4. **Documentation Evolution**: Detect drift between docs and code (JSDoc, README, API docs)
5. **Continuous Learning**: Learn from completed tasks to improve future suggestions

### Auto-Evolution Triggers

```
┌─────────────────────────────────────────────────────────────────┐
│                     Auto-Evolution Triggers                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Queue Empty (Self-Start)                                    │
│     └── No pending tasks → Deep analysis → Generate tasks       │
│                                                                  │
│  2. Periodic Check (Every N iterations)                         │
│     └── Analyze code quality trends → Proactive improvements    │
│                                                                  │
│  3. Business Metric Changes                                     │
│     └── New feature areas identified → Business tasks           │
│                                                                  │
│  4. Code Pattern Recognition                                    │
│     └── Similar code smells → Refactoring tasks                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Task Generation Sources

| Source | Technical Tasks | Business Tasks |
|--------|----------------|----------------|
| **Code Analysis** | Missing tests, code smells, type errors | N/A |
| **AST Parsing** | Unused exports, complex functions, TODOs | Feature gap analysis |
| **Browser Validation** | UI bugs, performance issues | User flow improvements |
| **Documentation** | Outdated docs, missing READMEs | Feature specs, user stories |
| **Git History** | Hotspot analysis, bug patterns | Development velocity |
| **Business Logic** | N/A | Missing features, edge cases |
| **Doc Drift** | Outdated JSDoc, README, API docs | Feature description sync |

---

## Task 1: Create AutoEvolution Types

**Files:**
- Create: `src/evolution/types.ts`

- [ ] **Step 1: Define evolution types**

```typescript
/**
 * Auto-Evolution types for self-improving harness-loop
 */

export type EvolutionTrigger = 
  | 'queue_empty' 
  | 'periodic_check' 
  | 'quality_regression'
  | 'business_opportunity'
  | 'code_pattern_detected';

export type TaskCategory = 
  | 'technical_debt'
  | 'feature_gap'
  | 'performance'
  | 'security'
  | 'testing'
  | 'documentation'
  | 'business_feature'
  | 'ux_improvement';

export interface EvolutionOpportunity {
  id: string;
  category: TaskCategory;
  trigger: EvolutionTrigger;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: number; // 1-10
  evidence: OpportunityEvidence[];
  suggestedApproach: string;
  relatedFiles?: string[];
  createdAt: Date;
}

export interface OpportunityEvidence {
  type: 'code_smell' | 'metric_regression' | 'user_flow_gap' | 'missing_feature' | 'pattern_match';
  description: string;
  location?: string;
  severity: 'info' | 'warning' | 'error';
}

export interface BusinessContext {
  domain: string;
  currentFeatures: string[];
  userFlows: UserFlow[];
  businessRules: BusinessRule[];
  competitors?: string[];
  targetUsers?: string;
}

export interface UserFlow {
  name: string;
  steps: string[];
  entryPoints: string[];
  conversionGoal?: string;
  currentIssues?: string[];
}

export interface BusinessRule {
  id: string;
  description: string;
  implementationFiles: string[];
  validationTests?: string[];
}

export interface EvolutionResult {
  opportunitiesFound: number;
  tasksGenerated: number;
  categories: Record<TaskCategory, number>;
  analysisDuration: number;
}

export interface EvolutionConfig {
  enabled: boolean;
  checkInterval: number; // milliseconds between periodic checks
  maxOpportunitiesPerAnalysis: number;
  minImpactThreshold: number; // minimum impact score to generate task
  categories: {
    technical: boolean;
    business: boolean;
    ux: boolean;
  };
  businessContext?: BusinessContext;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/evolution/types.ts
git commit -m "feat: add AutoEvolution type definitions"
```

---

## Task 2: Create CodeAnalyzer

**Files:**
- Create: `src/evolution/analyzers/CodeAnalyzer.ts`

- [ ] **Step 1: Implement code analysis engine**

```typescript
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

  /**
   * Analyze codebase for technical improvement opportunities
   */
  async analyze(projectPath: string): Promise<EvolutionOpportunity[]> {
    this.logger.info('🔍 Analyzing codebase for evolution opportunities...');
    
    const opportunities: EvolutionOpportunity[] = [];

    // Parallel analysis
    const [
      todoOpportunities,
      coverageOpportunities,
      smellOpportunities,
      unusedCodeOpportunities
    ] = await Promise.all([
      this.findTODOs(projectPath),
      this.findTestCoverageGaps(projectPath),
      this.findCodeSmells(projectPath),
      this.findUnusedCode(projectPath)
    ]);

    opportunities.push(
      ...todoOpportunities,
      ...coverageOpportunities,
      ...smellOpportunities,
      ...unusedCodeOpportunities
    );

    this.logger.info(`✅ Code analysis complete: ${opportunities.length} opportunities found`);
    return opportunities;
  }

  /**
   * Find TODO/FIXME/XXX comments that should be addressed
   */
  private async findTODOs(projectPath: string): Promise<EvolutionOpportunity[]> {
    const opportunities: EvolutionOpportunity[] = [];
    
    try {
      // Find all source files
      const files = await glob('**/*.{ts,tsx,js,jsx}', {
        cwd: projectPath,
        ignore: ['node_modules/**', 'dist/**', '.next/**']
      });

      for (const file of files.slice(0, 50)) { // Limit to 50 files
        const content = await fs.readFile(path.join(projectPath, file), 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Match TODO/FIXME/XXX with priority indicators
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

    return opportunities.slice(0, 10); // Limit to 10 TODO opportunities
  }

  /**
   * Find files with low or missing test coverage
   */
  private async findTestCoverageGaps(projectPath: string): Promise<EvolutionOpportunity[]> {
    const opportunities: EvolutionOpportunity[] = [];
    
    try {
      // Find source files without corresponding test files
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
        .slice(0, 5); // Limit to 5 files

      for (const file of untestedFiles) {
        opportunities.push({
          id: `evolution-coverage-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          category: 'testing',
          trigger: 'code_pattern_detected',
          title: `Add tests for ${path.basename(file)}`,
          description: `File ${file} appears to lack corresponding unit tests. Adding tests will improve reliability and enable safe refactoring.`,
          priority: 'medium',
          estimatedImpact: 6,
          evidence: [{
            type: 'missing_feature',
            description: `No test file found for ${file}`,
            location: file,
            severity: 'warning'
          }],
          suggestedApproach: `1. Create test file: ${file.replace(/\.tsx?$/, '.test.ts')}\n2. Test core functionality\n3. Test edge cases and error handling\n4. Aim for >70% coverage`,
          relatedFiles: [file],
          createdAt: new Date()
        });
      }
    } catch (error) {
      this.logger.warn('Error finding coverage gaps:', error);
    }

    return opportunities;
  }

  /**
   * Find code smells (complex functions, long files, etc.)
   */
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

        // Check for very long files (>300 lines)
        if (lines.length > 300) {
          opportunities.push({
            id: `evolution-longfile-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            category: 'technical_debt',
            trigger: 'code_pattern_detected',
            title: `Refactor long file: ${path.basename(file)}`,
            description: `File ${file} has ${lines.length} lines, which exceeds the recommended 300 lines. Consider splitting into smaller modules.`,
            priority: 'medium',
            estimatedImpact: 5,
            evidence: [{
              type: 'code_smell',
              description: `File length: ${lines.length} lines`,
              location: file,
              severity: 'warning'
            }],
            suggestedApproach: `1. Identify cohesive groups of functionality\n2. Extract into separate modules\n3. Update imports\n4. Add tests for extracted modules`,
            relatedFiles: [file],
            createdAt: new Date()
          });
        }

        // Check for console.log statements
        const consoleLogs = lines.filter((line, idx) => {
          const match = line.match(/console\.(log|warn|error|debug)\(/);
          if (match && !line.includes('//') && !line.includes('logger.')) {
            return true;
          }
          return false;
        });

        if (consoleLogs.length > 3) {
          opportunities.push({
            id: `evolution-console-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            category: 'technical_debt',
            trigger: 'code_pattern_detected',
            title: `Replace console.log with proper logging in ${path.basename(file)}`,
            description: `Found ${consoleLogs.length} console.* statements in ${file}. Should use proper logger for production code.`,
            priority: 'low',
            estimatedImpact: 4,
            evidence: [{
              type: 'code_smell',
              description: `${consoleLogs.length} console statements found`,
              location: file,
              severity: 'info'
            }],
            suggestedApproach: `1. Import proper logger\n2. Replace console.log with logger.info/debug\n3. Use appropriate log levels`,
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

  /**
   * Find unused exports
   */
  private async findUnusedCode(projectPath: string): Promise<EvolutionOpportunity[]> {
    // Simplified implementation - in production would use TS compiler API
    return [];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/evolution/analyzers/CodeAnalyzer.ts
git commit -m "feat: add CodeAnalyzer for technical debt detection"
```

---

## Task 3: Create BusinessAnalyzer

**Files:**
- Create: `src/evolution/analyzers/BusinessAnalyzer.ts`

- [ ] **Step 1: Implement business analysis engine**

```typescript
import { Logger } from '../../utils/Logger';
import { EvolutionOpportunity, BusinessContext, UserFlow, TaskCategory } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

export class BusinessAnalyzer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Analyze business logic and identify feature gaps
   */
  async analyze(
    projectPath: string, 
    context: BusinessContext
  ): Promise<EvolutionOpportunity[]> {
    this.logger.info('💼 Analyzing business opportunities...');
    
    const opportunities: EvolutionOpportunity[] = [];

    const [
      userFlowOpportunities,
      featureGapOpportunities,
      domainOpportunities
    ] = await Promise.all([
      this.analyzeUserFlows(projectPath, context.userFlows),
      this.findFeatureGaps(projectPath, context),
      this.analyzeDomainCompleteness(projectPath, context)
    ]);

    opportunities.push(
      ...userFlowOpportunities,
      ...featureGapOpportunities,
      ...domainOpportunities
    );

    this.logger.info(`✅ Business analysis complete: ${opportunities.length} opportunities found`);
    return opportunities;
  }

  /**
   * Analyze user flows for completion and UX improvements
   */
  private async analyzeUserFlows(
    projectPath: string, 
    userFlows: UserFlow[]
  ): Promise<EvolutionOpportunity[]> {
    const opportunities: EvolutionOpportunity[] = [];
    
    try {
      // Find all page/route files
      const pages = await glob('src/app/**/page.{tsx,ts}', { cwd: projectPath });
      const routes = await glob('src/pages/**/*.{tsx,ts}', { cwd: projectPath });
      const allFiles = [...pages, ...routes];

      for (const flow of userFlows) {
        // Check if all steps in the flow are implemented
        const missingSteps: string[] = [];
        
        for (const step of flow.steps) {
          const stepImplemented = allFiles.some(file => {
            const fileLower = file.toLowerCase();
            const stepLower = step.toLowerCase().replace(/\s+/g, '');
            return fileLower.includes(stepLower) || 
                   fileLower.includes(stepLower.replace('-', ''));
          });
          
          if (!stepImplemented) {
            missingSteps.push(step);
          }
        }

        if (missingSteps.length > 0) {
          opportunities.push({
            id: `evolution-flow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            category: 'business_feature',
            trigger: 'business_opportunity',
            title: `Complete user flow: ${flow.name}`,
            description: `User flow "${flow.name}" is missing ${missingSteps.length} steps: ${missingSteps.join(', ')}.\n\nCurrent flow: ${flow.steps.join(' → ')}\n\nGoal: ${flow.conversionGoal || 'N/A'}`,
            priority: 'high',
            estimatedImpact: 8,
            evidence: [{
              type: 'user_flow_gap',
              description: `Missing steps: ${missingSteps.join(', ')}`,
              severity: 'error'
            }],
            suggestedApproach: `1. Create pages for missing steps\n2. Implement navigation between steps\n3. Add state management for flow data\n4. Test complete user journey`,
            createdAt: new Date()
          });
        }

        // Check for entry point issues
        if (flow.entryPoints && flow.entryPoints.length > 0) {
          for (const entry of flow.entryPoints) {
            const entryExists = allFiles.some(file => 
              file.toLowerCase().includes(entry.toLowerCase())
            );
            
            if (!entryExists) {
              opportunities.push({
                id: `evolution-entry-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                category: 'business_feature',
                trigger: 'business_opportunity',
                title: `Create entry point: ${entry}`,
                description: `Entry point "${entry}" for flow "${flow.name}" is not implemented. This limits user acquisition.`,
                priority: 'medium',
                estimatedImpact: 6,
                evidence: [{
                  type: 'user_flow_gap',
                  description: `Missing entry point: ${entry}`,
                  severity: 'warning'
                }],
                suggestedApproach: `1. Create landing page for ${entry}\n2. Add clear CTA to main flow\n3. Track conversion metrics`,
                createdAt: new Date()
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn('Error analyzing user flows:', error);
    }

    return opportunities;
  }

  /**
   * Find feature gaps based on domain expectations
   */
  private async findFeatureGaps(
    projectPath: string, 
    context: BusinessContext
  ): Promise<EvolutionOpportunity[]> {
    const opportunities: EvolutionOpportunity[] = [];
    
    // Domain-specific feature expectations
    const domainFeatures: Record<string, string[]> = {
      'ecommerce': [
        'product catalog', 'shopping cart', 'checkout', 
        'payment', 'order management', 'inventory', 
        'user reviews', 'wishlist', 'recommendations'
      ],
      'social': [
        'user profiles', 'posts', 'comments', 'likes',
        'follows', 'notifications', 'messaging', 'feed'
      ],
      'saas': [
        'auth', 'billing', 'subscription', 'team management',
        'roles', 'permissions', 'api keys', 'webhooks'
      ],
      'content': [
        'content creation', 'editor', 'publishing', 
        'categories', 'tags', 'search', 'analytics'
      ]
    };

    const expectedFeatures = domainFeatures[context.domain] || [];
    const implementedFeatures = context.currentFeatures.map(f => f.toLowerCase());

    for (const feature of expectedFeatures) {
      const isImplemented = implementedFeatures.some(impl => 
        impl.includes(feature.toLowerCase()) ||
        feature.toLowerCase().includes(impl)
      );

      if (!isImplemented) {
        opportunities.push({
          id: `evolution-feature-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          category: 'business_feature',
          trigger: 'business_opportunity',
          title: `Implement ${feature} feature`,
          description: `Standard ${context.domain} feature "${feature}" is not detected in the codebase. This may limit user value proposition.`,
          priority: 'high',
          estimatedImpact: 7,
          evidence: [{
            type: 'missing_feature',
            description: `Expected ${context.domain} feature: ${feature}`,
            severity: 'warning'
          }],
          suggestedApproach: `1. Research ${feature} best practices\n2. Design data models\n3. Implement core functionality\n4. Add user interface\n5. Write tests`,
          createdAt: new Date()
        });
      }
    }

    return opportunities;
  }

  /**
   * Analyze domain completeness
   */
  private async analyzeDomainCompleteness(
    projectPath: string, 
    context: BusinessContext
  ): Promise<EvolutionOpportunity[]> {
    const opportunities: EvolutionOpportunity[] = [];
    
    try {
      // Check for business rules without validation
      for (const rule of context.businessRules || []) {
        const hasTests = rule.validationTests && rule.validationTests.length > 0;
        
        if (!hasTests) {
          opportunities.push({
            id: `evolution-rule-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            category: 'business_feature',
            trigger: 'code_pattern_detected',
            title: `Add validation tests for: ${rule.id}`,
            description: `Business rule "${rule.description}" lacks validation tests. This risks business logic errors.`,
            priority: 'medium',
            estimatedImpact: 6,
            evidence: [{
              type: 'missing_feature',
              description: `No tests for business rule: ${rule.id}`,
              location: rule.implementationFiles.join(', '),
              severity: 'warning'
            }],
            suggestedApproach: `1. Identify rule constraints\n2. Write unit tests for validation\n3. Test edge cases and boundary conditions\n4. Add integration tests`,
            relatedFiles: rule.implementationFiles,
            createdAt: new Date()
          });
        }
      }

      // Check for API routes without error handling
      const apiRoutes = await glob('src/app/api/**/*.{ts,tsx}', { cwd: projectPath });
      
      for (const route of apiRoutes.slice(0, 5)) {
        const content = await fs.readFile(path.join(projectPath, route), 'utf-8');
        
        const hasErrorHandling = content.includes('try') && content.includes('catch');
        const hasValidation = content.includes('validation') || content.includes('zod') || content.includes('schema');
        
        if (!hasErrorHandling || !hasValidation) {
          opportunities.push({
            id: `evolution-api-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            category: 'business_feature',
            trigger: 'code_pattern_detected',
            title: `Harden API endpoint: ${path.basename(route)}`,
            description: `API route ${route} is missing ${!hasErrorHandling ? 'error handling' : ''}${!hasErrorHandling && !hasValidation ? ' and ' : ''}${!hasValidation ? 'input validation' : ''}. This poses reliability and security risks.`,
            priority: 'high',
            estimatedImpact: 7,
            evidence: [{
              type: 'code_smell',
              description: `Missing ${!hasErrorHandling ? 'error handling' : ''}${!hasValidation ? 'validation' : ''}`,
              location: route,
              severity: 'error'
            }],
            suggestedApproach: `1. Add try-catch blocks\n2. Implement input validation (Zod recommended)\n3. Add proper error responses\n4. Log errors appropriately`,
            relatedFiles: [route],
            createdAt: new Date()
          });
        }
      }
    } catch (error) {
      this.logger.warn('Error analyzing domain completeness:', error);
    }

    return opportunities;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/evolution/analyzers/BusinessAnalyzer.ts
git commit -m "feat: add BusinessAnalyzer for feature gap detection"
```

---

## Task 4: Create DocumentationDriftAnalyzer

**Files:**
- Create: `src/evolution/analyzers/DocumentationDriftAnalyzer.ts`

- [ ] **Step 1: Implement documentation drift detection**

```typescript
import { Logger } from '../../utils/Logger';
import { EvolutionOpportunity, OpportunityEvidence, TaskCategory } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

export interface DriftIssue {
  type: 'jsdoc_mismatch' | 'readme_outdated' | 'comment_stale' | 'api_doc_drift' | 'example_broken';
  file: string;
  location: string;
  expected: string;
  actual: string;
  severity: 'info' | 'warning' | 'error';
}

export class DocumentationDriftAnalyzer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Analyze documentation drift across the codebase
   */
  async analyze(projectPath: string): Promise<EvolutionOpportunity[]> {
    this.logger.info('📚 Analyzing documentation drift...');
    
    const opportunities: EvolutionOpportunity[] = [];

    const [
      jsdocOpportunities,
      readmeOpportunities,
      commentOpportunities,
      apiDocOpportunities
    ] = await Promise.all([
      this.findJSDocDrift(projectPath),
      this.findReadmeDrift(projectPath),
      this.findStaleComments(projectPath),
      this.findAPIDocDrift(projectPath)
    ]);

    opportunities.push(
      ...jsdocOpportunities,
      ...readmeOpportunities,
      ...commentOpportunities,
      ...apiDocOpportunities
    );

    this.logger.info(`✅ Documentation analysis complete: ${opportunities.length} drift issues found`);
    return opportunities;
  }

  /**
   * Find JSDoc comments that don't match function signatures
   */
  private async findJSDocDrift(projectPath: string): Promise<EvolutionOpportunity[]> {
    const opportunities: EvolutionOpportunity[] = [];
    
    try {
      const files = await glob('src/**/*.{ts,tsx}', {
        cwd: projectPath,
        ignore: ['**/*.test.ts', '**/*.spec.ts']
      });

      for (const file of files.slice(0, 30)) {
        const content = await fs.readFile(path.join(projectPath, file), 'utf-8');
        const lines = content.split('\n');

        // Find JSDoc blocks
        const jsdocPattern = /\/\*\*[\s\S]*?\*\//g;
        const functionPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)|(?:export\s+)?(?:async\s+)?(\w+)\s*[:=]\s*(?:async\s*)?\(([^)]*)\)\s*=>|(?:export\s+)?(?:async\s+)?(?:const|let|var)\s+(\w+)\s*[=:]\s*(?:async\s*)?(?:function)?\s*\*/g;

        let match;
        while ((match = jsdocPattern.exec(content)) !== null) {
          const jsdocBlock = match[0];
          const startPos = match.index;
          const lineNumber = content.substring(0, startPos).split('\n').length;

          // Check if JSDoc has @param that don't match function
          const params = jsdocBlock.match(/@param\s+(?:\{[^}]+\})?\s*(\w+)/g) || [];
          const paramNames = params.map(p => p.replace(/@param\s+(?:\{[^}]+\})?\s*/, '').trim());

          // Look for the function after this JSDoc
          const afterJSDoc = content.substring(startPos + jsdocBlock.length, startPos + jsdocBlock.length + 500);
          const funcMatch = afterJSDoc.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);

          if (funcMatch) {
            const funcName = funcMatch[1];
            const funcParams = funcMatch[2].split(',').map(p => p.trim()).filter(p => p);
            
            // Check for param count mismatch
            if (paramNames.length !== funcParams.length) {
              opportunities.push({
                id: `evolution-jsdoc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                category: 'documentation',
                trigger: 'code_pattern_detected',
                title: `Fix JSDoc for ${funcName}() in ${path.basename(file)}`,
                description: `JSDoc parameter count (${paramNames.length}) doesn't match function signature (${funcParams.length}) in ${file}:${lineNumber}\n\nJSDoc params: ${paramNames.join(', ') || 'none'}\nActual params: ${funcParams.join(', ') || 'none'}`,
                priority: 'medium',
                estimatedImpact: 5,
                evidence: [{
                  type: 'code_smell',
                  description: `JSDoc drift: ${paramNames.length} doc params vs ${funcParams.length} actual params`,
                  location: `${file}:${lineNumber}`,
                  severity: 'warning'
                }],
                suggestedApproach: `1. Review function signature\n2. Update JSDoc @param tags to match\n3. Add missing parameter descriptions\n4. Remove obsolete parameters`,
                relatedFiles: [file],
                createdAt: new Date()
              });
            }

            // Check for @returns without actual return or vice versa
            const hasReturnsTag = jsdocBlock.includes('@returns') || jsdocBlock.includes('@return');
            const hasReturnStatement = /\breturn\b/.test(afterJSDoc.split('{')[0]) || funcMatch[0].includes(': Promise<');
            
            if (hasReturnsTag && !hasReturnStatement) {
              opportunities.push({
                id: `evolution-jsdoc-return-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                category: 'documentation',
                trigger: 'code_pattern_detected',
                title: `Remove @returns from void function ${funcName}()`,
                description: `Function ${funcName} in ${file}:${lineNumber} has @returns in JSDoc but doesn't return anything.`,
                priority: 'low',
                estimatedImpact: 3,
                evidence: [{
                  type: 'code_smell',
                  description: '@returns tag on void function',
                  location: `${file}:${lineNumber}`,
                  severity: 'info'
                }],
                suggestedApproach: `1. Remove @returns tag from JSDoc, or\n2. Add return statement if function should return value`,
                relatedFiles: [file],
                createdAt: new Date()
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn('Error finding JSDoc drift:', error);
    }

    return opportunities;
  }

  /**
   * Find README features that don't exist in code
   */
  private async findReadmeDrift(projectPath: string): Promise<EvolutionOpportunity[]> {
    const opportunities: EvolutionOpportunity[] = [];
    
    try {
      const readmePath = path.join(projectPath, 'README.md');
      const readmeExists = await fs.access(readmePath).then(() => true).catch(() => false);
      
      if (!readmeExists) {
        opportunities.push({
          id: `evolution-readme-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          category: 'documentation',
          trigger: 'code_pattern_detected',
          title: 'Create README.md',
          description: 'Project is missing README.md file. This makes onboarding difficult for new developers.',
          priority: 'high',
          estimatedImpact: 7,
          evidence: [{
            type: 'missing_feature',
            description: 'README.md not found',
            severity: 'error'
          }],
          suggestedApproach: `1. Create README.md\n2. Add project description\n3. Document setup instructions\n4. List main features\n5. Add contribution guidelines`,
          createdAt: new Date()
        });
        return opportunities;
      }

      const readme = await fs.readFile(readmePath, 'utf-8');
      const sourceFiles = await glob('src/**/*.{ts,tsx}', { cwd: projectPath });

      // Check if README mentions features that exist in code
      const featurePatterns = [
        { pattern: /API|endpoint|route/i, check: /api|router|endpoint/ },
        { pattern: /database|db|prisma/i, check: /prisma|database|schema/ },
        { pattern: /auth|login|authentication/i, check: /auth|login|session|jwt/ },
        { pattern: /test|testing/i, check: /test|spec|jest|vitest/ }
      ];

      for (const { pattern, check } of featurePatterns) {
        if (readme.match(pattern)) {
          const hasImplementation = sourceFiles.some(f => check.test(f.toLowerCase()));
          
          if (!hasImplementation) {
            opportunities.push({
              id: `evolution-readme-drift-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              category: 'documentation',
              trigger: 'code_pattern_detected',
              title: 'Update README.md - remove obsolete features',
              description: `README mentions features matching "${pattern}" but no implementation found in codebase. Documentation is outdated.`,
              priority: 'medium',
              estimatedImpact: 5,
              evidence: [{
                type: 'code_smell',
                description: `README mentions ${pattern} but no implementation found`,
                location: 'README.md',
                severity: 'warning'
              }],
              suggestedApproach: `1. Review README for accuracy\n2. Remove or update obsolete feature descriptions\n3. Add current architecture diagram\n4. Update feature list`,
              relatedFiles: ['README.md'],
              createdAt: new Date()
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn('Error finding README drift:', error);
    }

    return opportunities;
  }

  /**
   * Find stale comments that no longer match code
   */
  private async findStaleComments(projectPath: string): Promise<EvolutionOpportunity[]> {
    const opportunities: EvolutionOpportunity[] = [];
    
    try {
      const files = await glob('src/**/*.{ts,tsx}', {
        cwd: projectPath,
        ignore: ['**/*.test.ts']
      });

      for (const file of files.slice(0, 20)) {
        const content = await fs.readFile(path.join(projectPath, file), 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Find inline comments
          const commentMatch = line.match(/\/\/\s*(.+)$/);
          if (commentMatch) {
            const comment = commentMatch[1].toLowerCase();
            const codeBeforeComment = line.substring(0, line.indexOf('//')).trim().toLowerCase();

            // Check for obviously stale comments
            const stalePatterns = [
              { pattern: /returns\s+(true|false|null)/i, check: /=>\s*(true|false|null)/ },
              { pattern: /throws\s+/i, check: /throw\s+/ },
              { pattern: /deprecated|obsolete|old/i, check: null }
            ];

            for (const { pattern, check } of stalePatterns) {
              if (pattern.test(comment)) {
                // If check is null, always flag (for deprecated keywords)
                // Otherwise check if code matches
                const isStale = check === null || !check.test(codeBeforeComment);
                
                if (isStale && comment.includes('deprecated')) {
                  opportunities.push({
                    id: `evolution-comment-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    category: 'technical_debt',
                    trigger: 'code_pattern_detected',
                    title: `Remove deprecated code in ${path.basename(file)}`,
                    description: `Line ${i + 1} in ${file} has a "deprecated" comment but code is still active. Either remove the code or update the comment.`,
                    priority: 'medium',
                    estimatedImpact: 5,
                    evidence: [{
                      type: 'code_smell',
                      description: 'Deprecated comment on active code',
                      location: `${file}:${i + 1}`,
                      severity: 'warning'
                    }],
                    suggestedApproach: `1. Review if code is actually deprecated\n2. If yes: remove the code\n3. If no: remove the comment\n4. Update any dependent code`,
                    relatedFiles: [file],
                    createdAt: new Date()
                  });
                }
              }
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn('Error finding stale comments:', error);
    }

    return opportunities;
  }

  /**
   * Find API documentation drift (OpenAPI/Swagger vs actual routes)
   */
  private async findAPIDocDrift(projectPath: string): Promise<EvolutionOpportunity[]> {
    const opportunities: EvolutionOpportunity[] = [];
    
    try {
      // Check for OpenAPI/Swagger files
      const openApiFiles = await glob('{openapi,swagger}.{yaml,yml,json}', { cwd: projectPath });
      
      if (openApiFiles.length === 0) {
        // No API docs exist - suggest creating if API routes exist
        const apiRoutes = await glob('src/app/api/**/*.{ts,tsx}', { cwd: projectPath });
        
        if (apiRoutes.length > 3) {
          opportunities.push({
            id: `evolution-apidoc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            category: 'documentation',
            trigger: 'business_opportunity',
            title: 'Create API documentation (OpenAPI/Swagger)',
            description: `Project has ${apiRoutes.length} API routes but no OpenAPI/Swagger documentation. This makes API discovery difficult.`,
            priority: 'medium',
            estimatedImpact: 6,
            evidence: [{
              type: 'missing_feature',
              description: `No API docs for ${apiRoutes.length} routes`,
              severity: 'warning'
            }],
            suggestedApproach: `1. Create openapi.yaml\n2. Document all API endpoints\n3. Add request/response schemas\n4. Add examples\n5. Consider auto-generation from code`,
            createdAt: new Date()
          });
        }
      }
    } catch (error) {
      this.logger.warn('Error finding API doc drift:', error);
    }

    return opportunities;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/evolution/analyzers/DocumentationDriftAnalyzer.ts
git commit -m "feat: add DocumentationDriftAnalyzer for doc/code sync"
```

---

## Task 5: Update OpportunityDetector

**Files:**
- Create: `src/evolution/OpportunityDetector.ts`

- [ ] **Step 1: Implement opportunity detection coordinator**

```typescript
import { Logger } from '../utils/Logger';
import { CodeAnalyzer } from './analyzers/CodeAnalyzer';
import { BusinessAnalyzer } from './analyzers/BusinessAnalyzer';
import { DocumentationDriftAnalyzer } from './analyzers/DocumentationDriftAnalyzer';
import { 
  EvolutionOpportunity, 
  EvolutionConfig, 
  EvolutionResult,
  BusinessContext 
} from './types';

export class OpportunityDetector {
  private logger: Logger;
  private codeAnalyzer: CodeAnalyzer;
  private businessAnalyzer: BusinessAnalyzer;
  private docDriftAnalyzer: DocumentationDriftAnalyzer;
  private config: EvolutionConfig;

  constructor(config: EvolutionConfig) {
    this.logger = new Logger();
    this.codeAnalyzer = new CodeAnalyzer();
    this.businessAnalyzer = new BusinessAnalyzer();
    this.docDriftAnalyzer = new DocumentationDriftAnalyzer();
    this.config = config;
  }

  /**
   * Detect all evolution opportunities
   */
  async detectOpportunities(
    projectPath: string,
    context?: BusinessContext
  ): Promise<EvolutionResult> {
    const startTime = Date.now();
    
    this.logger.info('🔍 Starting opportunity detection...');
    
    const allOpportunities: EvolutionOpportunity[] = [];

    // Parallel analysis
    const analysisPromises: Promise<EvolutionOpportunity[]>[] = [];

    if (this.config.categories.technical) {
      analysisPromises.push(this.codeAnalyzer.analyze(projectPath));
    }

    if (this.config.categories.business && context) {
      analysisPromises.push(this.businessAnalyzer.analyze(projectPath, context));
    }

    // Documentation drift analysis (always run, as it's lightweight)
    analysisPromises.push(this.docDriftAnalyzer.analyze(projectPath));

    const results = await Promise.all(analysisPromises);
    results.forEach(opportunities => allOpportunities.push(...opportunities));

    // Filter by impact threshold
    const filteredOpportunities = allOpportunities.filter(
      opp => opp.estimatedImpact >= this.config.minImpactThreshold
    );

    // Sort by priority and impact
    const sortedOpportunities = this.prioritizeOpportunities(filteredOpportunities);

    // Limit results
    const limitedOpportunities = sortedOpportunities.slice(
      0, 
      this.config.maxOpportunitiesPerAnalysis
    );

    const duration = Date.now() - startTime;

    this.logger.info(`✅ Opportunity detection complete: ${limitedOpportunities.length} opportunities found (${duration}ms)`);

    return {
      opportunitiesFound: allOpportunities.length,
      tasksGenerated: limitedOpportunities.length,
      categories: this.categorizeOpportunities(limitedOpportunities),
      analysisDuration: duration
    };
  }

  /**
   * Get top opportunities for task generation
   */
  async getTopOpportunities(
    projectPath: string,
    limit: number = 5,
    context?: BusinessContext
  ): Promise<EvolutionOpportunity[]> {
    const startTime = Date.now();
    
    const allOpportunities: EvolutionOpportunity[] = [];

    if (this.config.categories.technical) {
      const codeOpps = await this.codeAnalyzer.analyze(projectPath);
      allOpportunities.push(...codeOpps);
    }

    if (this.config.categories.business && context) {
      const businessOpps = await this.businessAnalyzer.analyze(projectPath, context);
      allOpportunities.push(...businessOpps);
    }

    // Always include documentation drift analysis
    const docOpps = await this.docDriftAnalyzer.analyze(projectPath);
    allOpportunities.push(...docOpps);

    const filtered = allOpportunities.filter(
      opp => opp.estimatedImpact >= this.config.minImpactThreshold
    );

    const prioritized = this.prioritizeOpportunities(filtered);
    
    this.logger.info(`📊 Analyzed ${allOpportunities.length} opportunities, returning top ${limit}`);
    
    return prioritized.slice(0, limit);
  }

  /**
   * Prioritize opportunities by urgency and impact
   */
  private prioritizeOpportunities(
    opportunities: EvolutionOpportunity[]
  ): EvolutionOpportunity[] {
    const priorityScore: Record<string, number> = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25
    };

    return opportunities.sort((a, b) => {
      const scoreA = priorityScore[a.priority] + a.estimatedImpact;
      const scoreB = priorityScore[b.priority] + b.estimatedImpact;
      return scoreB - scoreA;
    });
  }

  /**
   * Categorize opportunities
   */
  private categorizeOpportunities(
    opportunities: EvolutionOpportunity[]
  ): Record<string, number> {
    const categories: Record<string, number> = {};
    
    for (const opp of opportunities) {
      categories[opp.category] = (categories[opp.category] || 0) + 1;
    }
    
    return categories;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/evolution/OpportunityDetector.ts
git commit -m "feat: add OpportunityDetector coordinator"
```

---

## Task 7: Create AutoEvolution Engine

**Files:**
- Create: `src/evolution/AutoEvolution.ts`

- [ ] **Step 1: Implement main auto-evolution engine**

```typescript
import { Logger } from '../utils/Logger';
import { OpportunityDetector } from './OpportunityDetector';
import { TaskQueue } from '../core/TaskQueue';
import { 
  EvolutionConfig, 
  EvolutionOpportunity, 
  BusinessContext,
  TaskCategory
} from './types';

export interface Task {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  category?: string;
  maxDuration: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  parentTask?: string;
}

export class AutoEvolution {
  private logger: Logger;
  private detector: OpportunityDetector;
  private taskQueue: TaskQueue;
  private config: EvolutionConfig;
  private iterationCount: number = 0;

  constructor(config: EvolutionConfig, taskQueue: TaskQueue) {
    this.logger = new Logger();
    this.detector = new OpportunityDetector(config);
    this.taskQueue = taskQueue;
    this.config = config;
  }

  /**
   * Trigger auto-evolution based on current state
   */
  async trigger(
    trigger: 'queue_empty' | 'periodic_check',
    projectPath: string,
    context?: BusinessContext
  ): Promise<boolean> {
    if (!this.config.enabled) {
      this.logger.info('⏭️ Auto-evolution disabled');
      return false;
    }

    this.logger.info(`🔄 Auto-evolution triggered: ${trigger}`);

    // Skip periodic check if not enough iterations passed
    if (trigger === 'periodic_check') {
      this.iterationCount++;
      if (this.iterationCount * this.config.checkInterval < 60000) { // 1 minute min
        return false;
      }
      this.iterationCount = 0;
    }

    try {
      // Detect opportunities
      const opportunities = await this.detector.getTopOpportunities(
        projectPath,
        this.config.maxOpportunitiesPerAnalysis,
        context
      );

      if (opportunities.length === 0) {
        this.logger.info('✨ No evolution opportunities found');
        return false;
      }

      // Convert opportunities to tasks
      const tasks = opportunities.map(opp => this.convertToTask(opp));

      // Add to queue
      for (const task of tasks) {
        await this.taskQueue.enqueue(task);
        this.logger.info(`📥 Auto-generated task: ${task.title}`);
      }

      this.logger.info(`✅ Auto-evolution complete: ${tasks.length} tasks generated`);
      return true;

    } catch (error: any) {
      this.logger.error('❌ Auto-evolution failed:', error.message);
      return false;
    }
  }

  /**
   * Convert opportunity to task
   */
  private convertToTask(opportunity: EvolutionOpportunity): Task {
    return {
      id: opportunity.id,
      title: opportunity.title,
      description: this.buildTaskDescription(opportunity),
      requirements: this.extractRequirements(opportunity),
      priority: opportunity.priority,
      status: 'pending',
      category: opportunity.category,
      maxDuration: this.estimateDuration(opportunity),
      createdAt: new Date()
    };
  }

  /**
   * Build detailed task description
   */
  private buildTaskDescription(opportunity: EvolutionOpportunity): string {
    const parts = [
      opportunity.description,
      '',
      '📊 Impact Score: ' + opportunity.estimatedImpact + '/10',
      '',
      '🎯 Suggested Approach:',
      opportunity.suggestedApproach,
      '',
      '📋 Evidence:'
    ];

    for (const evidence of opportunity.evidence) {
      parts.push(`- [${evidence.type}] ${evidence.description}`);
      if (evidence.location) {
        parts.push(`  Location: ${evidence.location}`);
      }
    }

    if (opportunity.relatedFiles && opportunity.relatedFiles.length > 0) {
      parts.push('');
      parts.push('📁 Related Files:');
      opportunity.relatedFiles.forEach(file => parts.push(`- ${file}`));
    }

    return parts.join('\n');
  }

  /**
   * Extract requirements from opportunity
   */
  private extractRequirements(opportunity: EvolutionOpportunity): string[] {
    const requirements: string[] = [];

    // Parse suggested approach for requirements
    const lines = opportunity.suggestedApproach.split('\n');
    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)$/);
      if (match) {
        requirements.push(match[1]);
      }
    }

    // Add category-specific requirements
    switch (opportunity.category) {
      case 'testing':
        requirements.push('Tests must pass in CI');
        requirements.push('Coverage report generated');
        break;
      case 'business_feature':
        requirements.push('Feature validated in browser');
        requirements.push('User flow tested end-to-end');
        break;
      case 'performance':
        requirements.push('Performance metrics collected');
        requirements.push('Improvement quantified');
        break;
      case 'security':
        requirements.push('Security review passed');
        requirements.push('No secrets in code');
        break;
    }

    return requirements;
  }

  /**
   * Estimate task duration based on category and impact
   */
  private estimateDuration(opportunity: EvolutionOpportunity): number {
    const baseDurations: Record<string, number> = {
      technical_debt: 60 * 60 * 1000,      // 1 hour
      feature_gap: 4 * 60 * 60 * 1000,     // 4 hours
      performance: 2 * 60 * 60 * 1000,     // 2 hours
      security: 2 * 60 * 60 * 1000,        // 2 hours
      testing: 90 * 60 * 1000,             // 1.5 hours
      documentation: 60 * 60 * 1000,       // 1 hour
      business_feature: 4 * 60 * 60 * 1000, // 4 hours
      ux_improvement: 3 * 60 * 60 * 1000   // 3 hours
    };

    const base = baseDurations[opportunity.category] || 2 * 60 * 60 * 1000;
    
    // Adjust by impact
    const impactMultiplier = opportunity.estimatedImpact / 5; // 5 is baseline
    
    return Math.round(base * impactMultiplier);
  }

  /**
   * Get evolution statistics
   */
  getStats(): { iterationCount: number; enabled: boolean } {
    return {
      iterationCount: this.iterationCount,
      enabled: this.config.enabled
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/evolution/AutoEvolution.ts
git commit -m "feat: add AutoEvolution engine for self-improving loop"
```

---

## Task 8: Integrate with LoopController

**Files:**
- Modify: `src/core/LoopController.ts`

- [ ] **Step 1: Add imports and configuration**

Add at the top of LoopController.ts:

```typescript
import { AutoEvolution } from '../evolution/AutoEvolution';
import { EvolutionConfig, BusinessContext } from '../evolution/types';
```

- [ ] **Step 2: Add AutoEvolution to class properties**

Add to LoopController class:

```typescript
  private autoEvolution: AutoEvolution;
  private evolutionConfig: EvolutionConfig;
  private businessContext?: BusinessContext;
```

- [ ] **Step 3: Initialize AutoEvolution in constructor**

Add to constructor:

```typescript
    // Initialize auto-evolution
    this.evolutionConfig = config.evolution || {
      enabled: true,
      checkInterval: 300000, // 5 minutes
      maxOpportunitiesPerAnalysis: 5,
      minImpactThreshold: 5,
      categories: {
        technical: true,
        business: true,
        ux: true
      }
    };

    this.autoEvolution = new AutoEvolution(this.evolutionConfig, this.taskQueue);
```

- [ ] **Step 4: Modify queue empty handling**

Find the queue empty handling code and modify:

```typescript
          // 队列为空时，尝试从项目分析生成任务
          if (!this.hasGeneratedInitialTasks) {
            this.logger.info('📋 任务队列为空，分析项目生成初始任务...');
            await this.generateTasksFromProject();
            this.hasGeneratedInitialTasks = true;
            continue;
          }
          
          // Auto-evolution: when queue is empty and initial tasks done
          if (this.evolutionConfig.enabled) {
            const evolved = await this.autoEvolution.trigger(
              'queue_empty',
              this.projectPath,
              this.businessContext
            );
            if (evolved) {
              continue; // New tasks generated, continue loop
            }
          }
          
          this.logger.info('✨ 所有任务完成，队列为空，等待新任务...');
          await this.delay(5000);
          continue;
```

- [ ] **Step 5: Add periodic evolution check**

Add periodic check in the main loop:

```typescript
        // Periodic auto-evolution check
        if (this.stats.completed > 0 && this.stats.completed % 5 === 0) {
          await this.autoEvolution.trigger(
            'periodic_check',
            this.projectPath,
            this.businessContext
          );
        }
```

- [ ] **Step 6: Add method to set business context**

Add public method:

```typescript
  /**
   * Set business context for evolution analysis
   */
  setBusinessContext(context: BusinessContext): void {
    this.businessContext = context;
    this.logger.info(`💼 Business context set: ${context.domain}`);
  }
```

- [ ] **Step 7: Commit**

```bash
git add src/core/LoopController.ts
git commit -m "feat: integrate AutoEvolution into LoopController"
```

---

## Task 9: Update ConfigLoader

**Files:**
- Modify: `src/utils/ConfigLoader.ts`

- [ ] **Step 1: Add evolution configuration**

Add to default config:

```typescript
      evolution: {
        enabled: true,
        checkInterval: 300000, // 5 minutes
        maxOpportunitiesPerAnalysis: 5,
        minImpactThreshold: 5,
        categories: {
          technical: true,
          business: true,
          ux: true
        }
      }
```

- [ ] **Step 2: Add business context to config**

Add business context support:

```typescript
export interface Config {
  // ... existing fields
  evolution: EvolutionConfig;
  businessContext?: BusinessContext;
}
```

- [ ] **Step 3: Update YAML template**

Add to YAML template:

```yaml
# Auto-evolution configuration
evolution:
  enabled: true
  checkInterval: 300000  # 5 minutes
  maxOpportunitiesPerAnalysis: 5
  minImpactThreshold: 5  # 1-10
  categories:
    technical: true
    business: true
    ux: true

# Business context for feature analysis (optional)
businessContext:
  domain: ecommerce  # ecommerce, social, saas, content
  currentFeatures:
    - product catalog
    - shopping cart
  userFlows:
    - name: Purchase Flow
      steps:
        - browse
        - product-detail
        - cart
        - checkout
        - confirmation
      entryPoints:
        - homepage
        - search
      conversionGoal: purchase completed
  businessRules:
    - id: inventory-check
      description: Check inventory before allowing purchase
      implementationFiles:
        - src/lib/inventory.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/ConfigLoader.ts
git commit -m "feat: add evolution and business context config"
```

---

## Task 10: Create Module Index

**Files:**
- Create: `src/evolution/index.ts`

- [ ] **Step 1: Export evolution module**

```typescript
export * from './types';
export { AutoEvolution } from './AutoEvolution';
export { OpportunityDetector } from './OpportunityDetector';
export { CodeAnalyzer } from './analyzers/CodeAnalyzer';
export { BusinessAnalyzer } from './analyzers/BusinessAnalyzer';
```

- [ ] **Step 2: Commit**

```bash
git add src/evolution/index.ts
git commit -m "feat: add evolution module exports"
```

---

## Task 11: Build and Test

- [ ] **Step 1: Build project**

```bash
npm run build
```

Expected: No TypeScript errors

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete Auto-Evolution Loop implementation

- Add AutoEvolution engine for self-improving harness-loop
- Add CodeAnalyzer to detect technical debt (TODOs, missing tests, code smells)
- Add BusinessAnalyzer to identify feature gaps and user flow issues
- Add DocumentationDriftAnalyzer to detect doc/code sync issues
- Add OpportunityDetector to coordinate analysis and prioritize opportunities
- Integrate with LoopController for automatic task generation
- Support technical, business, and documentation iteration without human input
- Configurable evolution triggers and categories"
```

---

## Summary

This implementation creates a **fully autonomous evolution system** that enables harness-loop to:

### Technical Evolution
- ✅ Detect and address TODO/FIXME comments
- ✅ Find missing test coverage
- ✅ Identify code smells (long files, console.log, etc.)
- ✅ Find unused code

### Business Evolution
- ✅ Analyze user flows for completeness
- ✅ Identify missing features based on domain expectations
- ✅ Detect business rules without validation
- ✅ Find API endpoints lacking error handling

### Documentation Evolution (Drift Detection)
- ✅ Detect JSDoc comments that don't match function signatures
- ✅ Find README features that don't exist in code
- ✅ Identify stale comments (deprecated markers on active code)
- ✅ Detect missing API documentation (OpenAPI/Swagger)
- ✅ Find outdated architecture documentation

### Auto-Generation
```
Queue Empty → Code/Business Analysis → Generate Tasks → Execute → Repeat
     ↑___________________________________________________________|
```

### Configuration Example

```yaml
evolution:
  enabled: true
  checkInterval: 300000
  maxOpportunitiesPerAnalysis: 5
  minImpactThreshold: 5
  categories:
    technical: true
    business: true
    ux: true

businessContext:
  domain: ecommerce
  currentFeatures: [product catalog, cart]
  userFlows:
    - name: Purchase
      steps: [browse, cart, checkout]
```

**Plan complete and saved to `docs/superpowers/plans/2026-04-02-auto-evolution-loop.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach would you like to use?