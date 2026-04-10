/**
 * Worker 类型，用于多维度分析
 */
export type WorkerType = 'business' | 'tech' | 'domain' | 'risk';
/**
 * Worker 的单个发现项
 */
export interface WorkerFinding {
    category: string;
    content: string;
    priority: 'high' | 'medium' | 'low';
}
/**
 * 单个 Worker 的输出结果
 */
export interface WorkerOutput {
    worker: WorkerType;
    confidence: number;
    findings: WorkerFinding[];
    questions: string[];
    rawNotes?: string;
}
/**
 * 综合所有 Worker 输出的结果
 */
export interface SynthesisResult {
    summary: string;
    business: {
        description: string;
        coreFeatures: Array<{
            name: string;
            priority: 'high' | 'medium' | 'low';
            description: string;
        }>;
    };
    technical: {
        stackRecommendation: {
            backend?: string;
            frontend?: string;
            database?: string;
            other: string[];
        };
        architectureNotes: string;
        directoryStructure: string;
    };
    risks: Array<{
        description: string;
        severity: 'high' | 'medium' | 'low';
        mitigation: string;
    }>;
    confidence: number;
    openQuestions: string[];
}
/**
 * 协调器配置
 */
export interface CoordinatorConfig {
    maxRetries: number;
    minConfidence: number;
    timeout: number;
    models: {
        research: string;
        synthesis: string;
        implementation: string;
        verification: string;
    };
}
/**
 * 验证结果
 */
export interface VerificationResult {
    valid: boolean;
    issues: string[];
    confidence: number;
}
/**
 * LLM 调用函数类型
 */
export type LLMCaller = (prompt: string, model?: string) => Promise<string>;
//# sourceMappingURL=types.d.ts.map