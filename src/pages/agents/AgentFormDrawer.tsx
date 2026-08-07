import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  createAgent,
  updateAgent,
  AGENT_TOOLS,
  type AgentInput,
  type AgentTemplate,
  type LlmMode,
} from '../../lib/chat-api'
import Drawer from '../../components/Drawer'
import { Button } from '../../components/ConfirmDialog'
import { cn } from '../../utils/format'

const inputCls =
  'w-full rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-[13px] text-ink-100 placeholder:text-ink-500 outline-none transition-colors focus:border-accent'
const labelCls =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400'

const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_MODEL = 'gpt-4o-mini'

interface Draft {
  name: string
  description: string
  systemPrompt: string
  llmMode: LlmMode
  apiKey: string
  baseUrl: string
  model: string
  tools: string[]
}

function draftFrom(agent: AgentTemplate | null, platformBlocked: boolean): Draft {
  if (!agent) {
    return {
      name: '',
      description: '',
      systemPrompt: '',
      // The platform default is whitelist-gated; users without access start
      // on custom, same as the chat LLM settings.
      llmMode: platformBlocked ? 'custom' : 'platform_default',
      apiKey: '',
      baseUrl: DEFAULT_BASE_URL,
      model: DEFAULT_MODEL,
      tools: [...AGENT_TOOLS],
    }
  }
  return {
    name: agent.name,
    description: agent.description,
    systemPrompt: agent.system_prompt,
    llmMode: agent.llm_mode,
    apiKey: '',
    baseUrl: agent.llm_base_url || DEFAULT_BASE_URL,
    model: agent.llm_model || DEFAULT_MODEL,
    // An empty whitelist means "all tools" — render it as all four checked.
    tools: agent.tools.length > 0 ? agent.tools : [...AGENT_TOOLS],
  }
}

/**
 * Create/edit form for an agent template. `agent` is null for create. The
 * stored API key is never readable: on edit an empty key field means "keep
 * the current key", and switching to platform_default clears it ("").
 */
export default function AgentFormDrawer({
  open,
  agent,
  platformBlocked,
  onClose,
  onSaved,
}: {
  open: boolean
  agent: AgentTemplate | null
  platformBlocked: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(agent, platformBlocked))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The submit button lives in the drawer footer, outside the <form>.
  const formRef = useRef<HTMLFormElement>(null)

  // Re-key the draft whenever the drawer is (re)opened for another agent.
  useEffect(() => {
    if (open) {
      setDraft(draftFrom(agent, platformBlocked))
      setError(null)
    }
  }, [open, agent, platformBlocked])

  const toggleTool = (tool: string) =>
    setDraft((d) => ({
      ...d,
      tools: d.tools.includes(tool) ? d.tools.filter((t) => t !== tool) : [...d.tools, tool],
    }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const input: AgentInput = {
        name: draft.name.trim(),
        description: draft.description.trim(),
        system_prompt: draft.systemPrompt,
        llm_mode: draft.llmMode,
        llm_base_url: draft.llmMode === 'custom' ? draft.baseUrl.trim() : '',
        llm_model: draft.llmMode === 'custom' ? draft.model.trim() : '',
        // All four checked = the "all tools" default, submitted as [].
        tools: AGENT_TOOLS.every((t) => draft.tools.includes(t)) ? [] : draft.tools,
      }
      if (draft.llmMode === 'platform_default') {
        // Clear any stored key (only valid together with platform_default).
        input.llm_api_key = ''
      } else if (!agent || draft.apiKey) {
        // Create always sends the key; on edit an empty field keeps it.
        input.llm_api_key = draft.apiKey
      }
      if (agent) await updateAgent(agent.id, input)
      else await createAgent(input)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const keyRequired = draft.llmMode === 'custom' && !agent

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={agent ? `Edit ${agent.name}` : 'New agent'}
      width="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => formRef.current?.requestSubmit()} disabled={submitting}>
            {submitting ? 'Saving…' : agent ? 'Save changes' : 'Create agent'}
          </Button>
        </div>
      }
    >
      <form ref={formRef} onSubmit={(e) => void submit(e)} className="space-y-5">
        <div>
          <label className={labelCls}>Name</label>
          <input
            required
            className={inputCls}
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="e.g. CodeReviewer"
            autoComplete="off"
          />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <input
            className={inputCls}
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="What this agent is for"
            autoComplete="off"
          />
        </div>

        <div>
          <label className={labelCls}>System prompt</label>
          <textarea
            className={cn(inputCls, 'h-28 resize-none leading-relaxed')}
            value={draft.systemPrompt}
            onChange={(e) => setDraft((d) => ({ ...d, systemPrompt: e.target.value }))}
            placeholder="Define the agent's role, capabilities, and constraints…"
          />
        </div>

        <div>
          <label className={labelCls}>LLM</label>
          <div className="flex gap-2">
            {(['platform_default', 'custom'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={platformBlocked && mode === 'platform_default'}
                onClick={() => setDraft((d) => ({ ...d, llmMode: mode }))}
                className={cn(
                  'h-8 rounded-lg border px-3 text-[12px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
                  draft.llmMode === mode
                    ? 'border-accent bg-accent/10 text-ink-100'
                    : 'border-ink-700 bg-ink-850 text-ink-400 hover:text-ink-200',
                )}
              >
                {mode === 'platform_default' ? 'Platform default' : 'Custom provider'}
              </button>
            ))}
          </div>
          {draft.llmMode === 'platform_default' ? (
            platformBlocked ? (
              <p className="mt-3 rounded-lg border border-warn-line bg-warn-soft px-3 py-2.5 text-[12px] text-warn">
                Platform provider not enabled for your account — use a custom key or ask an admin.
              </p>
            ) : (
              <p className="mt-3 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5 text-[12px] text-ink-400">
                Uses the platform-provided LLM, no API key needed.
              </p>
            )
          ) : (
            <div className="mt-3 space-y-4">
              <div>
                <label className={labelCls}>API key</label>
                <input
                  type="password"
                  required={keyRequired}
                  className={inputCls}
                  value={draft.apiKey}
                  onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}
                  placeholder={agent ? 'leave empty to keep current key' : 'sk-…'}
                  autoComplete="off"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Base URL</label>
                  <input
                    required
                    className={inputCls}
                    value={draft.baseUrl}
                    onChange={(e) => setDraft((d) => ({ ...d, baseUrl: e.target.value }))}
                    placeholder={DEFAULT_BASE_URL}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className={labelCls}>Model</label>
                  <input
                    required
                    className={inputCls}
                    value={draft.model}
                    onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
                    placeholder={DEFAULT_MODEL}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>
            Tools · {AGENT_TOOLS.every((t) => draft.tools.includes(t)) ? 'all' : `${draft.tools.length} selected`}
          </label>
          <div className="flex flex-wrap gap-2">
            {AGENT_TOOLS.map((tool) => {
              const checked = draft.tools.includes(tool)
              return (
                <label
                  key={tool}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[12px] transition-all',
                    checked
                      ? 'border-accent bg-info-soft text-accent-fg'
                      : 'border-ink-700 bg-ink-850 text-ink-300 hover:border-ink-600',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTool(tool)}
                    className="accent-accent"
                  />
                  {tool}
                </label>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-ink-500">All four selected means "all tools" (no whitelist).</p>
        </div>

        {error && (
          <p className="rounded-lg border border-bad-line bg-bad-soft px-3 py-2 text-[12px] text-bad animate-fade-in">
            {error}
          </p>
        )}
      </form>
    </Drawer>
  )
}
