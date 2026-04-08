// Telemetry Web UI
const API_BASE = '/api';

let currentPage = 0;
let currentQuery = {};
let hasMorePages = false;

// DOM 元素
const traceListEl = document.getElementById('traceList');
const traceDetailEl = document.getElementById('traceDetail');
const detailContentEl = document.getElementById('detailContent');
const statsEl = document.getElementById('stats');
const pageInfoEl = document.getElementById('pageInfo');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadTraces();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('searchBtn').addEventListener('click', () => {
    currentPage = 0;
    currentQuery = buildQuery();
    loadTraces();
  });

  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadStats();
    loadTraces();
  });

  document.getElementById('closeDetail').addEventListener('click', () => {
    traceDetailEl.classList.add('hidden');
  });

  prevBtn.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      loadTraces();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (hasMorePages) {
      currentPage++;
      loadTraces();
    }
  });
}

function buildQuery() {
  const traceId = document.getElementById('traceIdFilter').value;
  const taskId = document.getElementById('taskIdFilter').value;
  const status = document.getElementById('statusFilter').value;
  const fromTime = document.getElementById('fromTime').value;
  const toTime = document.getElementById('toTime').value;

  const query = {};
  if (traceId) query.traceId = traceId;
  if (taskId) query.taskId = taskId;
  if (status) query.status = status;
  if (fromTime) query.from = new Date(fromTime).getTime();
  if (toTime) query.to = new Date(toTime).getTime();

  return query;
}

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const stats = await res.json();
    statsEl.textContent = `${stats.totalTraces} traces | ${stats.pendingTraces} 待处理`;
  } catch (err) {
    statsEl.textContent = '加载统计失败';
  }
}

async function loadTraces() {
  traceListEl.innerHTML = '<div class="loading">加载中...</div>';

  const params = new URLSearchParams({
    limit: '20',
    offset: String(currentPage * 20),
    ...currentQuery
  });

  try {
    const res = await fetch(`${API_BASE}/traces?${params}`);
    const data = await res.json();

    hasMorePages = data.hasMore;
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = !hasMorePages;
    pageInfoEl.textContent = `第 ${currentPage + 1} 页`;

    renderTraceList(data.traces);
  } catch (err) {
    traceListEl.innerHTML = '<div class="empty">加载 traces 失败</div>';
  }
}

function renderTraceList(traces) {
  if (traces.length === 0) {
    traceListEl.innerHTML = '<div class="empty">未找到 traces</div>';
    return;
  }

  traceListEl.innerHTML = traces.map(trace => `
    <div class="trace-item" onclick="showTraceDetail('${trace.traceId}')">
      <div class="trace-header">
        <span class="trace-id">${trace.traceId.slice(0, 16)}...</span>
        <span class="trace-status ${trace.status}">${trace.status}</span>
      </div>
      <div class="trace-name">${trace.rootSpanName}</div>
      <div class="trace-meta">
        ${formatTime(trace.startTime)} | 
        ${trace.durationMs ? (trace.durationMs / 1000).toFixed(2) + 's' : '进行中'}
      </div>
    </div>
  `).join('');
}

async function showTraceDetail(traceId) {
  detailContentEl.innerHTML = '<div class="loading">加载中...</div>';
  traceDetailEl.classList.remove('hidden');

  try {
    const res = await fetch(`${API_BASE}/traces/${traceId}`);
    const trace = await res.json();
    renderTraceDetail(trace);
  } catch (err) {
    detailContentEl.innerHTML = '<div class="empty">加载 trace 失败</div>';
  }
}

function renderTraceDetail(trace) {
  const duration = trace.durationMs ? (trace.durationMs / 1000).toFixed(3) + 's' : 'N/A';

  detailContentEl.innerHTML = `
    <div class="trace-info">
      <p><strong>Trace ID:</strong> <code>${trace.traceId}</code></p>
      <p><strong>Task ID:</strong> ${trace.taskId || 'N/A'}</p>
      <p><strong>状态:</strong> <span class="trace-status ${trace.status}">${trace.status}</span></p>
      <p><strong>耗时:</strong> ${duration}</p>
      <p><strong>开始时间:</strong> ${new Date(trace.startTime).toLocaleString()}</p>
    </div>

    <div class="section">
      <h3>🔥 火焰图 (${trace.metadata.totalSpans} spans)</h3>
      ${renderFlameGraph(trace.spans)}
    </div>

    ${trace.metrics.length > 0 ? `
    <div class="section">
      <h3>📊 指标 (${trace.metrics.length})</h3>
      ${trace.metrics.map(m => `
        <div class="metric-item">${m.name}: ${m.value}</div>
      `).join('')}
    </div>
    ` : ''}

    ${trace.logs.length > 0 ? `
    <div class="section">
      <h3>📝 日志 (${trace.logs.length})</h3>
      ${trace.logs.map(l => `
        <div class="log-item ${l.level}">[${l.level.toUpperCase()}] ${l.message}</div>
      `).join('')}
    </div>
    ` : ''}
  `;
}

function renderFlameGraph(spans) {
  if (spans.length === 0) return '<p>无 spans</p>';

  // 查找根 span 并构建层级
  const rootSpans = spans.filter(s => !s.parentSpanId);
  const spanMap = new Map(spans.map(s => [s.spanId, s]));
  const childrenMap = new Map();

  for (const span of spans) {
    if (span.parentSpanId) {
      if (!childrenMap.has(span.parentSpanId)) {
        childrenMap.set(span.parentSpanId, []);
      }
      childrenMap.get(span.parentSpanId).push(span);
    }
  }

  // 计算时间范围
  const startTimes = spans.map(s => s.startTime);
  const endTimes = spans.map(s => s.endTime || Date.now());
  const minTime = Math.min(...startTimes);
  const maxTime = Math.max(...endTimes);
  const totalDuration = maxTime - minTime;

  function renderSpan(span, depth = 0) {
    const start = span.startTime - minTime;
    const duration = (span.endTime || Date.now()) - span.startTime;
    const leftPct = (start / totalDuration) * 100;
    const widthPct = (duration / totalDuration) * 100;
    const children = childrenMap.get(span.spanId) || [];

    return `
      <div class="flame-row" style="padding-left: ${depth * 20}px">
        <div class="flame-bar ${span.status}" 
             style="margin-left: ${leftPct}%; width: ${widthPct}%"
             title="${span.name} (${duration}ms)">
          ${span.name}
        </div>
      </div>
      ${children.map(c => renderSpan(c, depth + 1)).join('')}
    `;
  }

  return `<div class="flame-graph">${rootSpans.map(s => renderSpan(s)).join('')}</div>`;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return date.toLocaleDateString();
}
