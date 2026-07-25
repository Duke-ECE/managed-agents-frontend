import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Wrench, Box, MessagesSquare, ListTodo, Power, Settings2 } from 'lucide-react'
import { api } from '../../mocks/api'
import { useAsync } from '../../hooks/useAsync'
import StatusBadge from '../../components/StatusBadge'
import { Card, Skeleton } from '../../components/Primitives'
import { Button } from '../../components/ConfirmDialog'
import { timeAgo, formatNumber, formatDuration, cn } from '../../utils/format'

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: agent, loading } = useAsync(() => api.getAgent(id!), [id])
  const { data: sessions } = useAsync(() => api.getSessions())
  const { data: tasks } = useAsync(() => api.getTasks())

  if (loading) {
    return (
      <div className="mx-auto max-w-[1000px] space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
      </div>
    )
  }
  if (!agent) return <div className="text-ink-400">Agent not found.</div>

  const agentSessions = (sessions ?? []).filter(s => s.agentId === agent.id)
  const agentTasks = (tasks ?? []).filter(t => t.agentId === agent.id)

  return (
    <div className="mx-auto max-w-[1000px]">
      <Link to="/agents" className="mb-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-400 transition-colors hover:text-ink-200">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Agents
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between animate-fade-up">
        <div className="flex items-center gap-4">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl font-display text-[22px] font-bold text-white"
            style={{ backgroundColor: agent.avatarColor, boxShadow: `0 12px 32px ${agent.avatarColor}40` }}
          >
            {agent.name[0]}
          </span>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-[24px] font-bold tracking-tight text-ink-50">{agent.name}</h1>
              <StatusBadge status={agent.status} />
            </div>
            <p className="mt-1 text-[13px] text-ink-400">{agent.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Settings2 className="h-3.5 w-3.5" /> Configure</Button>
          <Button variant="outline"><Power className="h-3.5 w-3.5" /> {agent.status === 'offline' ? 'Start' : 'Stop'}</Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4 stagger">
        {[
          { label: 'Total Sessions', value: formatNumber(agent.totalSessions), icon: MessagesSquare },
          { label: 'Total Tasks', value: formatNumber(agent.totalTasks), icon: ListTodo },
          { label: 'Active Tools', value: String(agent.tools.filter(t => t.enabled).length), icon: Wrench },
          { label: 'Last Active', value: timeAgo(agent.lastActiveAt), icon: Power },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2 text-[11px] font-medium text-ink-400"><s.icon className="h-3.5 w-3.5" /> {s.label}</div>
            <div className="mt-2 font-display text-[22px] font-bold text-ink-50">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        {/* Config */}
        <Card className="p-5 animate-fade-up">
          <h3 className="mb-4 font-display text-[14px] font-semibold text-ink-100">Configuration</h3>
          <div className="space-y-3 text-[13px]">
            <div className="flex justify-between"><span className="text-ink-400">Model</span><span className="font-mono text-[12px] text-ink-200">{agent.model}</span></div>
            <div className="flex justify-between"><span className="text-ink-400">Temperature</span><span className="font-mono text-[12px] text-ink-200">{agent.temperature}</span></div>
            <div className="flex justify-between"><span className="text-ink-400">Max Tokens</span><span className="font-mono text-[12px] text-ink-200">{agent.maxTokens}</span></div>
            <div className="flex justify-between">
              <span className="text-ink-400">Sandbox</span>
              {agent.sandboxId ? (
                <Link to={`/sandboxes/${agent.sandboxId}`} className="flex items-center gap-1 font-mono text-[12px] text-accent hover:underline">
                  <Box className="h-3 w-3" /> {agent.sandboxId}
                </Link>
              ) : <span className="text-[12px] text-ink-500">Hosted runtime</span>}
            </div>
          </div>
          <div className="mt-4 border-t border-ink-800 pt-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">System Prompt</div>
            <p className="rounded-lg bg-ink-850 p-3 font-mono text-[11px] leading-relaxed text-ink-300">{agent.systemPrompt}</p>
          </div>
        </Card>

        {/* Tools */}
        <Card className="p-5 animate-fade-up">
          <h3 className="mb-4 font-display text-[14px] font-semibold text-ink-100">Tools</h3>
          <div className="space-y-2">
            {agent.tools.map(t => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border border-ink-800 bg-ink-900/50 px-3 py-2.5">
                <span className={cn('flex h-7 w-7 items-center justify-center rounded-md border', t.enabled ? 'border-good-line bg-good-soft text-good' : 'border-ink-700 bg-ink-850 text-ink-500')}>
                  <Wrench className="h-3.5 w-3.5" />
                </span>
                <div className="flex-1 leading-tight">
                  <div className="font-mono text-[12px] text-ink-100">{t.name}</div>
                  <div className="text-[11px] text-ink-400">{t.description}</div>
                </div>
                <span className={cn('text-[10px] font-semibold uppercase', t.enabled ? 'text-good' : 'text-ink-500')}>
                  {t.enabled ? 'On' : 'Off'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent sessions + tasks */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Card className="p-5 animate-fade-up">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-[14px] font-semibold text-ink-100">Recent Sessions</h3>
            <Link to="/sessions" className="text-[11px] font-medium text-accent hover:underline">View all</Link>
          </div>
          <div className="space-y-1.5">
            {agentSessions.length === 0 && <p className="text-[12px] text-ink-500">No sessions yet.</p>}
            {agentSessions.map(s => (
              <Link key={s.id} to={`/sessions/${s.id}`} className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-ink-850">
                <StatusBadge status={s.status} />
                <span className="flex-1 truncate font-mono text-[11px] text-ink-300">{s.id} · {s.userName}</span>
                <span className="text-[10px] text-ink-500">{timeAgo(s.lastActiveAt)}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5 animate-fade-up">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-[14px] font-semibold text-ink-100">Execution History</h3>
            <Link to="/tasks" className="text-[11px] font-medium text-accent hover:underline">View all</Link>
          </div>
          <div className="space-y-1.5">
            {agentTasks.length === 0 && <p className="text-[12px] text-ink-500">No tasks yet.</p>}
            {agentTasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-ink-850">
                <StatusBadge status={t.status} />
                <span className="flex-1 truncate text-[12px] text-ink-300">{t.name}</span>
                <span className="font-mono text-[10px] text-ink-500">{formatDuration(t.durationMs)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
