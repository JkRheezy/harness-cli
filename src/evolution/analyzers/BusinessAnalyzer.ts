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

  private async analyzeUserFlows(
    projectPath: string, 
    userFlows: UserFlow[]
  ): Promise<EvolutionOpportunity[]> {
    const opportunities: EvolutionOpportunity[] = [];
    
    try {
      const pages = await glob('src/app/**/page.{tsx,ts}', { cwd: projectPath });
      const routes = await glob('src/pages/**/*.{tsx,ts}', { cwd: projectPath });
      const allFiles = [...pages, ...routes];

      for (const flow of userFlows) {
        const missingSteps: string[] = [];
        
        for (const step of flow.steps) {
          const stepImplemented = allFiles.some(file => {
            const fileLower = file.toLowerCase();
            const stepLower = step.toLowerCase().replace(/\s+/g, '');
            return fileLower.includes(stepLower);
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
            description: `User flow "${flow.name}" is missing ${missingSteps.length} steps: ${missingSteps.join(', ')}`,
            priority: 'high',
            estimatedImpact: 8,
            evidence: [{
              type: 'user_flow_gap',
              description: `Missing steps: ${missingSteps.join(', ')}`,
              severity: 'error'
            }],
            suggestedApproach: `1. Create pages for missing steps\n2. Implement navigation\n3. Add state management`,
            createdAt: new Date()
          });
        }
      }
    } catch (error) {
      this.logger.warn('Error analyzing user flows:', error);
    }

    return opportunities;
  }

  private async findFeatureGaps(
    projectPath: string, 
    context: BusinessContext
  ): Promise<EvolutionOpportunity[]> {
    const opportunities: EvolutionOpportunity[] = [];
    
    const domainFeatures: Record<string, string[]> = {
      'ecommerce': [
        'product catalog', 'shopping cart', 'checkout', 
        'payment', 'order management', 'inventory', 'user reviews'
      ],
      'social': [
        'user profiles', 'posts', 'comments', 'likes',
        'follows', 'notifications', 'messaging'
      ],
      'saas': [
        'auth', 'billing', 'subscription', 'team management',
        'roles', 'permissions', 'api keys'
      ]
    };

    const expectedFeatures = domainFeatures[context.domain] || [];
    const implementedFeatures = context.currentFeatures.map(f => f.toLowerCase());

    for (const feature of expectedFeatures) {
      const isImplemented = implementedFeatures.some(impl => 
        impl.includes(feature.toLowerCase())
      );

      if (!isImplemented) {
        opportunities.push({
          id: `evolution-feature-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          category: 'business_feature',
          trigger: 'business_opportunity',
          title: `Implement ${feature} feature`,
          description: `Standard ${context.domain} feature "${feature}" is not detected.`,
          priority: 'high',
          estimatedImpact: 7,
          evidence: [{
            type: 'missing_feature',
            description: `Expected ${context.domain} feature: ${feature}`,
            severity: 'warning'
          }],
          suggestedApproach: `1. Research ${feature} best practices\n2. Design data models\n3. Implement core functionality`,
          createdAt: new Date()
        });
      }
    }

    return opportunities;
  }

  private async analyzeDomainCompleteness(
    projectPath: string, 
    context: BusinessContext
  ): Promise<EvolutionOpportunity[]> {
    const opportunities: EvolutionOpportunity[] = [];
    
    try {
      for (const rule of context.businessRules || []) {
        const hasTests = rule.validationTests && rule.validationTests.length > 0;
        
        if (!hasTests) {
          opportunities.push({
            id: `evolution-rule-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            category: 'business_feature',
            trigger: 'code_pattern_detected',
            title: `Add validation tests for: ${rule.id}`,
            description: `Business rule "${rule.description}" lacks validation tests.`,
            priority: 'medium',
            estimatedImpact: 6,
            evidence: [{
              type: 'missing_feature',
              description: `No tests for business rule: ${rule.id}`,
              location: rule.implementationFiles.join(', '),
              severity: 'warning'
            }],
            suggestedApproach: `1. Identify rule constraints\n2. Write unit tests`,
            relatedFiles: rule.implementationFiles,
            createdAt: new Date()
          });
        }
      }

      const apiRoutes = await glob('src/app/api/**/*.{ts,tsx}', { cwd: projectPath });
      
      for (const route of apiRoutes.slice(0, 5)) {
        const content = await fs.readFile(path.join(projectPath, route), 'utf-8');
        
        const hasErrorHandling = content.includes('try') && content.includes('catch');
        const hasValidation = content.includes('zod') || content.includes('validation');
        
        if (!hasErrorHandling || !hasValidation) {
          opportunities.push({
            id: `evolution-api-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            category: 'business_feature',
            trigger: 'code_pattern_detected',
            title: `Harden API endpoint: ${path.basename(route)}`,
            description: `API route ${route} missing ${!hasErrorHandling ? 'error handling' : ''} ${!hasValidation ? 'validation' : ''}`,
            priority: 'high',
            estimatedImpact: 7,
            evidence: [{
              type: 'code_smell',
              description: `Missing ${!hasErrorHandling ? 'error handling' : ''} ${!hasValidation ? 'validation' : ''}`,
              location: route,
              severity: 'error'
            }],
            suggestedApproach: `1. Add try-catch blocks\n2. Implement input validation`,
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
