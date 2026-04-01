import { Rule, RuleContext, RuleViolation, RuleFix } from './types';
import * as path from 'path';

export interface PatternDefinition {
  pattern: string;
  message: string;
  fix?: RuleFix;
}

/**
 * Extract pattern and fix from rule markdown content
 * Looks for YAML code block like:
 * ```yaml
 * pattern: console\.log
 * message: Use logger instead
 * fix:
 *   instruction: Replace with logger
 *   replacement: logger.info()
 * ```
 */
export function extractPatternFromContent(content: string): PatternDefinition | null {
  // Find YAML code block with regex: /```ya?ml\n([\s\S]*?)```/
  const yamlBlockRegex = /```ya?ml\s*\n([\s\S]*?)```/;
  const match = content.match(yamlBlockRegex);
  
  if (!match) {
    return null;
  }
  
  const yamlContent = match[1];
  
  // Extract pattern (required)
  const patternMatch = yamlContent.match(/^pattern:\s*(.+)$/m);
  if (!patternMatch) {
    return null;
  }
  const pattern = patternMatch[1].trim();
  
  // Extract message (required)
  const messageMatch = yamlContent.match(/^message:\s*(.+)$/m);
  if (!messageMatch) {
    return null;
  }
  const message = messageMatch[1].trim();
  
  // Extract fix fields (optional) - parse line by line for robustness
  const fix: RuleFix = {};
  const lines = yamlContent.split('\n');
  let inFixBlock = false;
  
  for (const line of lines) {
    // Check if we're entering the fix block
    if (line.match(/^fix:\s*$/)) {
      inFixBlock = true;
      continue;
    }
    
    // Check if we're still in the fix block (indented lines)
    if (inFixBlock) {
      // Check if we've exited the fix block (no longer indented)
      if (line.length > 0 && !line.match(/^\s+/)) {
        inFixBlock = false;
        continue;
      }
      
      // Extract fix fields
      const instructionMatch = line.match(/^\s+instruction:\s*(.+)$/);
      if (instructionMatch) {
        fix.instruction = instructionMatch[1].trim();
      }
      
      const replacementMatch = line.match(/^\s+replacement:\s*(.+)$/);
      if (replacementMatch) {
        fix.replacement = replacementMatch[1].trim();
      }
      
      const exampleBeforeMatch = line.match(/^\s+example_before:\s*(.+)$/);
      if (exampleBeforeMatch) {
        fix.example_before = exampleBeforeMatch[1].trim();
      }
      
      const exampleAfterMatch = line.match(/^\s+example_after:\s*(.+)$/);
      if (exampleAfterMatch) {
        fix.example_after = exampleAfterMatch[1].trim();
      }
    }
  }
  
  const result: PatternDefinition = {
    pattern,
    message,
  };
  
  // Only return fix if at least one property is actually set
  if (fix.instruction || fix.replacement || fix.example_before || fix.example_after) {
    result.fix = fix;
  }
  
  return result;
}

/**
 * Match rule pattern against file content
 * Returns violations with fix information and capture groups
 */
