import { useCallback, useEffect, useState } from 'react'
import { Bot, Copy, Eye, Pencil, Plus, ShieldX, Trash2, Wrench } from 'lucide-react'
import {
  ApiError,
  deleteAgent,
  fetchMe,
  isPlatform,
  listAgents,
  type AgentTemplate,
} from '../../lib/chat-api'
import StatusBadge from '../../components/StatusBadge'
import { PageHeader, Card, EmptyState, Skeleton } from '../../components/Primitives'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Button } from '../../components/ui/button'
import { formatDateTime } from '../../utils/format'
import AgentFormDrawer, { type AgentDrawerState } from './AgentFormDrawer'

/**
 * Agent templates — named, reusable session configs (system prompt, LLM,
 * tools whitelist) backed by /api/agents. The API key is write-only; the
 * table shows has_api_key, never the key itself. 401/403 degrade to a
 * no-permission state like the other pages.
 */
export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentTemplate[] | null>(null)
  const [loadError, setLoadError] = useState<{ status: number | null; message: string } | null>(null)
  // null = unknown (fetch failed or in flight); degrade to not-blocked and
  // let the backend be the gate.
  const [platformBlocked, setPlatformBlocked] = useState(false)
  // Drawer state: undefined = closed.
  const [drawer, setDrawer] = useState<AgentDrawerState | undefined>(undefined)
  const [deleting, setDeleting] = useState<AgentTemplate | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      setAgents(await listAgents())
    } catch (err) {
      setAgents(null)
      setLoadError({
        status: err instanceof ApiError ? err.status : null,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // The platform_default option is gated on whitelist membership.
  useEffect(() => {
    let cancelled = false
    fetchMe()
      .then((me) => { if (!cancelled) setPlatformBlocked(!me.can_use_platform_llm) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteAgent(deleting.id)
      setAgents((list) => list?.filter((a) => a.id !== deleting.id) ?? list)
      setDeleting(null)
    } catch (err) {
      setLoadError({
        status: err instanceof ApiError ? err.status : null,
        message: err instanceof Error ? err.message : String(err),
      })
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  const ownAgents = agents?.filter((a) => !isPlatform(a)) ?? []
  const builtInAgents = agents?.filter(isPlatform) ?? []

  const renderAgent = (a: AgentTemplate) => {
    const builtIn = isPlatform(a)
    const model = a.llm_mode === 'custom' ? (a.llm_model || 'Not set') : 'Platform default'
    const tools = a.tools.length === 0 ? 'All tools' : a.tools.join(', ')
    return (
      <article key={a.id} className="flex min-w-0 flex-col rounded-xl border border-ink-800 bg-ink-900 p-5 transition-colors hover:border-ink-600">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ink-700 bg-ink-850 text-accent-fg">
            <Bot className="h-[19px] w-[19px]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 truncate font-display text-[15px] font-semibold text-ink-50" title={a.name}>{a.name}</h3>
              {builtIn && <StatusBadge status="platform" label="Built-in" />}
            </div>
            <p className="mt-1 line-clamp-2 min-h-9 text-[12px] leading-relaxed text-ink-400" title={a.description}>
              {a.description || 'No description yet.'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-ink-800 pt-4">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">Model</div>
            <div className="mt-1 truncate font-mono text-[12px] text-ink-200" title={model}>{model}</div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500"><Wrench className="h-3 w-3" /> Tools</div>
            <div className="mt-1 truncate text-[12px] text-ink-200" title={tools}>{tools}</div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-ink-500">Updated {formatDateTime(a.updated_at)}</span>
          <div className="flex items-center gap-1">
            {builtIn ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setDrawer({ kind: 'view', agent: a })}><Eye className="h-3.5 w-3.5" /> View</Button>
                <Button variant="ghost" size="sm" onClick={() => setDrawer({ kind: 'clone', source: a })}><Copy className="h-3.5 w-3.5" /> Clone</Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setDrawer({ kind: 'edit', agent: a })}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleting(a)}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
              </>
            )}
          </div>
        </div>
      </article>
    )
  }

  const noPermission = loadError && (loadError.status === 401 || loadError.status === 403)

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Agents"
        description="Create and manage the assistants you can use in chat."
        actions={
          <Button onClick={() => setDrawer({ kind: 'create' })}>
            <Plus className="h-4 w-4" /> New agent
          </Button>
        }
      />

      {noPermission ? (
        <Card className="overflow-hidden animate-fade-up">
          <EmptyState
            icon={<ShieldX className="h-5 w-5" />}
            title="No permission"
            description="You don't have access to agent templates."
          />
        </Card>
      ) : agents === null && !loadError ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="space-y-4 p-5">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-9 w-full" />
            </Card>
          ))}
        </div>
      ) : loadError ? (
        <Card className="overflow-hidden animate-fade-up">
          <EmptyState
            icon={<Bot className="h-5 w-5" />}
            title="Failed to load agents"
            description={loadError.message}
            action={<Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button>}
          />
        </Card>
      ) : agents !== null && agents.length > 0 ? (
        <div className="space-y-8 animate-fade-up">
          {ownAgents.length > 0 && (
            <section aria-labelledby="own-agents-heading">
              <div className="mb-3 flex items-baseline gap-2">
                <h2 id="own-agents-heading" className="font-display text-[16px] font-semibold text-ink-50">Your agents</h2>
                <span className="text-[12px] text-ink-500">{ownAgents.length}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">{ownAgents.map(renderAgent)}</div>
            </section>
          )}
          {builtInAgents.length > 0 && (
            <section aria-labelledby="built-in-agents-heading">
              <div className="mb-3 flex items-baseline gap-2">
                <h2 id="built-in-agents-heading" className="font-display text-[16px] font-semibold text-ink-50">Built-in agents</h2>
                <span className="text-[12px] text-ink-500">{builtInAgents.length}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">{builtInAgents.map(renderAgent)}</div>
            </section>
          )}
        </div>
      ) : (
        <Card className="overflow-hidden animate-fade-up">
          <EmptyState
            icon={<Bot className="h-5 w-5" />}
            title="No agents yet"
            description="Create a template once, then start chats with it from the Chat page."
            action={<Button onClick={() => setDrawer({ kind: 'create' })}><Plus className="h-4 w-4" /> New agent</Button>}
          />
        </Card>
      )}

      <AgentFormDrawer
        open={drawer !== undefined}
        state={drawer ?? { kind: 'create' }}
        platformBlocked={platformBlocked}
        onClose={() => setDrawer(undefined)}
        onSaved={() => void load()}
        onClone={(source) => setDrawer({ kind: 'clone', source })}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.name ?? 'agent'}?`}
        message="Sessions already created with this template keep running, but new sessions can no longer use it."
        confirmLabel={deleteBusy ? 'Deleting…' : 'Delete'}
        danger
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
