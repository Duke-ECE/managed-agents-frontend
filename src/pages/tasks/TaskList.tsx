import { useState, useMemo } from 'react'
import { Plus, ListTodo, RotateCcw, OctagonX, Terminal, ChevronRight, Filter } from 'lucide-react'
import { api } from '../../mocks/api'
import { useAsync } from '../../hooks/useAsync'
import { useTableSort } from '../../hooks/useTableSort'
import DataTable, { type Column } from '../../components/DataTable'
import StatusBadge from '../../components/StatusBadge'
import { PageHeader, Card, EmptyState, TableSkeleton } from '../../components/Primitives'
import Drawer from '../../components/Drawer'
import { Button } from '../../components/ConfirmDialog'
import { timeAgo, formatDuration, cn } from '../../utils/format'
import type { Task, TaskStatus, TaskPriority } from '../../types'

const STATUS_FILTERS: Array<TaskStatus | 'all'> = ['all', 'pending', 'running', 'completed', 'failed', 'retrying', 'cancelled']

const TIME_RANGES = [
  { key: 'all', label: 'All time', ms: Infinity },
  { key: '1h', label: 'Last hour', ms: 3_600_000 },
  { key: '24h', label: 'Last 24h', ms: 86_400_000 },
  { key: '7d', label: 'Last 7 days', ms: 7 * 86_400_000 },
] as const

const priorityCls: Record<TaskPriority, string> = {
  low: 'text-ink-400 border-ink-600 bg-ink-800/60',
  medium: 'text-accent-fg border-accent/30 bg-accent/10',
  high: 'text-warn border-warn-line bg-warn-soft',
  critical: 'text-bad border-bad-line bg-bad-soft',
}

function PriorityBadge({ p }: { p: TaskPriority }) {
  return (
    <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase', priorityCls[p])}>
      {p}
    </span>
  )
}

const levelCls: Record<string, string> = {
  info: 'text-accent-fg', warn: 'text-warn', error: 'text-bad', debug: 'text-ink-500',
}

const inputCls = 'w-full rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-[13px] text-ink-100 placeholder-ink-500 outline-none transition-colors focus:border-accent'
const labelCls = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400'

