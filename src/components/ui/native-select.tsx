import type { ComponentProps } from 'react'
import { cn } from '@/utils/format'

export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn('h-9 min-w-0 cursor-pointer rounded-lg border border-ink-700 bg-ink-850 px-3 text-[12px] text-ink-100 transition-colors hover:border-ink-500 focus:border-accent disabled:cursor-not-allowed disabled:opacity-50', className)}
      {...props}
    />
  )
}
