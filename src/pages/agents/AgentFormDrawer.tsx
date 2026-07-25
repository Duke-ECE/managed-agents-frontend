import { useState } from 'react'
import { Check } from 'lucide-react'
import Drawer from '../../components/Drawer'
import { Button } from '../../components/ConfirmDialog'
import { cn } from '../../utils/format'

const MODELS = ['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4-5', 'claude-opus-4', 'o3', 'gemini-2.5-pro']
const TOOLS = ['file_read', 'file_write', 'shell_exec', 'git_diff', 'web_search', 'browser', 'sql_query', 'chart_gen']

export default function AgentFormDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [model, setModel] = useState(MODELS[0])
  const [prompt, setPrompt] = useState('')
  const [temp, setTemp] = useState(0.5)
  const [maxTokens, setMaxTokens] = useState('4096')
  const [selectedTools, setSelectedTools] = useState<string[]>(['file_read'])
  const [sandbox, setSandbox] = useState('none')

  const inputCls = 'w-full rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-[13px] text-ink-100 placeholder-ink-500 outline-none transition-colors focus:border-accent'
  const labelCls = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400'

  const toggleTool = (t: string) =>
    setSelectedTools(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Create Agent"
      width="max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onClose}>Create Agent</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. CodeReviewer" />
        </div>

        <div>
          <label className={labelCls}>Model</label>
          <div className="grid grid-cols-2 gap-2">
            {MODELS.map(m => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-3 py-2 font-mono text-[12px] transition-all',
                  model === m
                    ? 'border-accent bg-info-soft text-accent-fg'
                    : 'border-ink-700 bg-ink-850 text-ink-300 hover:border-ink-600',
                )}
              >
                {m}
                {model === m && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>System Prompt</label>
          <textarea
            className={cn(inputCls, 'h-28 resize-none leading-relaxed')}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Define the agent's role, capabilities, and constraints…"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Temperature · {temp.toFixed(1)}</label>
            <input
              type="range" min="0" max="1" step="0.1" value={temp}
              onChange={e => setTemp(Number(e.target.value))}
              className="w-full accent-[#0070f3]"
            />
            <div className="flex justify-between text-[10px] text-ink-500"><span>Precise</span><span>Creative</span></div>
          </div>
          <div>
            <label className={labelCls}>Max Tokens</label>
            <select className={inputCls} value={maxTokens} onChange={e => setMaxTokens(e.target.value)}>
              {['1024', '2048', '4096', '8192', '16384'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Tools · {selectedTools.length} selected</label>
          <div className="flex flex-wrap gap-2">
            {TOOLS.map(t => (
              <button
                key={t}
                onClick={() => toggleTool(t)}
                className={cn(
                  'rounded-full border px-3 py-1 font-mono text-[11px] transition-all',
                  selectedTools.includes(t)
                    ? 'border-good-line bg-good-soft text-good'
                    : 'border-ink-700 bg-ink-850 text-ink-400 hover:border-ink-600 hover:text-ink-200',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Sandbox</label>
          <select className={inputCls} value={sandbox} onChange={e => setSandbox(e.target.value)}>
            <option value="none">No sandbox (hosted runtime)</option>
            <option value="sbx_01">prod-coder-01</option>
            <option value="sbx_02">staging-reviewer</option>
            <option value="sbx_03">data-pipeline</option>
          </select>
        </div>
      </div>
    </Drawer>
  )
}
