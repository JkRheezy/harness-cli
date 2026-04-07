import { TelemetryProvider } from '../types';

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

export class LLMMetricsCollector {
  constructor(private telemetry: TelemetryProvider) {}

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

    // Cost estimation (simplified)
    const cost = this.estimateCost(metrics.provider, metrics.model, metrics.totalTokens);
    this.telemetry.counter('llm.cost.estimated', cost, tags);
  }

  private estimateCost(provider: string, model: string, tokens: number): number {
    // Simplified cost model (per 1K tokens)
    const rates: Record<string, number> = {
      'gpt-4': 0.03,
      'gpt-3.5-turbo': 0.002,
      'claude': 0.008,
      'kimi': 0.006
    };
    const rate = rates[provider] || 0.01;
    return (tokens / 1000) * rate;
  }

  startLLMSpan(provider: string, model: string) {
    return this.telemetry.startSpan('llm.call', {
      traceId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      spanId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
  }
}