function CreateTaskDrawer({ open, onClose, agents }: { open: boolean; onClose: () => void; agents: Array<{ id: string; name: string }> }) {
  const [name, setName] = useState('')
  const [agentId, setAgentId] = useState(agents[0]?.id ?? '')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [input, setInput] = useState('')

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Create Task"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onClose}>Dispatch Task</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className={labelCls}>Task Name</label>
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Review PR #501" />
        </div>
        <div>
          <label className={labelCls}>Assign To Agent</label>
          <select className={inputCls} value={agentId} onChange={e => setAgentId(e.target.value)}>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <div className="grid grid-cols-4 gap-2">
            {(['low', 'medium', 'high', 'critical'] as TaskPriority[]).map(p => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={cn(
                  'rounded-lg border px-2 py-2 text-[11px] font-semibold uppercase transition-all',
                  priority === p ? priorityCls[p] + ' ring-1 ring-current/30' : 'border-ink-700 bg-ink-850 text-ink-500 hover:border-ink-600',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Input / Instructions</label>
          <textarea
            className={cn(inputCls, 'h-28 resize-none font-mono text-[12px] leading-relaxed')}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Describe the work to dispatch…"
          />
        </div>
      </div>
    </Drawer>
  )
}

function TaskDetailDrawer({ task, onClose }: { task: Task | null; onClose: () => void }) {
  return (
    <Drawer open={!!task} onClose={onClose} title={task ? <span className="font-mono text-[13px]">{task.id}</span> : ''} width="max-w-xl">
      {task && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <h3 className="font-display text-[16px] font-semibold text-ink-50">{task.name}</h3>
            <StatusBadge status={task.status} />
            <PriorityBadge p={task.priority} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-[12px]">
            {[
              ['Agent', task.agentName],
              ['Duration', formatDuration(task.durationMs)],
              ['Created', timeAgo(task.createdAt)],
              ['Retries', String(task.retries.length)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-ink-800 bg-ink-900/50 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">{k}</div>
                <div className="mt-1 font-medium text-ink-200">{v}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Input</div>
            <pre className="rounded-lg bg-ink-850 p-3 font-mono text-[11px] leading-relaxed text-ink-300">{task.input}</pre>
          </div>

          {task.output && (
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Output</div>
              <pre className="rounded-lg border border-good-line bg-good-soft p-3 font-mono text-[11px] leading-relaxed text-good">{task.output}</pre>
            </div>
          )}

          {task.error && (
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-bad">Error</div>
              <pre className="rounded-lg border border-bad-line bg-bad-soft p-3 font-mono text-[11px] leading-relaxed text-bad">{task.error}</pre>
            </div>
          )}

          {task.retries.length > 0 && (
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Retry History</div>
              <div className="space-y-1.5">
                {task.retries.map(r => (
                  <div key={r.attempt} className="flex items-center gap-3 rounded-lg border border-warn-line bg-warn-soft px-3 py-2 font-mono text-[11px]">
                    <span className="text-warn">#{r.attempt}</span>
                    <span className="flex-1 text-ink-300">{r.error}</span>
                    <span className="text-ink-500">{timeAgo(r.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              <Terminal className="h-3 w-3" /> Execution Log
            </div>
            <div className="rounded-lg bg-ink-950/70 p-3 font-mono text-[11px] leading-relaxed">
              {task.logs.length === 0 && <span className="text-ink-600">No log output.</span>}
              {task.logs.map(l => (
                <div key={l.id} className="flex gap-2.5 py-0.5">
                  <span className={cn('w-11 shrink-0 uppercase', levelCls[l.level])}>{l.level}</span>
                  <span className="text-ink-300">{l.message}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 border-t border-ink-800 pt-4">
            {(task.status === 'failed' || task.status === 'retrying') && (
              <Button variant="outline"><RotateCcw className="h-3.5 w-3.5" /> Retry Task</Button>
            )}
            {(task.status === 'pending' || task.status === 'running') && (
              <Button variant="danger"><OctagonX className="h-3.5 w-3.5" /> Cancel Task</Button>
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}

export default function TaskList() {
  const { data: tasks, loading } = useAsync(() => api.getTasks())
  const { data: agents } = useAsync(() => api.getAgents())
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [timeFilter, setTimeFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Task | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = useMemo(() => {
    let list = tasks ?? []
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter)
    if (agentFilter !== 'all') list = list.filter(t => t.agentId === agentFilter)
    const range = TIME_RANGES.find(r => r.key === timeFilter)
    if (range && range.ms !== Infinity) {
      const cutoff = Date.now() - range.ms
      list = list.filter(t => new Date(t.createdAt).getTime() >= cutoff)
    }
    return list
  }, [tasks, statusFilter, agentFilter, timeFilter])

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered, {
    name: t => t.name,
    duration: t => t.durationMs ?? -1,
    created: t => new Date(t.createdAt).getTime(),
  })

  const agentOptions = useMemo(() => {
    const map = new Map<string, string>()
    ;(tasks ?? []).forEach(t => map.set(t.agentId, t.agentName))
    return Array.from(map.entries())
  }, [tasks])

  const columns: Column<Task>[] = [
    {
      key: 'name', header: 'Task', sortable: true,
      render: t => (
        <div className="leading-tight">
          <div className="text-[13px] font-medium text-ink-50">{t.name}</div>
          <div className="font-mono text-[11px] text-ink-500">{t.id}</div>
        </div>
      ),
    },
    { key: 'agent', header: 'Agent', render: t => <span className="text-[12px] text-ink-300">{t.agentName}</span> },
    { key: 'status', header: 'Status', render: t => <StatusBadge status={t.status} /> },
    { key: 'priority', header: 'Priority', render: t => <PriorityBadge p={t.priority} /> },
    { key: 'duration', header: 'Duration', sortable: true, render: t => <span className="font-mono text-[12px] text-ink-400">{formatDuration(t.durationMs)}</span> },
    { key: 'created', header: 'Created', sortable: true, render: t => <span className="text-[12px] text-ink-400">{timeAgo(t.createdAt)}</span> },
    {
      key: 'go', header: '', className: 'text-right',
      render: () => <ChevronRight className="ml-auto h-4 w-4 text-ink-500 opacity-0 transition-opacity group-hover:opacity-100" />,
    },
  ]

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Tasks"
        description="Units of work dispatched to your agents."
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New Task</Button>}
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3 animate-fade-up">
        <div className="flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-900 p-0.5">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                'rounded-md px-3 py-1.5 text-[12px] font-medium capitalize transition-colors',
                statusFilter === f ? 'bg-ink-700 text-ink-50' : 'text-ink-400 hover:text-ink-200',
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2">
          <Filter className="h-3.5 w-3.5 text-ink-400" />
          <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)} className="bg-transparent text-[12px] text-ink-200 outline-none">
            <option value="all">All agents</option>
            {agentOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2">
          <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)} className="bg-transparent text-[12px] text-ink-200 outline-none">
            {TIME_RANGES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
        <span className="ml-auto text-[12px] text-ink-500">{sorted.length} tasks</span>
      </div>

      <Card className="overflow-hidden animate-fade-up">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : sorted.length > 0 ? (
          <DataTable
            columns={columns}
            rows={sorted}
            rowKey={t => t.id}
            onRowClick={t => setSelected(t)}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
          />
        ) : (
          <EmptyState
            icon={<ListTodo className="h-5 w-5" />}
            title="No tasks found"
            description="Dispatch a task to an agent to see it here."
            action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New Task</Button>}
          />
        )}
      </Card>

      <CreateTaskDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        agents={(agents ?? []).map(a => ({ id: a.id, name: a.name }))}
      />
      <TaskDetailDrawer task={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
