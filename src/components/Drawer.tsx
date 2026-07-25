import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../utils/format'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  width?: string
  footer?: ReactNode
}

export default function Drawer({ open, onClose, title, children, width = 'max-w-lg', footer }: DrawerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={cn(
          'absolute inset-y-0 right-0 flex w-full flex-col border-l border-ink-700 bg-ink-900 shadow-2xl animate-slide-in-right',
          width,
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink-800 px-6">
          <div className="font-display text-[15px] font-semibold text-ink-50">{title}</div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-ink-800 px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}
