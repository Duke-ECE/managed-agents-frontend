import { cn } from '../utils/format'

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
