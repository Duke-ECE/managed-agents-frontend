import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ShieldCheck, ShieldX, UserPlus } from 'lucide-react'
import {
  ApiError,
  listAdminUsers,
  removeMember,
  upsertMember,
  type AdminUser,
} from '../../lib/chat-api'
import DataTable, { type Column } from '../../components/DataTable'
import StatusBadge from '../../components/StatusBadge'
import { PageHeader, Card, EmptyState, TableSkeleton } from '../../components/Primitives'
import { Button } from '../../components/ConfirmDialog'
import { formatDateTime, timeAgo } from '../../utils/format'

const inputCls =
  'h-9 w-full rounded-lg border border-ink-700 bg-ink-850 px-3 text-[13px] text-ink-100 placeholder:text-ink-500 transition-colors focus:border-accent focus:outline-none'

const labelCls =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400'

type RoleChoice = 'guest' | 'member' | 'admin'

/**
 * Platform LLM access control — lists every registered user and lets an
 * admin change roles directly. "guest" (default) means no whitelist row and
 * no platform LLM access; members chat key-free, everyone else configures
 * their own API key. This is NOT login permission: sign-in is open to any
 * GitHub account. The backend is the real gate; this page only renders what
 * /api/admin/users allows (403/401 → no-permission state).
 */
export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [loadError, setLoadError] = useState<{ status: number | null; message: string } | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      setUsers(await listAdminUsers())
    } catch (err) {
      setUsers(null)
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

  const changeRole = async (user: AdminUser, next: RoleChoice) => {
    if (next === user.role || pendingEmail !== null) return
    setPendingEmail(user.email)
    setLoadError(null)
    try {
      if (next === 'guest') await removeMember(user.email)
      else await upsertMember(user.email, next)
      await load()
    } catch (err) {
      setLoadError({
        status: err instanceof ApiError ? err.status : null,
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setPendingEmail(null)
    }
  }

  const columns: Column<AdminUser>[] = [
    {
      key: 'email', header: 'Email',
      render: (u) => <span className="font-mono text-[12px] font-medium text-ink-50">{u.email}</span>,
    },
    {
      key: 'provider', header: 'Provider',
      render: (u) =>
        u.provider
          ? <StatusBadge status={u.provider} />
          : <span className="text-[12px] text-ink-500">—</span>,
    },
    {
      key: 'role', header: 'Role',
      render: (u) => (
        <select
          value={u.role}
          disabled={pendingEmail === u.email}
          onChange={(e) => void changeRole(u, e.target.value as RoleChoice)}
          className="h-8 rounded-lg border border-ink-700 bg-ink-850 px-2 text-[12px] text-ink-100 transition-colors focus:border-accent focus:outline-none disabled:opacity-50"
        >
          <option value="guest">guest</option>
          <option value="member">member</option>
          <option value="admin">admin</option>
        </select>
      ),
    },
    {
      key: 'lastSignIn', header: 'Last sign-in',
      render: (u) =>
        u.last_sign_in_at
          ? <span className="text-[12px] text-ink-400">{timeAgo(u.last_sign_in_at)}</span>
          : <span className="text-[12px] text-ink-500">never</span>,
    },
    {
      key: 'created', header: 'Created',
      render: (u) => <span className="text-[12px] text-ink-400">{formatDateTime(u.created_at)}</span>,
    },
  ]

  const noPermission = loadError && (loadError.status === 401 || loadError.status === 403)

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="LLM Access"
        description="Everyone who has signed in, with their platform LLM access. Guests (the default) configure their own API key; members and admins chat key-free. Sign-in is open to any GitHub account — this list does not control login."
      />

      {noPermission ? (
        <EmptyState
          icon={<ShieldX className="h-5 w-5" />}
          title="No permission"
          description="This area is restricted to admins. Ask an existing admin to grant you access."
        />
      ) : (
        <>
          {/* Pre-grant access before a user's first login */}
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

          {/* Users table */}
          <Card className="overflow-hidden animate-fade-up">
            {users === null && !loadError ? (
              <TableSkeleton rows={4} cols={5} />
            ) : loadError ? (
              <EmptyState
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Failed to load users"
                description={loadError.message}
                action={<Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button>}
              />
            ) : users !== null && users.length > 0 ? (
              <DataTable columns={columns} rows={users} rowKey={(u) => u.email} />
            ) : (
              <EmptyState
                icon={<ShieldCheck className="h-5 w-5" />}
                title="No users yet"
                description="Users appear here after their first sign-in; you can also pre-grant access with the form above."
              />
            )}
          </Card>
        </>
      )}
    </div>
  )
}
