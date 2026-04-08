import { IndexedFileAdapter, TelemetryServer } from '../';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Telemetry System Integration', () => {
  let adapter: IndexedFileAdapter;
  let server: TelemetryServer;
  let tempDir: string;
  const PORT = 19999;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-int-'));
    adapter = new IndexedFileAdapter({
      outputDir: tempDir,
      persistIntervalMs: 100
    });
    server = new TelemetryServer({ adapter, port: PORT });
    await server.start();
  });

  afterEach(async () => {
    try {
      await server.stop();
    } catch (e) {
      // ignore
    }
    try {
      await adapter.close();
    } catch (e) {
      // ignore
    }
    try {
      fs.rmSync(tempDir, { recursive: true });
    } catch (e) {
      // ignore
    }
    // 等待端口释放
    await new Promise(r => setTimeout(r, 100));
  });

  function httpGet(url: string): Promise<{ status: number; data: any; contentType?: string }> {
    return new Promise((resolve, reject) => {
      http.get(url, (res) => {
        let data = '';
        const contentType = res.headers['content-type'] || '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          let parsedData: any = data;
          if (contentType.includes('application/json') && data) {
            try {
              parsedData = JSON.parse(data);
            } catch {
              parsedData = data;
            }
          }
          resolve({
            status: res.statusCode || 0,
            data: parsedData,
            contentType
          });
        });
      }).on('error', reject);
    });
  }

  it('应记录 traces 并通过 API 提供', async () => {
    // 记录 trace
    const span = adapter.startSpan('integration-test');
    adapter.counter('test.counter', 5, { traceId: span.traceId });
    adapter.log('info', '测试日志', { traceId: span.traceId });
    adapter.endSpan(span, 'ok');
    
    await adapter.flush();

    // 通过 API 查询
    const listRes = await httpGet(`http://localhost:${PORT}/api/traces`);
    expect(listRes.status).toBe(200);
    expect(listRes.data.total).toBe(1);

    const traceId = listRes.data.traces[0].traceId;
    const detailRes = await httpGet(`http://localhost:${PORT}/api/traces/${traceId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.data.rootSpanName).toBe('integration-test');
    expect(detailRes.data.metrics).toHaveLength(1);
  });

  it('应按状态过滤 traces', async () => {
    // 成功 trace
    const span1 = adapter.startSpan('success-op');
    adapter.endSpan(span1, 'ok');

    // 错误 trace
    const span2 = adapter.startSpan('error-op');
    adapter.endSpan(span2, 'error');

    await adapter.flush();

    const successRes = await httpGet(`http://localhost:${PORT}/api/traces?status=success`);
    expect(successRes.data.total).toBe(1);
    expect(successRes.data.traces[0].rootSpanName).toBe('success-op');

    const errorRes = await httpGet(`http://localhost:${PORT}/api/traces?status=error`);
    expect(errorRes.data.total).toBe(1);
    expect(errorRes.data.traces[0].rootSpanName).toBe('error-op');
  });

  it('应提供 health 检查端点', async () => {
    const res = await httpGet(`http://localhost:${PORT}/health`);
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ status: 'ok' });
  });
});
