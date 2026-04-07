"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMErrorAnalyzer = void 0;
/**
 * Uses LLM to analyze complex errors that pattern matching can't handle
 */
class LLMErrorAnalyzer {
    constructor(llmCaller, maxTokens = 2000) {
        this.llmCaller = llmCaller;
        this.maxTokens = maxTokens;
    }
    /**
     * Analyze an error using LLM
     */
    async analyze(error, context = {}) {
        const prompt = this.buildAnalysisPrompt(error, context);
        const response = await this.llmCaller(prompt);
        return this.parseAnalysis(response);
    }
    /**
     * Build prompt for error analysis
     */
    buildAnalysisPrompt(error, context) {
        return `You are a DevOps expert analyzing build/test errors. 

Analyze this error and suggest fixes:

\`\`\`
${error}
\`\`\`

Context:
- Task type: ${context.taskType || 'unknown'}
- Project type: ${context.projectType || 'unknown'}
${context.filesChanged ? `- Files changed: ${context.filesChanged.join(', ')}` : ''}
${context.recentCommands ? `- Recent commands: ${context.recentCommands.join(', ')}` : ''}

Respond in this JSON format:
{
  "rootCause": "Clear explanation of what caused the error",
  "isFixable": true/false,
  "confidence": 0.0-1.0,
  "requiresHuman": true/false,
  "reasoning": "Step-by-step reasoning",
  "suggestedFixes": [
    {
      "type": "create_file|modify_file|run_command|install_dependency",
      "description": "Human-readable description",
      "priority": 1-10,
      "filePath": "path if applicable",
      "content": "file content if creating/modifying",
      "command": "shell command if applicable",
      "packageName": "npm package if applicable"
    }
  ]
}

Guidelines:
1. Only suggest fixes you're confident about (confidence > 0.7)
2. Prioritize file creation over modification
3. For missing dependencies, check if it's a devDependency or dependency
4. Set "requiresHuman" if the fix might be risky or ambiguous
5. Keep fixes minimal and focused`;
    }
    /**
     * Parse LLM response into structured analysis
     */
    parseAnalysis(response) {
        try {
            // Try to extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                rootCause: parsed.rootCause || 'Unknown',
                isFixable: parsed.isFixable ?? false,
                confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
                requiresHuman: parsed.requiresHuman ?? true,
                reasoning: parsed.reasoning || '',
                suggestedFixes: (parsed.suggestedFixes || []).map((fix) => ({
                    type: fix.type || 'run_command',
                    description: fix.description || 'Unknown fix',
                    priority: fix.priority || 5,
                    filePath: fix.filePath,
                    content: fix.content,
                    command: fix.command,
                    packageName: fix.packageName
                }))
            };
        }
        catch (error) {
            // Fallback: treat as unfixable
            return {
                rootCause: 'Failed to parse LLM analysis',
                isFixable: false,
                confidence: 0,
                requiresHuman: true,
                reasoning: `Parse error: ${error}`,
                suggestedFixes: []
            };
        }
    }
}
exports.LLMErrorAnalyzer = LLMErrorAnalyzer;
//# sourceMappingURL=ErrorAnalyzer.js.map