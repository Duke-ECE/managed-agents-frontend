import type {
  Sandbox, Agent, Session, Task, Orchestration,
  ActivityEvent, DashboardStats, UsagePoint,
} from '../types'

const now = Date.now()
const min = 60_000
const hour = 3_600_000
const day = 86_400_000
const iso = (t: number) => new Date(t).toISOString()

// ===== Sandboxes =====
export const sandboxes: Sandbox[] = [
  {
    id: 'sbx_01', name: 'prod-coder-01', status: 'running',
    image: 'ghcr.io/agents/node20-dev:latest', cpuLimit: 4, memoryLimit: 8192,
    cpuUsage: 62, memoryUsage: 71, ipAddress: '10.0.3.14', region: 'us-east-1',
    createdAt: iso(now - 6 * day), agentIds: ['agt_01', 'agt_02'],
    envVars: { NODE_ENV: 'production', LOG_LEVEL: 'info' },
    processes: [
      { pid: 1, command: 'node server.js', cpu: 34, memory: 41, startedAt: iso(now - 2 * hour) },
      { pid: 42, command: 'npm run build', cpu: 22, memory: 18, startedAt: iso(now - 20 * min) },
      { pid: 87, command: 'tailwind --watch', cpu: 6, memory: 12, startedAt: iso(now - 2 * hour) },
    ],
    logs: [
      { id: 'l1', level: 'info', message: 'Sandbox started successfully', timestamp: iso(now - 2 * hour) },
      { id: 'l2', level: 'info', message: 'Agent agt_01 attached to sandbox', timestamp: iso(now - 110 * min) },
      { id: 'l3', level: 'warn', message: 'Memory usage exceeded 70% threshold', timestamp: iso(now - 30 * min) },
      { id: 'l4', level: 'info', message: 'Build completed in 42.3s', timestamp: iso(now - 12 * min) },
    ],
  },
  {
    id: 'sbx_02', name: 'staging-reviewer', status: 'running',
    image: 'ghcr.io/agents/python312:latest', cpuLimit: 2, memoryLimit: 4096,
    cpuUsage: 28, memoryUsage: 45, ipAddress: '10.0.3.22', region: 'us-east-1',
    createdAt: iso(now - 3 * day), agentIds: ['agt_03'],
    envVars: { PYTHONUNBUFFERED: '1' },
    processes: [
      { pid: 1, command: 'python -m pytest --watch', cpu: 18, memory: 30, startedAt: iso(now - 5 * hour) },
    ],
    logs: [
      { id: 'l1', level: 'info', message: 'Sandbox started successfully', timestamp: iso(now - 5 * hour) },
      { id: 'l2', level: 'debug', message: 'Health check passed', timestamp: iso(now - 10 * min) },
    ],
  },
  {
    id: 'sbx_03', name: 'data-pipeline', status: 'stopped',
    image: 'ghcr.io/agents/spark-runner:3.5', cpuLimit: 8, memoryLimit: 16384,
    cpuUsage: 0, memoryUsage: 0, ipAddress: '10.0.4.8', region: 'eu-west-1',
    createdAt: iso(now - 12 * day), agentIds: [],
    envVars: {},
    processes: [],
    logs: [
      { id: 'l1', level: 'info', message: 'Sandbox stopped by user', timestamp: iso(now - 2 * day) },
    ],
  },
  {
    id: 'sbx_04', name: 'ml-training-gpu', status: 'error',
    image: 'ghcr.io/agents/cuda12-torch:latest', cpuLimit: 8, memoryLimit: 32768,
    cpuUsage: 0, memoryUsage: 0, ipAddress: '10.0.5.3', region: 'us-west-2',
    createdAt: iso(now - 1 * day), agentIds: ['agt_05'],
    envVars: { CUDA_VISIBLE_DEVICES: '0' },
    processes: [],
    logs: [
      { id: 'l1', level: 'info', message: 'Sandbox started', timestamp: iso(now - 20 * hour) },
      { id: 'l2', level: 'error', message: 'OOM killed: process exceeded 32GB memory limit', timestamp: iso(now - 3 * hour) },
      { id: 'l3', level: 'error', message: 'Sandbox entered error state', timestamp: iso(now - 3 * hour) },
    ],
  },
  {
    id: 'sbx_05', name: 'web-scraper-pool', status: 'creating',
    image: 'ghcr.io/agents/chromium-headless:latest', cpuLimit: 2, memoryLimit: 4096,
    cpuUsage: 0, memoryUsage: 0, ipAddress: '—', region: 'ap-southeast-1',
    createdAt: iso(now - 2 * min), agentIds: [],
    envVars: {},
    processes: [],
    logs: [
      { id: 'l1', level: 'info', message: 'Provisioning sandbox resources…', timestamp: iso(now - 2 * min) },
    ],
  },
]

