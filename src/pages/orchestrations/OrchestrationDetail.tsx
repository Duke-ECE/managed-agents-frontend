import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Play, Pause, GitBranch, ArrowDown, Bot, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { api } from '../../mocks/api'
import { useAsync } from '../../hooks/useAsync'
import StatusBadge from '../../components/StatusBadge'
import { Card, Skeleton } from '../../components/Primitives'
import { Button } from '../../components/ConfirmDialog'
import { timeAgo, formatDateTime, cn } from '../../utils/format'

const policyLabel: Record<string, string> = { abort: 'Abort pipeline', retry: 'Retry', skip: 'Skip step' }

export default function OrchestrationDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: orch, loading } = useAsync(() => api.getOrchestration(id!), [id])

  if (loading) {
    return (
      <div className="mx-auto max-w-[1000px] space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }
  if (!orch) return <div className="text-ink-400">Orchestration not found.</div>

  return (
    <div className="mx-auto max-w-[1000px]">
      <Link to="/orchestrations" className="mb-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-400 transition-colors hover:text-ink-200">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Orchestrations
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between animate-fade-up">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-vio-line bg-vio-soft text-vio">
            <GitBranch className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-[24px] font-bold tracking-tight text-ink-50">{orch.name}</h1>
              <StatusBadge status={orch.status} />
            </div>
            <p className="mt-1 text-[13px] text-ink-400">{orch.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {orch.status === 'active' ? (
            <Button variant="outline"><Pause className="h-3.5 w-3.5" /> Pause</Button>
          ) : (
            <Button variant="outline"><Play className="h-3.5 w-3.5" /> Activate</Button>
          )}
          <Button><Play className="h-3.5 w-3.5" /> Run Now</Button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-5">
        {/* Pipeline flow */}
        <Card className="p-6 animate-fade-up">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-display text-[14px] font-semibold text-ink-100">Pipeline</h3>
            <span className="font-mono text-[11px] text-ink-500">trigger: {orch.trigger}</span>
          </div>

          <div className="relative">
            {orch.steps.map((step, i) => (
              <div key={step.id}>
                <div className="group relative flex gap-4 rounded-xl border border-ink-700 bg-ink-900/60 p-4 transition-all duration-200 hover:border-vio-line hover:bg-ink-850">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-vio-soft font-display text-[13px] font-bold text-vio">
                    {step.order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Bot className="h-3.5 w-3.5 text-ink-400" />
                      <span className="text-[13px] font-semibold text-ink-50">{step.agentName}</span>
                      <span className={cn(
                        'rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase',
                        step.executionMode === 'parallel'
                          ? 'border-cyn-line bg-cyn-soft text-cyn'
                          : 'border-ink-600 bg-ink-800 text-ink-400',
                      )}>
                        {step.executionMode}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-400">
                      <span>input: <code className="font-mono text-accent-fg">{step.inputMapping}</code></span>
                      <span>on failure: <span className="text-ink-300">{policyLabel[step.failurePolicy]}</span></span>
                      {step.maxRetries > 0 && <span>max retries: <span className="font-mono text-ink-300">{step.maxRetries}</span></span>}
                    </div>
                  </div>
                  <Link
                    to={`/agents/${step.agentId}`}
                    className="self-center text-[11px] font-medium text-accent opacity-0 transition-opacity hover:underline group-hover:opacity-100"
                  >
                    View agent
                  </Link>
                </div>
                {i < orch.steps.length - 1 && (
                  <div className="flex justify-center py-1.5">
                    <ArrowDown className="h-4 w-4 text-ink-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Run history + meta */}
        <div className="space-y-4">
          <Card className="p-5 animate-fade-up">
            <h3 className="mb-4 font-display text-[13px] font-semibold text-ink-100">Run History</h3>
            {orch.runs.length === 0 ? (
              <p className="text-[12px] text-ink-500">No runs yet. Trigger a run to see history.</p>
            ) : (
              <div className="space-y-2">
                {orch.runs.map(run => (
                  <div key={run.id} className="rounded-lg border border-ink-800 bg-ink-900/50 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {run.status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4 text-good" />
                      ) : run.status === 'failed' ? (
                        <XCircle className="h-4 w-4 text-bad" />
                      ) : (
                        <Clock className="h-4 w-4 text-warn" />
                      )}
                      <span className="font-mono text-[11px] text-ink-200">{run.id}</span>
                      <span className="ml-auto text-[10px] text-ink-500">{timeAgo(run.startedAt)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink-800">
                        <div
                          className={cn('h-full rounded-full', run.status === 'failed' ? 'bg-bad' : 'bg-good')}
                          style={{ width: `${(run.currentStep / run.totalSteps) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-ink-400">{run.currentStep}/{run.totalSteps}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 animate-fade-up">
            <h3 className="mb-4 font-display text-[13px] font-semibold text-ink-100">Details</h3>
            <dl className="space-y-3 text-[12px]">
              {[
                ['Steps', String(orch.steps.length)],
                ['Status', orch.status],
                ['Created', formatDateTime(orch.createdAt)],
                ['Last Run', orch.lastRunAt ? formatDateTime(orch.lastRunAt) : 'Never'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-ink-400">{k}</dt>
                  <dd className="text-right font-medium capitalize text-ink-200">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  )
}
