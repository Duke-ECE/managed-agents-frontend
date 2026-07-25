import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, LayoutGrid, List, Bot, Wrench } from 'lucide-react'
import { api } from '../../mocks/api'
import { useAsync } from '../../hooks/useAsync'
import StatusBadge from '../../components/StatusBadge'
import { PageHeader, Card, EmptyState, TableSkeleton } from '../../components/Primitives'
import { Button } from '../../components/ConfirmDialog'
import { timeAgo, formatNumber, cn } from '../../utils/format'
import AgentFormDrawer from './AgentFormDrawer'

export default function AgentList() {
  const navigate = useNavigate()
  const { data: agents, loading } = useAsync(() => api.getAgents())
  const [view, setView] = useState<'grid' | 'table'>('grid')
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Agents"
        description="Autonomous workers powered by LLMs, tools, and sandboxes."
        actions={
          <>
            <div className="flex rounded-lg border border-ink-700 bg-ink-900 p-0.5">
              <button
                onClick={() => setView('grid')}
                className={cn('flex h-8 w-8 items-center justify-center rounded-md transition-colors', view === 'grid' ? 'bg-ink-700 text-ink-50' : 'text-ink-400 hover:text-ink-200')}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('table')}
                className={cn('flex h-8 w-8 items-center justify-center rounded-md transition-colors', view === 'table' ? 'bg-ink-700 text-ink-50' : 'text-ink-400 hover:text-ink-200')}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Agent</Button>
          </>
        }
      />

      {loading ? (
        <Card><TableSkeleton rows={4} cols={5} /></Card>
      ) : !agents || agents.length === 0 ? (
        <EmptyState
          icon={<Bot className="h-5 w-5" />}
          title="No agents configured"
          description="Create your first agent to start automating work."
          action={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Agent</Button>}
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-3 gap-4 stagger">
          {agents.map(a => (
            <Card
              key={a.id}
              hover
              className="group cursor-pointer p-5"
            >
              <div onClick={() => navigate(`/agents/${a.id}`)}>
                <div className="flex items-start justify-between">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl font-display text-[17px] font-bold text-white shadow-lg"
                    style={{ backgroundColor: a.avatarColor, boxShadow: `0 8px 24px ${a.avatarColor}33` }}
                  >
                    {a.name[0]}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
                <h3 className="mt-4 font-display text-[16px] font-semibold text-ink-50 transition-colors group-hover:text-accent">{a.name}</h3>
                <p className="mt-1 line-clamp-2 min-h-[36px] text-[12px] leading-relaxed text-ink-400">{a.description}</p>
                <div className="mt-4 flex items-center gap-2 border-t border-ink-800 pt-4">
                  <span className="rounded-md border border-ink-700 bg-ink-850 px-2 py-0.5 font-mono text-[10px] text-ink-300">{a.model}</span>
                  <span className="flex items-center gap-1 text-[11px] text-ink-400">
                    <Wrench className="h-3 w-3" /> {a.tools.filter(t => t.enabled).length}
                  </span>
                  <span className="ml-auto text-[11px] text-ink-500">{timeAgo(a.lastActiveAt)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden animate-fade-up">
          <div className="divide-y divide-ink-800/60">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              <span>Agent</span><span>Model</span><span>Status</span><span>Usage</span><span className="text-right">Last Active</span>
            </div>
            {agents.map(a => (
              <div
                key={a.id}
                onClick={() => navigate(`/agents/${a.id}`)}
                className="grid cursor-pointer grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-ink-850/70"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg font-display text-[13px] font-bold text-white" style={{ backgroundColor: a.avatarColor }}>
                    {a.name[0]}
                  </span>
                  <div className="leading-tight">
                    <div className="text-[13px] font-medium text-ink-50">{a.name}</div>
                    <div className="font-mono text-[11px] text-ink-500">{a.id}</div>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-ink-300">{a.model}</span>
                <StatusBadge status={a.status} />
                <span className="text-[12px] text-ink-400">{formatNumber(a.totalTasks)} tasks</span>
                <span className="text-right text-[12px] text-ink-400">{timeAgo(a.lastActiveAt)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <AgentFormDrawer open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}
