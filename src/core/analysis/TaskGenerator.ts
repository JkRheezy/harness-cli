import { Gap, TargetArchitecture, BusinessTask, GapType } from './types';

/**
 * TaskGenerator converts gaps into actionable development tasks
 */
export class TaskGenerator {
  /**
   * Generate BusinessTask for each gap
   */
  generate(gaps: Gap[], target: TargetArchitecture): BusinessTask[] {
    return gaps.map(gap => this.generateFromGap(gap, target));
  }

  /**
   * Generate a single BusinessTask from a Gap
   */
  private generateFromGap(gap: Gap, target: TargetArchitecture): BusinessTask {
    const effort = this.estimateEffort(gap);
    const priority = this.gapToPriority(gap.severity);

    return {
      id: this.generateTaskId(gap),
      title: this.generateTitle(gap),
      description: this.generateDescription(gap, target),
      sourceGap: gap,
      requirements: this.generateRequirements(gap, target),
      suggestedApproach: this.generateSuggestedApproach(gap),
      acceptanceCriteria: this.generateAcceptanceCriteria(gap, target),
      priority,
      estimatedEffort: effort,
      maxDuration: this.calculateMaxDuration(effort),
      status: 'pending',
      createdAt: new Date()
    };
  }

  /**
   * Generate a unique task ID based on the gap
   */
  private generateTaskId(gap: Gap): string {
    return `task-${gap.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate task title based on gap type and target name
   */
  private generateTitle(gap: Gap): string {
    const typeLabels: Record<GapType, string> = {
      missing_agent: 'agent',
      missing_module: 'module',
      incomplete_module: 'module completion',
      missing_interface: 'interface',
      orphan_code: 'cleanup',
      doc_outdated: 'documentation update'
    };

    const typeLabel = typeLabels[gap.type] || 'component';

    switch (gap.type) {
      case 'missing_agent':
        return `Create ${gap.targetName} ${typeLabel}`;
      case 'missing_module':
        return `Implement ${gap.targetName} ${typeLabel}`;
      case 'incomplete_module':
        return `Complete ${gap.targetName} ${typeLabel}`;
      case 'missing_interface':
        return `Add ${gap.targetName} ${typeLabel}`;
      case 'orphan_code':
        return `Remove ${gap.targetName} ${typeLabel}`;
      case 'doc_outdated':
        return `Update ${gap.targetName} ${typeLabel}`;
      default:
        return `Fix ${gap.targetName}`;
    }
  }

  /**
   * Generate task description based on gap type and context
   */
  private generateDescription(gap: Gap, target: TargetArchitecture): string {
    const baseDescription = gap.targetDescription || 'No description available';

    switch (gap.type) {
      case 'missing_agent':
        return `Create the missing agent "${gap.targetName}". ${baseDescription}. ` +
          `This agent is defined in ${gap.specRef.document} but is not implemented.`;
      case 'missing_module':
        return `Implement the missing module "${gap.targetName}". ${baseDescription}. ` +
          `This module is specified in ${gap.specRef.document} but does not exist in the codebase.`;
      case 'incomplete_module':
        const missingItems = gap.evidence.missingItems || [];
        return `Complete the incomplete module "${gap.targetName}". ${baseDescription}. ` +
          `Missing items: ${missingItems.join(', ') || 'Unknown'}.`;
      case 'missing_interface':
        return `Implement the missing interface "${gap.targetName}". ${baseDescription}. ` +
          `Expected: ${gap.evidence.expected}, Actual: ${gap.evidence.actual}.`;
      case 'orphan_code':
        const existingItems = gap.evidence.existingItems || [];
        return `Remove orphan code "${gap.targetName}". ${baseDescription}. ` +
          `Unused files: ${existingItems.join(', ') || 'Unknown'}.`;
      case 'doc_outdated':
        return `Update outdated documentation for "${gap.targetName}". ${baseDescription}. ` +
          `The documentation does not match the current implementation.`;
      default:
        return `Address gap "${gap.targetName}": ${baseDescription}`;
    }
  }

  /**
   * Generate requirements from spec context
   */
  private generateRequirements(gap: Gap, target: TargetArchitecture): string[] {
    const requirements: string[] = [];

    switch (gap.type) {
      case 'missing_agent':
        // Find agent in target architecture
        const agent = target.agents.find(a => a.name === gap.targetName);
        if (agent) {
          requirements.push(`Implement agent "${agent.name}" with described responsibilities`);
          if (agent.responsibilities.length > 0) {
            requirements.push(`Support responsibilities: ${agent.responsibilities.join(', ')}`);
          }
          if (agent.skills.length > 0) {
            requirements.push(`Required skills: ${agent.skills.join(', ')}`);
          }
        } else {
          requirements.push(`Create agent "${gap.targetName}" based on specification`);
        }
        requirements.push(`Create expected files in appropriate location`);
        break;

      case 'missing_module':
        const module = target.modules.find(m => m.name === gap.targetName);
        if (module) {
          requirements.push(`Implement "${module.name}" module in ${module.layer} layer`);
          requirements.push(`Module description: ${module.description}`);
          if (module.exposedInterfaces.length > 0) {
            requirements.push(`Expose interfaces: ${module.exposedInterfaces.join(', ')}`);
          }
          if (module.dependencies.length > 0) {
            requirements.push(`Handle dependencies: ${module.dependencies.join(', ')}`);
          }
        } else {
          requirements.push(`Create module "${gap.targetName}" based on specification`);
        }
        requirements.push(`Create expected files in appropriate location`);
        break;

      case 'incomplete_module':
        const missingItems = gap.evidence.missingItems || [];
        requirements.push(`Complete the incomplete module "${gap.targetName}"`);
        if (missingItems.length > 0) {
          requirements.push(`Add missing items: ${missingItems.join(', ')}`);
        }
        requirements.push(`Ensure all expected interfaces are implemented`);
        break;

      case 'missing_interface':
        requirements.push(`Implement interface "${gap.targetName}"`);
        requirements.push(`Follow signature: ${gap.evidence.expected}`);
        requirements.push(`Ensure compatibility with existing code`);
        break;

      case 'orphan_code':
        const existingItems = gap.evidence.existingItems || [];
        requirements.push(`Remove unused code "${gap.targetName}"`);
        if (existingItems.length > 0) {
          requirements.push(`Review and remove: ${existingItems.join(', ')}`);
        }
        requirements.push(`Ensure no references remain in the codebase`);
        break;

      case 'doc_outdated':
        requirements.push(`Update documentation for "${gap.targetName}"`);
        requirements.push(`Align documentation with current implementation`);
        requirements.push(`Update ${gap.specRef.document} as needed`);
        break;

      default:
        requirements.push(`Address the identified gap: ${gap.targetName}`);
    }

    return requirements;
  }

  /**
   * Generate suggested approach for fixing the gap
   */
  private generateSuggestedApproach(gap: Gap): string[] {
    const approaches: string[] = [];

    switch (gap.type) {
      case 'missing_agent':
        approaches.push('Create agent file in the appropriate directory');
        approaches.push('Define agent class with required responsibilities');
        approaches.push('Implement required skills as methods');
        approaches.push('Add appropriate tests for the agent');
        break;

      case 'missing_module':
        approaches.push('Create module directory and main file');
        approaches.push('Define module exports and interfaces');
        approaches.push('Implement core functionality');
        approaches.push('Handle specified dependencies');
        approaches.push('Add unit tests for the module');
        break;

      case 'incomplete_module':
        approaches.push('Review current implementation');
        approaches.push('Identify missing functionality');
        approaches.push('Implement missing interfaces or methods');
        approaches.push('Update tests to cover new functionality');
        break;

      case 'missing_interface':
        approaches.push('Add the missing interface definition');
        approaches.push('Implement the interface in the appropriate class');
        approaches.push('Ensure type safety and correct signatures');
        break;

      case 'orphan_code':
        approaches.push('Identify all references to the orphan code');
        approaches.push('Safely remove unused files and code');
        approaches.push('Update imports and references');
        approaches.push('Run tests to ensure nothing breaks');
        break;

      case 'doc_outdated':
        approaches.push('Review current implementation');
        approaches.push('Update documentation to match implementation');
        approaches.push('Verify all examples are correct');
        break;

      default:
        approaches.push('Analyze the gap details');
        approaches.push('Implement necessary changes');
        approaches.push('Verify the fix with tests');
    }

    return approaches;
  }

  /**
   * Map gap severity to task priority
   */
  private gapToPriority(severity: Gap['severity']): 'P0' | 'P1' | 'P2' {
    const priorityMap: Record<Gap['severity'], 'P0' | 'P1' | 'P2'> = {
      blocking: 'P0',
      major: 'P1',
      minor: 'P2'
    };

    return priorityMap[severity];
  }

  /**
   * Estimate effort based on gap type
   */
  private estimateEffort(gap: Gap): 'small' | 'medium' | 'large' {
    switch (gap.type) {
      case 'missing_agent':
        return 'medium';
      case 'missing_module':
        return 'large';
      case 'incomplete_module':
        // Estimate based on missing items
        const missingCount = gap.evidence.missingItems?.length || 1;
        return missingCount <= 1 ? 'small' : missingCount <= 3 ? 'medium' : 'large';
      case 'missing_interface':
        return 'small';
      case 'orphan_code':
        return 'small';
      case 'doc_outdated':
        return 'small';
      default:
        return 'medium';
    }
  }

  /**
   * Calculate maxDuration in milliseconds based on effort
   */
  private calculateMaxDuration(effort: 'small' | 'medium' | 'large'): number {
    // Duration in hours converted to milliseconds
    const durationMap = {
      small: 4,      // 4 hours
      medium: 8,     // 8 hours
      large: 16      // 16 hours
    };

    return durationMap[effort] * 60 * 60 * 1000;
  }

  /**
   * Generate acceptance criteria from spec
   */
  private generateAcceptanceCriteria(gap: Gap, target: TargetArchitecture): string[] {
    const criteria: string[] = [];

    switch (gap.type) {
      case 'missing_agent':
        const agent = target.agents.find(a => a.name === gap.targetName);
        criteria.push(`Agent "${gap.targetName}" is created and functional`);
        if (agent && agent.responsibilities.length > 0) {
          criteria.push(`All responsibilities are implemented`);
        }
        criteria.push(`Agent passes all unit tests`);
        criteria.push(`Agent integrates with the system correctly`);
        break;

      case 'missing_module':
        const module = target.modules.find(m => m.name === gap.targetName);
        criteria.push(`Module "${gap.targetName}" is implemented`);
        if (module && module.acceptanceCriteria.length > 0) {
          criteria.push(...module.acceptanceCriteria);
        } else {
          criteria.push(`All expected interfaces are exposed`);
          criteria.push(`Module passes all unit tests`);
        }
        break;

      case 'incomplete_module':
        criteria.push(`All missing items are implemented`);
        criteria.push(`Module is complete according to specification`);
        criteria.push(`All tests pass`);
        break;

      case 'missing_interface':
        criteria.push(`Interface "${gap.targetName}" is implemented`);
        criteria.push(`Interface signature matches specification`);
        criteria.push(`Interface is properly typed`);
        break;

      case 'orphan_code':
        criteria.push(`Orphan code is removed`);
        criteria.push(`No references to removed code remain`);
        criteria.push(`All tests still pass`);
        break;

      case 'doc_outdated':
        criteria.push(`Documentation is updated`);
        criteria.push(`Documentation accurately reflects implementation`);
        break;

      default:
        criteria.push(`Gap is resolved`);
        criteria.push(`Tests pass`);
    }

    return criteria;
  }
}