// ===== Agents =====
export const agents: Agent[] = [
  {
    id: 'agt_01', name: 'CodeReviewer', description: '自动化代码审查，检测潜在 bug 与安全漏洞',
    status: 'online', model: 'gpt-4o', temperature: 0.2, maxTokens: 4096,
    systemPrompt: 'You are a senior code reviewer. Analyze diffs for bugs, security issues, and style violations.',
    tools: [
      { id: 't1', name: 'file_read', description: 'Read file contents', enabled: true },
      { id: 't2', name: 'git_diff', description: 'Get git diff', enabled: true },
      { id: 't3', name: 'web_search', description: 'Search the web', enabled: false },
    ],
    sandboxId: 'sbx_01', createdAt: iso(now - 30 * day), lastActiveAt: iso(now - 4 * min),
    totalSessions: 142, totalTasks: 891, avatarColor: '#3b82f6',
  },
  {
    id: 'agt_02', name: 'FullStackBuilder', description: '全栈应用开发，前后端代码生成与调试',
    status: 'busy', model: 'claude-sonnet-4-5', temperature: 0.7, maxTokens: 8192,
    systemPrompt: 'You are a full-stack engineer. Build features end-to-end with tests.',
    tools: [
      { id: 't1', name: 'file_read', description: 'Read file contents', enabled: true },
      { id: 't2', name: 'file_write', description: 'Write files', enabled: true },
      { id: 't3', name: 'shell_exec', description: 'Run shell commands', enabled: true },
      { id: 't4', name: 'browser', description: 'Control browser', enabled: true },
    ],
    sandboxId: 'sbx_01', createdAt: iso(now - 21 * day), lastActiveAt: iso(now - 30_000),
    totalSessions: 87, totalTasks: 456, avatarColor: '#8b5cf6',
  },
  {
    id: 'agt_03', name: 'TestRunner', description: '自动执行测试套件并生成覆盖率报告',
    status: 'online', model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 2048,
    systemPrompt: 'You run test suites and report results concisely.',
    tools: [
      { id: 't1', name: 'shell_exec', description: 'Run shell commands', enabled: true },
      { id: 't2', name: 'file_read', description: 'Read file contents', enabled: true },
    ],
    sandboxId: 'sbx_02', createdAt: iso(now - 14 * day), lastActiveAt: iso(now - 12 * min),
    totalSessions: 203, totalTasks: 1204, avatarColor: '#10b981',
  },
  {
    id: 'agt_04', name: 'DocWriter', description: '技术文档与 API 参考自动生成',
    status: 'offline', model: 'claude-sonnet-4-5', temperature: 0.5, maxTokens: 8192,
    systemPrompt: 'You write clear technical documentation from source code.',
    tools: [
      { id: 't1', name: 'file_read', description: 'Read file contents', enabled: true },
      { id: 't2', name: 'file_write', description: 'Write files', enabled: true },
    ],
    sandboxId: null, createdAt: iso(now - 10 * day), lastActiveAt: iso(now - 2 * day),
    totalSessions: 34, totalTasks: 120, avatarColor: '#f59e0b',
  },
  {
    id: 'agt_05', name: 'DataAnalyst', description: '数据探索、SQL 查询与可视化报表',
    status: 'error', model: 'gpt-4o', temperature: 0.3, maxTokens: 4096,
    systemPrompt: 'You are a data analyst. Write SQL and produce insights.',
    tools: [
      { id: 't1', name: 'sql_query', description: 'Run SQL queries', enabled: true },
      { id: 't2', name: 'chart_gen', description: 'Generate charts', enabled: true },
    ],
    sandboxId: 'sbx_04', createdAt: iso(now - 7 * day), lastActiveAt: iso(now - 3 * hour),
    totalSessions: 18, totalTasks: 67, avatarColor: '#ef4444',
  },
  {
    id: 'agt_06', name: 'SecurityAuditor', description: '依赖漏洞扫描与代码安全审计',
    status: 'online', model: 'o3', temperature: 0.0, maxTokens: 4096,
    systemPrompt: 'You audit code and dependencies for security vulnerabilities.',
    tools: [
      { id: 't1', name: 'file_read', description: 'Read file contents', enabled: true },
      { id: 't2', name: 'shell_exec', description: 'Run shell commands', enabled: true },
      { id: 't3', name: 'web_search', description: 'Search CVE databases', enabled: true },
    ],
    sandboxId: null, createdAt: iso(now - 5 * day), lastActiveAt: iso(now - 45 * min),
    totalSessions: 12, totalTasks: 38, avatarColor: '#06b6d4',
  },
]

