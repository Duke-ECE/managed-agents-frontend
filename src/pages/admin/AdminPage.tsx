import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ShieldCheck, ShieldX, Trash2, UserPlus } from 'lucide-react'
import {
  ApiError,
  listMembers,
  removeMember,
  upsertMember,
  type Member,
} from '../../lib/chat-api'
import DataTable, { type Column } from '../../components/DataTable'
import StatusBadge from '../../components/StatusBadge'
import { PageHeader, Card, EmptyState, TableSkeleton } from '../../components/Primitives'
import ConfirmDialog, { Button } from '../../components/ConfirmDialog'
import { formatDateTime } from '../../utils/format'

const inputCls =
  'h-9 w-full rounded-lg border border-ink-700 bg-ink-850 px-3 text-[13px] text-ink-100 placeholder:text-ink-500 transition-colors focus:border-accent focus:outline-none'

const labelCls =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400'

/**
 * Whitelist management — members may use the platform LLM provider, admins
 * manage this list. The backend is the real gate; this page only renders
 * what /api/admin/members allows (403/401 → no-permission state).
 */
export default function AdminPage() {
  const [members, setMembers] = useState<Member[] | null>(null)
  const [loadError, setLoadError] = useState<{ status: number | null; message: string } | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const [removing, setRemoving] = useState(false)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      setMembers(await listMembers())
    } catch (err) {
      setMembers(null)
      setLoadError({
        status: err instanceof ApiError ? err.status : null,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const addMember = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      await upsertMember(email.trim(), role)
      setEmail('')
      setRole('member')
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const confirmRemove = async () => {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await removeMember(removeTarget.email)
      setRemoveTarget(null)
      await load()
    } catch (err) {
      setRemoveTarget(null)
      setLoadError({
        status: err instanceof ApiError ? err.status : null,
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setRemoving(false)
    }
  }

  const columns: Column<Member>[] = [
    {
      key: 'email', header: 'Email',
      render: (m) => <span className="font-mono text-[12px] font-medium text-ink-50">{m.email}</span>,
    },
    { key: 'role', header: 'Role', render: (m) => <StatusBadge status={m.role} /> },
    {
      key: 'addedBy', header: 'Added by',
      render: (m) => <span className="font-mono text-[12px] text-ink-300">{m.added_by || '—'}</span>,
    },
    {
      key: 'created', header: 'Added',
      render: (m) => <span className="text-[12px] text-ink-400">{formatDateTime(m.created_at)}</span>,
    },
    {
      key: 'actions', header: '',
      render: (m) => (
        <div className="flex items-center justify-end">
          <Button variant="ghost" size="sm" onClick={() => setRemoveTarget(m)}>
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </Button>
        </div>
      ),
    },
  ]

  const noPermission = loadError && (loadError.status === 401 || loadError.status === 403)

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Admin"
        description="Whitelist management — members may use the platform LLM provider; admins manage this list."
      />

      {noPermission ? (
        <EmptyState
          icon={<ShieldX className="h-5 w-5" />}
          title="No permission"
          description="This area is restricted to admins. Ask an existing admin to grant you access."
        />
      ) : (
        <>
          {/* Add member */}
          <Card className="mb-4 p-5 animate-fade-up">
            <form onSubmit={addMember} className="flex flex-wrap items-end gap-4">
              <label className="block min-w-56 flex-1">
                <span className={labelCls}>Email</span>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@duke.edu"
                />
              </label>
              <label className="block">
                <span className={labelCls}>Role</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                  className={inputCls}
                >
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <Button type="submit" disabled={submitting}>
                <UserPlus className="h-4 w-4" />
                {submitting ? 'Adding…' : 'Add member'}
              </Button>
            </form>
            {formError && (
              <p className="mt-3 rounded-lg border border-bad-line bg-bad-soft px-3 py-2 text-[12px] text-bad animate-fade-in">
                {formError}
              </p>
            )}
          </Card>

          {/* Members table */}
          <Card className="overflow-hidden animate-fade-up">
            {members === null && !loadError ? (
              <TableSkeleton rows={4} cols={4} />
            ) : loadError ? (
              <EmptyState
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Failed to load members"
                description={loadError.message}
                action={<Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button>}
              />
            ) : members !== null && members.length > 0 ? (
              <DataTable columns={columns} rows={members} rowKey={(m) => m.email} />
            ) : (
              <EmptyState
                icon={<ShieldCheck className="h-5 w-5" />}
                title="No members yet"
                description="Add the first member with the form above."
              />
            )}
          </Card>
        </>
      )}

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove member"
        message={`Remove ${removeTarget?.email ?? ''}? They lose platform LLM access${removeTarget?.role === 'admin' ? ' and admin rights' : ''} immediately.`}
        confirmLabel={removing ? 'Removing…' : 'Remove'}
        danger
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}
