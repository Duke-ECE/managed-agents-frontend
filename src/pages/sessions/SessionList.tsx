import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessagesSquare, Filter } from 'lucide-react'
import { api } from '../../mocks/api'
import { useAsync } from '../../hooks/useAsync'
import { useTableSort } from '../../hooks/useTableSort'
import DataTable, { type Column } from '../../components/DataTable'
import StatusBadge from '../../components/StatusBadge'
import { PageHeader, Card, EmptyState, TableSkeleton } from '../../components/Primitives'
import { timeAgo, formatNumber, cn } from '../../utils/format'
import type { Session, SessionStatus } from '../../types'

const STATUS_FILTERS: Array<SessionStatus | 'all'> = ['all', 'active', 'completed', 'expired', 'terminated']

const TIME_RANGES = [
  { key: 'all', label: 'All time', ms: Infinity },
  { key: '1h', label: 'Last hour', ms: 3_600_000 },
  { key: '24h', label: 'Last 24h', ms: 86_400_000 },
  { key: '7d', label: 'Last 7 days', ms: 7 * 86_400_000 },
] as const

export default function SessionList() {
  const navigate = useNavigate()
  const { data: sessions, loading } = useAsync(() => api.getSessions())
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'all'>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [timeFilter, setTimeFilter] = useState<string>('all')

  const agentOptions = useMemo(() => {
    const map = new Map<string, string>()
    ;(sessions ?? []).forEach(s => map.set(s.agentId, s.agentName))
    return Array.from(map.entries())
  }, [sessions])

  const filtered = useMemo(() => {
    let list = sessions ?? []
    if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter)
    if (agentFilter !== 'all') list = list.filter(s => s.agentId === agentFilter)
    const range = TIME_RANGES.find(r => r.key === timeFilter)
    if (range && range.ms !== Infinity) {
      const cutoff = Date.now() - range.ms
      list = list.filter(s => new Date(s.lastActiveAt).getTime() >= cutoff)
    }
    return list
  }, [sessions, statusFilter, agentFilter, timeFilter])

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered, {
    agent: s => s.agentName,
    messages: s => s.messageCount,
    lastActive: s => new Date(s.lastActiveAt).getTime(),
  })

  const columns: Column<Session>[] = [
    {
      key: 'id', header: 'Session',
      render: s => (
        <div className="leading-tight">
          <div className="font-mono text-[12px] font-medium text-ink-50">{s.id}</div>
          <div className="text-[11px] text-ink-500">started {timeAgo(s.startedAt)}</div>
        </div>
      ),
    },
    {
      key: 'agent', header: 'Agent', sortable: true,
      render: s => <span className="text-[13px] font-medium text-ink-200">{s.agentName}</span>,
    },
    { key: 'user', header: 'User', render: s => <span className="font-mono text-[12px] text-ink-300">{s.userName}</span> },
    { key: 'messages', header: 'Messages', sortable: true, render: s => <span className="font-mono text-[12px] text-ink-300">{s.messageCount}</span> },
    { key: 'tokens', header: 'Tokens', render: s => <span className="font-mono text-[12px] text-ink-400">{formatNumber(s.totalTokens)}</span> },
    { key: 'status', header: 'Status', render: s => <StatusBadge status={s.status} /> },
    { key: 'lastActive', header: 'Last Active', sortable: true, render: s => <span className="text-[12px] text-ink-400">{timeAgo(s.lastActiveAt)}</span> },
  ]

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader title="Sessions" description="Conversations between users and your agents." />

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3 animate-fade-up">
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
          <select
            value={agentFilter}
            onChange={e => setAgentFilter(e.target.value)}
            className="bg-transparent text-[12px] text-ink-200 outline-none"
          >
            <option value="all">All agents</option>
            {agentOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2">
          <select
            value={timeFilter}
            onChange={e => setTimeFilter(e.target.value)}
            className="bg-transparent text-[12px] text-ink-200 outline-none"
          >
            {TIME_RANGES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
        <span className="ml-auto text-[12px] text-ink-500">{sorted.length} sessions</span>
      </div>

      <Card className="overflow-hidden animate-fade-up">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : sorted.length > 0 ? (
          <DataTable
            columns={columns}
            rows={sorted}
            rowKey={s => s.id}
            onRowClick={s => navigate(`/sessions/${s.id}`)}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
          />
        ) : (
          <EmptyState
            icon={<MessagesSquare className="h-5 w-5" />}
            title="No sessions found"
            description="Try adjusting your filters, or start a new conversation with an agent."
          />
        )}
      </Card>
    </div>
  )
}
