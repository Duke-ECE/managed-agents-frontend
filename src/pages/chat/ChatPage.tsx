import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, Bot, CircleCheck, CircleX, Loader2, MessageSquare,
  SendHorizontal, Settings2, Square, User, Wrench,
} from 'lucide-react'
import { Button } from '../../components/ConfirmDialog'
import { Card, PageHeader } from '../../components/Primitives'
import { cn } from '../../utils/format'
import ChatSidebar from './ChatSidebar'
import Markdown from './Markdown'
import { SwrCache } from './transcript-cache'
import {
  ApiError,
  createSession,
  deleteSession,
  fetchMe,
  getTranscript,
  listAgents,
  listSessions,
  streamSessionMessage,
  type AgentTemplate,
  type DonePayload,
  type ErrorPayload,
  type MeInfo,
  type SessionRecord,
  type TextDeltaPayload,
  type ToolCallPayload,
  type ToolResultPayload,
  type TranscriptMessage,
} from '../../lib/chat-api'

const SETTINGS_KEY = 'managed-agents.settings'

interface LlmSettings {
  mode: 'default' | 'custom'
  apiKey: string
  baseUrl: string
  model: string
}

const DEFAULT_SETTINGS: LlmSettings = {
  mode: 'default',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
}

function loadSettings(): LlmSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<LlmSettings>
    // Settings saved before the mode toggle existed: a saved key means custom.
    const mode = parsed.mode ?? (parsed.apiKey ? 'custom' : 'default')
    return { ...DEFAULT_SETTINGS, ...parsed, mode }
  } catch {
    return DEFAULT_SETTINGS
  }
}

interface ToolEventItem {
  kind: 'tool_call' | 'tool_result'
  data: unknown
}

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  tools: ToolEventItem[]
  done: boolean
  error: string | null
  usage: DonePayload | null
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

/** Extract the display text from a turn's JSON-encoded content_json. */
function turnText(contentJson: string): string {
  try {
    const parsed = JSON.parse(contentJson) as { content?: unknown }
    if (parsed && typeof parsed.content === 'string') return parsed.content
  } catch {
    // fall through — show the raw payload
  }
  return contentJson
}

/**
 * Map a durable transcript to chat bubbles. tool_call/tool_result turns are
 * folded into the next assistant message, matching how live streams render.
 */
function transcriptToMessages(turns: TranscriptMessage[], nextId: () => number): ChatMessage[] {
  const msgs: ChatMessage[] = []
  let pendingTools: ToolEventItem[] = []
  for (const turn of turns) {
    if (turn.role === 'tool_call' || turn.role === 'tool_result') {
      let data: unknown = turn.content_json
      try { data = JSON.parse(turn.content_json) } catch { /* keep the raw string */ }
      pendingTools.push({ kind: turn.role, data })
      continue
    }
    if (turn.role !== 'user' && turn.role !== 'assistant') continue
    msgs.push({
      id: nextId(),
      role: turn.role,
      text: turnText(turn.content_json),
      tools: turn.role === 'assistant' ? pendingTools : [],
      done: true,
      error: null,
      usage: null,
    })
    if (turn.role === 'assistant') pendingTools = []
  }
  return msgs
}

/* ------------------------------ Settings panel ------------------------------ */

