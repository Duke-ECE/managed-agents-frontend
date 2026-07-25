import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Play, Square, Trash2, Cpu, Box, ScrollText } from 'lucide-react'
import { api } from '../../mocks/api'
import { useAsync } from '../../hooks/useAsync'
import { useTableSort } from '../../hooks/useTableSort'
import DataTable, { type Column } from '../../components/DataTable'
import StatusBadge from '../../components/StatusBadge'
import { PageHeader, Card, EmptyState, TableSkeleton } from '../../components/Primitives'
import Drawer from '../../components/Drawer'
import ConfirmDialog, { Button } from '../../components/ConfirmDialog'
import { timeAgo, cn } from '../../utils/format'
import type { Sandbox } from '../../types'

function UsageBar({ value, warn = 70 }: { value: number; warn?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-800">
        <div
          className={cn('h-full rounded-full transition-all',
            value >= warn ? 'bg-warn' : 'bg-good')}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-ink-400">{value}%</span>
    </div>
  )
}

export function CreateSandboxDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [image, setImage] = useState('ghcr.io/agents/node20-dev:latest')
  const [cpu, setCpu] = useState('2')
  const [memory, setMemory] = useState('4096')
  const [region, setRegion] = useState('us-east-1')
  const [env, setEnv] = useState('')

  const inputCls = 'w-full rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-[13px] text-ink-100 placeholder-ink-500 outline-none transition-colors focus:border-accent'
  const labelCls = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400'

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Create Sandbox"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onClose}>Provision Sandbox</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. prod-worker-01" />
        </div>
        <div>
          <label className={labelCls}>Image</label>
          <input className={cn(inputCls, 'font-mono text-[12px]')} value={image} onChange={e => setImage(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>CPU (cores)</label>
            <select className={inputCls} value={cpu} onChange={e => setCpu(e.target.value)}>
              {['1', '2', '4', '8'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Memory (MB)</label>
            <select className={inputCls} value={memory} onChange={e => setMemory(e.target.value)}>
              {['2048', '4096', '8192', '16384', '32768'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Region</label>
          <select className={inputCls} value={region} onChange={e => setRegion(e.target.value)}>
            {['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Environment Variables</label>
          <textarea
            className={cn(inputCls, 'h-24 resize-none font-mono text-[12px]')}
            value={env}
            onChange={e => setEnv(e.target.value)}
            placeholder={'KEY=value\nANOTHER=value'}
          />
          <p className="mt-1.5 text-[11px] text-ink-500">One KEY=value pair per line.</p>
        </div>
      </div>
    </Drawer>
  )
}

export default function SandboxList() {
  const navigate = useNavigate()
  const { data: sandboxes, loading } = useAsync(() => api.getSandboxes())
  const [createOpen, setCreateOpen] = useState(false)
  const [toDestroy, setToDestroy] = useState<Sandbox | null>(null)

  const { sorted, sortKey, sortDir, onSort } = useTableSort(sandboxes, {
    name: s => s.name,
    created: s => new Date(s.createdAt).getTime(),
  })

  const columns: Column<Sandbox>[] = [
    {
      key: 'name', header: 'Sandbox', sortable: true,
      render: s => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-700 bg-ink-850 text-accent">
            <Box className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <div className="font-medium text-ink-50">{s.name}</div>
            <div className="font-mono text-[11px] text-ink-500">{s.id}</div>
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: s => <StatusBadge status={s.status} /> },
    {
      key: 'image', header: 'Image',
      render: s => <span className="font-mono text-[11px] text-ink-400">{s.image.split('/').pop()}</span>,
    },
    { key: 'cpu', header: 'CPU', render: s => s.status === 'running' ? <UsageBar value={s.cpuUsage} /> : <span className="text-ink-600">—</span> },
    { key: 'mem', header: 'Memory', render: s => s.status === 'running' ? <UsageBar value={s.memoryUsage} /> : <span className="text-ink-600">—</span> },
    { key: 'region', header: 'Region', render: s => <span className="text-[12px] text-ink-300">{s.region}</span> },
    { key: 'created', header: 'Created', sortable: true, render: s => <span className="text-[12px] text-ink-400">{timeAgo(s.createdAt)}</span> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: s => (
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            title="View logs"
            onClick={e => { e.stopPropagation(); navigate(`/sandboxes/${s.id}`) }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-800 hover:text-accent-fg"
          >
            <ScrollText className="h-3.5 w-3.5" />
          </button>
          {s.status === 'running' ? (
            <button title="Stop" className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-800 hover:text-warn">
              <Square className="h-3.5 w-3.5" />
            </button>
          ) : s.status === 'stopped' ? (
            <button title="Start" className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-800 hover:text-good">
              <Play className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            title="Destroy"
            onClick={e => { e.stopPropagation(); setToDestroy(s) }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-bad-soft hover:text-bad"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Sandboxes"
        description="Isolated execution environments for your agents."
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New Sandbox</Button>}
      />

      <Card className="overflow-hidden animate-fade-up">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : sandboxes && sandboxes.length > 0 ? (
          <DataTable
            columns={columns}
            rows={sorted}
            rowKey={s => s.id}
            onRowClick={s => navigate(`/sandboxes/${s.id}`)}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
          />
        ) : (
          <EmptyState
            icon={<Cpu className="h-5 w-5" />}
            title="No sandboxes yet"
            description="Provision your first sandbox to give agents a place to run."
            action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New Sandbox</Button>}
          />
        )}
      </Card>

      <CreateSandboxDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
      <ConfirmDialog
        open={!!toDestroy}
        danger
        title="Destroy sandbox?"
        message={`This will permanently destroy "${toDestroy?.name}" and all of its data. Attached agents will be detached. This action cannot be undone.`}
        confirmLabel="Destroy"
        onConfirm={() => setToDestroy(null)}
        onCancel={() => setToDestroy(null)}
      />
    </div>
  )
}
