import { useEffect, useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { createAPIKey, listAPIKeys, revokeAPIKey, type PlatformAPIKey } from '../../lib/chat-api'
import { PageHeader, Card, EmptyState } from '../../components/Primitives'
import ConfirmDialog, { Button } from '../../components/ConfirmDialog'
import { formatDateTime } from '../../utils/format'

export default function APIKeysPage() {
  const [keys, setKeys] = useState<PlatformAPIKey[] | null>(null)
  const [name, setName] = useState('')
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pendingRevoke, setPendingRevoke] = useState<PlatformAPIKey | null>(null)
  const [copied, setCopied] = useState(false)

  const refresh = async () => {
    try { setKeys(await listAPIKeys()); setError('') }
    catch (err) { setKeys([]); setError(err instanceof Error ? err.message : String(err)) }
  }
  useEffect(() => { void refresh() }, [])

  const create = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSecret('')
    setCopied(false)
    try {
      const result = await createAPIKey(name.trim())
      setSecret(result.secret)
      setName('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally { setBusy(false) }
  }

  const revoke = async (id: string) => {
    setPendingRevoke(null)
    setBusy(true)
    setError('')
    try { await revokeAPIKey(id); await refresh() }
    catch (err) { setError(err instanceof Error ? err.message : String(err)) }
    finally { setBusy(false) }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setError('')
    } catch {
      setError('Could not copy the key. Select and copy it manually.')
    }
  }

  return <div className="mx-auto max-w-[900px]">
    <PageHeader title="API Keys" description="Create server-side keys for third-party apps. Keys can chat with your existing agents and manage your sessions." />
    <Card className="mb-4 p-5">
      <form onSubmit={create} className="flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1 text-[12px] text-ink-400">Key name
          <input className="mt-1 h-9 w-full rounded-lg border border-ink-700 bg-ink-850 px-3 text-ink-100" value={name} onChange={e => setName(e.target.value)} maxLength={120} required placeholder="My integration" />
        </label>
        <Button type="submit" disabled={busy || !name.trim()}>Create key</Button>
      </form>
      {secret && <div className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-3">
        <p className="mb-2 text-[12px] text-ink-200">Copy this key now. It will not be shown again.</p>
        <div className="flex gap-2">
          <code className="min-w-0 flex-1 overflow-x-auto rounded bg-ink-900 p-2 text-[12px] text-ink-50">{secret}</code>
          <Button type="button" variant="outline" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</Button>
        </div>
      </div>}
      {error && <p role="alert" className="mt-3 text-[12px] text-bad">{error}</p>}
    </Card>
    <Card className="overflow-hidden">
      {keys === null ? <p className="p-5 text-[12px] text-ink-400">Loading keys…</p> : keys.length === 0 ? <EmptyState icon={<KeyRound className="h-5 w-5" />} title="No API keys" description="Create a key to connect a third-party app." /> :
        <ul className="divide-y divide-ink-700">
          {keys.map(key => <li key={key.id} className="flex items-center gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-ink-100">{key.name}</div>
              <div className="text-[11px] text-ink-400">{key.prefix}… · Created {formatDateTime(key.created_at)}{key.revoked_at ? ' · Revoked' : ''}</div>
            </div>
            {!key.revoked_at && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setPendingRevoke(key)}>Revoke</Button>}
          </li>)}
        </ul>}
    </Card>
    <ConfirmDialog
      open={pendingRevoke !== null}
      title="Revoke API key?"
      message={`Apps using ${pendingRevoke?.name ?? 'this key'} will lose access immediately.`}
      confirmLabel="Revoke key"
      danger
      onConfirm={() => { if (pendingRevoke) void revoke(pendingRevoke.id) }}
      onCancel={() => setPendingRevoke(null)}
    />
  </div>
}