function SettingsPanel({
  settings,
  platformBlocked,
  onSave,
}: {
  settings: LlmSettings
  platformBlocked: boolean
  onSave: (next: LlmSettings) => void
}) {
  const [draft, setDraft] = useState(settings)

  const save = (e: FormEvent) => {
    e.preventDefault()
    onSave({
      mode: draft.mode,
      apiKey: draft.apiKey.trim(),
      baseUrl: draft.baseUrl.trim() || DEFAULT_SETTINGS.baseUrl,
      model: draft.model.trim() || DEFAULT_SETTINGS.model,
    })
  }

  const inputCls =
    'h-9 w-full rounded-lg border border-ink-700 bg-ink-850 px-3 text-[13px] text-ink-100 placeholder:text-ink-500 transition-colors focus:border-accent focus:outline-none'

  return (
    <Card className="mb-5 p-5 animate-fade-in">
      <form onSubmit={save} className="space-y-4">
        <div className="flex gap-2">
          {(['default', 'custom'] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={platformBlocked && m === 'default'}
              onClick={() => setDraft((d) => ({ ...d, mode: m }))}
              className={cn(
                'h-8 rounded-lg border px-3 text-[12px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
                draft.mode === m
                  ? 'border-accent bg-accent/10 text-ink-100'
                  : 'border-ink-700 bg-ink-850 text-ink-400 hover:text-ink-200',
              )}
            >
              {m === 'default' ? 'Default provider' : 'Custom provider'}
            </button>
          ))}
        </div>
        {draft.mode === 'default' ? (
          platformBlocked ? (
            <p className="rounded-lg border border-warn-line bg-warn-soft px-3 py-2.5 text-[12px] text-warn">
              Platform provider not enabled for your account — use a custom key or ask an admin.
            </p>
          ) : (
          <p className="rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5 text-[12px] text-ink-400">
            OpenRouter · openai/gpt-oss-20b:free — provided by the platform, no API key needed.
          </p>
          )
        ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">API key</span>
            <input
              type="password"
              className={inputCls}
              value={draft.apiKey}
              onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}
              placeholder="sk-…"
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">Base URL</span>
            <input
              type="text"
              className={inputCls}
              value={draft.baseUrl}
              onChange={(e) => setDraft((d) => ({ ...d, baseUrl: e.target.value }))}
              placeholder={DEFAULT_SETTINGS.baseUrl}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">Model</span>
            <input
              type="text"
              className={inputCls}
              value={draft.model}
              onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
              placeholder={DEFAULT_SETTINGS.model}
            />
          </label>
        </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <p className="text-[12px] text-ink-500">
            Stored in your browser only; sent to the managed-agents backend when a session is created.
            Saving ends the current chat session.
          </p>
          <Button type="submit" size="sm" className="shrink-0">Save settings</Button>
        </div>
      </form>
    </Card>
  )
}

/* ------------------------------ Message bubbles ------------------------------ */

function ToolLine({ item }: { item: ToolEventItem }) {
  if (item.kind === 'tool_call') {
    const d = (item.data ?? {}) as ToolCallPayload
    return (
      <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-500" title={d.arguments_json}>
        <Wrench className="h-3 w-3 shrink-0 text-cyn" />
        <span className="shrink-0 text-ink-400">tool call</span>
        <span className="truncate">{d.tool ?? '?'}{d.arguments_json ? `(${d.arguments_json})` : ''}</span>
      </div>
    )
  }
  const d = (item.data ?? {}) as ToolResultPayload
  const ok = d.ok !== false
  const detail = ok
    ? typeof d.output === 'string' ? d.output : JSON.stringify(d.output ?? '')
    : d.error ?? 'failed'
  return (
    <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-500" title={detail}>
      {ok
        ? <CircleCheck className="h-3 w-3 shrink-0 text-good" />
        : <CircleX className="h-3 w-3 shrink-0 text-bad" />}
      <span className="shrink-0 text-ink-400">tool result</span>
      <span className="truncate">{d.tool ?? '?'}: {detail}</span>
    </div>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[80%] rounded-xl border border-accent/25 bg-accent/15 px-4 py-3">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-100">{msg.text}</p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-info-line bg-info-soft text-info">
          <User className="h-4 w-4" />
        </span>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-vio-line bg-vio-soft text-vio">
        <Bot className="h-4 w-4" />
      </span>
      <div className="max-w-[80%] rounded-xl border border-ink-700 bg-ink-850 px-4 py-3">
        {msg.tools.length > 0 && (
          <div className={cn('space-y-1', (msg.text || msg.error) && 'mb-2')}>
            {msg.tools.map((tool, i) => <ToolLine key={i} item={tool} />)}
          </div>
        )}
        {msg.text && <Markdown text={msg.text} />}
        {!msg.text && !msg.done && !msg.error && (
          <p className="flex items-center gap-2 text-[13px] text-ink-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking…
          </p>
        )}
        {msg.error && (
          <div className="mt-1 flex items-start gap-1.5 rounded-lg border border-bad-line bg-bad-soft px-2.5 py-1.5 text-[12px] text-bad">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{msg.error}</span>
          </div>
        )}
        {msg.done && msg.usage && (msg.usage.input_tokens != null || msg.usage.output_tokens != null) && (
          <div className="mt-2 font-mono text-[10px] text-ink-500">
            tokens: ↑ {msg.usage.input_tokens ?? '—'} · ↓ {msg.usage.output_tokens ?? '—'}
          </div>
        )}
      </div>
    </div>
  )
}

