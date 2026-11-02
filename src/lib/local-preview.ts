import type { Session } from '@supabase/supabase-js'

/** A sample-data mode for the Vite dev server on this computer only. */
export const localPreviewEnabled =
  import.meta.env.DEV &&
  import.meta.env.VITE_LOCAL_PREVIEW === 'true' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname)

const LOGIN_KEY = 'managed-agents.local-preview-login'
const CHANGE_EVENT = 'managed-agents.local-preview-auth-change'

export function localPreviewSession(): Session | null {
  if (!localPreviewEnabled || sessionStorage.getItem(LOGIN_KEY) !== 'true') return null
  const now = new Date().toISOString()
  return {
    access_token: 'local-preview-only',
    refresh_token: 'local-preview-only',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: 'local-preview-user',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'preview@localhost',
      app_metadata: { provider: 'local-preview' },
      user_metadata: { name: 'Local preview' },
      created_at: now,
    },
  } as Session
}

export function enterLocalPreview(): void {
  sessionStorage.setItem(LOGIN_KEY, 'true')
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function leaveLocalPreview(): void {
  sessionStorage.removeItem(LOGIN_KEY)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function onLocalPreviewAuthChange(callback: (session: Session | null) => void): () => void {
  const listener = () => callback(localPreviewSession())
  window.addEventListener(CHANGE_EVENT, listener)
  return () => window.removeEventListener(CHANGE_EVENT, listener)
}

const now = new Date().toISOString()
const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString()
const builtInId = 'a0000000-0000-0000-0000-000000000001'

type PreviewAgent = {
  id: string
  name: string
  description: string
  system_prompt: string
  llm_mode: 'platform_default' | 'custom'
  has_api_key: boolean
  llm_base_url: string
  llm_model: string
  tools: string[]
  visibility: 'platform' | 'private'
  created_at: string
  updated_at: string
  archived_at?: string
}

const agents: PreviewAgent[] = [
  {
    id: builtInId, name: 'Default assistant', description: 'A helpful general-purpose assistant.',
    system_prompt: 'You are a helpful assistant.', llm_mode: 'platform_default', has_api_key: false,
    llm_base_url: '', llm_model: 'Platform default', tools: [], visibility: 'platform',
    created_at: ago(30), updated_at: ago(2),
  },
  {
    id: 'preview-agent-research', name: 'Research helper',
    description: 'Summarizes notes and helps plan the next step.',
    system_prompt: 'Help the user research and organize ideas.', llm_mode: 'platform_default',
    has_api_key: false, llm_base_url: '', llm_model: 'Platform default', tools: ['read'],
    visibility: 'private', created_at: ago(10), updated_at: ago(1),
  },
]

type PreviewSession = {
  id: string
  user_id: string
  status: 'active' | 'ended'
  title: string
  llm_model: string
  agent_id: string
  created_at: string
  last_active: string
  ended_at?: string
}

const sessions: PreviewSession[] = [
  { id: 'preview-session-1', user_id: 'local-preview-user', status: 'active', title: 'Plan a project update',
    llm_model: 'Platform default', agent_id: builtInId, created_at: ago(1), last_active: ago(0.1) },
  { id: 'preview-session-2', user_id: 'local-preview-user', status: 'active', title: 'Summarize meeting notes',
    llm_model: 'Platform default', agent_id: 'preview-agent-research', created_at: ago(3), last_active: ago(2) },
  { id: 'preview-session-3', user_id: 'local-preview-user', status: 'ended', title: 'Earlier conversation',
    llm_model: 'Platform default', agent_id: builtInId, created_at: ago(7), last_active: ago(6), ended_at: ago(6) },
]

type PreviewMessage = { seq: number; role: string; content_json: string; created_at: string }
const message = (seq: number, role: string, content: string, date: string): PreviewMessage => ({
  seq, role, content_json: JSON.stringify({ content }), created_at: date,
})
const transcripts: Record<string, PreviewMessage[]> = {
  'preview-session-1': [
    message(1, 'user', 'Help me plan a short project update.', ago(0.1)),
    message(2, 'assistant', 'Here is a simple structure:\n\n1. **Progress** — what shipped.\n2. **Next** — the work in motion.\n3. **Risks** — decisions or help needed.', ago(0.1)),
  ],
  'preview-session-2': [
    message(1, 'user', 'Summarize our meeting notes.', ago(2)),
    message(2, 'assistant', 'The team agreed on the next milestone and assigned owners for follow-up tasks.', ago(2)),
  ],
  'preview-session-3': [
    message(1, 'user', 'What should we review first?', ago(6)),
    message(2, 'assistant', 'Start with the user journey, then check the API and deployment status.', ago(6)),
  ],
}

const users = [
  { email: 'preview@localhost', role: 'admin', provider: 'local-preview', last_sign_in_at: now, created_at: ago(30) },
  { email: 'member@example.com', role: 'member', provider: 'github', last_sign_in_at: ago(1), created_at: ago(20) },
  { email: 'guest@example.com', role: 'guest', provider: 'github', last_sign_in_at: ago(4), created_at: ago(8) },
]

const DATA_KEY = 'managed-agents.local-preview-data'
if (localPreviewEnabled) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(DATA_KEY) ?? 'null') as {
      agents?: PreviewAgent[]
      sessions?: PreviewSession[]
      transcripts?: Record<string, PreviewMessage[]>
      users?: typeof users
    } | null
    if (saved?.agents) agents.splice(0, agents.length, ...saved.agents)
    if (saved?.sessions) sessions.splice(0, sessions.length, ...saved.sessions)
    if (saved?.transcripts) Object.assign(transcripts, saved.transcripts)
    if (saved?.users) users.splice(0, users.length, ...saved.users)
  } catch {
    // Corrupt preview fixtures fall back to the sample set above.
  }
}