export function matchPattern(rule: Rule, context: RuleContext): RuleViolation[] {
  const violations: RuleViolation[] = [];
  
  // Extract pattern definition from rule.content
  const patternDef = extractPatternFromContent(rule.content);
  if (!patternDef) {
    return violations;
  }
  
  // Check if rule should apply to this file
  if (!shouldApplyRule(rule, context.filePath, context.projectRoot)) {
    return violations;
  }
  
  // Create RegExp with 'g' flag
  let regex: RegExp;
  try {
    regex = new RegExp(patternDef.pattern, 'g');
  } catch (error) {
    console.warn(`[PatternMatcher] Invalid regex in rule "${rule.id}": ${patternDef.pattern}`);
    return violations;
  }
  
  const lines = context.fileContent.split('\n');
  
  // For each match in each line
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    let match: RegExpExecArray | null;
    
    // Reset lastIndex for each line to ensure proper matching
    regex.lastIndex = 0;
    
    while ((match = regex.exec(line)) !== null) {
      // Determine the fix to use (from pattern or from rule)
      const fix = patternDef.fix || rule.fix;
      
      // Determine if auto-fixable
      const autoFixable = rule.autoFixable && !!(patternDef.fix?.replacement || rule.fix?.replacement);
      
      // Create code snippet (trimmed, max 100 chars)
      let codeSnippet = line.trim();
      if (codeSnippet.length > 100) {
        codeSnippet = codeSnippet.substring(0, 100) + '...';
      }
      
      // Create match array copy for the violation
      const matchCopy = [...match] as RegExpMatchArray;
      matchCopy.index = match.index;
      
      const violation: RuleViolation = {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        filePath: context.filePath,
        line: lineIndex + 1, // 1-based line number
        column: (match.index ?? 0) + 1, // 1-based column number
        message: patternDef.message,
        fix,
        autoFixable,
        codeSnippet,
        match: matchCopy,
      };
      
      violations.push(violation);
      
      // Prevent infinite loop on zero-length matches
      if (match[0].length === 0) {
        regex.lastIndex++;
      }
    }
  }
  
  return violations;
}

/**
 * Check if rule applies to file based on paths glob patterns
 */
export function shouldApplyRule(rule: Rule, filePath: string, projectRoot: string): boolean {
  // If rule.paths is empty/undefined, return true
  if (!rule.paths || rule.paths.length === 0) {
    return true;
  }
  
  // Normalize paths to forward slashes for consistent cross-platform behavior
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const normalizedProjectRoot = projectRoot.replace(/\\/g, '/');
  
  // Calculate relative path from projectRoot
  // Use custom relative path calculation for cross-platform compatibility
  const normalizedRelativePath = calculateRelativePath(normalizedProjectRoot, normalizedFilePath);
  
  // Check if any pattern matches
  for (const pattern of rule.paths) {
    if (globToRegex(pattern).test(normalizedRelativePath)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate relative path from root to file (cross-platform)
 */
function calculateRelativePath(root: string, file: string): string {
  // Ensure both paths use forward slashes
  root = root.replace(/\\/g, '/');
  file = file.replace(/\\/g, '/');
  
  // Remove trailing slashes from root
  root = root.replace(/\/$/, '');
  
  // If file starts with root, remove it
  if (file.startsWith(root + '/')) {
    return file.substring(root.length + 1);
  }
  
  // If they're the same
  if (file === root) {
    return '';
  }
  
  // Otherwise use path.relative as fallback
  return path.relative(root, file).replace(/\\/g, '/');
}

// Convert glob pattern to regex
// **/ becomes (?:.*/)* which matches zero or more directory levels
// ** becomes .* which matches anything including slashes
// * becomes [^/]* which matches within single directory
// dots are escaped
function globToRegex(pattern: string): RegExp {
  // Use placeholders to avoid conflicts during replacements
  let regexPattern = pattern
    .replace(/\*\*\//g, '{{GLOBSTAR_SLASH}}')  // **/ placeholder
    .replace(/\*\*/g, '{{GLOBSTAR}}');          // ** placeholder
  
  // Escape regex special characters (do this before handling single *, but not {} which are used in placeholders)
  regexPattern = regexPattern.replace(/[.+?^$()|[\]\\]/g, '\\$&');
  
  // Handle single * (match within single directory level)
  regexPattern = regexPattern.replace(/\*/g, '[^/]*');
  
  // Replace placeholders with actual regex
  // {{GLOBSTAR_SLASH}} matches zero or more directory levels (including slashes)
  regexPattern = regexPattern
    .replace(/\{\{GLOBSTAR_SLASH\}\}/g, '(?:.*/)*')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');
  
  // Ensure the pattern matches the full path
  regexPattern = `^${regexPattern}$`;
  
  return new RegExp(regexPattern);
}
