"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseWorker = void 0;
class BaseWorker {
    constructor(llmCaller, model) {
        this.llmCaller = llmCaller;
        this.model = model;
    }
    /**
     * 执行 Worker 分析
     */
    async execute(options) {
        const prompt = this.buildPrompt(options);
        const response = await this.llmCaller(prompt, this.model);
        return this.parseResponse(response);
    }
    /**
     * 构建包含完整上下文的 Prompt（Claude Code 风格）
     */
    buildPrompt(options) {
        return `${this.roleDescription}

## 项目上下文
<analysis_context>
  <project_name>${this.escapeXml(options.projectName)}</project_name>
  <template>${this.escapeXml(options.template)}</template>
  <overview>${this.escapeXml(options.overview)}</overview>
  <research_scope>${this.researchScope}</research_scope>
</analysis_context>

## 你的任务
${this.getTaskDescription()}

## 输出格式
必须严格使用以下 XML 格式输出，不要包含任何 XML 之外的解释：

<worker_output>
  <worker_id>${this.workerType}</worker_id>
  <confidence>0.0-1.0</confidence>
  <findings>
    <finding priority="high|medium|low">
      <category>类别名称</category>
      <content>详细内容</content>
    </finding>
    <!-- 可以包含多个 finding -->
  </findings>
  <questions>
    <!-- 如果对项目理解不够清晰，列出需要澄清的问题 -->
    <!-- 如果 confidence >= 0.7，可以为空 -->
  </questions>
  <raw_notes>思考过程（可选）</raw_notes>
</worker_output>

注意：
- confidence: 你对分析结果的确信程度（0-1之间的小数）
- 如果 confidence < 0.7，必须在 <questions> 中列出不清楚的地方
- 每个 finding 的 priority 表示该发现的重要性`;
    }
    /**
     * 解析 XML 响应为 WorkerOutput
     */
    parseResponse(response) {
        try {
            const workerId = this.extractXmlTag(response, 'worker_id');
            const confidence = parseFloat(this.extractXmlTag(response, 'confidence'));
            const findings = this.extractFindings(response);
            const questions = this.extractQuestions(response);
            const rawNotes = this.extractXmlTag(response, 'raw_notes') || undefined;
            // 如果没有提取到 worker_id 且没有 findings，视为解析失败
            if (!workerId && findings.length === 0) {
                throw new Error('No valid worker_id or findings found in response');
            }
            return {
                worker: (workerId || this.workerType),
                confidence: isNaN(confidence) ? 0.5 : Math.max(0, Math.min(1, confidence)),
                findings,
                questions,
                rawNotes
            };
        }
        catch (error) {
            // 解析失败时的降级处理
            return {
                worker: this.workerType,
                confidence: 0.5,
                findings: [{
                        category: 'parse_error',
                        content: 'Failed to parse response: ' + String(error),
                        priority: 'medium'
                    }],
                questions: ['Response format was invalid, need to retry'],
                rawNotes: response.slice(0, 500)
            };
        }
    }
    /**
     * 提取 XML 标签内容
     */
    extractXmlTag(xml, tag) {
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const match = xml.match(regex);
        return match ? match[1].trim() : '';
    }
    /**
     * 从 XML 提取 findings
     */
    extractFindings(xml) {
        const findings = [];
        const regex = /<finding\s+priority="(high|medium|low)">([\s\S]*?)<\/finding>/gi;
        let match;
        while ((match = regex.exec(xml)) !== null) {
            const priority = match[1];
            const content = match[2];
            const category = this.extractXmlTag(content, 'category') || 'general';
            const findingContent = this.extractXmlTag(content, 'content') || content.trim();
            findings.push({
                category,
                content: findingContent,
                priority
            });
        }
        return findings;
    }
    /**
     * 从 XML 提取 questions
     */
    extractQuestions(xml) {
        const questionsSection = this.extractXmlTag(xml, 'questions');
        if (!questionsSection)
            return [];
        const questions = [];
        const regex = /<question>([\s\S]*?)<\/question>/gi;
        let match;
        while ((match = regex.exec(questionsSection)) !== null) {
            const question = match[1].trim();
            if (question)
                questions.push(question);
        }
        return questions;
    }
    /**
     * 转义 XML 特殊字符
     */
    escapeXml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}
exports.BaseWorker = BaseWorker;
//# sourceMappingURL=BaseWorker.js.map