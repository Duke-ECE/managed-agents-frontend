import { useCallback, useEffect, useRef, useState } from 'react'
import './Chat.css'
import Chat from './Chat.jsx'
import Settings from './Settings.jsx'
import { createSession, deleteSession, streamSessionMessage } from './api.js'

const SETTINGS_KEY = 'managed-agents.settings'
const USER_ID_KEY = 'managed-agents.user-id'

const DEFAULT_SETTINGS = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

function loadUserId() {
  let id = localStorage.getItem(USER_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(USER_ID_KEY, id)
  }
  return id
}

let nextMsgId = 1

export default function AgentChat() {
  const [settings, setSettings] = useState(loadSettings)
  const [userId] = useState(loadUserId)
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const abortRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  const newChat = useCallback(() => {
    abortRef.current?.abort()
    setStreaming(false)
    setMessages([])
    setSessionExpired(false)
    if (sessionId) deleteSession(sessionId).catch(() => {}) // best effort
    setSessionId(null)
  }, [sessionId])

  const saveSettings = useCallback(
    (next) => {
      setSettings(next)
      // LLM credentials are bound to the session, so start fresh.
      newChat()
    },
    [newChat],
  )

  const send = useCallback(
    async (content) => {
      const text = content.trim()
      if (!text || streaming) return
      setSessionExpired(false)

      const userMsg = { id: nextMsgId++, role: 'user', text }
      const assistantMsg = {
        id: nextMsgId++,
        role: 'assistant',
        text: '',
        tools: [],
        done: false,
        error: null,
        usage: null,
      }
      setMessages((msgs) => [...msgs, userMsg, assistantMsg])
      setStreaming(true)
      const patch = (fn) =>
        setMessages((msgs) =>
          msgs.map((m) => (m.id === assistantMsg.id ? fn(m) : m)),
        )

      try {
        let sid = sessionId
        if (!sid) {
          sid = await createSession(userId, {
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
                    : (data?.delta ?? data?.content ?? data?.text ?? '')
                if (delta) patch((m) => ({ ...m, text: m.text + delta }))
                break
              }
              case 'tool_call':
              case 'tool_result':
                patch((m) => ({ ...m, tools: [...m.tools, { kind: event, data }] }))
                break
              case 'error': {
                const message =
                  typeof data === 'string'
                    ? data
                    : (data?.message ?? JSON.stringify(data))
                patch((m) => ({ ...m, error: message, done: true }))
                break
              }
              case 'done':
                patch((m) => ({ ...m, done: true, usage: data?.usage ?? null }))
                break
              default:
                break
            }
          },
        })
        patch((m) => (m.done ? m : { ...m, done: true }))
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err?.status === 410) {
          setSessionId(null)
          setSessionExpired(true)
          patch((m) => ({
            ...m,
            done: true,
            error: m.error ?? 'Session expired on the server.',
          }))
        } else {
          patch((m) => ({
            ...m,
            done: true,
            error: m.error ?? (err?.message ?? String(err)),
          }))
        }
      } finally {
        setStreaming(false)
        abortRef.current = null
      }
    },
    [sessionId, settings, streaming, userId],
  )

  const ready = Boolean(settings.apiKey)

  return (
    <div className="agent-chat">
      <div className="chat-toolbar">
        <Settings settings={settings} onSave={saveSettings} />
        <button type="button" className="chat-new" onClick={newChat}>
          New chat
        </button>
      </div>
      <Chat
        messages={messages}
        streaming={streaming}
        ready={ready}
        sessionExpired={sessionExpired}
        onSend={send}
        onNewChat={newChat}
      />
    </div>
  )
}
