import { useState } from 'react'
import { API_BASE } from '../../lib/chat-api'
import { Card } from '../../components/Primitives'
import { Button } from '../../components/ConfirmDialog'

const baseUrl = API_BASE.replace(/\/$/, '')

const createSessionExample = `curl -sS -X POST "${baseUrl}/api/sessions" \\
  -H "Authorization: Bearer $MANAGED_AGENTS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"agent_id":"YOUR_AGENT_ID"}'`

const chatExample = `curl -N -X POST "${baseUrl}/api/sessions/$SESSION_ID/messages" \\
  -H "Authorization: Bearer $MANAGED_AGENTS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content":"Hello"}'`

const transcriptExample = `curl -sS "${baseUrl}/api/sessions/$SESSION_ID/messages?limit=50" \\
  -H "Authorization: Bearer $MANAGED_AGENTS_API_KEY"`

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  return <div className="overflow-hidden rounded-lg border border-ink-700 bg-ink-900">
    <div className="flex items-center justify-between gap-3 border-b border-ink-700 px-4 py-2">
      <span className="text-[12px] font-medium text-ink-300">{label}</span>
      <Button size="sm" variant="ghost" onClick={() => void copy()}>{copyState === 'copied' ? 'Copied' : 'Copy'}</Button>
    </div>
    <pre className="overflow-x-auto p-4 text-[12px] leading-6 text-ink-100"><code>{code}</code></pre>
    {copyState === 'failed' && <p role="alert" className="px-4 pb-3 text-[12px] text-bad">Copy failed. Select the command and copy it manually.</p>}
  </div>
}

const sessionRoutes = [
  ['POST', '/api/sessions', 'Create a session with an existing agent_id'],
  ['POST', '/api/sessions/:id/messages', 'Send a message; receive an SSE stream'],
  ['GET', '/api/sessions/:id/messages', 'Read the transcript'],
  ['GET', '/api/sessions', 'List your sessions'],
  ['PATCH', '/api/sessions/:id/title', 'Rename a session'],
  ['DELETE', '/api/sessions/:id', 'End a session'],
] as const

export default function APIDocsTab() {
  return <div className="space-y-5 pb-8">
    <Card className="p-5">
      <h2 className="font-display text-[16px] font-semibold text-ink-50">Connect from your server</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-300">
        Use an API key from Your keys as a Bearer token. Keep it in a server secret, never in browser code.
        The key acts as your account and can only access your sessions and agents visible to you.
      </p>
      <div className="mt-4 rounded-lg border border-ink-700 bg-ink-850 px-4 py-3">
        <div className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Base URL</div>
        <code className="mt-1 block break-all text-[13px] text-ink-100">{baseUrl}</code>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-400">
        Local preview keys are sample data and cannot call this address. Use a real key created in the deployed console for server-side calls.
      </p>
    </Card>

    <Card className="space-y-4 p-5">
      <div>
        <h2 className="font-display text-[16px] font-semibold text-ink-50">1. Create a session</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-400">Use an existing agent ID from the Agents page. The response contains a <code>session_id</code> to use for later calls.</p>
      </div>
      <CodeBlock label="POST /api/sessions" code={createSessionExample} />
      <div>
        <h2 className="font-display text-[16px] font-semibold text-ink-50">2. Stream a reply</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-400">Set <code>SESSION_ID</code> to the returned ID. The response is Server-Sent Events: read <code>text_delta</code> frames until <code>done</code>. For another turn, call the same path again.</p>
      </div>
      <CodeBlock label="POST /api/sessions/:id/messages · SSE" code={chatExample} />
      <div>
        <h2 className="font-display text-[16px] font-semibold text-ink-50">3. Read history</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-400">Read stored messages or continue chatting with the same session ID.</p>
      </div>
      <CodeBlock label="GET /api/sessions/:id/messages" code={transcriptExample} />
    </Card>

    <Card className="p-5">
      <h2 className="font-display text-[16px] font-semibold text-ink-50">Session endpoints</h2>
      <div className="mt-3 space-y-2">
        {sessionRoutes.map(([method, path, description]) => <div key={`${method}-${path}`} className="grid gap-1 border-b border-ink-700 py-2 last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-4">
          <div className="flex min-w-0 gap-2 text-[12px]"><span className="w-12 shrink-0 font-semibold text-accent">{method}</span><code className="min-w-0 break-all text-ink-200">{path}</code></div>
          <p className="text-[12px] text-ink-400">{description}</p>
        </div>)}
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-ink-400">
        Key management uses a different credential: <code>GET /api/keys</code>, <code>POST /api/keys</code>, and <code>DELETE /api/keys/:id</code> require your Supabase login JWT. An API key cannot create or revoke other keys.
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-400">
        If a stream disconnects before <code>done</code>, read the transcript before resending. The current chat API does not deduplicate retries, and stopping the HTTP stream does not guarantee cancellation.
      </p>
    </Card>
  </div>
}