// ===== Sessions =====
export const sessions: Session[] = [
  {
    id: 'ses_01', agentId: 'agt_01', agentName: 'CodeReviewer', userName: 'alice.chen',
    messageCount: 14, status: 'active', startedAt: iso(now - 40 * min), lastActiveAt: iso(now - 2 * min),
    totalTokens: 18432,
    messages: [
      { id: 'm1', role: 'user', content: '帮我审查 PR #482 的改动，重点关注并发安全。', timestamp: iso(now - 40 * min), tokens: 42 },
      { id: 'm2', role: 'assistant', content: '我已拉取 PR #482 的 diff，共 6 个文件、+214/-89 行。正在分析并发相关的改动…', timestamp: iso(now - 39 * min), tokens: 380 },
      { id: 'm3', role: 'assistant', content: '发现 2 个潜在问题：\n1. `OrderService.process()` 中对共享 Map 的写入没有加锁，高并发下可能丢数据。\n2. `CacheManager` 的 double-checked locking 缺少 volatile 修饰。', timestamp: iso(now - 37 * min), tokens: 620 },
      { id: 'm4', role: 'user', content: '第二个问题能给出修复建议吗？', timestamp: iso(now - 10 * min), tokens: 28 },
      { id: 'm5', role: 'assistant', content: '可以。将字段声明改为 `private volatile CacheManager instance;`，这样 DCL 模式在 Java 内存模型下才正确。我已经生成了 patch，需要我直接提交吗？', timestamp: iso(now - 9 * min), tokens: 410 },
    ],
  },
  {
    id: 'ses_02', agentId: 'agt_02', agentName: 'FullStackBuilder', userName: 'bob.liu',
    messageCount: 28, status: 'active', startedAt: iso(now - 3 * hour), lastActiveAt: iso(now - 5 * min),
    totalTokens: 52110,
    messages: [
      { id: 'm1', role: 'user', content: '给用户中心加一个导出 CSV 的功能。', timestamp: iso(now - 3 * hour), tokens: 30 },
      { id: 'm2', role: 'assistant', content: '好的，我会：1) 新增 `/api/users/export` 接口；2) 前端加导出按钮；3) 补充单测。开始实现。', timestamp: iso(now - 178 * min), tokens: 290 },
      { id: 'm3', role: 'assistant', content: '后端接口已完成，使用流式响应避免大数据量 OOM。正在写前端部分…', timestamp: iso(now - 150 * min), tokens: 512 },
    ],
  },
  {
    id: 'ses_03', agentId: 'agt_03', agentName: 'TestRunner', userName: 'ci-bot',
    messageCount: 6, status: 'completed', startedAt: iso(now - 6 * hour), lastActiveAt: iso(now - 5 * hour),
    totalTokens: 8200,
    messages: [
      { id: 'm1', role: 'system', content: 'Triggered by push to main (commit 9f2c1ab)', timestamp: iso(now - 6 * hour) },
      { id: 'm2', role: 'assistant', content: '执行 342 个测试用例，通过 340，失败 2，跳过 0。覆盖率 87.4%。失败用例：`payment.refund_partial`、`auth.token_refresh`。', timestamp: iso(now - 5 * hour), tokens: 890 },
    ],
  },
  {
    id: 'ses_04', agentId: 'agt_04', agentName: 'DocWriter', userName: 'carol.wang',
    messageCount: 9, status: 'expired', startedAt: iso(now - 2 * day), lastActiveAt: iso(now - 2 * day + 2 * hour),
    totalTokens: 15600,
    messages: [
      { id: 'm1', role: 'user', content: '为 payments 模块生成 API 文档。', timestamp: iso(now - 2 * day), tokens: 24 },
      { id: 'm2', role: 'assistant', content: '已扫描 12 个 endpoint，文档草稿已生成至 docs/api/payments.md。', timestamp: iso(now - 2 * day + 10 * min), tokens: 720 },
    ],
  },
  {
    id: 'ses_05', agentId: 'agt_05', agentName: 'DataAnalyst', userName: 'dave.zhao',
    messageCount: 4, status: 'terminated', startedAt: iso(now - 4 * hour), lastActiveAt: iso(now - 3 * hour),
    totalTokens: 5100,
    messages: [
      { id: 'm1', role: 'user', content: '分析上周的 GMV 变化。', timestamp: iso(now - 4 * hour), tokens: 20 },
      { id: 'm2', role: 'system', content: 'Session terminated: sandbox sbx_04 entered error state (OOM).', timestamp: iso(now - 3 * hour) },
    ],
  },
  {
    id: 'ses_06', agentId: 'agt_06', agentName: 'SecurityAuditor', userName: 'alice.chen',
    messageCount: 11, status: 'completed', startedAt: iso(now - 1 * day), lastActiveAt: iso(now - 20 * hour),
    totalTokens: 22800,
    messages: [
      { id: 'm1', role: 'user', content: '扫描全部生产依赖的已知漏洞。', timestamp: iso(now - 1 * day), tokens: 26 },
      { id: 'm2', role: 'assistant', content: '扫描完成：共 214 个依赖，发现 3 个高危（lodash prototype pollution、axios SSRF、semver ReDoS），报告已生成。', timestamp: iso(now - 20 * hour), tokens: 830 },
    ],
  },
]