/* --------------------------------- Page --------------------------------- */

export default function ChatPage() {
  const { id: routeId = null } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [settings, setSettings] = useState<LlmSettings>(loadSettings)
  // Auto-open settings only when configuration is actually needed:
  // custom mode without a key. Default mode works out of the box.
  const [settingsOpen, setSettingsOpen] = useState(() => {
    const s = loadSettings()
    return s.mode === 'custom' && !s.apiKey
  })
  // /api/me capability flags. null = unknown (fetch failed or in flight) —
  // degrade gracefully and let the backend be the gate.
  const [me, setMe] = useState<MeInfo | null>(null)

  // Agent templates for the new-chat picker and the in-chat name badge.
  // null = load in flight/failed — never block the chat on this.
  const [agents, setAgents] = useState<AgentTemplate[] | null>(null)
  // '' = "No agent" (ad-hoc LLM settings apply to a fresh chat).
  const [selectedAgentId, setSelectedAgentId] = useState('')

  const [sessions, setSessions] = useState<SessionRecord[] | null>(null)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [sessionMissing, setSessionMissing] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const nextMsgId = useRef(1)
  const bottomRef = useRef<HTMLDivElement>(null)
  // Session created by the first message of a fresh /chat — the route change
  // it triggers must not wipe the live stream by reloading the transcript.
  const createdIdRef = useRef<string | null>(null)
  // Component-lifetime SWR transcript cache: revisits render instantly from
  // cache while the network copy revalidates in the background.
  const cacheRef = useRef(new SwrCache<ChatMessage[]>())
  // Latest messages for the transcript effect's cleanup (cache on leave).
  const messagesRef = useRef<ChatMessage[]>([])
  // Set when the server answers 410/404/403 — never cache such a session.
  const sessionGoneRef = useRef(false)

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  // Sidebar session list.
  useEffect(() => {
    let cancelled = false
    listSessions()
      .then((list) => { if (!cancelled) setSessions(list) })
      .catch((err) => { if (!cancelled) setSessionsError(err instanceof Error ? err.message : String(err)) })
    return () => { cancelled = true }
  }, [])

  // Capability flags — best effort; a network failure must not block custom-key chatting.
  useEffect(() => {
    let cancelled = false
    fetchMe()
      .then((info) => { if (!cancelled) setMe(info) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Agent templates — best effort; powers the new-chat picker and resolves
  // the open session's agent_id to a display name. Failures just hide both.
  useEffect(() => {
    let cancelled = false
    listAgents()
      .then((list) => { if (!cancelled) setAgents(list) })
      .catch(() => { if (!cancelled) setAgents([]) })
    return () => { cancelled = true }
  }, [])

  // The platform default provider is gated on whitelist membership.
  const platformBlocked = me !== null && !me.can_use_platform_llm

  // Resolve the open session's template to a name. A deleted template (or
  // one missing from the list) simply shows no badge.
  const sessionAgentId = routeId
    ? (sessions?.find((s) => s.id === routeId)?.agent_id ?? '')
    : selectedAgentId
  const activeAgentName = sessionAgentId
    ? agents?.find((a) => a.id === sessionAgentId)?.name
    : undefined

  // Surface the settings panel when the saved default mode can't be used
  // (an agent template brings its own LLM, so it doesn't apply then).
  useEffect(() => {
    if (platformBlocked && settings.mode === 'default' && !selectedAgentId) setSettingsOpen(true)
  }, [platformBlocked, settings.mode, selectedAgentId])

  // Load the transcript whenever the URL picks a session. SWR: a cached
  // transcript renders instantly while the network copy revalidates in the
  // background (no loading state); a miss shows the loading state as before.
  useEffect(() => {
    // A session created from /chat adopts its id in the URL while its first
    // turn streams live — skip the reload for it (kept until navigation moves
    // away). Not consumed on match so StrictMode's double effect in dev
    // doesn't reload and wipe the live turn.
    if (createdIdRef.current && createdIdRef.current !== routeId) createdIdRef.current = null
    if (routeId && createdIdRef.current === routeId) return
    abortRef.current?.abort()
    setStreaming(false)
    setSessionEnded(false)
    setSessionMissing(false)
    setHistoryError(null)
    sessionGoneRef.current = false
    if (!routeId) {
      setMessages([])
      return
    }
    const cache = cacheRef.current
    const hasCached = cache.has(routeId)
    const displayed = cache.get(routeId) ?? []
    setMessages(displayed)
    let cancelled = false
    if (!hasCached) setHistoryLoading(true)
    // Always revalidate — in the background when a cached view is on screen.
    getTranscript(routeId)
      .then((turns) => {
        if (cancelled) return
        // The user may have started a new turn while this fetch was in
        // flight (the composer is enabled on a cache hit). If local state
        // moved past what we displayed, it is ahead of the server copy —
        // keep it; the leave-cleanup will cache the local view instead.
        if (messagesRef.current !== displayed) return
        const fresh = transcriptToMessages(turns, () => nextMsgId.current++)
        setMessages(fresh)
        cache.set(routeId, fresh)
        const firstUser = turns.find((t) => t.role === 'user')
        if (firstUser) {
          const title = turnText(firstUser.content_json).trim().slice(0, 40)
          if (title) setTitles((t) => (t[routeId] ? t : { ...t, [routeId]: title }))
        }
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 410) {
          sessionGoneRef.current = true
          cache.delete(routeId)
          setSessionEnded(true)
        } else if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
          sessionGoneRef.current = true
          cache.delete(routeId)
          setSessionMissing(true)
        } else if (!hasCached) {
          // With a cached view on screen, keep it — the next visit revalidates.
          setHistoryError(err instanceof Error ? err.message : String(err))
        }
      })
      .finally(() => { if (!cancelled) setHistoryLoading(false) })
    return () => {
      cancelled = true
      // Cache live turns when navigating away so revisiting renders instantly;
      // never cache sessions the server says are gone or ended.
      if (routeId && !sessionGoneRef.current && messagesRef.current.length > 0) {
        cache.set(routeId, messagesRef.current)
      }
    }
  }, [routeId])

  // The sidebar list knows a session is ended before any transcript request.
  useEffect(() => {
    if (routeId && sessions?.find((s) => s.id === routeId)?.status === 'ended') setSessionEnded(true)
  }, [routeId, sessions])

  // Stop the in-flight turn. The abort path in `send` keeps the partial
  // assistant text and just marks the bubble done.
  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const newChat = useCallback(() => {
    if (routeId !== null) {
      // The route change clears state via the transcript effect.
      navigate('/chat')
      return
    }
    abortRef.current?.abort()
    setStreaming(false)
    setMessages([])
    setSessionEnded(false)
    setSessionMissing(false)
    setHistoryError(null)
  }, [navigate, routeId])

  const endChat = useCallback(
    (sid: string) => {
      deleteSession(sid).catch(() => {}) // best effort
      cacheRef.current.delete(sid)
      // Ending the open session navigates away — don't re-cache it on leave.
      if (sid === routeId) sessionGoneRef.current = true
      setSessions((list) => list?.filter((s) => s.id !== sid) ?? list)
      setTitles((t) => {
        const next = { ...t }
        delete next[sid]
        return next
      })
      if (sid === routeId) navigate('/chat')
    },
    [navigate, routeId],
  )

  // Sidebar hover prefetch: warm the transcript cache so selecting a session
  // renders instantly. Best-effort — failures are swallowed and surface (if
  // still relevant) on real navigation. Ended sessions are fine to prefetch;
  // their transcripts are immutable.
  const prefetchSession = useCallback((sid: string) => {
    const cache = cacheRef.current
    if (cache.has(sid)) return
    getTranscript(sid)
      .then((turns) => cache.set(sid, transcriptToMessages(turns, () => nextMsgId.current++)))
      .catch(() => {})
  }, [])

  const saveSettings = useCallback(
    (next: LlmSettings) => {
      setSettings(next)
      setSettingsOpen(false)
      // LLM credentials are bound to the session, so the current chat ends.
      if (routeId) endChat(routeId)
      else navigate('/chat')
    },
    [endChat, navigate, routeId],
  )

  const send = useCallback(
    async (content: string) => {
      const text = content.trim()
      if (!text || streaming || historyLoading || sessionEnded || sessionMissing || historyError) return

      const userMsg: ChatMessage = {
        id: nextMsgId.current++, role: 'user', text,
        tools: [], done: true, error: null, usage: null,
      }
      const assistantMsg: ChatMessage = {
        id: nextMsgId.current++, role: 'assistant', text: '',
        tools: [], done: false, error: null, usage: null,
      }
      setMessages((msgs) => [...msgs, userMsg, assistantMsg])
      setStreaming(true)
      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        setMessages((msgs) => msgs.map((m) => (m.id === assistantMsg.id ? fn(m) : m)))

      try {
        let sid = routeId
        if (!sid) {
          // First message of a fresh chat: create the session, then adopt its
          // id in the URL so refresh restores the conversation. With an agent
          // template selected it governs the LLM/prompt/tools — the local LLM
          // settings are not sent at all.
          const newId = selectedAgentId
            ? await createSession({ agentId: selectedAgentId })
            : settings.mode === 'custom' && settings.apiKey
              ? await createSession({
                  llm: {
                    api_key: settings.apiKey,
                    base_url: settings.baseUrl,
                    model: settings.model,
                  },
                })
              : await createSession()
          sid = newId
          createdIdRef.current = newId
          const now = new Date().toISOString()
          const record: SessionRecord = {
            id: newId, user_id: '', status: 'active',
            agent_id: selectedAgentId || undefined,
            created_at: now, last_active: now,
          }
          setSessions((list) => [record, ...(list ?? [])])
          const title = text.slice(0, 40)
          setTitles((t) => ({ ...t, [newId]: title }))
          navigate(`/chat/${newId}`)
        }

        const controller = new AbortController()
        abortRef.current = controller
        await streamSessionMessage(sid, text, {
          signal: controller.signal,
          onEvent: (event, data) => {
            switch (event) {
              case 'text_delta': {
                const delta =
                  typeof data === 'string'
                    ? data
                    : ((data as TextDeltaPayload)?.delta ??
                      (data as TextDeltaPayload)?.content ??
                      (data as TextDeltaPayload)?.text ??
                      '')
                if (delta) patch((m) => ({ ...m, text: m.text + delta }))
                break
              }
              case 'tool_call':
              case 'tool_result':
                patch((m) => ({
                  ...m,
                  tools: [...m.tools, { kind: event as ToolEventItem['kind'], data }],
                }))
                break
              case 'error': {
                const message =
                  typeof data === 'string'
                    ? data
                    : ((data as ErrorPayload)?.message ?? JSON.stringify(data))
                patch((m) => ({ ...m, error: message, done: true }))
                break
              }
              case 'done':
                patch((m) => ({ ...m, done: true, usage: (data as DonePayload) ?? null }))
                break
              default:
                break
            }
          },
        })
        patch((m) => (m.done ? m : { ...m, done: true }))
      } catch (err) {
        if (isAbortError(err)) {
          patch((m) => ({ ...m, done: true }))
          return
        }
        if (err instanceof ApiError && err.status === 410) {
          setSessionEnded(true)
          patch((m) => ({ ...m, done: true, error: m.error ?? 'This session has ended on the server.' }))
        } else {
          const message = err instanceof Error ? err.message : String(err)
          patch((m) => ({ ...m, done: true, error: m.error ?? message }))
        }
      } finally {
        setStreaming(false)
        abortRef.current = null
      }
    },
    [routeId, settings, selectedAgentId, streaming, historyLoading, sessionEnded, sessionMissing, historyError, navigate],
  )

  // An agent template brings its own LLM (key stored server-side), so a fresh
  // chat with one selected doesn't depend on the local LLM settings.
  const agentSelected = !routeId && selectedAgentId !== ''
  const ready = agentSelected
    ? true
    : settings.mode === 'default'
      ? !platformBlocked
      : Boolean(settings.apiKey)
  const blocked = sessionEnded || sessionMissing || historyError !== null || historyLoading
  const placeholder = sessionEnded
    ? 'This session has ended — start a new chat'
    : sessionMissing
      ? 'This chat is unavailable'
      : ready
        ? 'Message… (Enter to send, Shift+Enter for newline)'
        : platformBlocked && settings.mode === 'default'
          ? 'Platform provider not enabled — set a custom key in LLM settings'
          : 'Configure your LLM settings first'

  return (
    <div className="flex h-full gap-6">
      <ChatSidebar
        sessions={sessions}
        error={sessionsError}
        activeId={routeId}
        titles={titles}
        onNew={newChat}
        onSelect={(sid) => navigate(`/chat/${sid}`)}
        onEnd={endChat}
        onPrefetchSession={prefetchSession}
      />

      <div className="mx-auto flex w-full min-w-0 max-w-[860px] flex-1 flex-col">
        <PageHeader
          title="Chat"
          description="Talk to a managed agent over a live SSE stream."
          actions={
            <>
              {/* Agent picker — new chats only; the template then governs the
                  session's LLM, system prompt, and tools. */}
              {!routeId && agents !== null && agents.length > 0 && (
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  title="Agent template for the new chat"
                  className="h-8 rounded-lg border border-ink-700 bg-ink-850 px-2 text-[12px] text-ink-100 transition-colors focus:border-accent focus:outline-none"
                >
                  <option value="">No agent</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
              {activeAgentName && (
                <span className="flex items-center gap-1.5 rounded-full border border-vio-line bg-vio-soft px-2.5 py-1 text-[11px] font-medium text-vio">
                  <Bot className="h-3 w-3" />
                  {activeAgentName}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => setSettingsOpen((o) => !o)}>
                <Settings2 className="h-3.5 w-3.5" />
                LLM settings
                {!ready && <span className="rounded border border-warn-line bg-warn-soft px-1 font-mono text-[9px] uppercase text-warn">required</span>}
              </Button>
            </>
          }
        />

        {settingsOpen && <SettingsPanel key={settings.apiKey + settings.baseUrl + settings.model} settings={settings} platformBlocked={platformBlocked} onSave={saveSettings} />}

        {sessionEnded && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-warn-line bg-warn-soft px-4 py-3 text-[13px] text-warn animate-fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="flex-1">This session has ended.</span>
            <button
              type="button"
              onClick={newChat}
              className="font-semibold underline underline-offset-2 transition-colors hover:text-ink-100"
            >
              Start a new chat
            </button>
          </div>
        )}

        {sessionMissing && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-bad-line bg-bad-soft px-4 py-3 text-[13px] text-bad animate-fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="flex-1">This chat could not be found, or it belongs to someone else.</span>
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="font-semibold underline underline-offset-2 transition-colors hover:text-ink-100"
            >
              Back to chats
            </button>
          </div>
        )}

        {historyError && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-bad-line bg-bad-soft px-4 py-3 text-[13px] text-bad animate-fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="flex-1">Failed to load this conversation: {historyError}</span>
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="font-semibold underline underline-offset-2 transition-colors hover:text-ink-100"
            >
              Back to chats
            </button>
          </div>
        )}

        <Card className="flex min-h-0 flex-1 flex-col">
          {/* Messages */}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            {historyLoading && (
              <div className="flex h-full items-center justify-center gap-2 text-[13px] text-ink-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading conversation…
              </div>
            )}
            {!historyLoading && messages.length === 0 && !sessionMissing && !historyError && !sessionEnded && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-ink-700 bg-ink-850 text-ink-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="font-display text-[15px] font-semibold text-ink-100">No messages yet</h3>
                <p className="mt-1 max-w-sm text-[13px] text-ink-400">
                  {ready
                    ? 'Send a message to start a session — one is created lazily on your first message.'
                    : 'Set your LLM API key in LLM settings above to start chatting.'}
                </p>
              </div>
            )}
            {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <Composer ready={ready && !blocked} streaming={streaming} placeholder={placeholder} onSend={send} onStop={stop} />
        </Card>
      </div>
    </div>
  )
}

function Composer({
  ready,
  streaming,
  placeholder,
  onSend,
  onStop,
}: {
  ready: boolean
  streaming: boolean
  placeholder: string
  onSend: (content: string) => void
  onStop: () => void
}) {
  const [input, setInput] = useState('')

  const submit = () => {
    if (!ready || streaming || !input.trim()) return
    onSend(input)
    setInput('')
  }

  return (
    <div className="flex items-end gap-3 border-t border-ink-800 p-4">
      <textarea
        rows={2}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        placeholder={placeholder}
        disabled={!ready}
        className="flex-1 resize-none rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-[13px] leading-relaxed text-ink-100 placeholder:text-ink-500 transition-colors focus:border-accent focus:outline-none disabled:opacity-50"
      />
      {streaming ? (
        <Button variant="outline" onClick={onStop}>
          <Square className="h-3.5 w-3.5" />
          Stop
        </Button>
      ) : (
        <Button onClick={submit} disabled={!ready || !input.trim()}>
          <SendHorizontal className="h-3.5 w-3.5" />
          Send
        </Button>
      )}
    </div>
  )
}
