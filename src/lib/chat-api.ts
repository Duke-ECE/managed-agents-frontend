/**
 * Typed port of the previous app's src/api.js — talks to the managed-agents
 * agent-runtime backend (session lifecycle + SSE message streaming).
 * Every request carries the Supabase access token; the backend derives the
 * user from it. A 401 means the token is rejected — the local session is
 * cleared and the route guard sends the user back to /login.
 */
import { getSession, handleUnauthorized } from './auth'

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

// The backend marshals protos with protojson UseProtoNames — responses are
// snake_case, mirroring proto/session/v1/session.proto.
export interface SessionRecord {
  id: string
  user_id: string
  status: string // "active" | "ended"
  llm_model?: string
  created_at: string
  last_active: string
  ended_at?: string
}

export interface TranscriptMessage {
  seq: number
  role: string // "user" | "assistant" | "tool_call" | "tool_result"
  content_json: string // role-specific payload, JSON-encoded
  created_at: string
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

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getSession()
  return session ? { Authorization: `Bearer ${session.access_token}` } : {}
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return
  if (res.status === 401) await handleUnauthorized()
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

export async function createSession(llm?: LlmConfig): Promise<string> {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    // user_id is derived from the bearer token on the backend. When llm is
    // omitted the backend injects the platform default provider.
    body: JSON.stringify(llm ? { llm } : {}),
  })
  await throwIfNotOk(res)
  const data = (await res.json()) as { session_id: string }
  return data.session_id
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  })
  await throwIfNotOk(res)
}

/** GET /api/me — account info and capability flags for the signed-in user. */
export interface MeInfo {
  user_id: string
  email: string
  can_use_platform_llm: boolean
  is_admin: boolean
}

export async function fetchMe(): Promise<MeInfo> {
  const res = await fetch(`${API_BASE}/api/me`, {
    headers: await authHeaders(),
  })
  await throwIfNotOk(res)
  return (await res.json()) as MeInfo
}

// Admin whitelist management (/api/admin/members — 403 for non-admins).
export interface Member {
  email: string
  role: string // "admin" | "member"
  added_by: string
  created_at: string
}

export async function listMembers(): Promise<Member[]> {
  const res = await fetch(`${API_BASE}/api/admin/members`, {
    headers: await authHeaders(),
  })
  await throwIfNotOk(res)
  const data = (await res.json()) as { members?: Member[] }
  return data.members ?? []
}

export async function upsertMember(email: string, role: 'admin' | 'member'): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ email, role }),
  })
  await throwIfNotOk(res)
}

export async function removeMember(email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/members/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  })
  await throwIfNotOk(res)
}

export async function listSessions(): Promise<SessionRecord[]> {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    headers: await authHeaders(),
  })
  await throwIfNotOk(res)
  const data = (await res.json()) as { sessions?: SessionRecord[] }
  return data.sessions ?? []
}

export async function getTranscript(sessionId: string): Promise<TranscriptMessage[]> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/messages`, {
    headers: await authHeaders(),
  })
  await throwIfNotOk(res)
  const data = (await res.json()) as { messages?: TranscriptMessage[] }
  return data.messages ?? []
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
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
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