// ===== Tasks =====
export const tasks: Task[] = [
  {
    id: 'task_01', name: '审查 PR #482 并发安全', agentId: 'agt_01', agentName: 'CodeReviewer',
    status: 'completed', priority: 'high',
    input: 'review pr:482 focus:concurrency', output: '发现 2 个并发问题，已生成修复 patch。',
    error: null, durationMs: 94_000, createdAt: iso(now - 50 * min),
    startedAt: iso(now - 49 * min), completedAt: iso(now - 47 * min), retries: [],
    logs: [
      { id: 'l1', level: 'info', message: 'Fetching PR diff…', timestamp: iso(now - 49 * min) },
      { id: 'l2', level: 'info', message: 'Analyzed 6 files', timestamp: iso(now - 48 * min) },
      { id: 'l3', level: 'info', message: 'Task completed', timestamp: iso(now - 47 * min) },
    ],
  },
  {
    id: 'task_02', name: '实现用户 CSV 导出', agentId: 'agt_02', agentName: 'FullStackBuilder',
    status: 'running', priority: 'medium',
    input: 'feature: user-center csv export', output: null,
    error: null, durationMs: null, createdAt: iso(now - 3 * hour),
    startedAt: iso(now - 178 * min), completedAt: null, retries: [],
    logs: [
      { id: 'l1', level: 'info', message: 'Backend endpoint implemented', timestamp: iso(now - 150 * min) },
      { id: 'l2', level: 'info', message: 'Writing frontend component…', timestamp: iso(now - 20 * min) },
    ],
  },
  {
    id: 'task_03', name: '夜间全量回归测试', agentId: 'agt_03', agentName: 'TestRunner',
    status: 'completed', priority: 'medium',
    input: 'run: full regression suite', output: '342 tests, 340 passed, coverage 87.4%',
    error: null, durationMs: 1_260_000, createdAt: iso(now - 7 * hour),
    startedAt: iso(now - 6 * hour), completedAt: iso(now - 5 * hour), retries: [],
    logs: [
      { id: 'l1', level: 'info', message: 'Suite started', timestamp: iso(now - 6 * hour) },
      { id: 'l2', level: 'warn', message: '2 tests failed', timestamp: iso(now - 5 * hour) },
    ],
  },
  {
    id: 'task_04', name: 'GMV 周报数据分析', agentId: 'agt_05', agentName: 'DataAnalyst',
    status: 'failed', priority: 'high',
    input: 'analyze: weekly GMV report', output: null,
    error: 'Sandbox sbx_04 OOM: process killed (exceeded 32GB)', durationMs: 3_540_000,
    createdAt: iso(now - 4 * hour), startedAt: iso(now - 4 * hour), completedAt: iso(now - 3 * hour),
    retries: [
      { attempt: 1, timestamp: iso(now - 3.5 * hour), error: 'Query timed out after 300s' },
      { attempt: 2, timestamp: iso(now - 3 * hour), error: 'OOM killed' },
    ],
    logs: [
      { id: 'l1', level: 'info', message: 'Running aggregation query…', timestamp: iso(now - 4 * hour) },
      { id: 'l2', level: 'error', message: 'OOM killed', timestamp: iso(now - 3 * hour) },
    ],
  },
  {
    id: 'task_05', name: '依赖漏洞扫描', agentId: 'agt_06', agentName: 'SecurityAuditor',
    status: 'completed', priority: 'critical',
    input: 'scan: all production dependencies', output: '3 high-severity CVEs found, report generated',
    error: null, durationMs: 420_000, createdAt: iso(now - 1 * day),
    startedAt: iso(now - 1 * day), completedAt: iso(now - 20 * hour), retries: [],
    logs: [
      { id: 'l1', level: 'info', message: 'Scanned 214 packages', timestamp: iso(now - 20 * hour) },
    ],
  },
  {
    id: 'task_06', name: '生成 payments API 文档', agentId: 'agt_04', agentName: 'DocWriter',
    status: 'pending', priority: 'low',
    input: 'docs: payments module API reference', output: null,
    error: null, durationMs: null, createdAt: iso(now - 25 * min),
    startedAt: null, completedAt: null, retries: [],
    logs: [],
  },
  {
    id: 'task_07', name: '修复 token 刷新测试', agentId: 'agt_03', agentName: 'TestRunner',
    status: 'retrying', priority: 'medium',
    input: 'fix: auth.token_refresh flaky test', output: null,
    error: 'Attempt 1: assertion timeout', durationMs: null, createdAt: iso(now - 90 * min),
    startedAt: iso(now - 88 * min), completedAt: null,
    retries: [{ attempt: 1, timestamp: iso(now - 60 * min), error: 'Assertion timeout' }],
    logs: [
      { id: 'l1', level: 'warn', message: 'Retrying (attempt 2)…', timestamp: iso(now - 15 * min) },
    ],
  },
  {
    id: 'task_08', name: '重构订单状态机', agentId: 'agt_02', agentName: 'FullStackBuilder',
    status: 'cancelled', priority: 'low',
    input: 'refactor: order state machine', output: null,
    error: null, durationMs: 600_000, createdAt: iso(now - 2 * day),
    startedAt: iso(now - 2 * day), completedAt: iso(now - 2 * day + 10 * min), retries: [],
    logs: [
      { id: 'l1', level: 'info', message: 'Cancelled by user', timestamp: iso(now - 2 * day + 10 * min) },
    ],
  },
]

