import { cn } from '../utils/format'

type Tone = 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'purple' | 'cyan'

const toneStyles: Record<Tone, { dot: string; badge: string }> = {
  green: { dot: 'bg-good', badge: 'border-good-line bg-good-soft text-good' },
  blue: { dot: 'bg-info', badge: 'border-info-line bg-info-soft text-info' },
  amber: { dot: 'bg-warn', badge: 'border-warn-line bg-warn-soft text-warn' },
  red: { dot: 'bg-bad', badge: 'border-bad-line bg-bad-soft text-bad' },
  gray: { dot: 'bg-ink-400', badge: 'border-ink-600 bg-ink-800/60 text-ink-300' },
  purple: { dot: 'bg-vio', badge: 'border-vio-line bg-vio-soft text-vio' },
  cyan: { dot: 'bg-cyn', badge: 'border-cyn-line bg-cyn-soft text-cyn' },
}

const statusToneMap: Record<string, Tone> = {
  // sandbox
  running: 'green', creating: 'cyan', stopped: 'gray', error: 'red',
  // agent
  online: 'green', busy: 'amber', offline: 'gray',
  // session
  active: 'blue', completed: 'green', expired: 'gray', terminated: 'red',
  // task
  pending: 'gray', retrying: 'amber', failed: 'red', cancelled: 'gray',
  // orchestration
  draft: 'gray', paused: 'amber',
  // member role
  admin: 'purple', member: 'blue', guest: 'gray',
  // agent template llm_mode
  platform_default: 'blue', custom: 'cyan',
  // agent template visibility
  platform: 'purple',
}

const liveStatuses = new Set(['running', 'online', 'busy', 'active', 'creating', 'retrying'])

export function statusTone(status: string): Tone {
  return statusToneMap[status] ?? 'gray'
}

export default function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = statusTone(status)
  const { dot, badge } = toneStyles[tone]
  const live = liveStatuses.has(status)
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium', badge)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dot, live && 'animate-pulse-dot')} />
      {label ?? status}
    </span>
  )
}
