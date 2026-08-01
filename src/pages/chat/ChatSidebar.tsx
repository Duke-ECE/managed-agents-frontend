import { MessageSquarePlus, MessageSquare, Trash2 } from 'lucide-react'
import { cn, timeAgo } from '../../utils/format'
import type { SessionRecord } from '../../lib/chat-api'

/**
 * ChatGPT-style session rail inside the chat page. Sessions come from the
 * real backend (GET /api/sessions): active ones first, then ended, newest
 * activity first within each group.
 */
export default function ChatSidebar({
  sessions,
  error,
  activeId,
  titles,
  onNew,
  onSelect,
  onEnd,
}: {
  /** null while the first load is in flight */
  sessions: SessionRecord[] | null
  error: string | null
  activeId: string | null
  /** session id → short label derived from its first user message */
  titles: Record<string, string>
  onNew: () => void
  onSelect: (id: string) => void
  onEnd: (id: string) => void
}) {
  const sorted = [...(sessions ?? [])].sort((a, b) => {
    if ((a.status === 'active') !== (b.status === 'active')) return a.status === 'active' ? -1 : 1
    const at = new Date(a.last_active || a.created_at).getTime()
    const bt = new Date(b.last_active || b.created_at).getTime()
    return bt - at
  })

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-hidden rounded-xl border border-ink-800 bg-ink-900/80 shadow-card backdrop-blur-sm">
      <div className="p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-medium text-white shadow-sm shadow-accent/25 transition-all duration-150 hover:bg-accent-hover active:scale-[0.98]"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" /> New chat
        </button>
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

        {sessions !== null && !error && sorted.length === 0 && (
          <div className="flex flex-col items-center px-4 pt-10 text-center">
            <MessageSquare className="mb-2 h-4 w-4 text-ink-500" />
            <p className="text-[12px] leading-relaxed text-ink-500">No chats yet — send a message to start one.</p>
          </div>
        )}

        {sorted.map((s) => {
          const active = s.id === activeId
          return (
            <div
              key={s.id}
              className={cn(
                'group relative flex items-center rounded-lg transition-colors',
                active ? 'bg-ink-500/[0.10]' : 'hover:bg-ink-500/[0.07]',
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                className="min-w-0 flex-1 px-3 py-2 text-left"
              >
                <div className={cn('truncate text-[13px] font-medium', active ? 'text-ink-50' : 'text-ink-200')}>
                  {titles[s.id] ?? `Session ${s.id.slice(-6)}`}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-500">
                  {s.status !== 'active' && <span className="rounded border border-ink-700 px-1 text-[9px] uppercase">ended</span>}
                  <span>{timeAgo(s.last_active || s.created_at)}</span>
                </div>
              </button>
              <button
                type="button"
                title="End and remove this chat"
                onClick={() => onEnd(s.id)}
                className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-500 opacity-0 transition-all hover:bg-ink-500/[0.10] hover:text-bad group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
