import { TelemetryProvider } from '../types';
import { randomUUID } from 'crypto';

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
export class LLMMetricsCollector {
  /**
   * Cost rates per 1K tokens by provider.
   * These are approximate rates and should be updated periodically.
   */
  private costRates: Record<string, number> = {
    'gpt-4': 0.03,
    'gpt-3.5-turbo': 0.002,
    'claude': 0.008,
    'kimi': 0.006
  };

  constructor(private telemetry: TelemetryProvider) {}

  /**
   * Record a complete LLM call with all metrics.
   * @param metrics - Complete metrics for the LLM call
   */
  recordCall(metrics: LLMCallMetrics): void {
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
    } else {
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
  estimateCost(provider: string, model: string, tokens: number): number {
    const rate = this.costRates[provider] || 0.01;
    return (tokens / 1000) * rate;
  }

  /**
   * Start a tracing span for an LLM call.
   * @param provider - LLM provider name
   * @param model - Model name
   * @returns Span object for tracing
   */
  startLLMSpan(provider: string, model: string) {
    const traceId = randomUUID();
    const spanId = randomUUID();
    return this.telemetry.startSpan('llm.call', { traceId, spanId });
  }
}
