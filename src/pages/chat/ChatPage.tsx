import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, Bot, CircleCheck, CircleX, Loader2, MessageSquare,
  SendHorizontal, Square, User, Wrench,
} from 'lucide-react'
import { Button } from '../../components/ConfirmDialog'
import { Card, PageHeader } from '../../components/Primitives'
import { cn } from '../../utils/format'
import ChatSidebar from './ChatSidebar'
import Markdown from './Markdown'
import { SwrCache, TRANSCRIPT_STORAGE_PREFIX } from './transcript-cache'
import {
  ApiError,
  createSession,
  deleteSession,
  fetchMe,
  cancelTurn,
  fetchIncompleteSeqs,
  fetchRequestState,
  getTranscript,
  isArchived,
  isPlatform,
  listAgents,
  listSessions,
  purgeSession,
  renameSession,
  streamSessionMessage,
  turnUsage,
  PLATFORM_AGENT_ID,
  type AgentTemplate,
  doneUsage,
  toolResultPayload,
  type DonePayload,
  type RequestExecutionState,
  type ErrorPayload,
  type MeInfo,
  type SessionRecord,
  type TextDeltaPayload,
  type ToolCallPayload,
  type ToolResultPayload,
  type TranscriptMessage,
} from '../../lib/chat-api'

const SESSIONS_PAGE_SIZE = 50
const HISTORY_PAGE_SIZE = 50

interface ToolEventItem {
  kind: 'tool_call' | 'tool_result'
  data: unknown
}

interface ChatMessage {
  id: number
  /** durable transcript seq; undefined for live, not-yet-saved turns */
  seq?: number
  role: 'user' | 'assistant' | 'system'
  text: string
  tools: ToolEventItem[]
  done: boolean
  error: string | null
  usage: { input_tokens?: number; output_tokens?: number } | null
  /**
   * The request identity this turn was admitted under. Kept so a reconnect can
   * replay it and be deduplicated rather than starting a second request.
   */
  requestId?: string
  /** The user text that produced this turn, for a later resend. */
  sourceText?: string
  /** A neutral explanation shown under the bubble (e.g. a deduplicated resend). */
  note?: string
  /** the stream broke (error/abort) mid-turn — this text was never written
   * to the durable transcript */
  partial: boolean
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
 * system turns (the session's system prompt, recorded by the runtime) become
 * centered notices; they never absorb pending tool turns. config turns
 * (session metadata: the redacted LLM base_url/model triple) are not chat
 * content and are skipped like any other non-chat role.
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
    if (turn.role === 'system') {
      msgs.push({
        id: nextId(),
        seq: turn.seq,
        role: 'system',
        text: turnText(turn.content_json),
        tools: [],
        done: true,
        error: null,
        usage: null,
        partial: false,
      })
      continue
    }
    // config turns are session metadata (the redacted LLM base_url/model
    // triple), not chat content — skip them like any other non-chat role.
    if (turn.role === 'config') continue
    if (turn.role !== 'user' && turn.role !== 'assistant') continue
    msgs.push({
      id: nextId(),
      seq: turn.seq,
      role: turn.role,
      text: turnText(turn.content_json),
      tools: turn.role === 'assistant' ? pendingTools : [],
      done: true,
      error: null,
      usage: turn.role === 'assistant' ? turnUsage(turn.content_json) : null,
      partial: false,
    })
    if (turn.role === 'assistant') pendingTools = []
  }
  return msgs
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

/**
 * What the durable record says about the latest request, in the user's terms.
 * A completed request says nothing — the transcript already shows it.
 */
const REQUEST_NOTICES: Record<string, string> = {
  EXECUTION_STATUS_QUEUED: 'The last request is queued and has not started yet.',
  EXECUTION_STATUS_RUNNING: 'The last request is still running on the server.',
  EXECUTION_STATUS_FAILED: 'The last request ended in failure.',
  EXECUTION_STATUS_CANCELLED: 'The last request was cancelled.',
  EXECUTION_STATUS_INTERRUPTED: 'The last request was interrupted and may need a resend.',
}

function MessageBubble({ msg, onResend }: { msg: ChatMessage; onResend: (msg: ChatMessage) => void }) {
  if (msg.role === 'system') {
    // System-prompt record: a centered muted notice, not a chat bubble. Long
    // prompts truncate to one line; the full text is in the tooltip.
    return (
      <div className="flex justify-center">
        <p
          className="max-w-[85%] truncate rounded-full border border-ink-700 bg-ink-850 px-3 py-1 text-[11px] text-ink-500"
          title={msg.text}
        >
          System prompt: {msg.text}
        </p>
      </div>
    )
  }

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
        {msg.done && msg.partial && (
          <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-warn">
            <span>partial — not saved</span>
            {msg.sourceText && (
              <button
                type="button"
                onClick={() => onResend(msg)}
                className="rounded border border-warn-line px-1.5 py-0.5 text-warn transition-colors hover:bg-warn-soft"
              >
                resend
              </button>
            )}
          </div>
        )}
        {msg.note && <div className="mt-2 font-mono text-[10px] text-ink-500">{msg.note}</div>}
      </div>
    </div>
  )
}