// ===== Orchestrations =====
export const orchestrations: Orchestration[] = [
  {
    id: 'orch_01', name: 'PR 自动审查流水线', description: 'PR 创建时自动触发：安全审计 → 代码审查 → 测试回归',
    status: 'active', trigger: 'pull_request.opened',
    steps: [
      { id: 'st1', order: 1, agentId: 'agt_06', agentName: 'SecurityAuditor', inputMapping: 'pr.diff', executionMode: 'sequential', failurePolicy: 'abort', maxRetries: 1 },
      { id: 'st2', order: 2, agentId: 'agt_01', agentName: 'CodeReviewer', inputMapping: 'steps.1.output', executionMode: 'sequential', failurePolicy: 'retry', maxRetries: 2 },
      { id: 'st3', order: 3, agentId: 'agt_03', agentName: 'TestRunner', inputMapping: 'steps.2.output', executionMode: 'sequential', failurePolicy: 'retry', maxRetries: 2 },
    ],
    createdAt: iso(now - 15 * day), lastRunAt: iso(now - 2 * hour),
    runs: [
      { id: 'run_01', status: 'completed', startedAt: iso(now - 2 * hour), completedAt: iso(now - 110 * min), currentStep: 3, totalSteps: 3 },
      { id: 'run_02', status: 'completed', startedAt: iso(now - 8 * hour), completedAt: iso(now - 7 * hour), currentStep: 3, totalSteps: 3 },
      { id: 'run_03', status: 'failed', startedAt: iso(now - 1 * day), completedAt: iso(now - 23 * hour), currentStep: 2, totalSteps: 3 },
    ],
  },
  {
    id: 'orch_02', name: '每日数据日报', description: '每日 09:00 触发：数据分析 → 文档撰写，并行收集多数据源',
    status: 'active', trigger: 'cron: 0 9 * * *',
    steps: [
      { id: 'st1', order: 1, agentId: 'agt_05', agentName: 'DataAnalyst', inputMapping: 'metrics.daily', executionMode: 'parallel', failurePolicy: 'retry', maxRetries: 3 },
      { id: 'st2', order: 2, agentId: 'agt_04', agentName: 'DocWriter', inputMapping: 'steps.1.output', executionMode: 'sequential', failurePolicy: 'skip', maxRetries: 1 },
    ],
    createdAt: iso(now - 9 * day), lastRunAt: iso(now - 20 * hour),
    runs: [
      { id: 'run_01', status: 'completed', startedAt: iso(now - 20 * hour), completedAt: iso(now - 19 * hour), currentStep: 2, totalSteps: 2 },
    ],
  },
  {
    id: 'orch_03', name: '全栈功能交付', description: '需求驱动：Builder 实现 → Reviewer 审查 → TestRunner 验证（草稿）',
    status: 'draft', trigger: 'manual',
    steps: [
      { id: 'st1', order: 1, agentId: 'agt_02', agentName: 'FullStackBuilder', inputMapping: 'issue.body', executionMode: 'sequential', failurePolicy: 'abort', maxRetries: 1 },
      { id: 'st2', order: 2, agentId: 'agt_01', agentName: 'CodeReviewer', inputMapping: 'steps.1.output', executionMode: 'sequential', failurePolicy: 'retry', maxRetries: 2 },
      { id: 'st3', order: 3, agentId: 'agt_03', agentName: 'TestRunner', inputMapping: 'steps.2.output', executionMode: 'sequential', failurePolicy: 'retry', maxRetries: 2 },
    ],
    createdAt: iso(now - 2 * day), lastRunAt: null, runs: [],
  },
]

