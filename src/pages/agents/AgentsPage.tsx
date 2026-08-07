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
import DataTable, { type Column } from '../../components/DataTable'
import StatusBadge from '../../components/StatusBadge'
import { PageHeader, Card, EmptyState, TableSkeleton } from '../../components/Primitives'
import ConfirmDialog, { Button } from '../../components/ConfirmDialog'
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

  const columns: Column<AgentTemplate>[] = [
    {
      key: 'name', header: 'Agent',
      render: (a) => (
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <div className="text-[13px] font-medium text-ink-50">{a.name}</div>
            {isPlatform(a) && <StatusBadge status="platform" label="Built-in" />}
          </div>
          {a.description && (
            <div className="mt-0.5 max-w-72 truncate text-[11px] text-ink-500" title={a.description}>
              {a.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'mode', header: 'LLM mode',
      render: (a) => (
        <StatusBadge
          status={a.llm_mode}
          label={a.llm_mode === 'platform_default' ? 'platform default' : 'custom'}
        />
      ),
    },
    {
      key: 'model', header: 'Model',
      render: (a) =>
        a.llm_mode === 'custom' ? (
          <span className="font-mono text-[12px] text-ink-300">{a.llm_model || '—'}</span>
        ) : (
          <span className="text-[12px] text-ink-500">platform default</span>
        ),
    },
    {
      key: 'tools', header: 'Tools',
      render: (a) => (
        <span className="flex items-center gap-1.5 text-[12px] text-ink-400">
          <Wrench className="h-3 w-3 shrink-0" />
          {a.tools.length === 0 ? 'all' : <span className="font-mono">{a.tools.join(', ')}</span>}
        </span>
      ),
    },
    {
      key: 'updated', header: 'Updated',
      render: (a) => <span className="text-[12px] text-ink-400">{formatDateTime(a.updated_at)}</span>,
    },
    {
      key: 'actions', header: '',
      render: (a) => (
        <div className="flex items-center justify-end gap-2">
          {isPlatform(a) ? (
            <>
              {/* Built-in templates are read-only through the API — view or clone. */}
              <Button variant="outline" size="sm" onClick={() => setDrawer({ kind: 'view', agent: a })}>
                <Eye className="h-3.5 w-3.5" /> View
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDrawer({ kind: 'clone', source: a })}>
                <Copy className="h-3.5 w-3.5" /> Clone
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setDrawer({ kind: 'edit', agent: a })}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleting(a)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  const noPermission = loadError && (loadError.status === 401 || loadError.status === 403)

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Agents"
        description="Reusable agent templates: a system prompt, an LLM, and a tools whitelist. Select one when starting a chat."
        actions={
          <Button onClick={() => setDrawer({ kind: 'create' })}>
            <Plus className="h-4 w-4" /> New agent
          </Button>
        }
      />

      <Card className="overflow-hidden animate-fade-up">
        {noPermission ? (
          <EmptyState
            icon={<ShieldX className="h-5 w-5" />}
            title="No permission"
            description="You don't have access to agent templates."
          />
        ) : agents === null && !loadError ? (
          <TableSkeleton rows={4} cols={5} />
        ) : loadError ? (
          <EmptyState
            icon={<Bot className="h-5 w-5" />}
            title="Failed to load agents"
            description={loadError.message}
            action={<Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button>}
          />
        ) : agents !== null && agents.length > 0 ? (
          <DataTable columns={columns} rows={agents} rowKey={(a) => a.id} />
        ) : (
          <EmptyState
            icon={<Bot className="h-5 w-5" />}
            title="No agents yet"
            description="Create a template once, then start chats with it from the Chat page."
            action={<Button onClick={() => setDrawer({ kind: 'create' })}><Plus className="h-4 w-4" /> New agent</Button>}
          />
        )}
      </Card>

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
