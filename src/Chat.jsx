import { useEffect, useRef, useState } from 'react'

function ToolEvent({ kind, data }) {
  const label = kind === 'tool_call' ? 'tool call' : 'tool result'
  const text = typeof data === 'string' ? data : JSON.stringify(data)
  return (
    <div className="tool-event">
      {label}: <code>{text}</code>
    </div>
  )
}

function Message({ msg }) {
  if (msg.role === 'user') {
    return <div className="msg msg-user">{msg.text}</div>
  }
  return (
    <div className="msg msg-assistant">
      {msg.tools.map((tool, i) => (
        <ToolEvent key={i} kind={tool.kind} data={tool.data} />
      ))}
      {msg.text && <div className="msg-text">{msg.text}</div>}
      {!msg.text && !msg.done && !msg.error && (
        <div className="msg-text msg-thinking">thinking…</div>
      )}
      {msg.error && <div className="msg-error">{msg.error}</div>}
      {msg.done && msg.usage && (
        <div className="msg-usage">
          tokens: {msg.usage.total_tokens ?? JSON.stringify(msg.usage)}
        </div>
      )}
    </div>
  )
}

export default function Chat({ messages, streaming, ready, sessionExpired, onSend, onNewChat }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = () => {
    if (!ready || streaming || !input.trim()) return
    onSend(input)
    setInput('')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <section className="chat">
      {sessionExpired && (
        <div className="chat-banner">
          This session has expired.{' '}
          <button type="button" onClick={onNewChat}>
            Start a new chat
          </button>
        </div>
      )}
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">
            {ready
              ? 'Send a message to start a session.'
              : 'Set your LLM API key in the settings above to start chatting.'}
          </p>
        )}
        {messages.map((msg) => (
          <Message key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={ready ? 'Message… (Enter to send, Shift+Enter for newline)' : 'Configure your LLM settings first'}
          disabled={!ready}
        />
        <button type="button" className="chat-send" onClick={submit} disabled={!ready || streaming || !input.trim()}>
          {streaming ? '…' : 'Send'}
        </button>
      </div>
    </section>
  )
}
