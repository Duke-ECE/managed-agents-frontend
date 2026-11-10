import { Link } from 'react-router-dom'
import { ArrowRight, Bot, MessageSquarePlus, MessagesSquare, Sparkles } from 'lucide-react'
import { useAuth } from '../../components/AuthProvider'
import { Card, EmptyState, PageHeader, Skeleton } from '../../components/Primitives'
import { Button } from '../../components/ui/button'
import { useAsync } from '../../hooks/useAsync'
import { listAgents, listSessions } from '../../lib/chat-api'
import { timeAgo } from '../../utils/format'

/** The signed-in overview mirrors the mobile Home tab. */
export default function HomePage() {
  const { session } = useAuth()
  const { data, loading, error, reload } = useAsync(async () => {
    const [agents, page] = await Promise.all([listAgents(), listSessions({ limit: 50 })])
    return { agents, page }
  })
  const metadata = session?.user.user_metadata ?? {}
  const name = typeof metadata.name === 'string' ? metadata.name : session?.user.email?.split('@')[0]
  const recent = [...(data?.page.sessions ?? [])]
    .sort((a, b) => new Date(b.last_active || b.created_at).getTime() - new Date(a.last_active || a.created_at).getTime())
    .slice(0, 3)
  const active = data?.page.sessions.filter(item => item.status === 'active').length ?? 0

  return <div className="mx-auto max-w-[1100px] space-y-6">
    <PageHeader title={name ? `Welcome, ${name}` : 'Welcome to Managed Agents'} description="Your agents and conversations in one place." />

    <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/15 via-ink-900 to-ink-900 p-6 sm:p-8">
      <div className="relative z-10 max-w-xl">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent/15 text-accent"><Sparkles className="h-5 w-5" /></div>
        <h2 className="font-display text-[24px] font-semibold tracking-tight text-ink-50 sm:text-[30px]">Start a conversation</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-300 sm:text-[14px]">Pick an agent, ask a question, and return to the same session whenever you need it.</p>
        <Link to="/chat" className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90">
          <MessageSquarePlus className="h-4 w-4" /> New conversation <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <Bot aria-hidden className="pointer-events-none absolute -bottom-12 right-5 h-48 w-48 rotate-[-12deg] text-accent/10 sm:right-12" strokeWidth={1} />
    </div>

    {loading ? <div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-28" /><Skeleton className="h-28" /></div> : error ? (
      <Card><EmptyState icon={<MessagesSquare className="h-5 w-5" />} title="Could not load your overview" description={error} action={<Button variant="outline" size="sm" onClick={reload}>Retry</Button>} /></Card>
    ) : <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/sessions" className="rounded-xl border border-ink-800 bg-ink-900 p-5 transition-colors hover:border-ink-600">
          <div className="flex items-center justify-between text-ink-400"><MessagesSquare className="h-5 w-5" /><ArrowRight className="h-4 w-4" /></div>
          <div className="mt-4 font-display text-[27px] font-semibold text-ink-50">{active}</div>
          <div className="text-[12px] text-ink-400">Active sessions{data?.page.has_more ? ' in recent 50' : ''}</div>
        </Link>
        <Link to="/agents" className="rounded-xl border border-ink-800 bg-ink-900 p-5 transition-colors hover:border-ink-600">
          <div className="flex items-center justify-between text-ink-400"><Bot className="h-5 w-5" /><ArrowRight className="h-4 w-4" /></div>
          <div className="mt-4 font-display text-[27px] font-semibold text-ink-50">{data?.agents.length ?? 0}</div>
          <div className="text-[12px] text-ink-400">Available agents</div>
        </Link>
      </div>

      <section aria-labelledby="recent-sessions-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="recent-sessions-heading" className="font-display text-[17px] font-semibold text-ink-50">Recent activity</h2>
          <Link to="/sessions" className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        {recent.length ? <div className="space-y-2">{recent.map(item => <Link key={item.id} to={`/chat/${item.id}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-ink-800 bg-ink-900 p-4 transition-colors hover:border-ink-600">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-850 text-accent"><MessagesSquare className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-medium text-ink-100">{item.title || `Session ${item.id.slice(-8)}`}</div><div className="truncate font-mono text-[11px] text-ink-500">ID {item.id}</div></div>
          <span className="shrink-0 text-[11px] text-ink-500">{timeAgo(item.last_active || item.created_at)}</span>
        </Link>)}</div> : <Card><EmptyState icon={<MessagesSquare className="h-5 w-5" />} title="No conversations yet" description="Start one with an agent to see it here." /></Card>}
      </section>
    </>}
  </div>
}
