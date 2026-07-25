import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Play, Square, RotateCcw, Terminal, Globe, Cpu, HardDrive } from 'lucide-react'
import { api } from '../../mocks/api'
import { useAsync } from '../../hooks/useAsync'
import StatusBadge from '../../components/StatusBadge'
import { Card, Skeleton } from '../../components/Primitives'
import { Button } from '../../components/ConfirmDialog'
import { formatDateTime, timeAgo, cn } from '../../utils/format'

function MetricRing({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  const r = 34
  const c = 2 * Math.PI * r
  const color = value >= 80 ? '#f59e0b' : value >= 60 ? '#0070f3' : '#34d399'
  return (
    <div className="flex items-center gap-4 rounded-xl border border-ink-800 bg-ink-900/60 p-4">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#2a2a2a" strokeWidth="7" />
          <circle
            cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * value) / 100}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-[15px] font-bold text-ink-50">{value}%</span>
      </div>
      <div>
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink-300"><Icon className="h-3.5 w-3.5" /> {label}</div>
        <div className="mt-0.5 text-[11px] text-ink-500">of allocated quota</div>
      </div>
    </div>
  )
}

const levelCls: Record<string, string> = {
  info: 'text-accent-fg', warn: 'text-warn', error: 'text-bad', debug: 'text-ink-500',
}

export default function SandboxDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: sandbox, loading } = useAsync(() => api.getSandbox(id!), [id])

  if (loading) {
    return (
      <div className="mx-auto max-w-[1000px] space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    )
  }
  if (!sandbox) {
    return <div className="text-ink-400">Sandbox not found.</div>
  }

  return (
    <div className="mx-auto max-w-[1000px]">
      <Link to="/sandboxes" className="mb-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-400 transition-colors hover:text-ink-200">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Sandboxes
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between animate-fade-up">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[24px] font-bold tracking-tight text-ink-50">{sandbox.name}</h1>
            <StatusBadge status={sandbox.status} />
          </div>
          <div className="mt-1.5 flex items-center gap-3 font-mono text-[12px] text-ink-400">
            <span>{sandbox.id}</span>
            <span className="text-ink-600">·</span>
            <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {sandbox.region}</span>
            <span className="text-ink-600">·</span>
            <span>{sandbox.ipAddress}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {sandbox.status === 'running' ? (
            <Button variant="outline"><Square className="h-3.5 w-3.5" /> Stop</Button>
          ) : (
            <Button variant="outline"><Play className="h-3.5 w-3.5" /> Start</Button>
          )}
          <Button variant="outline"><RotateCcw className="h-3.5 w-3.5" /> Restart</Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <MetricRing label="CPU Usage" value={sandbox.cpuUsage} icon={Cpu} />
        <MetricRing label="Memory Usage" value={sandbox.memoryUsage} icon={HardDrive} />
      </div>

      {/* Config + Processes */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Card className="p-5 animate-fade-up">
          <h3 className="mb-4 font-display text-[14px] font-semibold text-ink-100">Configuration</h3>
          <dl className="space-y-3 text-[13px]">
            {[
              ['Image', sandbox.image],
              ['CPU Limit', `${sandbox.cpuLimit} cores`],
              ['Memory Limit', `${sandbox.memoryLimit} MB`],
              ['Created', formatDateTime(sandbox.createdAt)],
              ['Attached Agents', sandbox.agentIds.length ? sandbox.agentIds.join(', ') : 'None'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="shrink-0 text-ink-400">{k}</dt>
                <dd className="truncate text-right font-mono text-[12px] text-ink-200">{v}</dd>
              </div>
            ))}
          </dl>
          {Object.keys(sandbox.envVars).length > 0 && (
            <div className="mt-4 border-t border-ink-800 pt-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Environment</div>
              <div className="space-y-1.5">
                {Object.entries(sandbox.envVars).map(([k, v]) => (
                  <div key={k} className="flex justify-between rounded-md bg-ink-850 px-2.5 py-1.5 font-mono text-[11px]">
                    <span className="text-accent">{k}</span>
                    <span className="text-ink-300">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5 animate-fade-up">
          <h3 className="mb-4 font-display text-[14px] font-semibold text-ink-100">Processes</h3>
          {sandbox.processes.length === 0 ? (
            <p className="text-[13px] text-ink-500">No running processes.</p>
          ) : (
            <div className="space-y-2">
              {sandbox.processes.map(p => (
                <div key={p.pid} className="flex items-center gap-3 rounded-lg border border-ink-800 bg-ink-900/50 px-3 py-2.5">
                  <span className="font-mono text-[11px] text-ink-500">#{p.pid}</span>
                  <span className="flex-1 truncate font-mono text-[12px] text-ink-200">{p.command}</span>
                  <span className="font-mono text-[11px] text-ink-400">{p.cpu}% cpu</span>
                  <span className="font-mono text-[11px] text-ink-400">{p.memory}% mem</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Logs */}
      <Card className="mt-4 overflow-hidden animate-fade-up">
        <div className="flex items-center gap-2 border-b border-ink-800 px-5 py-3.5">
          <Terminal className="h-4 w-4 text-ink-400" />
          <h3 className="font-display text-[14px] font-semibold text-ink-100">Logs</h3>
          <span className="ml-auto text-[11px] text-ink-500">last updated {timeAgo(sandbox.logs[sandbox.logs.length - 1]?.timestamp ?? sandbox.createdAt)}</span>
        </div>
        <div className="bg-ink-950/60 px-5 py-4 font-mono text-[12px] leading-relaxed">
          {sandbox.logs.map(l => (
            <div key={l.id} className="flex gap-3 py-0.5">
              <span className="shrink-0 text-ink-600">{formatDateTime(l.timestamp)}</span>
              <span className={cn('w-12 shrink-0 uppercase', levelCls[l.level])}>{l.level}</span>
              <span className="text-ink-300">{l.message}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
