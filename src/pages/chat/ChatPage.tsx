import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  AlertTriangle, Bot, CircleCheck, CircleX, Loader2, MessageSquare,
  Plus, SendHorizontal, Settings2, User, Wrench,
} from 'lucide-react'
import { Button } from '../../components/ConfirmDialog'
import { Card, PageHeader } from '../../components/Primitives'
import { cn } from '../../utils/format'
import {
  ApiError,
  createSession,
  deleteSession,
  streamSessionMessage,
  type DonePayload,
  type ErrorPayload,
  type TextDeltaPayload,
  type ToolCallPayload,
  type ToolResultPayload,
} from '../../lib/chat-api'

const SETTINGS_KEY = 'managed-agents.settings'

interface LlmSettings {
  apiKey: string
  baseUrl: string
  model: string
}

const DEFAULT_SETTINGS: LlmSettings = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
}

function loadSettings(): LlmSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<LlmSettings>) } : DEFAULT_SETTINGS
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

/* ------------------------------ Settings panel ------------------------------ */

function SettingsPanel({
  settings,
  onSave,
}: {
  settings: LlmSettings
  onSave: (next: LlmSettings) => void
}) {
  const [draft, setDraft] = useState(settings)

  const save = (e: FormEvent) => {
    e.preventDefault()
    onSave({
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
        {msg.text && (
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-200">{msg.text}</p>
        )}
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
  const [settings, setSettings] = useState<LlmSettings>(loadSettings)
  const [settingsOpen, setSettingsOpen] = useState(() => !loadSettings().apiKey)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const nextMsgId = useRef(1)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const newChat = useCallback(() => {
    abortRef.current?.abort()
    setStreaming(false)
    setMessages([])
    setSessionExpired(false)
    if (sessionId) deleteSession(sessionId).catch(() => {}) // best effort
    setSessionId(null)
  }, [sessionId])

  const saveSettings = useCallback(
    (next: LlmSettings) => {
      setSettings(next)
      setSettingsOpen(false)
      // LLM credentials are bound to the session, so start fresh.
      newChat()
    },
    [newChat],
  )

  const send = useCallback(
    async (content: string) => {
      const text = content.trim()
      if (!text || streaming) return
      setSessionExpired(false)

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
        let sid = sessionId
        if (!sid) {
          sid = await createSession({
            api_key: settings.apiKey,
            base_url: settings.baseUrl,
            model: settings.model,
          })
          setSessionId(sid)
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
        if (isAbortError(err)) return
        if (err instanceof ApiError && err.status === 410) {
          setSessionId(null)
          setSessionExpired(true)
          patch((m) => ({ ...m, done: true, error: m.error ?? 'Session expired on the server.' }))
        } else {
          const message = err instanceof Error ? err.message : String(err)
          patch((m) => ({ ...m, done: true, error: m.error ?? message }))
        }
      } finally {
        setStreaming(false)
        abortRef.current = null
      }
    },
    [sessionId, settings, streaming],
  )

  const ready = Boolean(settings.apiKey)

  return (
    <div className="mx-auto flex h-full max-w-[860px] flex-col">
      <PageHeader
        title="Chat"
        description="Talk to a managed agent over a live SSE stream."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen((o) => !o)}>
              <Settings2 className="h-3.5 w-3.5" />
              LLM settings
              {!ready && <span className="rounded border border-warn-line bg-warn-soft px-1 font-mono text-[9px] uppercase text-warn">required</span>}
            </Button>
            <Button variant="outline" size="sm" onClick={newChat}>
              <Plus className="h-3.5 w-3.5" /> New chat
            </Button>
          </>
        }
      />

      {settingsOpen && <SettingsPanel key={settings.apiKey + settings.baseUrl + settings.model} settings={settings} onSave={saveSettings} />}

      {sessionExpired && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-warn-line bg-warn-soft px-4 py-3 text-[13px] text-warn animate-fade-in">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">This session has expired on the server.</span>
          <button
            type="button"
            onClick={newChat}
            className="font-semibold underline underline-offset-2 transition-colors hover:text-ink-100"
          >
            Start a new chat
          </button>
        </div>
      )}

      <Card className="flex min-h-0 flex-1 flex-col">
        {/* Messages */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
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
        <Composer ready={ready} streaming={streaming} onSend={send} />
      </Card>
    </div>
  )
}

function Composer({
  ready,
  streaming,
  onSend,
}: {
  ready: boolean
  streaming: boolean
  onSend: (content: string) => void
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
        placeholder={ready ? 'Message… (Enter to send, Shift+Enter for newline)' : 'Configure your LLM settings first'}
        disabled={!ready}
        className="flex-1 resize-none rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-[13px] leading-relaxed text-ink-100 placeholder:text-ink-500 transition-colors focus:border-accent focus:outline-none disabled:opacity-50"
      />
      <Button onClick={submit} disabled={!ready || streaming || !input.trim()}>
        {streaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendHorizontal className="h-3.5 w-3.5" />}
        Send
      </Button>
    </div>
  )
}
