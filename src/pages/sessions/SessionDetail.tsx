import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, OctagonX, User, Bot, Info } from 'lucide-react'
import { api } from '../../mocks/api'
import { useAsync } from '../../hooks/useAsync'
import StatusBadge from '../../components/StatusBadge'
import { Card, Skeleton } from '../../components/Primitives'
import { Button } from '../../components/ConfirmDialog'
import { formatDateTime, formatNumber, cn } from '../../utils/format'
import type { MessageRole } from '../../types'

const roleMeta: Record<MessageRole, { label: string; icon: React.ElementType; bubble: string }> = {
  user: { label: 'User', icon: User, bubble: 'bg-accent/15 border-accent/25 ml-12' },
  assistant: { label: 'Agent', icon: Bot, bubble: 'bg-ink-850 border-ink-700 mr-12' },
  system: { label: 'System', icon: Info, bubble: 'bg-amber-500/10 border-amber-500/25 mx-16 text-center' },
}

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: session, loading } = useAsync(() => api.getSession(id!), [id])

  if (loading) {
    return (
      <div className="mx-auto max-w-[1000px] space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }
  if (!session) return <div className="text-ink-400">Session not found.</div>

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link to="/sessions" className="mb-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-400 transition-colors hover:text-ink-200">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Sessions
      </Link>

      <div className="grid grid-cols-[1fr_280px] gap-5">
        {/* Conversation */}
        <div>
          <div className="mb-5 flex items-center justify-between animate-fade-up">
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-[18px] font-semibold text-ink-50">{session.id}</h1>
              <StatusBadge status={session.status} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Export</Button>
              {session.status === 'active' && (
                <Button variant="danger" size="sm"><OctagonX className="h-3.5 w-3.5" /> Terminate</Button>
              )}
            </div>
          </div>

          <Card className="p-5 animate-fade-up">
            <div className="space-y-4">
              {session.messages.map(m => {
                const meta = roleMeta[m.role]
                const Icon = meta.icon
                const isSystem = m.role === 'system'
                return (
                  <div key={m.id} className={cn('flex gap-3', isSystem && 'justify-center')}>
                    {!isSystem && (
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                          m.role === 'user' ? 'border-info-line bg-info-soft text-info' : 'border-vio-line bg-vio-soft text-vio',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                    )}
                    <div className={cn('flex-1 rounded-xl border px-4 py-3', meta.bubble)}>
                      {!isSystem && (
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-ink-300">{meta.label}</span>
                          <span className="text-[10px] text-ink-500">{formatDateTime(m.timestamp)}</span>
                          {m.tokens && <span className="ml-auto font-mono text-[10px] text-ink-500">{m.tokens} tok</span>}
                        </div>
                      )}
                      <p className={cn('whitespace-pre-wrap text-[13px] leading-relaxed', isSystem ? 'text-amber-300/90 text-[12px]' : 'text-ink-200')}>
                        {m.content}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Metadata sidebar */}
        <div className="space-y-4">
          <Card className="p-5 animate-fade-up">
            <h3 className="mb-4 font-display text-[13px] font-semibold text-ink-100">Session Info</h3>
            <dl className="space-y-3 text-[12px]">
              {[
                ['Agent', session.agentName],
                ['User', session.userName],
                ['Messages', String(session.messageCount)],
                ['Total Tokens', formatNumber(session.totalTokens)],
                ['Started', formatDateTime(session.startedAt)],
                ['Last Active', formatDateTime(session.lastActiveAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-ink-400">{k}</dt>
                  <dd className="text-right font-medium text-ink-200">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-5 animate-fade-up">
            <h3 className="mb-3 font-display text-[13px] font-semibold text-ink-100">Agent</h3>
            <Link
              to={`/agents/${session.agentId}`}
              className="flex items-center gap-3 rounded-lg border border-ink-800 bg-ink-900/50 px-3 py-2.5 transition-colors hover:border-ink-600"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-vio-soft text-vio">
                <Bot className="h-4 w-4" />
              </span>
              <div className="leading-tight">
                <div className="text-[12px] font-medium text-ink-100">{session.agentName}</div>
                <div className="font-mono text-[10px] text-ink-500">{session.agentId}</div>
              </div>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  )
}
