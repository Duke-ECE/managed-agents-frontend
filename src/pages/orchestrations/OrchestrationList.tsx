import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Workflow, GripVertical, Trash2, ArrowDown, GitBranch, Play } from 'lucide-react'
import { api } from '../../mocks/api'
import { useAsync } from '../../hooks/useAsync'
import StatusBadge from '../../components/StatusBadge'
import { PageHeader, Card, EmptyState, TableSkeleton } from '../../components/Primitives'
import Drawer from '../../components/Drawer'
import { Button } from '../../components/ConfirmDialog'
import { timeAgo, cn } from '../../utils/format'
import type { OrchestrationStep, ExecutionMode, FailurePolicy } from '../../types'

const AGENT_OPTIONS = [
  { id: 'agt_01', name: 'CodeReviewer' },
  { id: 'agt_02', name: 'FullStackBuilder' },
  { id: 'agt_03', name: 'TestRunner' },
  { id: 'agt_05', name: 'DataAnalyst' },
  { id: 'agt_06', name: 'SecurityAuditor' },
]

interface DraftStep {
  key: string
  agentId: string
  inputMapping: string
  executionMode: ExecutionMode
  failurePolicy: FailurePolicy
  maxRetries: number
}

const inputCls = 'w-full rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-[13px] text-ink-100 placeholder-ink-500 outline-none transition-colors focus:border-accent'
const labelCls = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400'

function OrchestrationFormDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [trigger, setTrigger] = useState('manual')
  const [steps, setSteps] = useState<DraftStep[]>([
    { key: 's1', agentId: 'agt_02', inputMapping: 'issue.body', executionMode: 'sequential', failurePolicy: 'abort', maxRetries: 1 },
  ])

  const addStep = () =>
    setSteps(prev => [...prev, {
      key: `s${Date.now()}`, agentId: 'agt_01',
      inputMapping: `steps.${prev.length}.output`,
      executionMode: 'sequential', failurePolicy: 'retry', maxRetries: 2,
    }])

  const updateStep = (key: string, patch: Partial<DraftStep>) =>
    setSteps(prev => prev.map(s => s.key === key ? { ...s, ...patch } : s))

  const removeStep = (key: string) => setSteps(prev => prev.filter(s => s.key !== key))

  const moveStep = (idx: number, dir: -1 | 1) =>
    setSteps(prev => {
      const next = [...prev]
      const j = idx + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next
    })

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Create Orchestration"
      width="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onClose}>Save as Draft</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Name</label>
            <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. PR Review Pipeline" />
          </div>
          <div>
            <label className={labelCls}>Trigger</label>
            <select className={inputCls} value={trigger} onChange={e => setTrigger(e.target.value)}>
              <option value="manual">Manual</option>
              <option value="pull_request.opened">pull_request.opened</option>
              <option value="cron: 0 9 * * *">Cron (daily 09:00)</option>
              <option value="issue.created">issue.created</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <input className={inputCls} value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this workflow accomplish?" />
        </div>

        {/* Steps */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className={cn(labelCls, 'mb-0')}>Pipeline Steps · {steps.length}</label>
            <Button variant="outline" size="sm" onClick={addStep}><Plus className="h-3.5 w-3.5" /> Add Step</Button>
          </div>
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={step.key} className="rounded-xl border border-ink-700 bg-ink-900/60 p-4 animate-scale-in">
                <div className="mb-3 flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-ink-600" />
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-info-soft font-display text-[11px] font-bold text-accent-fg">{idx + 1}</span>
                  <span className="text-[12px] font-semibold text-ink-200">Step {idx + 1}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={() => moveStep(idx, -1)} className="flex h-6 w-6 items-center justify-center rounded text-ink-400 hover:bg-ink-800 hover:text-ink-100 disabled:opacity-30" disabled={idx === 0}>
                      <ArrowDown className="h-3.5 w-3.5 rotate-180" />
                    </button>
                    <button onClick={() => moveStep(idx, 1)} className="flex h-6 w-6 items-center justify-center rounded text-ink-400 hover:bg-ink-800 hover:text-ink-100 disabled:opacity-30" disabled={idx === steps.length - 1}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removeStep(step.key)} className="flex h-6 w-6 items-center justify-center rounded text-ink-400 hover:bg-bad-soft hover:text-bad" disabled={steps.length === 1}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Agent</label>
                    <select className={inputCls} value={step.agentId} onChange={e => updateStep(step.key, { agentId: e.target.value })}>
                      {AGENT_OPTIONS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Input Mapping</label>
                    <input className={cn(inputCls, 'font-mono text-[11px]')} value={step.inputMapping} onChange={e => updateStep(step.key, { inputMapping: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Execution Mode</label>
                    <select className={inputCls} value={step.executionMode} onChange={e => updateStep(step.key, { executionMode: e.target.value as ExecutionMode })}>
                      <option value="sequential">Sequential</option>
                      <option value="parallel">Parallel</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>On Failure</label>
                      <select className={inputCls} value={step.failurePolicy} onChange={e => updateStep(step.key, { failurePolicy: e.target.value as FailurePolicy })}>
                        <option value="abort">Abort</option>
                        <option value="retry">Retry</option>
                        <option value="skip">Skip</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Max Retries</label>
                      <select className={inputCls} value={step.maxRetries} onChange={e => updateStep(step.key, { maxRetries: Number(e.target.value) })}>
                        {[0, 1, 2, 3, 5].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  )
}

export default function OrchestrationList() {
  const navigate = useNavigate()
  const { data: orchestrations, loading } = useAsync(() => api.getOrchestrations())
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Orchestrations"
        description="Chain multiple agents into automated pipelines."
        actions={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Orchestration</Button>}
      />

      {loading ? (
        <Card><TableSkeleton rows={3} cols={5} /></Card>
      ) : !orchestrations || orchestrations.length === 0 ? (
        <EmptyState
          icon={<Workflow className="h-5 w-5" />}
          title="No orchestrations yet"
          description="Build a pipeline to coordinate multiple agents on a shared goal."
          action={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Orchestration</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 stagger">
          {orchestrations.map(o => (
            <Card key={o.id} hover className="group cursor-pointer p-5" >
              <div onClick={() => navigate(`/orchestrations/${o.id}`)}>
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-vio-line bg-vio-soft text-vio">
                    <GitBranch className="h-5 w-5" />
                  </span>
                  <StatusBadge status={o.status} />
                </div>
                <h3 className="mt-4 font-display text-[16px] font-semibold text-ink-50 transition-colors group-hover:text-accent">{o.name}</h3>
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-400">{o.description}</p>

                {/* Step preview */}
                <div className="mt-4 flex items-center gap-1.5 overflow-hidden">
                  {o.steps.map((s: OrchestrationStep, i: number) => (
                    <div key={s.id} className="flex items-center gap-1.5">
                      <span className="shrink-0 rounded-md border border-ink-700 bg-ink-850 px-2 py-1 font-mono text-[10px] text-ink-300">
                        {i + 1}. {s.agentName}
                      </span>
                      {i < o.steps.length - 1 && <ArrowDown className="h-3 w-3 shrink-0 -rotate-90 text-ink-600" />}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-3 border-t border-ink-800 pt-4 text-[11px] text-ink-400">
                  <span className="font-mono text-[10px] text-ink-500">{o.trigger}</span>
                  <span className="ml-auto">{o.lastRunAt ? `last run ${timeAgo(o.lastRunAt)}` : 'never run'}</span>
                  <span className="flex items-center gap-1 text-good opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="h-3 w-3" /> Run
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <OrchestrationFormDrawer open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}
