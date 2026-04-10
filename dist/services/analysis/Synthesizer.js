"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Synthesizer = void 0;
/**
 * 综合器 - 汇总所有 Worker 的输出结果
 */
class Synthesizer {
    constructor(llmCaller, model) {
        this.llmCaller = llmCaller;
        this.model = model;
    }
    /**
     * 综合 Worker 输出为统一结果
     */
    async synthesize(workerOutputs) {
        const prompt = this.buildSynthesisPrompt(workerOutputs);
        const response = await this.llmCaller(prompt, this.model);
        return this.parseSynthesisResponse(response);
    }
    /**
     * 构建综合 Prompt
     */
    buildSynthesisPrompt(workerOutputs) {
        const workersXml = workerOutputs.map(w => this.formatWorkerOutput(w)).join('\n');
        return `你是一名首席软件架构师，负责汇总多个分析师的研究结果并做出综合决策。

## 各维度分析结果
<worker_outputs>
${workersXml}
</worker_outputs>

## 你的任务
1. 综合所有分析结果，形成统一的项目理解
2. 识别并解决各维度之间的矛盾或冲突
3. 根据项目目标做出合理的权衡决策
4. 生成结构化的综合结果

## 输出格式
必须使用以下 XML 格式输出：

<synthesis_result>
  <summary>整体项目理解（100字以内）</summary>
  <business>
    <description>详细的业务描述（200-300字）</description>
    <core_features>
      <feature priority="high">
        <name>功能名称</name>
        <description>功能描述</description>
      </feature>
      <!-- 更多功能 -->
    </core_features>
  </business>
  <technical>
    <stack_recommendation>
      <backend>后端技术</backend>
      <frontend>前端技术（如有）</frontend>
      <database>数据库</database>
      <others>
        <item>其他技术1</item>
      </others>
    </stack_recommendation>
    <architecture_notes>架构要点说明</architecture_notes>
    <directory_structure>推荐的目录结构（树形）</directory_structure>
  </technical>
  <risks>
    <risk severity="high">
      <description>风险描述</description>
      <mitigation>缓解方案</mitigation>
    </risk>
    <!-- 更多风险 -->
  </risks>
  <confidence>0.0-1.0</confidence>
  <open_questions>仍需要澄清的问题（如有）</open_questions>
</synthesis_result>`;
    }
    /**
     * 格式化 Worker 输出为 XML
     */
    formatWorkerOutput(output) {
        const findingsXml = output.findings
            .map(f => `    <finding priority="${f.priority}">
      <category>${this.escapeXml(f.category)}</category>
      <content>${this.escapeXml(f.content)}</content>
    </finding>`)
            .join('\n');
        return `  <worker_output>
    <worker_id>${output.worker}</worker_id>
    <confidence>${output.confidence}</confidence>
    <findings>
${findingsXml}
    </findings>
    <questions>
      ${output.questions.map(q => `<question>${this.escapeXml(q)}</question>`).join('\n      ')}
    </questions>
  </worker_output>`;
    }
    /**
     * 解析综合响应
     */
    parseSynthesisResponse(response) {
        try {
            const summary = this.extractXmlTag(response, 'summary') || '';
            const confidence = parseFloat(this.extractXmlTag(response, 'confidence')) || 0.5;
            return {
                summary,
                business: {
                    description: this.extractBusinessDescription(response),
                    coreFeatures: this.extractCoreFeatures(response)
                },
                technical: {
                    stackRecommendation: this.extractStackRecommendation(response),
                    architectureNotes: this.extractXmlTag(response, 'architecture_notes') || '',
                    directoryStructure: this.extractXmlTag(response, 'directory_structure') || ''
                },
                risks: this.extractRisks(response),
                confidence: isNaN(confidence) ? 0.5 : Math.max(0, Math.min(1, confidence)),
                openQuestions: this.extractOpenQuestions(response)
            };
        }
        catch (error) {
            throw new Error(`Failed to parse synthesis response: ${error}`);
        }
    }
    /**
     * 提取业务描述
     */
    extractBusinessDescription(xml) {
        const businessSection = this.extractXmlTag(xml, 'business');
        return this.extractXmlTag(businessSection, 'description') || '';
    }
    /**
     * 提取核心功能
     */
    extractCoreFeatures(xml) {
        const businessSection = this.extractXmlTag(xml, 'business');
        const featuresSection = this.extractXmlTag(businessSection, 'core_features');
        const features = [];
        const regex = /<feature\s+priority="(high|medium|low)">([\s\S]*?)<\/feature>/gi;
        let match;
        while ((match = regex.exec(featuresSection)) !== null) {
            const priority = match[1];
            const content = match[2];
            const name = this.extractXmlTag(content, 'name') || '未命名功能';
            const description = this.extractXmlTag(content, 'description') || '';
            features.push({ name, priority, description });
        }
        return features;
    }
    /**
     * 提取技术栈推荐
     */
    extractStackRecommendation(xml) {
        const techSection = this.extractXmlTag(xml, 'technical');
        const stackSection = this.extractXmlTag(techSection, 'stack_recommendation');
        const others = [];
        const othersSection = this.extractXmlTag(stackSection, 'others');
        const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
        let itemMatch;
        while ((itemMatch = itemRegex.exec(othersSection)) !== null) {
            others.push(itemMatch[1].trim());
        }
        return {
            backend: this.extractXmlTag(stackSection, 'backend') || undefined,
            frontend: this.extractXmlTag(stackSection, 'frontend') || undefined,
            database: this.extractXmlTag(stackSection, 'database') || undefined,
            other: others
        };
    }
    /**
     * 提取风险
     */
    extractRisks(xml) {
        const risksSection = this.extractXmlTag(xml, 'risks');
        const risks = [];
        const regex = /<risk\s+severity="(high|medium|low)">([\s\S]*?)<\/risk>/gi;
        let match;
        while ((match = regex.exec(risksSection)) !== null) {
            const severity = match[1];
            const content = match[2];
            const description = this.extractXmlTag(content, 'description') || '';
            const mitigation = this.extractXmlTag(content, 'mitigation') || '';
            risks.push({ description, severity, mitigation });
        }
        return risks;
    }
    /**
     * 提取待澄清问题
     */
    extractOpenQuestions(xml) {
        const questionsText = this.extractXmlTag(xml, 'open_questions') || '';
        return questionsText.split('\n').map(q => q.trim()).filter(q => q.length > 0);
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
     * 转义 XML 特殊字符
     */
    escapeXml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}
exports.Synthesizer = Synthesizer;
//# sourceMappingURL=Synthesizer.js.map