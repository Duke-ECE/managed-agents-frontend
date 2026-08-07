import { AlertTriangle } from 'lucide-react'
import { cn } from '../utils/format'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-2xl animate-scale-in">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border',
              danger ? 'border-bad-line bg-bad-soft text-bad' : 'border-warn-line bg-warn-soft text-warn',
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-[15px] font-semibold text-ink-50">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-300">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

export function Button({
  children, onClick, variant = 'primary', size = 'md', className, disabled, type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-hover shadow-sm shadow-accent/25',
    ghost: 'text-ink-300 hover:bg-ink-800 hover:text-ink-100',
    outline: 'border border-ink-600 text-ink-200 hover:border-ink-400 hover:bg-ink-850',
    danger: 'bg-red-600 text-white hover:bg-red-500 shadow-sm shadow-red-600/25',
  }
  const sizes = { sm: 'h-8 px-3 text-[12px]', md: 'h-9 px-4 text-[13px]' }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        variants[variant], sizes[size], className,
      )}
    >
      {children}
    </button>
  )
}
