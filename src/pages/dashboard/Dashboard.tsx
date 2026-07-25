import { Link } from 'react-router-dom'
import {
  Box, Bot, MessagesSquare, ListTodo, ArrowUpRight,
  Activity, Zap, CheckCircle2, XCircle, Info,
} from 'lucide-react'
import { api } from '../../mocks/api'
import { useAsync } from '../../hooks/useAsync'
import { Card, Skeleton } from '../../components/Primitives'
import { timeAgo, formatNumber, cn } from '../../utils/format'
import type { ActivityEvent, UsagePoint } from '../../types'

function StatTile({
  icon: Icon, label, value, sub, to, accent, delay,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub: string
  to: string
  accent: string
  delay: number
}) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-xl border border-ink-800 bg-ink-900/60 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-600 hover:shadow-lg hover:shadow-black/30 animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn('absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.14]', accent)} />
      <div className="flex items-center justify-between">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg border', accent)}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        <ArrowUpRight className="h-4 w-4 text-ink-500 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
      <div className="mt-4 font-display text-[30px] font-bold leading-none tracking-tight text-ink-50">{value}</div>
      <div className="mt-1.5 text-[12px] font-medium text-ink-300">{label}</div>
      <div className="mt-0.5 text-[11px] text-ink-500">{sub}</div>
    </Link>
  )
}

