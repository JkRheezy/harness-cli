import { BusinessAnalysis } from '../../commands/types';
import { VerificationResult } from './types';
/**
 * 验证器 - 验证 BusinessAnalysis 的完整性和质量
 */
export declare class Verifier {
    private readonly minConfidence;
    /**
     * 验证 BusinessAnalysis
     */
    verify(analysis: BusinessAnalysis): VerificationResult;
    /**
     * 验证技术栈的完整性
     */
    private validateTechStack;
    /**
     * 递归计算目录结构节点总数
     */
    private countDirectoryNodes;
    /**
     * 生成反馈 Prompt 用于重新生成
     */
    generateFeedback(analysis: BusinessAnalysis, verification: VerificationResult): string;
}
//# sourceMappingURL=Verifier.d.ts.map