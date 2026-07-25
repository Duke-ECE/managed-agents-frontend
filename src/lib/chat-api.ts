/**
 * Typed port of the previous app's src/api.js — talks to the managed-agents
 * agent-runtime backend (session lifecycle + SSE message streaming).
 */

const API_BASE: string =
  import.meta.env.VITE_API_URL ?? 'https://api-managed-agent.colab.duke.edu'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, body: string) {
    super(body || `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface LlmConfig {
  api_key: string
  base_url: string
  model: string
}

export type SseEventName =
  | 'text_delta'
  | 'tool_call'
  | 'tool_result'
  | 'error'
  | 'done'
  | (string & {})

export interface TextDeltaPayload {
  delta?: string
  content?: string
  text?: string
}

export interface ToolCallPayload {
  tool?: string
  arguments_json?: string
}

export interface ToolResultPayload {
  tool?: string
  ok?: boolean
  output?: unknown
  error?: string
}

export interface ErrorPayload {
  message?: string
  retryable?: boolean
}

export interface DonePayload {
  input_tokens?: number
  output_tokens?: number
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return
  let body = ''
  try {
    const data: unknown = await res.json()
    if (data && typeof data === 'object') {
      const err = data as { error?: unknown; message?: unknown }
      body =
        (typeof err.error === 'string' && err.error) ||
        (typeof err.message === 'string' && err.message) ||
        ''
    }
  } catch {
    // non-JSON error body; fall back to status text
  }
  throw new ApiError(res.status, body)
}

export async function createSession(userId: string, llm: LlmConfig): Promise<string> {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, llm }),
  })
  await throwIfNotOk(res)
  const data = (await res.json()) as { session_id: string }
  return data.session_id
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
    method: 'DELETE',
  })
  await throwIfNotOk(res)
}

// Parse a single SSE frame ("event: x\ndata: {...}") into { event, data }.
function parseFrame(frame: string): { event: string; data: unknown } | null {
  let event = 'message'
  const dataLines: string[] = []
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).replace(/^ /, ''))
    }
  }
  if (dataLines.length === 0) return null
  const raw = dataLines.join('\n')
  let data: unknown = raw
  try {
    data = JSON.parse(raw)
  } catch {
    // keep the raw string if it is not JSON
  }
  return { event, data }
}

export interface StreamOptions {
  signal: AbortSignal
  onEvent: (event: SseEventName, data: unknown) => void
}

// POST a message and consume the SSE response stream manually
// (EventSource cannot POST). Calls onEvent(event, data) per frame.
export async function streamSessionMessage(
  sessionId: string,
  content: string,
  { signal, onEvent }: StreamOptions,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal,
  })
  await throwIfNotOk(res)
  if (!res.body) throw new Error('Response has no body stream')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
    // SSE frames are separated by a blank line; keep the partial tail buffered.
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const frame of parts) {
      const parsed = parseFrame(frame)
      if (parsed) onEvent(parsed.event, parsed.data)
    }
  }
  buffer += decoder.decode().replace(/\r\n/g, '\n')
  if (buffer.trim()) {
    const parsed = parseFrame(buffer)
    if (parsed) onEvent(parsed.event, parsed.data)
  }
}
