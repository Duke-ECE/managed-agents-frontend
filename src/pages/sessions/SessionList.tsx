import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessagesSquare, MessageSquare, CircleStop } from 'lucide-react'
import { deleteSession, listSessions, type SessionRecord } from '../../lib/chat-api'
import { useAsync } from '../../hooks/useAsync'
import { useTableSort } from '../../hooks/useTableSort'
import DataTable, { type Column } from '../../components/DataTable'
import StatusBadge from '../../components/StatusBadge'
import { PageHeader, Card, EmptyState, TableSkeleton } from '../../components/Primitives'
import { Button } from '../../components/ConfirmDialog'
import { timeAgo, formatDateTime, cn } from '../../utils/format'

const STATUS_FILTERS = ['all', 'active', 'ended'] as const

const PAGE_SIZE = 50

const TIME_RANGES = [
  { key: 'all', label: 'All time', ms: Infinity },
  { key: '1h', label: 'Last hour', ms: 3_600_000 },
  { key: '24h', label: 'Last 24h', ms: 86_400_000 },
  { key: '7d', label: 'Last 7 days', ms: 7 * 86_400_000 },
] as const

/** Sessions owned by the signed-in user, live from the managed-agents backend. */
export default function SessionList() {
  const navigate = useNavigate()
  const { data: fetched, loading, error, reload } = useAsync(() => listSessions({ limit: PAGE_SIZE }))
  // Local copy so "End" can update a row without a full reload flash.
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [endingId, setEndingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all')
  const [timeFilter, setTimeFilter] = useState<string>('all')

  useEffect(() => {
    if (fetched) {
      setSessions(fetched.sessions)
      setHasMore(fetched.has_more)
    }
  }, [fetched])

  // Append the next page (deduped by id). Filters/sorting stay client-side
  // over the loaded rows.
  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const page = await listSessions({ limit: PAGE_SIZE, offset: sessions?.length ?? 0 })
      setSessions((list) => {
        const seen = new Set((list ?? []).map((s) => s.id))
        return [...(list ?? []), ...page.sessions.filter((s) => !seen.has(s.id))]
      })
      setHasMore(page.has_more)
    } catch {
      // Leave the list untouched; the button stays for a retry.
    } finally {
      setLoadingMore(false)
    }
  }

  const end = async (s: SessionRecord) => {
    setEndingId(s.id)
    try {
      await deleteSession(s.id)
      setSessions((list) =>
        (list ?? []).map((x) =>
          x.id === s.id ? { ...x, status: 'ended', ended_at: new Date().toISOString() } : x,
        ),
      )
    } catch {
      // Leave the row untouched; the next reload shows the true status.
    } finally {
      setEndingId(null)
    }
  }

  const filtered = useMemo(() => {
    let list = sessions ?? []
    if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter)
    const range = TIME_RANGES.find(r => r.key === timeFilter)
    if (range && range.ms !== Infinity) {
      const cutoff = Date.now() - range.ms
      list = list.filter(s => new Date(s.last_active || s.created_at).getTime() >= cutoff)
    }
    return list
  }, [sessions, statusFilter, timeFilter])

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered, {
    model: s => s.llm_model ?? '',
    created: s => new Date(s.created_at).getTime(),
    lastActive: s => new Date(s.last_active || s.created_at).getTime(),
  })

  const columns: Column<SessionRecord>[] = [
    {
      key: 'id', header: 'Session',
      render: s => (
        <div className="leading-tight">
          {s.title ? (
            <div className="text-[13px] font-medium text-ink-50">{s.title}</div>
          ) : (
            <div className="font-mono text-[12px] font-medium text-ink-50">{s.id}</div>
          )}
          <div className="text-[11px] text-ink-500">
            {s.title && <span className="font-mono">{s.id} · </span>}
            created {timeAgo(s.created_at)}
          </div>
        </div>
      ),
    },
    {
      key: 'model', header: 'Model', sortable: true,
      render: s => <span className="font-mono text-[12px] text-ink-300">{s.llm_model || '—'}</span>,
    },
    { key: 'status', header: 'Status', render: s => <StatusBadge status={s.status} /> },
    {
      key: 'created', header: 'Created', sortable: true,
      render: s => <span className="text-[12px] text-ink-400">{formatDateTime(s.created_at)}</span>,
    },
    {
      key: 'lastActive', header: 'Last Active', sortable: true,
      render: s => <span className="text-[12px] text-ink-400">{timeAgo(s.last_active || s.created_at)}</span>,
    },
    {
      key: 'actions', header: '',
      render: s => (
        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={() => navigate(`/chat/${s.id}`)}>
            <MessageSquare className="h-3.5 w-3.5" /> Open in chat
          </Button>
          {s.status === 'active' && (
            <Button variant="ghost" size="sm" disabled={endingId === s.id} onClick={() => void end(s)}>
              <CircleStop className="h-3.5 w-3.5" /> {endingId === s.id ? 'Ending…' : 'End'}
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader title="Sessions" description="Your chat sessions, live from the session manager." />

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
          <TableSkeleton rows={5} cols={5} />
        ) : error ? (
          <EmptyState
            icon={<MessagesSquare className="h-5 w-5" />}
            title="Failed to load sessions"
            description={error}
            action={<Button variant="outline" size="sm" onClick={reload}>Retry</Button>}
          />
        ) : sorted.length > 0 ? (
          <DataTable
            columns={columns}
            rows={sorted}
            rowKey={s => s.id}
            onRowClick={s => navigate(`/chat/${s.id}`)}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
          />
        ) : (
          <EmptyState
            icon={<MessagesSquare className="h-5 w-5" />}
            title="No sessions found"
            description="Try adjusting your filters, or start a new conversation from the Chat page."
            action={<Button variant="outline" size="sm" onClick={() => navigate('/chat')}>Go to chat</Button>}
          />
        )}
      </Card>

      {hasMore && !loading && !error && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  )
}
