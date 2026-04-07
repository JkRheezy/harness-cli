# Harness Telemetry System

## Overview

Harness includes a self-bootstrapping telemetry system for observing its own operation (Loop execution, LLM calls, Agent decisions) and providing the same capability to downstream projects.

## Architecture

```
TelemetryProvider (Abstract)
    ├── FileAdapter (Default) - JSONL files
    └── MemoryAdapter (Testing)
    └── LangSmithAdapter (Future - Optional SaaS)
```

## Quick Start

Telemetry is enabled by default with FileAdapter:

```bash
# View telemetry report
harness telemetry

# Watch real-time dashboard
harness telemetry --watch

# Custom telemetry directory
harness telemetry --dir ./custom/telemetry
```

## Metrics Collected

### Loop Metrics
- `loop.task.started` - Task execution started
- `loop.task.success` - Task completed successfully  
- `loop.task.failure` - Task failed
- `loop.task.duration` - Task execution time (timer)
- `loop.queue.depth` - Current queue depth (gauge)
- `loop.safety.check.triggered` - Safety check activated
- `loop.checkpoint.save.duration` - Checkpoint save time

### LLM Metrics
- `llm.tokens.prompt` - Prompt tokens used
- `llm.tokens.completion` - Completion tokens used
- `llm.tokens.total` - Total tokens used
- `llm.call.duration` - LLM call latency (timer)
- `llm.call.success` - Successful calls
- `llm.call.failure` - Failed calls
- `llm.cost.estimated` - Estimated cost (USD)

### Task Metrics
- `task.plan.generation.duration` - Plan generation time
- `task.plan.generation.failure` - Plan generation failures

## Configuration

### Downstream Projects

Add to your project's telemetry setup:

```typescript
import { FileAdapter, LoopMetricsCollector } from '../telemetry';

const telemetry = new FileAdapter({
  outputDir: '.harness/telemetry',
  maxFileSizeMB: 10,
  retentionDays: 7
});

const metrics = new LoopMetricsCollector(telemetry);
```

### Configuration Options

FileAdapter supports the following options:

```typescript
const telemetry = new FileAdapter({
  outputDir: '.harness/telemetry',     // Required: Where to store files
  maxFileSizeMB: 10,                   // Optional: Max file size (default: 10)
  retentionDays: 7                     // Optional: Days to keep files (default: 7)
});
```

## File Locations

Default telemetry files (rotated daily):
- `.harness/telemetry/metrics-YYYY-MM-DD.jsonl`
- `.harness/telemetry/spans-YYYY-MM-DD.jsonl`
- `.harness/telemetry/logs-YYYY-MM-DD.jsonl`

## Programmatic Usage

### Recording Custom Metrics

```typescript
import { FileAdapter } from 'harness-cli/telemetry';

const telemetry = new FileAdapter({ outputDir: '.harness/telemetry' });

// Counter
telemetry.counter('myapp.events.processed', 1, { type: 'order' });

// Gauge
telemetry.gauge('myapp.queue.size', 42);

// Timer
telemetry.timer('myapp.operation.duration', 1500);

// Histogram
telemetry.histogram('myapp.request.size', 1024);
```

### Distributed Tracing

```typescript
// Start a span
const span = telemetry.startSpan('myapp.operation');

// Add events
span.events.push({
  name: 'checkpoint.saved',
  timestamp: Date.now(),
  attributes: { checkpointId: '123' }
});

// End span
telemetry.endSpan(span, 'ok'); // or 'error'
```

### Logging

```typescript
telemetry.log('info', 'Processing started', { taskId: '123' });
telemetry.log('error', 'Processing failed', { error: err.message });
```

## API Reference

### TelemetryProvider

Abstract base class defining the telemetry interface.

#### Metrics
- `counter(name, value, tags?)` - Increment a counter
- `gauge(name, value, tags?)` - Record a gauge value
- `histogram(name, value, tags?)` - Record a histogram value
- `timer(name, durationMs, tags?)` - Record a timer value

#### Tracing
- `startSpan(name, parentContext?)` - Start a new span
- `endSpan(span, status?)` - End a span
- `addSpanEvent(span, name, attributes?)` - Add event to span

#### Logging
- `log(level, message, context?)` - Log a message

#### Lifecycle
- `flush()` - Flush pending writes
- `close()` - Close and cleanup

## Troubleshooting

### No telemetry files created
- Ensure the output directory is writable
- Check that telemetry.flush() is called before exit

### Missing metrics
- Telemetry uses async writes - call flush() before reading
- Check file rotation - metrics may be in a different day's file

### Large files
- Adjust `maxFileSizeMB` in FileAdapter config
- Implement log rotation outside of Harness

## Contributing

When adding new telemetry:

1. Use dot notation for metric names: `category.subcategory.metric`
2. Include relevant tags for filtering
3. Add documentation to this file
4. Write tests for new collectors
