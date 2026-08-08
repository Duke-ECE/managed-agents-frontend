import { useState } from 'react'
import { CircleStop, MessageSquarePlus, MessageSquare, Pencil, Search, Trash2 } from 'lucide-react'
import ConfirmDialog from '../../components/ConfirmDialog'
import { cn, timeAgo } from '../../utils/format'
import type { SessionRecord } from '../../lib/chat-api'

/**
 * ChatGPT-style session rail inside the chat page. Sessions come from the
 * real backend (GET /api/sessions, paginated): active ones first, then
 * ended, newest activity first within each group. A search box filters the
 * loaded sessions client-side; "Load more" appends the next page. Hover
 * actions: rename (inline), end, delete (purge, confirmed).
 */
export default function ChatSidebar({
  sessions,
  error,
  activeId,
  titles,
  hasMore,
  loadingMore,
  onNew,
  onSelect,
  onEnd,
  onRename,
  onDelete,
  onLoadMore,
  onPrefetchSession,
}: {
  /** null while the first load is in flight */
  sessions: SessionRecord[] | null
  error: string | null
  activeId: string | null
  /** session id → short label derived from its first user message */
  titles: Record<string, string>
  /** older sessions exist server-side beyond the loaded pages */
  hasMore: boolean
  loadingMore: boolean
  onNew: () => void
  onSelect: (id: string) => void
  onEnd: (id: string) => void
  /** rename; an empty title is a no-op and never reaches here */
  onRename: (id: string, title: string) => void
  /** hard-delete (purge) after the danger confirmation */
  onDelete: (id: string) => void
  onLoadMore: () => void
  /** hover warmup for the transcript cache; best-effort */
  onPrefetchSession?: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [purgeTarget, setPurgeTarget] = useState<SessionRecord | null>(null)

  const sorted = [...(sessions ?? [])].sort((a, b) => {
    if ((a.status === 'active') !== (b.status === 'active')) return a.status === 'active' ? -1 : 1
    const at = new Date(a.last_active || a.created_at).getTime()
    const bt = new Date(b.last_active || b.created_at).getTime()
    return bt - at
  })

  const q = query.trim().toLowerCase()
  const visible = q
    ? sorted.filter((s) => {
        const label = (s.title ?? titles[s.id] ?? '').toLowerCase()
        return label.includes(q) || s.id.toLowerCase().includes(q)
      })
    : sorted

  const startRename = (s: SessionRecord) => {
    setRenameDraft(s.title ?? titles[s.id] ?? '')
    setRenamingId(s.id)
  }

  const commitRename = (sid: string) => {
    const title = renameDraft.trim()
    setRenamingId(null)
    if (title) onRename(sid, title) // empty = no-op
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-hidden rounded-xl border border-ink-800 bg-ink-900/80 shadow-card backdrop-blur-sm">
      <div className="space-y-2 p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-medium text-white shadow-sm shadow-accent/25 transition-all duration-150 hover:bg-accent-hover active:scale-[0.98]"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" /> New chat
        </button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats…"
            className="h-8 w-full rounded-lg border border-ink-700 bg-ink-850 pl-8 pr-2 text-[12px] text-ink-100 placeholder:text-ink-500 transition-colors focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {sessions === null && !error && (
          <div className="space-y-2 px-1 pt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg bg-ink-800" style={{ height: 44 }} />
            ))}
          </div>
        )}

        {error && (
          <p className="px-2 pt-2 text-[12px] leading-relaxed text-bad">Failed to load sessions: {error}</p>
        )}

        {sessions !== null && !error && visible.length === 0 && !q && (
          <div className="flex flex-col items-center px-4 pt-10 text-center">
            <MessageSquare className="mb-2 h-4 w-4 text-ink-500" />
            <p className="text-[12px] leading-relaxed text-ink-500">No chats yet — send a message to start one.</p>
          </div>
        )}

        {sessions !== null && !error && visible.length === 0 && q && (
          <p className="px-2 pt-4 text-center text-[12px] text-ink-500">No chats match “{query.trim()}”.</p>
        )}

        {visible.map((s) => {
          const active = s.id === activeId
          const renaming = renamingId === s.id
          return (
            <div
              key={s.id}
              onMouseEnter={() => onPrefetchSession?.(s.id)}
              className={cn(
                'group relative flex items-center rounded-lg transition-colors',
                active ? 'bg-ink-500/[0.10]' : 'hover:bg-ink-500/[0.07]',
              )}
            >
              {renaming ? (
                <input
                  type="text"
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(s.id)
                    else if (e.key === 'Escape') setRenamingId(null)
                  }}
                  onBlur={() => commitRename(s.id)}
                  className="mx-2 my-1.5 h-7 min-w-0 flex-1 rounded-md border border-accent bg-ink-850 px-2 text-[12px] text-ink-100 focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className="min-w-0 flex-1 px-3 py-2 text-left"
                >
                  <div className={cn('truncate text-[13px] font-medium', active ? 'text-ink-50' : 'text-ink-200')}>
                    {s.title ?? titles[s.id] ?? `Session ${s.id.slice(-6)}`}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-500">
                    {s.status !== 'active' && <span className="rounded border border-ink-700 px-1 text-[9px] uppercase">ended</span>}
                    <span>{timeAgo(s.last_active || s.created_at)}</span>
                  </div>
                </button>
              )}
              {!renaming && (
                <div className="mr-2 flex shrink-0 items-center gap-0.5 opacity-0 transition-all group-hover:opacity-100">
                  <button
                    type="button"
                    title="Rename this chat"
                    onClick={() => startRename(s)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-ink-500 transition-all hover:bg-ink-500/[0.10] hover:text-ink-200"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {s.status === 'active' && (
                    <button
                      type="button"
                      title="End this chat"
                      onClick={() => onEnd(s.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-500 transition-all hover:bg-ink-500/[0.10] hover:text-warn"
                    >
                      <CircleStop className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Delete this chat permanently"
                    onClick={() => setPurgeTarget(s)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-ink-500 transition-all hover:bg-ink-500/[0.10] hover:text-bad"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {hasMore && !error && (
          <button
            type="button"
            disabled={loadingMore}
            onClick={onLoadMore}
            className="mt-1 flex h-8 w-full items-center justify-center rounded-lg border border-ink-700 text-[12px] text-ink-400 transition-colors hover:bg-ink-500/[0.07] hover:text-ink-200 disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={purgeTarget !== null}
        danger
        title="Delete this chat permanently?"
        message={`“${purgeTarget?.title ?? (purgeTarget ? titles[purgeTarget.id] : '') ?? `Session ${purgeTarget?.id.slice(-6) ?? ''}`}” and its entire transcript will be deleted. This cannot be undone.`}
        confirmLabel="Delete permanently"
        onConfirm={() => {
          if (purgeTarget) onDelete(purgeTarget.id)
          setPurgeTarget(null)
        }}
        onCancel={() => setPurgeTarget(null)}
      />
    </aside>
  )
}