function savePreviewData(): void {
  sessionStorage.setItem(DATA_KEY, JSON.stringify({ agents, sessions, transcripts, users }))
}

const json = (data: unknown, status = 200) => Response.json(data, { status })
const empty = () => new Response(null, { status: 204 })
const body = (init?: RequestInit): Record<string, unknown> => {
  try { return JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown> }
  catch { return {} }
}

/** Intercepts every console API call in preview mode; nothing reaches production. */
export async function localPreviewFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input))
  const path = url.pathname
  const method = init?.method?.toUpperCase() ?? 'GET'
  const parts = path.split('/').filter(Boolean)

  if (path === '/api/me' && method === 'GET') {
    return json({ user_id: 'local-preview-user', email: 'preview@localhost', can_use_platform_llm: true, is_admin: true })
  }

  if (path === '/api/admin/users' && method === 'GET') return json({ users })
  if (path === '/api/admin/members' && method === 'GET') {
    return json({ members: users.filter(user => user.role !== 'guest').map(user => ({
      email: user.email, role: user.role, added_by: 'local-preview-user', created_at: user.created_at,
    })) })
  }
  if (path === '/api/admin/members' && method === 'POST') {
    const data = body(init)
    const email = String(data.email ?? '').trim()
    const role = data.role === 'admin' ? 'admin' : 'member'
    const user = users.find(item => item.email === email)
    if (user) user.role = role
    else users.push({ email, role, provider: '', last_sign_in_at: '', created_at: now })
    savePreviewData()
    return empty()
  }
  if (parts[1] === 'admin' && parts[2] === 'members' && parts[3] && method === 'DELETE') {
    const user = users.find(item => item.email === decodeURIComponent(parts[3]))
    if (user) user.role = 'guest'
    savePreviewData()
    return empty()
  }

  if (path === '/api/agents' && method === 'GET') return json({ agents })
  if (path === '/api/agents' && method === 'POST') {
    const data = body(init)
    const agent: PreviewAgent = {
      id: `preview-agent-${crypto.randomUUID()}`, name: String(data.name ?? 'New agent'),
      description: String(data.description ?? ''), system_prompt: String(data.system_prompt ?? ''),
      llm_mode: data.llm_mode === 'custom' ? 'custom' : 'platform_default',
      has_api_key: Boolean(data.llm_api_key), llm_base_url: String(data.llm_base_url ?? ''),
      llm_model: String(data.llm_model ?? 'Platform default'),
      tools: Array.isArray(data.tools) ? data.tools.map(String) : [],
      visibility: 'private', created_at: now, updated_at: now,
    }
    agents.unshift(agent)
    savePreviewData()
    return json(agent, 201)
  }
  if (parts[1] === 'agents' && parts[3] === 'archive' && method === 'POST') {
    const agent = agents.find(item => item.id === parts[2] && item.visibility === 'private')
    if (!agent) return json({ error: 'Agent not found' }, 404)
    agent.archived_at = new Date().toISOString()
    savePreviewData()
    return json(agent)
  }

  if (path === '/api/sessions' && method === 'GET') {
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const limit = Number(url.searchParams.get('limit') ?? 50)
    return json({ sessions: sessions.slice(offset, offset + limit), has_more: offset + limit < sessions.length })
  }
  if (path === '/api/sessions' && method === 'POST') {
    const data = body(init)
    const id = `preview-session-${crypto.randomUUID()}`
    sessions.unshift({ id, user_id: 'local-preview-user', status: 'active', title: '',
      llm_model: 'Platform default', agent_id: String(data.agent_id ?? builtInId), created_at: now, last_active: now })
    transcripts[id] = []
    savePreviewData()
    return json({ session_id: id }, 201)
  }
  if (parts[1] === 'sessions' && parts[2]) {
    const id = parts[2]
    const session = sessions.find(item => item.id === id)
    if (!session) return json({ error: 'Session not found' }, 404)
    if (parts.length === 3 && method === 'DELETE') {
      if (url.searchParams.get('purge') === 'true') {
        sessions.splice(sessions.indexOf(session), 1)
        delete transcripts[id]
      } else {
        session.status = 'ended'
        session.ended_at = new Date().toISOString()
      }
      savePreviewData()
      return empty()
    }
    if (parts[3] === 'title' && method === 'PATCH') {
      session.title = String(body(init).title ?? '')
      savePreviewData()
      return empty()
    }
    if (parts[3] === 'structured' && method === 'GET') return json({ messages: [] })
    if (parts[3] === 'cancel' && method === 'POST') return empty()
    if (parts[3] === 'messages' && method === 'GET') {
      const before = Number(url.searchParams.get('before_seq') ?? Infinity)
      const limit = Number(url.searchParams.get('limit') ?? 50)
      const all = (transcripts[id] ?? []).filter(item => item.seq < before)
      return json({ messages: all.slice(-limit), has_more: all.length > limit })
    }
    if (parts[3] === 'messages' && method === 'POST') {
      if (session.status === 'ended') return json({ error: 'Session ended' }, 410)
      const content = String(body(init).content ?? '')
      const list = transcripts[id] ?? (transcripts[id] = [])
      list.push(message(list.length + 1, 'user', content, new Date().toISOString()))
      const answer = 'This is a local UI preview. Your message stays in this browser session; no model or production API was called.'
      list.push(message(list.length + 1, 'assistant', answer, new Date().toISOString()))
      session.last_active = new Date().toISOString()
      if (!session.title) session.title = content.slice(0, 50)
      savePreviewData()
      const requestId = new Headers(init?.headers).get('X-Client-Request-Id') ?? 'preview-request'
      const frames = [
        `event: text_delta\ndata: ${JSON.stringify({ delta: answer })}\n\n`,
        `event: done\ndata: ${JSON.stringify({ request_message_id: requestId, status: 'completed', input_tokens: 0, output_tokens: 0 })}\n\n`,
      ]
      return new Response(frames.join(''), {
        headers: { 'Content-Type': 'text/event-stream', 'X-Client-Request-Id': requestId },
      })
    }
  }
  return json({ error: `No local preview fixture for ${method} ${path}` }, 404)
}
