// ===== Sandbox =====
export type SandboxStatus = 'running' | 'stopped' | 'error' | 'creating'

export interface SandboxProcess {
  pid: number
  command: string
  cpu: number
  memory: number
  startedAt: string
}

export interface Sandbox {
  id: string
  name: string
  status: SandboxStatus
  image: string
  cpuLimit: number // cores
  memoryLimit: number // MB
  cpuUsage: number // percent
  memoryUsage: number // percent
  ipAddress: string
  region: string
  createdAt: string
  agentIds: string[]
  envVars: Record<string, string>
  processes: SandboxProcess[]
  logs: LogEntry[]
}

// ===== Agent =====
export type AgentStatus = 'online' | 'offline' | 'busy' | 'error'

export interface AgentTool {
  id: string
  name: string
  description: string
  enabled: boolean
}

export interface Agent {
  id: string
  name: string
  description: string
  status: AgentStatus
  model: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  tools: AgentTool[]
  sandboxId: string | null
  createdAt: string
  lastActiveAt: string
  totalSessions: number
  totalTasks: number
  avatarColor: string
}

// ===== Session =====
export type SessionStatus = 'active' | 'completed' | 'expired' | 'terminated'
export type MessageRole = 'user' | 'assistant' | 'system'

export interface SessionMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  tokens?: number
}

export interface Session {
  id: string
  agentId: string
  agentName: string
  userName: string
  messageCount: number
  status: SessionStatus
  startedAt: string
  lastActiveAt: string
  totalTokens: number
  messages: SessionMessage[]
}

// ===== Task / Job =====
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface TaskRetry {
  attempt: number
  timestamp: string
  error: string
}

export interface Task {
  id: string
  name: string
  agentId: string
  agentName: string
  status: TaskStatus
  priority: TaskPriority
  input: string
  output: string | null
  error: string | null
  durationMs: number | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  retries: TaskRetry[]
  logs: LogEntry[]
}

// ===== Orchestration =====
export type OrchestrationStatus = 'draft' | 'active' | 'paused'
export type ExecutionMode = 'sequential' | 'parallel'
export type FailurePolicy = 'skip' | 'abort' | 'retry'

export interface OrchestrationStep {
  id: string
  order: number
  agentId: string
  agentName: string
  inputMapping: string
  executionMode: ExecutionMode
  failurePolicy: FailurePolicy
  maxRetries: number
}

export interface OrchestrationRun {
  id: string
  status: TaskStatus
  startedAt: string
  completedAt: string | null
  currentStep: number
  totalSteps: number
}

export interface Orchestration {
  id: string
  name: string
  description: string
  status: OrchestrationStatus
  trigger: string
  steps: OrchestrationStep[]
  createdAt: string
  lastRunAt: string | null
  runs: OrchestrationRun[]
}

// ===== Shared =====
export interface LogEntry {
  id: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  timestamp: string
}

export interface ActivityEvent {
  id: string
  type: 'sandbox' | 'agent' | 'session' | 'task' | 'orchestration'
  action: string
  resourceName: string
  timestamp: string
  status: 'success' | 'failure' | 'info'
}

export interface DashboardStats {
  activeSandboxes: number
  totalSandboxes: number
  runningAgents: number
  totalAgents: number
  activeSessions: number
  totalSessions: number
  completedTasksToday: number
  totalTasksToday: number
}

export interface UsagePoint {
  label: string
  value: number
}
