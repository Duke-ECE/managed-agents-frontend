const API_BASE =
  import.meta.env.VITE_API_URL ?? 'https://api-managed-agent.colab.duke.edu'

export class ApiError extends Error {
  constructor(status, body) {
    super(body || `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
  }
}

async function throwIfNotOk(res) {
  if (res.ok) return
  let body = ''
  try {
    const data = await res.json()
    body = data?.error || data?.message || ''
  } catch {
    // non-JSON error body; fall back to status text
  }
  throw new ApiError(res.status, body)
}

export async function createSession(userId, llm) {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, llm }),
  })
  await throwIfNotOk(res)
  const data = await res.json()
  return data.session_id
}

export async function deleteSession(sessionId) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
    method: 'DELETE',
  })
  await throwIfNotOk(res)
}

// Parse a single SSE frame ("event: x\ndata: {...}") into { event, data }.
function parseFrame(frame) {
  let event = 'message'
  const dataLines = []
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).replace(/^ /, ''))
    }
  }
  if (dataLines.length === 0) return null
  const raw = dataLines.join('\n')
  let data = raw
  try {
    data = JSON.parse(raw)
  } catch {
    // keep the raw string if it is not JSON
  }
  return { event, data }
}

// POST a message and consume the SSE response stream manually
// (EventSource cannot POST). Calls onEvent(event, data) per frame.
export async function streamSessionMessage(sessionId, content, { signal, onEvent }) {
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
    buffer = parts.pop()
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
