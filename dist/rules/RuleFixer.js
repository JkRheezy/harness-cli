"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleFixer = void 0;
/**
 * RuleFixer applies automatic fixes to rule violations.
 *
 * Implements the OpenAI Harness paradigm:
 * - Error messages include fix instructions (not just WHAT is wrong, but HOW to fix)
 * - Supports capture group replacement ($1, $2, etc.)
 * - Processes fixes from bottom-to-top to preserve line numbers
 */
class RuleFixer {
    constructor(options = { dryRun: false }) {
        this.options = options;
    }
    /**
     * Apply fixes to file content
     * @param fileContent - The original file content
     * @param violations - List of violations to fix
     * @returns FixResult with the fixed code and applied/failed fixes
     */
    async fixFile(fileContent, violations) {
        // Validate input violations
        for (const v of violations) {
            if (!v.ruleId) {
                console.warn('Skipping violation without ruleId');
                continue;
            }
        }
        const lines = fileContent.split('\n');
        const appliedFixes = [];
        const failedFixes = [];
        // Filter to only auto-fixable violations with fixes
        const fixableViolations = violations.filter((v) => v.autoFixable && v.fix?.replacement !== undefined);
        if (fixableViolations.length === 0) {
            return {
                success: true,
                partial: false,
                fixedCode: this.options.dryRun ? undefined : fileContent,
                appliedFixes: [],
                failedFixes: [],
            };
        }
        // Sort violations by line number in descending order (bottom to top)
        // This ensures that line numbers remain valid as we make replacements
        const sortedViolations = [...fixableViolations].sort((a, b) => {
            const lineA = a.line ?? 0;
            const lineB = b.line ?? 0;
            if (lineA !== lineB) {
                return lineB - lineA; // Descending by line
            }
            // For same line, sort by column descending (right to left)
            return (b.column ?? 0) - (a.column ?? 0);
        });
        // Create a working copy of lines if we're actually applying fixes
        const workingLines = this.options.dryRun ? lines : [...lines];
        for (const violation of sortedViolations) {
            try {
                const result = this.applyFix(workingLines, violation);
                if (result.success) {
                    appliedFixes.push({
                        line: violation.line ?? 0,
                        ruleId: violation.ruleId,
                        original: result.original,
                        replacement: result.replacement,
                    });
                }
                else {
                    failedFixes.push({
                        line: violation.line ?? 0,
                        ruleId: violation.ruleId,
                        reason: result.reason ?? 'Unknown error',
                    });
                }
            }
            catch (error) {
                failedFixes.push({
                    line: violation.line ?? 0,
                    ruleId: violation.ruleId,
                    reason: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        // Sort applied fixes back to ascending order for reporting
        appliedFixes.sort((a, b) => a.line - b.line);
        failedFixes.sort((a, b) => a.line - b.line);
        return {
            success: failedFixes.length === 0,
            partial: appliedFixes.length > 0 && failedFixes.length > 0,
            fixedCode: this.options.dryRun ? undefined : workingLines.join('\n'),
            appliedFixes,
            failedFixes,
        };
    }
    /**
     * Apply a single fix to the working lines
     * @param lines - Array of file lines (modified in place)
     * @param violation - The violation to fix
     * @returns Result of the fix operation
     */
    applyFix(lines, violation) {
        const { line, column, fix, match } = violation;
        if (!fix?.replacement) {
            return { success: false, reason: 'No replacement specified' };
        }
        if (line === undefined) {
            return { success: false, reason: 'No line number specified for fix' };
        }
        const lineIndex = line - 1; // Convert to 0-based index
        if (lineIndex < 0 || lineIndex >= lines.length) {
            return { success: false, reason: `Line ${line} is out of range` };
        }
        const originalLine = lines[lineIndex];
        let replacement = fix.replacement;
        // Process capture group references ($1, $2, etc.) and special patterns
        if (match) {
            replacement = this.processCaptureGroups(replacement, match);
        }
        let newLine;
        let original;
        // Determine if we're doing partial line replacement or full line replacement
        if (match && match.index !== undefined) {
            // Use match.index directly (0-based from regex match)
            const matchStart = match.index;
            const matchEnd = matchStart + match[0].length;
            original = originalLine.substring(matchStart, matchEnd);
            newLine =
                originalLine.substring(0, matchStart) +
                    replacement +
                    originalLine.substring(matchEnd);
        }
        else if (column !== undefined) {
            // Fallback: use column to determine match position
            const columnIndex = column - 1; // Convert to 0-based
            const matchStart = columnIndex;
            // Estimate match end based on replacement length as approximation
            const matchEnd = matchStart + (match?.[0].length ?? replacement.length);
            original = originalLine.substring(matchStart, matchEnd);
            newLine =
                originalLine.substring(0, matchStart) +
                    replacement +
                    originalLine.substring(matchEnd);
        }
        else {
            // Full line replacement
            original = originalLine;
            newLine = replacement;
        }
        // Apply the fix
        lines[lineIndex] = newLine;
        return {
            success: true,
            original,
            replacement,
        };
    }
    /**
     * Process capture group references in replacement string
     * @param replacement - The replacement string with $1, $2, etc.
     * @param match - The RegExp match array
     * @returns Processed replacement string
     */
    processCaptureGroups(replacement, match) {
        let result = replacement;
        // Step 1: Handle $$ escape sequence first (convert to temporary placeholder)
        // This prevents interference with capture group processing
        const dollarPlaceholder = '\x00DOLLAR\x00';
        result = result.replace(/\$\$/g, dollarPlaceholder);
        // Step 2: Handle escaped dollar signs \$ (convert to temporary placeholder)
        result = result.replace(/\\\$/g, dollarPlaceholder);
        // Step 3: Handle special replacement patterns ($&, $0)
        // These are processed before capture groups to avoid conflicts
        result = result
            .replace(/\$&/g, match[0]) // Replace $& with entire match
            .replace(/\$0/g, match[0]); // Support $0 as alias for entire match
        // Step 4: Replace $1, $2, etc. with capture groups
        // Process in reverse order to handle $10 before $1
        for (let i = match.length - 1; i >= 1; i--) {
            const captureGroup = match[i] ?? '';
            const placeholder = `$${i}`;
            result = result.split(placeholder).join(captureGroup);
        }
        // Step 5: Restore temporary placeholders as literal dollar signs
        result = result.replace(new RegExp(dollarPlaceholder, 'g'), '$');
        return result;
    }
    /**
     * Generate human-readable fix report
     * @param violations - List of violations to report
     * @returns Formatted report string
     */
    generateFixReport(violations) {
        if (violations.length === 0) {
            return 'No violations found.\n';
        }
        const lines = [];
        lines.push('='.repeat(60));
        lines.push('FIX REPORT');
        lines.push('='.repeat(60));
        lines.push('');
        // Group by auto-fixable vs manual
        const autoFixable = violations.filter((v) => v.autoFixable);
        const manualFix = violations.filter((v) => !v.autoFixable);
        // Auto-fixable section
        lines.push(`🛠️  Auto-fixable Issues (${autoFixable.length}):`);
        lines.push('-'.repeat(40));
        if (autoFixable.length === 0) {
            lines.push('  None');
        }
        else {
            for (const v of autoFixable) {
                const location = v.line ? `:${v.line}${v.column ? `:${v.column}` : ''}` : '';
                lines.push(`  [${v.severity.toUpperCase()}] ${v.ruleId}${location}`);
                lines.push(`    ${v.message}`);
                if (v.fix?.instruction) {
                    lines.push(`    Fix: ${v.fix.instruction}`);
                }
                if (v.fix?.example_before && v.fix?.example_after) {
                    lines.push(`    Example: "${v.fix.example_before}" → "${v.fix.example_after}"`);
                }
                lines.push('');
            }
        }
        lines.push('');
        // Manual fix section
        lines.push(`✋ Manual Fix Required (${manualFix.length}):`);
        lines.push('-'.repeat(40));
        if (manualFix.length === 0) {
            lines.push('  None');
        }
        else {
            for (const v of manualFix) {
                const location = v.line ? `:${v.line}${v.column ? `:${v.column}` : ''}` : '';
                lines.push(`  [${v.severity.toUpperCase()}] ${v.ruleId}${location}`);
                lines.push(`    ${v.message}`);
                if (v.fix?.instruction) {
                    lines.push(`    How to fix: ${v.fix.instruction}`);
                }
                if (v.codeSnippet) {
                    lines.push(`    Code: ${v.codeSnippet}`);
                }
                lines.push('');
            }
        }
        lines.push('');
        lines.push('='.repeat(60));
        lines.push(`Summary: ${autoFixable.length} auto-fixable, ${manualFix.length} require manual fix`);
        lines.push('='.repeat(60));
        return lines.join('\n');
    }
    /**
     * Check if all violations can be auto-fixed
     * @param violations - List of violations to check
     * @returns true if all violations are auto-fixable
     */
    canAutoFixAll(violations) {
        if (violations.length === 0) {
            return true;
        }
        return violations.every((v) => v.autoFixable);
    }
    /**
     * Count auto-fixable vs manual fix violations
     * @param violations - List of violations to count
     * @returns Object with counts
     */
    countAutoFixable(violations) {
        let autoFixable = 0;
        let manualFix = 0;
        for (const v of violations) {
            if (v.autoFixable) {
                autoFixable++;
            }
            else {
                manualFix++;
            }
        }
        return { autoFixable, manualFix };
    }
}
exports.RuleFixer = RuleFixer;
//# sourceMappingURL=RuleFixer.js.map