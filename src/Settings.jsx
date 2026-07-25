import { useState } from 'react'

export default function Settings({ settings, onSave }) {
  const [open, setOpen] = useState(!settings.apiKey)
  const [draft, setDraft] = useState(settings)

  const toggle = () => {
    if (!open) setDraft(settings)
    setOpen(!open)
  }

  const save = (e) => {
    e.preventDefault()
    onSave({
      apiKey: draft.apiKey.trim(),
      baseUrl: draft.baseUrl.trim() || 'https://api.openai.com/v1',
      model: draft.model.trim() || 'gpt-4o-mini',
    })
    setOpen(false)
  }

  const field = (key, value) =>
    setDraft((d) => ({ ...d, [key]: value }))

  return (
    <section className="settings">
      <button type="button" className="settings-toggle" onClick={toggle}>
        {open ? 'Hide settings' : 'LLM settings'}
        {!settings.apiKey && <span className="settings-badge">required</span>}
      </button>
      {open && (
        <form className="settings-form" onSubmit={save}>
          <label>
            API key
            <input
              type="password"
              value={draft.apiKey}
              onChange={(e) => field('apiKey', e.target.value)}
              placeholder="sk-…"
              autoComplete="off"
            />
          </label>
          <label>
            Base URL
            <input
              type="text"
              value={draft.baseUrl}
              onChange={(e) => field('baseUrl', e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </label>
          <label>
            Model
            <input
              type="text"
              value={draft.model}
              onChange={(e) => field('model', e.target.value)}
              placeholder="gpt-4o-mini"
            />
          </label>
          <p className="settings-note">
            Stored in your browser only; sent to the managed-agents backend when
            a session is created.
          </p>
          <button type="submit" className="settings-save">
            Save
          </button>
        </form>
      )}
    </section>
  )
}