/* --------------------------------- Page --------------------------------- */

export default function ChatPage() {
  const { id: routeId = null } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // /api/me capability flags. null = unknown (fetch failed or in flight) —
  // degrade gracefully and let the backend be the gate.
  const [me, setMe] = useState<MeInfo | null>(null)

  // Agent templates for the new-chat picker and the in-chat name badge.
  // null = load in flight/failed — never block the chat on this.
  const [agents, setAgents] = useState<AgentTemplate[] | null>(null)
  // '' = nothing selected yet — every chat session runs an agent template, so
  // a fresh chat can't send until one is picked (see the default-pick below).
  const [selectedAgentId, setSelectedAgentId] = useState('')

  const [sessions, setSessions] = useState<SessionRecord[] | null>(null)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [sessionsHasMore, setSessionsHasMore] = useState(false)
  const [sessionsLoadingMore, setSessionsLoadingMore] = useState(false)
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  // The durable record's view of the latest request. The live stream only
  // describes turns this browser watched, so a turn that failed, was cancelled,
  // or is still running elsewhere is only visible here.
  const [requestState, setRequestState] = useState<RequestExecutionState | null>(null)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
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
  // Component-lifetime SWR transcript cache (sessionStorage-backed): revisits
  // render instantly from cache while the network copy revalidates.
  const cacheRef = useRef(new SwrCache<ChatMessage[]>(TRANSCRIPT_STORAGE_PREFIX))
  // Latest messages for the transcript effect's cleanup (cache on leave).
  const messagesRef = useRef<ChatMessage[]>([])
  // Set when the server answers 410/404/403 — never cache such a session.
  const sessionGoneRef = useRef(false)
  // Transcript pagination for the open session: every seq already loaded
  // (including tool turns folded into bubbles) and the smallest one, which
  // becomes before_seq when paging backwards.
  const loadedSeqsRef = useRef<Set<number>>(new Set())
  const oldestSeqRef = useRef<number | null>(null)
  // Per-session "older messages exist" — survives cache-hit revisits where
  // the revalidating fetch is discarded because local state moved ahead.
  const historyHasMoreRef = useRef<Record<string, boolean>>({})
  // Set while prepending earlier history so the scroll effect doesn't yank
  // the view to the bottom.
  const skipScrollRef = useRef(false)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false
      return
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  // Sidebar session list — first page only; "Load more" appends the rest.
  useEffect(() => {
    let cancelled = false
    listSessions({ limit: SESSIONS_PAGE_SIZE })
      .then((page) => {
        if (cancelled) return
        setSessions(page.sessions)
        setSessionsHasMore(page.has_more)
      })
      .catch((err) => { if (!cancelled) setSessionsError(err instanceof Error ? err.message : String(err)) })
    return () => { cancelled = true }
  }, [])

  // Append the next page of sessions (deduped by id — a session created or
  // ended locally may already be in the list).
  const loadMoreSessions = useCallback(() => {
    if (sessionsLoadingMore) return
    setSessionsLoadingMore(true)
    listSessions({ limit: SESSIONS_PAGE_SIZE, offset: sessions?.length ?? 0 })
      .then((page) => {
        setSessions((list) => {
          const seen = new Set((list ?? []).map((s) => s.id))
          return [...(list ?? []), ...page.sessions.filter((s) => !seen.has(s.id))]
        })
        setSessionsHasMore(page.has_more)
      })
      .catch(() => {}) // transient; the button stays for a retry
      .finally(() => setSessionsLoadingMore(false))
  }, [sessions?.length, sessionsLoadingMore])

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

  // Archived templates are excluded from selection only: they still resolve a
  // session's agent_id to a display name, and the backend refuses them at
  // admission anyway (410), so this keeps the picker from offering a choice
  // that cannot succeed.
  const selectableAgents = agents === null ? null : agents.filter((a) => !isArchived(a))

  // Default-select an agent template on a fresh /chat, once agents and
  // /api/me have both loaded. Members get the built-in Default assistant
  // (falling back to the first platform template); anyone else gets the first
  // selectable private template (platform_default ones would 403 on send).
  // Once only, so a later manual choice is never overridden. A failed /api/me
  // leaves the picker unselected rather than guessing at capabilities.
  const defaultAgentPickedRef = useRef(false)
  useEffect(() => {
    if (routeId || defaultAgentPickedRef.current || !selectableAgents || !me) return
    defaultAgentPickedRef.current = true
    const pick = me.can_use_platform_llm
      ? selectableAgents.find((a) => a.id === PLATFORM_AGENT_ID) ?? selectableAgents.find((a) => isPlatform(a))
      : selectableAgents.find((a) => !isPlatform(a) && a.llm_mode !== 'platform_default')
    if (pick) setSelectedAgentId(pick.id)
  }, [routeId, selectableAgents, me])

  // Resolve the open session's template to a name. A deleted template (or
  // one missing from the list) simply shows no badge.
  const sessionAgentId = routeId
    ? (sessions?.find((s) => s.id === routeId)?.agent_id ?? '')
    : selectedAgentId
  const activeAgentName = sessionAgentId
    ? agents?.find((a) => a.id === sessionAgentId)?.name
    : undefined

  // A fresh chat needs a selectable template: platform_default options are
  // gated on platform-LLM access (they would 403 on send). The list loaded
  // but nothing in it can be picked — mainly a non-member with no private
  // templates, since members always have the built-ins.
  const hasSelectableAgent =
    selectableAgents !== null &&
    selectableAgents.some((a) => !(platformBlocked && a.llm_mode === 'platform_default'))
  const noUsableAgent = !routeId && selectableAgents !== null && !hasSelectableAgent

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
    loadedSeqsRef.current = new Set()
    oldestSeqRef.current = null
    if (!routeId) {
      setMessages([])
      setHasMoreHistory(false)
      return
    }
    const cache = cacheRef.current
    const hasCached = cache.has(routeId)
    const displayed = cache.get(routeId) ?? []
    setMessages(displayed)
    // A cached view may include earlier pages loaded on a previous visit;
    // restore the remembered pagination flag until the fetch decides.
    setHasMoreHistory(historyHasMoreRef.current[routeId] ?? false)
    let cancelled = false
    if (!hasCached) setHistoryLoading(true)
    // Always revalidate — in the background when a cached view is on screen.
    // Fetches the LATEST window; older pages load via the button up top.
    getTranscript(routeId, { limit: HISTORY_PAGE_SIZE })
      .then((page) => {
        if (cancelled) return
        // The user may have started a new turn while this fetch was in
        // flight (the composer is enabled on a cache hit). If local state
        // moved past what we displayed, it is ahead of the server copy —
        // keep it; the leave-cleanup will cache the local view instead.
        if (messagesRef.current !== displayed) return
        const turns = page.messages
        const fresh = transcriptToMessages(turns, () => nextMsgId.current++)
        setMessages(fresh)
        cache.set(routeId, fresh)
        loadedSeqsRef.current = new Set(turns.map((t) => t.seq))
        // The flat transcript cannot say that a turn was cut short; the
        // canonical record can. Mark those turns so a reload does not present
        // unfinished output as if it had completed.
        void fetchIncompleteSeqs(routeId)
          .then((incomplete) => {
            if (cancelled || Object.keys(incomplete).length === 0) return
            // The existing "partial — not saved" marker already says this;
            // adding a note too would say it twice.
            const mark = (list: ChatMessage[]) =>
              list.map((m) => (m.seq !== undefined && incomplete[m.seq] ? { ...m, partial: true } : m))
            setMessages((current) => {
              const marked = mark(current)
              cache.set(routeId, marked)
              return marked
            })
          })
          .catch(() => {})
        oldestSeqRef.current = turns.length > 0 ? turns[0].seq : null
        historyHasMoreRef.current[routeId] = page.has_more
        setHasMoreHistory(page.has_more)
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
    fetchRequestState(routeId)
      .then((state) => { if (!cancelled) setRequestState(state) })
      .catch(() => { if (!cancelled) setRequestState(null) })
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

  // Cancel a turn this browser is not streaming — one running on another
  // replica, or one left running after the connection dropped. Aborting a fetch
  // cannot reach either, which is why the runtime has its own cancel RPC.
  const cancelRemoteTurn = useCallback(
    async (sessionId: string, requestMessageId: string) => {
      const accepted = await cancelTurn(sessionId, requestMessageId)
      // Re-read the record: cancellation is cooperative, so the runtime may take
      // a moment to stop and write the terminal state.
      const state = await fetchRequestState(sessionId).catch(() => null)
      setRequestState(
        accepted && state
          ? state
          : { request_message_id: requestMessageId, status: 'EXECUTION_STATUS_CANCELLED', cancellation_requested: true },
      )
    },
    [],
  )

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
      delete historyHasMoreRef.current[sid]
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
    getTranscript(sid, { limit: HISTORY_PAGE_SIZE })
      .then((page) => cache.set(sid, transcriptToMessages(page.messages, () => nextMsgId.current++)))
      .catch(() => {})
  }, [])

  // Prepend the previous window of transcript turns. Deduped by seq (a page
  // boundary can re-deliver a folded tool turn), then cached so a revisit
  // keeps the assembled history.
  const loadEarlier = useCallback(() => {
    if (!routeId || loadingEarlier || !hasMoreHistory) return
    const beforeSeq = oldestSeqRef.current
    if (beforeSeq == null) return
    setLoadingEarlier(true)
    getTranscript(routeId, { limit: HISTORY_PAGE_SIZE, beforeSeq })
      .then((page) => {
        const older = page.messages.filter((t) => !loadedSeqsRef.current.has(t.seq))
        for (const t of page.messages) loadedSeqsRef.current.add(t.seq)
        if (older.length > 0) {
          oldestSeqRef.current = older[0].seq // turns arrive ascending by seq
          const olderMsgs = transcriptToMessages(older, () => nextMsgId.current++)
          const merged = [...olderMsgs, ...messagesRef.current]
          skipScrollRef.current = true // prepending must not scroll to bottom
          setMessages(merged)
          cacheRef.current.set(routeId, merged)
        }
        historyHasMoreRef.current[routeId] = page.has_more
        setHasMoreHistory(page.has_more)
      })
      .catch(() => {}) // transient; the button stays for a retry
      .finally(() => setLoadingEarlier(false))
  }, [routeId, loadingEarlier, hasMoreHistory])

  // User rename — empty titles never reach here (the sidebar no-ops them).
  const renameChat = useCallback((sid: string, title: string) => {
    renameSession(sid, title)
      .then(() => {
        setSessions((list) => list?.map((s) => (s.id === sid ? { ...s, title } : s)) ?? list)
      })
      .catch(() => {}) // the old title stays; the next list refresh settles it
  }, [])

  // Hard delete (purge): session + transcript are gone server-side, so drop
  // every local trace too (SWR cache, sessionStorage entry, sidebar, title).
  const purgeChat = useCallback(
    (sid: string) => {
      purgeSession(sid).catch(() => {}) // best effort
      cacheRef.current.delete(sid)
      delete historyHasMoreRef.current[sid]
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

  const send = useCallback(
    async (content: string, opts?: { clientRequestId?: string; replaceId?: number }) => {
      const text = content.trim()
      if (!text || streaming || historyLoading || sessionEnded || sessionMissing || historyError) return
      // Every session runs an agent template — a fresh chat can't start without one.
      if (!routeId && !selectedAgentId) return

      const userMsg: ChatMessage = {
        id: nextMsgId.current++, role: 'user', text,
        tools: [], done: true, error: null, usage: null, partial: false,
      }
      const assistantMsg: ChatMessage = {
        id: nextMsgId.current++, role: 'assistant', text: '',
        tools: [], done: false, error: null, usage: null, partial: false,
        sourceText: text,
      }
      // A resend re-drives the same bubble under the identity the turn was
      // already admitted with, so session-manager recognises the request
      // instead of admitting a second one.
      let targetId = assistantMsg.id
      if (opts?.replaceId !== undefined) {
        targetId = opts.replaceId
        setMessages((msgs) =>
          msgs.map((m) =>
            m.id === targetId
              ? { ...m, text: '', tools: [], done: false, error: null, usage: null, partial: false, note: undefined }
              : m,
          ),
        )
      } else {
        setMessages((msgs) => [...msgs, userMsg, assistantMsg])
      }
      setStreaming(true)
      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        setMessages((msgs) => msgs.map((m) => (m.id === targetId ? fn(m) : m)))

      try {
        let sid = routeId
        if (!sid) {
          // First message of a fresh chat: create the session, then adopt its
          // id in the URL so refresh restores the conversation. The selected
          // agent template governs the session's LLM/prompt/tools.
          const newId = await createSession({ agentId: selectedAgentId })
          sid = newId
          createdIdRef.current = newId
          const now = new Date().toISOString()
          const record: SessionRecord = {
            id: newId, user_id: '', status: 'active',
            agent_id: selectedAgentId,
            created_at: now, last_active: now,
          }
          setSessions((list) => [record, ...(list ?? [])])
          const title = text.slice(0, 40)
          setTitles((t) => ({ ...t, [newId]: title }))
          navigate(`/chat/${newId}`)
        }

        const controller = new AbortController()
        abortRef.current = controller
        const requestId = await streamSessionMessage(sid, text, {
          signal: controller.signal,
          clientRequestId: opts?.clientRequestId,
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
                  tools: [...m.tools, { kind: event as ToolEventItem['kind'], data: toolResultPayload(data) }],
                }))
                break
              case 'error': {
                const message =
                  typeof data === 'string'
                    ? data
                    : ((data as ErrorPayload)?.message ?? JSON.stringify(data))
                // A backend error event ends the turn without a done frame —
                // partial text on screen was never written to the transcript.
                patch((m) => ({
                  ...m,
                  error: message,
                  done: true,
                  partial: m.text.length > 0 || m.tools.length > 0,
                }))
                break
              }
              case 'done':
                // Normalize here so the renderer only ever sees flat counts,
                // whether the backend streamed the v1 frame or the durable one.
                patch((m) => ({ ...m, done: true, usage: doneUsage(data as DonePayload) }))
                break
              default:
                break
            }
          },
        })
        // Record the identity the backend confirmed, then mark an unterminated
        // turn: a stream that ended without a done frame (connection dropped
        // mid-turn) leaves text that was never written to the transcript.
        patch((m) => ({
          ...(m.done ? m : { ...m, done: true, partial: m.text.length > 0 || m.tools.length > 0 }),
          requestId,
          // A deduplicated resend comes back with the existing request's state
          // and no new output. Say so plainly: the turn was accepted, it is not
          // a failure, and the transcript already holds it.
          note:
            opts?.replaceId !== undefined && m.text.length === 0 && m.tools.length === 0 && !m.error
              ? 'already accepted — this turn is on the server; reload to see it'
              : m.note,
        }))
      } catch (err) {
        if (isAbortError(err)) {
          // Stop button (or navigation): keep the partial text, flag it.
          patch((m) => ({ ...m, done: true, partial: m.text.length > 0 || m.tools.length > 0 }))
          return
        }
        if (err instanceof ApiError && err.status === 410) {
          setSessionEnded(true)
          patch((m) => ({
            ...m,
            done: true,
            error: m.error ?? 'This session has ended on the server.',
            partial: m.text.length > 0 || m.tools.length > 0,
          }))
        } else {
          const message = err instanceof Error ? err.message : String(err)
          patch((m) => ({
            ...m,
            done: true,
            error: m.error ?? message,
            partial: m.text.length > 0 || m.tools.length > 0,
          }))
        }
      } finally {
        setStreaming(false)
        abortRef.current = null
      }
    },
    [routeId, selectedAgentId, streaming, historyLoading, sessionEnded, sessionMissing, historyError, navigate],
  )

  // Resending an interrupted turn replays it under the identity it was already
  // admitted with, so the server deduplicates instead of running it twice.
  const resend = useCallback(
    (msg: ChatMessage) => {
      if (!msg.sourceText || !msg.requestId) return
      void send(msg.sourceText, { clientRequestId: msg.requestId, replaceId: msg.id })
    },
    [send],
  )

  // A fresh chat can send once an agent template is selected; an open session
  // keeps its template from creation, so it's always sendable.
  const ready = routeId !== null || selectedAgentId !== ''
  const blocked = sessionEnded || sessionMissing || historyError !== null || historyLoading
  const placeholder = sessionEnded
    ? 'This session has ended — start a new chat'
    : sessionMissing
      ? 'This chat is unavailable'
      : noUsableAgent
        ? 'No usable agent — create one with your own API key on the Agents page'
        : ready
          ? 'Message… (Enter to send, Shift+Enter for newline)'
          : 'Select an agent above to start chatting'

  return (
    <div className="flex h-full gap-6">
      <ChatSidebar
        sessions={sessions}
        error={sessionsError}
        activeId={routeId}
        titles={titles}
        hasMore={sessionsHasMore}
        loadingMore={sessionsLoadingMore}
        onNew={newChat}
        onSelect={(sid) => navigate(`/chat/${sid}`)}
        onEnd={endChat}
        onRename={renameChat}
        onDelete={purgeChat}
        onLoadMore={loadMoreSessions}
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
              {!routeId && selectableAgents !== null && selectableAgents.length > 0 && (
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  title="Agent template for the new chat"
                  className="h-8 rounded-lg border border-ink-700 bg-ink-850 px-2 text-[12px] text-ink-100 transition-colors focus:border-accent focus:outline-none"
                >
                  <option value="" disabled>Select an agent…</option>
                  {selectableAgents.map((a) => {
                    // platform_default templates need platform-LLM access;
                    // without it they would 403 on send — disable them.
                    const gated = platformBlocked && a.llm_mode === 'platform_default'
                    const label =
                      a.name +
                      (isPlatform(a) ? ' (built-in)' : '') +
                      (gated ? ' — use a custom key or ask an admin' : '')
                    return (
                      <option key={a.id} value={a.id} disabled={gated}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              )}
              {noUsableAgent && (
                <p className="flex items-center gap-1.5 rounded-lg border border-warn-line bg-warn-soft px-3 py-1.5 text-[12px] text-warn">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    No usable agent —{' '}
                    <Link
                      to="/agents"
                      className="font-semibold underline underline-offset-2 transition-colors hover:text-ink-100"
                    >
                      create one with your own API key on the Agents page
                    </Link>
                  </span>
                </p>
              )}
              {activeAgentName && (
                <span className="flex items-center gap-1.5 rounded-full border border-vio-line bg-vio-soft px-2.5 py-1 text-[11px] font-medium text-vio">
                  <Bot className="h-3 w-3" />
                  {activeAgentName}
                </span>
              )}
            </>
          }
        />

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
            {hasMoreHistory && !historyLoading && (
              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={loadingEarlier}
                  onClick={loadEarlier}
                  className="flex h-7 items-center gap-1.5 rounded-full border border-ink-700 bg-ink-850 px-3 text-[11px] text-ink-400 transition-colors hover:text-ink-200 disabled:opacity-50"
                >
                  {loadingEarlier && <Loader2 className="h-3 w-3 animate-spin" />}
                  {loadingEarlier ? 'Loading…' : 'Load earlier messages'}
                </button>
              </div>
            )}
            {!streaming && requestState && REQUEST_NOTICES[requestState.status] && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-warn-line bg-warn-soft px-3 py-1.5 text-[11px] text-warn">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{REQUEST_NOTICES[requestState.status]}</span>
                {requestState.status === 'EXECUTION_STATUS_RUNNING' && routeId && (
                  <button
                    type="button"
                    onClick={() => void cancelRemoteTurn(routeId, requestState.request_message_id)}
                    className="rounded border border-warn-line px-1.5 py-0.5 text-warn transition-colors hover:bg-warn-soft"
                  >
                    cancel
                  </button>
                )}
              </div>
            )}
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
                    : noUsableAgent
                      ? 'Create an agent with your own API key on the Agents page to start chatting.'
                      : 'Select an agent above to start chatting.'}
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} onResend={(m) => void resend(m)} />
            ))}
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
