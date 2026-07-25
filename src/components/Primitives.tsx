import type { ReactNode } from 'react'
import { cn } from '../utils/format'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 animate-fade-up">
      <div>
        <h1 className="font-display text-[26px] font-bold tracking-tight text-ink-50">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-ink-400">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({
  children,
  className,
  hover = false,
}: {
  children: ReactNode
  className?: string
  hover?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-ink-800 bg-ink-900/80 shadow-card backdrop-blur-sm',
        hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-600 hover:shadow-float',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-700 bg-ink-900/40 px-6 py-16 text-center animate-fade-in">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-ink-700 bg-ink-850 text-ink-400">
        {Icon}
      </div>
      <h3 className="font-display text-[15px] font-semibold text-ink-100">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] text-ink-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-ink-800', className)} />
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn('h-4', c === 0 ? 'w-1/4' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  )
}