// ===== Activity =====
export const activities: ActivityEvent[] = [
  { id: 'a1', type: 'task', action: 'completed', resourceName: '审查 PR #482 并发安全', timestamp: iso(now - 47 * min), status: 'success' },
  { id: 'a2', type: 'session', action: 'started', resourceName: 'ses_01 · CodeReviewer', timestamp: iso(now - 40 * min), status: 'info' },
  { id: 'a3', type: 'sandbox', action: 'creating', resourceName: 'web-scraper-pool', timestamp: iso(now - 2 * min), status: 'info' },
  { id: 'a4', type: 'sandbox', action: 'error (OOM)', resourceName: 'ml-training-gpu', timestamp: iso(now - 3 * hour), status: 'failure' },
  { id: 'a5', type: 'orchestration', action: 'run completed', resourceName: 'PR 自动审查流水线', timestamp: iso(now - 110 * min), status: 'success' },
  { id: 'a6', type: 'task', action: 'retrying', resourceName: '修复 token 刷新测试', timestamp: iso(now - 15 * min), status: 'info' },
  { id: 'a7', type: 'agent', action: 'went offline', resourceName: 'DocWriter', timestamp: iso(now - 2 * day), status: 'info' },
  { id: 'a8', type: 'task', action: 'failed', resourceName: 'GMV 周报数据分析', timestamp: iso(now - 3 * hour), status: 'failure' },
]

// ===== Dashboard =====
export const dashboardStats: DashboardStats = {
  activeSandboxes: sandboxes.filter(s => s.status === 'running').length,
  totalSandboxes: sandboxes.length,
  runningAgents: agents.filter(a => a.status === 'online' || a.status === 'busy').length,
  totalAgents: agents.length,
  activeSessions: sessions.filter(s => s.status === 'active').length,
  totalSessions: sessions.length,
  completedTasksToday: tasks.filter(t => t.status === 'completed').length,
  totalTasksToday: tasks.length,
}

export const tokenUsageTrend: UsagePoint[] = [
  { label: 'Mon', value: 42 }, { label: 'Tue', value: 61 }, { label: 'Wed', value: 55 },
  { label: 'Thu', value: 78 }, { label: 'Fri', value: 92 }, { label: 'Sat', value: 34 },
  { label: 'Sun', value: 48 },
]

export const taskCompletionTrend: UsagePoint[] = [
  { label: 'Mon', value: 68 }, { label: 'Tue', value: 74 }, { label: 'Wed', value: 81 },
  { label: 'Thu', value: 63 }, { label: 'Fri', value: 88 }, { label: 'Sat', value: 45 },
  { label: 'Sun', value: 59 },
]
