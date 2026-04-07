import { TelemetryProvider } from '../types';
/**
 * Metrics for a single LLM API call.
 */
export interface LLMCallMetrics {
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    durationMs: number;
    success: boolean;
    errorType?: string;
}
/**
 * Collects metrics for LLM API calls.
 * Tracks token usage, latency, success rates, and estimated costs.
 */
export declare class LLMMetricsCollector {
    private telemetry;
    /**
     * Cost rates per 1K tokens by provider.
     * These are approximate rates and should be updated periodically.
     */
    private costRates;
    constructor(telemetry: TelemetryProvider);
    /**
     * Record a complete LLM call with all metrics.
     * @param metrics - Complete metrics for the LLM call
     */
    recordCall(metrics: LLMCallMetrics): void;
    /**
     * Estimate the cost of an LLM call based on token usage.
     * @param provider - LLM provider name
     * @param model - Model name
     * @param tokens - Total token count
     * @returns Estimated cost in USD
     */
    estimateCost(provider: string, model: string, tokens: number): number;
    /**
     * Start a tracing span for an LLM call.
     * @param provider - LLM provider name
     * @param model - Model name
     * @returns Span object for tracing
     */
    startLLMSpan(provider: string, model: string): import("../types").Span;
}
//# sourceMappingURL=LLMMetricsCollector.d.ts.map