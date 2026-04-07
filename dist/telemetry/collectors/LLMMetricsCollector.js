"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMMetricsCollector = void 0;
const crypto_1 = require("crypto");
/**
 * Collects metrics for LLM API calls.
 * Tracks token usage, latency, success rates, and estimated costs.
 */
class LLMMetricsCollector {
    constructor(telemetry) {
        this.telemetry = telemetry;
        /**
         * Cost rates per 1K tokens by provider.
         * These are approximate rates and should be updated periodically.
         */
        this.costRates = {
            'gpt-4': 0.03,
            'gpt-3.5-turbo': 0.002,
            'claude': 0.008,
            'kimi': 0.006
        };
    }
    /**
     * Record a complete LLM call with all metrics.
     * @param metrics - Complete metrics for the LLM call
     */
    recordCall(metrics) {
        const tags = {
            provider: metrics.provider,
            model: metrics.model,
            status: metrics.success ? 'success' : 'failure'
        };
        // Token usage
        this.telemetry.counter('llm.tokens.prompt', metrics.promptTokens, tags);
        this.telemetry.counter('llm.tokens.completion', metrics.completionTokens, tags);
        this.telemetry.counter('llm.tokens.total', metrics.totalTokens, tags);
        // Latency
        this.telemetry.timer('llm.call.duration', metrics.durationMs, tags);
        // Success/Failure
        if (metrics.success) {
            this.telemetry.counter('llm.call.success', 1, tags);
        }
        else {
            this.telemetry.counter('llm.call.failure', 1, {
                ...tags,
                errorType: metrics.errorType || 'unknown'
            });
        }
        // Cost estimation
        const cost = this.estimateCost(metrics.provider, metrics.model, metrics.totalTokens);
        this.telemetry.counter('llm.cost.estimated', cost, tags);
    }
    /**
     * Estimate the cost of an LLM call based on token usage.
     * @param provider - LLM provider name
     * @param model - Model name
     * @param tokens - Total token count
     * @returns Estimated cost in USD
     */
    estimateCost(provider, model, tokens) {
        const rate = this.costRates[provider] || 0.01;
        return (tokens / 1000) * rate;
    }
    /**
     * Start a tracing span for an LLM call.
     * @param provider - LLM provider name
     * @param model - Model name
     * @returns Span object for tracing
     */
    startLLMSpan(provider, model) {
        const traceId = (0, crypto_1.randomUUID)();
        const spanId = (0, crypto_1.randomUUID)();
        return this.telemetry.startSpan('llm.call', { traceId, spanId });
    }
}
exports.LLMMetricsCollector = LLMMetricsCollector;
//# sourceMappingURL=LLMMetricsCollector.js.map