function BarChart({ data, color }: { data: UsagePoint[]; color: string }) {
  const max = Math.max(...data.map(d => d.value))
  return (
    <div className="flex h-36 items-end gap-2.5">
      {data.map((d, i) => (
        <div key={d.label} className="group flex flex-1 flex-col items-center gap-2">
          <div className="relative flex w-full flex-1 items-end">
            <div
              className={cn('w-full rounded-t-md transition-all duration-500 group-hover:opacity-100', color)}
              style={{ height: `${(d.value / max) * 100}%`, opacity: 0.75, animationDelay: `${i * 60}ms` }}
            />
            <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded border border-ink-700 bg-ink-850 px-1.5 py-0.5 font-mono text-[10px] text-ink-200 opacity-0 transition-opacity group-hover:opacity-100">
              {d.value}
            </span>
          </div>
          <span className="text-[10px] font-medium text-ink-500">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

const activityIcon: Record<ActivityEvent['status'], { icon: React.ElementType; cls: string }> = {
  success: { icon: CheckCircle2, cls: 'text-good border-good-line bg-good-soft' },
  failure: { icon: XCircle, cls: 'text-bad border-bad-line bg-bad-soft' },
  info: { icon: Info, cls: 'text-ink-300 border-ink-600 bg-ink-800' },
}

const typeLabel: Record<ActivityEvent['type'], string> = {
  sandbox: 'Sandbox', agent: 'Agent', session: 'Session', task: 'Task', orchestration: 'Orchestration',
}

export default function Dashboard() {
  const { data: stats, loading } = useAsync(() => api.getDashboardStats())
  const { data: activities } = useAsync<ActivityEvent[]>(() => api.getActivities())
  const { data: tokenTrend } = useAsync<UsagePoint[]>(() => api.getTokenUsageTrend())
  const { data: taskTrend } = useAsync<UsagePoint[]>(() => api.getTaskCompletionTrend())
  const { data: agents } = useAsync(() => api.getAgents())

  return (
    <div className="mx-auto max-w-[1200px]">
      {/* Live status strip */}
      <div className="mb-8 flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-900/60 px-5 py-3.5 backdrop-blur-sm animate-fade-up">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-good" />
        </span>
        <span className="font-display text-[14px] font-semibold text-ink-50">All systems operational</span>
        <span className="text-[12px] text-ink-400">·</span>
        <span className="text-[12px] text-ink-400">
          {stats ? `${stats.runningAgents} agents processing · ${stats.activeSessions} live sessions` : 'Connecting…'}
        </span>
        <div className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-ink-400">
          <Activity className="h-3.5 w-3.5" />
          Updated {timeAgo(new Date().toISOString())}
        </div>
      </div>

      {/* Stat tiles — asymmetric: emphasize agents */}
      <div className="grid grid-cols-4 gap-4">
        <StatTile
          icon={Bot} label="Running Agents" to="/agents" delay={40}
          value={loading ? '—' : String(stats!.runningAgents)}
          sub={`of ${stats?.totalAgents ?? '—'} total`}
          accent="border-vio-line bg-vio-soft text-vio"
        />
        <StatTile
          icon={Box} label="Active Sandboxes" to="/sandboxes" delay={90}
          value={loading ? '—' : String(stats!.activeSandboxes)}
          sub={`of ${stats?.totalSandboxes ?? '—'} provisioned`}
          accent="border-info-line bg-info-soft text-info"
        />
        <StatTile
          icon={MessagesSquare} label="Live Sessions" to="/sessions" delay={140}
          value={loading ? '—' : String(stats!.activeSessions)}
          sub={`of ${stats?.totalSessions ?? '—'} total`}
          accent="border-good-line bg-good-soft text-good"
        />
        <StatTile
          icon={ListTodo} label="Tasks Done Today" to="/tasks" delay={190}
          value={loading ? '—' : String(stats!.completedTasksToday)}
          sub={`of ${stats?.totalTasksToday ?? '—'} dispatched`}
          accent="border-warn-line bg-warn-soft text-warn"
        />
      </div>

      {/* Charts + Activity */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Card className="col-span-1 p-5 animate-fade-up" >
          <div className="mb-1 flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" />
            <h3 className="font-display text-[14px] font-semibold text-ink-100">Token Consumption</h3>
          </div>
          <p className="mb-5 text-[11px] text-ink-500">Daily usage · last 7 days (k tokens)</p>
          {tokenTrend ? <BarChart data={tokenTrend} color="bg-accent" /> : <Skeleton className="h-36" />}
        </Card>

        <Card className="col-span-1 p-5 animate-fade-up">
          <div className="mb-1 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-good" />
            <h3 className="font-display text-[14px] font-semibold text-ink-100">Task Completion</h3>
          </div>
          <p className="mb-5 text-[11px] text-ink-500">Completed tasks · last 7 days</p>
          {taskTrend ? <BarChart data={taskTrend} color="bg-good" /> : <Skeleton className="h-36" />}
        </Card>

        <Card className="col-span-1 flex flex-col p-5 animate-fade-up">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-vio" />
            <h3 className="font-display text-[14px] font-semibold text-ink-100">Recent Activity</h3>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto">
            {(activities ?? []).slice(0, 7).map(a => {
              const { icon: AIcon, cls } = activityIcon[a.status]
              return (
                <div key={a.id} className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-ink-850">
                  <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border', cls)}>
                    <AIcon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-[12px] text-ink-200">
                      <span className="font-medium text-ink-100">{typeLabel[a.type]}</span>{' '}
                      <span className="text-ink-400">{a.action}</span>
                    </div>
                    <div className="truncate font-mono text-[11px] text-ink-400">{a.resourceName}</div>
                  </div>
                  <span className="shrink-0 text-[10px] text-ink-500">{timeAgo(a.timestamp)}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Agent fleet strip */}
      <Card className="mt-4 p-5 animate-fade-up">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-[14px] font-semibold text-ink-100">Agent Fleet</h3>
          <Link to="/agents" className="flex items-center gap-1 text-[12px] font-medium text-accent transition-colors hover:text-accent-hover">
            Manage agents <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {(agents ?? []).map(a => (
            <Link
              key={a.id}
              to={`/agents/${a.id}`}
              className="group flex items-center gap-3 rounded-lg border border-ink-800 bg-ink-900/50 px-3.5 py-3 transition-all duration-150 hover:border-ink-600 hover:bg-ink-850"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-[13px] font-bold text-white"
                style={{ backgroundColor: a.avatarColor }}
              >
                {a.name[0]}
              </span>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[12px] font-medium text-ink-100">{a.name}</div>
                <div className="flex items-center gap-1.5 text-[10px] text-ink-400">
                  <span
                    className={cn('h-1.5 w-1.5 rounded-full',
                      a.status === 'online' && 'bg-good',
                      a.status === 'busy' && 'bg-warn animate-pulse-dot',
                      a.status === 'offline' && 'bg-ink-500',
                      a.status === 'error' && 'bg-bad')}
                  />
                  {formatNumber(a.totalTasks)} tasks
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
